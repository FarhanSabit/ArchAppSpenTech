import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Compass,
  Crosshair,
  History,
  LocateFixed,
  Orbit,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Repeat,
  RotateCcw,
  Shuffle,
  SkipForward,
  Sliders,
  Sparkles,
  Sun,
  SunMoon,
  Trash2,
  Waypoints,
  Zap,
} from 'lucide-react';
import {
  OrbitalHistoryEntry,
  formatOrbitalTimestamp,
} from './useOrbitalHistoryRecorder';
import {
  GALAXY_TYPE_PRESETS,
  GalaxyPresetId,
  GalaxyPresetSelector,
  GalaxyTypePreset,
} from './GalaxyPresetSelector';
import {
  GalaxyTimelineScrub,
  TIMELINE_MAX_MYR,
  TIMELINE_MILESTONES,
  TIMELINE_MIN_MYR,
  formatEpochMyr,
  getEpochPhaseLabel,
} from './GalaxyTimelineScrub';

export {
  GALAXY_TYPE_PRESETS,
  GalaxyPresetSelector,
  GalaxyTimelineScrub,
  TIMELINE_MAX_MYR,
  TIMELINE_MILESTONES,
  TIMELINE_MIN_MYR,
  formatEpochMyr,
  getEpochPhaseLabel,
};
export type { GalaxyPresetId, GalaxyTypePreset };
export type { OrbitalHistoryEntry };

export type CameraPreset = 'overview' | 'operations' | 'experience' | 'ecliptic';
export type ObservatoryFinish = 'cosmos' | 'nocturnal' | 'nebula' | 'stone';
export type NeuralCoreSystemMode = 'spiral-galaxy' | 'solar-map';
export type SolarConfigurationPreset =
  | 'stable-circular'
  | 'highly-eccentric'
  | 'young-chaotic';

export const SOLAR_CONFIGURATION_PRESETS: Array<{
  id: SolarConfigurationPreset;
  label: string;
  title: string;
}> = [
  {
    id: 'stable-circular',
    label: 'Stable Circular',
    title: 'Circularized concentric orbits with balanced harmonic spacing',
  },
  {
    id: 'highly-eccentric',
    label: 'Highly Eccentric',
    title: 'Elongated comet-like Keplerian ellipses with overlapping orbital crossings',
  },
  {
    id: 'young-chaotic',
    label: 'Young Chaotic',
    title: 'Procedural protoplanetary layout with crossing orbits and steep mutual tilts',
  },
];

export interface SolarFocusOption {
  id: string;
  label: string;
}

export interface SolarSystemControlConfig {
  focusedBodyId: string;
  focusOptions: SolarFocusOption[];
  onFocusBodyChange: (id: string) => void;
  isHeliocentric: boolean;
  heliocentricPlanetLabel: string;
  onToggleHeliocentricView: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  showOrbits: boolean;
  onToggleOrbits: () => void;
  onRandomizeOrbits: () => void;
  orbitJitterCount?: number;
  orbitalVelocity: number;
  onOrbitalVelocityChange: (val: number) => void;
  orbitalInclinationDeg: number;
  onOrbitalInclinationChange: (deg: number) => void;
  timeScale: number;
  onTimeScaleChange: (val: number) => void;
  dayNightCycle: boolean;
  onToggleDayNightCycle: () => void;
  showConstellations: boolean;
  onToggleConstellations: () => void;
  followPlanet: boolean;
  followPlanetLabel: string;
  onToggleFollowPlanet: () => void;
  stressTestActive: boolean;
  stressTestVelocity?: number;
  onTriggerStressTest: () => void;
  configurationPreset: SolarConfigurationPreset;
  onSelectConfigurationPreset: (preset: SolarConfigurationPreset) => void;
  showResonance: boolean;
  activeResonanceCount?: number;
  onToggleResonance: () => void;
  cinematicTour: boolean;
  cinematicTourStopLabel?: string;
  cinematicTourStepIndex?: number;
  cinematicTourTotalStops?: number;
  onToggleCinematicTour: () => void;
  bloomIntensity: number;
  onBloomIntensityChange: (val: number) => void;
  compact?: boolean;
}

export interface GalaxyControlPanelProps {
  systemMode?: NeuralCoreSystemMode;
  onToggleAlternativeSystem?: () => void;
  isLightMode: boolean;
  dockOpen?: boolean;
  onToggleDock?: () => void;
  galaxyPreset?: GalaxyPresetId;
  onSelectGalaxyPreset?: (preset: GalaxyTypePreset) => void;
  morphProgress?: number;
  simEpoch?: number;
  onScrubEpoch?: (epochMyr: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  isPaused?: boolean;
  playbackRate?: number;
  onTogglePause?: () => void;
  onRewind?: () => void;
  onFastForward?: () => void;
  onStepEpoch?: (deltaMyr: number) => void;
  onJumpToPresent?: () => void;
  cameraPreset?: CameraPreset;
  onSelectCameraPreset?: (preset: CameraPreset) => void;
  finish?: ObservatoryFinish;
  onSelectFinish?: (finish: ObservatoryFinish) => void;
  spinSpeed?: number;
  onSpinSpeedChange?: (val: number) => void;
  starDensity?: number;
  onStarDensityChange?: (val: number) => void;
  orbitalDecay?: number;
  onOrbitalDecayChange?: (val: number) => void;
  orbitalSpread?: number;
  onOrbitalSpreadChange?: (val: number) => void;
  bloomIntensity?: number;
  onBloomIntensityChange?: (val: number) => void;
  nebulaMode?: boolean;
  onToggleNebulaMode?: () => void;
  nebulaDensity?: number;
  onNebulaDensityChange?: (val: number) => void;
  particleTurbulence?: number;
  onParticleTurbulenceChange?: (val: number) => void;
  onRegenerateNebulaClusters?: () => void;
  nebulaParticleCapacity?: number;
  totalStarCapacity?: number;
  activeHubCount?: number;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  cinematicTour?: boolean;
  cinematicTourStopLabel?: string;
  cinematicTourStepIndex?: number;
  cinematicTourTotalStops?: number;
  onToggleCinematicTour?: () => void;
  sequenceMode?: boolean;
  sequenceActivePhase?: 'spiral' | 'solar' | 'nebula';
  sequenceCountdownSec?: number;
  onToggleSequenceMode?: () => void;
  onSelectSequencePhase?: (phase: 'spiral' | 'solar' | 'nebula') => void;
  onAdvanceSequencePhase?: () => void;
  onReset: () => void;
  orbitalHistory?: OrbitalHistoryEntry[];
  onClearOrbitalHistory?: () => void;
  solarControls?: SolarSystemControlConfig;
}

interface OrbitalHistorySectionProps {
  entries: OrbitalHistoryEntry[];
  onClear?: () => void;
  variant: 'solar' | 'nebula' | 'dark' | 'light';
}

function OrbitalHistorySection({ entries, onClear, variant }: OrbitalHistorySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const latest = entries[0] ?? null;

  const isSolar = variant === 'solar';
  const isNebula = variant === 'nebula';
  const isLight = variant === 'light';

  const borderStyle = isSolar
    ? { borderColor: 'var(--solar-border-subtle)' }
    : isNebula
      ? { borderColor: 'var(--nebula-border-subtle)' }
      : undefined;

  const stripStyle = isSolar
    ? { backgroundColor: 'rgba(4, 10, 22, 0.52)', borderColor: 'var(--solar-border-subtle)' }
    : isNebula
      ? { backgroundColor: 'var(--nebula-bg-strip)', borderColor: 'var(--nebula-border-subtle)' }
      : undefined;

  const dividerClass =
    isSolar || isNebula ? '' : isLight ? 'border-[#E4DFD6]' : 'border-[#1E2B4F]';

  const textMutedClass = isSolar
    ? 'text-[var(--solar-fg-muted)]'
    : isNebula
      ? 'text-[var(--nebula-fg-muted)]'
      : isLight
        ? 'text-[#5A6275]'
        : 'text-[#8E9DC2]';

  const textTitleClass = isSolar
    ? 'text-[var(--solar-fg-blue)]'
    : isNebula
      ? 'text-[var(--nebula-fg-violet)]'
      : isLight
        ? 'text-[#16213A]'
        : 'text-[#D6E0F5]';

  const getMetricBadgeStyle = (metric: OrbitalHistoryEntry['metric']) => {
    if (metric === 'inclination') {
      return isLight
        ? 'bg-[#E6F4F1] text-[#0F766E] border-[#99F6E4]'
        : 'bg-[#68E4EF]/14 text-[#68E4EF] border-[#68E4EF]/35';
    }
    if (metric === 'velocity') {
      return isLight
        ? 'bg-[#FEF3C7] text-[#9A6700] border-[#FCD34D]'
        : 'bg-[#FFB563]/14 text-[#FFE0BB] border-[#FFB563]/35';
    }
    return isLight
      ? 'bg-[#EEF3FB] text-[#1F3863] border-[#C7D4EC]'
      : 'bg-[#8FA6E8]/14 text-[#C4D6F0] border-[#8FA6E8]/35';
  };

  return (
    <div
      data-qa="orbital-history-section"
      style={stripStyle}
      className={`border-t text-[10px] font-mono ${dividerClass} ${
        isLight ? 'bg-[#F5F2EA]/80' : !isSolar && !isNebula ? 'bg-[#081022]/80' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-1">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-controls="spenta-orbital-history-list"
          data-qa="orbital-history-toggle"
          className={`flex-1 min-w-0 flex items-center justify-between gap-2 py-0.5 text-left cursor-pointer transition-opacity hover:opacity-100 ${textTitleClass}`}
        >
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <History className="w-3 h-3 shrink-0 opacity-85" strokeWidth={1.85} />
            <span className="font-semibold tracking-[0.02em] whitespace-nowrap">
              Orbital History
            </span>
            <span
              className={`tabular-nums text-[9px] px-1.5 py-0 rounded border ${
                isLight
                  ? 'bg-white border-[#D4CEC2] text-[#4A5163]'
                  : 'bg-white/5 border-white/12 text-current opacity-85'
              }`}
            >
              {entries.length}
            </span>
          </span>

          <span className="inline-flex items-center gap-2 min-w-0">
            {!expanded && latest && (
              <span className={`hidden sm:inline truncate text-[9px] tabular-nums ${textMutedClass}`}>
                {latest.label}: {latest.previousValue} → {latest.newValue} ·{' '}
                {formatOrbitalTimestamp(latest.timestamp)}
              </span>
            )}
            {!expanded && !latest && (
              <span className={`hidden sm:inline truncate text-[9px] ${textMutedClass}`}>
                No inclination / velocity changes
              </span>
            )}
            {expanded ? (
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${textMutedClass}`} />
            ) : (
              <ChevronUp className={`w-3.5 h-3.5 shrink-0 ${textMutedClass}`} />
            )}
          </span>
        </button>

        {expanded && entries.length > 0 && onClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            data-qa="orbital-history-clear"
            aria-label="Clear Orbital History log"
            title="Clear Orbital History log"
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono cursor-pointer transition-colors shrink-0 ${
              isLight
                ? 'bg-white border-[#D4CEC2] text-[#5A6275] hover:text-[#16213A]'
                : 'bg-white/5 border-white/15 text-current opacity-80 hover:opacity-100'
            }`}
          >
            <Trash2 className="w-2.5 h-2.5" strokeWidth={1.85} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {expanded && (
        <div
          id="spenta-orbital-history-list"
          role="log"
          aria-live="polite"
          data-qa="orbital-history-list"
          style={borderStyle}
          className={`border-t px-3 py-1.5 max-h-[96px] overflow-y-auto ${dividerClass}`}
        >
          {entries.length === 0 ? (
            <div className={`text-[9px] py-0.5 ${textMutedClass}`}>
              Adjust inclination or velocity sliders above to record state transitions.
            </div>
          ) : (
            <ul className="space-y-1">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  data-qa="orbital-history-item"
                  className="flex items-center justify-between gap-2 leading-tight"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`inline-block shrink-0 px-1 py-0 rounded border text-[8px] font-bold uppercase tracking-[0.05em] ${getMetricBadgeStyle(
                        entry.metric,
                      )}`}
                    >
                      {entry.metric === 'inclination'
                        ? 'INC'
                        : entry.metric === 'velocity'
                          ? 'VEL'
                          : 'RST'}
                    </span>
                    <span className={`truncate text-[9px] ${textTitleClass}`}>{entry.label}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 tabular-nums text-[9px]">
                    <span className="font-semibold">
                      <span className={textMutedClass}>{entry.previousValue}</span>
                      <span className={`mx-1 ${textMutedClass}`}>→</span>
                      <span>{entry.newValue}</span>
                    </span>
                    <span className={`${textMutedClass} text-[8.5px]`}>
                      {formatOrbitalTimestamp(entry.timestamp)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function GalaxyControlPanel({
  systemMode = 'spiral-galaxy',
  onToggleAlternativeSystem,
  isLightMode,
  dockOpen = false,
  onToggleDock,
  galaxyPreset = 'andromeda-spiral',
  onSelectGalaxyPreset,
  morphProgress = 1,
  simEpoch = 0,
  onScrubEpoch,
  onScrubStart,
  onScrubEnd,
  isPaused = false,
  playbackRate = 1,
  onTogglePause,
  onRewind,
  onFastForward,
  onStepEpoch,
  onJumpToPresent,
  cameraPreset = 'overview',
  onSelectCameraPreset,
  finish = 'cosmos',
  onSelectFinish,
  spinSpeed = 0.85,
  onSpinSpeedChange,
  starDensity = 1.0,
  onStarDensityChange,
  orbitalDecay = 0.0,
  onOrbitalDecayChange,
  orbitalSpread = 0.65,
  onOrbitalSpreadChange,
  bloomIntensity = 1.0,
  onBloomIntensityChange,
  nebulaMode = false,
  onToggleNebulaMode,
  nebulaDensity = 1.0,
  onNebulaDensityChange,
  particleTurbulence = 0.75,
  onParticleTurbulenceChange,
  onRegenerateNebulaClusters,
  nebulaParticleCapacity = 6400,
  totalStarCapacity = 28000,
  autoRotate,
  onToggleAutoRotate,
  cinematicTour = false,
  cinematicTourStopLabel,
  cinematicTourStepIndex = 0,
  cinematicTourTotalStops = 6,
  onToggleCinematicTour,
  sequenceMode = false,
  sequenceActivePhase = 'spiral',
  sequenceCountdownSec = 30,
  onToggleSequenceMode,
  onSelectSequencePhase,
  onAdvanceSequencePhase,
  onReset,
  orbitalHistory = [],
  onClearOrbitalHistory,
  solarControls,
}: GalaxyControlPanelProps) {
  const isSolarMode = systemMode === 'solar-map' && Boolean(solarControls);
  const renderedStarsK = ((totalStarCapacity * starDensity) / 1000).toFixed(1);
  const renderedNebulaK = (((nebulaParticleCapacity * Math.max(0.2, Math.min(2.0, nebulaDensity))) / 2.0) / 1000).toFixed(1);
  const [justReset, setJustReset] = useState(false);
  const [justRandomized, setJustRandomized] = useState(false);
  const resetTimerRef = useRef<number | null>(null);
  const randomizeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
      if (randomizeTimerRef.current !== null) {
        window.clearTimeout(randomizeTimerRef.current);
      }
    };
  }, []);

  const handleResetClick = () => {
    onReset();
    setJustReset(true);
    setJustRandomized(false);
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setJustReset(false);
      resetTimerRef.current = null;
    }, 1400);
  };

  const handleRandomizeOrbitsClick = () => {
    solarControls?.onRandomizeOrbits();
    setJustRandomized(true);
    if (randomizeTimerRef.current !== null) {
      window.clearTimeout(randomizeTimerRef.current);
    }
    randomizeTimerRef.current = window.setTimeout(() => {
      setJustRandomized(false);
      randomizeTimerRef.current = null;
    }, 1100);
  };

  // =========================================================================
  // SOLAR SYSTEM MODE — Unified Bottom Control Dock (.solar-map-scope tokens)
  // =========================================================================
  if (isSolarMode && solarControls) {
    const jitterCount = solarControls.orbitJitterCount ?? 0;
    return (
      <div
        className="solar-map-scope absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-20px)] max-w-[940px]"
        style={{ '--neural-bloom-intensity': solarControls.bloomIntensity.toFixed(2) } as React.CSSProperties}
        role="region"
        aria-label="3D Neural Core Solar System Control Panel"
        data-qa="solar-map-control-strip"
      >
        <div
          style={{
            backgroundColor: 'rgba(4, 10, 22, 0.88)',
            borderColor: 'var(--solar-border-mid)',
            boxShadow: 'var(--solar-shadow-strip)',
            color: 'var(--solar-fg-primary)',
          }}
          className="rounded-[8px] border transition-colors"
        >
          {/* Row 1: Alternative System Toggle + Focus Picker + Playback & Camera Actions */}
          <div className="flex flex-wrap items-center justify-between gap-[8px] px-3 py-2">
            <div className="flex flex-wrap items-center gap-[8px] flex-1 min-w-[220px]">
              {onToggleAlternativeSystem && (
                <button
                  type="button"
                  onClick={onToggleAlternativeSystem}
                  aria-pressed={true}
                  aria-label="Alternative System active: Solar System mode. Click to switch back to Spiral Galaxy."
                  title="Switch back to Spiral Galaxy 3D Neural Core"
                  style={{
                    backgroundColor: 'var(--solar-accent-amber-bg)',
                    borderColor: 'var(--solar-accent-amber)',
                    color: 'var(--solar-accent-amber-fg)',
                    boxShadow: 'rgba(255, 181, 99, 0.28) 0px 0px 0px 1px inset',
                  }}
                  className="inline-flex items-center gap-1.5 px-[10px] h-[34px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap shrink-0"
                >
                  <Sun className="w-3.5 h-3.5 shrink-0" strokeWidth={1.85} />
                  <span>Alternative System</span>
                </button>
              )}

              {/* Focus Picker (.solar-map-select.solar-map-focus-picker) */}
              <div
                style={{
                  backgroundColor: 'var(--solar-bg-select)',
                  borderColor: 'var(--solar-border-mid)',
                }}
                className="flex items-center gap-[8px] px-[10px] h-[34px] min-w-[180px] sm:min-w-[224px] rounded-[6px] border flex-1 sm:flex-initial"
              >
                <Compass
                  className="w-3.5 h-3.5 text-[var(--solar-accent-amber-fg)] shrink-0"
                  strokeWidth={1.75}
                />
                <label htmlFor="spenta-solar-focus-picker" className="sr-only">
                  Focus celestial hub body
                </label>
                <select
                  id="spenta-solar-focus-picker"
                  value={solarControls.focusedBodyId}
                  onChange={(e) => solarControls.onFocusBodyChange(e.target.value)}
                  className="w-full bg-transparent text-[10px] font-mono font-semibold text-white cursor-pointer focus:outline-none"
                >
                  {solarControls.focusOptions.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-[#081226] text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-[6px] shrink-0">
              <button
                type="button"
                onClick={solarControls.onToggleHeliocentricView}
                aria-pressed={solarControls.isHeliocentric}
                aria-label={
                  solarControls.isHeliocentric
                    ? `Heliocentric Sun focus active. Click to shift GSAP camera focus to ${solarControls.heliocentricPlanetLabel}.`
                    : `Planetary focus active on ${solarControls.heliocentricPlanetLabel}. Click to shift GSAP camera focus back to Sun.`
                }
                title={
                  solarControls.isHeliocentric
                    ? `Heliocentric (Sun) · Click to shift focus to ${solarControls.heliocentricPlanetLabel}`
                    : `Focused on ${solarControls.heliocentricPlanetLabel} · Click to return to Heliocentric Sun view`
                }
                data-qa="solar-toggle-heliocentric"
                style={
                  solarControls.isHeliocentric
                    ? {
                        backgroundColor: 'var(--solar-accent-amber-bg)',
                        borderColor: 'var(--solar-accent-amber)',
                        color: 'var(--solar-accent-amber-fg)',
                      }
                    : {
                        backgroundColor: 'rgba(72, 142, 255, 0.22)',
                        borderColor: 'var(--solar-accent-blue)',
                        color: '#FFFFFF',
                      }
                }
                className="inline-flex items-center gap-1.5 px-[9px] h-[32px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
              >
                <Crosshair className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                <span>Toggle Heliocentric View</span>
              </button>

              <button
                type="button"
                onClick={solarControls.onTogglePause}
                aria-label={
                  solarControls.isPaused
                    ? 'Resume planetary orbital simulation'
                    : 'Pause planetary orbital simulation'
                }
                style={{
                  backgroundColor: solarControls.isPaused
                    ? 'var(--solar-accent-amber-bg)'
                    : 'var(--solar-bg-chip)',
                  borderColor: solarControls.isPaused
                    ? 'var(--solar-accent-amber)'
                    : 'var(--solar-border-subtle)',
                  color: solarControls.isPaused
                    ? 'var(--solar-accent-amber-fg)'
                    : 'var(--solar-fg-blue)',
                }}
                className="inline-flex items-center gap-1.5 px-[9px] h-[32px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
              >
                {solarControls.isPaused ? (
                  <Play className="w-3 h-3" />
                ) : (
                  <Pause className="w-3 h-3" />
                )}
                <span>{solarControls.isPaused ? 'Play' : 'Pause'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleAutoRotate}
                aria-pressed={autoRotate}
                aria-label="Toggle automatic slow camera orbit around the Solar System"
                style={{
                  backgroundColor: autoRotate
                    ? 'rgba(72, 142, 255, 0.22)'
                    : 'var(--solar-bg-chip)',
                  borderColor: autoRotate
                    ? 'var(--solar-accent-blue)'
                    : 'var(--solar-border-subtle)',
                  color: autoRotate ? '#FFFFFF' : 'var(--solar-fg-blue)',
                }}
                className="inline-flex items-center gap-1.5 px-[9px] h-[32px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3 h-3 shrink-0 ${autoRotate ? 'animate-spin' : ''}`}
                  style={autoRotate ? { animationDuration: '6s' } : undefined}
                  strokeWidth={1.85}
                />
                <span>Auto-Rotate</span>
              </button>

              <button
                type="button"
                onClick={handleResetClick}
                aria-label="Reset Simulation: restore Solar System velocity, inclination, orbital radii, focus, and camera defaults"
                title="Restore default orbital velocity, inclination, nominal distances, focus, and camera"
                style={
                  justReset
                    ? {
                        backgroundColor: 'var(--solar-accent-amber-bg)',
                        borderColor: 'var(--solar-accent-amber)',
                        color: 'var(--solar-accent-amber-fg)',
                      }
                    : {
                        backgroundColor: 'var(--solar-bg-chip)',
                        borderColor: 'var(--solar-border-subtle)',
                        color: 'var(--solar-fg-blue)',
                      }
                }
                className="inline-flex items-center gap-1.5 px-[9px] h-[32px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
              >
                {justReset ? (
                  <>
                    <Check className="w-3 h-3 shrink-0" strokeWidth={2.25} />
                    <span>Simulation Reset</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                    <span>Reset Simulation</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Row 2 (Always Visible in Solar System Mode): Orbital Velocity, Inclination, Time Scale & Bloom Intensity Sliders */}
          <div
            style={{ borderColor: 'var(--solar-border-subtle)' }}
            className="px-3 py-2 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-center gap-3 text-[10px] font-mono"
          >
            {/* Orbital Velocity Slider (0.00x .. 4.00x) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="spenta-solar-orbital-velocity"
                  className="text-[var(--solar-fg-blue)] whitespace-nowrap"
                >
                  Orbital Velocity
                </label>
                <span
                  className="tabular-nums font-bold"
                  style={{
                    color: solarControls.stressTestActive
                      ? '#FF894F'
                      : 'var(--solar-accent-amber-fg)',
                  }}
                >
                  {solarControls.stressTestActive
                    ? `${(solarControls.stressTestVelocity ?? 10).toFixed(2)}× SURGE`
                    : solarControls.orbitalVelocity === 0
                      ? '0.00× (Halted)'
                      : `${solarControls.orbitalVelocity.toFixed(2)}× Kepler`}
                </span>
              </div>
              <input
                id="spenta-solar-orbital-velocity"
                type="range"
                min={0}
                max={4}
                step={0.05}
                value={solarControls.orbitalVelocity}
                onChange={(e) => solarControls.onOrbitalVelocityChange(Number(e.target.value))}
                aria-label="Planetary orbital velocity multiplier"
                className="w-full spenta-slider"
              />
            </div>

            {/* Orbital Inclination Slider (0 deg Flat Ecliptic .. 45 deg 3D Tilt) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="spenta-solar-orbital-inclination"
                  className="text-[var(--solar-fg-blue)] whitespace-nowrap"
                >
                  Orbital Inclination
                </label>
                <span className="tabular-nums font-bold text-[var(--solar-fg-bright)]">
                  {solarControls.orbitalInclinationDeg === 0
                    ? '0° (Flat Ecliptic)'
                    : `${Math.round(solarControls.orbitalInclinationDeg)}° 3D Tilt`}
                </span>
              </div>
              <input
                id="spenta-solar-orbital-inclination"
                type="range"
                min={0}
                max={45}
                step={1}
                value={solarControls.orbitalInclinationDeg}
                onChange={(e) =>
                  solarControls.onOrbitalInclinationChange(Number(e.target.value))
                }
                aria-label="Planetary orbital inclination angle from 0 to 45 degrees"
                className="w-full spenta-slider"
              />
            </div>

            {/* Dedicated Time Scale Slider (0.1x Slow Motion .. 5.0x Fast Forward) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="spenta-solar-time-scale"
                  className="text-[var(--solar-fg-blue)] whitespace-nowrap"
                >
                  Time Scale
                </label>
                <span
                  className="tabular-nums font-bold"
                  style={{
                    color:
                      solarControls.timeScale < 0.85
                        ? '#68E4EF'
                        : solarControls.timeScale > 1.35
                          ? 'var(--solar-accent-amber-fg)'
                          : 'var(--solar-fg-bright)',
                  }}
                >
                  {solarControls.timeScale.toFixed(1)}×{' '}
                  {solarControls.timeScale < 0.7
                    ? '(Slow Mo)'
                    : solarControls.timeScale > 1.5
                      ? '(Fast Fwd)'
                      : '(Real-Time)'}
                </span>
              </div>
              <input
                id="spenta-solar-time-scale"
                data-qa="solar-time-scale-slider"
                type="range"
                min={0.1}
                max={5.0}
                step={0.1}
                value={solarControls.timeScale}
                onChange={(e) => solarControls.onTimeScaleChange(Number(e.target.value))}
                aria-label="Solar System simulation time scale from 0.1x slow motion to 5.0x fast forward"
                className="w-full spenta-slider"
              />
            </div>

            {/* Post-Processing Bloom Intensity Slider (CSS --neural-bloom-intensity variable) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="spenta-solar-bloom-intensity"
                  className="text-[var(--solar-fg-blue)] whitespace-nowrap"
                >
                  Bloom Intensity
                </label>
                <span
                  className="tabular-nums font-bold"
                  style={{
                    color:
                      solarControls.bloomIntensity <= 0.05
                        ? 'var(--solar-fg-muted)'
                        : solarControls.bloomIntensity >= 1.4
                          ? 'var(--solar-accent-amber-fg)'
                          : 'var(--solar-fg-bright)',
                  }}
                >
                  {solarControls.bloomIntensity <= 0.02
                    ? '0% (Off)'
                    : `${Math.round(solarControls.bloomIntensity * 100)}% Glow`}
                </span>
              </div>
              <input
                id="spenta-solar-bloom-intensity"
                data-qa="solar-bloom-intensity-slider"
                type="range"
                min={0}
                max={2.0}
                step={0.05}
                value={solarControls.bloomIntensity}
                onChange={(e) => solarControls.onBloomIntensityChange(Number(e.target.value))}
                title="Global bloom intensity linked to --neural-bloom-intensity CSS variable"
                aria-label="Global post-processing bloom intensity using --neural-bloom-intensity CSS variable"
                className="w-full spenta-slider"
              />
            </div>
          </div>

          {/* Row 3: Orbital Paths, Orbital Resonance, Day/Night Cycle, Constellations, Follow Planet & Stress Test */}
          <div
            style={{ borderColor: 'var(--solar-border-subtle)' }}
            className="px-3 py-1.5 border-t flex flex-wrap items-center justify-between gap-[6px] text-[10px] font-mono"
          >
            <div className="flex flex-wrap items-center gap-[6px]">
              <button
                type="button"
                onClick={solarControls.onToggleOrbits}
                aria-pressed={solarControls.showOrbits}
                aria-label="Show Orbital Paths: toggle faint dashed elliptical orbital path lines to visualize 3D inclination tilt"
                title="Toggle faint dashed elliptical orbital path lines"
                data-qa="solar-show-orbital-paths"
                style={{
                  backgroundColor: solarControls.showOrbits
                    ? 'var(--solar-accent-amber-bg)'
                    : 'var(--solar-bg-chip)',
                  borderColor: solarControls.showOrbits
                    ? 'var(--solar-accent-amber)'
                    : 'var(--solar-border-subtle)',
                  color: solarControls.showOrbits
                    ? 'var(--solar-accent-amber-fg)'
                    : 'var(--solar-fg-blue)',
                }}
                className="inline-flex items-center gap-1.5 px-[9px] h-[30px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
              >
                <Orbit className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                <span>Show Orbital Paths</span>
              </button>

              <button
                type="button"
                onClick={solarControls.onToggleResonance}
                aria-pressed={solarControls.showResonance}
                aria-label="Orbital Resonance: highlight gravitational interaction points with pulsating light nodes where orbits intersect or align"
                title="Highlight gravitational interaction points where orbits intersect or align"
                data-qa="solar-toggle-orbital-resonance"
                style={
                  solarControls.showResonance
                    ? {
                        backgroundColor: 'rgba(104, 228, 239, 0.16)',
                        borderColor: '#68E4EF',
                        color: '#F7FBFF',
                        boxShadow: 'var(--solar-shadow-glow)',
                      }
                    : {
                        backgroundColor: 'var(--solar-bg-chip)',
                        borderColor: 'var(--solar-border-subtle)',
                        color: 'var(--solar-fg-blue)',
                      }
                }
                className="inline-flex items-center gap-1.5 px-[9px] h-[30px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
              >
                <Radio className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                <span>
                  Orbital Resonance
                  {solarControls.showResonance && (solarControls.activeResonanceCount ?? 0) > 0
                    ? ` (${solarControls.activeResonanceCount})`
                    : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={solarControls.onToggleDayNightCycle}
                aria-pressed={solarControls.dayNightCycle}
                aria-label="Day/Night Cycle: toggle real-time rotating solar illumination across 3D planetary models"
                title="Toggle real-time rotating solar light source and planetary day/night terminator"
                data-qa="solar-toggle-day-night"
                style={{
                  backgroundColor: solarControls.dayNightCycle
                    ? 'var(--solar-accent-amber-bg)'
                    : 'var(--solar-bg-chip)',
                  borderColor: solarControls.dayNightCycle
                    ? 'var(--solar-accent-amber)'
                    : 'var(--solar-border-subtle)',
                  color: solarControls.dayNightCycle
                    ? 'var(--solar-accent-amber-fg)'
                    : 'var(--solar-fg-blue)',
                }}
                className="inline-flex items-center gap-1.5 px-[9px] h-[30px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
              >
                <SunMoon className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                <span>Day/Night Cycle</span>
              </button>

              <button
                type="button"
                onClick={solarControls.onToggleConstellations}
                aria-pressed={solarControls.showConstellations}
                aria-label="Show Constellations: project subtle glowing line-segments between major stars in the celestial background"
                title="Project subtle glowing constellation line-segments across the celestial background"
                data-qa="solar-show-constellations"
                style={
                  solarControls.showConstellations
                    ? {
                        backgroundColor: 'rgba(72, 142, 255, 0.2)',
                        borderColor: 'var(--solar-accent-blue)',
                        color: 'var(--solar-fg-bright)',
                        boxShadow: 'var(--solar-shadow-glow)',
                      }
                    : {
                        backgroundColor: 'var(--solar-bg-chip)',
                        borderColor: 'var(--solar-border-subtle)',
                        color: 'var(--solar-fg-blue)',
                      }
                }
                className="inline-flex items-center gap-1.5 px-[9px] h-[30px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
              >
                <Waypoints className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                <span>Show Constellations</span>
              </button>

              <button
                type="button"
                onClick={solarControls.onToggleFollowPlanet}
                aria-pressed={solarControls.followPlanet}
                aria-label={
                  solarControls.followPlanet
                    ? `Follow Planet active: locking camera to ${solarControls.followPlanetLabel} orbital position`
                    : `Follow Planet: lock camera onto ${solarControls.followPlanetLabel} as it traverses its orbit`
                }
                title={
                  solarControls.followPlanet
                    ? `Camera locked to ${solarControls.followPlanetLabel} · Click to unlock`
                    : `Lock camera to ${solarControls.followPlanetLabel} orbital trajectory`
                }
                data-qa="solar-toggle-follow-planet"
                style={
                  solarControls.followPlanet
                    ? {
                        backgroundColor: 'rgba(72, 142, 255, 0.24)',
                        borderColor: 'var(--solar-accent-blue)',
                        color: '#FFFFFF',
                        boxShadow: 'var(--solar-shadow-glow)',
                      }
                    : {
                        backgroundColor: 'var(--solar-bg-chip)',
                        borderColor: 'var(--solar-border-subtle)',
                        color: 'var(--solar-fg-blue)',
                      }
                }
                className="inline-flex items-center gap-1.5 px-[9px] h-[30px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
              >
                <LocateFixed className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                <span>Follow Planet</span>
              </button>

              <button
                type="button"
                onClick={solarControls.onToggleCinematicTour}
                aria-pressed={solarControls.cinematicTour}
                aria-label={
                  solarControls.cinematicTour
                    ? `Stop Cinematic Tour: currently visiting ${solarControls.cinematicTourStopLabel ?? 'solar waypoint'}`
                    : 'Cinematic Tour: automatically cycle the camera through Sun Core, inner planets, and outer orbital fringes using GSAP interpolation'
                }
                title={
                  solarControls.cinematicTour
                    ? `Active Tour (${(solarControls.cinematicTourStepIndex ?? 0) + 1}/${solarControls.cinematicTourTotalStops ?? 7}): ${solarControls.cinematicTourStopLabel ?? ''} · Click to stop`
                    : 'Cycle camera smoothly across Sun Core, inner planets & outer orbital fringes'
                }
                data-qa="solar-toggle-cinematic-tour"
                style={
                  solarControls.cinematicTour
                    ? {
                        backgroundColor: 'var(--solar-accent-amber-bg)',
                        borderColor: 'var(--solar-accent-amber)',
                        color: 'var(--solar-accent-amber-fg)',
                        boxShadow: 'rgba(255, 181, 99, 0.36) 0px 0px 0px 1px inset',
                      }
                    : {
                        backgroundColor: 'var(--solar-bg-chip)',
                        borderColor: 'var(--solar-border-subtle)',
                        color: 'var(--solar-fg-blue)',
                      }
                }
                className="inline-flex items-center gap-1.5 px-[9px] h-[30px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
              >
                <Clapperboard className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                <span>
                  {solarControls.cinematicTour
                    ? `Cinematic Tour (${(solarControls.cinematicTourStepIndex ?? 0) + 1}/${solarControls.cinematicTourTotalStops ?? 7})`
                    : 'Cinematic Tour'}
                </span>
              </button>

              {onToggleSequenceMode && (
                <button
                  type="button"
                  onClick={onToggleSequenceMode}
                  aria-pressed={sequenceMode}
                  data-qa="solar-toggle-sequence-mode"
                  aria-label="Sequence Mode: automatically iterate every 30 seconds through Spiral Galaxy, Solar System, and Procedural Nebula presets"
                  title="Auto-cycle every 30s: Spiral Galaxy → Solar System → Procedural Nebula"
                  style={
                    sequenceMode
                      ? {
                          backgroundColor: 'rgba(104, 228, 239, 0.16)',
                          borderColor: '#68E4EF',
                          color: '#F7FBFF',
                          boxShadow: 'var(--solar-shadow-glow)',
                        }
                      : {
                          backgroundColor: 'var(--solar-bg-chip)',
                          borderColor: 'var(--solar-border-subtle)',
                          color: 'var(--solar-fg-blue)',
                        }
                  }
                  className="inline-flex items-center gap-1.5 px-[9px] h-[30px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
                >
                  <Repeat className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                  <span className="tabular-nums">
                    {sequenceMode ? `Sequence · ${sequenceCountdownSec}s` : 'Sequence Mode'}
                  </span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={solarControls.onTriggerStressTest}
              aria-pressed={solarControls.stressTestActive}
              aria-label="Velocity Stress Test: momentarily surge all planetary orbital velocities to 10.0x"
              title="Momentarily surge all planetary orbital velocities to 10.0× for a high-intensity mechanics preview"
              data-qa="solar-velocity-stress-test"
              style={
                solarControls.stressTestActive
                  ? {
                      backgroundColor: 'rgba(255, 137, 79, 0.26)',
                      borderColor: '#FF894F',
                      color: '#FFFFFF',
                      boxShadow: 'rgba(255, 181, 99, 0.34) 0px 0px 0px 1px inset',
                    }
                  : {
                      backgroundColor: 'var(--solar-bg-chip)',
                      borderColor: 'var(--solar-border-subtle)',
                      color: 'var(--solar-accent-amber-fg)',
                    }
              }
              className="inline-flex items-center gap-1.5 px-[9px] h-[30px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
            >
              <Zap className="w-3 h-3 shrink-0" strokeWidth={1.9} />
              <span>
                {solarControls.stressTestActive
                  ? `Surging ${(solarControls.stressTestVelocity ?? 10).toFixed(1)}×`
                  : 'Velocity Stress Test'}
              </span>
            </button>
          </div>

          {/* Row 4: Preset Layouts Dropdown & Orbit Jitter */}
          <div
            style={{ borderColor: 'var(--solar-border-subtle)' }}
            className="px-3 py-1.5 border-t flex flex-wrap items-center justify-between gap-[8px] text-[10px] font-mono"
          >
            <div
              className="flex flex-wrap items-center gap-[8px]"
              data-qa="solar-configuration-preset-group"
            >
              <label
                htmlFor="spenta-solar-preset-layouts"
                className="text-[var(--solar-fg-blue)] font-semibold whitespace-nowrap"
              >
                Preset Layouts
              </label>
              <div
                style={{
                  backgroundColor: 'var(--solar-bg-select)',
                  borderColor:
                    solarControls.configurationPreset === 'young-chaotic'
                      ? '#FF894F'
                      : solarControls.configurationPreset === 'highly-eccentric'
                        ? 'var(--solar-accent-amber)'
                        : 'var(--solar-border-mid)',
                  boxShadow: 'var(--solar-shadow-glow)',
                }}
                className="inline-flex items-center gap-[6px] px-[9px] h-[30px] rounded-[6px] border transition-colors"
              >
                <Orbit
                  className="w-3 h-3 shrink-0"
                  style={{
                    color:
                      solarControls.configurationPreset === 'young-chaotic'
                        ? '#FF894F'
                        : solarControls.configurationPreset === 'highly-eccentric'
                          ? 'var(--solar-accent-amber-fg)'
                          : 'var(--solar-accent-blue)',
                  }}
                  strokeWidth={1.85}
                />
                <select
                  id="spenta-solar-preset-layouts"
                  data-qa="solar-preset-layouts-select"
                  value={solarControls.configurationPreset}
                  onChange={(e) =>
                    solarControls.onSelectConfigurationPreset(
                      e.target.value as SolarConfigurationPreset,
                    )
                  }
                  aria-label="Preset Layouts: select orbital mode between Stable Circular, Highly Eccentric, and Young Chaotic"
                  className="bg-transparent text-[10px] font-mono font-semibold text-[var(--solar-fg-bright)] cursor-pointer focus:outline-none pr-1"
                >
                  {SOLAR_CONFIGURATION_PRESETS.map((preset) => (
                    <option
                      key={preset.id}
                      value={preset.id}
                      title={preset.title}
                      className="bg-[#081226] text-white"
                    >
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
              <span className="hidden md:inline text-[9px] text-[var(--solar-fg-muted)] truncate max-w-[260px]">
                {
                  SOLAR_CONFIGURATION_PRESETS.find(
                    (p) => p.id === solarControls.configurationPreset,
                  )?.title
                }
              </span>
            </div>

            <button
              type="button"
              onClick={handleRandomizeOrbitsClick}
              aria-label="Randomize Orbital Orbits: procedurally shift each planet's orbital distance by plus or minus 15 percent"
              title="Procedurally jitter-shift each planet's orbital distance by ±15%"
              data-qa="solar-randomize-orbits"
              style={
                justRandomized
                  ? {
                      backgroundColor: 'rgba(72, 142, 255, 0.24)',
                      borderColor: 'var(--solar-accent-blue)',
                      color: '#FFFFFF',
                    }
                  : jitterCount > 0
                    ? {
                        backgroundColor: 'rgba(72, 142, 255, 0.14)',
                        borderColor: 'var(--solar-border-strong)',
                        color: 'var(--solar-fg-bright)',
                      }
                    : {
                        backgroundColor: 'var(--solar-bg-chip)',
                        borderColor: 'var(--solar-border-subtle)',
                        color: 'var(--solar-fg-blue)',
                      }
              }
              className="inline-flex items-center gap-1.5 px-[9px] h-[30px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
            >
              <Shuffle className="w-3 h-3 shrink-0" strokeWidth={1.85} />
              <span>
                {justRandomized
                  ? 'Orbits Shifted (±15%)'
                  : jitterCount > 0
                    ? `Randomize Orbital Orbits #${jitterCount}`
                    : 'Randomize Orbital Orbits'}
              </span>
            </button>
          </div>

          {/* Active Sequence Mode Cycle Bar (30s Spiral Galaxy -> Solar System -> Procedural Nebula) */}
          {sequenceMode && (
            <div
              data-qa="neural-sequence-mode-bar"
              style={{
                borderColor: 'var(--solar-border-subtle)',
                backgroundColor: 'rgba(4, 10, 22, 0.65)',
              }}
              className="px-3 py-1.5 border-t flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.06em] text-[#68E4EF] font-bold">
                  <Repeat className="w-3 h-3 shrink-0" strokeWidth={2} />
                  <span>Sequence 30s</span>
                </span>
                {(
                  [
                    { id: 'spiral', label: '1. Spiral Galaxy' },
                    { id: 'solar', label: '2. Solar System' },
                    { id: 'nebula', label: '3. Proc. Nebula' },
                  ] as const
                ).map((step) => {
                  const active = sequenceActivePhase === step.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => onSelectSequencePhase?.(step.id)}
                      aria-pressed={active}
                      style={
                        active
                          ? {
                              backgroundColor: 'var(--solar-accent-amber-bg)',
                              borderColor: 'var(--solar-accent-amber)',
                              color: 'var(--solar-accent-amber-fg)',
                            }
                          : {
                              backgroundColor: 'var(--solar-bg-chip)',
                              borderColor: 'var(--solar-border-subtle)',
                              color: 'var(--solar-fg-blue)',
                            }
                      }
                      className="px-2 py-0.5 rounded-[5px] border text-[9.5px] font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
                    >
                      {step.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 h-[4px] rounded-full bg-[#081226] overflow-hidden">
                  <div
                    style={{
                      width: `${Math.max(4, Math.min(100, Math.round(((30 - sequenceCountdownSec) / 30) * 100)))}%`,
                      backgroundImage: 'linear-gradient(90deg, var(--solar-accent-amber), #68E4EF)',
                    }}
                    className="h-full transition-all duration-300"
                  />
                </div>
                <span className="tabular-nums text-[9.5px] text-[var(--solar-fg-bright)]">
                  Next in {sequenceCountdownSec}s
                </span>
                {onAdvanceSequencePhase && (
                  <button
                    type="button"
                    onClick={onAdvanceSequencePhase}
                    title="Advance immediately to next system preset in sequence"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] border border-[var(--solar-border-subtle)] bg-[var(--solar-bg-chip)] text-[var(--solar-fg-blue)] hover:text-white text-[9px] font-semibold cursor-pointer"
                  >
                    <span>Next</span>
                    <SkipForward className="w-2.5 h-2.5" strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Collapsible Orbital History Log (Inclination & Velocity State Transitions) */}
          <OrbitalHistorySection
            entries={orbitalHistory}
            onClear={onClearOrbitalHistory}
            variant="solar"
          />
        </div>
      </div>
    );
  }

  // =========================================================================
  // SPIRAL GALAXY MODE — Unified Bottom Control Dock (Stone / Nocturnal Theme)
  // =========================================================================
  const isNebulaTheme =
    nebulaMode ||
    finish === 'nebula' ||
    (galaxyPreset === 'procedural-nebula' && !isLightMode);

  const btnNeutral = isLightMode
    ? 'bg-white border-[#D4CEC2] text-[#16213A] hover:border-[#1F3863]'
    : isNebulaTheme
      ? 'bg-[var(--nebula-bg-chip)] border-[var(--nebula-border-subtle)] text-[var(--nebula-fg-violet)] hover:border-[var(--nebula-accent-teal)] hover:text-white'
      : 'bg-[#141D38] border-[#26355E] text-[#D9E3FA] hover:border-[#6FCB9F]';

  const btnActive = isLightMode
    ? 'bg-[#1F3863] border-[#1F3863] text-white'
    : isNebulaTheme
      ? 'bg-[#2DD4BF] border-[#2DD4BF] text-[#070414]'
      : 'bg-[#6FCB9F] border-[#6FCB9F] text-[#0B1020]';

  const segInactive = isLightMode
    ? 'bg-[#EFECE4] text-[#4A5163] hover:text-[#16213A]'
    : isNebulaTheme
      ? 'bg-[var(--nebula-bg-chip)] text-[var(--nebula-fg-violet-muted)] hover:text-white'
      : 'bg-[#141D38] text-[#A8B4D4] hover:text-white';

  const dividerClass = isLightMode
    ? 'border-[#E4DFD6]'
    : isNebulaTheme
      ? 'border-[var(--nebula-border-subtle)]'
      : 'border-[#1E2B4F]';

  return (
    <div
      style={{ '--neural-bloom-intensity': bloomIntensity.toFixed(2) } as React.CSSProperties}
      className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-20px)] max-w-[980px] ${
        isNebulaTheme ? 'nebula-core-scope' : !isLightMode ? 'spenta-observatory-dark' : ''
      }`}
      role="region"
      aria-label="3D Neural Core Floating Simulation Control Panel"
    >
      <div
        style={
          isNebulaTheme && !isLightMode
            ? {
                backgroundColor: 'var(--nebula-bg-panel)',
                borderColor: 'var(--nebula-border-strong)',
                boxShadow: 'var(--nebula-shadow-glow)',
                color: 'var(--nebula-fg-bright)',
              }
            : undefined
        }
        className={`rounded-xl border shadow-lg transition-colors overflow-hidden ${
          isNebulaTheme && !isLightMode
            ? ''
            : isLightMode
              ? 'bg-[#FAF8F4]/95 border-[#D4CEC2] text-[#16213A]'
              : 'bg-[#0B1124]/95 border-[#233157] text-[#E7EBF5]'
        }`}
      >
        {isNebulaTheme && !isLightMode && (
          <div
            aria-hidden="true"
            style={{ backgroundImage: 'var(--nebula-gradient-filament)' }}
            className="h-[2px] w-full"
          />
        )}
        {/* Always-Visible Row 1: One-Click Galaxy Preset Selector + Alternative System + Auto-Rotate + Reset + Physics */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 px-3 py-2">
          <div className="flex-1 min-w-0">
            <GalaxyPresetSelector
              activePreset={galaxyPreset}
              onSelectPreset={(preset) => onSelectGalaxyPreset?.(preset)}
              isLightMode={isLightMode}
              morphProgress={morphProgress}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
            {/* Galaxy System Toggle: Nebula Mode + Alternative System (Solar System) */}
            {(onToggleNebulaMode || onToggleAlternativeSystem) && (
              <div
                role="group"
                aria-label="Galaxy System Toggle"
                data-qa="galaxy-system-toggle-group"
                className={`inline-flex items-center gap-1 p-0.5 rounded-lg border ${
                  isLightMode
                    ? 'bg-[#EFECE4] border-[#DCD6C9]'
                    : isNebulaTheme
                      ? 'bg-[var(--nebula-bg-strip)] border-[var(--nebula-border-mid)]'
                      : 'bg-[#081226] border-[#223158]'
                }`}
              >
                {onToggleNebulaMode && (
                  <button
                    type="button"
                    onClick={onToggleNebulaMode}
                    aria-pressed={nebulaMode}
                    data-qa="galaxy-nebula-mode-toggle"
                    aria-label="Nebula Mode: procedurally generate particle clusters using .nebula-core-scope CSS tokens and unlock Nebula Density & Particle Turbulence controls"
                    title="Toggle procedural Nebula particle clusters (.nebula-core-scope tokens)"
                    style={
                      nebulaMode && !isLightMode
                        ? {
                            backgroundColor: 'var(--nebula-accent-magenta-bg)',
                            borderColor: 'var(--nebula-accent-magenta)',
                            color: 'var(--nebula-accent-magenta-fg)',
                            boxShadow: 'var(--nebula-shadow-glow)',
                          }
                        : undefined
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                      nebulaMode
                        ? isLightMode
                          ? 'bg-[#0F766E] border-[#0F766E] text-white'
                          : ''
                        : isLightMode
                          ? 'bg-transparent border-transparent text-[#334155] hover:bg-white hover:text-[#16213A]'
                          : isNebulaTheme
                            ? 'bg-transparent border-transparent text-[var(--nebula-fg-violet)] hover:text-white'
                            : 'bg-transparent border-transparent text-[#C3CCE4] hover:bg-[#141D38] hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                    <span>Nebula Mode</span>
                  </button>
                )}

                {onToggleAlternativeSystem && (
                  <button
                    type="button"
                    onClick={onToggleAlternativeSystem}
                    aria-pressed={false}
                    data-qa="galaxy-alternative-system-toggle"
                    aria-label="Switch to Alternative System: Solar System 3D model"
                    title="Switch 3D Neural Core from Spiral Galaxy to Solar System model"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                      isLightMode
                        ? 'bg-[#FFF7ED] border-[#D97706]/45 text-[#9A3412] hover:bg-[#FFEDD5] hover:border-[#B45309]'
                        : 'bg-[#0C1730] border-[#FFB563]/45 text-[#FFE0BB] hover:bg-[#101F3F] hover:border-[#FFB563]'
                    }`}
                  >
                    <Sun className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                    <span>Alternative System</span>
                  </button>
                )}
              </div>
            )}

            {onToggleCinematicTour && (
              <button
                type="button"
                onClick={onToggleCinematicTour}
                aria-pressed={cinematicTour}
                data-qa="galaxy-toggle-cinematic-tour"
                aria-label={
                  cinematicTour
                    ? `Stop Cinematic Tour: currently visiting ${cinematicTourStopLabel ?? 'galactic waypoint'}`
                    : 'Cinematic Tour: automatically cycle the camera through Solar Core, inner hub arms, and outer orbital fringes using GSAP interpolation'
                }
                title={
                  cinematicTour
                    ? `Active Tour (${cinematicTourStepIndex + 1}/${cinematicTourTotalStops}): ${cinematicTourStopLabel ?? ''} · Click to stop`
                    : 'Cycle camera smoothly across Solar Core, inner arms & outer orbital fringes'
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                  cinematicTour ? btnActive : btnNeutral
                }`}
              >
                <Clapperboard className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                <span>
                  {cinematicTour
                    ? `Cinematic Tour (${cinematicTourStepIndex + 1}/${cinematicTourTotalStops})`
                    : 'Cinematic Tour'}
                </span>
              </button>
            )}

            {onToggleSequenceMode && (
              <button
                type="button"
                onClick={onToggleSequenceMode}
                aria-pressed={sequenceMode}
                data-qa="galaxy-toggle-sequence-mode"
                aria-label="Sequence Mode: automatically iterate every 30 seconds through Spiral Galaxy, Solar System, and Procedural Nebula presets"
                title="Auto-cycle every 30s: Spiral Galaxy → Solar System → Procedural Nebula"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                  sequenceMode ? btnActive : btnNeutral
                }`}
              >
                <Repeat className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                <span className="tabular-nums">
                  {sequenceMode ? `Sequence · ${sequenceCountdownSec}s` : 'Sequence Mode'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleAutoRotate}
              aria-pressed={autoRotate}
              aria-label="Toggle automatic slow camera orbit around the active galaxy model"
              title={
                autoRotate
                  ? 'Disable automatic camera orbit'
                  : 'Automatically orbit camera around the active galaxy'
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                autoRotate ? btnActive : btnNeutral
              }`}
            >
              <RefreshCw
                className={`w-3 h-3 shrink-0 ${autoRotate ? 'animate-spin' : ''}`}
                style={autoRotate ? { animationDuration: '6s' } : undefined}
                strokeWidth={1.85}
              />
              <span>Auto-Rotate</span>
            </button>

            <button
              type="button"
              onClick={handleResetClick}
              aria-label="Reset Simulation: restore all galaxy sliders, preset, timeline, and camera to default values"
              title="Restore all galaxy sliders, preset, timeline, and camera to default values"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                justReset
                  ? isLightMode
                    ? 'bg-[#1C6E46] border-[#1C6E46] text-white'
                    : 'bg-[#6FCB9F] border-[#6FCB9F] text-[#0B1020]'
                  : btnNeutral
              }`}
            >
              {justReset ? (
                <>
                  <Check className="w-3 h-3 shrink-0" strokeWidth={2.25} />
                  <span>Simulation Reset</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                  <span>Reset Simulation</span>
                </>
              )}
            </button>

            {onToggleDock && (
              <button
                type="button"
                onClick={onToggleDock}
                aria-expanded={dockOpen}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                  dockOpen ? btnActive : btnNeutral
                }`}
              >
                <Sliders className="w-3 h-3" strokeWidth={1.75} />
                <span>Physics</span>
                {dockOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronUp className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Always-Visible Row 2: Horizontal Timeline Scrub Range Slider */}
        {onScrubEpoch &&
          onTogglePause &&
          onRewind &&
          onFastForward &&
          onStepEpoch &&
          onJumpToPresent && (
            <div className={`px-3 py-2 border-t ${dividerClass}`}>
              <GalaxyTimelineScrub
                isLightMode={isLightMode}
                simEpoch={simEpoch}
                onScrubEpoch={onScrubEpoch}
                onScrubStart={onScrubStart}
                onScrubEnd={onScrubEnd}
                isPaused={isPaused}
                playbackRate={playbackRate}
                onTogglePause={onTogglePause}
                onRewind={onRewind}
                onFastForward={onFastForward}
                onStepEpoch={onStepEpoch}
                onJumpToPresent={onJumpToPresent}
              />
            </div>
          )}

        {/* Always-Visible Global Bloom Intensity Bar (--neural-bloom-intensity across Spiral & Nebula modes) */}
        <div
          className={`px-3 py-1.5 border-t flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono ${dividerClass}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles
              className={`w-3 h-3 shrink-0 ${
                isLightMode
                  ? 'text-[#B45309]'
                  : isNebulaTheme
                    ? 'text-[var(--nebula-accent-magenta-fg)]'
                    : 'text-[#6FCB9F]'
              }`}
              strokeWidth={1.85}
            />
            <label
              htmlFor="spenta-galaxy-bloom-intensity"
              className="font-semibold whitespace-nowrap"
            >
              Bloom Intensity
            </label>
            <span className="hidden md:inline text-[9px] opacity-65 whitespace-nowrap">
              --neural-bloom-intensity
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-1 min-w-[180px] max-w-[360px]">
            <input
              id="spenta-galaxy-bloom-intensity"
              data-qa="galaxy-bloom-intensity-slider"
              type="range"
              min={0}
              max={2.0}
              step={0.05}
              value={bloomIntensity}
              onChange={(e) => onBloomIntensityChange?.(Number(e.target.value))}
              aria-label="Global post-processing bloom intensity using --neural-bloom-intensity CSS variable"
              className="w-full spenta-slider"
            />
            <span
              className={`tabular-nums font-bold shrink-0 w-[68px] text-right ${
                bloomIntensity <= 0.05
                  ? 'opacity-65'
                  : bloomIntensity >= 1.4
                    ? isLightMode
                      ? 'text-[#B45309]'
                      : isNebulaTheme
                        ? 'text-[var(--nebula-accent-magenta-fg)]'
                        : 'text-[#6FCB9F]'
                    : ''
              }`}
            >
              {bloomIntensity <= 0.02
                ? '0% (Off)'
                : `${Math.round(bloomIntensity * 100)}% Glow`}
            </span>
          </div>
        </div>

        {/* Dynamic Procedural Nebula Controls: visible ONLY when 'Procedural Nebula' preset is selected (.nebula-core-scope CSS variables) */}
        {galaxyPreset === 'procedural-nebula' && (
          <div
            data-qa="nebula-mode-sliders"
            style={{
              backgroundColor: isLightMode ? 'var(--nebula-bg-void)' : 'var(--nebula-bg-strip)',
              borderColor: 'var(--nebula-border-teal)',
              boxShadow: 'var(--nebula-shadow-strip)',
              color: 'var(--nebula-fg-bright)',
            }}
            className="nebula-core-scope px-3 py-2 border-t space-y-2 text-[10px] font-mono"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles
                  style={{ color: 'var(--nebula-accent-teal)' }}
                  className="w-3.5 h-3.5 shrink-0"
                  strokeWidth={1.85}
                />
                <span
                  style={{ color: 'var(--nebula-fg-bright)' }}
                  className="font-semibold truncate"
                >
                  Procedural Nebula Clusters
                </span>
                <span
                  style={{ color: 'var(--nebula-fg-violet)' }}
                  className="hidden sm:inline tabular-nums"
                >
                  · {renderedNebulaK}k Perlin cluster nodes
                </span>
              </div>

              {onRegenerateNebulaClusters && (
                <button
                  type="button"
                  onClick={onRegenerateNebulaClusters}
                  data-qa="nebula-reseed-clusters"
                  title="Procedurally regenerate nebula particle cluster topology using .nebula-core-scope CSS tokens"
                  style={{
                    backgroundColor: 'var(--nebula-bg-chip)',
                    borderColor: 'var(--nebula-border-subtle)',
                    color: 'var(--nebula-fg-violet)',
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap shrink-0"
                >
                  <Shuffle className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                  <span>Reseed Clusters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Dynamic Nebula Density Slider (20% .. 200%) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="spenta-nebula-density"
                    style={{ color: 'var(--nebula-fg-teal)' }}
                    className="whitespace-nowrap"
                  >
                    Nebula Density
                  </label>
                  <span
                    style={{ color: 'var(--nebula-fg-bright)' }}
                    className="tabular-nums font-bold"
                  >
                    {Math.round(nebulaDensity * 100)}% ({renderedNebulaK}k)
                  </span>
                </div>
                <input
                  id="spenta-nebula-density"
                  data-qa="nebula-density-slider"
                  type="range"
                  min={0.2}
                  max={2.0}
                  step={0.05}
                  value={nebulaDensity}
                  onChange={(e) => onNebulaDensityChange?.(Number(e.target.value))}
                  aria-label="Nebula cluster particle density from 20 percent to 200 percent"
                  className="w-full spenta-slider"
                />
              </div>

              {/* Dynamic Particle Turbulence Slider (0% .. 200%) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="spenta-nebula-turbulence"
                    style={{ color: 'var(--nebula-fg-violet)' }}
                    className="whitespace-nowrap"
                  >
                    Particle Turbulence
                  </label>
                  <span
                    style={{ color: 'var(--nebula-accent-magenta-fg)' }}
                    className="tabular-nums font-bold"
                  >
                    {particleTurbulence <= 0.02
                      ? '0% (Calm)'
                      : `${Math.round(particleTurbulence * 100)}% Curl`}
                  </span>
                </div>
                <input
                  id="spenta-nebula-turbulence"
                  data-qa="nebula-turbulence-slider"
                  type="range"
                  min={0}
                  max={2.0}
                  step={0.05}
                  value={particleTurbulence}
                  onChange={(e) => onParticleTurbulenceChange?.(Number(e.target.value))}
                  aria-label="Nebula particle curl turbulence intensity from 0 percent to 200 percent"
                  className="w-full spenta-slider"
                />
              </div>
            </div>
          </div>
        )}

        {/* Expandable Real-Time Physics Sliders (.spenta-slider) + Compact Camera & Observatory Controls */}
        {dockOpen && (
          <div
            className={`px-3 pb-2.5 pt-2 border-t space-y-2 text-[10px] font-mono ${dividerClass}`}
          >
            {/* Primary Real-Time Adjustment Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Galaxy Rotation Speed */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 opacity-85">
                  <label htmlFor="spenta-galaxy-rotation" className="whitespace-nowrap">
                    Rotation Speed
                  </label>
                  <span className="tabular-nums font-bold">{spinSpeed.toFixed(2)}×</span>
                </div>
                <input
                  id="spenta-galaxy-rotation"
                  type="range"
                  min={0}
                  max={2.5}
                  step={0.05}
                  value={spinSpeed}
                  onChange={(e) => onSpinSpeedChange?.(Number(e.target.value))}
                  aria-label="Galaxy rotation speed"
                  className="w-full spenta-slider"
                />
              </div>

              {/* Orbital Decay Rate */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 opacity-85">
                  <label htmlFor="spenta-galaxy-decay" className="whitespace-nowrap">
                    Orbital Decay
                  </label>
                  <span
                    className={`tabular-nums font-bold ${
                      orbitalDecay > 0
                        ? isLightMode
                          ? 'text-[#B45309]'
                          : 'text-amber-400'
                        : ''
                    }`}
                  >
                    {orbitalDecay === 0 ? 'Stable' : `${Math.round(orbitalDecay * 100)}%`}
                  </span>
                </div>
                <input
                  id="spenta-galaxy-decay"
                  type="range"
                  min={0}
                  max={1.0}
                  step={0.05}
                  value={orbitalDecay}
                  onChange={(e) => onOrbitalDecayChange?.(Number(e.target.value))}
                  aria-label="Orbital decay rate"
                  className="w-full spenta-slider"
                />
              </div>

              {/* Star Density */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 opacity-85">
                  <label htmlFor="spenta-galaxy-density" className="whitespace-nowrap">
                    Star Density
                  </label>
                  <span className="tabular-nums font-bold">
                    {Math.round(starDensity * 100)}% ({renderedStarsK}k)
                  </span>
                </div>
                <input
                  id="spenta-galaxy-density"
                  type="range"
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={starDensity}
                  onChange={(e) => onStarDensityChange?.(Number(e.target.value))}
                  aria-label="Galaxy star density"
                  className="w-full spenta-slider"
                />
              </div>

              {/* Orbital Spread */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 opacity-85">
                  <label htmlFor="spenta-galaxy-spread" className="whitespace-nowrap">
                    Orbital Spread
                  </label>
                  <span className="tabular-nums font-bold">
                    {Math.round(orbitalSpread * 100)}%
                  </span>
                </div>
                <input
                  id="spenta-galaxy-spread"
                  type="range"
                  min={0.25}
                  max={1.1}
                  step={0.05}
                  value={orbitalSpread}
                  onChange={(e) => onOrbitalSpreadChange?.(Number(e.target.value))}
                  aria-label="Hub orbital spread"
                  className="w-full spenta-slider"
                />
              </div>
            </div>

            {/* Compact Camera Angle & Observatory Finish Strip */}
            {(onSelectCameraPreset || onSelectFinish) && (
              <div
                className={`pt-2 border-t flex flex-wrap items-center justify-between gap-2 ${dividerClass}`}
                data-qa="galaxy-camera-finish-strip"
              >
                {onSelectCameraPreset && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="opacity-70 uppercase tracking-[0.06em] text-[9px]">
                      Camera
                    </span>
                    <div
                      role="group"
                      aria-label="Camera angle presets"
                      className={`inline-flex items-center rounded-md border overflow-hidden ${
                        isLightMode
                          ? 'border-[#D4CEC2]'
                          : isNebulaTheme
                            ? 'border-[var(--nebula-border-subtle)]'
                            : 'border-[#26355E]'
                      }`}
                    >
                      {(
                        [
                          { id: 'overview', label: 'Overview' },
                          { id: 'operations', label: 'Operations' },
                          { id: 'experience', label: 'Experience' },
                          { id: 'ecliptic', label: 'Ecliptic' },
                        ] as const
                      ).map((cam) => {
                        const active = cameraPreset === cam.id;
                        return (
                          <button
                            key={cam.id}
                            type="button"
                            onClick={() => onSelectCameraPreset(cam.id)}
                            aria-pressed={active}
                            className={`px-2 py-1 text-[10px] font-mono font-semibold cursor-pointer transition-colors ${
                              active
                                ? isLightMode
                                  ? 'bg-[#1F3863] text-white'
                                  : isNebulaTheme
                                    ? 'bg-[#2DD4BF] text-[#070414]'
                                    : 'bg-[#6FCB9F] text-[#0B1020]'
                                : segInactive
                            }`}
                          >
                            {cam.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {onSelectFinish && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="opacity-70 uppercase tracking-[0.06em] text-[9px]">
                      Finish
                    </span>
                    <div
                      role="group"
                      aria-label="Observatory finish theme"
                      className={`inline-flex items-center rounded-md border overflow-hidden ${
                        isLightMode
                          ? 'border-[#D4CEC2]'
                          : isNebulaTheme
                            ? 'border-[var(--nebula-border-subtle)]'
                            : 'border-[#26355E]'
                      }`}
                    >
                      {(
                        [
                          { id: 'cosmos', label: 'Cosmos' },
                          { id: 'nocturnal', label: 'Navy' },
                          { id: 'nebula', label: 'Nebula' },
                          { id: 'stone', label: 'Stone' },
                        ] as const
                      ).map((opt) => {
                        const active = finish === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onSelectFinish(opt.id)}
                            aria-pressed={active}
                            className={`px-2 py-1 text-[10px] font-mono font-semibold cursor-pointer transition-colors ${
                              active
                                ? isLightMode
                                  ? 'bg-[#1F3863] text-white'
                                  : isNebulaTheme
                                    ? 'bg-[#2DD4BF] text-[#070414]'
                                    : 'bg-[#6FCB9F] text-[#0B1020]'
                                : segInactive
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Active Sequence Mode Cycle Bar (30s Spiral Galaxy -> Solar System -> Procedural Nebula) */}
        {sequenceMode && (
          <div
            data-qa="neural-sequence-mode-bar"
            style={
              isNebulaTheme && !isLightMode
                ? {
                    backgroundColor: 'var(--nebula-bg-strip)',
                    borderColor: 'var(--nebula-border-subtle)',
                  }
                : undefined
            }
            className={`px-3 py-1.5 border-t flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono ${dividerClass} ${
              !isNebulaTheme
                ? isLightMode
                  ? 'bg-[#EFECE4]/85'
                  : 'bg-[#081226]/75'
                : ''
            }`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.06em] font-bold ${
                  isLightMode
                    ? 'text-[#1F3863]'
                    : isNebulaTheme
                      ? 'text-[var(--nebula-accent-teal)]'
                      : 'text-[#6FCB9F]'
                }`}
              >
                <Repeat className="w-3 h-3 shrink-0" strokeWidth={2} />
                <span>Sequence 30s</span>
              </span>
              {(
                [
                  { id: 'spiral', label: '1. Spiral Galaxy' },
                  { id: 'solar', label: '2. Solar System' },
                  { id: 'nebula', label: '3. Proc. Nebula' },
                ] as const
              ).map((step) => {
                const active = sequenceActivePhase === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => onSelectSequencePhase?.(step.id)}
                    aria-pressed={active}
                    className={`px-2 py-0.5 rounded-md border text-[9.5px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                      active ? btnActive : btnNeutral
                    }`}
                  >
                    {step.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`w-20 h-[4px] rounded-full overflow-hidden ${
                  isLightMode
                    ? 'bg-[#D4CEC2]'
                    : isNebulaTheme
                      ? 'bg-[#160B2E]'
                      : 'bg-[#172347]'
                }`}
              >
                <div
                  style={{
                    width: `${Math.max(4, Math.min(100, Math.round(((30 - sequenceCountdownSec) / 30) * 100)))}%`,
                    backgroundColor: isLightMode
                      ? '#1F3863'
                      : isNebulaTheme
                        ? 'var(--nebula-accent-teal)'
                        : '#6FCB9F',
                  }}
                  className="h-full transition-all duration-300"
                />
              </div>
              <span className="tabular-nums text-[9.5px] opacity-90">
                Next in {sequenceCountdownSec}s
              </span>
              {onAdvanceSequencePhase && (
                <button
                  type="button"
                  onClick={onAdvanceSequencePhase}
                  title="Advance immediately to next system preset in sequence"
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-semibold cursor-pointer ${btnNeutral}`}
                >
                  <span>Next</span>
                  <SkipForward className="w-2.5 h-2.5" strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Collapsible Orbital History Log (Inclination & Velocity State Transitions) */}
        <OrbitalHistorySection
          entries={orbitalHistory}
          onClear={onClearOrbitalHistory}
          variant={isLightMode ? 'light' : isNebulaTheme ? 'nebula' : 'dark'}
        />
      </div>
    </div>
  );
}
