import { UnauthorizedException } from '@nestjs/common';

export class UserNotFoundException extends UnauthorizedException {
  constructor(message = 'Invalid credentials or unauthorized request.') {
    super(message);
  }
}
