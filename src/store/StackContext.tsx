import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  BRAIN_HUBS,
  NavTab,
  SERVER_TIERS,
  SPENTA_APPS,
  SPENTA_CONTACT_EMAIL,
  ServerTierId,
  SpentaApp,
  STARTER_RECIPES,
} from '../data/spentaManifest';

import {
  DEPLOYMENT_PROFILES,
  DeploymentProfileSpec,
  DeploymentTargetId,
} from '../data/deploymentProfiles';
import { PaletteMode, ThemeMode, useTheme } from '../context/ThemeContext';
import {
  buildShareableUrl,
  clearShareUrlParams,
  ParsedShareSnapshot,
  parseShareUrlParams,
} from '../utils/shareUrlCodec';
import {
  ActiveBrainSelection,
  LinkPathwayNodeOptions,
  PathwayBrainLinkTarget,
  resolveBrainHubForPathwayNode,
} from '../utils/pathwayBrainLink';

const STACK_STORAGE_KEY = 'spenta_sovereign_stack_v1';
const PROPOSALS_STORAGE_KEY = 'spenta_saved_proposals_v1';
const CORE_CONFIG_STORAGE_KEY = 'spenta_core_layer_configs_v1';
const CORE_AUDIT_STORAGE_KEY = 'spenta_core_audit_log_v1';
const DEPLOYMENT_TARGET_STORAGE_KEY = 'spenta_deployment_target_v1';
const DEFAULT_SELECTED_IDS = ['icr_ops', 'genai_bi', 'mis_erp', 'cyber_sla'];

export type { PaletteMode, ThemeMode };
export type CoreLayerId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
export type CoreAuditScope = CoreLayerId | 'Hardware';
export type CoreIsolationMode =
  | 'Air-Gapped On-Prem'
  | 'Private Sovereign VPC'
  | 'Hybrid Edge';
export type CorePolicyMode =
  | 'Strict OPA (>= 0.88 HITL)'
  | 'Balanced OPA (>= 0.85 HITL)'
  | 'Audit-Only Monitor';

export interface LayerConfig {
  isolationMode: CoreIsolationMode;
  policyMode: CorePolicyMode;
  teeEnabled: boolean;
  slaTarget: string;
}

export interface CoreAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  layer: CoreAuditScope;
  action: string;
  field: string;
  previousValue: string;
  newValue: string;
}

export const DEFAULT_CORE_LAYER_CONFIGS: Record<CoreLayerId, LayerConfig> = {
  L6: {
    isolationMode: 'Private Sovereign VPC',
    policyMode: 'Strict OPA (>= 0.88 HITL)',
    teeEnabled: false,
    slaTarget: '99.95% UI uptime · <120ms TTI',
  },
  L5: {
    isolationMode: 'Air-Gapped On-Prem',
    policyMode: 'Strict OPA (>= 0.88 HITL)',
    teeEnabled: true,
    slaTarget: '0.88 HITL Gate · 100% immutable audit trace',
  },
  L4: {
    isolationMode: 'Private Sovereign VPC',
    policyMode: 'Balanced OPA (>= 0.85 HITL)',
    teeEnabled: false,
    slaTarget: '60–90 FPS XR · <18MB WebAR payloads',
  },
  L3: {
    isolationMode: 'Air-Gapped On-Prem',
    policyMode: 'Strict OPA (>= 0.88 HITL)',
    teeEnabled: true,
    slaTarget: '<30s/form ICR · 0 bytes cloud PII egress',
  },
  L2: {
    isolationMode: 'Air-Gapped On-Prem',
    policyMode: 'Strict OPA (>= 0.88 HITL)',
    teeEnabled: true,
    slaTarget: '<50ms edge inference · Hardware-enforced memory encryption',
  },
  L1: {
    isolationMode: 'Hybrid Edge',
    policyMode: 'Balanced OPA (>= 0.85 HITL)',
    teeEnabled: true,
    slaTarget: '80 BaaS Stations / 480 EVs · Sub-second MQTT ingest',
  },
};

function buildInitialAuditLog(): CoreAuditEntry[] {
  const now = Date.now();
  return [
    {
      id: 'audit_init_1',
      timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
      actor: 'System Bootstrap',
      layer: 'L5',
      action: 'Enforced OPA Governance Gate',
      field: 'OPA Policy Mode',
      previousValue: 'Balanced OPA (>= 0.85 HITL)',
      newValue: 'Strict OPA (>= 0.88 HITL)',
    },
    {
      id: 'audit_init_2',
      timestamp: new Date(now - 1000 * 60 * 42).toISOString(),
      actor: 'Security Architect',
      layer: 'L2',
      action: 'Enabled Confidential Compute TEE',
      field: 'Hardware TEE (SEV-SNP/TDX)',
      previousValue: 'Disabled',
      newValue: 'Enabled (AMD SEV-SNP / Intel TDX)',
    },
    {
      id: 'audit_init_3',
      timestamp: new Date(now - 1000 * 60 * 95).toISOString(),
      actor: 'Infra Lead',
      layer: 'Hardware',
      action: 'Initialized Server PC Baseline',
      field: 'Target Server Tier',
      previousValue: 'Unassigned',
      newValue: 'TIER 3 — Spenta Budget Baseline ($7.5K–$8.5K)',
    },
  ];
}

export interface SavedProposal {
  id: string;
  createdAt: string;
  organization: string;
  contactName: string;
  email: string;
  deployment: 'On-Prem' | 'Private VPC' | 'Air-Gap' | 'SaaS';
  timeline: string;
  notes: string;
  appIds: string[];
  appNames: string[];
  estimatedBuildUsd: number;
  blendedGmPct: number;
  recommendedTier: ServerTierId;
}

export interface StackMetrics {
  totalSetupUsd: number;
  blendedGmPct: number;
  tier: ServerTierId;
  activeLayers: Set<string>;
  synergyPairs: [string, string][];
  escalatedByCount: boolean;
}

export interface PendingNavFocus {
  type:
    | 'app'
    | 'slide'
    | 'infographic'
    | 'layer'
    | 'tier'
    | 'case'
    | 'blueprint'
    | 'studio'
    | 'brain-hub';
  id: string;
  appId?: string;
  open3D?: boolean;
  returnTab?: NavTab;
  returnLabel?: string;
  ts: number;
}

export interface ProjectArchitectureMetadata {
  project: string;
  updatedAt: string;
  infrastructureTarget: {
    id: DeploymentTargetId;
    environment: string;
    topology: string;
    transport: string;
    enclaveBoundary: string;
    latencyBudget: string;
    egressPolicy: string;
    compliancePosture: string;
    costPosture: string;
  };
  stackSizing: {
    activeModules: number;
    recommendedTier: string;
    estimatedBuildUsd: number;
  };
  governanceSummary: {
    teeEnabledLayers: number;
    strictOpaLayers: number;
    airGappedLayers: number;
    vpcLayers: number;
  };
  coreLayers: Record<CoreLayerId, LayerConfig>;
}

interface StackContextValue {
  theme: ThemeMode;
  paletteMode: PaletteMode;
  setTheme: (theme: ThemeMode) => void;
  setPaletteMode: (palette: PaletteMode) => void;
  toggleTheme: () => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  pendingNavFocus: PendingNavFocus | null;
  navigateToItem: (tab: NavTab, focus?: Omit<PendingNavFocus, 'ts'>) => void;
  clearPendingNavFocus: () => void;
  aiAssistantOpen: boolean;
  setAiAssistantOpen: (open: boolean) => void;
  selectedIds: string[];
  selectedApps: SpentaApp[];
  appMap: Record<string, SpentaApp>;
  toggleApp: (id: string) => void;
  applyRecipe: (recipeId: string) => void;
  clearStack: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  autoNotice: string | null;
  setAutoNotice: (msg: string | null) => void;
  hitlConfidence: number;
  setHitlConfidence: (val: number) => void;
  stackMetrics: StackMetrics;
  savedProposals: SavedProposal[];
  saveProposal: (input: Omit<SavedProposal, 'id' | 'createdAt' | 'appIds' | 'appNames' | 'estimatedBuildUsd' | 'blendedGmPct' | 'recommendedTier'>) => SavedProposal;
  deleteProposal: (id: string) => void;
  exportStackJson: (extra?: Record<string, unknown>) => void;
  buildExecutiveBrief: () => string;
  buildMailtoHref: (subject?: string, bodyExtra?: string) => string;
  deploymentTarget: DeploymentTargetId;
  deploymentProfile: DeploymentProfileSpec;
  projectArchitectureMetadata: ProjectArchitectureMetadata;
  setDeploymentTarget: (target: DeploymentTargetId, actor?: string) => void;
  coreLayerConfigs: Record<CoreLayerId, LayerConfig>;
  coreAuditLog: CoreAuditEntry[];
  updateCoreLayerConfig: (
    layerId: CoreLayerId,
    patch: Partial<LayerConfig>,
    actionLabel?: string,
    actor?: string,
  ) => void;
  resetCoreLayerConfig: (layerId: CoreLayerId, actor?: string) => void;
  logCoreAuditEvent: (entry: Omit<CoreAuditEntry, 'id' | 'timestamp'>) => void;
  clearCoreAuditLog: () => void;
  sharedSnapshotSummary: string | null;
  dismissSharedSnapshot: () => void;
  resetToLocalDefaults: () => void;
  buildShareUrl: (overrides?: {
    tab?: NavTab;
    hubId?: string | null;
    brainMode?: '3d' | 'radar';
  }) => string;
  activeBrainSelection: ActiveBrainSelection;
  selectBrainHub: (
    hubId: string,
    options?: {
      appId?: string;
      source?: ActiveBrainSelection['source'];
      pathwayBranchId?: string;
      pathwayNodeCode?: string;
      pathwayNodeTitle?: string;
    },
  ) => void;
  linkPathwayNodeToBrain: (options: LinkPathwayNodeOptions) => PathwayBrainLinkTarget;
}

const StackContext = createContext<StackContextValue | null>(null);

function loadStoredIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STACK_STORAGE_KEY);
    if (!raw) return DEFAULT_SELECTED_IDS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const validSet = new Set(SPENTA_APPS.map((a) => a.id));
      const clean = parsed.filter((id): id is string => typeof id === 'string' && validSet.has(id));
      return clean;
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_SELECTED_IDS;
}

function loadStoredProposals(): SavedProposal[] {
  try {
    const raw = window.localStorage.getItem(PROPOSALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore storage errors
  }
  return [];
}

function loadStoredCoreConfigs(): Record<CoreLayerId, LayerConfig> {
  try {
    const raw = window.localStorage.getItem(CORE_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CORE_LAYER_CONFIGS;
    const parsed = JSON.parse(raw) as Partial<Record<CoreLayerId, Partial<LayerConfig>>>;
    const merged = { ...DEFAULT_CORE_LAYER_CONFIGS };
    (['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as CoreLayerId[]).forEach((layerId) => {
      if (parsed && parsed[layerId]) {
        merged[layerId] = { ...DEFAULT_CORE_LAYER_CONFIGS[layerId], ...parsed[layerId] };
      }
    });
    return merged;
  } catch {
    // ignore storage errors
  }
  return DEFAULT_CORE_LAYER_CONFIGS;
}

function loadStoredAuditLog(): CoreAuditEntry[] {
  try {
    const raw = window.localStorage.getItem(CORE_AUDIT_STORAGE_KEY);
    if (!raw) return buildInitialAuditLog();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as CoreAuditEntry[];
  } catch {
    // ignore storage errors
  }
  return buildInitialAuditLog();
}

function loadStoredDeploymentTarget(): DeploymentTargetId {
  try {
    const raw = window.localStorage.getItem(DEPLOYMENT_TARGET_STORAGE_KEY);
    if (raw === 'on-prem' || raw === 'private-vpc' || raw === 'air-gapped') return raw;
  } catch {
    // ignore storage errors
  }
  return 'on-prem';
}

export function StackProvider({ children }: { children: React.ReactNode }) {
  const { theme, paletteMode, setTheme, setPaletteMode, toggleTheme } = useTheme();
  const [initialShareSnapshot] = useState<ParsedShareSnapshot | null>(() => parseShareUrlParams());
  const [sharedSnapshotSummary, setSharedSnapshotSummary] = useState<string | null>(
    () => initialShareSnapshot?.summary ?? null,
  );
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavTab>(
    () => initialShareSnapshot?.activeTab ?? 'App Vault',
  );
  const [pendingNavFocus, setPendingNavFocus] = useState<PendingNavFocus | null>(() => {
    if (initialShareSnapshot?.hubId) {
      return {
        type: 'brain-hub',
        id: initialShareSnapshot.hubId,
        open3D: initialShareSnapshot.brainMode !== 'radar',
        ts: Date.now(),
      };
    }
    return null;
  });
  const [activeBrainSelection, setActiveBrainSelection] = useState<ActiveBrainSelection>(() => {
    const initialHubId = initialShareSnapshot?.hubId;
    if (initialHubId && BRAIN_HUBS.some((h) => h.id === initialHubId)) {
      const firstApp = SPENTA_APPS.find((a) => a.hubId === initialHubId);
      return {
        hubId: initialHubId,
        appId: firstApp?.id,
        source: 'url',
        nonce: 1,
      };
    }
    return {
      hubId: 'fintech',
      appId: 'icr_ops',
      source: 'brain',
      nonce: 0,
    };
  });
  const [aiAssistantOpen, setAiAssistantOpen] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => initialShareSnapshot?.selectedIds ?? loadStoredIds(),
  );
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [autoNotice, setAutoNotice] = useState<string | null>(null);
  const [hitlConfidence, setHitlConfidence] = useState<number>(
    () => initialShareSnapshot?.hitlConfidence ?? 0.91,
  );
  const [savedProposals, setSavedProposals] = useState<SavedProposal[]>(() => loadStoredProposals());
  const [deploymentTarget, setDeploymentTargetState] = useState<DeploymentTargetId>(
    () => initialShareSnapshot?.deploymentTarget ?? loadStoredDeploymentTarget(),
  );
  const [coreLayerConfigs, setCoreLayerConfigs] = useState<Record<CoreLayerId, LayerConfig>>(() => {
    if (initialShareSnapshot?.deploymentTarget) {
      const presets = DEPLOYMENT_PROFILES[initialShareSnapshot.deploymentTarget].layerPresets;
      return {
        L1: { ...presets.L1 },
        L2: { ...presets.L2 },
        L3: { ...presets.L3 },
        L4: { ...presets.L4 },
        L5: { ...presets.L5 },
        L6: { ...presets.L6 },
      };
    }
    return loadStoredCoreConfigs();
  });
  const [architectureUpdatedAt, setArchitectureUpdatedAt] = useState<string>(() =>
    new Date().toISOString(),
  );
  const [coreAuditLog, setCoreAuditLog] = useState<CoreAuditEntry[]>(() => loadStoredAuditLog());

  const deploymentProfile = DEPLOYMENT_PROFILES[deploymentTarget];

  const navigateToItem = useCallback((tab: NavTab, focus?: Omit<PendingNavFocus, 'ts'>) => {
    setActiveTab(tab);
    setPendingNavFocus(focus ? { ...focus, ts: Date.now() } : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const clearPendingNavFocus = useCallback(() => setPendingNavFocus(null), []);

  const selectBrainHub = useCallback<StackContextValue['selectBrainHub']>((hubId, options) => {
    const validHub = BRAIN_HUBS.find((h) => h.id === hubId) ?? BRAIN_HUBS[0];
    const resolvedAppId =
      options?.appId && SPENTA_APPS.some((a) => a.id === options.appId)
        ? options.appId
        : SPENTA_APPS.find((a) => a.hubId === validHub.id)?.id;

    setActiveBrainSelection((prev) => ({
      hubId: validHub.id,
      appId: resolvedAppId,
      source: options?.source ?? 'brain',
      pathwayBranchId: options?.pathwayBranchId,
      pathwayNodeCode: options?.pathwayNodeCode,
      pathwayNodeTitle: options?.pathwayNodeTitle,
      nonce: prev.nonce + 1,
    }));
  }, []);

  const linkPathwayNodeToBrain = useCallback<StackContextValue['linkPathwayNodeToBrain']>(
    (options) => {
      const target = resolveBrainHubForPathwayNode(options);
      setActiveBrainSelection((prev) => ({
        hubId: target.hubId,
        appId: target.appId,
        source: 'pathway',
        pathwayBranchId: options.branchId,
        pathwayNodeCode: options.nodeCode,
        pathwayNodeTitle: options.nodeTitle,
        nonce: prev.nonce + 1,
      }));

      if (options.navigateToBrain) {
        navigateToItem('The Brain', {
          type: 'brain-hub',
          id: target.hubId,
          appId: target.appId,
          open3D: options.open3D !== false,
          returnTab: options.returnTab,
          returnLabel: options.returnLabel,
        });
      }

      return target;
    },
    [navigateToItem],
  );

  const appMap = useMemo(
    () => Object.fromEntries(SPENTA_APPS.map((app) => [app.id, app])) as Record<string, SpentaApp>,
    [],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STACK_STORAGE_KEY, JSON.stringify(selectedIds));
    } catch {
      // ignore storage quota errors
    }
  }, [selectedIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(savedProposals));
    } catch {
      // ignore storage quota errors
    }
  }, [savedProposals]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CORE_CONFIG_STORAGE_KEY, JSON.stringify(coreLayerConfigs));
    } catch {
      // ignore storage quota errors
    }
  }, [coreLayerConfigs]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CORE_AUDIT_STORAGE_KEY, JSON.stringify(coreAuditLog));
    } catch {
      // ignore storage quota errors
    }
  }, [coreAuditLog]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DEPLOYMENT_TARGET_STORAGE_KEY, deploymentTarget);
    } catch {
      // ignore storage quota errors
    }
  }, [deploymentTarget]);

  useEffect(() => {
    if (!autoNotice) return;
    const timer = window.setTimeout(() => setAutoNotice(null), 5500);
    return () => window.clearTimeout(timer);
  }, [autoNotice]);

  const toggleApp = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        setAutoNotice(null);
        return prev.filter((item) => item !== id);
      }
      const target = appMap[id];
      if (!target) return prev;
      const next = new Set([...prev, id]);
      const addedDeps: string[] = [];

      const attachDeps = (modId: string) => {
        const mod = appMap[modId];
        if (!mod) return;
        mod.depends.forEach((dep) => {
          if (!next.has(dep)) {
            next.add(dep);
            addedDeps.push(appMap[dep]?.shortName ?? dep);
            attachDeps(dep);
          }
        });
      };
      attachDeps(id);

      if (addedDeps.length > 0) {
        setAutoNotice(`Auto-attached required dependency: ${addedDeps.join(', ')}`);
      } else {
        setAutoNotice(null);
      }
      return Array.from(next);
    });
  };

  const applyRecipe = (recipeId: string) => {
    const recipe = STARTER_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    setSelectedIds(recipe.ids);
    setAutoNotice(`Loaded "${recipe.name}" (${recipe.pattern}) — ${recipe.ids.length} modules ready`);
    setDrawerOpen(true);
  };

  const clearStack = () => {
    setSelectedIds([]);
    setAutoNotice('Cleared composed stack');
  };

  const selectedApps = useMemo(
    () => selectedIds.map((id) => appMap[id]).filter(Boolean),
    [selectedIds, appMap],
  );

  const stackMetrics = useMemo<StackMetrics>(() => {
    if (selectedApps.length === 0) {
      return {
        totalSetupUsd: 0,
        blendedGmPct: 0,
        tier: 4,
        activeLayers: new Set<string>(),
        synergyPairs: [],
        escalatedByCount: false,
      };
    }

    const totalSetupUsd = selectedApps.reduce((sum, app) => sum + app.setupUsd, 0);
    const blendedGmPct =
      selectedApps.reduce((sum, app) => sum + app.gmPct, 0) / selectedApps.length;

    let minTier = Math.min(...selectedApps.map((app) => app.minServerTier)) as ServerTierId;
    let escalatedByCount = false;
    if (selectedApps.length >= 6 && minTier > 1) {
      minTier = (minTier - 1) as ServerTierId;
      escalatedByCount = true;
    }

    const activeLayers = new Set<string>();
    selectedApps.forEach((app) => app.layers.forEach((l) => activeLayers.add(l)));

    const synergyPairs: [string, string][] = [];
    const seen = new Set<string>();
    selectedApps.forEach((app) => {
      app.integratesWith.forEach((targetId) => {
        if (selectedIds.includes(targetId) && appMap[targetId]) {
          const key = [app.id, targetId].sort().join('::');
          if (!seen.has(key)) {
            seen.add(key);
            synergyPairs.push([app.shortName, appMap[targetId].shortName]);
          }
        }
      });
    });

    return {
      totalSetupUsd,
      blendedGmPct,
      tier: minTier,
      activeLayers,
      synergyPairs,
      escalatedByCount,
    };
  }, [selectedApps, selectedIds, appMap]);

  const projectArchitectureMetadata = useMemo<ProjectArchitectureMetadata>(() => {
    const tierSpec = SERVER_TIERS[stackMetrics.tier];
    const layers = Object.values(coreLayerConfigs);
    return {
      project: 'Spenta Sovereign OS',
      updatedAt: architectureUpdatedAt,
      infrastructureTarget: {
        id: deploymentProfile.id,
        environment: deploymentProfile.switcherLabel,
        topology: deploymentProfile.title,
        transport: deploymentProfile.transport,
        enclaveBoundary: deploymentProfile.enclaveBoundary,
        latencyBudget: deploymentProfile.latencyBudget,
        egressPolicy: deploymentProfile.egressPolicy,
        compliancePosture: deploymentProfile.compliancePosture,
        costPosture: deploymentProfile.costPosture,
      },
      stackSizing: {
        activeModules: selectedApps.length,
        recommendedTier: `${tierSpec.code} (${tierSpec.name})`,
        estimatedBuildUsd: stackMetrics.totalSetupUsd,
      },
      governanceSummary: {
        teeEnabledLayers: layers.filter((l) => l.teeEnabled).length,
        strictOpaLayers: layers.filter((l) => l.policyMode === 'Strict OPA (>= 0.88 HITL)').length,
        airGappedLayers: layers.filter((l) => l.isolationMode === 'Air-Gapped On-Prem').length,
        vpcLayers: layers.filter((l) => l.isolationMode === 'Private Sovereign VPC').length,
      },
      coreLayers: coreLayerConfigs,
    };
  }, [
    architectureUpdatedAt,
    coreLayerConfigs,
    deploymentProfile,
    selectedApps.length,
    stackMetrics.tier,
    stackMetrics.totalSetupUsd,
  ]);

  const buildExecutiveBrief = () => {
    const tierSpec = SERVER_TIERS[stackMetrics.tier];
    const lines = [
      'SPENTA SOVEREIGN OS — COMPOSED ARCHITECTURE BRIEF',
      '================================================',
      `Infrastructure Target: ${deploymentProfile.title} (${deploymentProfile.switcherLabel})`,
      `  Transport: ${deploymentProfile.transport}`,
      `  Enclave Boundary: ${deploymentProfile.enclaveBoundary}`,
      `  Latency Budget: ${deploymentProfile.latencyBudget}`,
      `  Egress & Compliance: ${deploymentProfile.egressPolicy} | ${deploymentProfile.compliancePosture}`,
      '',
      `Selected Modules (${selectedApps.length}/13):`,
      ...selectedApps.map(
        (a, i) =>
          `  ${i + 1}. ${a.name} (${a.setupLabel} | ${a.gmPct.toFixed(1)}% GM | ${a.recurringLabel})`,
      ),
      '',
      `Verified Native Integrations (${stackMetrics.synergyPairs.length}):`,
      ...(stackMetrics.synergyPairs.length > 0
        ? stackMetrics.synergyPairs.map(([a, b]) => `  - ${a} <-> ${b}`)
        : ['  - Standalone deployment']),
      '',
      `Active Sovereign Layers: ${Array.from(stackMetrics.activeLayers).sort().join(', ') || 'None'}`,
      `Recommended Server Baseline: ${tierSpec.code} — ${tierSpec.name}`,
      `  Hardware: ${tierSpec.hardware} (${tierSpec.vramRam})`,
      `  Est. CapEx: ${tierSpec.capex} | Throughput: ${tierSpec.speed}`,
      '',
      `Estimated Build Scope: $${(stackMetrics.totalSetupUsd / 1000).toFixed(1)}K`,
      `Blended Conservative GM: ${stackMetrics.blendedGmPct.toFixed(1)}%`,
      `Governance Baseline: OPA Policy-as-Code + 0.88 Confidence HITL Gate`,
      `Contact: ${SPENTA_CONTACT_EMAIL}`,
    ];
    return lines.join('\n');
  };

  const exportStackJson = (extra?: Record<string, unknown>) => {
    const tierSpec = SERVER_TIERS[stackMetrics.tier];
    const payload = {
      platform: 'Spenta Sovereign OS',
      exportedAt: new Date().toISOString(),
      contact: SPENTA_CONTACT_EMAIL,
      infrastructureTarget: {
        id: deploymentProfile.id,
        label: deploymentProfile.switcherLabel,
        title: deploymentProfile.title,
        transport: deploymentProfile.transport,
        enclaveBoundary: deploymentProfile.enclaveBoundary,
        latencyBudget: deploymentProfile.latencyBudget,
        egressPolicy: deploymentProfile.egressPolicy,
        compliancePosture: deploymentProfile.compliancePosture,
        costPosture: deploymentProfile.costPosture,
      },
      selectedCount: selectedApps.length,
      estimatedBuildScopeUsd: stackMetrics.totalSetupUsd,
      blendedConservativeGmPct: Number(stackMetrics.blendedGmPct.toFixed(1)),
      activeSovereignLayers: Array.from(stackMetrics.activeLayers).sort(),
      coreLayerConfigs,
      recommendedServerTier: tierSpec,
      verifiedSynergyPairs: stackMetrics.synergyPairs,
      modules: selectedApps.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        engine: a.engine,
        setupUsd: a.setupUsd,
        recurringLabel: a.recurringLabel,
        gmPct: a.gmPct,
        layers: a.layers,
        depends: a.depends,
        proofClient: a.proofClient,
      })),
      ...(extra ?? {}),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spenta-sovereign-stack-${deploymentProfile.id}-${selectedApps.length}apps.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const buildMailtoHref = (subject?: string, bodyExtra?: string) => {
    const sub =
      subject ??
      `Spenta Sovereign OS Stack Proposal (${selectedApps.length} Modules — $${(
        stackMetrics.totalSetupUsd / 1000
      ).toFixed(1)}K)`;
    const body = bodyExtra ? `${bodyExtra}\n\n${buildExecutiveBrief()}` : buildExecutiveBrief();
    return `mailto:${SPENTA_CONTACT_EMAIL}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(
      body,
    )}`;
  };

  const saveProposal: StackContextValue['saveProposal'] = (input) => {
    const created: SavedProposal = {
      ...input,
      id: `prop_${Date.now()}`,
      createdAt: new Date().toISOString(),
      appIds: selectedApps.map((a) => a.id),
      appNames: selectedApps.map((a) => a.shortName),
      estimatedBuildUsd: stackMetrics.totalSetupUsd,
      blendedGmPct: Number(stackMetrics.blendedGmPct.toFixed(1)),
      recommendedTier: stackMetrics.tier,
    };
    setSavedProposals((prev) => [created, ...prev]);
    return created;
  };

  const deleteProposal = (id: string) => {
    setSavedProposals((prev) => prev.filter((p) => p.id !== id));
  };

  const logCoreAuditEvent: StackContextValue['logCoreAuditEvent'] = (entry) => {
    const created: CoreAuditEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    setCoreAuditLog((prev) => [created, ...prev].slice(0, 200));
  };

  const updateCoreLayerConfig: StackContextValue['updateCoreLayerConfig'] = (
    layerId,
    patch,
    actionLabel,
    actor = 'Sovereign Architect',
  ) => {
    const current = coreLayerConfigs[layerId];
    if (!current) return;

    const fieldLabels: Record<keyof LayerConfig, string> = {
      isolationMode: 'Deployment Isolation',
      policyMode: 'OPA Policy Mode',
      teeEnabled: 'Hardware TEE (SEV-SNP/TDX)',
      slaTarget: 'Target SLA Profile',
    };

    const formatFieldValue = (key: keyof LayerConfig, val: LayerConfig[keyof LayerConfig]) => {
      if (key === 'teeEnabled') {
        return val ? 'Enabled (AMD SEV-SNP / Intel TDX)' : 'Disabled';
      }
      return String(val);
    };

    const newEntries: CoreAuditEntry[] = [];
    const nowIso = new Date().toISOString();

    (Object.keys(patch) as (keyof LayerConfig)[]).forEach((key) => {
      const nextVal = patch[key];
      if (nextVal === undefined || nextVal === current[key]) return;
      newEntries.push({
        id: `audit_${Date.now()}_${key}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: nowIso,
        actor,
        layer: layerId,
        action: actionLabel ?? `Updated ${layerId} ${fieldLabels[key]}`,
        field: fieldLabels[key],
        previousValue: formatFieldValue(key, current[key]),
        newValue: formatFieldValue(key, nextVal),
      });
    });

    if (newEntries.length === 0) return;

    setCoreLayerConfigs((prev) => ({
      ...prev,
      [layerId]: { ...prev[layerId], ...patch },
    }));
    setArchitectureUpdatedAt(nowIso);
    setCoreAuditLog((prev) => [...newEntries, ...prev].slice(0, 200));
  };

  const resetCoreLayerConfig: StackContextValue['resetCoreLayerConfig'] = (
    layerId,
    actor = 'Sovereign Architect',
  ) => {
    const baseline = DEFAULT_CORE_LAYER_CONFIGS[layerId];
    updateCoreLayerConfig(layerId, baseline, `Reset ${layerId} to Sovereign Baseline`, actor);
  };

  const setDeploymentTarget: StackContextValue['setDeploymentTarget'] = (
    target,
    actor = 'Studio Architect',
  ) => {
    if (target === deploymentTarget) return;
    const prevProfile = DEPLOYMENT_PROFILES[deploymentTarget];
    const nextProfile = DEPLOYMENT_PROFILES[target];
    setDeploymentTargetState(target);
    setCoreLayerConfigs({
      L1: { ...nextProfile.layerPresets.L1 },
      L2: { ...nextProfile.layerPresets.L2 },
      L3: { ...nextProfile.layerPresets.L3 },
      L4: { ...nextProfile.layerPresets.L4 },
      L5: { ...nextProfile.layerPresets.L5 },
      L6: { ...nextProfile.layerPresets.L6 },
    });
    setArchitectureUpdatedAt(new Date().toISOString());
    logCoreAuditEvent({
      actor,
      layer: 'Hardware',
      action: 'Switched Infrastructure Target Environment',
      field: 'Deployment Topology & L1–L6 Presets',
      previousValue: prevProfile.shortLabel,
      newValue: `${nextProfile.shortLabel} (${nextProfile.latencyBudget})`,
    });
    setAutoNotice(
      `Infrastructure target switched to ${nextProfile.shortLabel} — L1–L6 architecture metadata updated`,
    );
  };

  const clearCoreAuditLog = () => {
    setCoreAuditLog([]);
  };

  const dismissSharedSnapshot = () => {
    setSharedSnapshotSummary(null);
    clearShareUrlParams();
  };

  const resetToLocalDefaults = () => {
    setSelectedIds(DEFAULT_SELECTED_IDS);
    setDeploymentTargetState('on-prem');
    setCoreLayerConfigs({ ...DEFAULT_CORE_LAYER_CONFIGS });
    setHitlConfidence(0.91);
    setPaletteMode('nocturnal');
    setActiveBrainSelection((prev) => ({
      hubId: 'fintech',
      appId: 'icr_ops',
      source: 'brain',
      nonce: prev.nonce + 1,
    }));
    setSharedSnapshotSummary(null);
    clearShareUrlParams();
    setAutoNotice('Restored default Spenta Sovereign OS baseline configuration');
  };

  const buildShareUrl: StackContextValue['buildShareUrl'] = (overrides) =>
    buildShareableUrl({
      selectedIds,
      deploymentTarget,
      paletteMode,
      activeTab: overrides?.tab ?? activeTab,
      hitlConfidence,
      hubId:
        overrides?.hubId !== undefined
          ? overrides.hubId
          : (overrides?.tab ?? activeTab) === 'The Brain'
            ? activeBrainSelection.hubId
            : null,
      brainMode: overrides?.brainMode,
    });

  return (
    <StackContext.Provider
      value={{
        theme,
        paletteMode,
        setTheme,
        setPaletteMode,
        toggleTheme,
        commandPaletteOpen,
        setCommandPaletteOpen,
        activeTab,
        setActiveTab,
        pendingNavFocus,
        navigateToItem,
        clearPendingNavFocus,
        aiAssistantOpen,
        setAiAssistantOpen,
        selectedIds,
        selectedApps,
        appMap,
        toggleApp,
        applyRecipe,
        clearStack,
        drawerOpen,
        setDrawerOpen,
        autoNotice,
        setAutoNotice,
        hitlConfidence,
        setHitlConfidence,
        stackMetrics,
        savedProposals,
        saveProposal,
        deleteProposal,
        exportStackJson,
        buildExecutiveBrief,
        buildMailtoHref,
        deploymentTarget,
        deploymentProfile,
        projectArchitectureMetadata,
        setDeploymentTarget,
        coreLayerConfigs,
        coreAuditLog,
        updateCoreLayerConfig,
        resetCoreLayerConfig,
        logCoreAuditEvent,
        clearCoreAuditLog,
        sharedSnapshotSummary,
        dismissSharedSnapshot,
        resetToLocalDefaults,
        buildShareUrl,
        activeBrainSelection,
        selectBrainHub,
        linkPathwayNodeToBrain,
      }}
    >
      {children}
    </StackContext.Provider>
  );
}

export function useStack() {
  const ctx = useContext(StackContext);
  if (!ctx) throw new Error('useStack must be used inside StackProvider');
  return ctx;
}
