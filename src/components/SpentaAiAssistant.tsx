import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  Globe,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useStack } from '../store/StackContext';

type Persona = 'architect' | 'investor' | 'market';
type ModelChoice = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

interface GroundedSource {
  title: string;
  uri: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: GroundedSource[];
  modelUsed?: string;
  grounded?: boolean;
  timestamp: string;
}

const CHAT_STORAGE_KEY = 'spenta_gemini_chat_v1';

const PERSONAS: { id: Persona; label: string; desc: string }[] = [
  {
    id: 'architect',
    label: 'Solutions Architect',
    desc: 'L1–L6 stack design, 0.88 HITL & on-prem server sizing',
  },
  {
    id: 'investor',
    label: 'Investor Diligence',
    desc: '$500K SAFE, FY27–FY31 P&L & 13-product margins',
  },
  {
    id: 'market',
    label: 'Market Scout',
    desc: 'Google Search grounded market & compliance benchmarks',
  },
];

const STARTER_PROMPTS: Record<Persona, string[]> = {
  architect: [
    'Review my composed stack and recommend the optimal on-prem server tier.',
    'How does Prime Bank BankOCR enforce the 0.88 OPA HITL gate on-premises?',
    'Which Spenta modules should a 150-bed hospital deploy first?',
  ],
  investor: [
    'Break down the 6.38x 5-year net return on the $500K SAFE at 25% tax.',
    'How does Spenta Dhaka R&D ($11.50/hr) create a natural FX hedge?',
    'Compare Spenta high-margin IP lines vs. enterprise delivery pods.',
  ],
  market: [
    'What are the latest 2026 healthcare clinical AI and HL7/FHIR compliance trends?',
    'Compare current enterprise on-prem GPU server costs vs. cloud LLM API spend.',
    'What are the latest Bangladesh Bank ICT security & on-prem data residency expectations?',
  ],
};

function loadInitialMessages(): ChatMessage[] {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [
    {
      id: 'welcome',
      role: 'model',
      text: 'Welcome to Spenta Sovereign AI Advisor. Ask me about your composed stack, L1–L6 architecture, FY2027–FY2031 SAFE financials, or enable Google Search Grounding for live market and regulatory benchmarks.',
      modelUsed: 'gemini-4-hydrogen',
      grounded: false,
      timestamp: new Date().toISOString(),
    },
  ];
}

export function SpentaAiAssistant() {
  const { aiAssistantOpen, setAiAssistantOpen, buildExecutiveBrief, selectedApps } = useStack();
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadInitialMessages());
  const [persona, setPersona] = useState<Persona>('architect');
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(true);
  const [model, setModel] = useState<ModelChoice>('gemini-4-hydrogen');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    if (aiAssistantOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, aiAssistantOpen, loading]);

  useEffect(() => {
    if (!aiAssistantOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAiAssistantOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aiAssistantOpen, setAiAssistantOpen]);

  const sendMessage = async (textOverride?: string) => {
    const promptText = (textOverride ?? input).trim();
    if (!promptText || loading) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: promptText,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = nextHistory
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          persona,
          model: useSearchGrounding || persona === 'market' ? 'gemini-4-hydrogen' : model,
          useSearchGrounding: useSearchGrounding || persona === 'market',
          stackSummary: selectedApps.length > 0 ? buildExecutiveBrief() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const reply: ChatMessage = {
        id: `m_${Date.now()}`,
        role: 'model',
        text: data.text,
        sources: Array.isArray(data.sources) ? data.sources : [],
        modelUsed: data.modelUsed,
        grounded: Boolean(data.grounded),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach Gemini service.');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    const reset: ChatMessage[] = [
      {
        id: 'welcome',
        role: 'model',
        text: 'Conversation cleared. Choose a persona above and ask about Spenta Sovereign OS or live web-grounded benchmarks.',
        modelUsed: 'gemini-4-hydrogen',
        timestamp: new Date().toISOString(),
      },
    ];
    setMessages(reset);
    setErrorMsg(null);
  };

  return (
    <>
      {/* Compact Floating Launcher Button (Bottom-Right, Static) */}
      {!aiAssistantOpen && (
        <button
          type="button"
          onClick={() => setAiAssistantOpen(true)}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 bg-zinc-950 dark:bg-[#111315] hover:bg-zinc-900 dark:hover:bg-[#181B1E] text-white border border-emerald-500/45 px-3.5 py-2.5 rounded-xl shadow-lg text-xs font-semibold transition-colors cursor-pointer no-print"
          aria-label="Open Spenta AI Advisor"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
          <span className="hidden sm:inline">Spenta AI Advisor</span>
          <span className="sm:hidden">AI Advisor</span>
          <span className="hidden md:inline font-mono text-[10px] text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded">
            Live Search
          </span>
        </button>
      )}

      {/* Multi-Turn Gemini Chat & Search Grounding Drawer */}
      {aiAssistantOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end no-print"
          role="dialog"
          aria-modal="true"
          aria-label="Spenta Gemini AI Advisor"
        >
          <div
            className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xs"
            onClick={() => setAiAssistantOpen(false)}
          />

          <aside className="relative z-10 w-full sm:max-w-[440px] h-full bg-white dark:bg-[#0C0E10] shadow-2xl border-l border-zinc-200 dark:border-white/[0.1] flex flex-col">
            {/* Header */}
            <div className="px-4 py-3.5 bg-zinc-950 dark:bg-[#09090B] text-white border-b border-white/[0.08] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">Spenta AI Advisor</div>
                  <div className="text-[10px] font-mono text-emerald-400 truncate">
                    {useSearchGrounding || persona === 'market'
                      ? 'Google Search Grounded'
                      : `${model} · Stack-Aware Chat`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={clearHistory}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Clear conversation history"
                  aria-label="Clear conversation history"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setAiAssistantOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                  aria-label="Close AI Advisor"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Role & Model / Grounding Controls */}
            <div className="px-4 py-2.5 bg-zinc-50 dark:bg-[#111315] border-b border-zinc-200 dark:border-white/[0.08] space-y-2 shrink-0">
              <div className="grid grid-cols-3 gap-1">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPersona(p.id);
                      if (p.id === 'market') {
                        setUseSearchGrounding(true);
                        setModel('gemini-4-hydrogen');
                      }
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer truncate ${
                      persona === p.id
                        ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                        : 'bg-white dark:bg-[#09090B] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/[0.08] hover:border-emerald-500/40'
                    }`}
                    title={p.desc}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const next = !useSearchGrounding;
                    setUseSearchGrounding(next);
                    if (next) setModel('gemini-4-hydrogen');
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono font-semibold border transition-colors cursor-pointer ${
                    useSearchGrounding || persona === 'market'
                      ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
                      : 'bg-white dark:bg-[#09090B] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.08]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>
                    Google Search: {useSearchGrounding || persona === 'market' ? 'ON' : 'OFF'}
                  </span>
                </button>

                {!useSearchGrounding && persona !== 'market' && (
                  <div className="inline-flex rounded-md bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-0.5 font-mono text-[10px]">
                    <button
                      type="button"
                      onClick={() => setModel('gemini-4-hydrogen')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        model === 'gemini-4-hydrogen'
                          ? 'bg-emerald-500 text-zinc-950 font-bold'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      Hydrogen
                    </button>
                    <button
                      type="button"
                      onClick={() => setModel('gemini-3.1-flash-lite')}
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded cursor-pointer ${
                        model === 'gemini-3.1-flash-lite'
                          ? 'bg-emerald-500 text-zinc-950 font-bold'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <Zap className="w-2.5 h-2.5" /> Fast Lite
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Conversation Thread */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-white dark:bg-[#0C0E10]">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-zinc-950 dark:bg-emerald-500 text-white dark:text-zinc-950 font-medium'
                          : 'bg-zinc-50 dark:bg-[#111315] text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-white/[0.08]'
                      }`}
                    >
                      {msg.text}

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-200 dark:border-white/[0.08] space-y-1">
                          <div className="text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Grounded Web Sources
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.sources.slice(0, 5).map((src) => (
                              <a
                                key={src.uri}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-mono bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.1] text-emerald-700 dark:text-emerald-400 hover:border-emerald-500 px-2 py-0.5 rounded max-w-full truncate"
                              >
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate max-w-[180px]">{src.title}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {!isUser && msg.modelUsed && (
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-1 px-1">
                        {msg.modelUsed}
                        {msg.grounded ? ' · Search Grounded' : ''}
                      </span>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 w-fit">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {useSearchGrounding || persona === 'market'
                      ? 'Searching live web & synthesizing answer…'
                      : 'Synthesizing architecture brief…'}
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">AI Advisor Notice</div>
                    <p className="mt-0.5">{errorMsg}</p>
                  </div>
                </div>
              )}

              {messages.length <= 2 && !loading && (
                <div className="pt-2 space-y-1.5">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Suggested {PERSONAS.find((p) => p.id === persona)?.label} Prompts
                  </div>
                  {STARTER_PROMPTS[persona].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className="w-full text-left text-xs text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-[#111315] hover:border-emerald-500/40 border border-zinc-200 dark:border-white/[0.08] rounded-lg px-3 py-2 transition-colors cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              <div ref={scrollEndRef} />
            </div>

            {/* Composer Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="p-3 border-t border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#111315] flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about apps, financials, or live market data..."
                className="flex-1 px-3 py-2 text-xs bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.1] rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="inline-flex items-center justify-center p-2.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white transition-colors cursor-pointer"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
