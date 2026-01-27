import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { EnqueueScrapeDto } from './dto/enqueue-scrape.dto';
import { ScrapeCompleteDto } from './dto/scrape-complete.dto';
import { JobSourcesService } from './job-sources.service';

@ApiTags('job-sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('job-sources')
export class JobSourcesController {
  constructor(private readonly jobSourcesService: JobSourcesService) {}

  @Post('scrape')
  @ApiOperation({ summary: 'Enqueue a scrape job for job listings' })
  async enqueueScrape(@CurrentUser() user: JwtValidateUser, @Body() dto: EnqueueScrapeDto) {
    return this.jobSourcesService.enqueueScrape(user.userId, dto);
  }

  @Post('complete')
  @Public()
  @ApiOperation({ summary: 'Worker callback for completed scrape runs' })
  async completeScrape(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: ScrapeCompleteDto,
  ) {
    return this.jobSourcesService.completeScrape(dto, authorization);
  }
}
