import { Role } from '../role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
