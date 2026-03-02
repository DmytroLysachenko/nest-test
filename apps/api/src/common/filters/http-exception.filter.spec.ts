import { ArgumentsHost, BadRequestException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';

const createHost = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const request = {
    method: 'POST',
    url: '/api/auth/login',
    headers: {},
    id: 'req-1',
  };
  const response = { status };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
};

describe('HttpExceptionFilter', () => {
  it('returns friendly generic message for internal errors', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new Error('Failed query: select * from users'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Something went wrong. Please try again.',
        }),
      }),
    );
  });

  it('returns friendly unauthorized message', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new UnauthorizedException('Invalid worker callback token'), host);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Invalid credentials or unauthorized request.',
        }),
      }),
    );
  });

  it('keeps validation details while using friendly validation message', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new BadRequestException(['email must be an email', 'password is required']), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Request validation failed.',
          details: ['email must be an email', 'password is required'],
        }),
      }),
    );
  });

  it('sanitizes internal server exception message', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new InternalServerErrorException('database unavailable'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Something went wrong. Please try again.',
        }),
      }),
    );
  });
});
