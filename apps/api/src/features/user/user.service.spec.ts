import { UserService } from './user.service';

describe('UserService', () => {
  it('soft deletes the user and revokes active sessions', async () => {
    const db = {
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              {
                id: 'user-1',
                deletedAt: new Date('2026-03-14T10:00:00.000Z'),
              },
            ]),
          }),
        }),
      }),
    } as any;
    const tokenService = {
      removeToken: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new UserService(db, tokenService);
    const result = await service.deleteUser('user-1');

    expect(tokenService.removeToken).toHaveBeenCalledWith('user-1');
    expect(result).toMatchObject({
      ok: true,
      userId: 'user-1',
      deletedAt: '2026-03-14T10:00:00.000Z',
    });
  });
});
