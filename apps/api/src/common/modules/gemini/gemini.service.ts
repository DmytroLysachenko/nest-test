import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI } from '@google-cloud/vertexai';
import type { z } from 'zod';

import { Env } from '@/config/env';

type GenerateTextOptions = {
  model?: string;
  responseMimeType?: 'text/plain' | 'application/json';
};

type GenerateStructuredOptions = {
  model?: string;
  retries?: number;
};

@Injectable()
export class GeminiService {
  private readonly defaultModel: string;
  private readonly vertex: VertexAI;
  private readonly location: string;

  constructor(private readonly config: ConfigService<Env>) {
    const projectId = this.config.get<string>('GCP_PROJECT_ID');
    if (!projectId) {
      throw new Error('GCP_PROJECT_ID is required for Vertex AI');
    }

    this.location = this.config.get<string>('GCP_LOCATION') ?? 'us-central1';
    this.defaultModel = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-1.5-flash';

    const clientEmail = this.config.get<string>('GCP_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('GCP_PRIVATE_KEY');
    const credentials =
      clientEmail && privateKey
        ? {
            client_email: clientEmail,
            private_key: privateKey.replace(/\\n/g, '\n'),
          }
        : undefined;

    this.vertex = new VertexAI({
      project: projectId,
      location: this.location,
      googleAuthOptions: credentials ? { credentials } : undefined,
    });
  }

  async generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
    const sanitizedPrompt = prompt?.trim();
    if (!sanitizedPrompt) {
      throw new BadRequestException('Prompt is required');
    }

    const modelName = options.model ?? this.defaultModel;
    const model = this.vertex.preview.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.4,
        ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
      },
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: sanitizedPrompt }],
        },
      ],
    });

    const candidate = result.response.candidates?.[0];
    const text = candidate?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
    return text;
  }

  async generateStructured<T extends z.ZodTypeAny>(
    prompt: string,
    schema: T,
    options: GenerateStructuredOptions = {},
  ): Promise<z.infer<T>> {
    const retries = options.retries ?? 2;
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
      const text = await this.generateText(prompt, {
        model: options.model,
        responseMimeType: 'application/json',
      });

      const parsed = this.tryParseJson(text);
      if (!parsed) {
        lastError = 'Model did not return valid JSON';
        continue;
      }

      const validated = schema.safeParse(parsed);
      if (!validated.success) {
        lastError = validated.error.message;
        continue;
      }

      return validated.data;
    }

    throw new BadRequestException(`Structured generation failed: ${lastError ?? 'unknown validation error'}`);
  }

  private tryParseJson(content: string) {
    const trimmed = content.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      const fenced = content.match(/```json\s*([\s\S]*?)\s*```/i)?.[1];
      if (!fenced) {
        return null;
      }
      try {
        return JSON.parse(fenced);
      } catch {
        return null;
      }
    }
  }
}
