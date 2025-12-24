import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { DocumentsService } from './documents.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload-url')
  async createUploadUrl(@CurrentUser() user: JwtValidateUser, @Body() dto: CreateUploadUrlDto) {
    return this.documentsService.createUploadUrl(user.userId, dto);
  }
}
