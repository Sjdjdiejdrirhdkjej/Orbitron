export type Modality = "text" | "vision" | "audio" | "tools";

export interface Model {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  inputPrice: number; // per 1M tokens
  outputPrice: number; // per 1M tokens
  throughput: number; // tokens/sec
  latency: number; // ms
  modalities: Modality[];
  description: string;
}

export const providers = ["OpenAI", "Anthropic", "Google"];

export const models: Model[] = [
  // ---------- OpenAI ----------
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    contextWindow: 400000,
    inputPrice: 8.0,
    outputPrice: 24.0,
    throughput: 70,
    latency: 380,
    modalities: ["text", "vision", "audio", "tools"],
    description: "OpenAI's flagship frontier model. Strongest reasoning, multimodal, agentic tool use.",
  },
  {
    id: "gpt-5-turbo",
    name: "GPT-5 Turbo",
    provider: "OpenAI",
    contextWindow: 256000,
    inputPrice: 5.0,
    outputPrice: 15.0,
    throughput: 85,
    latency: 320,
    modalities: ["text", "vision", "tools"],
    description: "Faster, cheaper sibling of GPT-5. Production workhorse for most chat workloads.",
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 mini",
    provider: "OpenAI",
    contextWindow: 128000,
    inputPrice: 0.15,
    outputPrice: 0.60,
    throughput: 210,
    latency: 180,
    modalities: ["text", "tools"],
    description: "Tiny, fast, cheap. Routing, classification, and high-volume background tasks.",
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 nano",
    provider: "OpenAI",
    contextWindow: 64000,
    inputPrice: 0.05,
    outputPrice: 0.20,
    throughput: 320,
    latency: 110,
    modalities: ["text"],
    description: "Lowest-latency tier. Sub-200ms TTFT for embeddings-adjacent and edge use cases.",
  },
  {
    id: "o4",
    name: "o4",
    provider: "OpenAI",
    contextWindow: 200000,
    inputPrice: 12.0,
    outputPrice: 48.0,
    throughput: 35,
    latency: 1400,
    modalities: ["text", "tools"],
    description: "Deep reasoning model. Slow, expensive, exceptional at math, code, and proofs.",
  },
  {
    id: "o4-mini",
    name: "o4-mini",
    provider: "OpenAI",
    contextWindow: 200000,
    inputPrice: 1.5,
    outputPrice: 6.0,
    throughput: 75,
    latency: 800,
    modalities: ["text", "tools"],
    description: "Reasoning at a price point you can actually deploy. Strong on coding benchmarks.",
  },

  // ---------- Anthropic ----------
  {
    id: "claude-4.5-opus",
    name: "Claude Opus 4.5",
    provider: "Anthropic",
    contextWindow: 200000,
    inputPrice: 15.0,
    outputPrice: 75.0,
    throughput: 45,
    latency: 450,
    modalities: ["text", "vision", "tools"],
    description: "Anthropic's most powerful model. Unmatched at long-context analysis and coding.",
  },
  {
    id: "claude-4.5-sonnet",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    contextWindow: 200000,
    inputPrice: 3.0,
    outputPrice: 15.0,
    throughput: 110,
    latency: 280,
    modalities: ["text", "vision", "tools"],
    description: "The perfect balance of intelligence and speed. Most teams' default model.",
  },
  {
    id: "claude-4.5-haiku",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    contextWindow: 200000,
    inputPrice: 0.8,
    outputPrice: 4.0,
    throughput: 230,
    latency: 160,
    modalities: ["text", "vision", "tools"],
    description: "Cheap, fast, smarter than it has any right to be. Great for streaming UIs.",
  },
  {
    id: "claude-4-opus",
    name: "Claude Opus 4",
    provider: "Anthropic",
    contextWindow: 200000,
    inputPrice: 12.0,
    outputPrice: 60.0,
    throughput: 50,
    latency: 480,
    modalities: ["text", "vision", "tools"],
    description: "Previous-gen flagship. Still excellent for complex agentic workflows.",
  },

  // ---------- Google ----------
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    contextWindow: 2000000,
    inputPrice: 3.5,
    outputPrice: 10.5,
    throughput: 130,
    latency: 300,
    modalities: ["text", "vision", "audio", "tools"],
    description: "Massive 2M context window. Native multimodal across text, image, audio, and video.",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    contextWindow: 1000000,
    inputPrice: 0.30,
    outputPrice: 1.20,
    throughput: 250,
    latency: 150,
    modalities: ["text", "vision", "audio", "tools"],
    description: "1M context, multimodal, blazing fast. Outstanding price-to-performance.",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    provider: "Google",
    contextWindow: 1000000,
    inputPrice: 0.075,
    outputPrice: 0.30,
    throughput: 340,
    latency: 95,
    modalities: ["text", "vision", "tools"],
    description: "Lowest-cost Gemini. Built for extreme throughput and tight latency budgets.",
  },
  {
    id: "gemini-2.5-thinking",
    name: "Gemini 2.5 Pro Thinking",
    provider: "Google",
    contextWindow: 1000000,
    inputPrice: 5.0,
    outputPrice: 18.0,
    throughput: 60,
    latency: 1100,
    modalities: ["text", "vision", "tools"],
    description: "Extended-thinking variant. Surfaces step-by-step reasoning before the final answer.",
  },
];
