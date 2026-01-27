import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';

import { EnqueueScrapeDto } from './dto/enqueue-scrape.dto';
import { JobSourcesService } from './job-sources.service';

@ApiTags('job-sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('job-sources')
export class JobSourcesController {
  constructor(private readonly jobSourcesService: JobSourcesService) {}

  @Post('scrape')
  @ApiOperation({ summary: 'Enqueue a scrape job for job listings' })
  async enqueueScrape(@Body() dto: EnqueueScrapeDto) {
    return this.jobSourcesService.enqueueScrape(dto);
  }
}
