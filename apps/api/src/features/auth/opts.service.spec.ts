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
});
