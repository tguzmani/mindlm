import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { SearchService } from './search.service';

@Module({
  imports: [CommonModule],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
