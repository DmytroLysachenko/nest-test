import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI } from '@google-cloud/vertexai';

import { Env } from '@/config/env';

type GenerateTextOptions = {
  model?: string;
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
}
