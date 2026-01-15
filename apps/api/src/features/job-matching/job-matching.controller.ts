import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { JobMatchingService } from './job-matching.service';
import { ScoreJobDto } from './dto/score-job.dto';

@ApiTags('job-matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('job-matching')
export class JobMatchingController {
  constructor(private readonly jobMatchingService: JobMatchingService) {}

  @Post('score')
  @ApiOperation({ summary: 'Score job description against profile JSON' })
  async score(@CurrentUser() user: JwtValidateUser, @Body() dto: ScoreJobDto) {
    return this.jobMatchingService.scoreJob(user.userId, dto);
  }
}
