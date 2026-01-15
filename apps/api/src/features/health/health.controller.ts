import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@/common/decorators';

import { HealthService } from './health.service';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('test')
  @ApiOperation({ summary: 'Simple health test' })
  healthCheck() {
    return 'Http working fine';
  }
  @Get()
  @ApiOperation({ summary: 'Health check with dependencies' })
  async check() {
    return await this.healthService.check();
  }
}
