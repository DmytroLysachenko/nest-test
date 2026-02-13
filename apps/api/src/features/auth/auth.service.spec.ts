import { BadRequestException } from '@nestjs/common';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  const createService = () => {
    const db = {
      transaction: jest.fn(),
      update: jest.fn(),
    } as any;
    const optsService = {
      verifyOtp: jest.fn(),
    } as any;
    const logger = {
      error: jest.fn(),
    } as any;
    const tokenService = {} as any;

    const service = new AuthService(db, optsService, logger, tokenService);
    return { service, db, optsService };
  };

  it('throws when register passwords do not match', async () => {
    const { service, optsService } = createService();

    await expect(
      service.register({
        email: 'user@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
        code: '123456',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(optsService.verifyOtp).not.toHaveBeenCalled();
  });

  it('verifies register OTP with EMAIL_REGISTER type', async () => {
    const { service, optsService } = createService();
    optsService.verifyOtp.mockResolvedValueOnce(null);

    await expect(
      service.register({
        email: 'user@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        code: '123456',
      }),
    ).rejects.toThrow('Verification code error');

    expect(optsService.verifyOtp).toHaveBeenCalledWith('user@example.com', '123456', 'EMAIL_REGISTER');
  });

  it('verifies reset OTP with PASSWORD_RESET type', async () => {
    const { service, optsService } = createService();
    optsService.verifyOtp.mockResolvedValueOnce(null);

    await expect(
      service.resetPassword({
        email: 'user@example.com',
        code: '654321',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    ).rejects.toThrow('Verification code error');

    expect(optsService.verifyOtp).toHaveBeenCalledWith('user@example.com', '654321', 'PASSWORD_RESET');
  });
});
