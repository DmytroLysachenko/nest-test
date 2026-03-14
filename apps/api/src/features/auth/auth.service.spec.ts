import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  const createService = () => {
    const db = {
      transaction: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
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
      hashRefreshToken: jest.fn(),
      rotateRefreshToken: jest.fn(),
    } as any;
    const googleOauthService = {
      verifyIdToken: jest.fn(),
      exchangeAuthorizationCodeForIdToken: jest.fn(),
    } as any;

    const service = new AuthService(db, optsService, logger, tokenService, googleOauthService);
    return { service, db, optsService, tokenService, googleOauthService };
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
                    isActive: true,
                    lastLoginAt: null,
                    deletedAt: null,
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

  it('updates lastLoginAt when issuing a new login session', async () => {
    const { service, db, tokenService } = createService();
    tokenService.createJwtToken.mockResolvedValueOnce({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      sessionRefreshTime: '2026-01-01T00:00:00.000Z',
    });
    tokenService.hashRefreshToken.mockResolvedValueOnce('hashed-refresh-token');
    db.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    });
    db.insert.mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    });

    await service.login(
      {
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      } as any,
      {
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        deviceType: 'desktop',
        deviceName: 'test-device',
        deviceOs: 'test-os',
        browser: 'test-browser',
      },
    );

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('rejects refresh for inactive accounts', async () => {
    const { service, db, tokenService } = createService();

    tokenService.verifyRefreshToken.mockResolvedValueOnce({ sub: 'user-1', role: 'user' });
    tokenService.findSessionByRefreshToken.mockResolvedValueOnce({ id: 'session-1' });

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
                    isActive: false,
                    lastLoginAt: null,
                    deletedAt: null,
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                  },
                ]),
              ),
          }),
        }),
      }),
    });

    await expect(service.refresh('refresh-token')).rejects.toThrow('Account is inactive');
  });

  it('fails google login when nonce does not match', async () => {
    const { service, googleOauthService } = createService();
    googleOauthService.verifyIdToken.mockResolvedValueOnce({
      email: 'user@example.com',
      email_verified: true,
      nonce: 'nonce-a',
    });

    await expect(
      service.loginWithGoogle(
        {
          idToken: 'id-token',
          nonce: 'nonce-b',
        },
        {
          ip: '127.0.0.1',
          userAgent: 'test',
          deviceType: 'desktop',
          deviceName: 'test-device',
          deviceOs: 'test-os',
          browser: 'test-browser',
        },
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('fails google login when neither id token nor code is provided', async () => {
    const { service } = createService();

    await expect(
      service.loginWithGoogle(
        {},
        {
          ip: '127.0.0.1',
          userAgent: 'test',
          deviceType: 'desktop',
          deviceName: 'test-device',
          deviceOs: 'test-os',
          browser: 'test-browser',
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
