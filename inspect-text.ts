const sampleSection = `Easel Unveiling Journey
**Mood/Tone:** Warm, inspiring, and aspirational.

**6-Scene Storyboard:**

1. **Canvas in Shadow:** The easel sits shrouded in soft darkness.

2. **First Light Touch:** Golden hour sunlight streams through.`;

console.log('=== INSPECTING TEXT CHARACTER BY CHARACTER ===\n');

// Find the first scene line
const lines = sampleSection.split('\n');
lines.forEach((line, idx) => {
  if (line.trim().startsWith('1.')) {
    console.log(`Line ${idx}: "${line}"`);
    console.log('Characters:');
    for (let i = 0; i < Math.min(line.length, 40); i++) {
      console.log(`  [${i}]: '${line[i]}' (code: ${line.charCodeAt(i)})`);
    }
  }
});

// Try the simplest possible pattern
console.log('\n=== SIMPLEST PATTERN TEST ===');
const simple = /\*\*([^*]+?)\*\*:/g;
const matches = Array.from(sampleSection.matchAll(simple));
console.log(`Found ${matches.length} bold text patterns:`);
matches.forEach(m => console.log(`  - "${m[1]}"`));

// Try matching just the number + bold pattern
console.log('\n=== NUMBER + BOLD PATTERN ===');
const numBold = /\d+\.\s+\*\*([^*]+?)\*\*:/g;
const matches2 = Array.from(sampleSection.matchAll(numBold));
console.log(`Found ${matches2.length} scene title patterns:`);
matches2.forEach(m => console.log(`  - "${m[1]}"`));

// Now try to capture the description after the colon
console.log('\n=== FULL SCENE PATTERN ===');
const fullScene = /\d+\.\s+\*\*([^*]+?)\*\*:\s*([^\n]+)/g;
const matches3 = Array.from(sampleSection.matchAll(fullScene));
console.log(`Found ${matches3.length} scenes (single line):`);
matches3.forEach(m => {
  console.log(`  Title: "${m[1]}"`);
  console.log(`  Desc:  "${m[2]}"`);
});

// Try multi-line capture
console.log('\n=== MULTI-LINE SCENE PATTERN ===');
const multiLine = /\d+\.\s+\*\*([^*]+?)\*\*:\s+((?:.+(?:\n(?!\d+\.))?)+)/g;
const matches4 = Array.from(sampleSection.matchAll(multiLine));
console.log(`Found ${matches4.length} scenes (multi-line):`);
matches4.forEach(m => {
  console.log(`  Title: "${m[1]}"`);
  console.log(`  Desc:  "${m[2].trim()}"`);
});
