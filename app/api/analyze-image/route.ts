import { NextRequest, NextResponse } from 'next/server';
import { analyzeImageWithClaude } from '@/lib/claude-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, imageMediaType } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Missing imageBase64' },
        { status: 400 }
      );
    }

    // Remove data URL prefix if present
    let base64Data = imageBase64;
    if (base64Data.includes('base64,')) {
      base64Data = base64Data.split('base64,')[1];
    }

    const analysis = await analyzeImageWithClaude(
      base64Data,
      imageMediaType || 'image/jpeg'
    );

    return NextResponse.json({
      success: true,
      analysis,
    });

  } catch (error: any) {
    console.error('Error analyzing image:', error);

    return NextResponse.json(
      {
        error: 'Failed to analyze image',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
