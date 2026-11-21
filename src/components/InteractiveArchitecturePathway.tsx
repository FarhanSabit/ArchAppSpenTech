import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  GitBranch,
  Layers,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Server,
  Shield,
  Sun,
  X,
} from 'lucide-react';
import {
  SERVER_TIERS,
  SOVEREIGN_STACK_LAYERS,
  SPENTA_APPS,
} from '../data/spentaManifest';
import { downloadMarkdownFile } from '../data/promptThemeStudioData';
import { useStack } from '../store/StackContext';

export type DeploymentProviderId = 'on-prem' | 'private-vpc' | 'air-gapped';

interface DeploymentProfileSpec {
  id: DeploymentProviderId;
  shortLabel: string;
  title: string;
  transport: string;
  enclaveBoundary: string;
  latencyBudget: string;
  costPosture: string;
  tradeOffGuidance: string;
  failurePitfall: string;
}

const DEPLOYMENT_PROFILES: Record<DeploymentProviderId, DeploymentProfileSpec> = {
  'on-prem': {
    id: 'on-prem',
    shortLabel: 'Sovereign On-Prem',
    title: 'Customer-Owned On-Premises Appliance (Tier 1–4)',
    transport: 'Local Loopback NVLink + 10GbE LAN mTLS',
    enclaveBoundary: 'AMD SEV-SNP / Intel TDX on Client Rack (0 bytes cloud egress)',
    latencyBudget: '<35ms LAN · <50ms Edge',
    costPosture: 'One-time CapEx ($3.2K–$15.3K) · Zero GPU token burn',
    tradeOffGuidance:
      'Maximizes regulatory sovereignty (BB ICT v4.0 / HIPAA) and eliminates per-token OpEx; requires scheduled local NVMe snapshot replication.',
    failurePitfall:
      'Pitfall: Single-PSU workstation power loss halts live OCR queues. Mitigation: Dual-node active/passive failover + encrypted local NAS backup.',
  },
  'private-vpc': {
    id: 'private-vpc',
    shortLabel: 'Private VPC',
    title: 'Dedicated Single-Tenant Sovereign VPC',
    transport: 'WireGuard mTLS Mesh + PrivateLink Peering',
    enclaveBoundary: 'Confidential Compute VM + Customer-Managed KMS Keys (BYOK)',
    latencyBudget: '45–95ms Regional Backbone',
    costPosture: 'Reserved Dedicated GPU OpEx + Zero Multi-Tenant Bleed',
    tradeOffGuidance:
      'Enables elastic multi-region bursting for distributed retail chains (65+ showrooms) while retaining encrypted single-tenant isolation.',
    failurePitfall:
      'Pitfall: Cross-AZ egress spikes or misconfigured NAT routes leaking embeddings. Mitigation: Strict OPA egress deny-by-default & private endpoint DNS lock.',
  },
  'air-gapped': {
    id: 'air-gapped',
    shortLabel: 'Air-Gapped Enclave',
    title: 'Zero-Internet Air-Gapped Defense & Core Banking Enclave',
    transport: 'Unidirectional Hardware Data Diode + Signed Offline Bundles',
    enclaveBoundary: 'Physical Faraday / HSM Hardware Root-of-Trust (No External NIC)',
    latencyBudget: '<28ms Deterministic Enclave Bus',
    costPosture: 'Dedicated Dual-Redundant CapEx + Quarterly Signed Model Drops',
    tradeOffGuidance:
      'Eliminates remote exfiltration surface entirely for defense, sovereign health registries, and Tier-1 banking cores.',
    failurePitfall:
      'Pitfall: Model drift or stale AML/clinical ontologies without internet sync. Mitigation: Cryptographically signed SHA-256 offline weight & policy cassettes.',
  },
};

interface WalkthroughHop {
  stepNumber: number;
  trunkId: string;
  branchId: string;
  title: string;
  payloadSummary: string;
  latencyTarget: string;
  pitfallMitigation: string;
}

interface RequestWalkthroughTrace {
  id: 'banking-icr' | 'hospital-hl7' | 'xltd-baas';
  label: string;
  subtitle: string;
  hops: WalkthroughHop[];
}

const REQUEST_TRACES: RequestWalkthroughTrace[] = [
  {
    id: 'banking-icr',
    label: 'Banking ICR → 0.88 OPA Gate',
    subtitle: 'Handwritten Bangla/EN SME loan packet processed inside client firewall',
    hops: [
      {
        stepNumber: 1,
        trunkId: 'trunk-core',
        branchId: 'branch-layer-L1',
        title: 'Ingress & Local TLS Termination (L1/L2)',
        payloadSummary: '300 DPI multi-page loan PDF + NID scan ingested via branch scanner queue.',
        latencyTarget: '140ms',
        pitfallMitigation: 'Strip EXIF/PII metadata outside enclave; enforce zero external DNS egress.',
      },
      {
        stepNumber: 2,
        trunkId: 'trunk-ops',
        branchId: 'branch-app-icr_ops',
        title: 'LLaMA 3.2 Vision + LayoutLMv3 Extraction',
        payloadSummary: '14 structured collateral, guarantor & handwritten Bangla fields extracted locally.',
        latencyTarget: '18.4s (<30s SLA)',
        pitfallMitigation: 'Quantized INT4/FP8 batching prevents VRAM OOM on 96GB Tier-3 baselines.',
      },
      {
        stepNumber: 3,
        trunkId: 'trunk-governance',
        branchId: 'branch-opa-gate',
        title: '0.88 Confidence OPA Circuit Breaker',
        payloadSummary: 'Field-level score evaluated (0.94 Pass vs 0.81 Hold) against opa.bfsi.icr_v4.',
        latencyTarget: '24ms',
        pitfallMitigation: 'Any signature smudge <0.88 halts auto-commit and routes to React verifier.',
      },
      {
        stepNumber: 4,
        trunkId: 'trunk-core',
        branchId: 'branch-layer-L5',
        title: 'Immutable PostgreSQL / Kafka Core Commit',
        payloadSummary: 'Signed SHA-256 inference hash + extracted JSON written to core banking ledger.',
        latencyTarget: '38ms',
        pitfallMitigation: 'Idempotency key prevents duplicate loan disbursements on retry.',
      },
      {
        stepNumber: 5,
        trunkId: 'trunk-hardware',
        branchId: 'branch-tier-3',
        title: 'On-Prem Tier-3 Enclave Attestation',
        payloadSummary: 'Audit trail archived to local encrypted NVMe/NAS with zero cloud bytes sent.',
        latencyTarget: '12ms',
        pitfallMitigation: 'Daily offline snapshot verification prevents silent ledger corruption.',
      },
    ],
  },
  {
    id: 'hospital-hl7',
    label: 'Hospital HL7 Shift Handover',
    subtitle: 'Clinical ERP + Handwritten Rx OCR + Nurse Rostering inside hospital LAN',
    hops: [
      {
        stepNumber: 1,
        trunkId: 'trunk-ops',
        branchId: 'branch-app-healthcare_erp',
        title: 'HL7/FHIR Ward Vitals & Rx Intake',
        payloadSummary: 'Aggregates 24-bed ICU vitals stream, lab flags, and handwritten discharge scripts.',
        latencyTarget: '110ms',
        pitfallMitigation: 'Strict HL7 v2/FHIR schema validation drops malformed telemetry before LLM prompt.',
      },
      {
        stepNumber: 2,
        trunkId: 'trunk-core',
        branchId: 'branch-layer-L3',
        title: 'Local Clinical LLM Synthesis (L3)',
        payloadSummary: 'Generates prioritized shift handover brief with drug-interaction warnings.',
        latencyTarget: '1.9s',
        pitfallMitigation: 'Corrective RAG grounds dosage checks solely against approved hospital formulary.',
      },
      {
        stepNumber: 3,
        trunkId: 'trunk-governance',
        branchId: 'branch-opa-gate',
        title: 'Clinical Safety 0.88 HITL Gate',
        payloadSummary: 'Flags ambiguous dosage (0.81 confidence) for attending MD sign-off queue.',
        latencyTarget: '19ms',
        pitfallMitigation: 'Zero silent clinical auto-commits when confidence drops below 0.88.',
      },
      {
        stepNumber: 4,
        trunkId: 'trunk-core',
        branchId: 'branch-layer-L6',
        title: 'Omni-Channel Clinician Handoff UI (L6)',
        payloadSummary: 'Delivers verified handover checklist to nursing tablet with highlighted Rx crops.',
        latencyTarget: '45ms',
        pitfallMitigation: 'RBAC ward scoping prevents cross-department patient PHI exposure.',
      },
    ],
  },
  {
    id: 'xltd-baas',
    label: 'X Ltd <50ms EV Battery Swap',
    subtitle: 'Sub-50ms Wasm/MQTT edge inference across 80 BaaS stations & 480 EVs',
    hops: [
      {
        stepNumber: 1,
        trunkId: 'trunk-governance',
        branchId: 'branch-xltd-mobility',
        title: 'BaaS Cabinet & EV BMS Telemetry Burst',
        payloadSummary: 'Cell voltage, thermal gradient, and rider RFID streamed over local MQTT broker.',
        latencyTarget: '9ms',
        pitfallMitigation: 'Edge store-and-forward ring buffer survives 4G backhaul blackouts.',
      },
      {
        stepNumber: 2,
        trunkId: 'trunk-exp',
        branchId: 'branch-app-iot_edge',
        title: 'Wasm Quantized Edge Anomaly Scoring',
        payloadSummary: 'Local Green AI model predicts cell degradation & selects optimal charged bay.',
        latencyTarget: '22ms (<50ms SLA)',
        pitfallMitigation: 'Thermal threshold hardware interlock overrides software if cell >58°C.',
      },
      {
        stepNumber: 3,
        trunkId: 'trunk-core',
        branchId: 'branch-layer-L1',
        title: 'Sovereign IIoT Gateway Actuation (L1)',
        payloadSummary: 'Unlocks verified battery bay and signs swap telemetry event.',
        latencyTarget: '11ms',
        pitfallMitigation: 'Mutual TLS device certificates block spoofed cabinet unlock commands.',
      },
      {
        stepNumber: 4,
        trunkId: 'trunk-hardware',
        branchId: 'branch-tier-4',
        title: 'Tier-4 Branch Node ESG Carbon Sync',
        payloadSummary: 'Commits Scope 2/3 carbon savings to regional X Ltd fleet ledger.',
        latencyTarget: '34ms',
        pitfallMitigation: 'Idempotent batch replay prevents double-counted carbon offset credits.',
      },
    ],
  },
];

export interface PathwayComposition {
  id: string;
  code: string;
  label: string;
  detail: string;
  metric: string;
  kind: 'capability' | 'protocol' | 'hardware' | 'synergy' | 'proof';
  linkedAppId?: string;
}

export interface PathwayBranchNode {
  id: string;
  code: string;
  title: string;
  role: string;
  metric: string;
  summary: string;
  layers?: string[];
  proofClient?: string;
  appId?: string;
  compositions: PathwayComposition[];
}

export interface PathwayTrunkNode {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  metric: string;
  summary: string;
  accentTone: 'navy' | 'emerald' | 'teal' | 'amber';
  branches: PathwayBranchNode[];
}

interface HoveredTipState {
  title: string;
  code: string;
  summary: string;
  metric: string;
  hint: string;
}

interface InteractiveArchitecturePathwayProps {
  compact?: boolean;
  defaultExpandedTrunks?: string[];
  syncedPolarity?: 'light' | 'dark';
  onPolarityChange?: (next: 'light' | 'dark') => void;
}

function buildPathwayTree(profile: DeploymentProfileSpec): PathwayTrunkNode[] {
  const opsApps = SPENTA_APPS.filter((a) => a.engine === 'operations');
  const expApps = SPENTA_APPS.filter((a) => a.engine === 'experience' || a.engine === 'fusion');

  return [
    {
      id: 'trunk-core',
      index: '01',
      title: 'Sovereign Fusion Core (L1–L6)',
      subtitle: `${profile.enclaveBoundary} · ${profile.transport}`,
      metric: `6 Layers · ${profile.latencyBudget}`,
      summary:
        'Vertical sovereign kernel isolating every model weight, vector store, and enterprise ledger inside customer-controlled boundaries.',
      accentTone: 'navy',
      branches: SOVEREIGN_STACK_LAYERS.map((layer) => ({
        id: `branch-layer-${layer.id}`,
        code: layer.id,
        title: layer.title,
        role: `${layer.subtitle} (${profile.shortLabel})`,
        metric: layer.slaMetric,
        summary: layer.summary,
        layers: [layer.id],
        compositions: [
          ...layer.protocols.slice(0, 2).map((p, i) => ({
            id: `${layer.id}-proto-${i}`,
            code: `${layer.id}.P${i + 1}`,
            label: p,
            detail: `Transport enforced under ${profile.shortLabel}: ${profile.transport}.`,
            metric: layer.slaMetric,
            kind: 'protocol' as const,
          })),
          ...layer.securityControls.slice(0, 2).map((c, i) => ({
            id: `${layer.id}-sec-${i}`,
            code: `${layer.id}.S${i + 1}`,
            label: c,
            detail: `Boundary attested via ${profile.enclaveBoundary}.`,
            metric: 'Attested',
            kind: 'capability' as const,
          })),
        ],
      })),
    },
    {
      id: 'trunk-ops',
      index: '02',
      title: 'Operations Engine (Core ERP & Regulated AI)',
      subtitle: 'Healthcare, Banking ICR, Sovereign MIS, Cyber SLA & Legacy Modernization',
      metric: `${opsApps.length} Composable Modules`,
      summary:
        'Mission-critical operational suites engineered for regulated hospitals, Tier-1 banks, and multi-entity conglomerates.',
      accentTone: 'emerald',
      branches: opsApps.map((app, idx) => ({
        id: `branch-app-${app.id}`,
        code: `02.${idx + 1}`,
        title: app.shortName,
        role: app.category,
        metric: `${app.setupLabel} · ${app.gmPct.toFixed(1)}% GM`,
        summary: app.tagline,
        layers: app.layers,
        proofClient: app.proofClient,
        appId: app.id,
        compositions: [
          ...app.coreCapabilities.map((cap, cIdx) => ({
            id: `${app.id}-cap-${cIdx}`,
            code: `C${cIdx + 1}`,
            label: cap,
            detail: `Core functional block shipped with ${app.name}.`,
            metric: `Tier ${app.minServerTier} Min`,
            kind: 'capability' as const,
          })),
          ...app.integratesWith.slice(0, 2).map((synId, sIdx) => ({
            id: `${app.id}-syn-${sIdx}`,
            code: `SYN`,
            label: `Integrates → ${SPENTA_APPS.find((x) => x.id === synId)?.shortName ?? synId}`,
            detail: `Zero-ETL event bus integration routed over ${profile.transport}.`,
            metric: 'Native Bus',
            kind: 'synergy' as const,
            linkedAppId: synId,
          })),
        ],
      })),
    },
    {
      id: 'trunk-exp',
      index: '03',
      title: 'Experience, Spatial XR & IR4 Engine',
      subtitle: 'Digital Twins, Multilingual Voice AI, WebAR Retail, IoT Edge & Agentic Workflows',
      metric: `${expApps.length} Composable Modules`,
      summary:
        'High-margin experience, spatial twin, voice assistant, and quantized <50ms edge intelligence modules.',
      accentTone: 'teal',
      branches: expApps.map((app, idx) => ({
        id: `branch-app-${app.id}`,
        code: `03.${idx + 1}`,
        title: app.shortName,
        role: app.category,
        metric: `${app.setupLabel} · ${app.gmPct.toFixed(1)}% GM`,
        summary: app.tagline,
        layers: app.layers,
        proofClient: app.proofClient,
        appId: app.id,
        compositions: [
          ...app.coreCapabilities.map((cap, cIdx) => ({
            id: `${app.id}-cap-${cIdx}`,
            code: `C${cIdx + 1}`,
            label: cap,
            detail: `Core capability inside ${app.name}.`,
            metric: app.layers.join('/'),
            kind: 'capability' as const,
          })),
          ...app.integratesWith.slice(0, 2).map((synId, sIdx) => ({
            id: `${app.id}-syn-${sIdx}`,
            code: `SYN`,
            label: `Integrates → ${SPENTA_APPS.find((x) => x.id === synId)?.shortName ?? synId}`,
            detail: `Bidirectional telemetry and workflow trigger over ${profile.transport}.`,
            metric: 'Native Bus',
            kind: 'synergy' as const,
            linkedAppId: synId,
          })),
        ],
      })),
    },
    {
      id: 'trunk-hardware',
      index: '04',
      title: 'On-Prem Server Matrix & Dual-Shore Delivery',
      subtitle: `${profile.costPosture} · 20-FTE Dhaka R&D Hub`,
      metric: '4 Tiers · $11.50/hr Pod',
      summary:
        'Predictable CapEx server appliances eliminating variable cloud GPU burn, paired with dual-shore San Jose · Australia · Dhaka engineering pods.',
      accentTone: 'navy',
      branches: Object.values(SERVER_TIERS).map((tier) => ({
        id: `branch-tier-${tier.id}`,
        code: tier.code,
        title: tier.name,
        role: tier.modelScale,
        metric: `${tier.capex} · ${tier.speed}`,
        summary: `${tier.hardware} — ${tier.idealFor}`,
        compositions: [
          {
            id: `tier-${tier.id}-hw`,
            code: 'HW',
            label: tier.hardware,
            detail: `Unified memory / VRAM envelope: ${tier.vramRam}.`,
            metric: tier.vramRam,
            kind: 'hardware',
          },
          {
            id: `tier-${tier.id}-st`,
            code: 'NVMe',
            label: `Storage: ${tier.storage}`,
            detail: `Configured for ${profile.shortLabel} with encrypted audit ledger.`,
            metric: tier.capex,
            kind: 'hardware',
          },
          {
            id: `tier-${tier.id}-tp`,
            code: 'TPS',
            label: `Throughput: ${tier.speed}`,
            detail: tier.idealFor,
            metric: tier.modelScale,
            kind: 'proof',
          },
        ],
      })),
    },
    {
      id: 'trunk-governance',
      index: '05',
      title: '0.88 OPA HITL Gate & Captive Distribution Proofs',
      subtitle: 'Policy-as-Code verification circuit breaker + BEST Retail & X Ltd Mobility rollouts',
      metric: '≥0.88 Auto · 65+ Sites',
      summary:
        'Deterministic human-in-the-loop governance verified across live sister-entity retail and EV battery-swap networks.',
      accentTone: 'amber',
      branches: [
        {
          id: 'branch-opa-gate',
          code: '05.1',
          title: '0.88 Confidence OPA Circuit Breaker',
          role: 'Deterministic Policy-as-Code Gate',
          metric: '≥0.88 Commit / <0.88 Queue',
          summary:
            'Every model inference is scored by Open Policy Agent before touching PostgreSQL/Kafka core ledgers.',
          layers: ['L5', 'L6'],
          compositions: [
            {
              id: 'opa-auto',
              code: 'PASS',
              label: 'Auto-Commit Path (Score ≥ 0.88)',
              detail: 'Cryptographically signs inference hash and commits directly to ledger.',
              metric: '<40ms',
              kind: 'protocol',
            },
            {
              id: 'opa-hitl',
              code: 'HOLD',
              label: 'Human Audit Verifier (Score < 0.88)',
              detail: 'Routes low-confidence fields to React Digital Twin side-by-side verifier.',
              metric: 'Zero Silent Errors',
              kind: 'capability',
            },
          ],
        },
        {
          id: 'branch-best-retail',
          code: '05.2',
          title: 'BEST Electronics Captive Network',
          role: 'Sister-Entity Retail Proof',
          metric: '65+ Showrooms',
          summary:
            'Production deployment across 65+ retail showrooms uniting 365 Exchange Circular CRM, WebAR Try-On, and AI-Native GEO.',
          proofClient: 'BEST Electronics',
          compositions: [
            {
              id: 'best-crm',
              code: 'CRM',
              label: '365 Exchange Circular Trade-In',
              detail: 'Automated appliance valuation, lifecycle tracking, and omnichannel POS sync.',
              metric: '65+ Stores',
              kind: 'proof',
            },
            {
              id: 'best-ar',
              code: 'AR',
              label: 'WebAR Try-On & 3D DOOH',
              detail: 'Browser-native spatial placement driving higher retail showroom conversion.',
              metric: '76.3% XR GM',
              kind: 'proof',
            },
          ],
        },
        {
          id: 'branch-xltd-mobility',
          code: '05.3',
          title: 'X Ltd EV & BaaS Mobility Grid',
          role: 'Sister-Entity Energy Proof',
          metric: '80 Stations · 480 EVs',
          summary:
            'Real-time MQTT/Wasm edge telemetry orchestrating 80 battery swap stations, 480 electric vehicles, and Green AI carbon routing.',
          proofClient: 'X Ltd Mobility',
          compositions: [
            {
              id: 'xltd-baas',
              code: 'BaaS',
              label: '80 Battery Swap Telemetry Nodes',
              detail: 'Predictive cell degradation scoring and automated station balancing.',
              metric: '<50ms Edge',
              kind: 'proof',
            },
            {
              id: 'xltd-carbon',
              code: 'ESG',
              label: 'Green AI Carbon Ledger',
              detail: 'Auditable Scope 2/3 savings calculated per swap cycle.',
              metric: '480 EVs Live',
              kind: 'proof',
            },
          ],
        },
      ],
    },
  ];
}

function buildPathwayMarkdownExport(
  tree: PathwayTrunkNode[],
  profile: DeploymentProfileSpec,
  trace: RequestWalkthroughTrace,
): string {
  const lines: string[] = [
    '# Spenta Sovereign OS — Interactive OITS Dhaka × roadmap.sh Architecture Pathway',
    '',
    `> **Active Deployment Topology**: ${profile.title}`,
    `> **Transport**: ${profile.transport} | **Enclave**: ${profile.enclaveBoundary} | **Latency Budget**: ${profile.latencyBudget}`,
    `> **Trade-Off**: ${profile.tradeOffGuidance}`,
    `> **Pitfall & Mitigation**: ${profile.failurePitfall}`,
    '',
    `## Active Request Walkthrough: ${trace.label}`,
    ...trace.hops.map(
      (h) =>
        `${h.stepNumber}. **${h.title}** (${h.latencyTarget}) — ${h.payloadSummary} *Mitigation*: ${h.pitfallMitigation}`,
    ),
    '',
  ];
  tree.forEach((trunk) => {
    lines.push(`## ${trunk.index}. ${trunk.title} (${trunk.metric})`);
    lines.push(`${trunk.summary}\n`);
    trunk.branches.forEach((branch) => {
      lines.push(`- **${branch.code} ${branch.title}** — *${branch.role}* (${branch.metric})`);
      lines.push(`  - ${branch.summary}`);
      branch.compositions.forEach((comp) => {
        lines.push(`  - \`${comp.code}\` ${comp.label}: ${comp.detail} (${comp.metric})`);
      });
    });
    lines.push('');
  });
  return lines.join('\n');
}

export function InteractiveArchitecturePathway({
  compact = false,
  defaultExpandedTrunks = ['trunk-core', 'trunk-ops'],
  syncedPolarity,
  onPolarityChange,
}: InteractiveArchitecturePathwayProps) {
  const { theme, selectedIds, toggleApp, hitlConfidence, stackMetrics } = useStack();

  // Deployment Provider Swapping (system-design-explainer.vercel.app)
  const [providerId, setProviderId] = useState<DeploymentProviderId>('on-prem');
  const activeProfile = DEPLOYMENT_PROFILES[providerId];
  const tree = useMemo(() => buildPathwayTree(activeProfile), [activeProfile]);

  // Hop-by-Hop Request Walkthrough Player (systemdesignprimer.vercel.app)
  const [activeTraceId, setActiveTraceId] = useState<RequestWalkthroughTrace['id']>('banking-icr');
  const [activeHopIdx, setActiveHopIdx] = useState<number>(-1); // -1 = idle
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const activeTrace = useMemo(
    () => REQUEST_TRACES.find((t) => t.id === activeTraceId) ?? REQUEST_TRACES[0],
    [activeTraceId],
  );
  const currentHop = activeHopIdx >= 0 ? activeTrace.hops[activeHopIdx] ?? null : null;

  // Scoped OITS Dhaka polarity synced to portal theme or parent
  const [localPolarity, setLocalPolarity] = useState<'light' | 'dark'>(syncedPolarity ?? theme);
  useEffect(() => {
    setLocalPolarity(syncedPolarity ?? theme);
  }, [syncedPolarity, theme]);

  const setPolarity = (next: 'light' | 'dark') => {
    setLocalPolarity(next);
    onPolarityChange?.(next);
  };

  const [expandedTrunks, setExpandedTrunks] = useState<string[]>(defaultExpandedTrunks);
  const [expandedBranches, setExpandedBranches] = useState<string[]>([
    'branch-layer-L5',
    'branch-app-healthcare_erp',
  ]);
  const [inspectedBranchId, setInspectedBranchId] = useState<string | null>(
    'branch-app-healthcare_erp',
  );
  const [hoveredTip, setHoveredTip] = useState<HoveredTipState | null>(null);
  const [exportedFlag, setExportedFlag] = useState(false);

  // Sync tree expansion & inspector whenever the active walkthrough hop advances
  useEffect(() => {
    if (!currentHop) return;
    setExpandedTrunks((prev) =>
      prev.includes(currentHop.trunkId) ? prev : [...prev, currentHop.trunkId],
    );
    setExpandedBranches((prev) =>
      prev.includes(currentHop.branchId) ? prev : [...prev, currentHop.branchId],
    );
    setInspectedBranchId(currentHop.branchId);
  }, [currentHop]);

  // Clean autoplay timer cleared on pause, manual step, or unmount
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setActiveHopIdx((prev) => {
        const next = prev + 1;
        if (next >= activeTrace.hops.length) {
          setIsPlaying(false);
          return activeTrace.hops.length - 1;
        }
        return next;
      });
    }, 2600);
    return () => window.clearInterval(timer);
  }, [isPlaying, activeTrace.hops.length]);

  const handleSelectTrace = (id: RequestWalkthroughTrace['id']) => {
    setIsPlaying(false);
    setActiveTraceId(id);
    setActiveHopIdx(0);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (activeHopIdx < 0 || activeHopIdx >= activeTrace.hops.length - 1) {
      setActiveHopIdx(0);
    }
    setIsPlaying(true);
  };

  const handleStepPrev = () => {
    setIsPlaying(false);
    setActiveHopIdx((prev) => (prev <= 0 ? 0 : prev - 1));
  };

  const handleStepNext = () => {
    setIsPlaying(false);
    setActiveHopIdx((prev) =>
      prev < 0 ? 0 : Math.min(activeTrace.hops.length - 1, prev + 1),
    );
  };

  const handleResetWalkthrough = () => {
    setIsPlaying(false);
    setActiveHopIdx(-1);
  };

  const isDark = localPolarity === 'dark';

  const inspectedContext = useMemo(() => {
    if (!inspectedBranchId) return null;
    for (const trunk of tree) {
      const branch = trunk.branches.find((b) => b.id === inspectedBranchId);
      if (branch) return { trunk, branch };
    }
    return null;
  }, [inspectedBranchId, tree]);

  const toggleTrunk = (id: string) => {
    setExpandedTrunks((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleBranch = (branch: PathwayBranchNode) => {
    setInspectedBranchId(branch.id);
    setExpandedBranches((prev) =>
      prev.includes(branch.id) ? prev.filter((item) => item !== branch.id) : [...prev, branch.id],
    );
  };

  const expandAll = () => {
    setExpandedTrunks(tree.map((t) => t.id));
    setExpandedBranches(tree.flatMap((t) => t.branches.map((b) => b.id)));
  };

  const collapseAll = () => {
    setExpandedTrunks([]);
    setExpandedBranches([]);
  };

  const resetPathway = () => {
    setIsPlaying(false);
    setActiveHopIdx(-1);
    setExpandedTrunks(defaultExpandedTrunks);
    setExpandedBranches(['branch-layer-L5', 'branch-app-healthcare_erp']);
    setInspectedBranchId('branch-app-healthcare_erp');
  };

  const handleExportPathwayMd = () => {
    downloadMarkdownFile(
      `spenta-pathway-${providerId}-${activeTrace.id}.md`,
      buildPathwayMarkdownExport(tree, activeProfile, activeTrace),
    );
    setExportedFlag(true);
    window.setTimeout(() => setExportedFlag(false), 1800);
  };

  const focusLinkedAppBranch = (appId: string) => {
    const targetBranchId = `branch-app-${appId}`;
    const owningTrunk = tree.find((t) => t.branches.some((b) => b.id === targetBranchId));
    if (owningTrunk && !expandedTrunks.includes(owningTrunk.id)) {
      setExpandedTrunks((prev) => [...prev, owningTrunk.id]);
    }
    if (!expandedBranches.includes(targetBranchId)) {
      setExpandedBranches((prev) => [...prev, targetBranchId]);
    }
    setInspectedBranchId(targetBranchId);
  };

  // Explicit OITS Dhaka palette tokens scoped cleanly to this container
  const canvasClass = isDark
    ? 'bg-[#0B1020] text-[#E7EBF5] border-[#232B4A]'
    : 'bg-[#FAF8F4] text-[#16213A] border-[#E4DFD6]';
  const bandClass = isDark
    ? 'bg-[#0F1529] border-[#232B4A]'
    : 'bg-[#F2EFE9] border-[#E4DFD6]';
  const cardClass = isDark
    ? 'bg-[#141A32] border-[#232B4A] hover:border-[#7FA6FF]'
    : 'bg-[#FFFFFF] border-[#E4DFD6] hover:border-[#1F3863]';
  const mutedText = isDark ? 'text-[#8D97B5]' : 'text-[#5F6576]';
  const secondaryText = isDark ? 'text-[#C3CCE4]' : 'text-[#4A5163]';
  const brandStroke = isDark ? '#7FA6FF' : '#1F3863';
  const inactiveStroke = isDark ? '#2E3862' : '#CFC8BC';
  const activeGreen = isDark ? '#6FCB9F' : '#1C6E46';
  const hopAmber = isDark ? '#E0B063' : '#8A5C10';

  return (
    <section
      className={`rounded-[10px] border transition-colors duration-200 overflow-hidden ${canvasClass}`}
      aria-label="Interactive OITS Dhaka and roadmap.sh Architecture Pathway"
    >
      {/* Top Editorial Header Bar */}
      <div
        className={`px-4 sm:px-6 py-4 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-3 ${bandClass}`}
      >
        <div className="space-y-1">
          <div className={`flex flex-wrap items-center gap-2 text-[11px] font-mono ${mutedText}`}>
            <span className={isDark ? 'text-[#8FA6E8] font-semibold' : 'text-[#1F3863] font-semibold'}>
              PLATE 00 · CODE-DRAWN INTERACTIVE PATHWAY
            </span>
            <span aria-hidden="true">·</span>
            <span>OITS Dhaka × roadmap.sh × Provider Swap &amp; Trace Player</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {selectedIds.length}/13 Modules Active · OPA {hitlConfidence.toFixed(2)}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-balance">
            Interactive Sovereign Architecture Pathway &amp; Request Walkthrough
          </h3>
          <p className={`text-xs max-w-3xl leading-relaxed ${secondaryText}`}>
            Swap deployment topologies (On-Prem, Private VPC, Air-Gap), step through live multi-hop request traces, and click any pillar or branch to expand its compositions and sync with your Stack Composer.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Scoped OITS Dhaka Stone / Nocturnal Polarity Toggle */}
          <div
            role="group"
            aria-label="Pathway visual theme polarity"
            className={`inline-flex items-center gap-1 p-1 rounded-lg border ${
              isDark ? 'bg-[#0B1020] border-[#232B4A]' : 'bg-[#FAF8F4] border-[#E4DFD6]'
            }`}
          >
            <button
              type="button"
              onClick={() => setPolarity('light')}
              aria-pressed={!isDark}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !isDark
                  ? 'bg-[#1F3863] text-white'
                  : 'text-[#8D97B5] hover:text-[#E7EBF5]'
              }`}
            >
              <Sun className="w-3 h-3" strokeWidth={1.75} />
              <span>Stone</span>
            </button>
            <button
              type="button"
              onClick={() => setPolarity('dark')}
              aria-pressed={isDark}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isDark
                  ? 'bg-[#8FA6E8] text-[#0B1020]'
                  : 'text-[#5F6576] hover:text-[#16213A]'
              }`}
            >
              <Moon className="w-3 h-3" strokeWidth={1.75} />
              <span>Nocturnal</span>
            </button>
          </div>

          <button
            type="button"
            onClick={expandAll}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${cardClass}`}
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${cardClass}`}
          >
            Collapse All
          </button>
          <button
            type="button"
            onClick={resetPathway}
            title="Reset expanded branches"
            aria-label="Reset expanded branches"
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${cardClass}`}
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={handleExportPathwayMd}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isDark
                ? 'bg-[#8FA6E8] text-[#0B1020] hover:bg-[#7FA6FF]'
                : 'bg-[#1F3863] text-white hover:bg-[#12233F]'
            }`}
          >
            {exportedFlag ? (
              <Check className="w-3.5 h-3.5" strokeWidth={2} />
            ) : (
              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
            )}
            <span>{exportedFlag ? 'Exported .md' : 'Export Pathway .md'}</span>
          </button>
        </div>
      </div>

      {/* Deployment Provider Switcher + Hop-by-Hop Walkthrough Transport Bar */}
      <div
        className={`px-4 sm:px-6 py-3 border-b grid grid-cols-1 xl:grid-cols-12 gap-3 items-center ${
          isDark ? 'bg-[#0B1020] border-[#232B4A]' : 'bg-[#FAF8F4] border-[#E4DFD6]'
        }`}
      >
        {/* Deployment Provider Swap (system-design-explainer pattern) */}
        <div className="xl:col-span-5 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase ${mutedText}`}>
            <Server className="w-3.5 h-3.5" strokeWidth={1.6} />
            <span>Topology:</span>
          </span>
          <div
            role="group"
            aria-label="Deployment provider topology"
            className={`inline-flex flex-wrap items-center gap-1 p-1 rounded-lg border ${
              isDark ? 'bg-[#0F1529] border-[#232B4A]' : 'bg-[#F2EFE9] border-[#E4DFD6]'
            }`}
          >
            {(['on-prem', 'private-vpc', 'air-gapped'] as const).map((pid) => {
              const prof = DEPLOYMENT_PROFILES[pid];
              const active = providerId === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setProviderId(pid)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? isDark
                        ? 'bg-[#6FCB9F] text-[#0B1020]'
                        : 'bg-[#1C6E46] text-white'
                      : isDark
                        ? 'text-[#C3CCE4] hover:text-white'
                        : 'text-[#4A5163] hover:text-[#16213A]'
                  }`}
                >
                  {prof.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hop-by-Hop Request Walkthrough Player (systemdesignprimer pattern) */}
        <div className="xl:col-span-7 flex flex-wrap items-center xl:justify-end gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {REQUEST_TRACES.map((tr) => {
              const selected = tr.id === activeTraceId;
              return (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => handleSelectTrace(tr.id)}
                  className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selected
                      ? isDark
                        ? 'bg-[#161D3A] border-[#8FA6E8] text-[#8FA6E8]'
                        : 'bg-[#EEF3FB] border-[#1F3863] text-[#1F3863]'
                      : isDark
                        ? 'bg-[#141A32] border-[#232B4A] text-[#C3CCE4] hover:border-[#7FA6FF]'
                        : 'bg-[#FFFFFF] border-[#E4DFD6] text-[#4A5163] hover:border-[#1F3863]'
                  }`}
                >
                  {tr.label}
                </button>
              );
            })}
          </div>

          <div
            className={`inline-flex items-center gap-1 p-1 rounded-lg border shrink-0 ${
              isDark ? 'bg-[#0F1529] border-[#232B4A]' : 'bg-[#F2EFE9] border-[#E4DFD6]'
            }`}
          >
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                isPlaying
                  ? isDark
                    ? 'bg-[#E0B063] text-[#0B1020]'
                    : 'bg-[#8A5C10] text-white'
                  : isDark
                    ? 'bg-[#8FA6E8] text-[#0B1020]'
                    : 'bg-[#1F3863] text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isPlaying ? 'Pause' : 'Walkthrough'}</span>
            </button>
            <button
              type="button"
              onClick={handleStepPrev}
              aria-label="Previous walkthrough hop"
              className={`p-1 rounded-md cursor-pointer ${secondaryText}`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[10px] font-bold px-1 tabular-nums">
              {activeHopIdx >= 0 ? `${activeHopIdx + 1}/${activeTrace.hops.length}` : `0/${activeTrace.hops.length}`}
            </span>
            <button
              type="button"
              onClick={handleStepNext}
              aria-label="Next walkthrough hop"
              className={`p-1 rounded-md cursor-pointer ${secondaryText}`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {activeHopIdx >= 0 && (
              <button
                type="button"
                onClick={handleResetWalkthrough}
                aria-label="Reset walkthrough"
                title="Stop and clear active trace"
                className={`p-1 rounded-md cursor-pointer ${mutedText}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Hop Telemetry Banner OR Contextual Hover Tooltip Strip */}
      <div
        className={`px-4 sm:px-6 py-2.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
          currentHop
            ? isDark
              ? 'bg-[#2A2112]/70 border-[#E0B063]/40'
              : 'bg-[#FDF5E6] border-[#8A5C10]/30'
            : isDark
              ? 'bg-[#141A32]/70 border-[#232B4A]'
              : 'bg-[#FFFFFF] border-[#E4DFD6]'
        }`}
      >
        {currentHop ? (
          <>
            <div className="min-w-0 flex flex-wrap items-center gap-2">
              <span
                className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded shrink-0 tabular-nums"
                style={{
                  backgroundColor: hopAmber,
                  color: isDark ? '#0B1020' : '#FFFFFF',
                }}
              >
                HOP {currentHop.stepNumber}/{activeTrace.hops.length}
              </span>
              <span className="font-bold">{currentHop.title}</span>
              <span className={mutedText} aria-hidden="true">
                ·
              </span>
              <span className={secondaryText}>{currentHop.payloadSummary}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0 font-mono text-[10.5px] tabular-nums">
              <span style={{ color: activeGreen }} className="font-bold">
                Target {currentHop.latencyTarget}
              </span>
              <span className={mutedText}>·</span>
              <span className={`truncate max-w-[260px] ${secondaryText}`} title={currentHop.pitfallMitigation}>
                {currentHop.pitfallMitigation}
              </span>
            </div>
          </>
        ) : hoveredTip ? (
          <>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  isDark ? 'bg-[#161D3A] text-[#8FA6E8]' : 'bg-[#EEF3FB] text-[#1F3863]'
                }`}
              >
                {hoveredTip.code}
              </span>
              <span className="font-bold truncate">{hoveredTip.title}</span>
              <span className={mutedText} aria-hidden="true">
                ·
              </span>
              <span className={`truncate ${secondaryText}`}>{hoveredTip.summary}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
              <span className={isDark ? 'text-[#6FCB9F]' : 'text-[#1C6E46]'}>
                {hoveredTip.metric}
              </span>
              <span className={mutedText}>{hoveredTip.hint}</span>
            </div>
          </>
        ) : (
          <div className={`flex flex-wrap items-center justify-between w-full gap-2 ${mutedText}`}>
            <span className="inline-flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span>
                <strong className={isDark ? 'text-[#E7EBF5]' : 'text-[#16213A]'}>
                  {activeProfile.shortLabel}:
                </strong>{' '}
                {activeProfile.transport} · {activeProfile.latencyBudget}
              </span>
            </span>
            <span className="font-mono text-[11px] tabular-nums">
              Stack Scope ${(stackMetrics.totalSetupUsd / 1000).toFixed(1)}K · Blended GM{' '}
              {stackMetrics.blendedGmPct.toFixed(1)}% · Tier {stackMetrics.tier}
            </span>
          </div>
        )}
      </div>

      {/* Main Split: Left Orthogonal Branching Tree | Right roadmap.sh Slide-In Inspector */}
      <div className={`grid grid-cols-1 ${compact ? 'xl:grid-cols-12' : 'lg:grid-cols-12'}`}>
        {/* Left Interactive SVG-Connected Architecture Tree */}
        <div
          className={`${
            compact ? 'xl:col-span-8' : 'lg:col-span-8'
          } p-4 sm:p-6 space-y-5 border-b lg:border-b-0 lg:border-r ${
            isDark ? 'border-[#232B4A]' : 'border-[#E4DFD6]'
          }`}
        >
          {/* Top Orthogonal Architectural Flow Bar (SVG Code-Drawn Overview) */}
          <div className={`rounded-lg border p-3.5 ${bandClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <span className={`font-mono text-[10px] tracking-[0.08em] ${mutedText}`}>
                Orthogonal System Spine · {activeProfile.shortLabel} (Click any pillar to toggle branches)
              </span>
              <span className={`font-mono text-[10px] tabular-nums ${mutedText}`}>
                {expandedTrunks.length}/5 Pillars Expanded
              </span>
            </div>
            <svg
              viewBox="0 0 880 78"
              className="w-full h-auto block select-none"
              role="img"
              aria-label="Five-stage interactive Sovereign Architecture Spine"
            >
              {/* Horizontal Spine Bus */}
              <line
                x1="78"
                y1="39"
                x2="802"
                y2="39"
                stroke={inactiveStroke}
                strokeWidth="1.5"
              />
              {tree.map((trunk, idx) => {
                const x = 10 + idx * 174;
                const isExpanded = expandedTrunks.includes(trunk.id);
                const isHopTrunk = currentHop?.trunkId === trunk.id;
                const activeCount = trunk.branches.filter(
                  (b) => b.appId && selectedIds.includes(b.appId),
                ).length;

                return (
                  <g
                    key={trunk.id}
                    onClick={() => toggleTrunk(trunk.id)}
                    onMouseEnter={() =>
                      setHoveredTip({
                        code: `PILLAR ${trunk.index}`,
                        title: trunk.title,
                        summary: trunk.summary,
                        metric: trunk.metric,
                        hint: isExpanded ? 'Click to collapse' : 'Click to expand branches',
                      })
                    }
                    onMouseLeave={() => setHoveredTip(null)}
                    className="cursor-pointer"
                  >
                    {idx > 0 && (isExpanded || isHopTrunk) && (
                      <line
                        x1={x - 16}
                        y1="39"
                        x2={x}
                        y2="39"
                        stroke={isHopTrunk ? hopAmber : brandStroke}
                        strokeWidth="2.2"
                      />
                    )}
                    <rect
                      x={x}
                      y="10"
                      width="158"
                      height="58"
                      rx="8"
                      fill={
                        isHopTrunk
                          ? isDark
                            ? '#2A2112'
                            : '#FDF5E6'
                          : isExpanded
                            ? isDark
                              ? '#161D3A'
                              : '#EEF3FB'
                            : isDark
                              ? '#141A32'
                              : '#FFFFFF'
                      }
                      stroke={
                        isHopTrunk
                          ? hopAmber
                          : activeCount > 0
                            ? activeGreen
                            : isExpanded
                              ? brandStroke
                              : inactiveStroke
                      }
                      strokeWidth={isHopTrunk ? 2.2 : isExpanded ? 1.8 : 1.15}
                    />
                    <text
                      x={x + 12}
                      y="27"
                      fill={
                        isHopTrunk
                          ? hopAmber
                          : isExpanded
                            ? brandStroke
                            : isDark
                              ? '#8D97B5'
                              : '#5F6576'
                      }
                      fontSize="9.5"
                      fontWeight="700"
                      fontFamily="IBM Plex Mono, JetBrains Mono, monospace"
                    >
                      {isHopTrunk
                        ? `HOP ${currentHop.stepNumber} ACTIVE`
                        : `${trunk.index}. ${isExpanded ? 'EXPANDED' : 'BRANCH +'}`}
                    </text>
                    <text
                      x={x + 12}
                      y="44"
                      fill={isDark ? '#E7EBF5' : '#16213A'}
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="Plus Jakarta Sans, sans-serif"
                    >
                      {trunk.title.length > 20 ? `${trunk.title.slice(0, 19)}…` : trunk.title}
                    </text>
                    <text
                      x={x + 12}
                      y="59"
                      fill={activeCount > 0 ? activeGreen : isDark ? '#8D97B5' : '#5F6576'}
                      fontSize="9"
                      fontFamily="IBM Plex Mono, JetBrains Mono, monospace"
                    >
                      {activeCount > 0 ? `${activeCount} in stack` : trunk.metric}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Vertical Expandable Trunk → Branch → Composition Nodes */}
          <div className="space-y-3.5">
            {tree.map((trunk) => {
              const isTrunkOpen = expandedTrunks.includes(trunk.id);
              const isHopTrunk = currentHop?.trunkId === trunk.id;
              const activeAppsInTrunk = trunk.branches.filter(
                (b) => b.appId && selectedIds.includes(b.appId),
              ).length;

              return (
                <div key={trunk.id} className="space-y-2.5">
                  {/* Trunk Row */}
                  <button
                    type="button"
                    onClick={() => toggleTrunk(trunk.id)}
                    onMouseEnter={() =>
                      setHoveredTip({
                        code: `PILLAR ${trunk.index}`,
                        title: trunk.title,
                        summary: trunk.summary,
                        metric: trunk.metric,
                        hint: isTrunkOpen ? 'Click to collapse' : 'Click to expand',
                      })
                    }
                    onMouseLeave={() => setHoveredTip(null)}
                    aria-expanded={isTrunkOpen}
                    className={`w-full text-left rounded-[10px] border px-4 py-3.5 transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer ${
                      isHopTrunk
                        ? isDark
                          ? 'bg-[#2A2112]/70 border-[#E0B063]'
                          : 'bg-[#FDF5E6] border-[#8A5C10]'
                        : isTrunkOpen
                          ? isDark
                            ? 'bg-[#161D3A] border-[#7FA6FF]'
                            : 'bg-[#EEF3FB] border-[#1F3863]'
                          : cardClass
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`font-mono text-xs font-bold px-2 py-1 rounded-md shrink-0 tabular-nums ${
                          isHopTrunk
                            ? isDark
                              ? 'bg-[#E0B063] text-[#0B1020]'
                              : 'bg-[#8A5C10] text-white'
                            : isTrunkOpen
                              ? isDark
                                ? 'bg-[#8FA6E8] text-[#0B1020]'
                                : 'bg-[#1F3863] text-white'
                              : isDark
                                ? 'bg-[#0F1529] text-[#8FA6E8]'
                                : 'bg-[#F2EFE9] text-[#1F3863]'
                        }`}
                      >
                        {trunk.index}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold tracking-tight flex flex-wrap items-center gap-2">
                          <span>{trunk.title}</span>
                          {activeAppsInTrunk > 0 && (
                            <span
                              className={`font-mono text-[10px] font-semibold ${
                                isDark ? 'text-[#6FCB9F]' : 'text-[#1C6E46]'
                              }`}
                            >
                              · {activeAppsInTrunk} active in stack
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 leading-snug ${secondaryText}`}>
                          {trunk.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className={`hidden sm:inline font-mono text-[11px] tabular-nums ${mutedText}`}>
                        {trunk.branches.length} branches
                      </span>
                      {isTrunkOpen ? (
                        <ChevronDown className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                      ) : (
                        <ChevronRight className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                      )}
                    </div>
                  </button>

                  {/* Expanded Sub-Component Branches with SVG Orthogonal Tree Rails */}
                  {isTrunkOpen && (
                    <div className="pl-3 sm:pl-6 relative">
                      <div
                        aria-hidden="true"
                        className="absolute left-3 sm:left-6 top-0 bottom-3 w-px"
                        style={{ backgroundColor: isHopTrunk ? hopAmber : brandStroke, opacity: 0.45 }}
                      />

                      <div className="pl-4 sm:pl-5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {trunk.branches.map((branch) => {
                          const isBranchOpen = expandedBranches.includes(branch.id);
                          const isInspected = inspectedBranchId === branch.id;
                          const isHopBranch = currentHop?.branchId === branch.id;
                          const isInStack = branch.appId ? selectedIds.includes(branch.appId) : false;

                          return (
                            <div key={branch.id} className="relative space-y-2">
                              <span
                                aria-hidden="true"
                                className="hidden md:block absolute -left-5 top-5 w-5 h-px"
                                style={{
                                  backgroundColor: isHopBranch
                                    ? hopAmber
                                    : isInStack
                                      ? activeGreen
                                      : isInspected
                                        ? brandStroke
                                        : inactiveStroke,
                                }}
                              />

                              <div
                                className={`rounded-[10px] border transition-all duration-150 ${
                                  isHopBranch
                                    ? isDark
                                      ? 'bg-[#2A2112]/80 border-[#E0B063] shadow-sm'
                                      : 'bg-[#FDF5E6] border-[#8A5C10] shadow-sm'
                                    : isInspected
                                      ? isDark
                                        ? 'bg-[#141A32] border-[#7FA6FF] shadow-sm'
                                        : 'bg-[#FFFFFF] border-[#1F3863] shadow-sm'
                                      : isInStack
                                        ? isDark
                                          ? 'bg-[#141A32] border-[#6FCB9F]/60'
                                          : 'bg-[#FFFFFF] border-[#1C6E46]/60'
                                        : cardClass
                                }`}
                              >
                                <div className="p-3 flex items-start justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleBranch(branch)}
                                    onMouseEnter={() =>
                                      setHoveredTip({
                                        code: branch.code,
                                        title: branch.title,
                                        summary: branch.summary,
                                        metric: branch.metric,
                                        hint: `${branch.compositions.length} compositions · Click to expand`,
                                      })
                                    }
                                    onMouseLeave={() => setHoveredTip(null)}
                                    aria-expanded={isBranchOpen}
                                    className="text-left min-w-0 flex-1 cursor-pointer focus:outline-none"
                                  >
                                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                      <span
                                        className={
                                          isHopBranch
                                            ? isDark
                                              ? 'text-[#E0B063] font-bold'
                                              : 'text-[#8A5C10] font-bold'
                                            : isInStack
                                              ? isDark
                                                ? 'text-[#6FCB9F] font-bold'
                                                : 'text-[#1C6E46] font-bold'
                                              : isDark
                                                ? 'text-[#8FA6E8] font-bold'
                                                : 'text-[#1F3863] font-bold'
                                        }
                                      >
                                        {isHopBranch ? `HOP ${currentHop.stepNumber} · ${branch.code}` : branch.code}
                                      </span>
                                      <span className={mutedText} aria-hidden="true">
                                        ·
                                      </span>
                                      <span className={`truncate ${mutedText}`}>{branch.role}</span>
                                    </div>
                                    <div className="text-xs sm:text-[13px] font-bold mt-0.5 leading-snug">
                                      {branch.title}
                                    </div>
                                    <div className={`text-[11px] font-mono mt-1 tabular-nums ${mutedText}`}>
                                      {branch.metric}
                                    </div>
                                  </button>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {branch.appId && (
                                      <button
                                        type="button"
                                        onClick={() => toggleApp(branch.appId!)}
                                        title={
                                          isInStack
                                            ? `Remove ${branch.title} from stack`
                                            : `Add ${branch.title} to stack`
                                        }
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                                          isInStack
                                            ? isDark
                                              ? 'bg-[#6FCB9F] text-[#0B1020]'
                                              : 'bg-[#1C6E46] text-white'
                                            : isDark
                                              ? 'bg-[#0F1529] text-[#C3CCE4] border border-[#232B4A] hover:border-[#7FA6FF]'
                                              : 'bg-[#F2EFE9] text-[#16213A] border border-[#E4DFD6] hover:border-[#1F3863]'
                                        }`}
                                      >
                                        {isInStack ? (
                                          <>
                                            <Check className="w-3 h-3" strokeWidth={2.25} />
                                            <span>Active</span>
                                          </>
                                        ) : (
                                          <>
                                            <Plus className="w-3 h-3" strokeWidth={2} />
                                            <span>Add</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => toggleBranch(branch)}
                                      aria-label={
                                        isBranchOpen
                                          ? `Collapse ${branch.title} compositions`
                                          : `Expand ${branch.title} compositions`
                                      }
                                      className={`p-1 rounded-md transition-colors cursor-pointer ${mutedText}`}
                                    >
                                      {isBranchOpen ? (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Level-3 Expandable Leaf Compositions */}
                                {isBranchOpen && (
                                  <div
                                    className={`px-3 pb-3 pt-2 border-t space-y-1.5 ${
                                      isDark
                                        ? 'border-[#232B4A] bg-[#0F1529]/60'
                                        : 'border-[#ECE8E0] bg-[#FAF8F4]/70'
                                    }`}
                                  >
                                    <div className={`font-mono text-[9.5px] ${mutedText}`}>
                                      Sub-Components &amp; Compositions ({branch.compositions.length})
                                    </div>
                                    {branch.compositions.map((comp) => (
                                      <button
                                        key={comp.id}
                                        type="button"
                                        onClick={() => {
                                          if (comp.linkedAppId) {
                                            focusLinkedAppBranch(comp.linkedAppId);
                                          } else {
                                            setInspectedBranchId(branch.id);
                                          }
                                        }}
                                        onMouseEnter={() =>
                                          setHoveredTip({
                                            code: comp.code,
                                            title: comp.label,
                                            summary: comp.detail,
                                            metric: comp.metric,
                                            hint: comp.linkedAppId
                                              ? 'Click to jump to linked module'
                                              : 'Click to inspect in drawer',
                                          })
                                        }
                                        onMouseLeave={() => setHoveredTip(null)}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-md border text-[11px] flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                          isDark
                                            ? 'bg-[#141A32] border-[#232B4A] hover:border-[#7FA6FF]'
                                            : 'bg-[#FFFFFF] border-[#E4DFD6] hover:border-[#1F3863]'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span
                                            className={`font-mono text-[9.5px] font-bold shrink-0 ${
                                              comp.kind === 'synergy'
                                                ? isDark
                                                  ? 'text-[#6FCB9F]'
                                                  : 'text-[#1C6E46]'
                                                : isDark
                                                  ? 'text-[#8FA6E8]'
                                                  : 'text-[#1F3863]'
                                            }`}
                                          >
                                            {comp.code}
                                          </span>
                                          <span className="truncate font-medium">{comp.label}</span>
                                        </div>
                                        <span className={`font-mono text-[10px] shrink-0 tabular-nums ${mutedText}`}>
                                          {comp.metric}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right roadmap.sh-Style Deep-Dive Inspector Drawer */}
        <aside
          className={`${compact ? 'xl:col-span-4' : 'lg:col-span-4'} p-4 sm:p-5 flex flex-col justify-between gap-4 ${
            isDark ? 'bg-[#0F1529]' : 'bg-[#F2EFE9]/65'
          }`}
          aria-label="Node architecture inspector"
        >
          {inspectedContext ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-current/10">
                <div className="min-w-0">
                  <div className={`font-mono text-[10px] ${mutedText}`}>
                    {inspectedContext.trunk.index}. {inspectedContext.trunk.title}
                  </div>
                  <h4 className="text-base font-extrabold tracking-tight mt-0.5 leading-snug">
                    {inspectedContext.branch.title}
                  </h4>
                  <div className={`text-xs mt-0.5 ${secondaryText}`}>
                    {inspectedContext.branch.role}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedBranchId(null)}
                  aria-label="Close inspector details"
                  className={`p-1 rounded-md cursor-pointer ${mutedText}`}
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <p className={`text-xs leading-relaxed ${secondaryText}`}>
                {inspectedContext.branch.summary}
              </p>

              {/* Quantitative Metadata Strip */}
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className={`rounded-lg border p-2.5 ${cardClass}`}>
                  <div className={`text-[10px] ${mutedText}`}>Primary Metric</div>
                  <div className="font-bold mt-0.5 tabular-nums">
                    {inspectedContext.branch.metric}
                  </div>
                </div>
                <div className={`rounded-lg border p-2.5 ${cardClass}`}>
                  <div className={`text-[10px] ${mutedText}`}>
                    {inspectedContext.branch.proofClient ? 'Verified Proof' : 'Architecture Layers'}
                  </div>
                  <div className="font-bold mt-0.5 truncate">
                    {inspectedContext.branch.proofClient ??
                      inspectedContext.branch.layers?.join(' · ') ??
                      activeProfile.shortLabel}
                  </div>
                </div>
              </div>

              {/* Deployment Trade-Off & Failure Pitfall Callout (system-design-explainer) */}
              <div
                className={`rounded-lg border p-3 space-y-1.5 text-[11px] ${
                  isDark
                    ? 'bg-[#141A32] border-[#2E3862]'
                    : 'bg-[#FFFFFF] border-[#CFC8BC]'
                }`}
              >
                <div
                  className={`flex items-center gap-1.5 font-mono text-[10px] font-bold ${
                    isDark ? 'text-[#E0B063]' : 'text-[#8A5C10]'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  <span>Deployment Trade-Off &amp; Pitfall ({activeProfile.shortLabel})</span>
                </div>
                <p className={`leading-relaxed ${secondaryText}`}>
                  {activeProfile.tradeOffGuidance}
                </p>
                <p className={`font-mono text-[10.5px] leading-snug ${mutedText}`}>
                  {activeProfile.failurePitfall}
                </p>
              </div>

              {/* Stack Composer Sync Action if Linked to a Spenta Module */}
              {inspectedContext.branch.appId && (
                <button
                  type="button"
                  onClick={() => toggleApp(inspectedContext.branch.appId!)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedIds.includes(inspectedContext.branch.appId)
                      ? isDark
                        ? 'bg-[#6FCB9F] text-[#0B1020]'
                        : 'bg-[#1C6E46] text-white'
                      : isDark
                        ? 'bg-[#8FA6E8] text-[#0B1020] hover:bg-[#7FA6FF]'
                        : 'bg-[#1F3863] text-white hover:bg-[#12233F]'
                  }`}
                >
                  {selectedIds.includes(inspectedContext.branch.appId) ? (
                    <>
                      <Check className="w-3.5 h-3.5" strokeWidth={2.25} />
                      <span>Included in Stack Composer (Click to Remove)</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                      <span>Add Module to Live Stack Composer</span>
                    </>
                  )}
                </button>
              )}

              {/* Detailed Composition Checklist */}
              <div className="space-y-2">
                <div className={`flex items-center gap-1.5 font-mono text-[10px] ${mutedText}`}>
                  <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>
                    Branch Compositions ({inspectedContext.branch.compositions.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {inspectedContext.branch.compositions.map((comp) => (
                    <div
                      key={comp.id}
                      className={`rounded-lg border p-2.5 space-y-1 ${cardClass}`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold">
                          <span
                            className={`font-mono text-[10px] mr-1.5 ${
                              isDark ? 'text-[#8FA6E8]' : 'text-[#1F3863]'
                            }`}
                          >
                            {comp.code}
                          </span>
                          {comp.label}
                        </span>
                        <span className={`font-mono text-[10px] shrink-0 tabular-nums ${mutedText}`}>
                          {comp.metric}
                        </span>
                      </div>
                      <p className={`text-[11px] leading-relaxed ${secondaryText}`}>
                        {comp.detail}
                      </p>
                      {comp.linkedAppId && (
                        <button
                          type="button"
                          onClick={() => focusLinkedAppBranch(comp.linkedAppId!)}
                          className={`text-[11px] font-mono font-semibold hover:underline cursor-pointer ${
                            isDark ? 'text-[#7FA6FF]' : 'text-[#1F3863]'
                          }`}
                        >
                          Jump to branch →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
              <GitBranch className={`w-6 h-6 ${mutedText}`} strokeWidth={1.5} />
              <div className="text-sm font-bold">Select Any Branch Node</div>
              <p className={`text-xs max-w-xs leading-relaxed ${secondaryText}`}>
                Click any architectural sub-component on the left—or press Walkthrough—to inspect protocols, failure mitigations, and live Stack Composer bindings.
              </p>
            </div>
          )}

          <div
            className={`pt-3 border-t text-[11px] font-mono flex items-center justify-between gap-2 ${
              isDark ? 'border-[#232B4A] text-[#8D97B5]' : 'border-[#E4DFD6] text-[#5F6576]'
            }`}
          >
            <span>{activeProfile.shortLabel}</span>
            <span className="tabular-nums">13 Apps · 6 Layers · 4 Tiers</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
