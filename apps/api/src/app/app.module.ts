import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../auth/auth.module';
import { EntriesModule } from '../entries/entries.module';
import { CollectionsModule } from '../collections/collections.module';
import { SearchModule } from '../search/search.module';
import { ChatModule } from '../chat/chat.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    AuthModule,
    EntriesModule,
    CollectionsModule,
    SearchModule,
    ChatModule,
    ConversationsModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
