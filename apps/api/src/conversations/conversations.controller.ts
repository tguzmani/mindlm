import { Controller, Get, Req } from '@nestjs/common';
import { ConversationsService } from './conversations.service';

interface AuthenticatedRequest {
  user: { userId: string; role: string };
}

@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
  ) {}

  @Get('me')
  async getMyConversation(@Req() req: AuthenticatedRequest) {
    const conversation =
      await this.conversationsService.findOrCreateForUser(req.user.userId);
    const messages =
      await this.conversationsService.getLastMessages(conversation.id, 50);

    return { ...conversation, messages };
  }
}
