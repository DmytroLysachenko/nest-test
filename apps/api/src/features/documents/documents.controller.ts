import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { DocumentsService } from './documents.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { ConfirmDocumentDto } from './dto/confirm-document.dto';
import { ListDocumentsQuery } from './dto/list-documents.query';
import { ExtractDocumentDto } from './dto/extract-document.dto';

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
}
