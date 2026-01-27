import { pgEnum } from 'drizzle-orm/pg-core';

export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']);

export const otpTypeEnum = pgEnum('otp_type', [
  'EMAIL_REGISTER', // Email Register
  'PASSWORD_RESET', // Password Reset
]);

export const documentTypeEnum = pgEnum('document_type', ['CV', 'LINKEDIN', 'OTHER']);
export const careerProfileStatusEnum = pgEnum('career_profile_status', ['PENDING', 'READY', 'FAILED']);
export const documentExtractionStatusEnum = pgEnum('document_extraction_status', ['PENDING', 'READY', 'FAILED']);
export const jobSourceEnum = pgEnum('job_source', ['PRACUJ_PL']);
export const jobSourceRunStatusEnum = pgEnum('job_source_run_status', ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']);
export const jobOfferStatusEnum = pgEnum('job_offer_status', ['NEW', 'SEEN', 'SAVED', 'APPLIED', 'DISMISSED']);

export type OTPType = (typeof otpTypeEnum.enumValues)[number];
export type Gender = (typeof genderEnum.enumValues)[number];
export type DocumentType = (typeof documentTypeEnum.enumValues)[number];
export type CareerProfileStatus = (typeof careerProfileStatusEnum.enumValues)[number];
export type DocumentExtractionStatus = (typeof documentExtractionStatusEnum.enumValues)[number];
export type JobSource = (typeof jobSourceEnum.enumValues)[number];
export type JobSourceRunStatus = (typeof jobSourceRunStatusEnum.enumValues)[number];
export type JobOfferStatus = (typeof jobOfferStatusEnum.enumValues)[number];
