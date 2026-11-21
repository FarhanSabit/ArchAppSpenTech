import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  Moon,
  Palette,
  Search,
  Sun,
  X,
} from 'lucide-react';
import {
  AGENT_PROMPT_SECTIONS,
  GLOBAL_AGENT_PREAMBLE,
  PromptPriority,
  THEME_REFERENCE_SPECS,
  ThemeRefId,
  buildFullPromptPackMd,
  buildSequencePromptsMd,
  buildThemeTemplatesPackMd,
  downloadMarkdownFile,
} from '../data/promptThemeStudioData';
import { DesignComparisonTable } from './DesignComparisonTable';

const PRIORITY_FILTERS: { id: 'All' | PromptPriority; label: string }[] = [
  { id: 'All', label: 'All (11)' },
  { id: 'P0', label: 'P0 Foundation (3)' },
  { id: 'P1', label: 'P1 Core Views (4)' },
  { id: 'P2', label: 'P2 Exports & 3D (4)' },
];

export function PromptThemeStudio() {
  // P0/P1/P2 prompt deck state
  const [priorityFilter, setPriorityFilter] = useState<'All' | PromptPriority>('All');
  const [promptQuery, setPromptQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>(['p0-1-shell']);

  // Sandboxed 4-theme preview state (strictly isolated from portal global theme)
  const [activeThemeId, setActiveThemeId] = useState<ThemeRefId>('oits-web-v2');
  const [previewPolarity, setPreviewPolarity] = useState<'dark' | 'light'>('dark');
  const [specimenTab, setSpecimenTab] = useState<'overview' | 'metrics' | 'audit'>('overview');
  const [specimenAck, setSpecimenAck] = useState(false);

  // Clipboard visual confirmation
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeTheme = useMemo(
    () => THEME_REFERENCE_SPECS.find((t) => t.id === activeThemeId) ?? THEME_REFERENCE_SPECS[0],
    [activeThemeId],
  );

  const previewTokens = previewPolarity === 'dark' ? activeTheme.dark : activeTheme.light;

  const filteredPrompts = useMemo(() => {
    const q = promptQuery.trim().toLowerCase();
    return AGENT_PROMPT_SECTIONS.filter((item) => {
      if (priorityFilter !== 'All' && item.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.targetArea.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.promptMarkdown.toLowerCase().includes(q)
      );
    });
  }, [priorityFilter, promptQuery]);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      setCopiedKey(null);
    }
  };

  const handleSelectTheme = (id: ThemeRefId) => {
    setActiveThemeId(id);
    const spec = THEME_REFERENCE_SPECS.find((t) => t.id === id);
    if (spec) {
      setPreviewPolarity(spec.defaultPolarity);
    }
  };

  const toggleExpandPrompt = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const allVisibleExpanded =
    filteredPrompts.length > 0 && filteredPrompts.every((p) => expandedIds.includes(p.id));

  const toggleExpandAll = () => {
    if (allVisibleExpanded) {
      setExpandedIds([]);
    } else {
      setExpandedIds(filteredPrompts.map((p) => p.id));
    }
  };

  const triggerSpecimenAction = () => {
    setSpecimenAck(true);
    window.setTimeout(() => setSpecimenAck(false), 1800);
  };

  return (
    <div className="space-y-8">
      {/* Downloadable Universal Markdown Prompt Pack Bar */}
      <section className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5 sm:p-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                Universal Markdown Kit
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">11 P0–P2 Prompts</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">4 Verified Theme Templates</span>
              <span aria-hidden="true">·</span>
              <span>Cursor, Claude Code, Windsurf &amp; AI Studio</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight text-balance">
              Downloadable Coding-Agent Prompt Pack &amp; 4-Theme Design Studio
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
              Export the complete engineering prompt sequence and theme token kit as clean Markdown files, copy individual sections with one click, and inspect all four analyzed design systems inside an isolated preview sandbox.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                downloadMarkdownFile(
                  'spenta-sovereign-os-p0-p1-p2-prompts.md',
                  buildSequencePromptsMd(),
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/50 text-zinc-900 dark:text-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>P0–P2 Prompts (.md)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                downloadMarkdownFile(
                  'spenta-4-theme-templates-and-comparison.md',
                  buildThemeTemplatesPackMd(),
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/50 text-zinc-900 dark:text-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>4-Theme Kit (.md)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                downloadMarkdownFile(
                  'spenta-sovereign-os-complete-agent-kit.md',
                  buildFullPromptPackMd(),
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Download Full Pack (.md)</span>
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 1: P0 -> P1 -> P2 Coding-Agent Prompt Sequence */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              <span>01. Build Sequence</span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span>Ordered by dependency graph</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50 tracking-tight mt-0.5 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.5} />
              <span>Section Design &amp; Develop Prompts (P0 → P1 → P2)</span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy('global-preamble', GLOBAL_AGENT_PREAMBLE)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#111315] hover:border-emerald-500/40 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedKey === 'global-preamble' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
              <span>{copiedKey === 'global-preamble' ? 'Copied Preamble' : 'Copy Global Context'}</span>
            </button>

            <button
              type="button"
              onClick={toggleExpandAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#111315] hover:border-emerald-500/40 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{allVisibleExpanded ? 'Collapse All' : 'Expand All'}</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.08]">
            {PRIORITY_FILTERS.map((f) => {
              const active = priorityFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPriorityFilter(f.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-[#18181B] text-zinc-950 dark:text-emerald-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <Search
              className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={promptQuery}
              onChange={(e) => setPromptQuery(e.target.value)}
              placeholder="Filter prompts (e.g. PDF, HITL, Audit)..."
              aria-label="Filter coding agent prompts"
              className="w-full pl-8 pr-8 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#111315] text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            {promptQuery && (
              <button
                type="button"
                onClick={() => setPromptQuery('')}
                aria-label="Clear prompt search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Prompt Accordion List (Single-Elevation Divider List) */}
        {filteredPrompts.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No coding-agent prompts match "{promptQuery}"
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Reset the priority filter or search term to inspect all 11 P0–P2 build prompts.
            </p>
            <button
              type="button"
              onClick={() => {
                setPriorityFilter('All');
                setPromptQuery('');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-950 dark:bg-emerald-500 text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] divide-y divide-zinc-200 dark:divide-white/[0.07] overflow-hidden">
            {filteredPrompts.map((section) => {
              const isOpen = expandedIds.includes(section.id);
              const isCopied = copiedKey === section.id;
              const priorityColor =
                section.priority === 'P0'
                  ? 'text-rose-600 dark:text-rose-400'
                  : section.priority === 'P1'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-teal-700 dark:text-teal-400';

              return (
                <div key={section.id} className="transition-colors">
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleExpandPrompt(section.id)}
                      aria-expanded={isOpen}
                      className="text-left min-w-0 flex-1 space-y-1 cursor-pointer focus:outline-none"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className={`font-mono font-bold tabular-nums ${priorityColor}`}>
                          {section.code}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{section.phaseLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{section.targetArea}</span>
                        {section.dependsOn.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[11px]">
                              After {section.dependsOn.join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-sm sm:text-base font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
                        {section.title}
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
                        {section.summary}
                      </p>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(section.id, section.promptMarkdown)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/40 text-xs font-semibold text-zinc-900 dark:text-zinc-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                        )}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          downloadMarkdownFile(
                            `spenta-${section.code.toLowerCase().replace('.', '-')}-${section.id}.md`,
                            `${GLOBAL_AGENT_PREAMBLE}\n\n---\n\n${section.promptMarkdown}\n`,
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/40 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        title={`Download ${section.code} prompt as Markdown`}
                      >
                        <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span className="hidden sm:inline">.md</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpandPrompt(section.id)}
                        aria-label={isOpen ? `Collapse ${section.code}` : `Expand ${section.code}`}
                        className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] cursor-pointer"
                      >
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
                        ) : (
                          <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5">
                      <pre className="p-4 rounded-lg bg-zinc-950 text-zinc-100 text-xs leading-relaxed font-mono overflow-x-auto whitespace-pre-wrap border border-zinc-800">
                        {section.promptMarkdown}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: Sandboxed 4-Theme Live Preview Studio */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              <span>02. Isolated Theme Sandbox</span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span>Previews apply strictly inside this canvas</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50 tracking-tight mt-0.5 flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.5} />
              <span>4-Theme Live Preview &amp; Theme Templating Prompts</span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 4-Theme Selector */}
            <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.08]">
              {THEME_REFERENCE_SPECS.map((t) => {
                const active = t.id === activeThemeId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTheme(t.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-[#18181B] text-zinc-950 dark:text-emerald-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                    }`}
                  >
                    {t.shortLabel}
                  </button>
                );
              })}
            </div>

            {/* Sandbox-only Light/Dark Polarity Switch */}
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setPreviewPolarity('light')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  previewPolarity === 'light'
                    ? 'bg-white dark:bg-[#18181B] text-zinc-950 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Sun className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewPolarity('dark')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  previewPolarity === 'dark'
                    ? 'bg-white dark:bg-[#18181B] text-zinc-950 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Moon className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sandboxed Live Preview + Theme Prompt Split */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          {/* Left 7 cols: Scoped Live Theme Specimen */}
          <div className="xl:col-span-7 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-white/[0.08]">
              <div>
                <div className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                  {activeTheme.name} — {activeTheme.archetype}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>
                    Default:{' '}
                    <strong className="font-mono text-zinc-800 dark:text-zinc-200">
                      {activeTheme.defaultPolarity}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Previewing:{' '}
                    <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                      {previewPolarity}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">
                    Radius {activeTheme.radiusCard} / {activeTheme.radiusControl}
                  </span>
                </div>
              </div>
              <a
                href={activeTheme.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0"
              >
                <span>Inspect Live Site</span>
                <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
              </a>
            </div>

            {/* Scoped CSS Variable Sandbox Frame */}
            <div
              className="rounded-xl overflow-hidden transition-colors duration-200"
              style={{
                backgroundColor: previewTokens.canvas,
                color: previewTokens.ink,
                border: `1px solid ${previewTokens.border}`,
                fontFamily: activeTheme.fontBody,
                backgroundImage: activeTheme.hasAmbientGrid
                  ? previewPolarity === 'dark'
                    ? 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)'
                    : 'linear-gradient(to right, rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.035) 1px, transparent 1px)'
                  : 'none',
                backgroundSize: activeTheme.hasAmbientGrid ? '24px 24px' : undefined,
              }}
            >
              {/* Specimen Layout: Sidebar Workbench for MMIS vs Topbar for the other 3 */}
              <div
                className={
                  activeTheme.navLayout === 'sidebar-workbench'
                    ? 'grid grid-cols-1 sm:grid-cols-12 min-h-[340px]'
                    : 'flex flex-col min-h-[340px]'
                }
              >
                {activeTheme.navLayout === 'sidebar-workbench' ? (
                  <div
                    className="sm:col-span-4 p-4 flex flex-col justify-between gap-4"
                    style={{
                      backgroundColor: previewTokens.recessed,
                      borderRight: `1px solid ${previewTokens.border}`,
                    }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 flex items-center justify-center font-black text-base"
                          style={{
                            backgroundColor: previewTokens.brand,
                            color: previewTokens.brandText,
                            borderRadius: activeTheme.radiusControl,
                            fontFamily: activeTheme.fontMono,
                          }}
                        >
                          M
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">MMIS Intel</div>
                          <div
                            className="text-[10px] uppercase tracking-wider truncate"
                            style={{ color: previewTokens.mutedInk }}
                          >
                            Executive Suite
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {(
                          [
                            { id: 'overview', label: 'Executive Summary' },
                            { id: 'metrics', label: 'Regional Margins' },
                            { id: 'audit', label: 'Governance Queue' },
                          ] as const
                        ).map((nav) => {
                          const active = specimenTab === nav.id;
                          return (
                            <button
                              key={nav.id}
                              type="button"
                              onClick={() => setSpecimenTab(nav.id)}
                              className="w-full text-left px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer"
                              style={{
                                borderRadius: activeTheme.radiusControl,
                                backgroundColor: active ? previewTokens.accentSoft : 'transparent',
                                color: active ? previewTokens.accent : previewTokens.secondaryInk,
                              }}
                            >
                              {nav.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div
                      className="p-2.5 text-[11px]"
                      style={{
                        border: `1px dashed ${previewTokens.border}`,
                        borderRadius: activeTheme.radiusControl,
                        color: previewTokens.mutedInk,
                      }}
                    >
                      Warm organic surface contrast designed for long-session BI reading.
                    </div>
                  </div>
                ) : (
                  <div
                    className="px-4 py-3 flex items-center justify-between gap-3"
                    style={{
                      backgroundColor: previewTokens.surface,
                      borderBottom: `1px solid ${previewTokens.border}`,
                      backdropFilter: activeTheme.hasGlassBlur ? 'blur(10px)' : undefined,
                    }}
                  >
                    <div
                      className="text-xs font-bold tracking-tight whitespace-nowrap"
                      style={{ fontFamily: activeTheme.fontDisplay }}
                    >
                      {activeTheme.shortLabel}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(['overview', 'metrics', 'audit'] as const).map((tab) => {
                        const active = specimenTab === tab;
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setSpecimenTab(tab)}
                            className="px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors cursor-pointer"
                            style={{
                              borderRadius: activeTheme.radiusControl,
                              backgroundColor: active ? previewTokens.accentSoft : 'transparent',
                              color: active ? previewTokens.accent : previewTokens.mutedInk,
                            }}
                          >
                            {tab}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={triggerSpecimenAction}
                      className="px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
                      style={{
                        backgroundColor: previewTokens.brand,
                        color: previewTokens.brandText,
                        borderRadius: activeTheme.radiusControl,
                      }}
                    >
                      {specimenAck ? 'Applied' : 'Deploy'}
                    </button>
                  </div>
                )}

                {/* Specimen Workspace Body */}
                <div
                  className={
                    activeTheme.navLayout === 'sidebar-workbench'
                      ? 'sm:col-span-8 p-4 sm:p-5 space-y-4'
                      : 'p-4 sm:p-5 space-y-4 flex-1'
                  }
                >
                  <div className="space-y-1">
                    <div
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{
                        color: previewTokens.accent,
                        fontFamily: activeTheme.fontMono,
                      }}
                    >
                      {activeTheme.eyebrowBar && (
                        <span
                          className="inline-block w-4 h-0.5"
                          style={{ backgroundColor: previewTokens.accent }}
                        />
                      )}
                      <span>
                        {specimenTab === 'overview'
                          ? 'Architecture Specimen'
                          : specimenTab === 'metrics'
                            ? 'Margin Telemetry'
                            : 'Policy Verification'}
                      </span>
                    </div>
                    <h4
                      className="text-lg font-extrabold tracking-tight"
                      style={{ fontFamily: activeTheme.fontDisplay }}
                    >
                      {specimenTab === 'overview'
                        ? 'Enterprise Operations Command'
                        : specimenTab === 'metrics'
                          ? 'Quarterly Margin Performance'
                          : 'Governance & Audit Controls'}
                    </h4>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: previewTokens.secondaryInk }}
                    >
                      {activeTheme.summary}
                    </p>
                  </div>

                  {/* 3 KPI Blocks */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      {
                        label: 'Revenue Run-Rate',
                        value: '$5.85M',
                        tone: previewTokens.positive,
                      },
                      {
                        label: 'Blended GM',
                        value: '65.1%',
                        tone: previewTokens.accent,
                      },
                      {
                        label: 'HITL Gate',
                        value: '0.88',
                        tone: previewTokens.caution,
                      },
                    ].map((kpi) => (
                      <div
                        key={kpi.label}
                        className="p-3"
                        style={{
                          backgroundColor: previewTokens.surface,
                          border: `1px solid ${previewTokens.border}`,
                          borderRadius: activeTheme.radiusCard,
                          boxShadow: previewTokens.shadow,
                        }}
                      >
                        <div
                          className="text-[10px] truncate"
                          style={{ color: previewTokens.mutedInk }}
                        >
                          {kpi.label}
                        </div>
                        <div
                          className="text-sm sm:text-base font-extrabold mt-0.5 tabular-nums"
                          style={{
                            color: kpi.tone,
                            fontFamily: activeTheme.fontMono,
                          }}
                        >
                          {kpi.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Compact Table + Action Row */}
                  <div
                    className="overflow-hidden"
                    style={{
                      backgroundColor: previewTokens.surface,
                      border: `1px solid ${previewTokens.border}`,
                      borderRadius: activeTheme.radiusCard,
                      boxShadow: previewTokens.shadow,
                    }}
                  >
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${previewTokens.border}` }}>
                          <th className="px-3 py-2 font-semibold" style={{ color: previewTokens.mutedInk }}>
                            Module
                          </th>
                          <th className="px-3 py-2 font-semibold text-right" style={{ color: previewTokens.mutedInk }}>
                            Margin
                          </th>
                          <th className="px-3 py-2 font-semibold text-right" style={{ color: previewTokens.mutedInk }}>
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { name: 'Document AI ICR', gm: '58.0%', status: 'Verified', color: previewTokens.positive },
                          { name: 'Sovereign MIS ERP', gm: '64.2%', status: 'Review', color: previewTokens.caution },
                          { name: 'Cyber SLA Core', gm: '71.5%', status: 'Enforced', color: previewTokens.accent },
                        ].map((row, idx) => (
                          <tr
                            key={row.name}
                            style={{
                              borderTop: idx > 0 ? `1px solid ${previewTokens.border}` : undefined,
                            }}
                          >
                            <td className="px-3 py-2 font-medium">{row.name}</td>
                            <td
                              className="px-3 py-2 text-right tabular-nums"
                              style={{ fontFamily: activeTheme.fontMono, color: previewTokens.secondaryInk }}
                            >
                              {row.gm}
                            </td>
                            <td
                              className="px-3 py-2 text-right font-semibold"
                              style={{ color: row.color }}
                            >
                              {row.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {activeTheme.navLayout === 'sidebar-workbench' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={triggerSpecimenAction}
                        className="px-3 py-1.5 text-xs font-semibold cursor-pointer"
                        style={{
                          backgroundColor: previewTokens.brand,
                          color: previewTokens.brandText,
                          borderRadius: activeTheme.radiusControl,
                        }}
                      >
                        {specimenAck ? 'Saved Snapshot' : 'Generate Briefing'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPolarity((p) => (p === 'dark' ? 'light' : 'dark'))
                        }
                        className="px-3 py-1.5 text-xs font-semibold cursor-pointer"
                        style={{
                          backgroundColor: previewTokens.surface,
                          color: previewTokens.ink,
                          border: `1px solid ${previewTokens.border}`,
                          borderRadius: activeTheme.radiusControl,
                        }}
                      >
                        Flip Polarity
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Verified Hex Swatches (1-click copy) */}
            <div>
              <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mb-2">
                Verified Extracted Palette Tokens (click any swatch to copy hex)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {activeTheme.keySwatches.map((swatch) => {
                  const swatchKey = `swatch-${activeTheme.id}-${swatch.hex}`;
                  const copied = copiedKey === swatchKey;
                  return (
                    <button
                      key={swatch.label}
                      type="button"
                      onClick={() => handleCopy(swatchKey, swatch.hex)}
                      className="text-left p-2 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] hover:border-emerald-500/40 transition-colors cursor-pointer"
                    >
                      <div
                        className="w-full h-6 rounded border border-black/10 dark:border-white/10 mb-1.5"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <div className="text-[10px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {swatch.label}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                        {copied ? 'Copied!' : swatch.hex}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 5 cols: Copyable Theme Templating Prompt */}
          <div className="xl:col-span-5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-white/[0.08]">
              <div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Theme Templating Prompt
                </div>
                <div className="text-sm font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">
                  Apply "{activeTheme.archetype}"
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(`theme-prompt-${activeTheme.id}`, activeTheme.templatePromptMarkdown)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 dark:bg-emerald-500 text-white dark:text-zinc-950 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedKey === `theme-prompt-${activeTheme.id}` ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                  <span>
                    {copiedKey === `theme-prompt-${activeTheme.id}` ? 'Copied' : 'Copy Prompt'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadMarkdownFile(
                      `theme-template-${activeTheme.id}.md`,
                      `${activeTheme.templatePromptMarkdown}\n`,
                    )
                  }
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/40 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  title={`Download ${activeTheme.shortLabel} theme prompt as Markdown`}
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <pre className="flex-1 p-3.5 rounded-lg bg-zinc-950 text-zinc-100 text-[11.5px] leading-relaxed font-mono overflow-auto max-h-[420px] whitespace-pre-wrap border border-zinc-800">
              {activeTheme.templatePromptMarkdown}
            </pre>

            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
              Paste this theme block above any P0–P2 section prompt to restyle a target codebase using verified live tokens from{' '}
              <span className="font-mono text-zinc-800 dark:text-zinc-200">
                {activeTheme.shortLabel}
              </span>
              .
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: 4-Way Design & Theme Comparison Matrix */}
      <DesignComparisonTable
        kicker="03. Side-by-Side Comparison · Design & Theme POV Only"
        heading="4-Reference Design & Theme Comparison Matrix"
      />
    </div>
  );
}
