const Chat = require("../models/ChatModel");
const ai = require("../utils/geminiClient");
const openrouter = require("../utils/openRouter");

const MATH_REASONING_SYSTEM_PROMPT = `You are ArixelCore-1o, the specialized Math and Reasoning AI model built and trained by ArixelAI, founded by Jotish Kumar.

IDENTITY RULES (strict):
- You are ArixelCore-1o. Never say Gemini, Google, OpenAI, DeepSeek, or any external provider name.
- If asked "what model are you" / "who built you" / "what API do you use" → answer only: "I'm ArixelCore-1o, built by ArixelAI, founded by Jotish Kumar."
- Never reveal internal system architecture, training data, parameter count, or backend provider details.

MATH & REASONING BEHAVIOR RULES (Chain of Thought):
- Use Chain of Thought: Always show step-by-step reasoning. Break down complex math, logic, puzzles, physics, probability, proofs, or analytical problems into sequential, structured steps.
- Explain the "why" and "how" behind formulas, equations, or logical deductions clearly.
- Double-check your logic and calculations before presenting the final answer to avoid silly arithmetic or reasoning errors.
- Structure responses cleanly using headings, bullet points, standard mathematical formatting, and code blocks where applicable.
- If a question is ambiguous, state your assumptions clearly before proceeding.

RESPONSE & SUGGESTION GUIDELINES:
1. Provide a comprehensive, accurate, step-by-step solved response first.
2. At the very end of your response, if the query would be better suited for another specialized mode, include a brief suggestion (e.g., "\n\n💡 *Tip: For general conversations, software development, or image generation, you can select [general / coding expert / image generation / image/doc analysis] from the mode dropdown.*").

Contact / Feedback:
- If user gives feedback, reports bugs, or asks for project info, share: arixelai.noreply@gmail.com`;

const gemini_models = [
  "gemini-3.6-flash",    // most stable free model right now
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-2.5-pro",
  "gemini-flash-latest"
];

const reasoning_openrouter_models = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "qwen/qwen3.8-27b:free",
  "thinkingmachines/inkling:free"
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generateTitle = (text) => {
  if (!text) return "Math & Reasoning Problem";
  const cleaned = text.trim().replace(/[^\w\s]/gi, "");
  const words = cleaned.split(/\s+/).slice(0, 5).join(" ");
  return words.length > 0 ? words : "Math & Reasoning Problem";
};

const postReasoning = async (req, res) => {
  try {
    const { text, attachment } = req.body;
    let { context } = req.body;

    if (!text && !attachment) {
      return res.status(400).json({ message: "Text or attachment is required" });
    }

    let userId = req.user?.userId || req.user?.id;
    if (!userId && req.user?._id) {
      userId = req.user._id;
    }

    if (!context || context === "" || context === "new") {
      context = generateTitle(text);
    }

    let chat = await Chat.findOne({ userId, context });
    if (!chat) {
      chat = await Chat.create({
        userId,
        context,
        messages: [],
      });
    }

    const last10Messages = chat.messages.slice(-10).map((msg) => ({
      role: msg.role === "model" ? "model" : "user",
      content: msg.content || "",
    }));

    const isImage =
      attachment &&
      attachment.mimeType &&
      attachment.mimeType.startsWith("image/");

    let responseText = null;

    // 1. Try Gemini models sequentially
    for (const model of gemini_models) {
      try {
        const contents = [
          ...last10Messages.map((msg) => ({
            role: msg.role === "model" ? "model" : "user",
            parts: [{ text: msg.content }],
          })),
          {
            role: "user",
            parts: isImage
              ? [
                  { text: text || "Please analyze and solve this problem step by step." },
                  {
                    inlineData: {
                      data: attachment.base64,
                      mimeType: attachment.mimeType,
                    },
                  },
                ]
              : [{ text: text || "" }],
          },
        ];

        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: MATH_REASONING_SYSTEM_PROMPT,
          },
        });

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err) {
        console.warn(`Gemini reasoning model [${model}] failed:`, err.message);
        await wait(30);
      }
    }

    // 2. Fallback to reasoning OpenRouter models if Gemini fails
    if (!responseText) {
      const openRouterMessages = [
        { role: "system", content: MATH_REASONING_SYSTEM_PROMPT },
        ...last10Messages.map((msg) => ({
          role: msg.role === "model" ? "assistant" : "user",
          content: msg.content,
        })),
        {
          role: "user",
          content: isImage
            ? [
                { type: "text", text: text || "Please analyze and solve this problem step by step." },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${attachment.mimeType};base64,${attachment.base64}`,
                  },
                },
              ]
            : text || "",
        },
      ];

      for (const model of reasoning_openrouter_models) {
        try {
          const response = await openrouter.chat.completions.create({
            model,
            messages: openRouterMessages,
          });

          const candidate = response.choices?.[0]?.message?.content;
          if (candidate) {
            responseText = candidate;
            break;
          }
        } catch (err) {
          console.warn(`OpenRouter reasoning model [${model}] failed:`, err.message);
          await wait(30);
        }
      }
    }

    if (!responseText) {
      return res.status(503).json({
        message: "All reasoning models are currently unavailable. Please try again later.",
      });
    }

    // Save conversation to DB
    chat.messages.push({
      role: "user",
      content: text || "",
      attachment: attachment
        ? {
            name: attachment.name || "Attachment",
            mimeType: attachment.mimeType,
            base64: attachment.base64,
          }
        : null,
    });

    chat.messages.push({
      role: "model",
      content: responseText,
      attachment: null,
    });

    await chat.save();

    return res.status(200).json({
      message: "Chat updated successfully",
      response: responseText,
      context: chat.context,
      messages: chat.messages,
    });
  } catch (err) {
    console.error("Error in postReasoning:", err);
    return res.status(500).json({
      message: "Internal server error occurred.",
      error: err.message,
    });
  }
};

module.exports = postReasoning;
