import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { Public } from '@/common/decorators';
import { Device, DeviceType } from '@/common/decorators/device.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards';
import { LocalAuthGuard } from '@/common/guards/local-auth.guard';
import { JwtValidateUser } from '@/types/interface/jwt';

import { LoginDto } from './dto/login-dto';
import { AuthService } from './auth.service';
import { SendCodeDto } from './dto/send-code-dto';
import { MailService } from './mail.service';
import { OptsService } from './opts.service';
import { RegisterDto } from './dto/register-dto';
import { ChangePasswordDto } from './dto/change-password-dto';
import { ResetPasswordDto } from './dto/rest-password';
import { User } from './auth.interface';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private mailService: MailService,
    private optsService: OptsService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() body: LoginDto, @Device() device: DeviceType, @Req() request: Request) {
    const user = request.user as User;
    return this.authService.login(user, device);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current user' })
  async logout(@CurrentUser() user: JwtValidateUser) {
    await this.authService.logout(user.userId);
    return 'Logout successfully';
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for current user' })
  async changePassword(@Body() body: ChangePasswordDto, @CurrentUser() user: JwtValidateUser) {
    await this.authService.changePassword(user.userId, body);
    return 'Change password successfully';
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with verification code' })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body);
    return 'Reset password successfully';
  }

  @Public()
  @Post('send-register-code')
  @ApiOperation({ summary: 'Send registration verification code' })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async sendRegisterCode(@Body() body: SendCodeDto) {
    try {
      const code = await this.optsService.generateOtpCode(body.email, 'EMAIL_REGISTER');
      await this.mailService.sendRegisterCode(body.email, code);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Public()
  @Post('send-reset-password-code')
  @ApiOperation({ summary: 'Send reset password verification code' })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async sendResetPasswordCode(@Body() body: SendCodeDto) {
    try {
      const code = await this.optsService.generateOtpCode(body.email, 'PASSWORD_RESET');
      await this.mailService.sendResetPasswordCode(body.email, code);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
