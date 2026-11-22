import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Orbit,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Shuffle,
  Sliders,
  Sun,
} from 'lucide-react';
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

export type CameraPreset = 'overview' | 'operations' | 'experience' | 'ecliptic';
export type ObservatoryFinish = 'cosmos' | 'nocturnal' | 'stone';
export type NeuralCoreSystemMode = 'spiral-galaxy' | 'solar-map';

export interface SolarFocusOption {
  id: string;
  label: string;
}

export interface SolarSystemControlConfig {
  focusedBodyId: string;
  focusOptions: SolarFocusOption[];
  onFocusBodyChange: (id: string) => void;
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
  totalStarCapacity?: number;
  activeHubCount?: number;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onReset: () => void;
  solarControls?: SolarSystemControlConfig;
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
  totalStarCapacity = 28000,
  autoRotate,
  onToggleAutoRotate,
  onReset,
  solarControls,
}: GalaxyControlPanelProps) {
  const isSolarMode = systemMode === 'solar-map' && Boolean(solarControls);
  const renderedStarsK = ((totalStarCapacity * starDensity) / 1000).toFixed(1);
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

          {/* Row 2 (Always Visible in Solar System Mode): Orbital Velocity & Inclination Sliders + Orbital Paths & Randomize Orbits */}
          <div
            style={{ borderColor: 'var(--solar-border-subtle)' }}
            className="px-3 py-2 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] items-center gap-3 text-[10px] font-mono"
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
                <span className="tabular-nums font-bold text-[var(--solar-accent-amber-fg)]">
                  {solarControls.orbitalVelocity === 0
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

            {/* Dashed Orbital Paths Toggle & Procedural +/-15% Orbit Randomizer */}
            <div className="sm:col-span-2 lg:col-span-1 flex flex-wrap items-center justify-start lg:justify-end gap-[6px]">
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
                className="inline-flex items-center gap-1.5 px-[9px] h-[32px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
              >
                <Orbit className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                <span>Show Orbital Paths</span>
              </button>

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
                className="inline-flex items-center gap-1.5 px-[9px] h-[32px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:text-white whitespace-nowrap"
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
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SPIRAL GALAXY MODE — Unified Bottom Control Dock (Stone / Nocturnal Theme)
  // =========================================================================
  const btnNeutral = isLightMode
    ? 'bg-white border-[#D4CEC2] text-[#16213A] hover:border-[#1F3863]'
    : 'bg-[#141D38] border-[#26355E] text-[#D9E3FA] hover:border-[#6FCB9F]';

  const btnActive = isLightMode
    ? 'bg-[#1F3863] border-[#1F3863] text-white'
    : 'bg-[#6FCB9F] border-[#6FCB9F] text-[#0B1020]';

  const segInactive = isLightMode
    ? 'bg-[#EFECE4] text-[#4A5163] hover:text-[#16213A]'
    : 'bg-[#141D38] text-[#A8B4D4] hover:text-white';

  const dividerClass = isLightMode ? 'border-[#E4DFD6]' : 'border-[#1E2B4F]';

  return (
    <div
      className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-20px)] max-w-[920px] ${
        !isLightMode ? 'spenta-observatory-dark' : ''
      }`}
      role="region"
      aria-label="3D Neural Core Floating Simulation Control Panel"
    >
      <div
        className={`rounded-xl border shadow-lg transition-colors ${
          isLightMode
            ? 'bg-[#FAF8F4]/95 border-[#D4CEC2] text-[#16213A]'
            : 'bg-[#0B1124]/95 border-[#233157] text-[#E7EBF5]'
        }`}
      >
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
            {onToggleAlternativeSystem && (
              <button
                type="button"
                onClick={onToggleAlternativeSystem}
                aria-pressed={false}
                aria-label="Switch to Alternative System: Solar System 3D model"
                title="Switch 3D Neural Core from Spiral Galaxy to Solar System model"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                  isLightMode
                    ? 'bg-[#FFF7ED] border-[#D97706]/45 text-[#9A3412] hover:bg-[#FFEDD5] hover:border-[#B45309]'
                    : 'bg-[#081226] border-[#FFB563]/45 text-[#FFE0BB] hover:bg-[#101F3F] hover:border-[#FFB563]'
                }`}
              >
                <Sun className="w-3 h-3 shrink-0" strokeWidth={1.85} />
                <span>Alternative System</span>
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
            <div
              className={`flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t ${dividerClass}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="opacity-70 whitespace-nowrap">Camera</span>
                <div className="flex items-center gap-1">
                  {(['overview', 'operations', 'experience', 'ecliptic'] as CameraPreset[]).map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => onSelectCameraPreset?.(preset)}
                        className={`px-2 py-0.5 rounded text-[9px] font-semibold capitalize cursor-pointer transition-colors whitespace-nowrap ${
                          cameraPreset === preset
                            ? isLightMode
                              ? 'bg-[#1F3863] text-white'
                              : 'bg-[#8FA6E8] text-[#0B1020]'
                            : segInactive
                        }`}
                      >
                        {preset}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="opacity-70 whitespace-nowrap">Finish</span>
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'cosmos', label: 'Cosmos' },
                      { id: 'nocturnal', label: 'Navy' },
                      { id: 'stone', label: 'Stone' },
                    ] as { id: ObservatoryFinish; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectFinish?.(opt.id)}
                      className={`px-2 py-0.5 rounded text-[9px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                        finish === opt.id
                          ? isLightMode
                            ? 'bg-[#1F3863] text-white'
                            : 'bg-[#8FA6E8] text-[#0B1020]'
                          : segInactive
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
