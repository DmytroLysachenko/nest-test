import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { DocumentsService } from './documents.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { ConfirmDocumentDto } from './dto/confirm-document.dto';
import { ListDocumentsQuery } from './dto/list-documents.query';
import { ExtractDocumentDto } from './dto/extract-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { SyncDocumentsDto } from './dto/sync-documents.dto';
import { DocumentEventResponse } from './dto/document-event.response';
import { DocumentUploadHealthResponse } from './dto/document-upload-health.response';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Create signed upload URL for document' })
  async createUploadUrl(
    @CurrentUser() user: JwtValidateUser,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() dto: CreateUploadUrlDto,
  ) {
    return this.documentsService.createUploadUrl(user.userId, dto, requestId);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm document upload in storage' })
  async confirmUpload(
    @CurrentUser() user: JwtValidateUser,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() dto: ConfirmDocumentDto,
  ) {
    return this.documentsService.confirmUpload(user.userId, dto, requestId);
  }

  @Get()
  @ApiOperation({ summary: 'List documents for current user' })
  async list(@CurrentUser() user: JwtValidateUser, @Query() query: ListDocumentsQuery) {
    return this.documentsService.list(user.userId, query);
  }

  @Post('extract')
  @ApiOperation({ summary: 'Extract text from uploaded PDF' })
  async extractText(
    @CurrentUser() user: JwtValidateUser,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() dto: ExtractDocumentDto,
  ) {
    return this.documentsService.extractText(user.userId, dto, requestId);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Get document upload/extraction diagnostics timeline' })
  @ApiOkResponse({ type: [DocumentEventResponse] })
  async listEvents(@CurrentUser() user: JwtValidateUser, @Param('id') documentId: string) {
    return this.documentsService.listEvents(user.userId, documentId);
  }

  @Get('upload-health')
  @ApiOperation({ summary: 'Check document upload capability and storage connectivity' })
  @ApiOkResponse({ type: DocumentUploadHealthResponse })
  async uploadHealth(@CurrentUser() user: JwtValidateUser, @Headers('x-request-id') requestId: string | undefined) {
    return this.documentsService.checkUploadHealth(user.userId, requestId);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync DB documents with GCS objects' })
  async sync(@CurrentUser() user: JwtValidateUser, @Body() dto: SyncDocumentsDto) {
    return this.documentsService.syncWithStorage(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by id' })
  async getById(@CurrentUser() user: JwtValidateUser, @Param('id') documentId: string) {
    return this.documentsService.getById(user.userId, documentId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document metadata' })
  async update(@CurrentUser() user: JwtValidateUser, @Param('id') documentId: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(user.userId, documentId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document from GCS and DB' })
  async remove(@CurrentUser() user: JwtValidateUser, @Param('id') documentId: string) {
    return this.documentsService.remove(user.userId, documentId);
  }
}
