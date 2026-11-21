import React, { useEffect, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Keyboard,
  Loader2,
  Presentation,
  Printer,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { PITCH_DECK_SLIDES, SERVER_TIERS } from '../data/spentaManifest';
import { useStack } from '../store/StackContext';
import {
  PdfThemeOption,
  StackAppendixData,
  exportPitchDeckToPdf,
} from '../utils/exportPitchDeckPdf';
import { SpentaLogo } from './SpentaLogo';

type ExportScope = 'all' | 'current' | 'range';

export function PitchDeckView() {
  const { pendingNavFocus, clearPendingNavFocus, selectedApps, stackMetrics } = useStack();
  const [slideIdx, setSlideIdx] = useState(0);
  const [showNotes, setShowNotes] = useState(true);

  // High-Quality PDF Export state & modal options
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(PITCH_DECK_SLIDES.length);
  const [includeNotesInPdf, setIncludeNotesInPdf] = useState(true);
  const [includeStackAppendix, setIncludeStackAppendix] = useState(true);
  const [pdfTheme, setPdfTheme] = useState<PdfThemeOption>('auto');
  const [pdfState, setPdfState] = useState<'idle' | 'exporting' | 'done'>('idle');
  const [pdfProgress, setPdfProgress] = useState<string>('');

  const total = PITCH_DECK_SLIDES.length;
  const slide = PITCH_DECK_SLIDES[slideIdx];
  const isDarkSlide = slide.theme === 'dark';

  const goPrev = () => setSlideIdx((i) => Math.max(0, i - 1));
  const goNext = () => setSlideIdx((i) => Math.min(total - 1, i + 1));

  useEffect(() => {
    if (pendingNavFocus?.type === 'slide') {
      const num = Number(pendingNavFocus.id);
      if (num >= 1 && num <= total) {
        setSlideIdx(num - 1);
      }
      clearPendingNavFocus();
    }
  }, [pendingNavFocus, clearPendingNavFocus, total]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && exportModalOpen) {
        setExportModalOpen(false);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setSlideIdx((i) => Math.min(total - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setSlideIdx((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [total, exportModalOpen]);

  const buildStackAppendix = (): StackAppendixData | null => {
    if (!includeStackAppendix || selectedApps.length === 0) return null;
    const tierSpec = SERVER_TIERS[stackMetrics.tier];
    return {
      moduleCount: selectedApps.length,
      modules: selectedApps.map((a) => ({
        shortName: a.shortName,
        category: a.category,
        setupUsd: a.setupUsd,
        gmPct: a.gmPct,
        minServerTier: a.minServerTier,
        layers: a.layers,
      })),
      totalSetupUsd: stackMetrics.totalSetupUsd,
      blendedGmPct: stackMetrics.blendedGmPct,
      tierCode: tierSpec.code,
      tierName: tierSpec.name,
      tierHardware: `${tierSpec.hardware} (${tierSpec.vramRam})`,
      tierCapex: tierSpec.capex,
      tierSpeed: tierSpec.speed,
      activeLayers: Array.from(stackMetrics.activeLayers).sort(),
      synergyPairs: stackMetrics.synergyPairs,
    };
  };

  const handleExportPdf = async (scopeOverride?: ExportScope) => {
    const scope = scopeOverride ?? exportScope;
    setPdfState('exporting');
    setPdfProgress('Preparing slides…');

    let targetSlides = PITCH_DECK_SLIDES;
    let filename = 'Spenta-Sovereign-OS-18-Slide-Investor-Deck.pdf';

    if (scope === 'current') {
      targetSlides = [slide];
      filename = `Spenta-Slide-${String(slide.num).padStart(2, '0')}-${slide.section
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}.pdf`;
    } else if (scope === 'range') {
      const start = Math.max(1, Math.min(total, Math.min(rangeStart, rangeEnd)));
      const end = Math.max(1, Math.min(total, Math.max(rangeStart, rangeEnd)));
      targetSlides = PITCH_DECK_SLIDES.slice(start - 1, end);
      filename = `Spenta-Investor-Deck-Slides-${String(start).padStart(2, '0')}-${String(end).padStart(
        2,
        '0',
      )}.pdf`;
    }

    try {
      await exportPitchDeckToPdf({
        slides: targetSlides,
        totalDeckSlides: total,
        includeSpeakerNotes: includeNotesInPdf,
        pdfTheme,
        stackAppendix: scope === 'current' ? null : buildStackAppendix(),
        filename,
        onProgress: (curr, tot) => {
          setPdfProgress(`Rendering ${curr} / ${tot}…`);
        },
      });
      setPdfState('done');
      setPdfProgress('');
      setExportModalOpen(false);
      window.setTimeout(() => setPdfState('idle'), 2600);
    } catch {
      setPdfState('idle');
      setPdfProgress('');
    }
  };

  const kpiAccentClass = (accent?: 'emerald' | 'teal' | 'amber' | 'crimson') => {
    if (isDarkSlide) {
      if (accent === 'crimson') return 'text-[#FB7185]';
      if (accent === 'amber') return 'text-[#FCD34D]';
      if (accent === 'teal') return 'text-[#5EEAD4]';
      return 'text-[#34D399]';
    }
    if (accent === 'crimson') return 'text-[#E11D48]';
    if (accent === 'amber') return 'text-[#B45309]';
    if (accent === 'teal') return 'text-[#0D9488]';
    return 'text-[#065F46]';
  };

  const printAccentClass = (accent?: 'emerald' | 'teal' | 'amber' | 'crimson') => {
    if (accent === 'crimson') return 'print-accent-crimson';
    if (accent === 'amber') return 'print-accent-amber';
    if (accent === 'teal') return 'print-accent-teal';
    return 'print-accent-emerald';
  };

  return (
    <div className="space-y-5 print:space-y-0">
      {/* Header Bar */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 no-print pitch-deck-nav">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 uppercase tracking-[0.14em]">
            <Presentation className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>18-SLIDE MASTER INVESTOR DECK · RECONCILED FY2027–FY2031</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight mt-0.5">
            Pitch Deck — Spenta Sovereign OS Investor Presentation
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden 2xl:inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] px-2.5 py-1.5 rounded-lg">
            <Keyboard className="w-3.5 h-3.5" strokeWidth={1.5} /> ← / → Arrows
          </span>

          <button
            type="button"
            disabled={pdfState === 'exporting'}
            onClick={() => handleExportPdf('current')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#18181B] hover:border-emerald-500/40 text-zinc-900 dark:text-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Slide {String(slide.num).padStart(2, '0')} PDF</span>
          </button>

          <button
            type="button"
            disabled={pdfState === 'exporting'}
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#18181B] hover:border-emerald-500/40 text-zinc-900 dark:text-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
            title="Configure PDF theme, slide range, speaker notes & stack appendix"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>PDF Options</span>
          </button>

          <button
            type="button"
            disabled={pdfState === 'exporting'}
            onClick={() => handleExportPdf('all')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#E11D48] hover:bg-[#BE123C] text-white transition-colors cursor-pointer disabled:opacity-60"
          >
            {pdfState === 'exporting' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : pdfState === 'done' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
            )}
            <span>
              {pdfState === 'exporting'
                ? pdfProgress || 'Generating PDF…'
                : pdfState === 'done'
                  ? 'Deck PDF Exported'
                  : 'Export Full Deck PDF'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#18181B] hover:border-emerald-500/40 text-zinc-900 dark:text-zinc-100 transition-colors cursor-pointer"
            title="Print full 18-slide deck to PDF via browser print dialog"
          >
            <Printer className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              showNotes
                ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-emerald-500 dark:text-zinc-950 dark:border-emerald-500'
                : 'bg-white dark:bg-[#18181B] text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-white/[0.12] hover:border-emerald-500/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{showNotes ? 'Hide Notes' : 'Show Notes'}</span>
          </button>
        </div>
      </section>

      {/* Main Deck Stage + Slide Jump Rail (Screen Interactive View) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pitch-deck-screen-only">
        <aside className="lg:col-span-3 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-3 max-h-[260px] lg:max-h-[640px] overflow-y-auto order-2 lg:order-1 no-print pitch-deck-nav">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-2 pb-2 border-b border-zinc-200 dark:border-white/[0.08]">
            Slide Index (18 Slides)
          </div>
          <div className="mt-2 space-y-1">
            {PITCH_DECK_SLIDES.map((s, idx) => {
              const active = idx === slideIdx;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setSlideIdx(idx)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-start gap-2.5 ${
                    active
                      ? 'bg-zinc-950 text-white dark:bg-emerald-500/15 dark:text-emerald-200 dark:border dark:border-emerald-500/40 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] shrink-0 mt-0.5 tabular-nums ${
                      active ? 'text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {String(s.num).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-[10px] font-mono uppercase ${
                        active ? 'text-emerald-300' : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {s.section}
                    </span>
                    <span className="block truncate">{s.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="lg:col-span-9 space-y-4 order-1 lg:order-2">
          {/* 16:9 Aspect Slide Stage */}
          <div
            className={`relative rounded-2xl border overflow-hidden flex flex-col justify-between p-5 sm:p-8 lg:p-10 min-h-[380px] lg:aspect-[16/9] ${
              isDarkSlide
                ? 'bg-[#09090B] bg-obsidian-grid text-white border-emerald-500/35'
                : 'bg-white text-zinc-950 border-zinc-200 dark:border-white/[0.12]'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <SpentaLogo className="h-6 sm:h-7" tone={isDarkSlide ? 'dark-bg' : 'light-bg'} />
                <span
                  className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-wider px-2 py-0.5 rounded border truncate ${
                    isDarkSlide
                      ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                      : 'text-emerald-800 border-emerald-200 bg-emerald-50'
                  }`}
                >
                  {slide.section}
                </span>
              </div>
              <span
                className={`font-mono text-xs font-bold tabular-nums shrink-0 ${
                  isDarkSlide ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {String(slide.num).padStart(2, '0')} / {total}
              </span>
            </div>

            <div className="my-5 space-y-4 sm:space-y-5">
              <div>
                <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                  {slide.title}
                </h2>
                <p
                  className={`text-xs sm:text-base mt-2 max-w-3xl ${
                    isDarkSlide ? 'text-zinc-300' : 'text-zinc-600'
                  }`}
                >
                  {slide.subtitle}
                </p>
              </div>

              {slide.kpis && slide.kpis.length > 0 && (
                <div
                  className={`grid gap-3 ${
                    slide.kpis.length === 4
                      ? 'grid-cols-2 sm:grid-cols-4'
                      : slide.kpis.length === 3
                        ? 'grid-cols-1 sm:grid-cols-3'
                        : 'grid-cols-1 sm:grid-cols-2'
                  }`}
                >
                  {slide.kpis.map((kpi) => (
                    <div
                      key={kpi.label}
                      className={`rounded-xl p-3 sm:p-3.5 border ${
                        isDarkSlide
                          ? 'bg-[#111315] border-white/[0.08]'
                          : 'bg-zinc-50 border-zinc-200'
                      }`}
                    >
                      <div
                        className={`text-[10px] font-mono uppercase tracking-wider ${
                          isDarkSlide ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      >
                        {kpi.label}
                      </div>
                      <div
                        className={`font-mono text-base sm:text-xl font-extrabold mt-0.5 tabular-nums ${kpiAccentClass(
                          kpi.accent,
                        )}`}
                      >
                        {kpi.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <ul className="space-y-2 text-xs sm:text-sm">
                {slide.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 sm:mt-2 shrink-0" />
                    <span className={isDarkSlide ? 'text-zinc-200' : 'text-zinc-700'}>{bullet}</span>
                  </li>
                ))}
              </ul>

              {slide.callout && (
                <div
                  className={`rounded-xl px-4 py-3 border text-xs ${
                    isDarkSlide
                      ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-100'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                  }`}
                >
                  <span className="font-mono font-bold uppercase text-emerald-500 mr-2">
                    {slide.callout.label}:
                  </span>
                  <span>{slide.callout.text}</span>
                </div>
              )}
            </div>

            <div
              className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono ${
                isDarkSlide
                  ? 'border-white/[0.08] text-zinc-400'
                  : 'border-zinc-200 text-zinc-500'
              }`}
            >
              <span>spenta.tech · Sovereign OS</span>
              <span>Confidential Investor Briefing · hello@spenta.tech</span>
            </div>
          </div>

          {/* Navigation Controls + Progress Bar */}
          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] px-4 py-3 flex items-center justify-between gap-4 no-print pitch-deck-nav">
            <button
              type="button"
              disabled={slideIdx === 0}
              onClick={goPrev}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-100 dark:bg-[#18181B] hover:bg-zinc-950 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-900 dark:text-zinc-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex-1 max-w-md hidden sm:block">
              <div className="h-1.5 bg-zinc-100 dark:bg-[#18181B] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${((slideIdx + 1) / total) * 100}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={slideIdx === total - 1}
              onClick={goNext}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-950 dark:bg-emerald-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-zinc-950 text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Speaker Notes Drawer */}
          {showNotes && (
            <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#111315] p-4">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                Presenter Speaker Notes — Slide {String(slide.num).padStart(2, '0')}
              </div>
              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {slide.speakerNotes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Print-Only Paginated 18-Slide Executive Deck (High-Contrast Paper-Safe Formatting) */}
      <div className="pitch-deck-print-deck">
        {PITCH_DECK_SLIDES.map((s) => (
          <article key={s.num} className="pitch-deck-print-slide">
            {/* Top Slide Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <SpentaLogo className="h-6" tone="light-bg" />
                <span className="pitch-deck-print-badge font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  {s.section}
                </span>
              </div>
              <span className="pitch-deck-print-counter font-mono text-xs font-bold tabular-nums shrink-0">
                {String(s.num).padStart(2, '0')} / {total}
              </span>
            </div>

            {/* Slide Body */}
            <div className="my-4 space-y-4">
              <div>
                <h2 className="tracking-tight">{s.title}</h2>
                <p className="pitch-deck-print-subtitle mt-1.5 max-w-4xl">{s.subtitle}</p>
              </div>

              {s.kpis && s.kpis.length > 0 && (
                <div
                  className={`grid gap-3 ${
                    s.kpis.length >= 4
                      ? 'grid-cols-4'
                      : s.kpis.length === 3
                        ? 'grid-cols-3'
                        : 'grid-cols-2'
                  }`}
                >
                  {s.kpis.map((kpi) => (
                    <div key={kpi.label} className="pitch-deck-print-kpi">
                      <div className="pitch-deck-print-kpi-label font-mono uppercase tracking-wider">
                        {kpi.label}
                      </div>
                      <div
                        className={`pitch-deck-print-kpi-value font-mono mt-0.5 tabular-nums ${printAccentClass(
                          kpi.accent,
                        )}`}
                      >
                        {kpi.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <ul className="space-y-2">
                {s.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5">
                    <span className="pitch-deck-print-bullet-dot w-1.5 h-1.5 rounded-full mt-2 shrink-0" />
                    <span className="pitch-deck-print-bullet-text">{bullet}</span>
                  </li>
                ))}
              </ul>

              {s.callout && (
                <div className="pitch-deck-print-callout">
                  <span className="pitch-deck-print-callout-label font-mono uppercase mr-2">
                    {s.callout.label}:
                  </span>
                  <span>{s.callout.text}</span>
                </div>
              )}

              {showNotes && (
                <div className="pitch-deck-print-notes">
                  <div className="pitch-deck-print-notes-title font-mono uppercase tracking-wider mb-0.5">
                    Presenter Speaker Notes — Slide {String(s.num).padStart(2, '0')}
                  </div>
                  <p>{s.speakerNotes}</p>
                </div>
              )}
            </div>

            {/* Slide Footer */}
            <div className="pitch-deck-print-footer flex items-center justify-between gap-2 font-mono">
              <span>spenta.tech · Sovereign OS · 18-Slide Master Investor Deck</span>
              <span>Confidential Investor Briefing · hello@spenta.tech</span>
            </div>
          </article>
        ))}
      </div>

      {/* High-Quality PDF Export Configuration Modal */}
      {exportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 no-print pitch-deck-nav"
          onClick={() => setExportModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Export Pitch Deck as High-Quality PDF"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.12] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-zinc-950 dark:bg-[#09090B] text-white border-b border-white/[0.08] flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-emerald-400">
                  WIDESCREEN 16:9 VECTOR PDF EXPORT
                </div>
                <h3 className="font-bold text-base mt-0.5">
                  Configure Investor Presentation PDF
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Close PDF options"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Scope Selector */}
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  Slide Selection
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'all', label: `Full Deck (${total})` },
                      { id: 'current', label: `Slide ${String(slide.num).padStart(2, '0')} Only` },
                      { id: 'range', label: 'Custom Range' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExportScope(opt.id)}
                      className={`px-3 py-2 rounded-lg font-semibold border transition-colors cursor-pointer ${
                        exportScope === opt.id
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                          : 'bg-zinc-50 dark:bg-[#09090B] border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {exportScope === 'range' && (
                  <div className="mt-2.5 grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-3">
                    <label className="block">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                        From Slide
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={total}
                        value={rangeStart}
                        onChange={(e) => setRangeStart(Number(e.target.value))}
                        className="mt-1 w-full px-2.5 py-1.5 rounded bg-white dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.1] font-mono text-xs text-zinc-900 dark:text-zinc-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                        To Slide
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={total}
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(Number(e.target.value))}
                        className="mt-1 w-full px-2.5 py-1.5 rounded bg-white dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.1] font-mono text-xs text-zinc-900 dark:text-zinc-100"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* PDF Color Theme */}
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  Document Color Theme
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'auto', label: 'Deck Native' },
                      { id: 'dark', label: 'All Obsidian Dark' },
                      { id: 'light', label: 'Print-Friendly Light' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPdfTheme(opt.id)}
                      className={`px-3 py-2 rounded-lg font-semibold border transition-colors cursor-pointer ${
                        pdfTheme === opt.id
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                          : 'bg-zinc-50 dark:bg-[#09090B] border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Toggles */}
              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNotesInPdf}
                    onChange={(e) => setIncludeNotesInPdf(e.target.checked)}
                    className="mt-0.5 accent-emerald-500 cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Include Presenter Speaker Notes
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Renders a structured notes band at the bottom of each exported slide.
                    </div>
                  </div>
                </label>

                {exportScope !== 'current' && (
                  <label className="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeStackAppendix && selectedApps.length > 0}
                      disabled={selectedApps.length === 0}
                      onChange={(e) => setIncludeStackAppendix(e.target.checked)}
                      className="mt-0.5 accent-emerald-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Append Live Composed Stack Appendix ({selectedApps.length} modules)
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Adds a final 16:9 sheet detailing your selected modules, build scope, GM%, and recommended on-prem server tier.
                      </div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-zinc-50 dark:bg-[#0C0E10] border-t border-zinc-200 dark:border-white/[0.08] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#18181B] text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pdfState === 'exporting'}
                onClick={() => handleExportPdf()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
              >
                {pdfState === 'exporting' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                )}
                <span>
                  {pdfState === 'exporting' ? pdfProgress || 'Generating…' : 'Generate & Download PDF'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
