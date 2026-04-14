import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingsService } from '../common/openrouter/embeddings.service';
import { ChunkingService } from './entries-chunking.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';

@Injectable()
export class EntriesService {
  private readonly logger = new Logger(EntriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly chunkingService: ChunkingService,
  ) {}

  async create(userId: string, dto: CreateEntryDto) {
    const entry = await this.prisma.entry.create({
      data: {
        title: dto.title,
        content: dto.content,
        userId,
        collectionId: dto.collectionId ?? null,
      },
    });

    await this.indexEntry(entry.id, dto.content);

    return entry;
  }

  async findAll(userId: string) {
    return this.prisma.entry.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        collectionId: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(userId: string, entryId: string) {
    const entry = await this.prisma.entry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundException('Entry not found');
    }

    if (entry.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return entry;
  }

  async update(userId: string, entryId: string, dto: UpdateEntryDto) {
    const existing = await this.findOne(userId, entryId);

    const entry = await this.prisma.entry.update({
      where: { id: entryId },
      data: {
        title: dto.title ?? existing.title,
        content: dto.content ?? existing.content,
      },
    });

    if (dto.content !== undefined) {
      await this.indexEntry(entry.id, entry.content);
    }

    return entry;
  }

  async remove(userId: string, entryId: string) {
    await this.findOne(userId, entryId);

    await this.prisma.entry.delete({
      where: { id: entryId },
    });
  }

  private async indexEntry(entryId: string, content: string): Promise<void> {
    // Delete all existing chunks (delete + recreate, never update in place)
    await this.prisma.entryChunk.deleteMany({
      where: { entryId },
    });

    const chunkTexts = this.chunkingService.chunkText(content);

    if (chunkTexts.length === 0) {
      return;
    }

    const embeddings = await this.embeddingsService.embedMany(chunkTexts);

    for (let i = 0; i < chunkTexts.length; i++) {
      const vector = embeddings[i].embedding;
      const vectorStr = `[${vector.join(',')}]`;

      await this.prisma.$executeRaw`
        INSERT INTO "EntryChunk" (id, content, "chunkIndex", embedding, "createdAt", "entryId")
        VALUES (
          gen_random_uuid(),
          ${chunkTexts[i]},
          ${i},
          ${vectorStr}::vector,
          NOW(),
          ${entryId}
        )
      `;
    }

    this.logger.log(
      `Indexed entry ${entryId}: ${chunkTexts.length} chunks created`,
    );
  }
}
