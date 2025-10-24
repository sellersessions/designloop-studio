# Video Prompt Studio

Professional JSON prompt generator for VEO 3 and Sora 2 video generation models.

## Features

- **Intelligent Prompt Generation**: Uses Claude AI to generate cinematographically-precise JSON prompts
- **Model-Specific Optimization**: Tailored prompts for VEO 3 (4/6/8s) and Sora 2 (4/8/12s)
- **Image Analysis**: Upload reference images for visual consistency
- **Duration Validation**: Automatic validation of shot duration mathematics
- **Beautiful UI**: Modern, responsive interface with dark mode

## Setup Instructions

### 1. Install Dependencies

```bash
cd video-prompt-studio
npm install
```

### 2. Configure API Key

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your Anthropic API key to `.env.local`:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

   Get your API key from: https://console.anthropic.com/

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Basic Workflow

1. **Select Model**: Choose VEO 3 or Sora 2
2. **Upload Reference Image** (Optional): Provide visual reference for consistency
3. **Describe Concept**: Detail your video vision
4. **Configure Settings**: Duration, aspect ratio, shot count
5. **Generate**: Click generate to create JSON prompt
6. **Export**: Copy or download the JSON

### Model Specifications

**VEO 3**:
- Durations: 4, 6, or 8 seconds
- Dialogue: Native lip-sync with "(no subtitles)" format
- Best for: Product shots, talking heads, precise control

**Sora 2**:
- Durations: 4, 8, or 12 seconds
- Dialogue: Separate dialogue blocks
- Best for: Complex physics, longer narratives

## JSON Output Schema

```json
{
  "project_title": "string",
  "resolution": "16:9" | "9:16",
  "duration_total_seconds": number,
  "visual_style": "string",
  "product_reference_image_link": "string | null",
  "product_consistency_rule": "string | null",
  "shared_elements": {
    "product": "string | null",
    "lighting": "string",
    "color_palette": "string"
  },
  "shots": [
    {
      "shot_number": number,
      "duration_seconds": number,
      "scene_description": "string",
      "action": "string",
      "camera_angle": "string",
      "movement": "string",
      "lenses": "string",
      "lighting": "string",
      "audio": "string | null",
      "dialogue_block": "string | null"
    }
  ]
}
```

## Project Structure

```
video-prompt-studio/
├── app/
│   ├── page.tsx                 # Main UI component
│   ├── api/
│   │   ├── generate-prompt/
│   │   │   └── route.ts        # Prompt generation endpoint
│   │   └── analyze-image/
│   │       └── route.ts        # Image analysis endpoint
│   └── layout.tsx
├── lib/
│   ├── claude-client.ts        # Anthropic API wrapper
│   └── prompts/
│       └── video-system-prompt.ts  # Video generation system prompt
├── .env.local                   # API keys (create from .env.local.example)
└── package.json
```

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude API (Sonnet 4.5)
- **UI**: React with hooks

## Development

### Build for Production

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## API Endpoints

### POST /api/generate-prompt

Generate video prompt JSON.

**Request Body**:
```json
{
  "model": "veo3" | "sora2",
  "concept": "string",
  "duration": number,
  "aspectRatio": "16:9" | "9:16",
  "shotCount": "auto" | number,
  "imageAnalysis": "string | null",
  "imageUrl": "string | null"
}
```

### POST /api/analyze-image

Analyze reference image for visual details.

**Request Body**:
```json
{
  "imageBase64": "string",
  "imageMediaType": "string"
}
```

## Credits

**Produced By**: Danny McMillan
**Brand**: CURV Tools
**Production**: A Seller Sessions Production 2025

## License

Proprietary - All Rights Reserved
