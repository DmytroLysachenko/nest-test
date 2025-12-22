export interface AuthTokensInterface {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  role: string;
  exp?: number;
  iat?: number; // expiresIn adds exp and iat automatically
}

export interface JwtValidateUser {
  userId: string;
  role: string;
}
