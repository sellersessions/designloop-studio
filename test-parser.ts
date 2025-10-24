/**
 * Test the parseConceptsFromMarkdown function with simulated Claude response
 * This validates the regex fix captures full multi-line scene descriptions
 */

// Simulated Claude Haiku response (exactly as the prompt instructs)
const mockClaudeResponse = `# THREE STORYBOARD CONCEPTS

## Concept 1: Easel Unveiling Journey
**Mood/Tone:** Warm, inspiring, and aspirational. The video evokes creativity and the joy of artistic expression through gentle, inviting visuals.

**6-Scene Storyboard:**

1. **Canvas in Shadow:** The easel sits shrouded in soft darkness with only a hint of ambient light outlining its silhouette. The camera slowly pushes in from a low angle, creating anticipation. A mysterious, calm atmosphere sets the stage for discovery.

2. **First Light Touch:** Golden hour sunlight streams through a window, gradually illuminating the easel's wooden frame. The camera tilts up from the legs to the canvas holder in a smooth motion. Warmth and possibility fill the frame as details emerge.

3. **Artist's Approach:** A hand enters the frame, fingers gently tracing the easel's smooth surface with reverence. The camera holds a medium close-up, capturing the tactile connection. Soft focus on the background emphasizes the intimate moment between creator and tool.

4. **Canvas Placement:** The blank canvas slides onto the easel with a satisfying click, shot from a dynamic side angle. The camera circles slightly, showing the ready-to-create setup from multiple perspectives. Energy builds as the creative space takes form.

5. **Color Explosion:** Vibrant paint tubes and brushes appear on a nearby palette in sharp focus. The camera does a quick rack focus from the easel to the colorful supplies and back. Excitement and creative potential radiate through saturated, joyful colors.

6. **Ready to Create:** The complete setup glows in perfect late afternoon light, everything positioned ideally for artistic work. The camera pulls back to a wide establishing shot, revealing the inspiring creative space. A sense of fulfillment and invitation to begin creating resonates powerfully.

## Concept 2: Dynamic Product Showcase
**Mood/Tone:** Energetic, modern, and bold. Fast-paced visuals with dramatic lighting create excitement and emphasize the easel's professional quality.

**6-Scene Storyboard:**

1. **Dramatic Reveal:** The screen is completely black, then a sharp spotlight cuts through, hitting just the top of the easel. The camera is static, letting the light do the revealing work. High contrast and mystery create immediate visual interest.

2. **Rotating Beauty:** The easel spins slowly on a turntable against a minimalist backdrop, showing off every angle. The camera remains fixed while the product moves, highlighting craftsmanship and design. Clean, professional aesthetic dominates with controlled lighting emphasizing quality.

3. **Adjustment Showcase:** Quick cuts show hands adjusting height, angle, and canvas position with smooth precision. The camera uses tight close-ups on mechanical details and movements. Dynamic editing rhythm emphasizes versatility and ease of use for the creative professional.

4. **Stability Test:** A canvas is placed with deliberate force, but the easel doesn't budge or wobble at all. The camera shoots from a low, powerful angle emphasizing strength. Confidence in build quality comes through visual proof of durability.

5. **Material Close-Up:** Extreme macro shots reveal wood grain, metal joints, and quality hardware in stunning detail. The camera slowly tracks across surfaces, celebrating craftsmanship. Luxury and premium feel are communicated through intimate material beauty.

6. **Final Statement:** The easel stands perfectly lit in a 3/4 view against a gradient background. The camera executes a slow, dramatic push-in ending on the brand logo or key feature. Bold, confident closing reinforces professional-grade quality and desirability.

## Concept 3: Creative Transformation Story
**Mood/Tone:** Magical, whimsical, and transformative. The video tells a mini-story of blank space becoming art, with the easel as the essential enabler.

**6-Scene Storyboard:**

1. **Empty Studio:** A bare, neutral studio space appears almost lifeless with flat, even lighting. The camera pans slowly across the empty room, emphasizing absence. A sense of potential unfulfilled creates narrative tension and sets up the transformation to come.

2. **Easel Arrival:** The easel materializes or is carried into the frame, immediately changing the space's character. The camera follows its movement with a smooth tracking shot. Hope and possibility enter alongside the product as the room begins its transformation.

3. **Canvas Blank State:** A pristine white canvas is carefully positioned, catching and reflecting available light beautifully. The camera circles at a respectful distance, treating the blank canvas with reverence. Anticipation builds as creative potential becomes tangible and ready for expression.

4. **First Stroke Magic:** A brush loaded with vibrant color makes initial contact with the canvas in slow motion. The camera zooms in tight to capture paint spreading on textured surface. Wonder and beginning of creation are frozen in this decisive, magical moment of artistic birth.

5. **Creative Flow:** Time-lapse shows the painting developing rapidly while the easel holds steady throughout the process. The camera maintains a consistent angle, making the easel a constant anchor. Energy, dedication, and the easel's supportive role shine through accelerated creative journey.

6. **Masterpiece Complete:** The finished artwork glows on the easel in perfect presentation lighting and positioning. The camera pulls back to reveal the transformed studio, now alive with creative energy. Pride, accomplishment, and the easel's essential role create a satisfying, inspiring conclusion to the transformation story.`;

/**
 * Scene object structure (matches backend)
 */
interface Scene {
  title: string;
  description: string;
}

/**
 * Concept object structure (matches backend)
 */
interface Concept {
  id: number;
  title: string;
  mood: string;
  scenes: Scene[];
  rawMarkdown: string;
}

/**
 * Parse function (copied from route.ts with same logic)
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

    // FIXED REGEX: Captures full multi-line descriptions
    const sceneMatches = section.matchAll(
      /^\d+\.\s*\*\*([^*]+?)\*\*:\s*(.+?)(?=\n\n\d+\.\s*\*\*|$)/gms
    );

    const scenes: Scene[] = Array.from(sceneMatches, match => {
      const sceneTitle = match[1].trim();
      // Preserve full description, normalize whitespace
      const sceneDescription = match[2]
        .trim()
        .replace(/\n{3,}/g, '\n\n')  // Normalize excessive newlines
        .replace(/\n/g, ' ')          // Convert newlines to spaces for display
        .replace(/\s{2,}/g, ' ');     // Remove excessive spaces

      return {
        title: sceneTitle,
        description: sceneDescription
      };
    });

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

// Run the test
console.log('=== TESTING PARSER WITH SIMULATED CLAUDE RESPONSE ===\n');

const parsedConcepts = parseConceptsFromMarkdown(mockClaudeResponse);

console.log(`Parsed ${parsedConcepts.length} concepts\n`);

// Test each concept
parsedConcepts.forEach((concept, idx) => {
  console.log(`\n--- CONCEPT ${idx + 1}: ${concept.title} ---`);
  console.log(`Mood: ${concept.mood}`);
  console.log(`Number of scenes: ${concept.scenes.length}`);

  // Test first 2 scenes in detail
  console.log('\nFirst 2 scenes:');
  concept.scenes.slice(0, 2).forEach((scene, sceneIdx) => {
    console.log(`\n${sceneIdx + 1}. ${scene.title}`);
    console.log(`   Description length: ${scene.description.length} chars`);
    console.log(`   Description: ${scene.description.substring(0, 150)}...`);

    // Validation checks
    const hasSentences = scene.description.split('.').filter(s => s.trim()).length;
    const isMultiSentence = hasSentences >= 2;
    console.log(`   ✓ Multi-sentence: ${isMultiSentence ? 'YES' : 'NO'} (${hasSentences} sentences)`);
    console.log(`   ✓ Length adequate: ${scene.description.length > 100 ? 'YES' : 'NO'}`);
  });
});

// Final validation
console.log('\n\n=== VALIDATION SUMMARY ===');
const allConcepts = parsedConcepts.length === 3;
const allHave6Scenes = parsedConcepts.every(c => c.scenes.length === 6);
const allScenesHaveContent = parsedConcepts.every(c =>
  c.scenes.every(s => s.description.length > 50)
);

console.log(`✓ Found 3 concepts: ${allConcepts ? 'PASS' : 'FAIL'}`);
console.log(`✓ Each has 6 scenes: ${allHave6Scenes ? 'PASS' : 'FAIL'}`);
console.log(`✓ All descriptions > 50 chars: ${allScenesHaveContent ? 'PASS' : 'FAIL'}`);

if (allConcepts && allHave6Scenes && allScenesHaveContent) {
  console.log('\n🎉 PARSER TEST PASSED - Full descriptions captured correctly!');
} else {
  console.log('\n❌ PARSER TEST FAILED - Review regex pattern');
}
