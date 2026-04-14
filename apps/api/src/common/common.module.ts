import { Module } from '@nestjs/common';
import { OpenRouterService } from './openrouter/openrouter.service';
import { EmbeddingsService } from './openrouter/embeddings.service';

@Module({
  providers: [OpenRouterService, EmbeddingsService],
  exports: [OpenRouterService, EmbeddingsService],
})
export class CommonModule {}
