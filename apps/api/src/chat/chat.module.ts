import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { SearchModule } from '../search/search.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [CommonModule, SearchModule, ConversationsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
