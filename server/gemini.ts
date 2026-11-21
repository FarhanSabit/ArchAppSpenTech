import { GoogleGenAI } from '@google/genai';

export type AssistantPersona = 'architect' | 'investor' | 'market';
export type AllowedModel = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface GroundedSource {
  title: string;
  uri: string;
  domain?: string;
}

export interface GeminiChatRequest {
  messages: ChatTurn[];
  persona: AssistantPersona;
  model: AllowedModel;
  useSearchGrounding: boolean;
  stackSummary?: string;
}

const PERSONA_PROMPTS: Record<AssistantPersona, string> = {
  architect: `You are the Spenta Sovereign OS Principal Solutions Architect.
Help enterprise CTOs, CIOs, and engineering leads compose on-premises AI, ERP, Fintech, Voice AI, IoT Edge, and Spatial XR stacks from Spenta's 13 modules (L1-L6 Sovereign Fusion Stack, OPA 0.88 Confidence HITL Gate, AMD SEV-SNP / Intel TDX TEEs, and 4-Tier Server PC hardware $3.2K-$15.3K).
Be concise, concrete, and architectural. Cite exact Spenta modules, pricing, gross margins, and hardware tiers when relevant. Keep responses focused (under 260 words unless a comparison table is requested).`,
  investor: `You are the Spenta Technology Investor Diligence & Financial Analyst.
Assist institutional investors and angels reviewing Spenta's $500K SAFE ($4.5M valuation cap, 20% discount), 20-FTE Dhaka R&D Hub ($11.50/hr loaded, $540K/64.8M BDT Y1), reconciled FY2027-FY2031 trajectory ($672K -> $5.85M rev, $4.252M cum. EBITDA, $3.189M cum. Net Profit, 6.38x 5-yr net cash return at 25% tax), conservative 250%-350% client ROI (450%-580% banking proofs), and 13-product conservative GM matrix (29.1%-76.3%).
Always separate conservative base metrics from unscaled upside ($4.80M Y3 Healthcare ERP). Keep responses crisp and verifiable.`,
  market: `You are the Spenta Technology Live Market & Industry Benchmark Analyst.
Use Google Search grounding to retrieve up-to-date external AI, ERP, and Fintech industry benchmarks, regulatory compliance developments (HIPAA, SOC 2, ISO 27001, Bangladesh Bank ICT v4.0), open-weight LLM/VLM hardware pricing trends, and regional healthcare/fintech/spatial XR market signals, then benchmark them directly against Spenta Sovereign OS.
Be factual, date-aware, and concise.`,
};

const BENCHMARK_GROUNDING_INSTRUCTION = `
Google Search Grounding Mode is ACTIVE:
- Whenever the user asks for analysis, comparisons, TCO, ROI, or market context, actively query Google Search to retrieve the latest verified AI (on-prem vs. cloud LLM/VLM latency, GPU hardware, token cost), ERP (implementation timelines, gross margins, enterprise TCO/payback), and Fintech (ICR/OCR accuracy, AML/KYC straight-through processing, BB ICT / HIPAA / SOC 2 compliance) industry benchmarks.
- Clearly distinguish live external industry benchmarks (citing dates/years where available) from Spenta Sovereign OS internal figures.
- Structure comparative takeaways concisely so executives can act on them immediately.`;

const BENCHMARK_INTENT_REGEX =
  /\b(benchmark|compare|comparison|versus|vs\.?|industry|market|latest|trend|2025|2026|tco|roi|cost|erp|fintech|ai|llm|gpu|compliance|hipaa|soc\s*2|bangladesh bank|rate|latency|accuracy)\b/i;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Add your Gemini API key in Settings > Secrets.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err);
  if (/PERMISSION_DENIED|API_KEY_INVALID|403/i.test(raw)) {
    return new Error(
      'Gemini API authentication failed. Please verify your API key in Settings > Secrets.',
    );
  }
  if (/RESOURCE_EXHAUSTED|429/i.test(raw)) {
    return new Error(
      'Gemini API rate limit or quota reached. Please wait a moment or check your billing-enabled API key in Settings > Secrets.',
    );
  }
  if (/NOT_FOUND|404/i.test(raw)) {
    return new Error(
      'Requested Gemini model was not found. Please retry with the default gemini-4-hydrogen model.',
    );
  }
  return err instanceof Error ? err : new Error(raw || 'Failed to generate Gemini response.');
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = /500|502|503|504|ECONNRESET|ETIMEDOUT|UNAVAILABLE|fetch failed/i.test(
        msg,
      );
      if (!isRetryable || attempt === maxAttempts) {
        throw formatGeminiError(err);
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  throw formatGeminiError(lastErr);
}

interface RawGroundingResponse {
  candidates?: Array<{
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: Array<{
        web?: { uri?: string; title?: string };
      }>;
    };
  }>;
}

function extractGroundingData(response: RawGroundingResponse): {
  sources: GroundedSource[];
  searchQueries: string[];
} {
  const metadata = response.candidates?.[0]?.groundingMetadata;
  const chunks = metadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: GroundedSource[] = [];

  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      let domain = '';
      try {
        domain = new URL(uri).hostname.replace(/^www\./, '');
      } catch {
        domain = '';
      }
      sources.push({
        uri,
        title: chunk.web?.title || domain || uri,
        domain: domain || undefined,
      });
    }
  }

  const rawQueries = metadata?.webSearchQueries ?? [];
  const searchQueries = Array.from(
    new Set(rawQueries.filter((q): q is string => typeof q === 'string' && q.trim().length > 0)),
  );

  return { sources, searchQueries };
}

export async function runSpentaChat(req: GeminiChatRequest): Promise<{
  text: string;
  sources: GroundedSource[];
  searchQueries: string[];
  modelUsed: AllowedModel;
  grounded: boolean;
}> {
  const ai = getClient();
  const validMessages = (req.messages || []).filter(
    (m) =>
      (m.role === 'user' || m.role === 'model') &&
      typeof m.text === 'string' &&
      m.text.trim().length > 0,
  );

  if (validMessages.length === 0) {
    throw new Error('At least one user message is required.');
  }

  const lastMessage = validMessages[validMessages.length - 1];
  const historyMessages = validMessages.slice(0, -1);

  // Use Google Search grounding when toggled on, in Market Scout persona, or on explicit benchmark analysis queries when grounding isn't explicitly turned off
  const wantsBenchmarkSearch =
    req.useSearchGrounding ||
    req.persona === 'market' ||
    (req.useSearchGrounding !== false && BENCHMARK_INTENT_REGEX.test(lastMessage.text));

  const useGrounding = Boolean(wantsBenchmarkSearch);
  const modelUsed: AllowedModel = useGrounding
    ? 'gemini-4-hydrogen'
    : req.model === 'gemini-3.1-flash-lite'
      ? 'gemini-3.1-flash-lite'
      : 'gemini-4-hydrogen';

  const systemInstruction = [
    PERSONA_PROMPTS[req.persona] ?? PERSONA_PROMPTS.architect,
    useGrounding ? BENCHMARK_GROUNDING_INSTRUCTION : '',
    req.stackSummary ? `\nCurrent user Stack Composer & Infrastructure context:\n${req.stackSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await withRetry(async () => {
    const chat = ai.chats.create({
      model: modelUsed,
      history: historyMessages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
      config: {
        systemInstruction,
        ...(useGrounding ? { tools: [{ googleSearch: {} }] } : {}),
      },
    });

    return chat.sendMessage({
      message: lastMessage.text,
    });
  });

  const text = (response.text ?? '').trim();
  const { sources, searchQueries } = extractGroundingData(response);

  return {
    text: text || 'No response text was returned by the model.',
    sources,
    searchQueries,
    modelUsed,
    grounded: useGrounding,
  };
}

export async function runSearchGroundedBrief(query: string): Promise<{
  text: string;
  sources: GroundedSource[];
  searchQueries: string[];
  modelUsed: 'gemini-4-hydrogen';
}> {
  const ai = getClient();
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    throw new Error('A search query is required.');
  }

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: cleanQuery,
      config: {
        systemInstruction:
          'You are a concise enterprise technology and industry benchmark analyst supporting Spenta Technology (spenta.tech). Provide an up-to-date, fact-checked executive brief grounded in Google Search results covering AI, ERP, and Fintech benchmarks in 3-5 crisp bullet points.',
        tools: [{ googleSearch: {} }],
      },
    }),
  );

  const { sources, searchQueries } = extractGroundingData(response);

  return {
    text: (response.text ?? '').trim() || 'No grounded brief returned.',
    sources,
    searchQueries,
    modelUsed: 'gemini-4-hydrogen',
  };
}
