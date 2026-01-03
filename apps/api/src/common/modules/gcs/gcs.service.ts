import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';

import { Env } from '@/config/env';

@Injectable()
export class GcsService {
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(private readonly config: ConfigService<Env>) {
    this.bucketName = this.config.get('GCS_BUCKET');
    if (!this.bucketName) {
      throw new Error('GCS_BUCKET is required');
    }
    this.storage = new Storage(this.getClientConfig());
  }

  async createSignedUploadUrl(objectPath: string, contentType: string, expiresInMinutes = 15) {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(objectPath);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
      contentType,
    });

    return url;
  }

  async fileExists(objectPath: string) {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(objectPath);
    const [exists] = await file.exists();
    return exists;
  }

  async downloadFile(objectPath: string) {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(objectPath);
    const [buffer] = await file.download();
    return buffer;
  }

  async listObjects(prefix: string) {
    const bucket = this.storage.bucket(this.bucketName);
    const [files] = await bucket.getFiles({ prefix });
    return files;
  }

  private getClientConfig(): ConstructorParameters<typeof Storage>[0] | undefined {
    const clientEmail = this.config.get('GCP_CLIENT_EMAIL');
    const privateKey = this.config.get('GCP_PRIVATE_KEY');
    const projectId = this.config.get('GCP_PROJECT_ID');

    if (!clientEmail || !privateKey) {
      return projectId ? { projectId } : undefined;
    }

    return {
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
    };
  }
}
