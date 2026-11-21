import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  ExternalLink,
  Globe,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useStack } from '../store/StackContext';

type Persona = 'architect' | 'investor' | 'market';
type ModelChoice = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

interface GroundedSource {
  title: string;
  uri: string;
  domain?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: GroundedSource[];
  searchQueries?: string[];
  modelUsed?: string;
  grounded?: boolean;
  timestamp: string;
}

const CHAT_STORAGE_KEY = 'spenta_gemini_chat_v1';

const PERSONAS: { id: Persona; label: string; desc: string }[] = [
  {
    id: 'architect',
    label: 'Solutions Architect',
    desc: 'L1–L6 stack design, 0.88 HITL & on-prem vs. cloud AI benchmarks',
  },
  {
    id: 'investor',
    label: 'Investor Diligence',
    desc: '$500K SAFE, FY27–FY31 P&L & ERP/SaaS industry margin benchmarks',
  },
  {
    id: 'market',
    label: 'Market Scout',
    desc: 'Live Google Search grounded AI, ERP & Fintech industry benchmarks',
  },
];

const BENCHMARK_QUICK_ACTIONS: { label: string; prompt: string }[] = [
  {
    label: 'AI Inference TCO',
    prompt:
      'Compare latest 2026 enterprise on-premises GPU server AI inference TCO & latency benchmarks against cloud LLM API pricing, and position Spenta Tier-3 ($7.5K–$8.5K) hardware.',
  },
  {
    label: 'ERP ROI Benchmarks',
    prompt:
      'What are the latest 2026 enterprise ERP implementation cost, timeline, and ROI industry benchmarks compared to Spenta Sovereign ERP & Dhaka dual-shore delivery ($11.50/hr)?',
  },
  {
    label: 'Fintech ICR & Compliance',
    prompt:
      'Summarize current 2026 Fintech document ICR/OCR straight-through processing accuracy benchmarks and banking AI compliance standards (HIPAA, SOC 2, Bangladesh Bank ICT) vs. Spenta 0.88 OPA HITL gate.',
  },
];

const STARTER_PROMPTS: Record<Persona, string[]> = {
  architect: [
    'Review my composed stack and benchmark our on-prem server tier against current cloud GPU API costs.',
    'How does Prime Bank BankOCR enforce the 0.88 OPA HITL gate compared to current fintech OCR benchmarks?',
    'Which Spenta modules should a 150-bed hospital deploy first under latest 2026 HL7/FHIR standards?',
  ],
  investor: [
    'Compare Spenta 29.1%–76.3% conservative gross margins against current 2026 Enterprise ERP & AI SaaS industry benchmarks.',
    'Break down the 6.38x 5-year net return on the $500K SAFE at 25% tax.',
    'How does Spenta Dhaka R&D ($11.50/hr) compare to current global offshore engineering cost benchmarks?',
  ],
  market: [
    'What are the latest 2026 AI, ERP, and Fintech enterprise adoption & ROI benchmarks?',
    'Compare current enterprise on-prem GPU server costs vs. cloud LLM API spend for regulated banks.',
    'What are the latest Bangladesh Bank ICT security, HIPAA, and on-prem data residency benchmarks?',
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
      text: 'Welcome to Spenta Sovereign AI Advisor with live Google Search Grounding. Ask for stack analysis, SAFE diligence, or up-to-date AI, ERP, and Fintech industry benchmark comparisons—sources and search queries are cited automatically.',
      modelUsed: 'gemini-4-hydrogen',
      grounded: true,
      timestamp: new Date().toISOString(),
    },
  ];
}

export function SpentaAiAssistant() {
  const { paletteMode } = useTheme();
  const {
    aiAssistantOpen,
    setAiAssistantOpen,
    buildExecutiveBrief,
    selectedApps,
    deploymentProfile,
  } = useStack();
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadInitialMessages());
  const [persona, setPersona] = useState<Persona>('architect');
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(true);
  const [model, setModel] = useState<ModelChoice>('gemini-4-hydrogen');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  const isStone = paletteMode === 'stone';
  const groundingActive = useSearchGrounding || persona === 'market';

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

  const sendMessage = async (
    textOverride?: string,
    options?: { forceGrounding?: boolean; personaOverride?: Persona },
  ) => {
    const promptText = (textOverride ?? input).trim();
    if (!promptText || loading) return;

    const effectivePersona = options?.personaOverride ?? persona;
    const effectiveGrounding = Boolean(
      options?.forceGrounding || useSearchGrounding || effectivePersona === 'market',
    );

    if (options?.forceGrounding && !useSearchGrounding) {
      setUseSearchGrounding(true);
      setModel('gemini-4-hydrogen');
    }
    if (options?.personaOverride && options.personaOverride !== persona) {
      setPersona(options.personaOverride);
    }

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
          persona: effectivePersona,
          model: effectiveGrounding ? 'gemini-4-hydrogen' : model,
          useSearchGrounding: effectiveGrounding,
          stackSummary:
            selectedApps.length > 0
              ? buildExecutiveBrief()
              : `Infrastructure Target: ${deploymentProfile.switcherLabel} — ${deploymentProfile.title} (${deploymentProfile.latencyBudget})`,
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
        searchQueries: Array.isArray(data.searchQueries) ? data.searchQueries : [],
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
        text: 'Conversation cleared. Choose a persona or run a live AI, ERP, or Fintech industry benchmark comparison grounded in Google Search.',
        modelUsed: 'gemini-4-hydrogen',
        grounded: true,
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
          className={`fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 border px-3.5 py-2.5 rounded-xl shadow-lg text-xs font-semibold transition-colors cursor-pointer no-print ${
            isStone
              ? 'bg-[#16213A] hover:bg-[#1F3863] text-white border-[#1F3863]'
              : 'bg-[#111315] hover:bg-[#181B1E] text-white border-emerald-500/45'
          }`}
          aria-label="Open Spenta AI Advisor"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
          <span className="hidden sm:inline">Spenta AI Advisor</span>
          <span className="sm:hidden">AI Advisor</span>
          <span className="hidden md:inline font-mono text-[10px] text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded">
            Live Benchmarks
          </span>
        </button>
      )}

      {/* Multi-Turn Gemini Chat & Google Search Grounding Drawer */}
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

          <aside
            className={`relative z-10 w-full sm:max-w-[460px] h-full shadow-2xl border-l flex flex-col ${
              isStone
                ? 'bg-[#FAF8F4] border-[#E4DFD6] text-[#16213A]'
                : 'bg-[#0C0E10] border-white/[0.1] text-zinc-100'
            }`}
          >
            {/* Header */}
            <div
              className={`px-4 py-3.5 text-white border-b flex items-center justify-between gap-2 shrink-0 ${
                isStone
                  ? 'bg-[#16213A] border-[#263557]'
                  : 'bg-[#09090B] border-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">Spenta AI Advisor</div>
                  <div className="text-[10px] font-mono text-emerald-400 truncate">
                    {groundingActive
                      ? 'Google Search Grounded · AI, ERP & Fintech Benchmarks'
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

            {/* Role, Google Search Grounding Toggle & Quick Industry Benchmark Bar */}
            <div
              className={`px-4 py-2.5 border-b space-y-2 shrink-0 ${
                isStone
                  ? 'bg-[#F2EFE9] border-[#E4DFD6]'
                  : 'bg-[#111315] border-white/[0.08]'
              }`}
            >
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
                        ? isStone
                          ? 'bg-[#1F3863] text-white'
                          : 'bg-emerald-500 text-zinc-950'
                        : isStone
                          ? 'bg-white text-[#4A5163] border border-[#E4DFD6] hover:border-[#1F3863]'
                          : 'bg-[#09090B] text-zinc-300 border border-white/[0.08] hover:border-emerald-500/40'
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
                    if (persona === 'market') {
                      setPersona('architect');
                      setUseSearchGrounding(false);
                      return;
                    }
                    const next = !useSearchGrounding;
                    setUseSearchGrounding(next);
                    if (next) setModel('gemini-4-hydrogen');
                  }}
                  aria-pressed={groundingActive}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    groundingActive
                      ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
                      : isStone
                        ? 'bg-white text-[#5F6576] border-[#CFC8BC]'
                        : 'bg-[#09090B] text-zinc-400 border-white/[0.08]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>Google Search: {groundingActive ? 'ON' : 'OFF'}</span>
                </button>

                {!groundingActive ? (
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
                ) : (
                  <span
                    className={`font-mono text-[10px] ${
                      isStone ? 'text-[#5F6576]' : 'text-zinc-400'
                    }`}
                  >
                    Target: {deploymentProfile.switcherLabel} · Live Web Citations
                  </span>
                )}
              </div>

              {/* 1-Click Live AI, ERP & Fintech Industry Benchmark Comparisons */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                <span
                  className={`inline-flex items-center gap-1 font-mono text-[10px] font-semibold shrink-0 ${
                    isStone ? 'text-[#5F6576]' : 'text-zinc-400'
                  }`}
                >
                  <BarChart3 className="w-3 h-3" strokeWidth={1.7} />
                  <span>Benchmarks:</span>
                </span>
                {BENCHMARK_QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      sendMessage(action.prompt, {
                        forceGrounding: true,
                        personaOverride: 'market',
                      })
                    }
                    className={`px-2 py-0.5 rounded border text-[10.5px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
                      isStone
                        ? 'bg-white border-[#CFC8BC] text-[#1F3863] hover:border-[#1F3863]'
                        : 'bg-[#09090B] border-white/[0.1] text-emerald-300 hover:border-emerald-500/50'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Conversation Thread */}
            <div
              className={`flex-1 overflow-y-auto px-4 py-4 space-y-3 ${
                isStone ? 'bg-[#FAF8F4]' : 'bg-[#0C0E10]'
              }`}
            >
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[92%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? isStone
                            ? 'bg-[#1F3863] text-white font-medium'
                            : 'bg-emerald-500 text-zinc-950 font-medium'
                          : isStone
                            ? 'bg-white text-[#16213A] border border-[#E4DFD6]'
                            : 'bg-[#111315] text-zinc-200 border border-white/[0.08]'
                      }`}
                    >
                      {msg.text}

                      {msg.searchQueries && msg.searchQueries.length > 0 && (
                        <div
                          className={`mt-2.5 pt-2 border-t space-y-1 ${
                            isStone ? 'border-[#E4DFD6]' : 'border-white/[0.08]'
                          }`}
                        >
                          <div
                            className={`text-[10px] font-mono font-semibold flex items-center gap-1 ${
                              isStone ? 'text-[#5F6576]' : 'text-zinc-400'
                            }`}
                          >
                            <Search className="w-2.5 h-2.5" />
                            <span>Google Search Queries:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {msg.searchQueries.slice(0, 4).map((q) => (
                              <span
                                key={q}
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                  isStone
                                    ? 'bg-[#F2EFE9] text-[#4A5163]'
                                    : 'bg-white/[0.05] text-zinc-300'
                                }`}
                              >
                                “{q}”
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.sources && msg.sources.length > 0 && (
                        <div
                          className={`mt-2.5 pt-2 border-t space-y-1.5 ${
                            isStone ? 'border-[#E4DFD6]' : 'border-white/[0.08]'
                          }`}
                        >
                          <div className="text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Grounded Web Sources ({msg.sources.length})
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.sources.slice(0, 6).map((src) => (
                              <a
                                key={src.uri}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={src.uri}
                                className={`inline-flex items-center gap-1 text-[10px] font-mono border px-2 py-0.5 rounded max-w-full transition-colors ${
                                  isStone
                                    ? 'bg-[#FAF8F4] border-[#CFC8BC] text-[#1C6E46] hover:border-[#1C6E46]'
                                    : 'bg-[#09090B] border-white/[0.1] text-emerald-400 hover:border-emerald-500'
                                }`}
                              >
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate max-w-[190px]">{src.title}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {!isUser && msg.modelUsed && (
                      <span
                        className={`text-[10px] font-mono mt-1 px-1 ${
                          isStone ? 'text-[#5F6576]' : 'text-zinc-500'
                        }`}
                      >
                        {msg.modelUsed}
                        {msg.grounded ? ' · Google Search Grounded' : ''}
                      </span>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 w-fit">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {groundingActive
                      ? 'Searching live AI, ERP & Fintech benchmarks…'
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
                  <div
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                      isStone ? 'text-[#5F6576]' : 'text-zinc-500'
                    }`}
                  >
                    Suggested {PERSONAS.find((p) => p.id === persona)?.label} Prompts
                  </div>
                  {STARTER_PROMPTS[persona].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className={`w-full text-left text-xs border rounded-lg px-3 py-2 transition-colors cursor-pointer ${
                        isStone
                          ? 'bg-white border-[#E4DFD6] text-[#16213A] hover:border-[#1F3863]'
                          : 'bg-[#111315] border-white/[0.08] text-zinc-200 hover:border-emerald-500/40'
                      }`}
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
              className={`p-3 border-t flex items-center gap-2 shrink-0 ${
                isStone
                  ? 'bg-[#F2EFE9] border-[#E4DFD6]'
                  : 'bg-[#111315] border-white/[0.08]'
              }`}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for AI, ERP, or Fintech benchmarks or stack analysis..."
                className={`flex-1 px-3 py-2 text-xs border rounded-lg focus:outline-none focus:border-emerald-500 ${
                  isStone
                    ? 'bg-white border-[#CFC8BC] text-[#16213A] placeholder:text-[#7B8294]'
                    : 'bg-[#09090B] border-white/[0.1] text-zinc-100 placeholder:text-zinc-500'
                }`}
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
