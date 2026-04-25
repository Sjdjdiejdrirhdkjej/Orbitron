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
    id: "gpt-5.1",
    name: "GPT-5.1",
    provider: "OpenAI",
    contextWindow: 400000,
    inputPrice: 1.25,
    outputPrice: 10.0,
    throughput: 95,
    latency: 340,
    modalities: ["text", "vision", "audio", "tools"],
    description: "OpenAI's newest flagship. Sharper reasoning, better tool use, and lower latency than GPT-5.",
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    contextWindow: 400000,
    inputPrice: 1.25,
    outputPrice: 10.0,
    throughput: 70,
    latency: 380,
    modalities: ["text", "vision", "audio", "tools"],
    description: "The model that defined the GPT-5 generation. Strong at agentic, multimodal, and long-context work.",
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 mini",
    provider: "OpenAI",
    contextWindow: 400000,
    inputPrice: 0.25,
    outputPrice: 2.0,
    throughput: 210,
    latency: 180,
    modalities: ["text", "vision", "tools"],
    description: "Fast and cheap GPT-5 variant. Production workhorse for most chat and tool-use workloads.",
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 nano",
    provider: "OpenAI",
    contextWindow: 400000,
    inputPrice: 0.05,
    outputPrice: 0.40,
    throughput: 320,
    latency: 110,
    modalities: ["text", "tools"],
    description: "Lowest-latency tier. Sub-200ms time-to-first-token for routing, classification, and edge use cases.",
  },
  {
    id: "o4-mini",
    name: "o4-mini",
    provider: "OpenAI",
    contextWindow: 200000,
    inputPrice: 1.1,
    outputPrice: 4.4,
    throughput: 75,
    latency: 800,
    modalities: ["text", "tools"],
    description: "Compact reasoning model. State-of-the-art on coding and math benchmarks at a deployable price.",
  },
  {
    id: "o3",
    name: "o3",
    provider: "OpenAI",
    contextWindow: 200000,
    inputPrice: 2.0,
    outputPrice: 8.0,
    throughput: 35,
    latency: 1400,
    modalities: ["text", "tools"],
    description: "Deep reasoning model. Slow but exceptional at multi-step proofs, planning, and code synthesis.",
  },

  // ---------- Anthropic ----------
  {
    id: "claude-opus-4.5",
    name: "Claude Opus 4.5",
    provider: "Anthropic",
    contextWindow: 200000,
    inputPrice: 15.0,
    outputPrice: 75.0,
    throughput: 45,
    latency: 450,
    modalities: ["text", "vision", "tools"],
    description: "Anthropic's most powerful model. Unmatched at long-context analysis, agentic coding, and research.",
  },
  {
    id: "claude-sonnet-4.5",
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
    id: "claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    contextWindow: 200000,
    inputPrice: 1.0,
    outputPrice: 5.0,
    throughput: 230,
    latency: 160,
    modalities: ["text", "vision", "tools"],
    description: "Cheap, fast, smarter than it has any right to be. Great for streaming UIs and high-volume jobs.",
  },
  {
    id: "claude-opus-4.1",
    name: "Claude Opus 4.1",
    provider: "Anthropic",
    contextWindow: 200000,
    inputPrice: 15.0,
    outputPrice: 75.0,
    throughput: 50,
    latency: 480,
    modalities: ["text", "vision", "tools"],
    description: "Previous-generation flagship. Still excellent for complex agentic workflows and pinned deployments.",
  },

  // ---------- Google ----------
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    contextWindow: 2000000,
    inputPrice: 1.25,
    outputPrice: 10.0,
    throughput: 130,
    latency: 300,
    modalities: ["text", "vision", "audio", "tools"],
    description: "Massive 2M-token context. Native multimodal with built-in extended thinking for hard problems.",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    contextWindow: 1000000,
    inputPrice: 0.30,
    outputPrice: 2.50,
    throughput: 250,
    latency: 150,
    modalities: ["text", "vision", "audio", "tools"],
    description: "1M context, fully multimodal, blazing fast. Outstanding price-to-performance for most workloads.",
  },
];
