import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingsService } from '../common/openrouter/embeddings.service';
import { EntryChunkResult } from '../common/prompt/prompt.types';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async searchSimilarChunks(
    query: string,
    userId: string,
  ): Promise<EntryChunkResult[]> {
    const queryEmbedding = await this.embeddingsService.embed(query);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const results = await this.prisma.$queryRaw<EntryChunkResult[]>`
      SELECT
        ec.id,
        ec.content,
        ec."chunkIndex" AS "chunkIndex",
        1 - (ec.embedding <=> ${vectorStr}::vector) AS similarity
      FROM "EntryChunk" ec
      INNER JOIN "Entry" e ON ec."entryId" = e.id
      WHERE e."userId" = ${userId}
      ORDER BY ec.embedding <=> ${vectorStr}::vector
      LIMIT 5
    `;

    return results;
  }
}
