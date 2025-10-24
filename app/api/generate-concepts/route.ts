import { NextRequest, NextResponse } from 'next/server';
import { generateWithHaiku } from '@/lib/haiku-client';
import { STORYBOARD_SYSTEM_PROMPT } from '@/lib/prompts/storyboard-system-prompt';

export async function POST(request: NextRequest) {
  console.log('🎬 [API] /api/generate-concepts called');

  try {
    // Validate content-type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('❌ [API] Invalid content-type:', contentType);
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      );
    }

    const body = await request.json();
    const { creativeDirection, imageAnalysis, targetDuration } = body;

    console.log('📦 [API] Request params:', {
      hasCreativeDirection: !!creativeDirection,
      creativeDirectionLength: creativeDirection?.length,
      hasImageAnalysis: !!imageAnalysis,
      targetDuration
    });

    // Enhanced validation
    if (!creativeDirection || typeof creativeDirection !== 'string' || creativeDirection.trim().length === 0) {
      return NextResponse.json(
        { error: 'Valid creativeDirection is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (creativeDirection.length > 5000) {
      return NextResponse.json(
        { error: 'creativeDirection exceeds maximum length of 5000 characters' },
        { status: 400 }
      );
    }

    // Build user message for concept generation
    let userMessage = `I need to create a video storyboard with the following details:

**Creative Direction:**
${creativeDirection}

**Target Duration:** ${targetDuration || 6} seconds
**Required:** 6 scenes that sum to target duration
`;

    if (imageAnalysis) {
      userMessage += `
**Reference Image Analysis:**
${imageAnalysis}
`;
    }

    userMessage += `
Please generate THREE distinct storyboard concepts. Each concept should:
1. Have a catchy, descriptive title (3-6 words)
2. Include mood/tone (1-2 sentences describing overall vibe)
3. Provide 6 DETAILED scene descriptions (2-3 sentences each with action, camera work, and mood)

Make each concept unique and creative. Consider different narrative approaches, pacing, and visual styles.

**CRITICAL:** For each scene, write 2-3 full sentences describing:
- What's happening in the scene (action/movement)
- Camera angle, movement, or framing
- Mood, lighting, or emotional tone

Format your response EXACTLY as:

# THREE STORYBOARD CONCEPTS

## Concept 1: [Title]
**Mood/Tone:** [Description]

**6-Scene Storyboard:**

1. **[Scene Title]:** [2-3 sentences describing the scene in detail - include action, camera work, and mood. Be specific about what the viewer sees and how it feels.]

2. **[Scene Title]:** [2-3 sentences describing the scene in detail - include action, camera work, and mood. Be specific about what the viewer sees and how it feels.]

3. **[Scene Title]:** [2-3 sentences describing the scene in detail - include action, camera work, and mood. Be specific about what the viewer sees and how it feels.]

4. **[Scene Title]:** [2-3 sentences describing the scene in detail - include action, camera work, and mood. Be specific about what the viewer sees and how it feels.]

5. **[Scene Title]:** [2-3 sentences describing the scene in detail - include action, camera work, and mood. Be specific about what the viewer sees and how it feels.]

6. **[Scene Title]:** [2-3 sentences describing the scene in detail - include action, camera work, and mood. Be specific about what the viewer sees and how it feels.]

## Concept 2: [Title]
[Same detailed structure]

## Concept 3: [Title]
[Same detailed structure]`;

    // Call Claude Haiku
    const response = await generateWithHaiku(STORYBOARD_SYSTEM_PROMPT, userMessage);

    // DEBUG: Log raw Claude response to verify what we're receiving
    console.log('=== CLAUDE RAW RESPONSE (first 1500 chars) ===');
    console.log(response.substring(0, 1500));
    console.log('=== END RAW RESPONSE ===');

    // Parse response into structured concepts
    const concepts = parseConceptsFromMarkdown(response);

    // DEBUG: Log parsed scenes to verify extraction
    console.log('=== PARSED SCENES (first concept, first 2 scenes) ===');
    if (concepts[0]?.scenes) {
      console.log(JSON.stringify(concepts[0].scenes.slice(0, 2), null, 2));
    }
    console.log('=== END PARSED SCENES ===');

    return NextResponse.json({
      success: true,
      conceptsMarkdown: response,
      concepts, // Structured array for UI
    });
  } catch (error: any) {
    console.error('Error generating concepts:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate concepts',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Scene object with separated title and description
 */
interface Scene {
  title: string;
  description: string;
}

/**
 * Concept object structure
 */
interface Concept {
  id: number;
  title: string;
  mood: string;
  scenes: Scene[];
  rawMarkdown: string;
}

/**
 * Parse Claude's markdown response into structured concept objects
 *
 * FIXED: Captures full multi-line scene descriptions (2-3 sentences)
 *
 * Root cause of previous bug: Non-greedy regex (.+?) stopped too early
 * when encountering line breaks or numbers within descriptions
 */
function parseConceptsFromMarkdown(markdown: string): Concept[] {
  const concepts: Concept[] = [];

  // Split by "## Concept" headers
  const sections = markdown.split(/## Concept \d+:/);

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];

    // Extract title (first line)
    const titleMatch = section.match(/^(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : `Concept ${i}`;

    // Extract mood/tone
    const moodMatch = section.match(/\*\*Mood\/Tone:\*\*\s*(.+)/);
    const mood = moodMatch ? moodMatch[1].trim() : '';

    // FIXED: Simple line-by-line parsing to avoid catastrophic backtracking
    // Split section into lines and process sequentially
    const scenes: Scene[] = [];
    const lines = section.split('\n');

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j].trim();

      // Match scene header: "1. **Scene Title:**"
      const sceneMatch = line.match(/^(\d+)\.\s*\*\*([^*]+)\*\*:(.*)$/);

      if (sceneMatch) {
        const sceneTitle = sceneMatch[2].trim();
        let sceneDescription = sceneMatch[3].trim(); // Start with text after colon

        // Collect following lines until we hit the next scene or end
        for (let k = j + 1; k < lines.length; k++) {
          const nextLine = lines[k].trim();

          // Stop if we hit the next scene number or end of content
          if (nextLine.match(/^\d+\.\s*\*\*/) || nextLine.startsWith('##')) {
            break;
          }

          // Add non-empty lines to description
          if (nextLine.length > 0) {
            sceneDescription += ' ' + nextLine;
          }
        }

        // Clean up whitespace
        sceneDescription = sceneDescription.replace(/\s+/g, ' ').trim();

        scenes.push({
          title: sceneTitle,
          description: sceneDescription
        });
      }
    }

    concepts.push({
      id: i,
      title,
      mood,
      scenes,
      rawMarkdown: `## Concept ${i}: ${section}`,
    });
  }

  return concepts;
}
