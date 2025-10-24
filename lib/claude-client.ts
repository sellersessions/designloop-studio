import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateWithClaude(
  systemPrompt: string,
  userMessage: string,
  model: string = 'claude-sonnet-4-5-20250929'
): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 16000,
      temperature: 1,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    throw new Error('Unexpected response type from Claude');
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

export async function analyzeImageWithClaude(
  imageBase64: string,
  imageMediaType: string = 'image/jpeg'
): Promise<string> {
  // Validate and cast media type to allowed values
  const allowedMediaTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
  type AllowedImageMediaType = typeof allowedMediaTypes[number];

  if (!allowedMediaTypes.includes(imageMediaType as AllowedImageMediaType)) {
    throw new Error(`Unsupported media type: ${imageMediaType}. Allowed types: ${allowedMediaTypes.join(', ')}`);
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
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
              text: `Analyze this image in detail for use in video generation. Extract:

1. **Colors**: Exact color palette (primary, secondary, accent colors)
2. **Lighting**: Direction, quality (soft/hard), color temperature, shadows
3. **Composition**: Framing, rule of thirds, balance, focal points
4. **Style**: Photographic style, artistic approach, mood, tone
5. **Subjects**: People, products, objects with detailed descriptions
6. **Textures & Materials**: Surface qualities, finishes, patterns
7. **Setting/Environment**: Location, background elements, context
8. **Brand Elements**: Logos, text, design elements (if product image)

Provide a structured analysis that can be used to maintain visual consistency in video generation.`,
            },
          ],
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    throw new Error('Unexpected response type from Claude');
  } catch (error) {
    console.error('Error analyzing image with Claude:', error);
    throw error;
  }
}
