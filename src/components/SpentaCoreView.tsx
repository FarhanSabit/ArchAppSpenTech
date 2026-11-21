import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  Check,
  ClipboardList,
  Cpu,
  Download,
  Globe2,
  HardDrive,
  Layers,
  Lock,
  RotateCcw,
  Search,
  Server,
  Shield,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  DUAL_SHORE_COMPARISON,
  SERVER_TIERS,
  SOVEREIGN_STACK_LAYERS,
  SPENTA_APPS,
  ServerTierId,
} from '../data/spentaManifest';
import {
  DEPLOYMENT_PROFILES,
  DEPLOYMENT_TARGET_ORDER,
} from '../data/deploymentProfiles';
import {
  CoreAuditScope,
  CoreIsolationMode,
  CoreLayerId,
  CorePolicyMode,
  DEFAULT_CORE_LAYER_CONFIGS,
  useStack,
} from '../store/StackContext';

type CoreTab = 'architecture' | 'audit';

const ISOLATION_OPTIONS: CoreIsolationMode[] = [
  'Air-Gapped On-Prem',
  'Private Sovereign VPC',
  'Hybrid Edge',
];

const POLICY_OPTIONS: CorePolicyMode[] = [
  'Strict OPA (>= 0.88 HITL)',
  'Balanced OPA (>= 0.85 HITL)',
  'Audit-Only Monitor',
];

const LAYER_SLA_PRESETS: Record<CoreLayerId, string[]> = {
  L6: [
    '99.95% UI uptime · <120ms TTI',
    '99.99% HA Active-Active · <80ms TTI',
    '99.90% Standard Branch · <180ms TTI',
  ],
  L5: [
    '0.88 HITL Gate · 100% immutable audit trace',
    '0.92 Banking Zero-Defect · Dual-Key Signoff',
    '0.85 Fast-Track Ops · Async Audit Mirror',
  ],
  L4: [
    '60–90 FPS XR · <18MB WebAR payloads',
    '90 FPS Cleanroom VR · Local Pixel Stream',
    '45–60 FPS Mobile WebAR · <10MB Lite Mesh',
  ],
  L3: [
    '<30s/form ICR · 0 bytes cloud PII egress',
    '<15s/form Batch ICR · Dual-GPU TensorRT',
    '<60s/form Eco Quantized INT4 · Low-Power',
  ],
  L2: [
    '<50ms edge inference · Hardware-enforced memory encryption',
    '<25ms ultra-low latency · AMD SEV-SNP Attested',
    '<100ms standard edge · TLS 1.3 + K3s',
  ],
  L1: [
    '80 BaaS Stations / 480 EVs · Sub-second MQTT ingest',
    '250+ Fleet Nodes · 500ms Telemetry SLA',
    'Offline-First Store & Forward · 72h Buffer',
  ],
};

function formatAuditTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

export function SpentaCoreView() {
  const {
    theme,
    selectedIds,
    toggleApp,
    stackMetrics,
    pendingNavFocus,
    clearPendingNavFocus,
    deploymentTarget,
    deploymentProfile,
    setDeploymentTarget,
    coreLayerConfigs,
    coreAuditLog,
    updateCoreLayerConfig,
    resetCoreLayerConfig,
    logCoreAuditEvent,
    clearCoreAuditLog,
  } = useStack();

  const [activeCoreTab, setActiveCoreTab] = useState<CoreTab>('architecture');
  const [activeLayerId, setActiveLayerId] = useState<CoreLayerId>('L5');
  const [selectedTierId, setSelectedTierId] = useState<ServerTierId>(stackMetrics.tier);
  const [recentLogHint, setRecentLogHint] = useState<string | null>(null);

  const [auditQuery, setAuditQuery] = useState<string>('');
  const [auditScopeFilter, setAuditScopeFilter] = useState<'ALL' | CoreAuditScope>('ALL');
  const [confirmClearLog, setConfirmClearLog] = useState<boolean>(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!pendingNavFocus) return;
    if (pendingNavFocus.type === 'layer') {
      const valid = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
      if (valid.includes(pendingNavFocus.id)) {
        setActiveCoreTab('architecture');
        setActiveLayerId(pendingNavFocus.id as CoreLayerId);
      }
      clearPendingNavFocus();
    } else if (pendingNavFocus.type === 'tier') {
      const n = Number(pendingNavFocus.id);
      if (n >= 1 && n <= 4) {
        setActiveCoreTab('architecture');
        setSelectedTierId(n as ServerTierId);
      }
      clearPendingNavFocus();
    }
  }, [pendingNavFocus, clearPendingNavFocus]);

  useEffect(() => {
    if (!recentLogHint) return;
    const timer = window.setTimeout(() => setRecentLogHint(null), 5000);
    return () => window.clearTimeout(timer);
  }, [recentLogHint]);

  const activeLayer = useMemo(
    () => SOVEREIGN_STACK_LAYERS.find((l) => l.id === activeLayerId) ?? SOVEREIGN_STACK_LAYERS[1],
    [activeLayerId],
  );

  const activeConfig = coreLayerConfigs[activeLayerId];
  const defaultConfig = DEFAULT_CORE_LAYER_CONFIGS[activeLayerId];
  const isLayerModified =
    activeConfig.isolationMode !== defaultConfig.isolationMode ||
    activeConfig.policyMode !== defaultConfig.policyMode ||
    activeConfig.teeEnabled !== defaultConfig.teeEnabled ||
    activeConfig.slaTarget !== defaultConfig.slaTarget;

  const dependentApps = useMemo(
    () => SPENTA_APPS.filter((app) => app.layers.includes(activeLayerId)),
    [activeLayerId],
  );

  const tierList = [SERVER_TIERS[1], SERVER_TIERS[2], SERVER_TIERS[3], SERVER_TIERS[4]];
  const focusedTier = SERVER_TIERS[selectedTierId];

  const modifiedLayerCount = useMemo(() => {
    return (['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as CoreLayerId[]).filter((id) => {
      const cfg = coreLayerConfigs[id];
      const def = DEFAULT_CORE_LAYER_CONFIGS[id];
      return (
        cfg.isolationMode !== def.isolationMode ||
        cfg.policyMode !== def.policyMode ||
        cfg.teeEnabled !== def.teeEnabled ||
        cfg.slaTarget !== def.slaTarget
      );
    }).length;
  }, [coreLayerConfigs]);

  const strictOpaCount = useMemo(
    () =>
      (['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as CoreLayerId[]).filter(
        (id) => coreLayerConfigs[id].policyMode === 'Strict OPA (>= 0.88 HITL)',
      ).length,
    [coreLayerConfigs],
  );

  const teeEnabledCount = useMemo(
    () =>
      (['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as CoreLayerId[]).filter(
        (id) => coreLayerConfigs[id].teeEnabled,
      ).length,
    [coreLayerConfigs],
  );

  const filteredAuditEntries = useMemo(() => {
    const q = auditQuery.trim().toLowerCase();
    return coreAuditLog.filter((entry) => {
      if (auditScopeFilter !== 'ALL' && entry.layer !== auditScopeFilter) return false;
      if (!q) return true;
      return (
        entry.action.toLowerCase().includes(q) ||
        entry.field.toLowerCase().includes(q) ||
        entry.previousValue.toLowerCase().includes(q) ||
        entry.newValue.toLowerCase().includes(q) ||
        entry.actor.toLowerCase().includes(q) ||
        entry.layer.toLowerCase().includes(q)
      );
    });
  }, [coreAuditLog, auditQuery, auditScopeFilter]);

  const handleLayerConfigChange = (
    patch: Partial<typeof activeConfig>,
    actionLabel: string,
  ) => {
    updateCoreLayerConfig(activeLayerId, patch, actionLabel);
    setRecentLogHint(`${activeLayerId}: ${actionLabel}`);
  };

  const handleResetLayer = () => {
    resetCoreLayerConfig(activeLayerId);
    setRecentLogHint(`${activeLayerId}: Restored Sovereign Baseline`);
  };

  const handleLayerModuleToggle = (appId: string, appShortName: string, currentlyActive: boolean) => {
    toggleApp(appId);
    logCoreAuditEvent({
      actor: 'Sovereign Architect',
      layer: activeLayerId,
      action: currentlyActive ? 'Detached Module from Layer Stack' : 'Attached Module to Layer Stack',
      field: 'Composed Stack Module',
      previousValue: currentlyActive ? `${appShortName} (Attached)` : `${appShortName} (Detached)`,
      newValue: currentlyActive ? `${appShortName} (Detached)` : `${appShortName} (Attached)`,
    });
    setRecentLogHint(
      `${activeLayerId}: ${currentlyActive ? 'Detached' : 'Attached'} ${appShortName}`,
    );
  };

  const handleSelectServerTier = (tierId: ServerTierId) => {
    if (tierId === selectedTierId) return;
    const prevTier = SERVER_TIERS[selectedTierId];
    const nextTier = SERVER_TIERS[tierId];
    setSelectedTierId(tierId);
    logCoreAuditEvent({
      actor: 'Sovereign Architect',
      layer: 'Hardware',
      action: 'Updated Target Server PC Tier',
      field: 'Target Server Tier',
      previousValue: `${prevTier.code} (${prevTier.capex})`,
      newValue: `${nextTier.code} (${nextTier.capex})`,
    });
    setRecentLogHint(`Hardware: Switched to ${nextTier.code}`);
  };

  const handleExportAuditJson = () => {
    const payload = {
      platform: 'Spenta Sovereign OS — Core L1–L6 Audit Ledger',
      exportedAt: new Date().toISOString(),
      totalEvents: coreAuditLog.length,
      currentLayerConfigs: coreLayerConfigs,
      auditLog: coreAuditLog,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spenta-core-audit-log-${coreAuditLog.length}events.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header + Segmented View Switcher */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
            SPENTA CORE KERNEL · L1–L6 FUSION STACK · 4-TIER LOCAL SERVERS · AUDIT LEDGER
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight mt-1">
            Spenta Core — Sovereign Fusion Architecture &amp; Configuration Governance
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-3xl">
            Every module in the Spenta App Vault inherits one shared L1–L6 kernel. Active target:{' '}
            <strong className="font-mono text-zinc-900 dark:text-zinc-100">
              {deploymentProfile.shortLabel}
            </strong>{' '}
            ({deploymentProfile.latencyBudget} · {deploymentProfile.transport}).
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              Target Environment:
            </span>
            <div
              role="group"
              aria-label="Core infrastructure target environment"
              className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-zinc-100 dark:bg-[#18181B] border border-zinc-200 dark:border-white/[0.08]"
            >
              {DEPLOYMENT_TARGET_ORDER.map((tid) => {
                const prof = DEPLOYMENT_PROFILES[tid];
                const active = deploymentTarget === tid;
                return (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => setDeploymentTarget(tid, 'Spenta Core Console')}
                    aria-pressed={active}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                    }`}
                  >
                    {prof.switcherLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-[#18181B] p-1 border border-zinc-200 dark:border-white/[0.08] self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveCoreTab('architecture')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeCoreTab === 'architecture'
                ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Architecture &amp; Config</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCoreTab('audit')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeCoreTab === 'audit'
                ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Audit Log</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.5 rounded tabular-nums ${
                activeCoreTab === 'audit'
                  ? 'bg-emerald-500 text-zinc-950 dark:bg-zinc-950 dark:text-emerald-400'
                  : 'bg-white dark:bg-[#09090B] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/[0.08]'
              }`}
            >
              {coreAuditLog.length}
            </span>
          </button>
        </div>
      </section>

      {activeCoreTab === 'architecture' ? (
        <>
          {/* Section 1: Interactive L1-L6 Sovereign Fusion Stack */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="inline-flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50">
                  Interactive L1–L6 Sovereign Fusion Stack
                </h2>
              </div>

              {recentLogHint ? (
                <button
                  type="button"
                  onClick={() => setActiveCoreTab('audit')}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/35 px-3 py-1 rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Logged: {recentLogHint}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  Select a layer to inspect API contracts &amp; configure isolation/OPA rules
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Vertical Stack Selector */}
              <div className="lg:col-span-5 space-y-2">
                {SOVEREIGN_STACK_LAYERS.map((layer) => {
                  const isSelected = layer.id === activeLayerId;
                  const isActivatedByStack = stackMetrics.activeLayers.has(layer.id);
                  const layerAppCount = SPENTA_APPS.filter((a) => a.layers.includes(layer.id)).length;
                  const cfg = coreLayerConfigs[layer.id];
                  const def = DEFAULT_CORE_LAYER_CONFIGS[layer.id];
                  const modified =
                    cfg.isolationMode !== def.isolationMode ||
                    cfg.policyMode !== def.policyMode ||
                    cfg.teeEnabled !== def.teeEnabled ||
                    cfg.slaTarget !== def.slaTarget;

                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => setActiveLayerId(layer.id)}
                      className={`w-full text-left rounded-xl p-3.5 border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-zinc-950 text-white border-emerald-500/70 dark:bg-[#161B19] dark:border-emerald-500/60'
                          : 'bg-zinc-50 dark:bg-[#09090B] text-zinc-950 dark:text-zinc-100 border-zinc-200 dark:border-white/[0.08] hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-10 h-10 rounded-lg font-mono text-xs font-extrabold flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                              : 'bg-white dark:bg-[#111315] text-zinc-900 dark:text-emerald-400 border-zinc-200 dark:border-white/[0.1]'
                          }`}
                        >
                          {layer.id}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate">{layer.title}</div>
                          <div
                            className={`text-[11px] truncate ${
                              isSelected ? 'text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'
                            }`}
                          >
                            {cfg.isolationMode} · {cfg.teeEnabled ? 'TEE ON' : 'Standard TLS'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 font-mono text-[10px]">
                        <div className={isSelected ? 'text-emerald-300' : 'text-zinc-500 dark:text-zinc-400'}>
                          {layerAppCount} apps
                        </div>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          {modified && <span className="text-amber-400 font-bold">EDITED</span>}
                          {isActivatedByStack && (
                            <span className="text-emerald-400 font-bold">ACTIVE</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Layer Technical Detail Inspector + Live Configuration */}
              <div className="lg:col-span-7 rounded-2xl bg-zinc-50 dark:bg-[#0C0E10] border border-zinc-200 dark:border-white/[0.08] p-4 sm:p-5 flex flex-col justify-between gap-5">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-white/[0.08]">
                    <div>
                      <span className="font-mono text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                        {activeLayer.id} ARCHITECTURE CONTRACT
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-zinc-950 dark:text-zinc-50 mt-0.5">
                        {activeLayer.title}
                      </h3>
                    </div>
                    <span className="font-mono text-[11px] bg-zinc-950 dark:bg-[#111315] text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                      {activeConfig.slaTarget}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {activeLayer.summary}
                  </p>

                  {/* Live L1-L6 Configuration Panel */}
                  <div className="bg-white dark:bg-[#111315] rounded-xl border border-zinc-200 dark:border-white/[0.08] p-4 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />
                        <span>Live {activeLayer.id} Configuration Controls</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetLayer}
                        disabled={!isLayerModified}
                        className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                          isLayerModified
                            ? 'border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#18181B] text-zinc-900 dark:text-zinc-100 hover:border-emerald-500/50 cursor-pointer'
                            : 'border-zinc-200 dark:border-white/[0.06] bg-zinc-100 dark:bg-[#09090B] text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                        }`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Baseline</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="core-isolation-select"
                          className="block text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1"
                        >
                          Deployment Isolation
                        </label>
                        <select
                          id="core-isolation-select"
                          value={activeConfig.isolationMode}
                          onChange={(e) =>
                            handleLayerConfigChange(
                              { isolationMode: e.target.value as CoreIsolationMode },
                              'Changed Deployment Isolation',
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#09090B] px-2.5 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                        >
                          {ISOLATION_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="core-policy-select"
                          className="block text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1"
                        >
                          OPA Policy Enforcement
                        </label>
                        <select
                          id="core-policy-select"
                          value={activeConfig.policyMode}
                          onChange={(e) =>
                            handleLayerConfigChange(
                              { policyMode: e.target.value as CorePolicyMode },
                              'Updated OPA Policy Mode',
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#09090B] px-2.5 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                        >
                          {POLICY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="core-sla-select"
                          className="block text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1"
                        >
                          Target SLA Profile
                        </label>
                        <select
                          id="core-sla-select"
                          value={activeConfig.slaTarget}
                          onChange={(e) =>
                            handleLayerConfigChange(
                              { slaTarget: e.target.value },
                              'Updated Target SLA Profile',
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#09090B] px-2.5 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                        >
                          {LAYER_SLA_PRESETS[activeLayerId].map((preset) => (
                            <option key={preset} value={preset}>
                              {preset}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="block text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">
                          Hardware TEE (AMD SEV-SNP / TDX)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleLayerConfigChange(
                              { teeEnabled: !activeConfig.teeEnabled },
                              !activeConfig.teeEnabled
                                ? 'Enabled Hardware TEE Enclave'
                                : 'Disabled Hardware TEE Enclave',
                            )
                          }
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer ${
                            activeConfig.teeEnabled
                              ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/50'
                              : 'bg-zinc-50 dark:bg-[#09090B] text-zinc-700 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.1] hover:border-emerald-500/40'
                          }`}
                        >
                          <span>{activeConfig.teeEnabled ? 'TEE ATTESTED' : 'TEE DISABLED'}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              activeConfig.teeEnabled
                                ? 'bg-emerald-500 text-zinc-950'
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400'
                            }`}
                          >
                            {activeConfig.teeEnabled ? 'ON' : 'OFF'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Protocols & Security */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-[#111315] rounded-xl p-3.5 border border-zinc-200 dark:border-white/[0.08]">
                      <div className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-2">
                        Core Protocols &amp; Engines
                      </div>
                      <ul className="space-y-1 text-xs text-zinc-900 dark:text-zinc-200 font-medium">
                        {activeLayer.protocols.map((p) => (
                          <li key={p} className="font-mono">
                            · {p}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white dark:bg-[#111315] rounded-xl p-3.5 border border-zinc-200 dark:border-white/[0.08]">
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400 mb-2">
                        <Lock className="w-3 h-3" strokeWidth={1.5} />
                        <span>Security &amp; Isolation Controls</span>
                      </div>
                      <ul className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                        {activeLayer.securityControls.map((c) => (
                          <li key={c}>· {c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* API Contracts */}
                  <div className="bg-[#09090B] text-emerald-100 rounded-xl border border-white/[0.08] p-3.5 overflow-x-auto">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 mb-2">
                      Standardized Spenta Core API Contracts ({activeLayer.id})
                    </div>
                    <div className="space-y-1.5 font-mono text-xs">
                      {activeLayer.apiContracts.map((contract) => (
                        <div key={contract} className="text-zinc-300 whitespace-nowrap">
                          $ {contract}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dependent Apps Toggle Strip */}
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    Spenta Modules Powered by {activeLayer.id} ({dependentApps.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {dependentApps.map((app) => {
                      const active = selectedIds.includes(app.id);
                      return (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => handleLayerModuleToggle(app.id, app.shortName, active)}
                          className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
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
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: 4-Tier On-Prem Server PC Configurator */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="inline-flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50">
                  4-Tier On-Premises Sovereign Server PC Configurator
                </h2>
              </div>
              <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                Your Stack Recommends:{' '}
                <strong className="text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                  {SERVER_TIERS[stackMetrics.tier].code} ({SERVER_TIERS[stackMetrics.tier].capex})
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {tierList.map((tier) => {
                const isRecommended = tier.id === stackMetrics.tier;
                const isFocused = tier.id === selectedTierId;

                return (
                  <article
                    key={tier.id}
                    onClick={() => handleSelectServerTier(tier.id)}
                    className={`rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between ${
                      isRecommended
                        ? 'bg-zinc-950 text-white border-emerald-500/70 dark:bg-[#161B19] dark:border-emerald-500/60'
                        : isFocused
                          ? 'bg-zinc-100 dark:bg-[#18181B] text-zinc-950 dark:text-zinc-50 border-emerald-500/40'
                          : 'bg-zinc-50/70 dark:bg-[#09090B] text-zinc-950 dark:text-zinc-100 border-zinc-200 dark:border-white/[0.08] hover:border-emerald-500/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`font-mono text-xs font-extrabold ${
                            isRecommended ? 'text-emerald-400' : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {tier.code}
                        </span>
                        {isRecommended && (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-emerald-500 text-zinc-950 px-2 py-0.5 rounded">
                            <Check className="w-3 h-3" /> STACK FIT
                          </span>
                        )}
                        {!isRecommended && tier.id === 3 && (
                          <span className="font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded">
                            BASELINE
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm leading-snug">{tier.name}</h3>
                      <div
                        className={`font-mono text-lg font-extrabold mt-2 tabular-nums ${
                          isRecommended ? 'text-amber-400' : 'text-zinc-950 dark:text-zinc-50'
                        }`}
                      >
                        {tier.capex}
                      </div>
                      <div
                        className={`font-mono text-xs mt-0.5 ${
                          isRecommended ? 'text-emerald-300' : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {tier.speed} · {tier.modelScale}
                      </div>

                      <div
                        className={`mt-3 space-y-1.5 text-xs ${
                          isRecommended ? 'text-zinc-300' : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          <Cpu className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" strokeWidth={1.5} />
                          <span>{tier.hardware}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-400" strokeWidth={1.5} />
                          <span>
                            {tier.vramRam} · {tier.storage}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p
                      className={`mt-3 pt-3 border-t text-[11px] leading-snug ${
                        isRecommended
                          ? 'border-white/[0.08] text-zinc-400'
                          : 'border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {tier.idealFor}
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {focusedTier.code} BENCHMARK:
                </span>{' '}
                <span className="text-zinc-800 dark:text-zinc-200">
                  {focusedTier.note ?? focusedTier.idealFor}
                </span>
              </div>
              <div className="font-mono text-zinc-600 dark:text-zinc-300 shrink-0 tabular-nums">
                12-Mo Amortized Compute:{' '}
                <strong className="text-zinc-950 dark:text-zinc-50">
                  ${Math.round(focusedTier.capexMidUsd / 12).toLocaleString()}/mo
                </strong>{' '}
                (Zero token metering)
              </div>
            </div>
          </section>

          {/* Section 3: Dual-Shore Delivery Pod Advantage */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-5 space-y-3">
                <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <Globe2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Dual-Shore Delivery Pods</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50">
                  San Jose &amp; Australia Orchestration + 20-FTE Dhaka R&amp;D Hub
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Spenta pairs senior Western architecture and client governance with a full-stack 20-FTE Dhaka R&amp;D engineering center running at{' '}
                  <strong className="font-mono text-zinc-950 dark:text-zinc-100">$11.50/hr</strong>{' '}
                  blended loaded cost (
                  <strong className="font-mono text-zinc-950 dark:text-zinc-100">
                    $540K / 64.8M BDT
                  </strong>{' '}
                  Y1 budget).
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-3">
                    <div className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                      Client Cost Edge
                    </div>
                    <div className="font-mono text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      40%–60%
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      vs. Western AI agencies
                    </div>
                  </div>
                  <div className="rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-3">
                    <div className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                      Security Posture
                    </div>
                    <div className="font-mono text-xl font-extrabold text-zinc-950 dark:text-zinc-50 mt-0.5 inline-flex items-center gap-1">
                      <Shield className="w-4 h-4 text-emerald-500" strokeWidth={1.5} /> 24/7 SLA
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      TEE + Air-Gapped VPN
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={DUAL_SHORE_COMPARISON}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#27272A' : '#E4E4E7'}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      domain={[0, 165]}
                      tickFormatter={(v) => `$${v}/hr`}
                      tick={{
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono, monospace',
                        fill: isDark ? '#A1A1AA' : '#52525B',
                      }}
                      axisLine={{ stroke: isDark ? '#27272A' : '#E4E4E7' }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="role"
                      width={160}
                      tick={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        fill: isDark ? '#E4E4E7' : '#18181B',
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: unknown) => [
                        `$${Number(value).toFixed(2)} / hr`,
                        'Blended Loaded Rate',
                      ]}
                      contentStyle={{
                        borderRadius: '10px',
                        backgroundColor: isDark ? '#111315' : '#FFFFFF',
                        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E4E4E7',
                        color: isDark ? '#FAFAFA' : '#09090B',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '12px',
                      }}
                      itemStyle={{ color: isDark ? '#E4E4E7' : '#18181B' }}
                    />
                    <Bar dataKey="hourlyUsd" radius={[0, 6, 6, 0]} barSize={24}>
                      {DUAL_SHORE_COMPARISON.map((entry) => (
                        <Cell key={entry.role} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </>
      ) : (
        /* Audit Log Tab */
        <div className="space-y-5">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl p-4 bg-zinc-950 dark:bg-[#111315] text-white border border-emerald-500/35">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-emerald-400">
                Total Audit Events
              </div>
              <div className="font-mono text-2xl font-extrabold mt-1 tabular-nums">
                {coreAuditLog.length}
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                Persisted locally across sessions
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-white dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.08]">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Customized Layers
              </div>
              <div className="font-mono text-2xl font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 tabular-nums">
                {modifiedLayerCount} / 6
              </div>
              <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                Diverged from L1–L6 baseline
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-white dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.08]">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Strict OPA (&gt;=0.88)
              </div>
              <div className="font-mono text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                {strictOpaCount} / 6
              </div>
              <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                HITL circuit-breaker active
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-white dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.08]">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                Hardware TEE Active
              </div>
              <div className="font-mono text-2xl font-extrabold text-teal-700 dark:text-teal-400 mt-1 tabular-nums">
                {teeEnabledCount} / 6
              </div>
              <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                AMD SEV-SNP / Intel TDX enclaves
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
                <input
                  type="text"
                  value={auditQuery}
                  onChange={(e) => setAuditQuery(e.target.value)}
                  placeholder="Filter by action, layer, field, value, or actor..."
                  aria-label="Filter audit log entries"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#09090B] text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportAuditJson}
                  disabled={coreAuditLog.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 text-xs font-mono font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Export JSON</span>
                </button>

                {!confirmClearLog ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClearLog(true)}
                    disabled={coreAuditLog.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#18181B] hover:border-rose-500/40 hover:text-[#E11D48] disabled:opacity-40 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Clear Log</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-xl">
                    <span className="text-[11px] font-semibold text-[#E11D48]">Clear all?</span>
                    <button
                      type="button"
                      onClick={() => {
                        clearCoreAuditLog();
                        setConfirmClearLog(false);
                      }}
                      className="px-2 py-1 rounded-lg bg-[#E11D48] text-white text-[11px] font-bold cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearLog(false)}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-white/[0.1] text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'L6', 'L5', 'L4', 'L3', 'L2', 'L1', 'Hardware'] as const).map((scope) => {
                const active = auditScopeFilter === scope;
                return (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setAuditScopeFilter(scope)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-500'
                        : 'bg-zinc-50 dark:bg-[#09090B] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/[0.08] hover:border-emerald-500/40'
                    }`}
                  >
                    {scope === 'ALL' ? `All (${coreAuditLog.length})` : scope}
                  </button>
                );
              })}
            </div>

            {filteredAuditEntries.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-8 text-center">
                <ClipboardList className="w-7 h-7 text-zinc-400 mx-auto mb-2" strokeWidth={1.5} />
                <div className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
                  No matching audit entries
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Modify any L1–L6 layer isolation mode, OPA policy, Hardware TEE toggle, or Server PC Tier to record live configuration diffs.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveCoreTab('architecture')}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 text-xs font-bold cursor-pointer"
                >
                  <span>Go to Architecture &amp; Config</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08]">
                <table className="w-full min-w-[740px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 text-emerald-400 font-mono text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Scope</th>
                      <th className="py-2.5 px-3">User Action &amp; Field</th>
                      <th className="py-2.5 px-3">Previous Value → New Value</th>
                      <th className="py-2.5 px-3 text-right">Actor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
                    {filteredAuditEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 px-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-nowrap tabular-nums">
                          {formatAuditTime(entry.timestamp)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block font-mono text-[10px] font-extrabold px-2 py-0.5 rounded ${
                              entry.layer === 'Hardware'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {entry.layer}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-zinc-950 dark:text-zinc-100">
                            {entry.action}
                          </div>
                          <div className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {entry.field}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 line-through decoration-amber-400/70">
                              {entry.previousValue}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/35 font-bold">
                              {entry.newValue}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {entry.actor}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
