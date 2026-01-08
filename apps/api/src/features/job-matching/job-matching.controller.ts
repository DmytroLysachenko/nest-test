import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { JobMatchingService } from './job-matching.service';
import { ScoreJobDto } from './dto/score-job.dto';

@UseGuards(JwtAuthGuard)
@Controller('job-matching')
export class JobMatchingController {
  constructor(private readonly jobMatchingService: JobMatchingService) {}

  @Post('score')
  async score(@CurrentUser() user: JwtValidateUser, @Body() dto: ScoreJobDto) {
    return this.jobMatchingService.scoreJob(user.userId, dto);
  }
}
