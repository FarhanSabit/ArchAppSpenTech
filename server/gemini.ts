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
Be concise, concrete, and architectural. Cite exact Spenta modules, pricing, gross margins, and hardware tiers when relevant. Keep responses focused (under 240 words unless a deep table is requested).`,
  investor: `You are the Spenta Technology Investor Diligence & Financial Analyst.
Assist institutional investors and angels reviewing Spenta's $500K SAFE ($4.5M valuation cap, 20% discount), 20-FTE Dhaka R&D Hub ($11.50/hr loaded, $540K/64.8M BDT Y1), reconciled FY2027-FY2031 trajectory ($672K -> $5.85M rev, $4.252M cum. EBITDA, $3.189M cum. Net Profit, 6.38x 5-yr net cash return at 25% tax), conservative 250%-350% client ROI (450%-580% banking proofs), and 13-product conservative GM matrix (29.1%-76.3%).
Always separate conservative base metrics from unscaled upside ($4.80M Y3 Healthcare ERP). Keep responses crisp and verifiable.`,
  market: `You are the Spenta Technology Live Market & Regulatory Research Scout.
Use Google Search grounding to retrieve up-to-date external benchmarks, regulatory compliance developments (HIPAA, SOC 2, ISO 27001, Bangladesh Bank ICT v4.0), open-weight LLM/hardware pricing trends, and regional healthcare/fintech/spatial XR market signals, then connect them back to Spenta Sovereign OS.
Be factual, date-aware, and concise.`,
};

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

function extractGroundedSources(response: {
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: { uri?: string; title?: string };
      }>;
    };
  }>;
}): GroundedSource[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: GroundedSource[] = [];
  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      sources.push({
        uri,
        title: chunk.web?.title || new URL(uri).hostname,
      });
    }
  }
  return sources;
}

export async function runSpentaChat(req: GeminiChatRequest): Promise<{
  text: string;
  sources: GroundedSource[];
  modelUsed: AllowedModel;
  grounded: boolean;
}> {
  const ai = getClient();
  const validMessages = (req.messages || []).filter(
    (m) => (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim().length > 0,
  );

  if (validMessages.length === 0) {
    throw new Error('At least one user message is required.');
  }

  const lastMessage = validMessages[validMessages.length - 1];
  const historyMessages = validMessages.slice(0, -1);

  // When Search Grounding is active, always route via gemini-4-hydrogen with googleSearch tool
  const useGrounding = Boolean(req.useSearchGrounding || req.persona === 'market');
  const modelUsed: AllowedModel = useGrounding
    ? 'gemini-4-hydrogen'
    : req.model === 'gemini-3.1-flash-lite'
      ? 'gemini-3.1-flash-lite'
      : 'gemini-4-hydrogen';

  const systemInstruction = [
    PERSONA_PROMPTS[req.persona] ?? PERSONA_PROMPTS.architect,
    req.stackSummary ? `\nCurrent user Stack Composer context:\n${req.stackSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n');

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

  const response = await chat.sendMessage({
    message: lastMessage.text,
  });

  const text = (response.text ?? '').trim();
  const sources = extractGroundedSources(response);

  return {
    text: text || 'No response text was returned by the model.',
    sources,
    modelUsed,
    grounded: useGrounding,
  };
}

export async function runSearchGroundedBrief(query: string): Promise<{
  text: string;
  sources: GroundedSource[];
  modelUsed: 'gemini-4-hydrogen';
}> {
  const ai = getClient();
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    throw new Error('A search query is required.');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: cleanQuery,
    config: {
      systemInstruction:
        'You are a concise enterprise technology and market research analyst supporting Spenta Technology (spenta.tech). Provide an up-to-date, fact-checked executive brief grounded in Google Search results in 3-5 crisp bullet points.',
      tools: [{ googleSearch: {} }],
    },
  });

  return {
    text: (response.text ?? '').trim() || 'No grounded brief returned.',
    sources: extractGroundedSources(response),
    modelUsed: 'gemini-4-hydrogen',
  };
}
