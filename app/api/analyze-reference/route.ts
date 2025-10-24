import { NextRequest, NextResponse } from 'next/server';
import { analyzeImageWithHaiku } from '@/lib/haiku-client';

export async function POST(request: NextRequest) {
  try {
    // Validate content-type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      );
    }

    const body = await request.json();
    const { imageBase64, imageMediaType, creativeDirection } = body;

    // Enhanced validation
    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length === 0) {
      return NextResponse.json(
        { error: 'Valid imageBase64 is required' },
        { status: 400 }
      );
    }

    // Remove data URL prefix if present
    let base64Data = imageBase64;
    if (base64Data.includes('base64,')) {
      base64Data = base64Data.split('base64,')[1];
    }

    // Build custom analysis prompt if creative direction provided
    let analysisPrompt = `Analyze this image in detail for video storyboarding purposes.

Identify:
1. **Product/Subject:** What is the main subject or product?
2. **Visual Style:** Colors, lighting, composition, aesthetic
3. **Setting/Environment:** Location, background, context
4. **Mood/Tone:** Overall feeling and atmosphere
5. **Brand Elements:** Logos, text, brand colors visible
6. **Key Details:** Important features, textures, materials`;

    if (creativeDirection) {
      analysisPrompt += `

**Creative Direction from User:**
${creativeDirection}

Please consider this direction when analyzing the image and suggest how the visual elements could support this creative vision.`;
    }

    analysisPrompt += `

Provide a concise summary in this format:

**Product/Subject:** [description]
**Visual Style:** [description]
**Setting:** [description]
**Mood/Tone:** [description]
**Brand Elements:** [description]
**Key Details:** [description]
**Storyboard Recommendations:** [2-3 suggestions for video concept based on image]`;

    // Call Claude Haiku Vision
    const analysis = await analyzeImageWithHaiku(
      base64Data,
      imageMediaType || 'image/jpeg',
      analysisPrompt
    );

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error('Error analyzing reference image:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze reference image',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
