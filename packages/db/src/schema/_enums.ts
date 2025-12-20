import { pgEnum } from 'drizzle-orm/pg-core';

export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']);

export const otpTypeEnum = pgEnum('otp_type', [
  'EMAIL_REGISTER', // Email Register
  'PASSWORD_RESET', // Password Reset
]);

export const documentTypeEnum = pgEnum('document_type', ['CV', 'LINKEDIN', 'OTHER']);
export const careerProfileStatusEnum = pgEnum('career_profile_status', ['PENDING', 'READY', 'FAILED']);

export type OTPType = (typeof otpTypeEnum.enumValues)[number];
export type Gender = (typeof genderEnum.enumValues)[number];
export type DocumentType = (typeof documentTypeEnum.enumValues)[number];
export type CareerProfileStatus = (typeof careerProfileStatusEnum.enumValues)[number];
