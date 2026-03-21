import { Module } from '@nestjs/common';

import { AuthorizationEventsService } from '@/common/authorization/authorization-events.service';
import { AuthorizationService } from '@/common/authorization/authorization.service';

@Module({
  providers: [AuthorizationService, AuthorizationEventsService],
  exports: [AuthorizationService, AuthorizationEventsService],
})
export class AuthorizationModule {}
