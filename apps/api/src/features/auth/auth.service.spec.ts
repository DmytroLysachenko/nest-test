import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  const createService = () => {
    const db = {
      transaction: jest.fn(),
      update: jest.fn(),
      select: jest.fn(),
    } as any;
    const optsService = {
      verifyOtp: jest.fn(),
    } as any;
    const logger = {
      error: jest.fn(),
    } as any;
    const tokenService = {
      verifyRefreshToken: jest.fn(),
      findSessionByRefreshToken: jest.fn(),
      createJwtToken: jest.fn(),
      rotateRefreshToken: jest.fn(),
    } as any;

    const service = new AuthService(db, optsService, logger, tokenService);
    return { service, db, optsService, tokenService };
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

  it('throws unauthorized when refresh token is invalid', async () => {
    const { service, tokenService } = createService();
    tokenService.verifyRefreshToken.mockRejectedValueOnce(new Error('invalid'));

    await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
  });

  it('throws unauthorized when refresh session is missing', async () => {
    const { service, tokenService } = createService();
    tokenService.verifyRefreshToken.mockResolvedValueOnce({ sub: 'user-1', role: 'user' });
    tokenService.findSessionByRefreshToken.mockResolvedValueOnce(null);

    await expect(service.refresh('refresh-token')).rejects.toThrow('Refresh session not found');
  });

  it('rotates refresh token and returns new token pair', async () => {
    const { service, db, tokenService } = createService();

    tokenService.verifyRefreshToken.mockResolvedValueOnce({ sub: 'user-1', role: 'user' });
    tokenService.findSessionByRefreshToken.mockResolvedValueOnce({ id: 'session-1' });
    tokenService.createJwtToken.mockResolvedValueOnce({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      sessionRefreshTime: '2026-01-01T00:00:00.000Z',
    });

    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            then: (cb: (rows: unknown[]) => unknown) =>
              Promise.resolve(
                cb([
                  {
                    id: 'user-1',
                    email: 'user@example.com',
                    role: 'user',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                  },
                ]),
              ),
          }),
        }),
      }),
    });

    const result = await service.refresh('refresh-token');

    expect(tokenService.rotateRefreshToken).toHaveBeenCalledWith('session-1', 'new-refresh');
    expect(result).toMatchObject({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      user: {
        id: 'user-1',
        email: 'user@example.com',
      },
    });
  });
});