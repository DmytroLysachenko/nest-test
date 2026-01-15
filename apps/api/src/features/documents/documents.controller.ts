import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { DocumentsService } from './documents.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { ConfirmDocumentDto } from './dto/confirm-document.dto';
import { ListDocumentsQuery } from './dto/list-documents.query';
import { ExtractDocumentDto } from './dto/extract-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload-url')
  async createUploadUrl(@CurrentUser() user: JwtValidateUser, @Body() dto: CreateUploadUrlDto) {
    return this.documentsService.createUploadUrl(user.userId, dto);
  }

  @Post('confirm')
  async confirmUpload(@CurrentUser() user: JwtValidateUser, @Body() dto: ConfirmDocumentDto) {
    return this.documentsService.confirmUpload(user.userId, dto);
  }

  @Get()
  async list(@CurrentUser() user: JwtValidateUser, @Query() query: ListDocumentsQuery) {
    return this.documentsService.list(user.userId, query);
  }

  @Post('extract')
  async extractText(@CurrentUser() user: JwtValidateUser, @Body() dto: ExtractDocumentDto) {
    return this.documentsService.extractText(user.userId, dto);
  }

  @Post('sync')
  async sync(@CurrentUser() user: JwtValidateUser) {
    return this.documentsService.syncWithStorage(user.userId);
  }

  @Get(':id')
  async getById(@CurrentUser() user: JwtValidateUser, @Param('id') documentId: string) {
    return this.documentsService.getById(user.userId, documentId);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtValidateUser,
    @Param('id') documentId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(user.userId, documentId, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtValidateUser, @Param('id') documentId: string) {
    return this.documentsService.remove(user.userId, documentId);
  }
}
