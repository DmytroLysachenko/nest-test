import { randomInt } from 'crypto';

export const generateCode = (length = 6) => {
  return randomInt(0, 10 ** length)
    .toString()
    .padStart(length, '0');
};
