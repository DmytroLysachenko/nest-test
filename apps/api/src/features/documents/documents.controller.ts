import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { DocumentsService } from './documents.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { ConfirmDocumentDto } from './dto/confirm-document.dto';
import { ListDocumentsQuery } from './dto/list-documents.query';
import { ExtractDocumentDto } from './dto/extract-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Create signed upload URL for document' })
  async createUploadUrl(@CurrentUser() user: JwtValidateUser, @Body() dto: CreateUploadUrlDto) {
    return this.documentsService.createUploadUrl(user.userId, dto);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm document upload in storage' })
  async confirmUpload(@CurrentUser() user: JwtValidateUser, @Body() dto: ConfirmDocumentDto) {
    return this.documentsService.confirmUpload(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List documents for current user' })
  async list(@CurrentUser() user: JwtValidateUser, @Query() query: ListDocumentsQuery) {
    return this.documentsService.list(user.userId, query);
  }

  @Post('extract')
  @ApiOperation({ summary: 'Extract text from uploaded PDF' })
  async extractText(@CurrentUser() user: JwtValidateUser, @Body() dto: ExtractDocumentDto) {
    return this.documentsService.extractText(user.userId, dto);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync DB documents with GCS objects' })
  async sync(@CurrentUser() user: JwtValidateUser) {
    return this.documentsService.syncWithStorage(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by id' })
  async getById(@CurrentUser() user: JwtValidateUser, @Param('id') documentId: string) {
    return this.documentsService.getById(user.userId, documentId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document metadata' })
  async update(
    @CurrentUser() user: JwtValidateUser,
    @Param('id') documentId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(user.userId, documentId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document from GCS and DB' })
  async remove(@CurrentUser() user: JwtValidateUser, @Param('id') documentId: string) {
    return this.documentsService.remove(user.userId, documentId);
  }
}
