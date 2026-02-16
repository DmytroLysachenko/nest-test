import { OptsService } from './opts.service';

describe('OptsService', () => {
  it('generates OTP with 10-minute expiration window', async () => {
    const values = jest.fn().mockResolvedValue(undefined);
    const db = {
      insert: jest.fn().mockReturnValue({
        values,
      }),
    } as any;

    const service = new OptsService(db);
    const before = Date.now();
    await service.generateOtpCode('user@example.com', 'EMAIL_REGISTER');
    const after = Date.now();

    expect(values).toHaveBeenCalledTimes(1);
    const inserted = values.mock.calls[0][0];
    const expiresAt = new Date(inserted.expiresAt).getTime();
    const minExpected = before + 9.5 * 60 * 1000;
    const maxExpected = after + 10.5 * 60 * 1000;

    expect(expiresAt).toBeGreaterThan(minExpected);
    expect(expiresAt).toBeLessThan(maxExpected);
  });

  it('verifies OTP with type and non-expired constraint', async () => {
    const then = jest.fn((cb: (rows: unknown[]) => unknown) => Promise.resolve(cb([{ id: 'otp-1' }])));
    const limit = jest.fn().mockReturnValue({ then });
    const orderBy = jest.fn().mockReturnValue({ limit });
    const where = jest.fn().mockReturnValue({ orderBy });
    const from = jest.fn().mockReturnValue({ where });
    const select = jest.fn().mockReturnValue({ from });
    const db = { select } as any;

    const service = new OptsService(db);
    const result = await service.verifyOtp('user@example.com', '123456', 'PASSWORD_RESET');

    expect(select).toHaveBeenCalled();
    expect(where).toHaveBeenCalledTimes(1);
    expect(orderBy).toHaveBeenCalledTimes(1);
    expect(limit).toHaveBeenCalledWith(1);
    expect(result).toEqual({ id: 'otp-1' });
  });
});
