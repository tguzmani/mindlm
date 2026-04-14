import { Injectable } from '@nestjs/common';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

@Injectable()
export class ChunkingService {
  chunkText(text: string): string[] {
    const words = text.split(/\s+/).filter((w) => w.length > 0);

    if (words.length === 0) {
      return [];
    }

    if (words.length <= CHUNK_SIZE) {
      return [words.join(' ')];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + CHUNK_SIZE, words.length);
      chunks.push(words.slice(start, end).join(' '));

      if (end >= words.length) break;
      start += CHUNK_SIZE - CHUNK_OVERLAP;
    }

    return chunks;
  }
}
