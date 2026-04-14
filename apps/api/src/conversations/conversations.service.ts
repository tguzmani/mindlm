import { Injectable } from '@nestjs/common';
import { MessageRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateForUser(userId: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: { userId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.conversation.create({
      data: { userId },
    });
  }

  async getLastMessages(conversationId: string, limit = 10) {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Return in chronological order (asc)
    return messages.reverse();
  }

  async saveMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
  ) {
    return this.prisma.message.create({
      data: { conversationId, role, content },
    });
  }
}
