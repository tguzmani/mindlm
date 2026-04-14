import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { EntriesService } from './entries.service';
import { EntriesController } from './entries.controller';
import { ChunkingService } from './entries-chunking.service';

@Module({
  imports: [CommonModule],
  controllers: [EntriesController],
  providers: [EntriesService, ChunkingService],
  exports: [EntriesService],
})
export class EntriesModule {}
