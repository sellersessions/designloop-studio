'use client';

import React, { useState, useRef } from 'react';

type Model = 'veo3' | 'sora2' | '';
type AspectRatio = '16:9' | '9:16';
type ActiveTab = 'generator' | 'output' | 'documentation';
type VideoPromptModel = 'claude-sonnet-4-5-20250929' | 'claude-3-5-haiku-20241022';
type Stage = 'storyboard-input' | 'storyboard-concepts' | 'scene-editor' | 'video-generator';

interface SceneDescription {
  title: string;
  description: string;
}

interface GeneratedPrompt {
  project_title: string;
  resolution: string;
  duration_total_seconds: number;
  visual_style: string;
  product_reference_image_link: string | null;
  product_consistency_rule: string | null;
  shared_elements: {
    product: string | null;
    lighting: string;
    color_palette: string;
  };
  shots: Array<{
    shot_number: number;
    duration_seconds: number;
    scene_description: string;
    action: string;
    camera_angle: string;
    movement: string;
    lenses: string;
    lighting: string;
    audio: string | null;
    dialogue_block: string | null;
  }>;
}

// UPDATED: Changed scenes from string[] to SceneDescription[] to match backend
interface Concept {
  id: number;
  title: string;
  mood: string;
  scenes: SceneDescription[]; // Now uses structured objects instead of strings
  rawMarkdown: string;
}

export default function Home() {
  // Stage 1: Storyboard State
  const [currentStage, setCurrentStage] = useState<Stage>('storyboard-input');
  const [referenceImage, setReferenceImage] = useState('');
  const [creativeDirection, setCreativeDirection] = useState('');
  const [referenceAnalysis, setReferenceAnalysis] = useState('');
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
  const [conceptsProgress, setConceptsProgress] = useState('');
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const storyboardImageRef = useRef<HTMLInputElement>(null);

  // Stage 2: Video Generator State (existing)
  const [model, setModel] = useState<Model>('');
  const [videoPromptModel, setVideoPromptModel] = useState<VideoPromptModel>('claude-sonnet-4-5-20250929');
  const [concept, setConcept] = useState('');
  const [duration, setDuration] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [shotCount, setShotCount] = useState('auto');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAnalysis, setImageAnalysis] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('generator');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const durationOptions: Record<string, number[]> = {
    veo3: [4, 6, 8],
    sora2: [4, 8, 12],
  };

  // Stage 1: Storyboard Handlers
  const handleReferenceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setReferenceImage(base64);
        setIsAnalyzingReference(true);

        try {
          const response = await fetch('/api/analyze-reference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64,
              imageMediaType: file.type,
              creativeDirection,
            }),
          });

          const data = await response.json();

          if (data.success) {
            setReferenceAnalysis(data.analysis);
          } else {
            setReferenceAnalysis('Failed to analyze image');
          }
        } catch (error) {
          console.error('Error analyzing reference image:', error);
          setReferenceAnalysis('Error analyzing image');
        } finally {
          setIsAnalyzingReference(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateConcepts = async () => {
    if (!creativeDirection) {
      alert('Please provide creative direction');
      return;
    }

    console.log('🚀 Starting concept generation...');
    setIsGeneratingConcepts(true);
    setConceptsProgress('Preparing request...');

    try {
      setConceptsProgress('Calling Claude AI...');
      console.log('📡 Sending request to /api/generate-concepts');
      console.log('📦 Request body:', {
        creativeDirection: creativeDirection.substring(0, 100) + '...',
        hasImageAnalysis: !!referenceAnalysis,
        targetDuration: 6
      });

      const startTime = Date.now();

      const response = await fetch('/api/generate-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creativeDirection,
          imageAnalysis: referenceAnalysis || null,
          targetDuration: 6,
        }),
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`⏱️ Response received after ${elapsed}s`);
      console.log('📊 Response status:', response.status);

      setConceptsProgress('Processing response...');

      const result = await response.json();
      console.log('📄 Response data:', result);

      if (result.success) {
        console.log(`✅ Success! Got ${result.concepts.length} concepts`);
        console.log('🔍 DEBUG - First concept:', JSON.stringify(result.concepts[0], null, 2));
        console.log('🔍 DEBUG - Scenes count:', result.concepts[0]?.scenes?.length || 0);
        if (result.concepts[0]?.scenes?.[0]) {
          console.log('🔍 DEBUG - First scene structure:', JSON.stringify(result.concepts[0].scenes[0], null, 2));
        }
        setConceptsProgress(`Complete! Generated ${result.concepts.length} concepts`);
        setConcepts(result.concepts);
        setCurrentStage('storyboard-concepts');
      } else {
        console.error('❌ API returned error:', result.error);
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 Exception in handleGenerateConcepts:', error);
      alert('Failed to generate concepts. Check console for details.');
      setConceptsProgress('Error occurred - check console');
    } finally {
      setIsGeneratingConcepts(false);
      setTimeout(() => setConceptsProgress(''), 3000);
    }
  };

  const handleSelectConcept = (concept: Concept) => {
    setSelectedConcept(concept);
    // Pre-fill video generator with storyboard data (using structured scene objects)
    const scenesText = concept.scenes
      .map((scene, i) => `${i + 1}. ${scene.title}: ${scene.description}`)
      .join('\n\n');
    setConcept(`${concept.title}\n\n${concept.mood}\n\nScenes:\n\n${scenesText}`);
    setShotCount('6'); // Storyboard always has 6 scenes
    setCurrentStage('video-generator');
  };

  // Stage 2: Video Generator Handlers (existing)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImageUrl(base64);
        setIsAnalyzingImage(true);

        try {
          const response = await fetch('/api/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64,
              imageMediaType: file.type,
            }),
          });

          const data = await response.json();

          if (data.success) {
            setImageAnalysis(data.analysis);
          } else {
            setImageAnalysis('Failed to analyze image');
          }
        } catch (error) {
          console.error('Error analyzing image:', error);
          setImageAnalysis('Error analyzing image');
        } finally {
          setIsAnalyzingImage(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePrompt = async () => {
    if (!model) {
      alert('Please select a model (VEO 3 or Sora 2)');
      return;
    }
    if (!concept) {
      alert('Please describe your video concept');
      return;
    }
    if (!duration) {
      alert('Please select a duration');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          promptModel: videoPromptModel, // Pass selected model
          concept,
          duration: parseFloat(duration),
          aspectRatio,
          shotCount,
          imageAnalysis: imageAnalysis || null,
          imageUrl: imageUrl || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedPrompt(result.data);
        setActiveTab('output');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      alert('Failed to generate prompt. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedPrompt) {
      navigator.clipboard.writeText(JSON.stringify(generatedPrompt, null, 2));
      alert('JSON copied to clipboard!');
    }
  };

  const downloadJSON = () => {
    if (generatedPrompt) {
      const blob = new Blob([JSON.stringify(generatedPrompt, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-prompt-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(3,12,27)] text-white font-sans">
      {/* Hero Header */}
      <div className="relative mx-auto mt-5 max-w-[1200px] overflow-hidden rounded-[20px] border-[1.5px] border-[rgba(157,78,221,0.5)] bg-gradient-to-b from-[rgb(18,11,41)] via-[rgb(13,18,41)] via-40% to-[rgb(4,16,32)] to-70% p-[60px] text-center backdrop-blur-[10px]">
        <div className="absolute -left-1/2 -top-1/2 h-[200%] w-[200%] animate-[headerRotate_30s_linear_infinite] bg-[radial-gradient(circle,rgba(157,78,221,0.3)_0%,transparent_70%)] opacity-30" />
        <div className="relative z-10">
          <h1 className="m-0 text-[72px] font-bold leading-none tracking-[-2px] [text-shadow:0_0_25px_rgba(255,255,255,0.6),0_0_50px_rgba(255,255,255,0.4),0_0_100px_rgba(157,78,221,0.4)]">
            DESIGNLOOP STUDIO
          </h1>
          <p className="mx-0 mb-2 mt-3 text-[20px] text-[rgba(255,255,255,0.8)]">
            Human-Designed Stories That Drive Conversion
          </p>
          <div className="mt-2 text-sm font-medium uppercase tracking-wider text-[rgb(157,78,221)]">
            POWERED BY CURV
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mx-auto max-w-[1000px] px-5 py-8">
        <div className="flex items-center justify-between">
          {/* Stage 1: Storyboard Input */}
          <div className="flex flex-col items-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
              currentStage === 'storyboard-input'
                ? 'border-[rgb(157,78,221)] bg-gradient-to-br from-[rgb(157,78,221)] to-[rgb(177,98,241)] text-white shadow-[0_0_20px_rgba(157,78,221,0.6)]'
                : currentStage === 'storyboard-concepts' || currentStage === 'video-generator'
                ? 'border-[rgb(34,197,94)] bg-[rgb(34,197,94)] text-white'
                : 'border-[rgba(157,78,221,0.3)] bg-[rgba(0,0,0,0.3)] text-[rgba(255,255,255,0.5)]'
            }`}>
              📸
            </div>
            <div className="mt-2 text-center text-xs font-medium text-[rgba(255,255,255,0.7)]">
              Storyboard<br/>Input
            </div>
          </div>

          {/* Connector Line 1 */}
          <div className={`h-[2px] flex-1 transition-all ${
            currentStage === 'storyboard-concepts' || currentStage === 'video-generator'
              ? 'bg-[rgb(34,197,94)]'
              : 'bg-[rgba(157,78,221,0.3)]'
          }`} />

          {/* Stage 2: Concept Selection */}
          <div className="flex flex-col items-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
              currentStage === 'storyboard-concepts'
                ? 'border-[rgb(157,78,221)] bg-gradient-to-br from-[rgb(157,78,221)] to-[rgb(177,98,241)] text-white shadow-[0_0_20px_rgba(157,78,221,0.6)]'
                : currentStage === 'video-generator'
                ? 'border-[rgb(34,197,94)] bg-[rgb(34,197,94)] text-white'
                : 'border-[rgba(157,78,221,0.3)] bg-[rgba(0,0,0,0.3)] text-[rgba(255,255,255,0.5)]'
            }`}>
              💡
            </div>
            <div className="mt-2 text-center text-xs font-medium text-[rgba(255,255,255,0.7)]">
              Select<br/>Concept
            </div>
          </div>

          {/* Connector Line 2 */}
          <div className={`h-[2px] flex-1 transition-all ${
            currentStage === 'video-generator'
              ? 'bg-[rgb(34,197,94)]'
              : 'bg-[rgba(157,78,221,0.3)]'
          }`} />

          {/* Stage 3: Video Generator */}
          <div className="flex flex-col items-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
              currentStage === 'video-generator'
                ? 'border-[rgb(157,78,221)] bg-gradient-to-br from-[rgb(157,78,221)] to-[rgb(177,98,241)] text-white shadow-[0_0_20px_rgba(157,78,221,0.6)]'
                : 'border-[rgba(157,78,221,0.3)] bg-[rgba(0,0,0,0.3)] text-[rgba(255,255,255,0.5)]'
            }`}>
              🎬
            </div>
            <div className="mt-2 text-center text-xs font-medium text-[rgba(255,255,255,0.7)]">
              Video<br/>Generator
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap justify-center gap-3 p-5">
        <button
          onClick={() => setActiveTab('generator')}
          className={`rounded-xl px-6 py-3 text-sm font-semibold uppercase tracking-wider backdrop-blur-[8px] transition-all duration-300 ${
            activeTab === 'generator'
              ? 'border border-[rgba(157,78,221,0.5)] bg-gradient-to-br from-[rgb(157,78,221)] to-[#c084fc] text-white shadow-[0_8px_25px_rgba(157,78,221,0.4)]'
              : 'border border-[rgba(157,78,221,0.15)] bg-[rgba(0,0,0,0.3)] text-white'
          }`}
        >
          🎬 GENERATOR
        </button>
        <button
          onClick={() => setActiveTab('output')}
          className={`rounded-xl px-6 py-3 text-sm font-semibold uppercase tracking-wider backdrop-blur-[8px] transition-all duration-300 ${
            activeTab === 'output'
              ? 'border border-[rgba(157,78,221,0.5)] bg-gradient-to-br from-[rgb(157,78,221)] to-[#c084fc] text-white shadow-[0_8px_25px_rgba(157,78,221,0.4)]'
              : 'border border-[rgba(157,78,221,0.15)] bg-[rgba(0,0,0,0.3)] text-white'
          }`}
        >
          📄 OUTPUT
        </button>
        <button
          onClick={() => setActiveTab('documentation')}
          className={`rounded-xl px-6 py-3 text-sm font-semibold uppercase tracking-wider backdrop-blur-[8px] transition-all duration-300 ${
            activeTab === 'documentation'
              ? 'border border-[rgba(157,78,221,0.5)] bg-gradient-to-br from-[rgb(157,78,221)] to-[#c084fc] text-white shadow-[0_8px_25px_rgba(157,78,221,0.4)]'
              : 'border border-[rgba(157,78,221,0.15)] bg-[rgba(0,0,0,0.3)] text-white'
          }`}
        >
          📚 DOCS
        </button>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-[1200px] p-5">
        {/* Stage 1A: Storyboard Input */}
        {activeTab === 'generator' && currentStage === 'storyboard-input' && (
          <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(0,0,0,0.4)] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-[12px]">
            <h2 className="mb-6 text-2xl text-[rgb(157,78,221)]">
              Step 1: Storyboard Creation
            </h2>

            {/* Reference Image Upload */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.8)]">
                REFERENCE IMAGE (RECOMMENDED)
              </label>
              <input
                ref={storyboardImageRef}
                type="file"
                accept="image/*"
                onChange={handleReferenceImageUpload}
                className="hidden"
              />
              <button
                onClick={() => storyboardImageRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-[rgba(157,78,221,0.5)] bg-[rgba(0,0,0,0.3)] px-6 py-8 text-sm font-semibold text-[rgb(157,78,221)] transition-all duration-300 hover:border-[rgb(157,78,221)] hover:bg-[rgba(157,78,221,0.1)]"
              >
                📎 UPLOAD PRODUCT IMAGE OR STYLE REFERENCE
              </button>
              {referenceImage && (
                <div className="mt-4 flex gap-4">
                  <img
                    src={referenceImage}
                    alt="Reference"
                    className="max-h-[300px] w-auto rounded-lg border-2 border-[rgba(157,78,221,0.3)]"
                  />
                  <div className="flex-1">
                    {isAnalyzingReference ? (
                      <div className="rounded-lg border border-[rgb(234,179,8)] bg-[rgba(234,179,8,0.1)] p-3 text-sm text-[rgb(234,179,8)]">
                        ⏳ Analyzing image with Claude Haiku Vision...
                      </div>
                    ) : referenceAnalysis ? (
                      <div className="rounded-lg border border-[rgb(34,197,94)] bg-[rgba(34,197,94,0.1)] p-4">
                        <div className="mb-2 text-sm font-semibold text-[rgb(34,197,94)]">
                          ✓ Image Analysis Complete
                        </div>
                        <div className="max-h-[260px] overflow-auto text-xs leading-relaxed text-[rgba(255,255,255,0.8)]">
                          {referenceAnalysis}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Creative Direction */}
            <div className="mb-8">
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.8)]">
                CREATIVE DIRECTION *
              </label>
              <textarea
                value={creativeDirection}
                onChange={(e) => setCreativeDirection(e.target.value)}
                placeholder="Describe your video concept...&#10;&#10;Example:&#10;- Product: Blue insulated water bottle for fitness enthusiasts&#10;- Audience: Active gym-goers aged 25-40&#10;- Vibe: Energetic, fresh, motivational&#10;- Message: Stay hydrated during intense workouts&#10;- Key features: Double-wall insulation, leak-proof lid, 32oz capacity"
                className="min-h-[180px] w-full resize-y rounded-xl border border-[rgba(157,78,221,0.3)] bg-[rgba(0,0,0,0.3)] px-4 py-4 text-sm leading-relaxed text-white placeholder:text-[rgba(255,255,255,0.4)]"
              />
              <div className="mt-2 text-xs text-[rgba(255,255,255,0.5)]">
                {creativeDirection.length}/5000 characters
              </div>
            </div>

            {/* Generate Concepts Button */}
            <button
              onClick={handleGenerateConcepts}
              disabled={isGeneratingConcepts || !creativeDirection}
              className="w-full rounded-xl border-none bg-gradient-to-br from-[rgb(157,78,221)] to-[rgb(177,98,241)] px-8 py-4 text-base font-semibold uppercase tracking-wider text-white shadow-[0_8px_24px_rgba(157,78,221,0.4)] transition-all duration-300 disabled:cursor-not-allowed disabled:bg-[rgba(157,78,221,0.5)]"
            >
              {isGeneratingConcepts
                ? `⏳ ${conceptsProgress || 'GENERATING 3 CONCEPTS...'}`
                : '✨ GENERATE 3 STORYBOARD CONCEPTS'}
            </button>

            {isGeneratingConcepts && (
              <div className="mt-4 text-center">
                <div className="animate-pulse text-sm text-[rgb(234,179,8)]">
                  {conceptsProgress || 'Working...'}
                </div>
                <div className="mt-2 text-xs text-[rgba(255,255,255,0.5)]">
                  This may take 10-30 seconds. Check browser console for detailed progress.
                </div>
              </div>
            )}

            <div className="mt-4 rounded-lg border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.1)] p-4 text-xs text-[rgba(255,255,255,0.7)]">
              <strong className="text-[rgb(59,130,246)]">💡 Tip:</strong> Upload a product image for better visual consistency. Claude will analyze colors, lighting, and composition automatically. Cost: ~$0.02 total ($0.008 image analysis + $0.012 concept generation)
            </div>
          </div>
        )}

        {/* Stage 1B: Concept Selection */}
        {activeTab === 'generator' && currentStage === 'storyboard-concepts' && (
          <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(0,0,0,0.4)] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-[12px]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="m-0 text-2xl text-[rgb(157,78,221)]">
                Step 2: Select Your Concept
              </h2>
              <button
                onClick={() => setCurrentStage('storyboard-input')}
                className="rounded-lg border border-[rgba(157,78,221,0.3)] bg-[rgba(0,0,0,0.3)] px-4 py-2 text-sm text-[rgba(255,255,255,0.7)] transition-all hover:border-[rgb(157,78,221)] hover:text-white"
              >
                ← Back to Input
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {concepts.map((concept) => (
                <div
                  key={concept.id}
                  className="group cursor-pointer rounded-xl border-2 border-[rgba(157,78,221,0.3)] bg-gradient-to-br from-[rgba(18,11,41,0.6)] to-[rgba(13,18,41,0.6)] p-6 transition-all duration-300 hover:border-[rgb(157,78,221)] hover:shadow-[0_8px_24px_rgba(157,78,221,0.3)]"
                  onClick={() => handleSelectConcept(concept)}
                >
                  <div className="mb-4 text-xl font-bold text-[rgb(157,78,221)]">
                    {concept.title}
                  </div>
                  <div className="mb-4 text-sm italic text-[rgba(255,255,255,0.7)]">
                    {concept.mood}
                  </div>
                  <div className="mb-4 space-y-3">
                    {concept.scenes.map((scene, i) => (
                      <div key={i} className="flex items-start text-xs">
                        <span className="mr-2 font-bold text-[rgb(157,78,221)] flex-shrink-0">
                          {i + 1}.
                        </span>
                        <div className="flex-1">
                          <span className="font-semibold text-[rgba(255,255,255,0.8)] block mb-1">
                            {scene.title}
                          </span>
                          <span className="text-[rgba(255,255,255,0.6)] leading-relaxed">
                            {scene.description}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 text-center">
                    <button className="w-full rounded-lg bg-gradient-to-br from-[rgb(157,78,221)] to-[rgb(177,98,241)] px-4 py-2 text-sm font-semibold text-white opacity-0 transition-all group-hover:opacity-100">
                      SELECT THIS CONCEPT
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg border border-[rgba(234,179,8,0.3)] bg-[rgba(234,179,8,0.1)] p-4 text-xs text-[rgba(255,255,255,0.7)]">
              <strong className="text-[rgb(234,179,8)]">💡 Tip:</strong> Click any concept to select it. Your selection will pre-fill the video generator with all 6 scenes, ready for JSON generation.
            </div>
          </div>
        )}

        {/* Stage 2: Video Generator (existing, only show when stage is video-generator) */}
        {activeTab === 'generator' && currentStage === 'video-generator' && (
          <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(0,0,0,0.4)] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-[12px]">
            <h2 className="mb-6 text-2xl text-[rgb(157,78,221)]">
              Configure Your Video Prompt
            </h2>

            {/* Model Selection */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.8)]">
                SELECT MODEL *
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setModel('veo3');
                    setDuration('');
                  }}
                  className={`min-w-[200px] flex-1 rounded-xl border-2 border-[rgba(157,78,221,0.5)] px-8 py-4 text-base font-semibold transition-all duration-300 ${
                    model === 'veo3'
                      ? 'bg-gradient-to-br from-[rgb(157,78,221)] to-[rgb(177,98,241)] text-white'
                      : 'bg-transparent text-[rgb(157,78,221)]'
                  }`}
                >
                  VEO 3
                  <div className="mt-1 text-xs opacity-80">
                    4/6/8 seconds • Native audio
                  </div>
                </button>
                <button
                  onClick={() => {
                    setModel('sora2');
                    setDuration('');
                  }}
                  className={`min-w-[200px] flex-1 rounded-xl border-2 border-[rgba(157,78,221,0.5)] px-8 py-4 text-base font-semibold transition-all duration-300 ${
                    model === 'sora2'
                      ? 'bg-gradient-to-br from-[rgb(157,78,221)] to-[rgb(177,98,241)] text-white'
                      : 'bg-transparent text-[rgb(157,78,221)]'
                  }`}
                >
                  SORA 2
                  <div className="mt-1 text-xs opacity-80">
                    4/8/12 seconds • Enhanced physics
                  </div>
                </button>
              </div>
            </div>

            {/* AI Model Selection for JSON Generation */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.8)]">
                AI MODEL FOR JSON GENERATION
              </label>
              <select
                value={videoPromptModel}
                onChange={(e) => setVideoPromptModel(e.target.value as VideoPromptModel)}
                className="w-full rounded-xl border border-[rgba(157,78,221,0.3)] bg-[rgba(0,0,0,0.3)] px-4 py-3 text-sm text-white"
              >
                <option value="claude-sonnet-4-5-20250929">
                  Claude Sonnet 4.5 (~$0.045/gen) - Best Quality ⭐
                </option>
                <option value="claude-3-5-haiku-20241022">
                  Claude Haiku 3.5 (~$0.006/gen) - 7x Cheaper 💰
                </option>
              </select>
              <div className="mt-2 text-xs text-[rgba(255,255,255,0.5)]">
                Choose quality vs cost. Haiku is experimental but 85% cheaper.
              </div>
            </div>

            {/* Image Upload */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.8)]">
                REFERENCE IMAGE (OPTIONAL)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-[rgba(157,78,221,0.5)] bg-transparent px-6 py-3 text-sm font-semibold text-[rgb(157,78,221)] transition-all duration-300"
              >
                📎 UPLOAD IMAGE
              </button>
              {imageUrl && (
                <div className="mt-3">
                  <img
                    src={imageUrl}
                    alt="Reference"
                    className="max-w-[200px] rounded-lg border-2 border-[rgba(157,78,221,0.3)]"
                  />
                  {isAnalyzingImage ? (
                    <p className="mt-2 text-xs text-[rgb(234,179,8)]">
                      ⏳ Analyzing image...
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-[rgb(34,197,94)]">
                      ✓ Image analyzed - ready for generation
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Video Concept */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.8)]">
                VIDEO CONCEPT *
              </label>
              <textarea
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Describe your video concept in detail..."
                className="min-h-[400px] w-full resize-y rounded-xl border border-[rgba(157,78,221,0.3)] bg-[rgba(0,0,0,0.3)] px-4 py-4 text-base leading-relaxed text-white font-mono whitespace-pre-wrap placeholder:text-[rgba(255,255,255,0.4)] placeholder:font-sans"
              />
              <div className="mt-2 text-xs text-[rgba(255,255,255,0.5)]">
                {concept.length} characters • Edit scene descriptions before generating JSON
              </div>
            </div>

            {/* Duration Selection */}
            {model && (
              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.8)]">
                  DURATION *
                </label>
                <div className="flex gap-3">
                  {durationOptions[model].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d.toString())}
                      className={`flex-1 rounded-xl border-2 border-[rgba(157,78,221,0.5)] px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                        duration === d.toString()
                          ? 'bg-gradient-to-br from-[rgb(157,78,221)] to-[rgb(177,98,241)] text-white'
                          : 'bg-transparent text-[rgb(157,78,221)]'
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Aspect Ratio */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.8)]">
                ASPECT RATIO
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setAspectRatio('16:9')}
                  className={`flex-1 rounded-xl border-2 border-[rgba(157,78,221,0.5)] px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                    aspectRatio === '16:9'
                      ? 'bg-gradient-to-br from-[rgb(157,78,221)] to-[rgb(177,98,241)] text-white'
                      : 'bg-transparent text-[rgb(157,78,221)]'
                  }`}
                >
                  16:9 (Landscape)
                </button>
                <button
                  onClick={() => setAspectRatio('9:16')}
                  className={`flex-1 rounded-xl border-2 border-[rgba(157,78,221,0.5)] px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                    aspectRatio === '9:16'
                      ? 'bg-gradient-to-br from-[rgb(157,78,221)] to-[rgb(177,98,241)] text-white'
                      : 'bg-transparent text-[rgb(157,78,221)]'
                  }`}
                >
                  9:16 (Portrait)
                </button>
              </div>
            </div>

            {/* Shot Count */}
            <div className="mb-8">
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.8)]">
                SHOT COUNT
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShotCount('auto')}
                  className={`rounded-xl border-2 border-[rgba(157,78,221,0.5)] px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                    shotCount === 'auto'
                      ? 'bg-gradient-to-br from-[rgb(157,78,221)] to-[rgb(177,98,241)] text-white'
                      : 'bg-transparent text-[rgb(157,78,221)]'
                  }`}
                >
                  AUTO
                </button>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={shotCount === 'auto' ? '' : shotCount}
                  onChange={(e) => setShotCount(e.target.value)}
                  placeholder="Custom"
                  className="flex-1 rounded-xl border border-[rgba(157,78,221,0.3)] bg-[rgba(0,0,0,0.3)] px-4 py-3 text-sm text-white"
                />
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generatePrompt}
              disabled={isGenerating}
              className="w-full rounded-xl border-none bg-gradient-to-br from-[rgb(157,78,221)] to-[rgb(177,98,241)] px-8 py-4 text-base font-semibold uppercase tracking-wider text-white shadow-[0_8px_24px_rgba(157,78,221,0.4)] transition-all duration-300 disabled:cursor-not-allowed disabled:bg-[rgba(157,78,221,0.5)]"
            >
              {isGenerating ? '⏳ GENERATING...' : '✨ GENERATE PROMPT'}
            </button>
          </div>
        )}

        {/* Output Tab */}
        {activeTab === 'output' && (
          <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(0,0,0,0.4)] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-[12px]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="m-0 text-2xl text-[rgb(157,78,221)]">
                Generated JSON Prompt
              </h2>
              {generatedPrompt && (
                <div className="flex gap-3">
                  <button
                    onClick={copyToClipboard}
                    className="rounded-xl border-2 border-[rgba(157,78,221,0.5)] bg-transparent px-5 py-2.5 text-sm font-semibold text-[rgb(157,78,221)] transition-all duration-300"
                  >
                    📋 COPY
                  </button>
                  <button
                    onClick={downloadJSON}
                    className="rounded-xl border-none bg-gradient-to-br from-[rgb(157,78,221)] to-[rgb(177,98,241)] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300"
                  >
                    💾 DOWNLOAD
                  </button>
                </div>
              )}
            </div>

            {generatedPrompt ? (
              <>
                <div className="max-h-[600px] overflow-auto rounded-xl border border-[rgba(157,78,221,0.3)] bg-[rgba(0,0,0,0.5)] p-6">
                  <pre className="m-0 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-white">
                    {JSON.stringify(generatedPrompt, null, 2)}
                  </pre>
                </div>

                {/* Duration Validation */}
                <div className="mt-6 rounded-xl border border-[rgb(34,197,94)] bg-[rgba(34,197,94,0.1)] p-4 text-[rgb(34,197,94)]">
                  <strong>✓ Duration Validation:</strong>{' '}
                  {generatedPrompt.shots
                    .map((s) => s.duration_seconds)
                    .join(' + ')}{' '}
                  = {generatedPrompt.duration_total_seconds} seconds
                </div>
              </>
            ) : (
              <div className="py-[60px] text-center text-[rgba(255,255,255,0.5)]">
                <div className="mb-4 text-5xl">📝</div>
                <p className="text-base">
                  No prompt generated yet. Configure your video in the Generator
                  tab.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Documentation Tab */}
        {activeTab === 'documentation' && (
          <div className="rounded-2xl border border-[rgba(157,78,221,0.15)] bg-[rgba(0,0,0,0.4)] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-[12px]">
            <h2 className="mb-6 text-2xl text-[rgb(157,78,221)]">
              Quick Start Guide
            </h2>

            <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: '🎯',
                  title: 'Select Model',
                  description:
                    'Choose VEO 3 (4/6/8s) or Sora 2 (4/8/12s) based on your needs',
                },
                {
                  icon: '📸',
                  title: 'Upload Reference',
                  description:
                    'Optional: Upload product images or style references for visual consistency',
                },
                {
                  icon: '✍️',
                  title: 'Describe Concept',
                  description:
                    'Detail your video vision - subjects, actions, style, and purpose',
                },
                {
                  icon: '⚙️',
                  title: 'Configure Settings',
                  description:
                    'Set duration, aspect ratio, and shot count (auto or manual)',
                },
                {
                  icon: '✨',
                  title: 'Generate',
                  description:
                    'Click generate to create your professional JSON prompt',
                },
                {
                  icon: '📥',
                  title: 'Export',
                  description:
                    'Copy or download your JSON for use with video generation models',
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[rgba(157,78,221,0.3)] border-l-4 border-l-[rgb(157,78,221)] bg-gradient-to-br from-[rgba(18,11,41,0.6)] to-[rgba(13,18,41,0.6)] p-6"
                >
                  <div className="mb-3 text-3xl">{step.icon}</div>
                  <h3 className="mb-2 text-base text-[rgb(157,78,221)]">
                    {step.title}
                  </h3>
                  <p className="m-0 text-sm leading-relaxed text-[rgba(255,255,255,0.7)]">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mb-6 rounded-xl border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.1)] p-5">
              <h3 className="mb-3 text-lg text-[rgb(59,130,246)]">
                💡 Pro Tips
              </h3>
              <ul className="m-0 list-disc space-y-2 pl-5 text-[rgba(255,255,255,0.7)]">
                <li>
                  Use reference images for product shots to maintain brand
                  consistency
                </li>
                <li>
                  VEO 3 excels at dialogue with native lip-sync - use for
                  talking head videos
                </li>
                <li>
                  Sora 2 handles complex physics better - ideal for action
                  sequences
                </li>
                <li>
                  Auto shot count intelligently divides your duration into
                  logical beats
                </li>
                <li>
                  9:16 aspect ratio is perfect for TikTok, Instagram Reels, and
                  Stories
                </li>
                <li>
                  Always validate that shot durations sum to your total duration
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-[rgba(234,179,8,0.3)] bg-[rgba(234,179,8,0.1)] p-5">
              <h3 className="mb-3 text-lg text-[rgb(234,179,8)]">
                ⚠️ Important Notes
              </h3>
              <ul className="m-0 list-disc space-y-2 pl-5 text-[rgba(255,255,255,0.7)]">
                <li>
                  VEO 3 dialogue must include &quot;(no subtitles)&quot; to
                  avoid text overlays
                </li>
                <li>
                  Sora 2 uses separate dialogue blocks - never mix with visual
                  descriptions
                </li>
                <li>
                  Shot durations must use decimal notation (2.0, 2.5, 3.5, etc.)
                </li>
                <li>
                  Each model supports different durations - respect these limits
                </li>
                <li>
                  Image analysis extracts colors, lighting, and composition
                  automatically
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-[60px] border-t border-[rgba(157,78,221,0.5)] p-10 text-center opacity-60">
        <div className="mb-2 text-base font-semibold text-white">
          Video Prompt Generator
        </div>
        <div className="mb-4 text-xs text-[rgba(255,255,255,0.7)]">
          Professional JSON Prompts for AI Video Generation
        </div>
        <div className="text-[11px] tracking-wide text-[rgba(255,255,255,0.7)]">
          Produced By Danny McMillan | CURV Tools | A Seller Sessions Production
          2025
        </div>
      </footer>

      <style jsx global>{`
        @keyframes headerRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        input:focus,
        textarea:focus {
          outline: none;
          border-color: rgb(157, 78, 221);
          box-shadow: 0 0 0 3px rgba(157, 78, 221, 0.2);
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgb(157, 78, 221);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgb(177, 98, 241);
        }
      `}</style>
    </div>
  );
}
