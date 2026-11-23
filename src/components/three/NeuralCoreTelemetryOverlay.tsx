import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  ExternalLink,
  HardDrive,
  Layers,
  RotateCcw,
  X,
} from 'lucide-react';

export interface NeuralCoreTelemetrySnapshot {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  jsHeapMb: number | null;
  jsHeapLimitMb: number | null;
  gpuEstimateMb: number;
  rendererMode: 'hardware' | 'software';
}

export interface GravityWellInterferenceAlert {
  id: number;
  pairLabel: string;
  intersectionCount: number;
  activeFlashCount: number;
}

export const INITIAL_TELEMETRY_SNAPSHOT: NeuralCoreTelemetrySnapshot = {
  fps: 60,
  frameMs: 16.7,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  programs: 0,
  jsHeapMb: null,
  jsHeapLimitMb: null,
  gpuEstimateMb: 0,
  rendererMode: 'hardware',
};

export interface TelemetryHistorySample {
  fps: number;
  frameMs: number;
  drawCalls: number;
  ts: number;
}

export interface TelemetrySystemSwitcherConfig {
  activeSystem: 'spiral' | 'nebula' | 'solar';
  onSelectSystem: (system: 'spiral' | 'nebula' | 'solar') => void;
  onOpenNeuralCore?: () => void;
}

interface NeuralCoreTelemetryOverlayProps {
  mode: 'spiral-galaxy' | 'nebula' | 'solar-map';
  systemSubtitle?: string;
  isLightMode?: boolean;
  metrics: NeuralCoreTelemetrySnapshot;
  gravityWellAlert?: GravityWellInterferenceAlert | null;
  positionClassName?: string;
  compact?: boolean;
  systemSwitcher?: TelemetrySystemSwitcherConfig;
  historySamples?: TelemetryHistorySample[];
  onResetMetrics?: () => void;
}

const GRAVITY_WELL_TOAST_DWELL_MS = 3600;

function formatTriangles(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

export default function NeuralCoreTelemetryOverlay({
  mode,
  systemSubtitle,
  isLightMode = false,
  metrics,
  gravityWellAlert = null,
  positionClassName,
  compact = false,
  systemSwitcher,
  historySamples,
  onResetMetrics,
}: NeuralCoreTelemetryOverlayProps) {
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (compact) return false;
    if (typeof window !== 'undefined') return window.innerWidth >= 900;
    return true;
  });
  const [visibleAlert, setVisibleAlert] = useState<GravityWellInterferenceAlert | null>(null);

  useEffect(() => {
    if (compact) setExpanded(false);
  }, [compact]);

  useEffect(() => {
    if (mode !== 'solar-map' || !gravityWellAlert || gravityWellAlert.id <= 0) {
      setVisibleAlert(null);
      return;
    }

    setVisibleAlert(gravityWellAlert);
    const timer = window.setTimeout(() => {
      setVisibleAlert((current) =>
        current && current.id === gravityWellAlert.id ? null : current,
      );
    }, GRAVITY_WELL_TOAST_DWELL_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mode, gravityWellAlert]);

  const isSolar = mode === 'solar-map';
  const isNebulaSystem = mode === 'nebula';
  const isNebula = isNebulaSystem && !isLightMode;
  const defaultPosition = isSolar ? 'top-[60px] right-3' : 'top-3 right-3';
  const fpsSmoothRatio = Math.max(0.06, Math.min(1, metrics.fps / 60));

  const activeSystemName = isSolar
    ? 'Solar System'
    : isNebulaSystem
      ? 'Procedural Nebula'
      : 'Spiral Galaxy';

  const fpsColorStyle = isSolar
    ? metrics.fps >= 48
      ? '#68E4EF'
      : metrics.fps >= 24
        ? 'var(--solar-accent-amber-fg)'
        : '#FF894F'
    : isNebula
      ? metrics.fps >= 48
        ? 'var(--nebula-accent-teal)'
        : metrics.fps >= 24
          ? 'var(--nebula-accent-magenta-fg)'
          : '#FB7185'
      : isLightMode
        ? metrics.fps >= 48
          ? '#1C6E46'
          : metrics.fps >= 24
            ? '#B45309'
            : '#BE123C'
        : metrics.fps >= 48
          ? '#6FCB9F'
          : metrics.fps >= 24
            ? '#FBBF24'
            : '#FB7185';

  const containerStyle: React.CSSProperties | undefined = isSolar
    ? {
        backgroundColor: 'var(--solar-bg-panel)',
        borderColor: visibleAlert ? 'var(--solar-accent-amber)' : 'var(--solar-border-mid)',
        boxShadow: 'var(--solar-shadow-card)',
        color: 'var(--solar-fg-primary)',
      }
    : isNebula
      ? {
          backgroundColor: 'var(--nebula-bg-panel)',
          borderColor: 'var(--nebula-border-strong)',
          boxShadow: 'var(--nebula-shadow-card)',
          color: 'var(--nebula-fg-primary)',
        }
      : undefined;

  const containerClass = isSolar
    ? 'rounded-[8px] border'
    : isNebula
      ? 'rounded-xl border'
      : isLightMode
        ? 'rounded-xl border bg-[#FAF8F4]/95 border-[#D4CEC2] text-[#16213A] shadow-md'
        : 'rounded-xl border bg-[#0B1124]/94 border-[#233157] text-[#E7EBF5] shadow-lg';

  const mutedTextClass = isSolar
    ? 'text-[var(--solar-fg-blue)]'
    : isNebula
      ? 'text-[var(--nebula-fg-violet)]'
      : isLightMode
        ? 'text-[#5F6576]'
        : 'text-[#8E9DC2]';

  const brightTextClass = isSolar
    ? 'text-[var(--solar-fg-bright)]'
    : isNebula
      ? 'text-[var(--nebula-fg-bright)]'
      : isLightMode
        ? 'text-[#16213A]'
        : 'text-[#F8FAFC]';

  const dividerStyle: React.CSSProperties | undefined = isSolar
    ? { borderColor: 'var(--solar-border-subtle)' }
    : isNebula
      ? { borderColor: 'var(--nebula-border-subtle)' }
      : undefined;

  const dividerClass =
    isSolar || isNebula
      ? 'border-t'
      : isLightMode
        ? 'border-t border-[#E4DFD6]'
        : 'border-t border-[#1E2B4F]';

  const subCardStyle: React.CSSProperties | undefined = isSolar
    ? {
        backgroundColor: 'var(--solar-bg-chip)',
        borderColor: 'var(--solar-border-subtle)',
      }
    : isNebula
      ? {
          backgroundColor: 'var(--nebula-bg-chip)',
          borderColor: 'var(--nebula-border-subtle)',
        }
      : undefined;

  const subCardClass =
    isSolar || isNebula
      ? 'rounded-[6px] border px-2 py-1.5'
      : isLightMode
        ? 'rounded-lg border border-[#E4DFD6] bg-[#FFFFFF]/90 px-2 py-1.5'
        : 'rounded-lg border border-[#1E2B4F] bg-[#101933]/90 px-2 py-1.5';

  const heapPct =
    metrics.jsHeapMb !== null && metrics.jsHeapLimitMb && metrics.jsHeapLimitMb > 0
      ? Math.min(100, Math.round((metrics.jsHeapMb / metrics.jsHeapLimitMb) * 100))
      : null;

  const hasExplicitPosition =
    typeof positionClassName === 'string' &&
    /\b(fixed|absolute|relative|sticky|static)\b/.test(positionClassName);
  const positionPrefix = hasExplicitPosition ? '' : 'absolute ';
  const isLeftAnchored =
    typeof positionClassName === 'string' && /\bleft-/.test(positionClassName);

  return (
    <aside
      data-qa="neural-core-telemetry-overlay"
      aria-label={`3D Neural Core ${activeSystemName} Telemetry Dashboard`}
      className={`${positionPrefix}${positionClassName ?? `${defaultPosition} z-20`} font-mono flex flex-col ${
        isLeftAnchored ? 'items-start' : 'items-end'
      } gap-1.5`}
    >
      <div
        style={containerStyle}
        data-qa="telemetry-dashboard"
        className={`transition-all ${
          expanded || (isSolar && visibleAlert)
            ? onResetMetrics
              ? 'w-[268px]'
              : 'w-[258px]'
            : 'w-auto'
        } ${containerClass}`}
      >
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? 'Collapse 3D Neural Core telemetry dashboard'
              : 'Expand 3D Neural Core telemetry dashboard'
          }
          data-qa="neural-core-telemetry-toggle"
          className="w-full flex items-center justify-between gap-2.5 px-2.5 py-1.5 text-[10px] cursor-pointer transition-opacity hover:opacity-90"
        >
          <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-[0.05em] whitespace-nowrap">
            <Activity
              className="w-3 h-3 shrink-0"
              style={{ color: fpsColorStyle }}
              strokeWidth={2}
            />
            <span className={brightTextClass}>Telemetry Dashboard</span>
            {isSolar && visibleAlert && (
              <AlertTriangle
                className="w-3 h-3 shrink-0"
                style={{ color: 'var(--solar-accent-amber-fg)' }}
                strokeWidth={2.1}
                aria-label="Gravity Well Interference"
              />
            )}
          </span>

          <span className="inline-flex items-center gap-1.5 tabular-nums whitespace-nowrap shrink-0">
            <span style={{ color: fpsColorStyle }} className="font-bold">
              {metrics.fps} FPS
            </span>
            <span className={mutedTextClass}>·</span>
            <span className={mutedTextClass} data-qa="telemetry-header-draw-calls">
              {metrics.drawCalls} DC
            </span>
            {expanded ? (
              <ChevronUp className={`w-3 h-3 shrink-0 ${mutedTextClass}`} />
            ) : (
              <ChevronDown className={`w-3 h-3 shrink-0 ${mutedTextClass}`} />
            )}
          </span>
        </button>

        {expanded && (
          <div style={dividerStyle} className={`${dividerClass} px-2.5 py-2 space-y-1.5 text-[10px]`}>
            {/* Mode + Renderer Classification Row */}
            <div className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.06em]">
              <span className={`${mutedTextClass} truncate`}>
                {activeSystemName} Mode
                {systemSubtitle ? ` · ${systemSubtitle}` : ''}
              </span>
              <span
                style={
                  isSolar
                    ? { color: 'var(--solar-accent-amber-fg)' }
                    : isNebula
                      ? { color: 'var(--nebula-accent-teal)' }
                      : { color: isLightMode ? '#1F3863' : '#97C4FF' }
                }
                className="font-semibold shrink-0"
              >
                {metrics.rendererMode === 'software' ? 'SW WebGL' : 'GPU WebGL'}
              </span>
            </div>

            {/* Frame Rate & Frame Timing */}
            <div style={subCardStyle} className={subCardClass}>
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1 text-[9px] uppercase ${mutedTextClass}`}>
                  <Cpu className="w-2.5 h-2.5 shrink-0" strokeWidth={1.8} />
                  <span>Frame Rate</span>
                </span>
                <span
                  className="font-bold tabular-nums"
                  style={{ color: fpsColorStyle }}
                  data-qa="telemetry-fps-value"
                >
                  {metrics.fps} FPS{' '}
                  <span className={`font-normal ${mutedTextClass}`}>
                    ({metrics.frameMs.toFixed(1)} ms)
                  </span>
                </span>
              </div>
              <div
                className={`mt-1 h-[3px] w-full rounded-full overflow-hidden ${
                  isSolar
                    ? 'bg-[#081226]'
                    : isNebula
                      ? 'bg-[#160B2E]'
                      : isLightMode
                        ? 'bg-[#E4DFD6]'
                        : 'bg-[#172347]'
                }`}
              >
                <div
                  style={{
                    width: `${Math.round(fpsSmoothRatio * 100)}%`,
                    backgroundColor: fpsColorStyle,
                  }}
                  className="h-full rounded-full transition-all duration-200"
                />
              </div>
            </div>

            {/* Draw Calls & Triangles */}
            <div style={subCardStyle} className={subCardClass}>
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1 text-[9px] uppercase ${mutedTextClass}`}>
                  <Layers className="w-2.5 h-2.5 shrink-0" strokeWidth={1.8} />
                  <span>Draw Calls</span>
                </span>
                <span
                  className={`font-bold tabular-nums ${brightTextClass}`}
                  data-qa="telemetry-draw-calls-value"
                >
                  {metrics.drawCalls.toLocaleString()}{' '}
                  <span className={`font-normal ${mutedTextClass}`}>
                    ({formatTriangles(metrics.triangles)} tris)
                  </span>
                </span>
              </div>
            </div>

            {/* Memory Usage (JS Heap + GPU WebGL Buffers) */}
            <div style={subCardStyle} className={subCardClass}>
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1 text-[9px] uppercase ${mutedTextClass}`}>
                  <HardDrive className="w-2.5 h-2.5 shrink-0" strokeWidth={1.8} />
                  <span>Memory</span>
                </span>
                <span
                  className={`font-bold tabular-nums ${brightTextClass}`}
                  data-qa="telemetry-memory-value"
                >
                  {metrics.jsHeapMb !== null ? (
                    <>
                      {metrics.jsHeapMb.toFixed(1)} MB
                      {heapPct !== null ? (
                        <span className={`font-normal ${mutedTextClass}`}> ({heapPct}%)</span>
                      ) : null}
                    </>
                  ) : (
                    <>{metrics.gpuEstimateMb.toFixed(1)} MB VRAM</>
                  )}
                </span>
              </div>
              <div className={`mt-0.5 flex items-center justify-between text-[9px] tabular-nums ${mutedTextClass}`}>
                <span>
                  {metrics.geometries} geo · {metrics.textures} tex · {metrics.programs} prog
                </span>
                {metrics.jsHeapMb !== null && (
                  <span>~{metrics.gpuEstimateMb.toFixed(1)} MB GPU</span>
                )}
              </div>
              <div
                className={`mt-1 h-[3px] w-full rounded-full overflow-hidden ${
                  isSolar
                    ? 'bg-[#081226]'
                    : isNebula
                      ? 'bg-[#160B2E]'
                      : isLightMode
                        ? 'bg-[#E4DFD6]'
                        : 'bg-[#172347]'
                }`}
              >
                <div
                  style={{
                    width: `${
                      heapPct !== null
                        ? Math.max(8, heapPct)
                        : Math.max(10, Math.min(100, Math.round((metrics.gpuEstimateMb / 128) * 100)))
                    }%`,
                    backgroundColor: isSolar
                      ? 'var(--solar-accent-amber)'
                      : isNebula
                        ? 'var(--nebula-accent-magenta)'
                        : isLightMode
                          ? '#1F3863'
                          : '#8FA6E8',
                  }}
                  className="h-full rounded-full transition-all duration-200"
                />
              </div>
            </div>

            {onResetMetrics && (
              <div
                style={subCardStyle}
                className={`${subCardClass} space-y-1.5`}
                data-qa="telemetry-history-buffer"
              >
                <div className="flex items-center justify-between gap-2 text-[9px] uppercase">
                  <span className={mutedTextClass}>
                    Capture Buffer ({historySamples?.length ?? 0}/24)
                  </span>
                  <span className={`tabular-nums font-semibold ${brightTextClass}`}>
                    {historySamples && historySamples.length > 0
                      ? `Avg ${Math.round(
                          historySamples.reduce((sum, s) => sum + s.fps, 0) /
                            historySamples.length,
                        )} FPS`
                      : 'Capturing…'}
                  </span>
                </div>

                {/* Compact Rolling FPS History Sparkline Bars */}
                <div
                  aria-hidden="true"
                  className={`h-5 w-full rounded-[4px] px-1 py-0.5 flex items-end gap-[2px] ${
                    isSolar
                      ? 'bg-[#081226]'
                      : isNebula
                        ? 'bg-[#160B2E]'
                        : isLightMode
                          ? 'bg-[#EFECE4]'
                          : 'bg-[#0B1124]'
                  }`}
                >
                  {Array.from({ length: 24 }).map((_, slotIdx) => {
                    const offset = 24 - (historySamples?.length ?? 0);
                    const sample =
                      slotIdx >= offset && historySamples
                        ? historySamples[slotIdx - offset]
                        : null;
                    const heightPct = sample
                      ? Math.max(16, Math.min(100, Math.round((sample.fps / 65) * 100)))
                      : 12;
                    const barColor = !sample
                      ? isSolar
                        ? 'rgba(130, 174, 240, 0.16)'
                        : isNebula
                          ? 'rgba(167, 139, 250, 0.16)'
                          : isLightMode
                            ? 'rgba(31, 56, 99, 0.14)'
                            : 'rgba(143, 166, 232, 0.14)'
                      : sample.fps >= 48
                        ? isSolar
                          ? '#68E4EF'
                          : isNebula
                            ? 'var(--nebula-accent-teal)'
                            : isLightMode
                              ? '#1C6E46'
                              : '#6FCB9F'
                        : sample.fps >= 24
                          ? isSolar
                            ? 'var(--solar-accent-amber)'
                            : '#FBBF24'
                          : '#FB7185';
                    return (
                      <div
                        key={slotIdx}
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: barColor,
                        }}
                        className="flex-1 rounded-[1px] transition-all duration-150"
                      />
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={onResetMetrics}
                  data-qa="telemetry-reset-metrics-btn"
                  aria-label="Reset Metrics for active 3D simulation system"
                  style={
                    isSolar
                      ? {
                          borderColor: 'var(--solar-border-mid)',
                          color: 'var(--solar-accent-amber-fg)',
                        }
                      : isNebula
                        ? {
                            borderColor: 'var(--nebula-border-subtle)',
                            color: 'var(--nebula-accent-teal)',
                          }
                        : undefined
                  }
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-[5px] border text-[9.5px] font-bold uppercase tracking-[0.04em] cursor-pointer transition-colors ${
                    isSolar
                      ? 'bg-[#081226]/70 hover:bg-[#0D1C3A]'
                      : isNebula
                        ? 'bg-[#160B2E]/70 hover:bg-[#231246]'
                        : isLightMode
                          ? 'bg-[#FAF8F4] border-[#D4CEC2] text-[#1F3863] hover:bg-[#EFECE4]'
                          : 'bg-[#0B1124] border-[#233157] text-[#97C4FF] hover:bg-[#141F3D]'
                  }`}
                >
                  <RotateCcw className="w-2.5 h-2.5 shrink-0" strokeWidth={2.2} />
                  <span>Reset Metrics</span>
                </button>
              </div>
            )}

            {systemSwitcher && (
              <div
                style={subCardStyle}
                className={`${subCardClass} space-y-1.5`}
                data-qa="telemetry-system-switcher"
              >
                <div className="flex items-center justify-between gap-2 text-[9px] uppercase">
                  <span className={mutedTextClass}>Simulation System</span>
                  {systemSwitcher.onOpenNeuralCore && (
                    <button
                      type="button"
                      onClick={systemSwitcher.onOpenNeuralCore}
                      className={`inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer ${
                        isSolar
                          ? 'text-[var(--solar-accent-amber-fg)]'
                          : isNebula
                            ? 'text-[var(--nebula-accent-teal)]'
                            : isLightMode
                              ? 'text-[#1F3863]'
                              : 'text-[#6FCB9F]'
                      }`}
                    >
                      <span>Open 3D Core</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" strokeWidth={2} />
                    </button>
                  )}
                </div>
                <div
                  role="group"
                  aria-label="Active simulation system"
                  className="grid grid-cols-3 gap-1"
                >
                  {(
                    [
                      { id: 'spiral', label: 'Spiral' },
                      { id: 'nebula', label: 'Nebula' },
                      { id: 'solar', label: 'Solar' },
                    ] as const
                  ).map((item) => {
                    const active = systemSwitcher.activeSystem === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => systemSwitcher.onSelectSystem(item.id)}
                        style={
                          active
                            ? isSolar
                              ? {
                                  backgroundColor: 'var(--solar-accent-amber-bg)',
                                  borderColor: 'var(--solar-accent-amber)',
                                  color: 'var(--solar-accent-amber-fg)',
                                }
                              : isNebula
                                ? {
                                    backgroundColor: 'var(--nebula-accent-magenta-bg)',
                                    borderColor: 'var(--nebula-accent-magenta)',
                                    color: 'var(--nebula-accent-magenta-fg)',
                                  }
                                : undefined
                            : undefined
                        }
                        className={`px-1.5 py-1 rounded text-[9.5px] font-bold border transition-colors cursor-pointer ${
                          active
                            ? isSolar || isNebula
                              ? ''
                              : isLightMode
                                ? 'bg-[#1F3863] border-[#1F3863] text-white'
                                : 'bg-[#6FCB9F]/18 border-[#6FCB9F]/55 text-[#6FCB9F]'
                            : isSolar
                              ? 'border-[var(--solar-border-subtle)] text-[var(--solar-fg-blue)] hover:text-white'
                              : isNebula
                                ? 'border-[var(--nebula-border-subtle)] text-[var(--nebula-fg-violet)] hover:text-white'
                                : isLightMode
                                  ? 'border-[#E4DFD6] bg-white text-[#5F6576] hover:text-[#16213A]'
                                  : 'border-[#233157] bg-[#0B1124] text-[#8E9DC2] hover:text-[#E7EBF5]'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Temporary 'Gravity Well Interference' Toast Notification on Orbital Path Intersection */}
      {isSolar && visibleAlert && (
        <div
          role="status"
          aria-live="polite"
          data-qa="telemetry-gravity-well-toast"
          style={{
            backgroundColor: 'rgba(18, 16, 36, 0.96)',
            borderColor: 'var(--solar-accent-amber)',
            boxShadow: 'var(--solar-shadow-card)',
            color: 'var(--solar-fg-bright)',
          }}
          className="w-[258px] rounded-[8px] border px-2.5 py-2 text-[10px] transition-opacity duration-200 motion-reduce:transition-none"
        >
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex items-start gap-2 min-w-0">
              <span
                style={{
                  backgroundColor: 'rgba(255, 181, 99, 0.14)',
                  borderColor: 'var(--solar-accent-amber)',
                  color: 'var(--solar-accent-amber-fg)',
                }}
                className="grid place-items-center w-5 h-5 rounded-[5px] border shrink-0 mt-0.5"
              >
                <AlertTriangle className="w-3 h-3" strokeWidth={2.1} />
              </span>
              <div className="min-w-0">
                <div
                  style={{ color: 'var(--solar-accent-amber-fg)' }}
                  className="font-bold uppercase tracking-[0.05em] leading-tight"
                >
                  Gravity Well Interference
                </div>
                <div className="mt-0.5 text-[9.5px] text-[var(--solar-fg-primary)] truncate">
                  {visibleAlert.pairLabel}
                </div>
                <div className="mt-0.5 text-[9px] text-[var(--solar-border-cyan)] tabular-nums">
                  {visibleAlert.intersectionCount} orbital crossing
                  {visibleAlert.intersectionCount === 1 ? '' : 's'} detected
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVisibleAlert(null)}
              aria-label="Dismiss Gravity Well Interference notice"
              className="p-0.5 rounded-[4px] text-[var(--solar-fg-blue)] hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
