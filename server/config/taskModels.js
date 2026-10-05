const TASK_COMPLETION_MODELS = {
  general_text_reasoning: [
    // Gemini models (Verified free tier)
    {
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
      displayName: "Gemini 3.5 Flash Lite",
      bestFunction: "Fast economical reasoning, classification, and routine generation."
    },
    {
      provider: "gemini",
      model: "gemini-3.1-flash-lite",
      displayName: "Gemini 3.1 Flash Lite",
      bestFunction: "Fast economical reasoning and text processing."
    },
    {
      provider: "gemini",
      model: "gemini-3.6-flash",
      displayName: "Gemini 3.6 Flash",
      bestFunction: "Fast general reasoning, coding, and analysis."
    },
    {
      provider: "gemini",
      model: "gemini-3.5-flash",
      displayName: "Gemini 3.5 Flash",
      bestFunction: "Efficient reasoning, classification, and routine generation."
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
      model: "gemini-3.8-flash",
      displayName: "Gemini 3.8 Flash",
      bestFunction: "High-capability reasoning and generation."
    },
    {
      provider: "gemini",
      model: "gemini-3.7-flash",
      displayName: "Gemini 3.7 Flash",
      bestFunction: "Fast advanced reasoning and coding."
    },
    {
      provider: "gemini",
      model: "gemini-3-flash-preview",
      displayName: "Gemini 3 Flash Preview",
      bestFunction: "Fast advanced reasoning and general assistant tasks."
    },
    {
      provider: "gemini",
      model: "gemini-3.1-flash-lite-preview",
      displayName: "Gemini 3.1 Flash Lite Preview",
      bestFunction: "Fast economical reasoning and text processing."
    },
    {
      provider: "gemini",
      model: "gemini-omni-flash-preview",
      displayName: "Gemini Omni Flash Preview",
      bestFunction: "Fast multimodal assistant tasks."
    },
    {
      provider: "gemini",
      model: "gemini-omni-1.1-flash",
      displayName: "Gemini Omni 1.1 Flash",
      bestFunction: "Multimodal and fast text reasoning."
    },
    {
      provider: "gemini",
      model: "gemma-4-26b-a4b-it",
      displayName: "Gemma 4 26B A4B IT",
      bestFunction: "General text generation, reasoning, and lightweight coding."
    },

    // OpenRouter models (100% verified free tier, active)
    {
      provider: "openrouter",
      model: "inclusionai/ling-3.0-flash-sante:free",
      displayName: "Ling 3.0 Flash Sante",
      bestFunction: "Fast general text reasoning and lightweight generation."
    },
    {
      provider: "openrouter",
      model: "nvidia/nemotron-3-super-120b-a12b:free",
      displayName: "Nemotron 3 Super 120B",
      bestFunction: "High-capacity reasoning, synthesis, and deep text analysis."
    },
    {
      provider: "openrouter",
      model: "qwen/qwen3.8-27b:free",
      displayName: "Qwen 3.8 27B",
      bestFunction: "General reasoning, coding, and multilingual generation."
    },
    {
      provider: "openrouter",
      model: "nvidia/nemotron-3-ultra-550b-a55b:free",
      displayName: "Nemotron 3 Ultra 550B",
      bestFunction: "Massive 550B model for complex reasoning and large-context generation."
    },
    {
      provider: "openrouter",
      model: "nvidia/nemotron-3.5-lightning:free",
      displayName: "Nemotron 3.5 Lightning",
      bestFunction: "Fast general reasoning and high-throughput generation."
    },
    {
      provider: "openrouter",
      model: "dots-studio/dots-3-note-preview:free",
      displayName: "Dots 3 Note Preview",
      bestFunction: "Long-context note reasoning and synthesis."
    },
    {
      provider: "openrouter",
      model: "liquid/lfm-2.5-2.6b:free",
      displayName: "Liquid LFM 2.5 2.6B",
      bestFunction: "Lightweight text generation and rapid simple reasoning."
    },
    {
      provider: "openrouter",
      model: "apodex/apodex-1.1-mini:free",
      displayName: "Apodex 1.1 Mini",
      bestFunction: "Lightweight general reasoning and generation."
    },
    {
      provider: "openrouter",
      model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      displayName: "Nemotron 3 Nano Omni 30B",
      bestFunction: "Reasoning with omni/multimodal workloads."
    },

    // Groq models (Fast inference, verified active)
    {
      provider: "groq",
      model: "openai/gpt-oss-120b",
      displayName: "GPT OSS 120B",
      bestFunction: "Large general-purpose reasoning and coding."
    },
    {
      provider: "groq",
      model: "allam-2-7b",
      displayName: "Allam 2 7B",
      bestFunction: "Arabic-focused text generation and reasoning."
    },
    {
      provider: "groq",
      model: "qwen/qwen3.8-27b",
      displayName: "Qwen 3.8 27B (Groq)",
      bestFunction: "Ultra-fast general reasoning, coding, and generation."
    },
    {
      provider: "groq",
      model: "openai/gpt-oss-20b",
      displayName: "GPT OSS 20B",
      bestFunction: "Efficient general reasoning and coding."
    }
  ],

  coding: [
    {
      provider: "openrouter",
      model: "poolside/laguna-s-2.1:free",
      displayName: "Laguna S 2.1",
      bestFunction: "Software engineering, code analysis, and refactoring."
    },
    {
      provider: "openrouter",
      model: "poolside/laguna-xs-2.1:free",
      displayName: "Laguna XS 2.1",
      bestFunction: "Lightweight software engineering and code generation."
    },
    {
      provider: "openrouter",
      model: "cohere/north-mini-code:free",
      displayName: "North Mini Code",
      bestFunction: "Dedicated code generation and software development."
    },
    {
      provider: "openrouter",
      model: "qwen/qwen3.8-27b:free",
      displayName: "Qwen 3.8 27B Coding",
      bestFunction: "Code synthesis, algorithm development, and debugging."
    },
    {
      provider: "gemini",
      model: "gemini-3.7-flash",
      displayName: "Gemini 3.7 Flash Coding",
      bestFunction: "Advanced coding, architecture design, and problem solving."
    },
    {
      provider: "gemini",
      model: "gemini-3.6-flash",
      displayName: "Gemini 3.6 Flash Coding",
      bestFunction: "Fast code generation and syntax debugging."
    },
    {
      provider: "gemini",
      model: "gemini-3.5-flash",
      displayName: "Gemini 3.5 Flash Coding",
      bestFunction: "General programming and scripting tasks."
    },
    {
      provider: "gemini",
      model: "gemini-3.8-flash",
      displayName: "Gemini 3.8 Flash Coding",
      bestFunction: "High-capability code generation and optimization."
    },
    {
      provider: "groq",
      model: "openai/gpt-oss-120b",
      displayName: "GPT OSS 120B Coding",
      bestFunction: "High-throughput software engineering and coding."
    },
    {
      provider: "groq",
      model: "qwen/qwen3.8-27b",
      displayName: "Qwen 3.8 27B Coding (Groq)",
      bestFunction: "Ultra-fast low-latency code completion."
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
    },
    {
      provider: "openrouter",
      model: "nvidia/nemotron-3-ultra-550b-a55b:free",
      displayName: "Nemotron 3 Ultra 550B Research",
      bestFunction: "Long-context deep document research and evidence synthesis."
    },
    {
      provider: "openrouter",
      model: "dots-studio/dots-3-note-preview:free",
      displayName: "Dots 3 Note Research",
      bestFunction: "Synthesis across large-scale note archives and literature."
    }
  ],

  agentic: [
    {
      provider: "gemini",
      model: "antigravity-preview-latest",
      displayName: "Antigravity Agent Preview Latest",
      bestFunction: "Agentic multi-step task execution."
    },
    {
      provider: "gemini",
      model: "antigravity-preview-09-2026",
      displayName: "Antigravity Agent Preview (Sep-2026)",
      bestFunction: "Agentic multi-step task execution."
    },
    {
      provider: "gemini",
      model: "antigravity-preview-05-2026",
      displayName: "Antigravity Agent Preview (May-2026)",
      bestFunction: "Agentic multi-step task execution."
    },
    {
      provider: "openrouter",
      model: "nvidia/nemotron-3-super-120b-a12b:free",
      displayName: "Nemotron 3 Super 120B Agentic",
      bestFunction: "Multi-step tool invocation, planning, and task execution."
    },
    {
      provider: "openrouter",
      model: "qwen/qwen3.8-27b:free",
      displayName: "Qwen 3.8 27B Agentic",
      bestFunction: "Autonomous function calling and workflow execution."
    }
  ],

  image: [
    {
      provider: "pollinations",
      model: "flux",
      displayName: "Pollinations Flux (Image Generation)",
      bestFunction: "High quality text-to-image generation from user prompts."
    },
    {
      provider: "pollinations",
      model: "flux-realism",
      displayName: "Pollinations Flux Realism",
      bestFunction: "Photorealistic text-to-image generation."
    },
    {
      provider: "pollinations",
      model: "flux-anime",
      displayName: "Pollinations Flux Anime",
      bestFunction: "Anime, manga, and cartoon style illustration generation."
    },
    {
      provider: "pollinations",
      model: "turbo",
      displayName: "Pollinations Turbo",
      bestFunction: "Ultra-fast text-to-image generation."
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
      displayName: "Veo 3.1 Fast",
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
    }
  ],

  tts: [
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
      provider: "gemini",
      model: "gemini-2.5-flash-preview-tts",
      displayName: "Gemini 2.5 Flash Preview TTS",
      bestFunction: "Text-to-speech generation."
    },
    {
      provider: "groq",
      model: "canopylabs/orpheus-v1-english",
      displayName: "Orpheus English TTS",
      bestFunction: "English text-to-speech generation."
    },
    {
      provider: "groq",
      model: "canopylabs/orpheus-arabic-saudi",
      displayName: "Orpheus Saudi Arabic TTS",
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
      displayName: "Whisper Large V3 Turbo",
      bestFunction: "Fast speech-to-text transcription."
    },
    {
      provider: "groq",
      model: "whisper-large-v3",
      displayName: "Whisper Large V3",
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
      displayName: "Nemotron 3.5 Content Safety",
      bestFunction: "Content safety classification and moderation."
    },
    {
      provider: "groq",
      model: "meta-llama/llama-prompt-guard-2-22m",
      displayName: "Llama Prompt Guard 22M",
      bestFunction: "Prompt-injection and unsafe-prompt detection."
    },
    {
      provider: "groq",
      model: "meta-llama/llama-prompt-guard-2-86m",
      displayName: "Llama Prompt Guard 86M",
      bestFunction: "Prompt-injection and unsafe-prompt detection."
    },
    {
      provider: "groq",
      model: "openai/gpt-oss-safeguard-20b",
      displayName: "GPT OSS Safeguard 20B",
      bestFunction: "Safety-focused text analysis and guardrail tasks."
    }
  ],

  attributed_qa: [
    {
      provider: "gemini",
      model: "aqa",
      displayName: "Gemini AQA",
      bestFunction: "Attributed question answering."
    }
  ]
};

// Compute dynamic counts
const allCategories = Object.keys(TASK_COMPLETION_MODELS);
let totalModelsCount = 0;
for (const cat of allCategories) {
  totalModelsCount += (TASK_COMPLETION_MODELS[cat] || []).length;
}

const counts = {
  taskCompletionModels: totalModelsCount,
  categories: allCategories.length,
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
