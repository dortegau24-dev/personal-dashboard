/** OpenRouter API client for AI scoring and insights */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

type OpenRouterOptions = {
  model?: string;
  temperature?: number;
  max_tokens?: number;
};

export async function callOpenRouter(
  messages: Message[],
  options: OpenRouterOptions = {},
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const model = options.model ?? process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4';

  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://personal-dashboard.vercel.app',
      'X-Title': 'Personal Dashboard',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 1024,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${body}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}

export type DailyScorePayload = {
  date: string;
  habits: { name: string; completed: boolean; type: 'positive' | 'negative' }[];
  habitsCompletionPct: number;
  supplements: { name: string; taken: boolean }[];
  supplementCompliancePct: number;
  waterIntakeMl: number;
  waterTargetMl: number;
  mood: { time: string; mood: number; energy: number; notes?: string }[];
  whoop: { recovery?: number; strain?: number; hrv?: number; sleepPerformance?: number } | null;
  training: { type: string; duration?: number; notes?: string }[];
  isFreezeDay: boolean;
  freezeReason?: string;
};

export type DailyScoreResult = {
  overall_score: number;
  category_scores: {
    training: number;
    health: number;
    discipline: number;
    recovery: number;
    productivity: number;
  };
  daily_briefing: string;
  notable_achievements: string[];
  areas_for_improvement: string[];
};
