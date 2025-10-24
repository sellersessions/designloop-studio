import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate text using Claude Haiku 3.5 (fastest, cheapest model)
 * Cost: ~$0.006 per generation
 * Best for: Creative work, storyboarding, iteration
 */
export async function generateWithHaiku(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  console.log('🚀 [haiku-client] Starting Claude API call...');

  // ✅ TIMEOUT PROTECTION: Don't wait forever
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Claude API timeout after 60 seconds'));
    }, 60000); // 60 second timeout
  });

  try {
    const apiCall = anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 8192,
      temperature: 1,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Race between API call and timeout
    const message = await Promise.race([apiCall, timeoutPromise]);

    console.log('✅ [haiku-client] Claude API responded successfully');

    const content = message.content[0];
    if (content.type === 'text') {
      console.log(`📄 [haiku-client] Response length: ${content.text.length} chars`);
      return content.text;
    }

    throw new Error('Unexpected response type from Claude Haiku');
  } catch (error) {
    console.error('❌ [haiku-client] Error calling Claude Haiku API:', error);
    throw error;
  }
}

/**
 * Analyze image using Claude Haiku 3.5 with Vision
 * Cost: ~$0.008 per image analysis
 */
export async function analyzeImageWithHaiku(
  imageBase64: string,
  imageMediaType: string = 'image/jpeg',
  analysisPrompt?: string
): Promise<string> {
  // Validate and cast media type to allowed values
  const allowedMediaTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
  type AllowedImageMediaType = typeof allowedMediaTypes[number];

  if (!allowedMediaTypes.includes(imageMediaType as AllowedImageMediaType)) {
    throw new Error(`Unsupported media type: ${imageMediaType}. Allowed types: ${allowedMediaTypes.join(', ')}`);
  }

  try {
    const defaultPrompt = `Analyze this image in detail for video storyboarding purposes.

Identify:
1. **Product/Subject:** What is the main subject or product?
2. **Visual Style:** Colors, lighting, composition, aesthetic
3. **Setting/Environment:** Location, background, context
4. **Mood/Tone:** Overall feeling and atmosphere
5. **Brand Elements:** Logos, text, brand colors visible
6. **Key Details:** Important features, textures, materials

Provide a concise summary suitable for creative direction.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageMediaType as AllowedImageMediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: analysisPrompt || defaultPrompt,
            },
          ],
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    throw new Error('Unexpected response type from Claude Haiku');
  } catch (error) {
    console.error('Error analyzing image with Claude Haiku:', error);
    throw error;
  }
}

/**
 * Multi-turn conversation with Claude Haiku
 * Used for concept refinement chat
 */
export async function conversationWithHaiku(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 8192,
      temperature: 1,
      system: systemPrompt,
      messages,
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    throw new Error('Unexpected response type from Claude Haiku');
  } catch (error) {
    console.error('Error in conversation with Claude Haiku:', error);
    throw error;
  }
}
