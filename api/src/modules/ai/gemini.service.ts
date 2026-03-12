import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    VertexAI,
    GenerativeModel,
    HarmCategory,
    HarmBlockThreshold,
} from '@google-cloud/vertexai';

/**
 * Thin wrapper around Vertex AI's Gemini 3.1 Flash Lite.
 * Provides a single `generateStructured<T>()` method for all AI workflows.
 */
@Injectable()
export class GeminiService {
    private readonly logger = new Logger(GeminiService.name);
    private readonly model: GenerativeModel;

    constructor(private readonly config: ConfigService) {
        const project = this.config.get<string>('VERTEX_PROJECT_ID', '');
        const location = this.config.get<string>('VERTEX_LOCATION', 'us-central1');
        const modelId = this.config.get<string>('GEMINI_MODEL', 'gemini-3.1-flash-lite-preview');

        if (!project) {
            this.logger.warn('VERTEX_PROJECT_ID not set — AI features will be disabled');
        }

        const vertexai = new VertexAI({ project, location });

        this.model = vertexai.getGenerativeModel({
            model: modelId,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            ],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,   // low temperature for consistent structured output
                maxOutputTokens: 2048,
            },
        });
    }

    /**
     * Send a prompt + context to Gemini, parse response as JSON, validate it
     * against the expected schema and return it typed as T.
     *
     * @throws ServiceUnavailableException if Gemini is unreachable or returns invalid JSON
     */
    async generateStructured<T>(
        systemPrompt: string,
        userContext: string,
    ): Promise<T> {
        const projectId = this.config.get<string>('VERTEX_PROJECT_ID');
        if (!projectId) {
            throw new ServiceUnavailableException(
                'AI features are not configured — please set VERTEX_PROJECT_ID.',
            );
        }

        try {
            const request = {
                contents: [
                    {
                        role: 'user' as const,
                        parts: [{ text: `${systemPrompt}\n\n---\n\n${userContext}` }],
                    },
                ],
            };

            const response = await this.model.generateContent(request);
            const candidate = response.response?.candidates?.[0];
            const rawText = candidate?.content?.parts?.[0]?.text ?? '';

            try {
                return JSON.parse(rawText) as T;
            } catch {
                this.logger.error('Gemini returned non-JSON response (response not logged to avoid data leaks)');
                throw new ServiceUnavailableException(
                    'AI analysis returned an unexpected format. Please try again.',
                );
            }
        } catch (error) {
            if (error instanceof ServiceUnavailableException) throw error;
            // Log only the error type, never the raw message (could contain prompt content)
            this.logger.error(`Gemini generation failed: ${error?.constructor?.name ?? 'UnknownError'}`);
            throw new ServiceUnavailableException(
                'AI analysis is temporarily unavailable. Please try again later.',
            );
        }
    }
}
