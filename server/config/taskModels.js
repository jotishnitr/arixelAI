const TASK_COMPLETION_MODELS = {
  general_text_reasoning: [
    {
      provider: "gemini",
      model: "gemma-4-26b-a4b-it",
      displayName: "Gemma 4 26B A4B IT",
      bestFunction: "General text generation, reasoning, and lightweight coding."
    },
    {
      provider: "gemini",
      model: "gemma-4-31b-it",
      displayName: "Gemma 4 31B IT",
      bestFunction: "General reasoning, writing, and coding."
    },
    {
      provider: "gemini",
      model: "gemini-flash-latest",
      displayName: "Gemini Flash Latest",
      bestFunction: "Fast general-purpose assistant tasks."
    },
    {
      provider: "gemini",
      model: "gemini-flash-lite-latest",
      displayName: "Gemini Flash-Lite Latest",
      bestFunction: "Low-latency lightweight text tasks."
    },
    {
      provider: "gemini",
      model: "gemini-pro-latest",
      displayName: "Gemini Pro Latest",
      bestFunction: "Higher-capability general reasoning and coding."
    },
    {
      provider: "gemini",
      model: "gemini-2.5-flash-lite",
      displayName: "Gemini 2.5 Flash-Lite",
      bestFunction: "Efficient classification, extraction, and simple reasoning."
    },
    {
      provider: "gemini",
      model: "gemini-3-flash-preview",
      displayName: "Gemini 3 Flash Preview",
      bestFunction: "Fast advanced reasoning and general assistant tasks."
    },
    {
      provider: "gemini",
      model: "gemini-3.1-pro-preview-customtools",
      displayName: "Gemini 3.1 Pro Preview Custom Tools",
      bestFunction: "Advanced reasoning with custom-tool workflows."
    },
    {
      provider: "gemini",
      model: "gemini-3.1-flash-lite-preview",
      displayName: "Gemini 3.1 Flash Lite Preview",
      bestFunction: "Fast economical reasoning and text processing."
    },
    {
      provider: "gemini",
      model: "gemini-3.1-flash-lite",
      displayName: "Gemini 3.1 Flash Lite",
      bestFunction: "Fast economical reasoning and text processing."
    },
    {
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
      displayName: "Gemini 3.5 Flash Lite",
      bestFunction: "Efficient reasoning, classification, and routine generation."
    },
    {
      provider: "gemini",
      model: "gemini-omni-flash-preview",
      displayName: "Gemini Omni Flash Preview",
      bestFunction: "Fast multimodal assistant tasks."
    },
    {
      provider: "gemini",
      model: "gemini-3.6-flash",
      displayName: "Gemini 3.6 Flash",
      bestFunction: "Fast general reasoning, coding, and analysis."
    },
    {
      provider: "gemini",
      model: "gemini-3.7-flash",
      displayName: "Gemini 3.7 Flash",
      bestFunction: "Fast advanced reasoning and coding."
    },
    {
      provider: "openrouter",
      model: "inclusionai/ling-3.1-flash",
      displayName: null,
      bestFunction: "Fast general reasoning and text generation."
    },
    {
      provider: "openrouter",
      model: "apodex/apodex-1.1-mini:free",
      displayName: null,
      bestFunction: "Lightweight general reasoning and generation."
    },
    {
      provider: "openrouter",
      model: "stealth/space-bunny-alpha",
      displayName: null,
      bestFunction: "Long-context reasoning and large-output generation."
    },
    {
      provider: "openrouter",
      model: "inclusionai/ling-3.0-flash-sante:free",
      displayName: null,
      bestFunction: "Fast general text reasoning."
    },
    {
      provider: "openrouter",
      model: "qwen/qwen3.8-27b:free",
      displayName: null,
      bestFunction: "General reasoning, coding, and generation."
    },
    {
      provider: "openrouter",
      model: "dots-studio/dots-3-note-preview:free",
      displayName: null,
      bestFunction: "Long-context note reasoning and synthesis."
    },
    {
      provider: "openrouter",
      model: "liquid/lfm-2.5-2.6b:free",
      displayName: null,
      bestFunction: "Lightweight text generation and simple reasoning."
    },
    {
      provider: "openrouter",
      model: "nvidia/nemotron-3.5-lightning:free",
      displayName: null,
      bestFunction: "Fast general reasoning and high-throughput generation."
    },
    {
      provider: "openrouter",
      model: "thinkingmachines/inkling-small:free",
      displayName: null,
      bestFunction: "Lightweight long-context reasoning."
    },
    {
      provider: "openrouter",
      model: "thinkingmachines/inkling:free",
      displayName: null,
      bestFunction: "Long-context reasoning and complex generation."
    },
    {
      provider: "openrouter",
      model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      displayName: null,
      bestFunction: "Reasoning with omni/multimodal workloads."
    },
    {
      provider: "openrouter",
      model: "google/gemma-4-26b-a4b-it:free",
      displayName: null,
      bestFunction: "General text reasoning and generation."
    },
    {
      provider: "openrouter",
      model: "google/gemma-4-31b-it:free",
      displayName: null,
      bestFunction: "General reasoning, writing, and coding."
    },
    {
      provider: "openrouter",
      model: "openrouter/free",
      displayName: null,
      bestFunction: "Automatic free-model routing through OpenRouter."
    },
    {
      provider: "groq",
      model: "openai/gpt-oss-120b",
      displayName: null,
      bestFunction: "Large general-purpose reasoning and coding."
    },
    {
      provider: "groq",
      model: "allam-2-7b",
      displayName: null,
      bestFunction: "Arabic-focused text generation and reasoning."
    },
    {
      provider: "groq",
      model: "qwen/qwen3.8-27b",
      displayName: null,
      bestFunction: "General reasoning, coding, and generation."
    },
    {
      provider: "groq",
      model: "openai/gpt-oss-20b",
      displayName: null,
      bestFunction: "Efficient general reasoning and coding."
    }
  ],
  coding: [
    {
      provider: "openrouter",
      model: "poolside/laguna-s-2.1:free",
      displayName: null,
      bestFunction: "Software engineering and coding."
    },
    {
      provider: "openrouter",
      model: "poolside/laguna-xs-2.1:free",
      displayName: null,
      bestFunction: "Lightweight software engineering and coding."
    },
    {
      provider: "openrouter",
      model: "cohere/north-mini-code:free",
      displayName: null,
      bestFunction: "Code generation and software engineering."
    }
  ],
  research: [
    {
      provider: "gemini",
      model: "deep-research-max-preview-04-2026",
      displayName: "Deep Research Max Preview (Apr-21-2026)",
      bestFunction: "Deep research and comprehensive information synthesis."
    },
    {
      provider: "gemini",
      model: "deep-research-preview-04-2026",
      displayName: "Deep Research Preview (Apr-21-2026)",
      bestFunction: "Research-heavy investigation and synthesis."
    },
    {
      provider: "gemini",
      model: "deep-research-pro-preview-12-2025",
      displayName: "Deep Research Pro Preview (Dec-12-2025)",
      bestFunction: "Advanced research and evidence-oriented synthesis."
    }
  ],
  agentic: [
    {
      provider: "gemini",
      model: "antigravity-preview-05-2026",
      displayName: "Antigravity Agent Preview",
      bestFunction: "Agentic multi-step task execution."
    },
    {
      provider: "gemini",
      model: "antigravity-preview-09-2026",
      displayName: "Antigravity Agent Preview",
      bestFunction: "Agentic multi-step task execution."
    },
    {
      provider: "gemini",
      model: "antigravity-preview-latest",
      displayName: "Antigravity Agent Preview Latest",
      bestFunction: "Agentic multi-step task execution."
    }
  ],
  image: [
    {
      provider: "gemini",
      model: "gemini-2.5-flash-image",
      displayName: "Nano Banana",
      bestFunction: "Image generation and image editing (Nano Banana)."
    },
    {
      provider: "gemini",
      model: "gemini-3-pro-image-preview",
      displayName: "Nano Banana Pro",
      bestFunction: "High-quality image generation and editing (Nano Banana Pro)."
    },
    {
      provider: "gemini",
      model: "gemini-3-pro-image",
      displayName: "Nano Banana Pro",
      bestFunction: "Image generation and editing (Nano Banana Pro)."
    },
    {
      provider: "gemini",
      model: "nano-banana-pro-preview",
      displayName: "Nano Banana Pro",
      bestFunction: "Image generation and editing (Nano Banana Pro)."
    },
    {
      provider: "gemini",
      model: "gemini-3.1-flash-image-preview",
      displayName: "Nano Banana 2",
      bestFunction: "Fast image generation and editing (Nano Banana 2)."
    },
    {
      provider: "gemini",
      model: "gemini-3.1-flash-image",
      displayName: "Nano Banana 2",
      bestFunction: "Fast image generation and editing (Nano Banana 2)."
    },
    {
      provider: "gemini",
      model: "gemini-3.1-flash-lite-image",
      displayName: "Nano Banana 2 Lite",
      bestFunction: "Lightweight image generation and editing."
    }
  ],
  video: [
    {
      provider: "gemini",
      model: "veo-3.1-generate-preview",
      displayName: "Veo 3.1",
      bestFunction: "Video generation from prompts."
    },
    {
      provider: "gemini",
      model: "veo-3.1-fast-generate-preview",
      displayName: "Veo 3.1 fast",
      bestFunction: "Fast video generation from prompts."
    }
  ],
  audio_music: [
    {
      provider: "gemini",
      model: "lyria-3-clip-preview",
      displayName: "Lyria 3 Clip Preview",
      bestFunction: "Music/audio generation, clip-oriented."
    },
    {
      provider: "gemini",
      model: "lyria-3-pro-preview",
      displayName: "Lyria 3 Pro Preview",
      bestFunction: "High-quality music/audio generation."
    },
    {
      provider: "gemini",
      model: "lyria-3.5",
      displayName: "Lyria 3.5",
      bestFunction: "Music/audio generation."
    },
    {
      provider: "openrouter",
      model: "google/lyria-3-pro-preview",
      displayName: null,
      bestFunction: "Music/audio generation."
    },
    {
      provider: "openrouter",
      model: "google/lyria-3-clip-preview",
      displayName: null,
      bestFunction: "Music/audio clip generation."
    }
  ],
  tts: [
    {
      provider: "gemini",
      model: "gemini-2.5-flash-preview-tts",
      displayName: "Gemini 2.5 Flash Preview TTS",
      bestFunction: "Text-to-speech generation."
    },
    {
      provider: "gemini",
      model: "gemini-2.5-pro-preview-tts",
      displayName: "Gemini 2.5 Pro Preview TTS",
      bestFunction: "Text-to-speech generation with a higher-capability language model."
    },
    {
      provider: "gemini",
      model: "gemini-3.1-flash-tts-preview",
      displayName: "Gemini 3.1 Flash TTS Preview",
      bestFunction: "Fast text-to-speech generation."
    },
    {
      provider: "gemini",
      model: "gemini-3.8-flash-tts",
      displayName: "Gemini 3.8 Flash TTS",
      bestFunction: "Text-to-speech generation."
    },
    {
      provider: "gemini",
      model: "gemini-3.8-flash-lite-tts",
      displayName: "Gemini 3.8 Flash Lite TTS",
      bestFunction: "Lightweight text-to-speech generation."
    },
    {
      provider: "groq",
      model: "canopylabs/orpheus-v1-english",
      displayName: null,
      bestFunction: "English text-to-speech generation."
    },
    {
      provider: "groq",
      model: "canopylabs/orpheus-arabic-saudi",
      displayName: null,
      bestFunction: "Saudi Arabic text-to-speech generation."
    }
  ],
  speech_to_text: [
    {
      provider: "gemini",
      model: "gemini-3.5-transcribe",
      displayName: "Gemini 3.5 Transcribe",
      bestFunction: "Speech-to-text transcription."
    },
    {
      provider: "groq",
      model: "whisper-large-v3-turbo",
      displayName: null,
      bestFunction: "Fast speech-to-text transcription."
    },
    {
      provider: "groq",
      model: "whisper-large-v3",
      displayName: null,
      bestFunction: "High-quality speech-to-text transcription."
    }
  ],
  embeddings: [
    {
      provider: "gemini",
      model: "gemini-embedding-001",
      displayName: "Gemini Embedding 001",
      bestFunction: "Text embeddings for semantic search, retrieval, and similarity."
    },
    {
      provider: "gemini",
      model: "gemini-embedding-2-preview",
      displayName: "Gemini Embedding 2 Preview",
      bestFunction: "Embeddings for retrieval, semantic search, and similarity."
    },
    {
      provider: "gemini",
      model: "gemini-embedding-2",
      displayName: "Gemini Embedding 2",
      bestFunction: "Embeddings for retrieval, semantic search, and similarity."
    }
  ],
  computer_use: [
    {
      provider: "gemini",
      model: "gemini-2.5-computer-use-preview-10-2025",
      displayName: "Gemini 2.5 Computer Use Preview 10-2025",
      bestFunction: "Computer-use interaction and UI task execution."
    }
  ],
  robotics: [
    {
      provider: "gemini",
      model: "gemini-robotics-er-2-preview",
      displayName: "Gemini Robotics-ER 2 Preview",
      bestFunction: "Robotics-oriented visual reasoning and embodied task planning."
    }
  ],
  safety: [
    {
      provider: "openrouter",
      model: "nvidia/nemotron-3.5-content-safety:free",
      displayName: null,
      bestFunction: "Content safety classification and moderation."
    },
    {
      provider: "groq",
      model: "meta-llama/llama-prompt-guard-2-22m",
      displayName: null,
      bestFunction: "Prompt-injection and unsafe-prompt detection."
    },
    {
      provider: "groq",
      model: "meta-llama/llama-prompt-guard-2-86m",
      displayName: null,
      bestFunction: "Prompt-injection and unsafe-prompt detection."
    },
    {
      provider: "groq",
      model: "openai/gpt-oss-safeguard-20b",
      displayName: null,
      bestFunction: "Safety-focused text analysis and guardrail tasks."
    }
  ],
  attributed_qa: [
    {
      provider: "gemini",
      model: "aqa",
      displayName: "Model that performs Attributed Question Answering.",
      bestFunction: "Attributed question answering."
    }
  ]
};

const counts = {
  taskCompletionModels: 75,
  categories: 14
};

// Helper: Get all models as a flat array with their category
const getAllModels = () => {
  const all = [];
  for (const [category, models] of Object.entries(TASK_COMPLETION_MODELS)) {
    for (const m of models) {
      all.push({ ...m, category });
    }
  }
  return all;
};

// Helper: Get models by category
const getModelsByCategory = (category) => {
  return TASK_COMPLETION_MODELS[category] || [];
};

module.exports = {
  TASK_COMPLETION_MODELS,
  counts,
  getAllModels,
  getModelsByCategory,
};
