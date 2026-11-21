import React, { useEffect, useState } from 'react';
import { Download, ImageOff, Maximize2, Printer, X, ZoomIn, ZoomOut } from 'lucide-react';
import aiBrainPlate from '../assets/images/spenta_ai_brain_plate_1795170757868.jpg';
import l1L6Plate from '../assets/images/spenta_l1_l6_stack_plate_1795170758646.jpg';
import captivePlate from '../assets/images/spenta_captive_ecosystem_plate_1795170758530.jpg';
import financialsPlate from '../assets/images/spenta_financials_plate_1795170783795.jpg';
import { useStack } from '../store/StackContext';

interface InfographicPlate {
  id: 'ai-brain' | 'l1-l6-stack' | 'captive-ecosystem' | 'financial-edge';
  legacyId: string;
  plateNumber: string;
  tag: string;
  title: string;
  subtitle: string;
  highlights: string[];
  imageUrl: string;
  filename: string;
}

const INFOGRAPHIC_PLATES: InfographicPlate[] = [
  {
    id: 'ai-brain',
    legacyId: 'spenta-ai-brain-map',
    plateNumber: 'PLATE 01',
    tag: 'ECOSYSTEM TOPOLOGY',
    title: 'Spenta Sovereign AI Brain — 8 Hubs & 13 Composable Modules',
    subtitle:
      'Dual-hemisphere architecture uniting Operations Engine (Healthcare, Banking, ERP, Security) with Experience & IR4 Engine (XR, Voice, Retail, Edge) around Spenta Core L1–L6.',
    highlights: ['Zero Cloud PII Egress', '0.88 Confidence HITL Gate', 'San Jose · Australia · Dhaka'],
    imageUrl: aiBrainPlate,
    filename: 'spenta-plate-01-sovereign-ai-brain.jpg',
  },
  {
    id: 'l1-l6-stack',
    legacyId: 'l1-l6-sovereign-isolation',
    plateNumber: 'PLATE 02',
    tag: 'SYSTEM ARCHITECTURE',
    title: 'L1–L6 Sovereign Fusion Stack & 4-Tier On-Prem Server Matrix',
    subtitle:
      'End-to-end hardware-enforced sovereignty from Wasm/MQTT IIoT gateways and AMD SEV-SNP/TDX enclaves up through local LLaMA 3.2 Vision, UE5 Digital Twins, OPA 0.88 Gate, and Omni-Channel UI.',
    highlights: ['Tier 1–4 ($3.2K–$15.3K)', 'Tier 3 Baseline $7.5K–$8.5K', '<50ms Edge Inference'],
    imageUrl: l1L6Plate,
    filename: 'spenta-plate-02-l1-l6-sovereign-stack.jpg',
  },
  {
    id: 'captive-ecosystem',
    legacyId: 'best-xltd-captive-flows',
    plateNumber: 'PLATE 03',
    tag: 'CAPTIVE DISTRIBUTION',
    title: 'Captive Sister-Entity Synergies: BEST Retail & X Ltd Mobility',
    subtitle:
      'Production-hardened rollout pipelines spanning BEST Electronics (65+ showrooms, 365 Exchange Circular CRM, WebAR Try-On) and X Ltd (80 BaaS swap stations, 480 EVs, Green AI carbon telemetry).',
    highlights: ['65+ Retail Showrooms', '80 BaaS Stations / 480 EVs', 'Live Sister-Entity Proof'],
    imageUrl: captivePlate,
    filename: 'spenta-plate-03-captive-ecosystem-synergies.jpg',
  },
  {
    id: 'financial-edge',
    legacyId: 'dual-capability-engine',
    plateNumber: 'PLATE 04',
    tag: 'INVESTOR ECONOMICS',
    title: 'Reconciled FY2027–FY2031 Trajectory & Dual-Shore Cost Edge',
    subtitle:
      'Conservative 0.5825× scaling from $672K FY27 to $5.85M FY31 delivering 6.38× 5-year net cash return on the $500K SAFE raise, anchored by $11.50/hr Dhaka R&D economics and 76.3% XR IP gross margins.',
    highlights: ['$500K SAFE · $4.5M Cap', '6.38× 5-Yr Net Return', '40%–60% Cost Advantage'],
    imageUrl: financialsPlate,
    filename: 'spenta-plate-04-financial-trajectory-dual-shore.jpg',
  },
];

export function InfographicsView() {
  const { pendingNavFocus, clearPendingNavFocus } = useStack();
  const [lightboxItem, setLightboxItem] = useState<InfographicPlate | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (pendingNavFocus?.type === 'infographic') {
      const match = INFOGRAPHIC_PLATES.find(
        (p) => p.id === pendingNavFocus.id || p.legacyId === pendingNavFocus.id,
      );
      if (match) {
        setZoom(1);
        setLightboxItem(match);
      }
      clearPendingNavFocus();
    }
  }, [pendingNavFocus, clearPendingNavFocus]);

  useEffect(() => {
    if (!lightboxItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxItem(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxItem]);

  const downloadPlate = (plate: InfographicPlate) => {
    const link = document.createElement('a');
    link.href = plate.imageUrl;
    link.download = plate.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
            BOARDROOM &amp; TECHNICAL PRESENTATION PLATES
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight mt-1">
            Infographics — High-Resolution Architecture Gallery
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl">
            Click any 16:9 presentation plate to open full-screen zoom inspection, download high-resolution artwork, or print for executive investor briefings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold transition-colors cursor-pointer shrink-0 no-print"
        >
          <Printer className="w-4 h-4" strokeWidth={1.5} />
          <span>Print Gallery</span>
        </button>
      </section>

      {/* 2x2 Responsive Plate Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {INFOGRAPHIC_PLATES.map((plate) => {
          const isBroken = Boolean(failedImages[plate.id]);
          return (
            <article
              key={plate.id}
              className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] overflow-hidden flex flex-col transition-colors hover:border-emerald-500/40"
            >
              <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-white/[0.08] flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em]">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      {plate.plateNumber}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">·</span>
                    <span className="text-zinc-500 dark:text-zinc-400">{plate.tag}</span>
                  </div>
                  <h2 className="font-bold text-sm sm:text-base text-zinc-950 dark:text-zinc-50 mt-1 leading-snug">
                    {plate.title}
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    {plate.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 no-print">
                  <button
                    type="button"
                    onClick={() => downloadPlate(plate)}
                    className="p-2 rounded-lg border border-zinc-200 dark:border-white/[0.1] text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:border-emerald-500/50 transition-colors cursor-pointer"
                    title="Download high-resolution plate"
                    aria-label={`Download ${plate.title}`}
                  >
                    <Download className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setLightboxItem(plate);
                    }}
                    className="p-2 rounded-lg bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200 hover:bg-emerald-500 hover:text-zinc-950 transition-colors cursor-pointer"
                    title="Inspect full-screen"
                    aria-label={`Zoom ${plate.title}`}
                  >
                    <Maximize2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* 16:9 High-Res Presentation Plate Frame */}
              <div
                onClick={() => {
                  setZoom(1);
                  setLightboxItem(plate);
                }}
                className="relative aspect-video bg-[#09090B] overflow-hidden cursor-zoom-in group"
              >
                {!isBroken ? (
                  <img
                    src={plate.imageUrl}
                    alt={plate.title}
                    loading="lazy"
                    onError={() => setFailedImages((prev) => ({ ...prev, [plate.id]: true }))}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-obsidian-grid">
                    <ImageOff className="w-7 h-7 text-emerald-500 mb-2" strokeWidth={1.5} />
                    <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                      {plate.plateNumber} · {plate.tag}
                    </div>
                    <div className="text-sm font-bold text-white mt-1 max-w-md">{plate.title}</div>
                  </div>
                )}
              </div>

              {/* Footer Metadata Strip */}
              <div className="px-5 py-2.5 border-t border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#0C0E10] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                <span>{plate.highlights.join(' · ')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setLightboxItem(plate);
                  }}
                  className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer no-print"
                >
                  Open Lightbox →
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Full-Screen Zoom Lightbox */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/92 backdrop-blur-sm flex flex-col p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={lightboxItem.title}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 text-white mb-4">
            <div className="min-w-0">
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-[0.14em]">
                {lightboxItem.plateNumber} · {lightboxItem.tag}
              </div>
              <h3 className="text-sm sm:text-lg font-bold truncate">{lightboxItem.title}</h3>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <span className="font-mono text-xs w-12 text-center tabular-nums text-zinc-200">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2, Number((z + 0.25).toFixed(2))))}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => downloadPlate(lightboxItem)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span className="hidden sm:inline">Save Plate</span>
              </button>
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                className="p-2 rounded-lg bg-white/10 hover:bg-[#E11D48] text-white cursor-pointer"
                aria-label="Close lightbox"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div
            className="flex-1 overflow-auto rounded-2xl bg-[#09090B] border border-white/10 p-3 sm:p-5 flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLightboxItem(null);
            }}
          >
            <div
              style={{
                width: `${Math.round(zoom * 100)}%`,
                maxWidth: `${Math.round(zoom * 1280)}px`,
              }}
              className="transition-all duration-150"
            >
              <img
                src={lightboxItem.imageUrl}
                alt={lightboxItem.title}
                className="w-full h-auto rounded-xl border border-white/10 shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
