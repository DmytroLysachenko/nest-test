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
import { GoogleOauthLoginDto } from './dto/google-oauth-login.dto';

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

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
  @Throttle({ login: {} })
  async login(@Body() body: LoginDto, @Device() device: DeviceType, @Req() request: Request) {
    const user = request.user as User;
    return this.authService.login(user, device);
  }

  @Public()
  @Post('oauth/google')
  @ApiOperation({ summary: 'Login or register with Google OAuth (authorization code or id token)' })
  @Throttle({ login: {} })
  async loginWithGoogle(@Body() body: GoogleOauthLoginDto, @Device() device: DeviceType) {
    return this.authService.loginWithGoogle(body, device);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @Throttle({ refresh: {} })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @Throttle({ register: {} })
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
  @Throttle({ otp: {} })
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body);
    return 'Reset password successfully';
  }

  @Public()
  @Post('send-register-code')
  @ApiOperation({ summary: 'Send registration verification code' })
  @Throttle({ otp: {} })
  async sendRegisterCode(@Body() body: SendCodeDto) {
    try {
      const code = await this.optsService.generateOtpCode(body.email, 'EMAIL_REGISTER');
      await this.mailService.sendRegisterCode(body.email, code);
    } catch (error) {
      throw new BadRequestException(toErrorMessage(error, 'Failed to send registration code'));
    }
  }

  @Public()
  @Post('send-reset-password-code')
  @ApiOperation({ summary: 'Send reset password verification code' })
  @Throttle({ otp: {} })
  async sendResetPasswordCode(@Body() body: SendCodeDto) {
    try {
      const code = await this.optsService.generateOtpCode(body.email, 'PASSWORD_RESET');
      await this.mailService.sendResetPasswordCode(body.email, code);
    } catch (error) {
      throw new BadRequestException(toErrorMessage(error, 'Failed to send reset password code'));
    }
  }
}
