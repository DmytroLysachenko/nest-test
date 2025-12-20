import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

import { Env } from '@/config/env';

type GenerateTextOptions = {
  model?: string;
};

@Injectable()
export class GeminiService {
  private readonly client: GoogleGenerativeAI;
  private readonly defaultModel: string;

  constructor(private readonly config: ConfigService<Env>) {
    const apiKey = this.config.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.client = new GoogleGenerativeAI(apiKey);
    this.defaultModel = this.config.get('GEMINI_MODEL') ?? 'gemini-2.5-flash-lite';
  }

  async generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
    const sanitizedPrompt = prompt?.trim();
    if (!sanitizedPrompt) {
      throw new BadRequestException('Prompt is required');
    }

    const model = this.getModel(options.model);
    const result = await model.generateContent(sanitizedPrompt);

    return result.response.text();
  }

  private getModel(model?: string): GenerativeModel {
    return this.client.getGenerativeModel({
      model: model ?? this.defaultModel,
    });
  }
}
