/**
 * Debug regex pattern to find why scenes aren't matching
 */

const sampleSection = `Easel Unveiling Journey
**Mood/Tone:** Warm, inspiring, and aspirational. The video evokes creativity and the joy of artistic expression through gentle, inviting visuals.

**6-Scene Storyboard:**

1. **Canvas in Shadow:** The easel sits shrouded in soft darkness with only a hint of ambient light outlining its silhouette. The camera slowly pushes in from a low angle, creating anticipation. A mysterious, calm atmosphere sets the stage for discovery.

2. **First Light Touch:** Golden hour sunlight streams through a window, gradually illuminating the easel's wooden frame. The camera tilts up from the legs to the canvas holder in a smooth motion. Warmth and possibility fill the frame as details emerge.

3. **Artist's Approach:** A hand enters the frame, fingers gently tracing the easel's smooth surface with reverence. The camera holds a medium close-up, capturing the tactile connection. Soft focus on the background emphasizes the intimate moment between creator and tool.`;

console.log('=== TESTING DIFFERENT REGEX PATTERNS ===\n');

// Pattern 1: Current pattern (from our fix)
const pattern1 = /^\d+\.\s*\*\*([^*]+?)\*\*:\s*(.+?)(?=\n\n\d+\.\s*\*\*|$)/gms;
console.log('Pattern 1 (current):');
console.log(pattern1);
const matches1 = Array.from(sampleSection.matchAll(pattern1));
console.log(`Matches: ${matches1.length}`);
matches1.forEach((m, i) => {
  console.log(`  ${i + 1}. Title: "${m[1]}"`);
  console.log(`     Desc: "${m[2].substring(0, 80)}..."`);
});

// Pattern 2: Try without the double newline requirement
const pattern2 = /^\d+\.\s*\*\*([^*]+?)\*\*:\s*(.+?)(?=^\d+\.\s*\*\*|$)/gms;
console.log('\nPattern 2 (without \\n\\n):');
console.log(pattern2);
const matches2 = Array.from(sampleSection.matchAll(pattern2));
console.log(`Matches: ${matches2.length}`);
matches2.forEach((m, i) => {
  console.log(`  ${i + 1}. Title: "${m[1]}"`);
  console.log(`     Desc: "${m[2].substring(0, 80)}..."`);
});

// Pattern 3: Even simpler - just match until next scene or end
const pattern3 = /(\d+)\.\s*\*\*([^*]+?)\*\*:\s*([\s\S]+?)(?=\n+\d+\.\s*\*\*|$)/g;
console.log('\nPattern 3 (simpler with [\s\S]):');
console.log(pattern3);
const matches3 = Array.from(sampleSection.matchAll(pattern3));
console.log(`Matches: ${matches3.length}`);
matches3.forEach((m, i) => {
  console.log(`  ${i + 1}. Number: ${m[1]}, Title: "${m[2]}"`);
  console.log(`     Desc: "${m[3].trim().substring(0, 80)}..."`);
  console.log(`     Desc length: ${m[3].trim().length} chars`);
});
