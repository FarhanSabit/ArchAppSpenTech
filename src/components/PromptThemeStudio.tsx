import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  GitBranch,
  LayoutGrid,
  Monitor,
  Moon,
  Palette,
  Search,
  Sun,
  X,
} from 'lucide-react';
import {
  AGENT_PROMPT_SECTIONS,
  GLOBAL_AGENT_PREAMBLE,
  OITS_DHAKA_DEEP_ANALYSIS_PILLARS,
  OITS_DHAKA_ROADMAP_MASTER_PROMPT,
  PromptPriority,
  THEME_REFERENCE_SPECS,
  ThemeRefId,
  buildFullPromptPackMd,
  buildOitsDhakaMasterRemixMd,
  buildPriorityPhaseMd,
  buildSequencePromptsMd,
  buildSinglePromptSectionMd,
  buildThemeTemplatesPackMd,
  downloadMarkdownFile,
} from '../data/promptThemeStudioData';
import { buildVirtualThemeIframeSrcDoc } from '../utils/virtualThemeIframeHtml';
import { DesignComparisonTable } from './DesignComparisonTable';
import { InteractiveArchitecturePathway } from './InteractiveArchitecturePathway';

const PRIORITY_FILTERS: { id: 'All' | PromptPriority; label: string }[] = [
  { id: 'All', label: 'All (11)' },
  { id: 'P0', label: 'P0 Foundation (3)' },
  { id: 'P1', label: 'P1 Core Views (4)' },
  { id: 'P2', label: 'P2 Exports & 3D (4)' },
];

const INITIAL_IFRAME_POLARITIES: Record<ThemeRefId, 'light' | 'dark'> = {
  'oits-web-v2': 'dark',
  'mmis-v2': 'light',
  oitsdhaka: 'light',
  'spenta-os': 'dark',
};

export function PromptThemeStudio() {
  // P0/P1/P2 prompt deck state
  const [priorityFilter, setPriorityFilter] = useState<'All' | PromptPriority>('All');
  const [promptQuery, setPromptQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>(['p0-1-shell']);

  // Live Preview Toggle: 2x2 Virtual Iframes Grid vs Single Focus Inspector
  const [previewLayout, setPreviewLayout] = useState<'iframes' | 'single'>('iframes');
  const [activeThemeId, setActiveThemeId] = useState<ThemeRefId>('oitsdhaka');
  const [previewPolarity, setPreviewPolarity] = useState<'dark' | 'light'>('light');
  const [iframePolarities, setIframePolarities] = useState<Record<ThemeRefId, 'light' | 'dark'>>(
    INITIAL_IFRAME_POLARITIES,
  );

  // Master Prompt accordion state
  const [masterPromptExpanded, setMasterPromptExpanded] = useState(true);

  // Clipboard & download visual confirmations
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadedKey, setDownloadedKey] = useState<string | null>(null);

  const activeTheme = useMemo(
    () => THEME_REFERENCE_SPECS.find((t) => t.id === activeThemeId) ?? THEME_REFERENCE_SPECS[0],
    [activeThemeId],
  );

  const singleIframeSrcDoc = useMemo(
    () => buildVirtualThemeIframeSrcDoc(activeTheme, previewPolarity),
    [activeTheme, previewPolarity],
  );

  const gridIframeDocs = useMemo(
    () =>
      THEME_REFERENCE_SPECS.map((spec) => ({
        spec,
        polarity: iframePolarities[spec.id],
        srcDoc: buildVirtualThemeIframeSrcDoc(spec, iframePolarities[spec.id]),
      })),
    [iframePolarities],
  );

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

  const handleDownloadMd = (key: string, filename: string, content: string) => {
    downloadMarkdownFile(filename, content);
    setDownloadedKey(key);
    window.setTimeout(() => {
      setDownloadedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  const handleSelectTheme = (id: ThemeRefId, switchToSingle = false) => {
    setActiveThemeId(id);
    const spec = THEME_REFERENCE_SPECS.find((t) => t.id === id);
    if (spec) {
      setPreviewPolarity(iframePolarities[id] ?? spec.defaultPolarity);
    }
    if (switchToSingle) {
      setPreviewLayout('single');
    }
  };

  const syncAllIframePolarities = (mode: 'light' | 'dark' | 'native') => {
    if (mode === 'native') {
      setIframePolarities({ ...INITIAL_IFRAME_POLARITIES });
      return;
    }
    setIframePolarities({
      'oits-web-v2': mode,
      'mmis-v2': mode,
      oitsdhaka: mode,
      'spenta-os': mode,
    });
  };

  const toggleSingleIframePolarity = (id: ThemeRefId) => {
    setIframePolarities((prev) => ({
      ...prev,
      [id]: prev[id] === 'dark' ? 'light' : 'dark',
    }));
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

  return (
    <div className="space-y-10">
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
              <span className="font-mono tabular-nums">4 Virtual Iframe Themes</span>
              <span aria-hidden="true">·</span>
              <span>OITS Dhaka × roadmap.sh Master Remix Prompt</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight text-balance">
              Coding-Agent Prompt Pack, 4-Theme Virtual Iframes &amp; OITS Dhaka Remix Studio
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
              Download any individual P0/P1/P2 section or phase bundle as Markdown, compare all four referenced themes live inside isolated virtual iframes, and export the OITS Dhaka × roadmap.sh Master Prompt for branching in GitHub.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                handleDownloadMd(
                  'bundle-p0p1p2',
                  'spenta-sovereign-os-p0-p1-p2-prompts.md',
                  buildSequencePromptsMd(),
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/50 text-zinc-900 dark:text-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {downloadedKey === 'bundle-p0p1p2' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
              <span>P0–P2 Prompts (.md)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleDownloadMd(
                  'bundle-master-remix',
                  'oitsdhaka-roadmap-master-remix-prompt.md',
                  buildOitsDhakaMasterRemixMd(),
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/50 text-zinc-900 dark:text-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {downloadedKey === 'bundle-master-remix' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
              <span>OITS Dhaka Master (.md)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleDownloadMd(
                  'bundle-themes',
                  'spenta-4-theme-templates-and-comparison.md',
                  buildThemeTemplatesPackMd(),
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/50 text-zinc-900 dark:text-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {downloadedKey === 'bundle-themes' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
              <span>4-Theme Kit (.md)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleDownloadMd(
                  'bundle-full',
                  'spenta-sovereign-os-complete-agent-kit.md',
                  buildFullPromptPackMd(),
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {downloadedKey === 'bundle-full' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
              )}
              <span>{downloadedKey === 'bundle-full' ? 'Downloaded Pack' : 'Download Full Pack (.md)'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 01: P0 -> P1 -> P2 Coding-Agent Prompt Sequence */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              <span>01. Build Sequence</span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span>Ordered by dependency graph · Per-phase &amp; per-section .md export</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50 tracking-tight mt-0.5 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.5} />
              <span>Section Design &amp; Develop Prompts (P0 → P1 → P2)</span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Phase-Level Direct Markdown Downloads */}
            {(['P0', 'P1', 'P2'] as const).map((phase) => {
              const dlKey = `phase-${phase}`;
              const isDone = downloadedKey === dlKey;
              return (
                <button
                  key={phase}
                  type="button"
                  onClick={() =>
                    handleDownloadMd(
                      dlKey,
                      `spenta-sovereign-os-${phase.toLowerCase()}-prompts.md`,
                      buildPriorityPhaseMd(phase),
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/40 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                  <span>{isDone ? `Saved ${phase}` : `Download ${phase} (.md)`}</span>
                </button>
              );
            })}

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

        {/* Prompt Accordion List (Single-Elevation Divider List with Explicit Download Markdown Button) */}
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
              const isDownloaded = downloadedKey === `dl-${section.id}`;
              const priorityColor =
                section.priority === 'P0'
                  ? 'text-rose-600 dark:text-rose-400'
                  : section.priority === 'P1'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-teal-700 dark:text-teal-400';

              return (
                <div key={section.id} className="transition-colors">
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                          handleDownloadMd(
                            `dl-${section.id}`,
                            `spenta-${section.code.toLowerCase().replace('.', '-')}-${section.id}.md`,
                            buildSinglePromptSectionMd(section),
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-800 dark:text-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        title={`Download ${section.code} agent prompt as Markdown`}
                      >
                        {isDownloaded ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Download className="w-3.5 h-3.5" strokeWidth={1.65} />
                        )}
                        <span>{isDownloaded ? 'Downloaded .md' : 'Download Markdown'}</span>
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

      {/* SECTION 02: 4-Theme Live Virtual Iframe Preview Studio */}
      <section className="space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              <span>02. Live Virtual Iframe Sandbox</span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span>CSS-isolated srcDoc iframes · Zero bleed into global portal theme</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50 tracking-tight mt-0.5 flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.5} />
              <span>4-Theme Live Virtual Iframe Preview &amp; Theme Templating Prompts</span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Live Preview Toggle: 2x2 Virtual Iframes vs Single Focus View */}
            <div
              role="group"
              aria-label="Live preview viewport layout"
              className="inline-flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.08]"
            >
              <button
                type="button"
                onClick={() => setPreviewLayout('iframes')}
                aria-pressed={previewLayout === 'iframes'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  previewLayout === 'iframes'
                    ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.65} />
                <span>4-Theme Virtual Iframes (2×2)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewLayout('single')}
                aria-pressed={previewLayout === 'single'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  previewLayout === 'single'
                    ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" strokeWidth={1.65} />
                <span>Single Focus &amp; Prompt</span>
              </button>
            </div>

            {/* Global Polarity Controls for 2x2 Iframe Mode */}
            {previewLayout === 'iframes' ? (
              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => syncAllIframePolarities('native')}
                  className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-[#18181B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Native Defaults
                </button>
                <button
                  type="button"
                  onClick={() => syncAllIframePolarities('light')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-[#18181B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sun className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>All Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => syncAllIframePolarities('dark')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-[#18181B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Moon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>All Dark</span>
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {previewLayout === 'iframes' ? (
          /* 2x2 Real-Time Virtual Iframes Comparison Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {gridIframeDocs.map(({ spec, polarity, srcDoc }) => {
              const isOitsDhaka = spec.id === 'oitsdhaka';
              return (
                <div
                  key={spec.id}
                  className={`rounded-xl border overflow-hidden flex flex-col bg-white dark:bg-[#111315] ${
                    isOitsDhaka
                      ? 'border-emerald-500/45 dark:border-emerald-500/40'
                      : 'border-zinc-200 dark:border-white/[0.08]'
                  }`}
                >
                  {/* Virtual Browser Chrome Toolbar */}
                  <div className="px-3.5 py-2.5 border-b border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#0D1014] flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-950 dark:text-zinc-50">
                        <span className="truncate">{spec.name}</span>
                        <span className="font-mono text-[10px] font-normal text-zinc-500 dark:text-zinc-400 shrink-0">
                          ({polarity})
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {spec.archetype}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleSingleIframePolarity(spec.id)}
                        title={`Flip ${spec.shortLabel} iframe to ${polarity === 'dark' ? 'light' : 'dark'} mode`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#18181B] text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:border-emerald-500/40 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {polarity === 'dark' ? (
                          <Sun className="w-3 h-3" strokeWidth={1.6} />
                        ) : (
                          <Moon className="w-3 h-3" strokeWidth={1.6} />
                        )}
                        <span>{polarity === 'dark' ? 'Light' : 'Dark'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectTheme(spec.id, true)}
                        className="px-2.5 py-1 rounded-md bg-zinc-950 dark:bg-emerald-500 text-white dark:text-zinc-950 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Prompt
                      </button>

                      <a
                        href={spec.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${spec.name} live site`}
                        className="p-1 rounded-md text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
                      >
                        <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </a>
                    </div>
                  </div>

                  {/* Isolated Interactive Virtual Iframe */}
                  <iframe
                    title={`${spec.name} virtual theme preview (${polarity})`}
                    srcDoc={srcDoc}
                    sandbox="allow-scripts"
                    className="w-full h-[350px] border-0 block bg-transparent"
                  />

                  {/* Compact Verified Hex Swatch Bar */}
                  <div className="px-3.5 py-2 border-t border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#0D1014] flex items-center justify-between gap-2 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {spec.keySwatches.slice(0, 5).map((sw) => (
                        <button
                          key={sw.hex}
                          type="button"
                          onClick={() => handleCopy(`grid-sw-${spec.id}-${sw.hex}`, sw.hex)}
                          title={`${sw.label}: ${sw.hex} (click to copy)`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] hover:border-emerald-500/40 cursor-pointer shrink-0"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-xs border border-black/15 dark:border-white/15"
                            style={{ backgroundColor: sw.hex }}
                          />
                          <span>
                            {copiedKey === `grid-sw-${spec.id}-${sw.hex}` ? 'Copied' : sw.hex}
                          </span>
                        </button>
                      ))}
                    </div>
                    <span className="shrink-0 hidden sm:inline">
                      r={spec.radiusCard}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Single Focus Virtual Iframe + Copyable Theme Templating Prompt Split */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
            {/* Left 7 cols: Full-Size Isolated Virtual Iframe Specimen */}
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

              <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-white/[0.1]">
                <iframe
                  title={`${activeTheme.name} focused virtual preview (${previewPolarity})`}
                  srcDoc={singleIframeSrcDoc}
                  sandbox="allow-scripts"
                  className="w-full h-[380px] border-0 block"
                />
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
                      handleDownloadMd(
                        `dl-theme-${activeTheme.id}`,
                        `theme-template-${activeTheme.id}.md`,
                        `${activeTheme.templatePromptMarkdown}\n`,
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/40 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer whitespace-nowrap"
                    title={`Download ${activeTheme.shortLabel} theme prompt as Markdown`}
                  >
                    {downloadedKey === `dl-theme-${activeTheme.id}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                    )}
                    <span>.md</span>
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
        )}
      </section>

      {/* SECTION 03: Deep OITS Dhaka Analysis, Live Interactive Pathway & Master Remix Prompt */}
      <section className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              <span>03. Primary Branch Remix Blueprint</span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span>oitsdhaka.com Visual System × roadmap.sh UX × Spenta/Odoo Content</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50 tracking-tight mt-0.5 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.5} />
              <span>Deep OITS Dhaka Analysis &amp; Master GitHub Branch Remix Prompt</span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy('oits-master-prompt', OITS_DHAKA_ROADMAP_MASTER_PROMPT)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#111315] hover:border-emerald-500/40 text-xs font-semibold text-zinc-900 dark:text-zinc-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedKey === 'oits-master-prompt' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
              <span>
                {copiedKey === 'oits-master-prompt' ? 'Copied Master Prompt' : 'Copy Master Prompt'}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleDownloadMd(
                  'oits-master-md',
                  'oitsdhaka-roadmap-master-remix-prompt.md',
                  buildOitsDhakaMasterRemixMd(),
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-950 dark:bg-emerald-500 text-white dark:text-zinc-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {downloadedKey === 'oits-master-md' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
              )}
              <span>
                {downloadedKey === 'oits-master-md'
                  ? 'Downloaded Master .md'
                  : 'Download Master Remix (.md)'}
              </span>
            </button>
          </div>
        </div>

        {/* 4-Pillar Deep Architectural Teardown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OITS_DHAKA_DEEP_ANALYSIS_PILLARS.map((pillar) => (
            <article
              key={pillar.id}
              className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {pillar.index}.
                </span>
                <h4 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
                  {pillar.title}
                </h4>
              </div>
              <div className="space-y-2 text-xs leading-relaxed">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    OITS Dhaka Pattern:{' '}
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-300">{pillar.oitsDhakaPattern}</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    roadmap.sh UX Fusion:{' '}
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {pillar.roadmapShAdaptation}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                    Spenta / Odoo Content:{' '}
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {pillar.odooContentMapping}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Live Interactive OITS Dhaka × roadmap.sh Pathway Blueprint Prototype */}
        <InteractiveArchitecturePathway compact defaultExpandedTrunks={['trunk-core', 'trunk-ops']} />

        {/* Collapsible Full Master Remix Prompt Markdown Box */}
        <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                git checkout -b remix/oitsdhaka-roadmap-edition
              </div>
              <div className="text-sm font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">
                Executable Master Prompt — Recreate OITS Dhaka Theme + Code-Drawn roadmap.sh Infographics + Tactile 3D PBR
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMasterPromptExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#18181B] text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer whitespace-nowrap"
            >
              {masterPromptExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Hide Prompt</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Show Full Prompt</span>
                </>
              )}
            </button>
          </div>
          {masterPromptExpanded && (
            <div className="p-4 sm:p-5">
              <pre className="p-4 rounded-lg bg-zinc-950 text-zinc-100 text-xs leading-relaxed font-mono overflow-auto max-h-[460px] whitespace-pre-wrap border border-zinc-800">
                {OITS_DHAKA_ROADMAP_MASTER_PROMPT}
              </pre>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 04: 4-Way Design & Theme Comparison Matrix */}
      <DesignComparisonTable />
    </div>
  );
}
