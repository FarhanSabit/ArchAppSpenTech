import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Box,
  Brain,
  Check,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  Radar,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AGENTIC_VERTICALS,
  BLUEPRINT_PILLARS,
  HITL_SAMPLE_EVENTS,
  SPENTA_APPS,
} from '../data/spentaManifest';
import { useStack } from '../store/StackContext';
import { SovereignBrain3D } from './three/SovereignBrain3D';

interface GroundedBriefState {
  text: string;
  sources: { title: string; uri: string }[];
  query: string;
}

interface RadarNodeSpec {
  appId: string;
  code: string;
  quadrant: 'Healthcare & Bio' | 'Banking & Fintech' | 'Enterprise & Data' | 'XR, Voice & Edge';
  ring: 'CORE' | 'PRODUCTION' | 'PILOT';
  angleDeg: number;
  radius: number;
}

const RADAR_NODES: RadarNodeSpec[] = [
  // Top-Left (180..270): Healthcare & Bio / Security
  { appId: 'healthcare_erp', code: 'HC', quadrant: 'Healthcare & Bio', ring: 'CORE', angleDeg: 215, radius: 74 },
  { appId: 'cyber_sla', code: 'SEC', quadrant: 'Healthcare & Bio', ring: 'CORE', angleDeg: 248, radius: 66 },
  { appId: 'datasets', code: 'DATA', quadrant: 'Healthcare & Bio', ring: 'PRODUCTION', angleDeg: 202, radius: 138 },

  // Top-Right (270..360): Banking & Fintech
  { appId: 'icr_ops', code: 'ICR', quadrant: 'Banking & Fintech', ring: 'CORE', angleDeg: 300, radius: 72 },
  { appId: 'fintech_rails', code: 'MFS', quadrant: 'Banking & Fintech', ring: 'PRODUCTION', angleDeg: 332, radius: 132 },
  { appId: 'workflow_ai', code: 'AGT', quadrant: 'Banking & Fintech', ring: 'PRODUCTION', angleDeg: 286, radius: 146 },

  // Bottom-Left (90..180): Enterprise & Data
  { appId: 'mis_erp', code: 'MIS', quadrant: 'Enterprise & Data', ring: 'CORE', angleDeg: 142, radius: 76 },
  { appId: 'genai_bi', code: 'BI', quadrant: 'Enterprise & Data', ring: 'PRODUCTION', angleDeg: 118, radius: 136 },
  { appId: 'legacy_mod', code: 'MOD', quadrant: 'Enterprise & Data', ring: 'PILOT', angleDeg: 162, radius: 194 },

  // Bottom-Right (0..90): XR, Voice & Edge
  { appId: 'spatial_xr', code: 'XR', quadrant: 'XR, Voice & Edge', ring: 'CORE', angleDeg: 38, radius: 78 },
  { appId: 'voice_ai', code: 'VOX', quadrant: 'XR, Voice & Edge', ring: 'PRODUCTION', angleDeg: 64, radius: 142 },
  { appId: 'iot_edge', code: 'IOT', quadrant: 'XR, Voice & Edge', ring: 'PRODUCTION', angleDeg: 20, radius: 146 },
  { appId: 'branding_geo', code: 'GEO', quadrant: 'XR, Voice & Edge', ring: 'PILOT', angleDeg: 52, radius: 198 },
];

const GROUNDING_PRESETS = [
  'Latest 2026 enterprise on-prem LLM server hardware pricing vs cloud GPU APIs',
  'Current global healthcare AI clinical ERP & HL7 FHIR adoption benchmarks 2026',
  'Bangladesh Bank ICT security & financial data residency compliance expectations',
];

export function TheBrainView() {
  const {
    theme,
    hitlConfidence,
    setHitlConfidence,
    selectedIds,
    toggleApp,
    appMap,
    pendingNavFocus,
    clearPendingNavFocus,
    setAiAssistantOpen,
  } = useStack();

  const [visualMode, setVisualMode] = useState<'radar' | '3d'>('radar');
  const [selectedHubId, setSelectedHubId] = useState<string | null>('fintech');
  const [focusedAppId, setFocusedAppId] = useState<string>('icr_ops');
  const [hoveredRadarId, setHoveredRadarId] = useState<string | null>(null);
  const [blueprintTab, setBlueprintTab] = useState<'pillars' | 'verticals'>('pillars');
  const [blueprintQuery, setBlueprintQuery] = useState('');
  const [groundQuery, setGroundQuery] = useState('');
  const [groundLoading, setGroundLoading] = useState(false);
  const [groundError, setGroundError] = useState<string | null>(null);
  const [groundResult, setGroundResult] = useState<GroundedBriefState | null>(null);

  useEffect(() => {
    if (pendingNavFocus?.type === 'blueprint') {
      const q = pendingNavFocus.id;
      const isVert = AGENTIC_VERTICALS.some((v) => v.name === q);
      setBlueprintTab(isVert ? 'verticals' : 'pillars');
      setBlueprintQuery(q);
      clearPendingNavFocus();
    }
  }, [pendingNavFocus, clearPendingNavFocus]);

  const runLiveGrounding = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? groundQuery).trim();
    if (!q || groundLoading) return;
    setGroundQuery(q);
    setGroundLoading(true);
    setGroundError(null);
    try {
      const res = await fetch('/api/gemini/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
      setGroundResult({
        query: q,
        text: data.text,
        sources: Array.isArray(data.sources) ? data.sources : [],
      });
    } catch (err) {
      setGroundError(err instanceof Error ? err.message : 'Unable to run Search Grounding.');
    } finally {
      setGroundLoading(false);
    }
  };

  const passGate = hitlConfidence >= 0.88;
  const inspectedApp = appMap[hoveredRadarId ?? focusedAppId] ?? SPENTA_APPS[0];
  const inspectedInStack = selectedIds.includes(inspectedApp.id);

  const simulatedEvents = useMemo(() => {
    const delta = hitlConfidence - 0.88;
    return HITL_SAMPLE_EVENTS.map((evt) => {
      const score = Math.max(
        0.5,
        Math.min(0.99, Number((evt.baseConfidence + delta * 0.45).toFixed(2))),
      );
      return {
        ...evt,
        liveScore: score,
        autoApproved: score >= 0.88,
      };
    });
  }, [hitlConfidence]);

  const filteredPillars = useMemo(() => {
    const q = blueprintQuery.trim().toLowerCase();
    if (!q) return BLUEPRINT_PILLARS;
    return BLUEPRINT_PILLARS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.metrics.some((m) => m.toLowerCase().includes(q)),
    );
  }, [blueprintQuery]);

  const filteredVerticals = useMemo(() => {
    const q = blueprintQuery.trim().toLowerCase();
    if (!q) return AGENTIC_VERTICALS;
    return AGENTIC_VERTICALS.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.think.toLowerCase().includes(q) ||
        v.learn.toLowerCase().includes(q) ||
        v.solve.toLowerCase().includes(q) ||
        v.proof.toLowerCase().includes(q),
    );
  }, [blueprintQuery]);

  const isDark = theme === 'dark';

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
            SPENTA INTELLIGENCE CORE · OPERATIONAL TECH RADAR + 3D NEURAL CORE
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight mt-1">
            The Brain — Sovereign Tech Radar &amp; 0.88 HITL Gate Simulator
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-3xl">
            Inspect module maturity across CORE, PRODUCTION, and PILOT rings synced with your composed stack, launch the Three.js 3D Neural Core, and test live OPA 0.88 confidence gating.
          </p>
        </div>

        {/* Radar vs 3D Segmented Toggle */}
        <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-[#18181B] p-1 border border-zinc-200 dark:border-white/[0.08] self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setVisualMode('radar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              visualMode === 'radar'
                ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
            }`}
          >
            <Radar className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Operational Tech Radar</span>
          </button>
          <button
            type="button"
            onClick={() => setVisualMode('3d')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              visualMode === '3d'
                ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
            }`}
          >
            <Box className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>3D Neural Core</span>
          </button>
        </div>
      </section>

      {/* Split-Panel Hero: Left Radar / 3D Core | Right Profile + 0.88 HITL Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Panel (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-4 sm:p-5 flex flex-col justify-between">
          {visualMode === 'radar' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-white/[0.08]">
                <div>
                  <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                    Interactive Operational Tech Radar (13 Modules)
                  </h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Click any node to inspect its architecture profile · Emerald nodes are active in your stack
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active ({selectedIds.length})
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" /> Available
                  </span>
                </div>
              </div>

              <div className="w-full max-w-[520px] mx-auto aspect-square my-2 flex items-center justify-center">
                <svg
                  viewBox="0 0 520 520"
                  className="w-full h-full select-none"
                  role="img"
                  aria-label="Spenta Operational Tech Radar"
                >
                  {/* Concentric Rings */}
                  {[220, 158, 96].map((r, i) => (
                    <circle
                      key={r}
                      cx="260"
                      cy="260"
                      r={r}
                      fill={
                        i === 2
                          ? isDark
                            ? 'rgba(16,185,129,0.06)'
                            : 'rgba(16,185,129,0.08)'
                          : 'none'
                      }
                      stroke={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(24,24,27,0.12)'}
                      strokeWidth="1"
                      strokeDasharray={i === 0 ? '4 4' : undefined}
                    />
                  ))}

                  {/* Crosshair Axes */}
                  <line
                    x1="260"
                    y1="26"
                    x2="260"
                    y2="494"
                    stroke={isDark ? 'rgba(255,255,255,0.09)' : 'rgba(24,24,27,0.1)'}
                    strokeWidth="1"
                  />
                  <line
                    x1="26"
                    y1="260"
                    x2="494"
                    y2="260"
                    stroke={isDark ? 'rgba(255,255,255,0.09)' : 'rgba(24,24,27,0.1)'}
                    strokeWidth="1"
                  />

                  {/* Ring Labels */}
                  <text
                    x="266"
                    y="174"
                    fill={isDark ? '#10B981' : '#065F46'}
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    CORE
                  </text>
                  <text
                    x="266"
                    y="112"
                    fill={isDark ? '#A1A1AA' : '#52525B'}
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    PRODUCTION
                  </text>
                  <text
                    x="266"
                    y="50"
                    fill={isDark ? '#71717A' : '#71717A'}
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    PILOT
                  </text>

                  {/* Quadrant Headers */}
                  <text x="34" y="34" fill={isDark ? '#A1A1AA' : '#52525B'} fontSize="9.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    HEALTHCARE &amp; SECURITY
                  </text>
                  <text x="486" y="34" textAnchor="end" fill={isDark ? '#A1A1AA' : '#52525B'} fontSize="9.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    BANKING &amp; FINTECH
                  </text>
                  <text x="34" y="498" fill={isDark ? '#A1A1AA' : '#52525B'} fontSize="9.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    ENTERPRISE &amp; BI
                  </text>
                  <text x="486" y="498" textAnchor="end" fill={isDark ? '#A1A1AA' : '#52525B'} fontSize="9.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    XR, VOICE &amp; EDGE
                  </text>

                  {/* Active Synergy Spokes to Center */}
                  {RADAR_NODES.map((node) => {
                    const rad = (node.angleDeg * Math.PI) / 180;
                    const cx = 260 + Math.cos(rad) * node.radius;
                    const cy = 260 + Math.sin(rad) * node.radius;
                    const isSelected = selectedIds.includes(node.appId);
                    const isFocused = inspectedApp.id === node.appId;
                    if (!isSelected && !isFocused) return null;
                    return (
                      <line
                        key={`spoke-${node.appId}`}
                        x1="260"
                        y1="260"
                        x2={cx}
                        y2={cy}
                        stroke={isFocused ? '#10B981' : 'rgba(16,185,129,0.35)'}
                        strokeWidth={isFocused ? 1.8 : 1.1}
                      />
                    );
                  })}

                  {/* Center Kernel */}
                  <circle
                    cx="260"
                    cy="260"
                    r="28"
                    fill={isDark ? '#09090B' : '#09090B'}
                    stroke="#10B981"
                    strokeWidth="1.8"
                  />
                  <text
                    x="260"
                    y="258"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="8.5"
                    fontWeight="800"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    SPENTA
                  </text>
                  <text
                    x="260"
                    y="270"
                    textAnchor="middle"
                    fill="#34D399"
                    fontSize="7.5"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    L1–L6
                  </text>

                  {/* Clickable Radar Nodes */}
                  {RADAR_NODES.map((node) => {
                    const rad = (node.angleDeg * Math.PI) / 180;
                    const cx = 260 + Math.cos(rad) * node.radius;
                    const cy = 260 + Math.sin(rad) * node.radius;
                    const isSelected = selectedIds.includes(node.appId);
                    const isFocused = inspectedApp.id === node.appId;
                    const isSynergy = inspectedApp.integratesWith.includes(node.appId);

                    return (
                      <g
                        key={node.appId}
                        onClick={() => setFocusedAppId(node.appId)}
                        onMouseEnter={() => setHoveredRadarId(node.appId)}
                        onMouseLeave={() => setHoveredRadarId(null)}
                        className="cursor-pointer"
                      >
                        {isFocused && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r="20"
                            fill="none"
                            stroke="#10B981"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                          />
                        )}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isFocused ? 15 : 13}
                          fill={
                            isSelected
                              ? '#10B981'
                              : isSynergy
                                ? '#F59E0B'
                                : isDark
                                  ? '#18181B'
                                  : '#F4F4F5'
                          }
                          stroke={
                            isSelected
                              ? '#34D399'
                              : isSynergy
                                ? '#F59E0B'
                                : isDark
                                  ? 'rgba(255,255,255,0.22)'
                                  : '#A1A1AA'
                          }
                          strokeWidth="1.5"
                        />
                        <text
                          x={cx}
                          y={cy + 3.2}
                          textAnchor="middle"
                          fill={
                            isSelected || isSynergy
                              ? '#09090B'
                              : isDark
                                ? '#E4E4E7'
                                : '#18181B'
                          }
                          fontSize="8.5"
                          fontWeight="800"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {node.code}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Compact Radar Module Strip */}
              <div className="pt-3 border-t border-zinc-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                <span>
                  Focused: <strong className="text-zinc-900 dark:text-zinc-100">{inspectedApp.shortName}</strong> ({inspectedApp.layers.join('/')})
                </span>
                <span>Proof: {inspectedApp.proofClient}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 min-h-[460px] rounded-xl overflow-hidden bg-[#09090B] border border-white/[0.08]">
              <SovereignBrain3D
                compact
                selectedHubId={selectedHubId}
                onSelectHub={(id) => setSelectedHubId(id)}
              />
            </div>
          )}
        </div>

        {/* Right Panel (5 cols): Architecture Profile + Live 0.88 HITL Gate Inspector */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Inspected Module Architecture Profile */}
          <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                  ARCHITECTURE PROFILE · {inspectedApp.engine} ENGINE
                </div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50 mt-0.5 leading-snug">
                  {inspectedApp.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => toggleApp(inspectedApp.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                  inspectedInStack
                    ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                    : 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-90'
                }`}
              >
                {inspectedInStack ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>In Stack</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {inspectedApp.tagline}
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1 font-mono tabular-nums">
              <div className="rounded-lg bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-2.5">
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Build Scope</div>
                <div className="text-xs font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">
                  ${(inspectedApp.setupUsd / 1000).toFixed(1)}K
                </div>
              </div>
              <div className="rounded-lg bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-2.5">
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Conservative GM</div>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {inspectedApp.gmPct.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-2.5">
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Hardware Min</div>
                <div className="text-xs font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">
                  Tier {inspectedApp.minServerTier}
                </div>
              </div>
            </div>
          </div>

          {/* Live 0.88 Confidence HITL Gate Simulator */}
          <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5 flex-1 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <Sliders className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>0.88 HITL Gate Simulator</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">OPA Policy-as-Code</span>
              </div>

              <div className="mt-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08]">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Simulated Confidence
                  </span>
                  <span
                    className={`font-mono text-2xl sm:text-3xl font-extrabold tabular-nums ${
                      passGate
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {hitlConfidence.toFixed(2)}
                  </span>
                </div>

                <div className="mt-2.5">
                  <input
                    type="range"
                    min={0.5}
                    max={0.99}
                    step={0.01}
                    value={hitlConfidence}
                    onChange={(e) => setHitlConfidence(Number(e.target.value))}
                    aria-label="Simulated inference confidence score"
                    className="w-full spenta-slider"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-1.5">
                    <span>0.50 Escalate</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">0.88 Gate</span>
                    <span>0.99 Auto-Commit</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    { label: '0.94 BankOCR', val: 0.94 },
                    { label: '0.88 Boundary', val: 0.88 },
                    { label: '0.81 Rx Smudge', val: 0.81 },
                    { label: '0.67 Ambiguous', val: 0.67 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setHitlConfidence(preset.val)}
                      className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors cursor-pointer ${
                        Math.abs(hitlConfidence - preset.val) < 0.005
                          ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-emerald-500 dark:text-zinc-950 dark:border-emerald-500'
                          : 'bg-white dark:bg-[#111315] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/[0.1] hover:border-emerald-500/40'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Decision Banner */}
              <div
                className={`mt-3 rounded-xl p-3.5 border ${
                  passGate
                    ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {passGate ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                  )}
                  <div>
                    <div className="font-mono text-[11px] font-bold uppercase tracking-wide">
                      {passGate
                        ? 'PASS (>= 0.88) · AUTO-COMMIT TO LEDGER'
                        : 'HOLD (< 0.88) · ROUTE TO HUMAN AUDIT QUEUE'}
                    </div>
                    <p className="text-[11px] mt-1 leading-relaxed opacity-90">
                      {passGate
                        ? 'OPA verifies schema integrity and signs directly into PostgreSQL/Kafka core with immutable model hash.'
                        : 'Automated ledger write blocked. Opens in React Digital Twin verifier with highlighted low-confidence bounding boxes.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Policy Stream */}
              <div className="mt-3 space-y-1.5 max-h-[195px] overflow-y-auto pr-1">
                {simulatedEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {evt.clientPattern}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold tabular-nums shrink-0 ${
                          evt.autoApproved
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {evt.autoApproved ? (
                          <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
                        ) : (
                          <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />
                        )}
                        {evt.liveScore.toFixed(2)} · {evt.autoApproved ? 'COMMIT' : 'HITL'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 truncate">
                      {evt.documentType}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-500 mt-0.5">
                      {evt.policyRule} · {evt.latencyMs}ms
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Google Search Grounded Intelligence Panel */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Live Web Market Intelligence · Google Search Grounding</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">
              Verify Market Benchmarks, Hardware Pricing &amp; Compliance in Real Time
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setAiAssistantOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 dark:bg-emerald-500 text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer self-start md:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Open Multi-Turn AI Advisor</span>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runLiveGrounding();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={groundQuery}
            onChange={(e) => setGroundQuery(e.target.value)}
            placeholder="Ask for up-to-date AI hardware pricing, regulatory updates, or healthcare ERP trends..."
            className="flex-1 px-3.5 py-2 text-xs bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.1] rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={groundLoading || !groundQuery.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white dark:text-zinc-950 text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            {groundLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
            <span>{groundLoading ? 'Searching Web…' : 'Run Grounded Brief'}</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {GROUNDING_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => runLiveGrounding(preset)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-[#18181B] hover:border-emerald-500/40 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/[0.08] font-medium transition-colors cursor-pointer text-left"
            >
              {preset}
            </button>
          ))}
        </div>

        {groundError && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300">
            {groundError}
          </div>
        )}

        {groundResult && (
          <div className="rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-emerald-500/30 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
              <span className="font-bold truncate">QUERY: {groundResult.query}</span>
              <span className="shrink-0 text-zinc-500 dark:text-zinc-400">Google Search Grounded</span>
            </div>
            <div className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {groundResult.text}
            </div>
            {groundResult.sources.length > 0 && (
              <div className="pt-2 border-t border-zinc-200 dark:border-white/[0.08] flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 mr-1">
                  Sources:
                </span>
                {groundResult.sources.slice(0, 6).map((src) => (
                  <a
                    key={src.uri}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono bg-white dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.1] text-emerald-700 dark:text-emerald-400 hover:border-emerald-500 px-2 py-0.5 rounded"
                  >
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    <span className="max-w-[200px] truncate">{src.title}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Consolidated Master Blueprint Explorer */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-white/[0.08]">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <Brain className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Consolidated Master Blueprint Explorer</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">
              6 Capability Pillars &amp; 8-Vertical Agentic Core (Think · Learn · Solve)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
              <input
                type="text"
                value={blueprintQuery}
                onChange={(e) => setBlueprintQuery(e.target.value)}
                placeholder="Query capabilities, SLAs, verticals..."
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.1] rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
              />
              {blueprintQuery && (
                <button
                  type="button"
                  onClick={() => setBlueprintQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                  aria-label="Clear blueprint search"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              )}
            </div>

            <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-[#18181B] p-1 border border-zinc-200 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setBlueprintTab('pillars')}
                className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                  blueprintTab === 'pillars'
                    ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                6 Capability Pillars
              </button>
              <button
                type="button"
                onClick={() => setBlueprintTab('verticals')}
                className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                  blueprintTab === 'verticals'
                    ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                8 Agentic Verticals
              </button>
            </div>
          </div>
        </div>

        {blueprintTab === 'pillars' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
            {filteredPillars.map((pillar) => (
              <article
                key={pillar.id}
                className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#0C0E10] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{pillar.code}</span>
                    <span className="uppercase text-zinc-500 dark:text-zinc-400">{pillar.engine} engine</span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-zinc-950 dark:text-zinc-50 mt-1">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mt-1.5">
                    {pillar.summary}
                  </p>
                  <div className="mt-3 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                    {pillar.metrics.join(' · ')}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-white/[0.08] flex flex-wrap gap-1.5">
                  {pillar.apps.map((appId) => {
                    const app = appMap[appId];
                    if (!app) return null;
                    const active = selectedIds.includes(appId);
                    return (
                      <button
                        key={appId}
                        type="button"
                        onClick={() => toggleApp(appId)}
                        className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors cursor-pointer ${
                          active
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/50'
                            : 'bg-white dark:bg-[#111315] text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-white/[0.1] hover:border-emerald-500/40'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {app.shortName}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            {filteredVerticals.map((v) => (
              <article
                key={v.id}
                className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#0C0E10] p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">{v.name}</h3>
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                    {v.proof}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white dark:bg-[#111315] rounded-lg p-2.5 border border-zinc-200 dark:border-white/[0.08]">
                    <div className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                      1. Think
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300 mt-1 leading-snug">{v.think}</p>
                  </div>
                  <div className="bg-white dark:bg-[#111315] rounded-lg p-2.5 border border-zinc-200 dark:border-white/[0.08]">
                    <div className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                      2. Learn
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300 mt-1 leading-snug">{v.learn}</p>
                  </div>
                  <div className="bg-white dark:bg-[#111315] rounded-lg p-2.5 border border-zinc-200 dark:border-white/[0.08]">
                    <div className="text-[10px] font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                      3. Solve
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300 mt-1 leading-snug">{v.solve}</p>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                  HITL Trigger: {v.hitlTrigger}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
