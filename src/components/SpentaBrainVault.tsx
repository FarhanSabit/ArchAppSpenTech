import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Box,
  Check,
  Cpu,
  Database,
  Grid2x2,
  Landmark,
  Layers,
  Mic,
  Network,
  Plus,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import {
  APP_CATEGORIES,
  BRAIN_HUBS,
  DeploymentMode,
  EngineType,
  SERVER_TIERS,
  SOVEREIGN_STACK_LAYERS,
  SPENTA_APPS,
  SpentaApp,
  STARTER_RECIPES,
} from '../data/spentaManifest';
import { useStack } from '../store/StackContext';
import { SovereignBrain3D } from './three/SovereignBrain3D';

type VaultViewMode = 'matrix' | 'grid' | 'brain3d';

const GOVERNANCE_MARQUEE_ITEMS = [
  'ZERO CLOUD PII EXFILTRATION',
  '0.88 CONFIDENCE HITL GATE',
  '<50MS QUANTIZED EDGE INFERENCE',
  'AMD SEV-SNP & INTEL TDX TEE ENCLAVES',
  '13 COMPOSABLE SOVEREIGN MODULES',
  'DUAL-SHORE: SAN JOSE · AUSTRALIA · DHAKA ($11.50/HR)',
  'HIPAA · SOC 2 · ISO 27001 · BB ICT V4.0',
  'SELF-HOSTED LLAMA 3.2 VISION · LAYOUTLMV3 · WHISPER',
];

function HubIcon({ hubId }: { hubId: string }) {
  const cls = 'w-4 h-4 shrink-0';
  switch (hubId) {
    case 'healthcare':
      return <Stethoscope className={cls} strokeWidth={1.5} />;
    case 'fintech':
      return <Landmark className={cls} strokeWidth={1.5} />;
    case 'enterprise':
      return <Database className={cls} strokeWidth={1.5} />;
    case 'infra':
      return <Shield className={cls} strokeWidth={1.5} />;
    case 'xr':
      return <Box className={cls} strokeWidth={1.5} />;
    case 'voice':
      return <Mic className={cls} strokeWidth={1.5} />;
    case 'retail':
      return <ShoppingBag className={cls} strokeWidth={1.5} />;
    case 'energy':
      return <Activity className={cls} strokeWidth={1.5} />;
    default:
      return <Workflow className={cls} strokeWidth={1.5} />;
  }
}

function EvidenceLabel({ app }: { app: SpentaApp }) {
  const isProd =
    app.proofClient.includes('Prime Bank') ||
    app.proofClient.includes('Samsung') ||
    app.proofClient.includes('BEST') ||
    app.proofClient.includes('Jotax') ||
    app.proofClient.includes('ISHO') ||
    app.proofClient.includes('X Ltd') ||
    app.proofClient.includes('bKash');
  return (
    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
      {isProd ? 'Verified Production' : 'Validated Deployment'}
    </span>
  );
}

export function SpentaBrainVault() {
  const {
    selectedIds,
    selectedApps,
    appMap,
    toggleApp,
    applyRecipe,
    clearStack,
    autoNotice,
    setAutoNotice,
    stackMetrics,
    setDrawerOpen,
    pendingNavFocus,
    clearPendingNavFocus,
  } = useStack();

  const [viewMode, setViewMode] = useState<VaultViewMode>('matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [engineFilter, setEngineFilter] = useState<'all' | EngineType>('all');
  const [deployFilter, setDeployFilter] = useState<'all' | DeploymentMode>('all');
  const [hoveredAppId, setHoveredAppId] = useState<string | null>(null);
  const [selectedHubId3D, setSelectedHubId3D] = useState<string | null>('fintech');

  useEffect(() => {
    if (pendingNavFocus?.type === 'app') {
      const target = appMap[pendingNavFocus.id];
      if (target) {
        setViewMode('grid');
        setEngineFilter('all');
        setDeployFilter('all');
        setSearchQuery(target.shortName);
      }
      clearPendingNavFocus();
    }
  }, [pendingNavFocus, appMap, clearPendingNavFocus]);

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SPENTA_APPS.filter((app) => {
      if (engineFilter !== 'all' && app.engine !== engineFilter) return false;
      if (deployFilter !== 'all' && !app.deployment.includes(deployFilter)) return false;
      if (!q) return true;
      return (
        app.name.toLowerCase().includes(q) ||
        app.shortName.toLowerCase().includes(q) ||
        app.tagline.toLowerCase().includes(q) ||
        app.proofClient.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, engineFilter, deployFilter]);

  const filteredIdSet = useMemo(() => new Set(filteredApps.map((a) => a.id)), [filteredApps]);

  const groupedByCategory = useMemo(() => {
    return APP_CATEGORIES.map((category) => ({
      category,
      apps: filteredApps.filter((a) => a.category === category),
    })).filter((g) => g.apps.length > 0);
  }, [filteredApps]);

  const leftHubs = useMemo(() => BRAIN_HUBS.filter((h) => h.side === 'left'), []);
  const rightHubs = useMemo(() => BRAIN_HUBS.filter((h) => h.side === 'right'), []);

  const hoveredApp = hoveredAppId ? appMap[hoveredAppId] : null;
  const activeLayersDisplay = hoveredApp
    ? new Set<string>(hoveredApp.layers)
    : stackMetrics.activeLayers;

  const tierSpec = SERVER_TIERS[stackMetrics.tier];

  return (
    <div className="space-y-5">
      {/* Compact Swiss Obsidian-Grid Workspace Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] bg-obsidian-grid">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                <span>SPENTA COMPOSABLE APP VAULT</span>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <span className="text-zinc-500 dark:text-zinc-400">13 SOVEREIGN MODULES</span>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <span className="text-zinc-500 dark:text-zinc-400">L1–L6 CORE KERNEL</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight mt-1.5 leading-tight">
                Compose Verified Sovereign AI, ERP, Fintech &amp; Spatial XR Stacks
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2 max-w-2xl leading-relaxed">
                Select modules across Operations and Experience hemispheres to verify native integrations, illuminate active L1–L6 layers, and size your air-gapped server baseline in real time.
              </p>
            </div>

            {/* 3-Way View Mode Switcher */}
            <div className="inline-flex flex-wrap rounded-xl bg-zinc-100 dark:bg-[#18181B] p-1 border border-zinc-200 dark:border-white/[0.08] self-start xl:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                }`}
              >
                <Network className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Architecture Matrix</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                }`}
              >
                <Grid2x2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Catalog Grid (13)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('brain3d')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'brain3d'
                    ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                }`}
              >
                <Box className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>3D Neural Core</span>
              </button>
            </div>
          </div>

          {/* Filter Bar & 1-Click Starter Recipes */}
          <div className="mt-5 pt-4 border-t border-zinc-200/80 dark:border-white/[0.08] flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] sm:flex-initial sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter apps, proofs, specs..."
                  className="w-full pl-8 pr-8 py-1.5 text-xs bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.1] rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                    aria-label="Clear filter"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                )}
              </div>

              <div className="inline-flex flex-wrap rounded-lg bg-zinc-100 dark:bg-[#09090B] p-0.5 border border-zinc-200 dark:border-white/[0.08]">
                {(['all', 'operations', 'experience', 'fusion'] as const).map((eng) => (
                  <button
                    key={eng}
                    type="button"
                    onClick={() => setEngineFilter(eng)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-colors cursor-pointer ${
                      engineFilter === eng
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {eng === 'all' ? 'All Engines' : eng}
                  </button>
                ))}
              </div>

              <div className="inline-flex flex-wrap rounded-lg bg-zinc-100 dark:bg-[#09090B] p-0.5 border border-zinc-200 dark:border-white/[0.08]">
                {(['all', 'On-Prem', 'Private VPC', 'SaaS'] as const).map((dep) => (
                  <button
                    key={dep}
                    type="button"
                    onClick={() => setDeployFilter(dep)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      deployFilter === dep
                        ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {dep === 'all' ? 'Any Deploy' : dep}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mr-1">
                <Sparkles className="w-3 h-3 text-emerald-500" strokeWidth={1.5} />
                Recipes:
              </span>
              {STARTER_RECIPES.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => applyRecipe(recipe.id)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold transition-colors cursor-pointer"
                  title={recipe.description}
                >
                  {recipe.name}
                </button>
              ))}
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearStack}
                  className="text-[11px] px-2 py-1 text-zinc-500 dark:text-zinc-400 hover:text-[#E11D48] font-medium cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Governance & Engineering Marquee Ticker */}
        <div className="border-t border-zinc-200 dark:border-white/[0.08] bg-zinc-50/90 dark:bg-[#09090B]/90 overflow-hidden py-2">
          <div className="animate-spenta-marquee flex items-center gap-8 text-[10px] font-mono tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {[...GOVERNANCE_MARQUEE_ITEMS, ...GOVERNANCE_MARQUEE_ITEMS].map((item, idx) => (
              <span key={`${item}-${idx}`} className="inline-flex items-center gap-3 shrink-0">
                <span className="w-1 h-1 rounded-full bg-emerald-500/80" />
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Auto-Dependency Toast Banner */}
      {autoNotice && (
        <div className="px-4 py-2.5 rounded-xl bg-zinc-950 dark:bg-[#111315] text-emerald-200 border border-emerald-500/35 text-xs font-mono flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.5} />
            <span>{autoNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setAutoNotice(null)}
            className="text-emerald-400 hover:text-white cursor-pointer"
            aria-label="Dismiss notice"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Live Compact Stack Summary Strip */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-zinc-700 dark:text-zinc-300 tabular-nums">
          <span>
            <strong className="text-emerald-700 dark:text-emerald-400">{selectedApps.length}</strong> / 13 Modules
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>
            Build Scope: <strong className="text-zinc-950 dark:text-zinc-50">${(stackMetrics.totalSetupUsd / 1000).toFixed(1)}K</strong>
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>
            Blended GM: <strong className="text-emerald-700 dark:text-emerald-400">{stackMetrics.blendedGmPct.toFixed(1)}%</strong>
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
            <strong className="text-zinc-950 dark:text-zinc-50">{tierSpec.code}</strong>
            <span className="text-zinc-500 dark:text-zinc-400">({tierSpec.capex})</span>
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>
            <strong className="text-zinc-950 dark:text-zinc-50">{stackMetrics.synergyPairs.length}</strong> Verified Synergies
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#E11D48] hover:text-[#BE123C] cursor-pointer"
        >
          <span>Inspect &amp; Export Stack</span>
          <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {/* VIEW 1: STRICTLY ORTHOGONAL RESPONSIVE BENTO ARCHITECTURE MATRIX */}
      {viewMode === 'matrix' && (
        <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-white/[0.08]">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-zinc-50">
                Spenta Sovereign AI Brain — Orthogonal Architecture Matrix
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Left: Operations Engine (Hubs 01–04) · Center: Live L1–L6 Core Processor · Right: Experience &amp; IR4 Engine (Hubs 05–08)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> In Stack
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Native Synergy
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" /> Available
              </span>
            </div>
          </div>

          {/* Responsive 3-Column Bento Architecture Matrix (Zero Horizontal Clipping) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* LEFT HEMISPHERE: OPERATIONS ENGINE (HUBS 01-04) */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between px-1 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                <span>Operations Engine</span>
                <span>Hubs 01–04</span>
              </div>
              {leftHubs.map((hub) => {
                const hubApps = SPENTA_APPS.filter((a) => a.hubId === hub.id);
                const selectedInHub = hubApps.filter((a) => selectedIds.includes(a.id)).length;
                return (
                  <div
                    key={hub.id}
                    className={`rounded-xl border p-3 transition-colors ${
                      selectedInHub > 0
                        ? 'border-emerald-500/35 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.04]'
                        : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#0C0E10]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          <HubIcon hubId={hub.id} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                            HUB {hub.num} · {hub.keyLayers.join('/')}
                          </div>
                          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {hub.label}
                          </h3>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">
                        {selectedInHub}/{hubApps.length}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {hubApps.map((app) => {
                        const isSelected = selectedIds.includes(app.id);
                        const isSynergy = Boolean(
                          hoveredApp && hoveredApp.id !== app.id && hoveredApp.integratesWith.includes(app.id),
                        );
                        const isDimmed = !filteredIdSet.has(app.id);
                        return (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => toggleApp(app.id)}
                            onMouseEnter={() => setHoveredAppId(app.id)}
                            onMouseLeave={() => setHoveredAppId(null)}
                            className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isDimmed ? 'opacity-35' : 'opacity-100'
                            } ${
                              isSelected
                                ? 'bg-zinc-950 text-white border-emerald-500/60 dark:bg-[#181B1E] dark:border-emerald-500/60'
                                : isSynergy
                                  ? 'bg-amber-500/10 border-amber-500/60 text-zinc-900 dark:text-zinc-100'
                                  : 'bg-white dark:bg-[#111315] border-zinc-200 dark:border-white/[0.08] hover:border-emerald-500/40 text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{app.shortName}</div>
                              <div
                                className={`text-[10px] font-mono tabular-nums mt-0.5 ${
                                  isSelected
                                    ? 'text-emerald-300'
                                    : 'text-zinc-500 dark:text-zinc-400'
                                }`}
                              >
                                ${(app.setupUsd / 1000).toFixed(1)}K · {app.gmPct.toFixed(1)}% GM · T{app.minServerTier}
                              </div>
                            </div>
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-500 text-zinc-950'
                                  : 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400'
                              }`}
                            >
                              {isSelected ? (
                                <Check className="w-3 h-3 stroke-[2.5]" />
                              ) : (
                                <Plus className="w-3 h-3" strokeWidth={1.75} />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CENTER COLUMN: SPENTA CORE L1-L6 LIVE PROCESSOR */}
            <div className="lg:col-span-4 flex flex-col">
              <div className="flex items-center justify-between px-1 mb-3 text-[10px] font-mono uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                <span>Sovereign Core Bus</span>
                <span>L1–L6 Live</span>
              </div>

              <div className="flex-1 rounded-xl border border-emerald-500/35 bg-zinc-950 dark:bg-[#09090B] text-zinc-100 p-4 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-emerald-400">
                        SPENTA CORE KERNEL
                      </div>
                      <div className="text-base font-extrabold text-white mt-0.5">
                        {hoveredApp ? hoveredApp.shortName : 'Active Composed Stack'}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                      <Layers className="w-3 h-3" strokeWidth={1.5} />
                      {activeLayersDisplay.size}/6 Layers
                    </span>
                  </div>

                  {/* L6 -> L1 Live Illuminated Layer Stack */}
                  <div className="mt-3 space-y-2">
                    {SOVEREIGN_STACK_LAYERS.map((layer) => {
                      const isActive = activeLayersDisplay.has(layer.id);
                      const countOnLayer = selectedApps.filter((a) => a.layers.includes(layer.id)).length;
                      return (
                        <div
                          key={layer.id}
                          className={`rounded-lg border px-3 py-2 transition-all ${
                            isActive
                              ? 'bg-emerald-500/12 border-emerald-500/45 text-white'
                              : 'bg-[#111315] border-white/[0.06] text-zinc-500'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isActive
                                    ? 'bg-emerald-500 text-zinc-950'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {layer.id}
                              </span>
                              <span className="text-xs font-semibold truncate">{layer.title}</span>
                            </div>
                            <span className="font-mono text-[10px] tabular-nums shrink-0 text-zinc-400">
                              {countOnLayer > 0 ? `${countOnLayer} mod` : 'idle'}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400 mt-1 truncate">
                            {layer.subtitle}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Kernel Telemetry & Inspected Module Readout */}
                <div className="rounded-lg bg-[#111315] border border-white/[0.08] p-3 space-y-2">
                  {hoveredApp ? (
                    <>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                        Inspecting Module · {hoveredApp.engine} engine
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed">{hoveredApp.tagline}</p>
                      <div className="text-[10px] font-mono text-zinc-400">
                        Proof: {hoveredApp.proofClient} · Deploy: {hoveredApp.deployment.join(' / ')}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                        <span>OPA 0.88 HITL GATE ACTIVE</span>
                        <span>ZERO CLOUD EGRESS</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 font-mono tabular-nums">
                        <div className="rounded bg-[#09090B] border border-white/[0.06] p-2">
                          <div className="text-[10px] text-zinc-400">Target Server</div>
                          <div className="text-xs font-bold text-white mt-0.5">{tierSpec.code}</div>
                          <div className="text-[10px] text-emerald-400">{tierSpec.capex}</div>
                        </div>
                        <div className="rounded bg-[#09090B] border border-white/[0.06] p-2">
                          <div className="text-[10px] text-zinc-400">Stack Scope</div>
                          <div className="text-xs font-bold text-white mt-0.5">
                            ${(stackMetrics.totalSetupUsd / 1000).toFixed(1)}K
                          </div>
                          <div className="text-[10px] text-emerald-400">
                            {stackMetrics.blendedGmPct.toFixed(1)}% Blended GM
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug pt-0.5">
                        Hover any module to trace its L1–L6 bindings and native integrations; click to toggle in your stack.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT HEMISPHERE: EXPERIENCE & IR4 ENGINE (HUBS 05-08) */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between px-1 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                <span>Experience &amp; IR4 Engine</span>
                <span>Hubs 05–08</span>
              </div>
              {rightHubs.map((hub) => {
                const hubApps = SPENTA_APPS.filter((a) => a.hubId === hub.id);
                const selectedInHub = hubApps.filter((a) => selectedIds.includes(a.id)).length;
                return (
                  <div
                    key={hub.id}
                    className={`rounded-xl border p-3 transition-colors ${
                      selectedInHub > 0
                        ? 'border-emerald-500/35 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.04]'
                        : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#0C0E10]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          <HubIcon hubId={hub.id} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                            HUB {hub.num} · {hub.keyLayers.join('/')}
                          </div>
                          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {hub.label}
                          </h3>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">
                        {selectedInHub}/{hubApps.length}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {hubApps.map((app) => {
                        const isSelected = selectedIds.includes(app.id);
                        const isSynergy = Boolean(
                          hoveredApp && hoveredApp.id !== app.id && hoveredApp.integratesWith.includes(app.id),
                        );
                        const isDimmed = !filteredIdSet.has(app.id);
                        return (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => toggleApp(app.id)}
                            onMouseEnter={() => setHoveredAppId(app.id)}
                            onMouseLeave={() => setHoveredAppId(null)}
                            className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isDimmed ? 'opacity-35' : 'opacity-100'
                            } ${
                              isSelected
                                ? 'bg-zinc-950 text-white border-emerald-500/60 dark:bg-[#181B1E] dark:border-emerald-500/60'
                                : isSynergy
                                  ? 'bg-amber-500/10 border-amber-500/60 text-zinc-900 dark:text-zinc-100'
                                  : 'bg-white dark:bg-[#111315] border-zinc-200 dark:border-white/[0.08] hover:border-emerald-500/40 text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{app.shortName}</div>
                              <div
                                className={`text-[10px] font-mono tabular-nums mt-0.5 ${
                                  isSelected
                                    ? 'text-emerald-300'
                                    : 'text-zinc-500 dark:text-zinc-400'
                                }`}
                              >
                                ${(app.setupUsd / 1000).toFixed(1)}K · {app.gmPct.toFixed(1)}% GM · T{app.minServerTier}
                              </div>
                            </div>
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-500 text-zinc-950'
                                  : 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400'
                              }`}
                            >
                              {isSelected ? (
                                <Check className="w-3 h-3 stroke-[2.5]" />
                              ) : (
                                <Plus className="w-3 h-3" strokeWidth={1.75} />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* VIEW 2: ODOO-INSPIRED SWISS HAIRLINE CATALOG GRID (13) */}
      {viewMode === 'grid' && (
        <div className="space-y-7">
          {groupedByCategory.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-10 text-center">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                No Spenta modules match your current filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setEngineFilter('all');
                  setDeployFilter('all');
                }}
                className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            groupedByCategory.map(({ category, apps }) => (
              <section key={category}>
                <div className="flex items-center justify-between mb-3 px-0.5">
                  <h2 className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-400">
                    {category}
                  </h2>
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {apps.length} {apps.length === 1 ? 'module' : 'modules'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {apps.map((app) => {
                    const isSelected = selectedIds.includes(app.id);
                    const activeSynergies = app.integratesWith.filter((id) =>
                      selectedIds.includes(id),
                    );

                    return (
                      <article
                        key={app.id}
                        onClick={() => toggleApp(app.id)}
                        className={`rounded-xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-zinc-950 text-white border-emerald-500/70 dark:bg-[#161B19] dark:border-emerald-500/60'
                            : 'bg-white dark:bg-[#111315] text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-white/[0.08] hover:border-emerald-500/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider flex-wrap">
                              <span className={isSelected ? 'text-emerald-400 font-semibold' : 'text-emerald-700 dark:text-emerald-400 font-semibold'}>
                                {app.engine}
                              </span>
                              <span className={isSelected ? 'text-zinc-600' : 'text-zinc-300 dark:text-zinc-700'}>·</span>
                              <span className={isSelected ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-400'}>
                                {app.deployment.join(' / ')}
                              </span>
                            </div>

                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-emerald-500 text-zinc-950'
                                  : 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              {isSelected ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Plus className="w-4 h-4" strokeWidth={1.5} />}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
                            <HubIcon hubId={app.hubId} />
                            <EvidenceLabel app={app} />
                          </div>

                          <h3 className="font-bold text-base leading-snug">{app.name}</h3>
                          <p
                            className={`text-xs leading-relaxed mt-1.5 ${
                              isSelected ? 'text-zinc-300' : 'text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            {app.tagline}
                          </p>

                          <div
                            className={`mt-3 text-[11px] font-mono ${
                              isSelected ? 'text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'
                            }`}
                          >
                            Proof: <span className={isSelected ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}>{app.proofClient}</span>
                          </div>

                          {(app.depends.length > 0 || activeSynergies.length > 0) && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono">
                              {app.depends.map((dep) => (
                                <span
                                  key={dep}
                                  className={isSelected ? 'text-amber-300' : 'text-amber-700 dark:text-amber-400'}
                                >
                                  Requires {appMap[dep]?.shortName ?? dep}
                                </span>
                              ))}
                              {activeSynergies.length > 0 && (
                                <span className={isSelected ? 'text-emerald-300' : 'text-emerald-700 dark:text-emerald-400'}>
                                  {activeSynergies.length} active synergy link{activeSynergies.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div
                          className={`mt-4 pt-3 border-t flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums ${
                            isSelected
                              ? 'border-white/[0.1] text-emerald-300'
                              : 'border-zinc-200/80 dark:border-white/[0.08] text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          <span>{app.setupLabel}</span>
                          <span>{app.gmPct.toFixed(1)}% GM</span>
                          <span>T{app.minServerTier} · {app.layers.join('/')}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {/* VIEW 3: 3D SOVEREIGN NEURAL CORE */}
      {viewMode === 'brain3d' && (
        <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-[#09090B] p-3 sm:p-4">
          <div className="h-[460px] sm:h-[540px] w-full">
            <SovereignBrain3D
              selectedHubId={selectedHubId3D}
              onSelectHub={(hubId) => setSelectedHubId3D(hubId)}
            />
          </div>
        </section>
      )}
    </div>
  );
}
