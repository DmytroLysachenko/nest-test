import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards';
import { JwtValidateUser } from '@/types/interface/jwt';

import { CompaniesService } from './companies.service';
import { CompanyDetailResponseDto, CompaniesListResponseDto } from './dto/company.response';
import { ListCompaniesQuery } from './dto/list-companies.query';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'List companies for discovery and filtering' })
  @ApiOkResponse({ type: CompaniesListResponseDto })
  async list(@CurrentUser() _user: JwtValidateUser, @Query() query: ListCompaniesQuery) {
    return this.companiesService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company detail with linked offers' })
  @ApiOkResponse({ type: CompanyDetailResponseDto })
  async getById(@CurrentUser() _user: JwtValidateUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.companiesService.getById(id);
  }
}
