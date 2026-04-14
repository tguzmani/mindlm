import { Controller, Post, Body, Req, Res, HttpCode } from '@nestjs/common';
import * as express from 'express';
import { ChatService } from './chat.service';

interface AuthenticatedRequest extends express.Request {
  user: { userId: string; role: string };
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(200)
  async chat(
    @Req() req: AuthenticatedRequest,
    @Res() res: express.Response,
    @Body() body: { message: string },
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      await this.chatService.streamResponse(
        req.user.userId,
        body.message,
        (chunk: string) => res.write(chunk),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Internal server error';
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    }

    res.end();
  }
}
