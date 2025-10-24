import { NextRequest, NextResponse } from 'next/server';
import { generateWithClaude } from '@/lib/claude-client';
import { VIDEO_SYSTEM_PROMPT } from '@/lib/prompts/video-system-prompt';

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

    const {
      model,
      promptModel,
      concept,
      duration,
      aspectRatio,
      shotCount,
      imageAnalysis,
      imageUrl,
    } = body;

    // Validation
    if (!model || !concept || !duration || !aspectRatio) {
      return NextResponse.json(
        { error: 'Missing required fields: model, concept, duration, aspectRatio' },
        { status: 400 }
      );
    }

    // Validate promptModel parameter
    const validModels = ['claude-sonnet-4-5-20250929', 'claude-3-5-haiku-20241022'];
    if (promptModel && !validModels.includes(promptModel)) {
      console.warn(`Invalid promptModel "${promptModel}" provided, using default: claude-sonnet-4-5-20250929`);
    }

    // Validate model-specific durations
    if (model === 'veo3' && ![4, 6, 8].includes(duration)) {
      return NextResponse.json(
        { error: 'VEO 3 only supports 4, 6, or 8 second durations' },
        { status: 400 }
      );
    }

    if (model === 'sora2' && ![4, 8, 12].includes(duration)) {
      return NextResponse.json(
        { error: 'Sora 2 only supports 4, 8, or 12 second durations' },
        { status: 400 }
      );
    }

    if (!['16:9', '9:16'].includes(aspectRatio)) {
      return NextResponse.json(
        { error: 'Aspect ratio must be 16:9 or 9:16' },
        { status: 400 }
      );
    }

    // Construct user message
    let userMessage = `Generate a video prompt for ${model.toUpperCase()} with the following specifications:

**Model**: ${model.toUpperCase()}
**Duration**: ${duration} seconds
**Aspect Ratio**: ${aspectRatio}
**Shot Count**: ${shotCount === 'auto' ? 'Auto (determine optimal)' : shotCount}

**Video Concept**:
${concept}
`;

    if (imageAnalysis) {
      userMessage += `

**Reference Image Analysis**:
${imageAnalysis}

**Image URL**: ${imageUrl || 'Not provided'}
`;
    }

    userMessage += `

Generate the complete JSON prompt following the schema exactly. Respond with ONLY the JSON object, no other text.`;

    // Call Claude API with selected model (default to Sonnet if not specified)
    const selectedModel = promptModel || 'claude-sonnet-4-5-20250929';
    const response = await generateWithClaude(VIDEO_SYSTEM_PROMPT, userMessage, selectedModel);

    // Extract JSON from response (Claude might wrap it in markdown)
    let jsonStr = response.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    // Parse and validate JSON
    const jsonData = JSON.parse(jsonStr);

    // Validate duration sum
    const totalDuration = jsonData.shots.reduce(
      (sum: number, shot: any) => sum + shot.duration_seconds,
      0
    );

    const expectedDuration = jsonData.duration_total_seconds;
    const durationDiff = Math.abs(totalDuration - expectedDuration);

    if (durationDiff > 0.1) {
      console.warn(`Duration mismatch: ${totalDuration} vs ${expectedDuration}`);
    }

    return NextResponse.json({
      success: true,
      data: jsonData,
      validation: {
        durationMatch: durationDiff < 0.1,
        totalDuration,
        expectedDuration,
      },
    });

  } catch (error: any) {
    console.error('Error generating prompt:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate prompt',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
