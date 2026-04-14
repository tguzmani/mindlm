import { Injectable, Logger } from '@nestjs/common';
import { MessageRole } from '@prisma/client';
import { ConversationsService } from '../conversations/conversations.service';
import { SearchService } from '../search/search.service';
import { OpenRouterService } from '../common/openrouter/openrouter.service';
import { PromptBuilder } from '../common/prompt/prompt.builder';
import { ConversationMessage } from '../common/prompt/prompt.types';

const SYSTEM_INSTRUCTION =
  'You are a personal assistant that helps the user reflect on their journal. Answer only based on the provided context. If the context does not contain the answer, say so.';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly searchService: SearchService,
    private readonly openRouterService: OpenRouterService,
  ) {}

  async streamResponse(
    userId: string,
    userMessage: string,
    write: (chunk: string) => void,
  ): Promise<void> {
    // 1. Find or create the user's single global conversation
    const conversation =
      await this.conversationsService.findOrCreateForUser(userId);

    // 2. Fetch last 10 messages for conversation context
    const lastMessages = await this.conversationsService.getLastMessages(
      conversation.id,
      10,
    );

    const conversationHistory: ConversationMessage[] = lastMessages.map(
      (msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }),
    );

    // 3. Search relevant chunks via pgvector similarity
    const relevantChunks = await this.searchService.searchSimilarChunks(
      userMessage,
      userId,
    );

    // 4. Build prompt via PromptBuilder (never inline)
    const messages = new PromptBuilder()
      .setSystem(SYSTEM_INSTRUCTION)
      .setRelevantChunks(relevantChunks)
      .setConversationHistory(conversationHistory)
      .setUserQuery(userMessage)
      .build();

    // 5. Stream completion via OpenRouterService
    let fullResponse = '';

    for await (const chunk of this.openRouterService.streamChatCompletion({
      messages,
    })) {
      if (chunk.content) {
        fullResponse += chunk.content;
        write(`data: ${JSON.stringify(chunk.content)}\n\n`);
      }
    }

    // 6. Signal stream end
    write('data: [DONE]\n\n');

    // 7. Save both messages to conversation
    await this.conversationsService.saveMessage(
      conversation.id,
      MessageRole.user,
      userMessage,
    );
    await this.conversationsService.saveMessage(
      conversation.id,
      MessageRole.assistant,
      fullResponse,
    );

    this.logger.log(
      `Chat completed for user ${userId}, conversation ${conversation.id}`,
    );
  }
}
