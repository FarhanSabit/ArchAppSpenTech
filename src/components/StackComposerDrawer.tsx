import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Mail,
  Server,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { SERVER_TIERS } from '../data/spentaManifest';
import { DEPLOYMENT_PROFILES, DEPLOYMENT_TARGET_ORDER } from '../data/deploymentProfiles';
import { useStack } from '../store/StackContext';

export function StackComposerDrawer() {
  const {
    drawerOpen,
    setDrawerOpen,
    selectedApps,
    toggleApp,
    clearStack,
    stackMetrics,
    exportStackJson,
    buildExecutiveBrief,
    buildMailtoHref,
    setActiveTab,
    deploymentTarget,
    deploymentProfile,
    setDeploymentTarget,
  } = useStack();

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, setDrawerOpen]);

  if (!drawerOpen) return null;

  const tierSpec = SERVER_TIERS[stackMetrics.tier];

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(buildExecutiveBrief());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const handleOpenProposalForm = () => {
    setDrawerOpen(false);
    setActiveTab('Resources');
    window.setTimeout(() => {
      const formEl = document.getElementById('spenta-proposal-form');
      formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Stack Composer Drawer"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xs transition-opacity"
        onClick={() => setDrawerOpen(false)}
      />

      {/* Slide-over Panel */}
      <aside className="relative z-10 w-full sm:max-w-[420px] bg-white dark:bg-[#0C0E10] h-full shadow-2xl border-l border-zinc-200 dark:border-white/[0.1] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-zinc-950 dark:bg-[#09090B] text-white border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base tracking-tight">Stack Composer</h2>
              <span className="font-mono text-xs bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 px-2 py-0.5 rounded font-semibold tabular-nums">
                {selectedApps.length} / 13
              </span>
            </div>
            <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
              {deploymentProfile.shortLabel} · {deploymentProfile.latencyBudget} · 0.88 OPA Gate
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close Stack Composer"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Synced Infrastructure Target Configuration */}
          <div className="rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#111315] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
              <span className="font-bold uppercase tracking-wider">Infrastructure Target</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                {deploymentProfile.latencyBudget}
              </span>
            </div>
            <div
              role="group"
              aria-label="Stack Composer deployment target"
              className="grid grid-cols-3 gap-1"
            >
              {DEPLOYMENT_TARGET_ORDER.map((tid) => {
                const prof = DEPLOYMENT_PROFILES[tid];
                const active = deploymentTarget === tid;
                return (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => setDeploymentTarget(tid, 'Stack Composer')}
                    aria-pressed={active}
                    className={`px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                        : 'bg-white dark:bg-[#09090B] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.08] hover:border-emerald-500/40'
                    }`}
                  >
                    {prof.switcherLabel}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
              {deploymentProfile.enclaveBoundary}
            </div>
          </div>

          {/* Active Sovereign Layers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Activated Sovereign Core Layers
              </span>
              {selectedApps.length > 0 && (
                <button
                  type="button"
                  onClick={clearStack}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-[#E11D48] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {(['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const).map((layer) => {
                const active = stackMetrics.activeLayers.has(layer);
                return (
                  <div
                    key={layer}
                    className={`py-1.5 rounded text-center font-mono text-xs font-bold border ${
                      active
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/50'
                        : 'bg-zinc-50 dark:bg-[#111315] text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-white/[0.06]'
                    }`}
                  >
                    {layer}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Modules */}
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Selected Composable Modules
            </div>
            {selectedApps.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#111315] p-5 text-center">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  No modules selected yet
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Select modules in the Architecture Matrix or Catalog Grid, or load a 1-click starter recipe.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedApps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-start justify-between gap-2 rounded-lg bg-zinc-50 dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.08] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-100 leading-snug">
                        {app.shortName}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 mt-0.5 tabular-nums">
                        ${(app.setupUsd / 1000).toFixed(1)}K · {app.gmPct.toFixed(1)}% GM · Tier{' '}
                        {app.minServerTier}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        {app.proofClient}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleApp(app.id)}
                      className="p-1 text-zinc-400 hover:text-[#E11D48] rounded transition-colors cursor-pointer shrink-0"
                      title={`Remove ${app.shortName}`}
                      aria-label={`Remove ${app.shortName}`}
                    >
                      <X className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verified Native Synergies */}
          {stackMetrics.synergyPairs.length > 0 && (
            <div className="rounded-xl bg-zinc-50 dark:bg-[#111315] border border-emerald-500/25 p-3.5">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Verified Native Integrations ({stackMetrics.synergyPairs.length})</span>
              </div>
              <div className="space-y-1">
                {stackMetrics.synergyPairs.slice(0, 8).map(([a, b]) => (
                  <div
                    key={`${a}-${b}`}
                    className="text-xs font-mono text-zinc-900 dark:text-zinc-200 bg-white dark:bg-[#09090B] px-2.5 py-1 rounded border border-zinc-200 dark:border-white/[0.08]"
                  >
                    {a} ↔ {b}
                  </div>
                ))}
                {stackMetrics.synergyPairs.length > 8 && (
                  <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 pt-1">
                    +{stackMetrics.synergyPairs.length - 8} additional verified connectors
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommended On-Prem Hardware */}
          {selectedApps.length > 0 && (
            <div className="rounded-xl bg-[#09090B] border border-emerald-500/35 text-white p-4">
              <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-emerald-400 mb-1">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Server className="w-3.5 h-3.5" strokeWidth={1.5} />
                  TARGET: {deploymentProfile.switcherLabel.toUpperCase()} · {tierSpec.code}
                </span>
                <span>{tierSpec.speed}</span>
              </div>
              <div className="text-sm font-bold text-white">
                {tierSpec.code} — {tierSpec.name}
              </div>
              <div className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {tierSpec.hardware} · {tierSpec.vramRam}
              </div>
              <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
                <span className="text-amber-400">Est. CapEx: {tierSpec.capex}</span>
                {stackMetrics.escalatedByCount && (
                  <span className="text-[10px] text-amber-300">Auto-scaled (6+ apps)</span>
                )}
              </div>
            </div>
          )}

          {/* Commercial Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-zinc-50 dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.08] p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Est. Build Scope
              </div>
              <div className="font-mono text-xl font-bold text-zinc-950 dark:text-zinc-50 mt-0.5 tabular-nums">
                ${(stackMetrics.totalSetupUsd / 1000).toFixed(1)}K
              </div>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.08] p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Blended GM (Cons.)
              </div>
              <div className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 tabular-nums">
                {stackMetrics.blendedGmPct.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer Actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#111315] space-y-2.5 shrink-0">
          <button
            type="button"
            disabled={selectedApps.length === 0}
            onClick={handleOpenProposalForm}
            className="w-full flex items-center justify-center gap-2 bg-[#E11D48] hover:bg-[#BE123C] disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            <span>Request Stack Proposal</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={selectedApps.length === 0}
              onClick={() => exportStackJson()}
              className="flex items-center justify-center gap-1.5 bg-white dark:bg-[#18181B] hover:border-emerald-500/40 disabled:opacity-50 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-white/[0.1] py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>JSON</span>
            </button>

            <button
              type="button"
              disabled={selectedApps.length === 0}
              onClick={handleCopyBrief}
              className="flex items-center justify-center gap-1.5 bg-white dark:bg-[#18181B] hover:border-emerald-500/40 disabled:opacity-50 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-white/[0.1] py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
              <span>{copied ? 'Copied' : 'Brief'}</span>
            </button>

            <a
              href={selectedApps.length > 0 ? buildMailtoHref() : undefined}
              onClick={(e) => {
                if (selectedApps.length === 0) e.preventDefault();
              }}
              className={`flex items-center justify-center gap-1.5 bg-white dark:bg-[#18181B] hover:border-emerald-500/40 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-white/[0.1] py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedApps.length === 0 ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Email</span>
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
