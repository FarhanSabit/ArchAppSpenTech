import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  FastForward,
  Pause,
  Play,
  Rewind,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sliders,
} from 'lucide-react';
import {
  GALAXY_TYPE_PRESETS,
  GalaxyPresetId,
  GalaxyPresetSelector,
  GalaxyTypePreset,
} from './GalaxyPresetSelector';

export { GALAXY_TYPE_PRESETS, GalaxyPresetSelector };
export type { GalaxyPresetId, GalaxyTypePreset };

export type CameraPreset = 'overview' | 'operations' | 'experience' | 'ecliptic';
export type ObservatoryFinish = 'cosmos' | 'nocturnal' | 'stone';

export const TIMELINE_MIN_MYR = -500;
export const TIMELINE_MAX_MYR = 500;

export const TIMELINE_MILESTONES: { epoch: number; label: string; short: string }[] = [
  { epoch: -500, label: 'Assembly', short: '-500 Myr' },
  { epoch: -250, label: 'Early Disk', short: '-250 Myr' },
  { epoch: 0, label: 'Present', short: '0 Myr' },
  { epoch: 250, label: 'Mature', short: '+250 Myr' },
  { epoch: 500, label: 'Projected', short: '+500 Myr' },
];

export function getEpochPhaseLabel(epochMyr: number): string {
  if (epochMyr <= -320) return 'Assembly';
  if (epochMyr < -40) return 'Early Disk';
  if (epochMyr <= 40) return 'Present';
  if (epochMyr < 320) return 'Mature Evolution';
  return 'Projected Horizon';
}

export function formatEpochMyr(epochMyr: number): string {
  const rounded = Math.round(epochMyr);
  if (rounded === 0) return '0 Myr';
  return `${rounded > 0 ? '+' : ''}${rounded} Myr`;
}

export interface GalaxyControlPanelProps {
  isLightMode: boolean;
  dockOpen: boolean;
  onToggleDock: () => void;
  galaxyPreset: GalaxyPresetId;
  onSelectGalaxyPreset: (preset: GalaxyTypePreset) => void;
  morphProgress?: number;
  simEpoch: number;
  onScrubEpoch: (epochMyr: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  isPaused: boolean;
  playbackRate: number;
  onTogglePause: () => void;
  onRewind: () => void;
  onFastForward: () => void;
  onStepEpoch: (deltaMyr: number) => void;
  onJumpToPresent: () => void;
  cameraPreset: CameraPreset;
  onSelectCameraPreset: (preset: CameraPreset) => void;
  finish: ObservatoryFinish;
  onSelectFinish: (finish: ObservatoryFinish) => void;
  spinSpeed: number;
  onSpinSpeedChange: (val: number) => void;
  starDensity: number;
  onStarDensityChange: (val: number) => void;
  orbitalDecay: number;
  onOrbitalDecayChange: (val: number) => void;
  orbitalSpread: number;
  onOrbitalSpreadChange: (val: number) => void;
  totalStarCapacity?: number;
  activeHubCount?: number;
  onReset: () => void;
}

export function GalaxyControlPanel({
  isLightMode,
  dockOpen,
  onToggleDock,
  galaxyPreset,
  onSelectGalaxyPreset,
  morphProgress = 1,
  simEpoch,
  onScrubEpoch,
  onScrubStart,
  onScrubEnd,
  isPaused,
  playbackRate,
  onTogglePause,
  onRewind,
  onFastForward,
  onStepEpoch,
  onJumpToPresent,
  cameraPreset,
  onSelectCameraPreset,
  finish,
  onSelectFinish,
  spinSpeed,
  onSpinSpeedChange,
  starDensity,
  onStarDensityChange,
  orbitalDecay,
  onOrbitalDecayChange,
  orbitalSpread,
  onOrbitalSpreadChange,
  totalStarCapacity = 28000,
  onReset,
}: GalaxyControlPanelProps) {
  const renderedStarsK = ((totalStarCapacity * starDensity) / 1000).toFixed(1);
  const isRewinding = !isPaused && playbackRate < 0;
  const isFastForwarding = !isPaused && playbackRate > 1;
  const epochProgressPct =
    ((simEpoch - TIMELINE_MIN_MYR) / (TIMELINE_MAX_MYR - TIMELINE_MIN_MYR)) * 100;

  const btnNeutral = isLightMode
    ? 'bg-white border-[#D4CEC2] text-[#16213A] hover:border-[#1F3863]'
    : 'bg-[#141D38] border-[#26355E] text-[#D9E3FA] hover:border-[#6FCB9F]';

  const btnActive = isLightMode
    ? 'bg-[#1F3863] border-[#1F3863] text-white'
    : 'bg-[#6FCB9F] border-[#6FCB9F] text-[#0B1020]';

  const segInactive = isLightMode
    ? 'bg-[#EFECE4] text-[#4A5163] hover:text-[#16213A]'
    : 'bg-[#141D38] text-[#A8B4D4] hover:text-white';

  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-20px)] max-w-[920px]"
      role="region"
      aria-label="3D Neural Core Galaxy Simulation Control Panel"
    >
      <div
        className={`rounded-xl border shadow-lg transition-colors ${
          isLightMode
            ? 'bg-[#FAF8F4]/95 border-[#D4CEC2] text-[#16213A]'
            : 'bg-[#0B1124]/95 border-[#233157] text-[#E7EBF5]'
        }`}
      >
        {/* Always-Visible Top Dock Bar: One-Click Galaxy Preset Selector + Transport + Controls Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2.5 py-2">
          <div className="flex-1 min-w-0">
            <GalaxyPresetSelector
              activePreset={galaxyPreset}
              onSelectPreset={onSelectGalaxyPreset}
              isLightMode={isLightMode}
              morphProgress={morphProgress}
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-1 shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onRewind}
                aria-label="Rewind orbital simulation"
                title="Rewind simulation (-2× / -4× / -1×)"
                className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                  isRewinding ? btnActive : btnNeutral
                }`}
              >
                <Rewind className="w-3 h-3" />
                {isRewinding && <span className="tabular-nums">{playbackRate}×</span>}
              </button>

              <button
                type="button"
                onClick={onTogglePause}
                aria-label={isPaused ? 'Play orbital simulation' : 'Pause orbital simulation'}
                className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                  !isPaused && playbackRate === 1 ? btnActive : btnNeutral
                }`}
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                <span className="hidden md:inline">{isPaused ? 'Play' : 'Pause'}</span>
              </button>

              <button
                type="button"
                onClick={onFastForward}
                aria-label="Fast-forward orbital simulation"
                title="Fast-forward simulation (+2× / +4× / +1×)"
                className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                  isFastForwarding ? btnActive : btnNeutral
                }`}
              >
                <FastForward className="w-3 h-3" />
                {isFastForwarding && <span className="tabular-nums">+{playbackRate}×</span>}
              </button>

              <button
                type="button"
                onClick={onReset}
                aria-label="Reset galaxy preset, physics, timeline, and camera"
                title="Reset simulation to baseline"
                className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors whitespace-nowrap ${btnNeutral}`}
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            <button
              type="button"
              onClick={onToggleDock}
              aria-expanded={dockOpen}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors whitespace-nowrap ${
                dockOpen ? btnActive : btnNeutral
              }`}
            >
              <Sliders className="w-3 h-3" strokeWidth={1.75} />
              <span>Controls</span>
              {dockOpen ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Real-Time Physics Sliders + Timeline Scrub + Camera/Observatory */}
        {dockOpen && (
          <div
            className={`px-3 pb-2.5 pt-2 border-t space-y-2.5 text-[10px] font-mono ${
              isLightMode ? 'border-[#E4DFD6]' : 'border-[#1E2B4F]'
            }`}
          >
            {/* Row 1: Real-Time Physics Sliders — Rotation Speed, Star Density, Orbital Decay & Spread */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Galaxy Rotation Speed */}
              <div className="space-y-1">
                <div className="flex items-center justify-between opacity-80">
                  <span>Rotation Speed</span>
                  <span className="tabular-nums font-bold">{spinSpeed.toFixed(2)}×</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2.5}
                  step={0.05}
                  value={spinSpeed}
                  onChange={(e) => onSpinSpeedChange(Number(e.target.value))}
                  aria-label="Galaxy rotation speed"
                  className="w-full spenta-slider"
                />
              </div>

              {/* Star Density */}
              <div className="space-y-1">
                <div className="flex items-center justify-between opacity-80">
                  <span>Star Density</span>
                  <span className="tabular-nums font-bold">
                    {Math.round(starDensity * 100)}% ({renderedStarsK}k)
                  </span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={starDensity}
                  onChange={(e) => onStarDensityChange(Number(e.target.value))}
                  aria-label="Galaxy star density"
                  className="w-full spenta-slider"
                />
              </div>

              {/* Orbital Decay Rate */}
              <div className="space-y-1">
                <div className="flex items-center justify-between opacity-80">
                  <span>Orbital Decay</span>
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
                  type="range"
                  min={0}
                  max={1.0}
                  step={0.05}
                  value={orbitalDecay}
                  onChange={(e) => onOrbitalDecayChange(Number(e.target.value))}
                  aria-label="Orbital decay rate"
                  className="w-full spenta-slider"
                />
              </div>

              {/* Orbital Spread */}
              <div className="space-y-1">
                <div className="flex items-center justify-between opacity-80">
                  <span>Orbital Spread</span>
                  <span className="tabular-nums font-bold">
                    {Math.round(orbitalSpread * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={1.1}
                  step={0.05}
                  value={orbitalSpread}
                  onChange={(e) => onOrbitalSpreadChange(Number(e.target.value))}
                  aria-label="Hub orbital spread"
                  className="w-full spenta-slider"
                />
              </div>
            </div>

            {/* Row 2: Interactive Timeline Scrub + Camera Angle & Observatory Finish */}
            <div
              className={`grid grid-cols-1 lg:grid-cols-12 gap-2.5 pt-2 border-t items-end ${
                isLightMode ? 'border-[#E4DFD6]' : 'border-[#1E2B4F]'
              }`}
            >
              {/* Timeline Scrub (7 cols) */}
              <div className="lg:col-span-7 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold opacity-80 whitespace-nowrap">Timeline</span>
                    <span
                      className={`tabular-nums font-bold whitespace-nowrap ${
                        isLightMode ? 'text-[#1F3863]' : 'text-[#6FCB9F]'
                      }`}
                    >
                      {formatEpochMyr(simEpoch)}
                    </span>
                    <span className="opacity-65 hidden sm:inline truncate">
                      · {getEpochPhaseLabel(simEpoch)}
                    </span>
                    <span className="opacity-55 tabular-nums whitespace-nowrap">
                      · {isPaused ? 'Paused' : `${playbackRate > 0 ? '+' : ''}${playbackRate}×`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onStepEpoch(-50)}
                      aria-label="Step back 50 million years"
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] cursor-pointer transition-colors whitespace-nowrap ${btnNeutral}`}
                    >
                      <SkipBack className="w-2.5 h-2.5" />
                      <span className="tabular-nums">-50</span>
                    </button>
                    <button
                      type="button"
                      onClick={onJumpToPresent}
                      aria-label="Jump to Present epoch (0 Myr)"
                      className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                        Math.abs(simEpoch) < 2 ? btnActive : btnNeutral
                      }`}
                    >
                      0 Myr
                    </button>
                    <button
                      type="button"
                      onClick={() => onStepEpoch(50)}
                      aria-label="Step forward 50 million years"
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] cursor-pointer transition-colors whitespace-nowrap ${btnNeutral}`}
                    >
                      <span className="tabular-nums">+50</span>
                      <SkipForward className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="range"
                    min={TIMELINE_MIN_MYR}
                    max={TIMELINE_MAX_MYR}
                    step={1}
                    value={Math.round(simEpoch)}
                    onPointerDown={onScrubStart}
                    onPointerUp={onScrubEnd}
                    onPointerCancel={onScrubEnd}
                    onBlur={onScrubEnd}
                    onChange={(e) => onScrubEpoch(Number(e.target.value))}
                    aria-label="Galactic evolution timeline scrub in million years"
                    aria-valuetext={`${formatEpochMyr(simEpoch)}, ${getEpochPhaseLabel(simEpoch)}`}
                    className="w-full spenta-slider"
                  />
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute left-1/2 -translate-x-1/2 w-[1.5px] h-2.5 rounded-full ${
                      isLightMode ? 'bg-[#1F3863]/45' : 'bg-[#6FCB9F]/55'
                    }`}
                  />
                  <span className="sr-only">{Math.round(epochProgressPct)}% along timeline</span>
                </div>

                <div className="flex items-center justify-between gap-1 text-[9px] tabular-nums">
                  {TIMELINE_MILESTONES.map((m) => {
                    const near = Math.abs(simEpoch - m.epoch) <= 22;
                    return (
                      <button
                        key={m.epoch}
                        type="button"
                        onClick={() => onScrubEpoch(m.epoch)}
                        title={`Jump to ${m.label} (${m.short})`}
                        className={`cursor-pointer transition-colors whitespace-nowrap ${
                          near
                            ? isLightMode
                              ? 'font-bold text-[#1F3863]'
                              : 'font-bold text-[#6FCB9F]'
                            : 'opacity-55 hover:opacity-100'
                        }`}
                      >
                        {m.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Camera Angle (3 cols) */}
              <div className="lg:col-span-3 space-y-1">
                <div className="font-semibold opacity-75">Camera Angle</div>
                <div className="grid grid-cols-4 gap-1">
                  {(['overview', 'operations', 'experience', 'ecliptic'] as CameraPreset[]).map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => onSelectCameraPreset(preset)}
                        className={`px-1 py-1 rounded text-[9px] font-semibold capitalize cursor-pointer transition-colors whitespace-nowrap truncate ${
                          cameraPreset === preset
                            ? isLightMode
                              ? 'bg-[#1F3863] text-white'
                              : 'bg-[#8FA6E8] text-[#0B1020]'
                            : segInactive
                        }`}
                      >
                        {preset === 'operations'
                          ? 'Ops'
                          : preset === 'experience'
                            ? 'Exp'
                            : preset === 'overview'
                              ? 'View'
                              : 'Edge'}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Observatory Finish (2 cols) */}
              <div className="lg:col-span-2 space-y-1">
                <div className="font-semibold opacity-75">Finish</div>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'cosmos', label: 'Space' },
                      { id: 'nocturnal', label: 'Navy' },
                      { id: 'stone', label: 'Stone' },
                    ] as { id: ObservatoryFinish; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectFinish(opt.id)}
                      className={`px-1 py-1 rounded text-[9px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
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
