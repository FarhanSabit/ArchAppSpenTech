import React from 'react';
import { ChevronDown, ChevronUp, Pause, Play, RotateCcw, Sliders } from 'lucide-react';

export type CameraPreset = 'overview' | 'operations' | 'experience' | 'ecliptic';
export type ObservatoryFinish = 'cosmos' | 'nocturnal' | 'stone';

export interface GalaxyPhysicsPreset {
  id: 'balanced' | 'deep-field' | 'relativistic-decay' | 'minimal-core';
  label: string;
  spinSpeed: number;
  starDensity: number;
  orbitalDecay: number;
  orbitalSpread: number;
}

export const GALAXY_PHYSICS_PRESETS: GalaxyPhysicsPreset[] = [
  {
    id: 'balanced',
    label: 'Balanced Spiral',
    spinSpeed: 0.85,
    starDensity: 1.0,
    orbitalDecay: 0.0,
    orbitalSpread: 0.65,
  },
  {
    id: 'deep-field',
    label: 'Deep Field',
    spinSpeed: 0.35,
    starDensity: 1.0,
    orbitalDecay: 0.0,
    orbitalSpread: 0.85,
  },
  {
    id: 'relativistic-decay',
    label: 'Orbital Inspiral',
    spinSpeed: 1.65,
    starDensity: 0.85,
    orbitalDecay: 0.65,
    orbitalSpread: 0.55,
  },
  {
    id: 'minimal-core',
    label: 'Sparse Core',
    spinSpeed: 0.6,
    starDensity: 0.35,
    orbitalDecay: 0.15,
    orbitalSpread: 0.5,
  },
];

export interface GalaxyControlPanelProps {
  isLightMode: boolean;
  dockOpen: boolean;
  onToggleDock: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
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
  onApplyPhysicsPreset: (preset: GalaxyPhysicsPreset) => void;
  onReset: () => void;
}

export function GalaxyControlPanel({
  isLightMode,
  dockOpen,
  onToggleDock,
  isPaused,
  onTogglePause,
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
  activeHubCount = 8,
  onApplyPhysicsPreset,
  onReset,
}: GalaxyControlPanelProps) {
  const renderedStarsK = ((totalStarCapacity * starDensity) / 1000).toFixed(1);

  const activePresetId = GALAXY_PHYSICS_PRESETS.find(
    (p) =>
      Math.abs(p.spinSpeed - spinSpeed) < 0.01 &&
      Math.abs(p.starDensity - starDensity) < 0.01 &&
      Math.abs(p.orbitalDecay - orbitalDecay) < 0.01 &&
      Math.abs(p.orbitalSpread - orbitalSpread) < 0.01,
  )?.id;

  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-24px)] max-w-[840px]"
      role="region"
      aria-label="Spiral Galaxy Simulation Control Panel"
    >
      <div
        className={`rounded-xl border shadow-lg transition-colors ${
          isLightMode
            ? 'bg-[#FAF8F4]/95 border-[#D4CEC2] text-[#16213A]'
            : 'bg-[#0B1124]/94 border-[#233157] text-[#E7EBF5]'
        }`}
      >
        {/* Compact Collapsible Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onToggleDock}
              aria-expanded={dockOpen}
              className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.14em] cursor-pointer whitespace-nowrap"
            >
              <Sliders className="w-3 h-3 opacity-80" strokeWidth={1.75} />
              <span>Galaxy Controls</span>
              {dockOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
            <span className="hidden sm:inline text-[10px] font-mono opacity-60 truncate tabular-nums">
              · {renderedStarsK}k Stars · {activeHubCount} Hubs · {spinSpeed.toFixed(2)}× Spin ·{' '}
              {orbitalDecay > 0 ? `Decay ${Math.round(orbitalDecay * 100)}%` : 'Stable Orbit'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onTogglePause}
              aria-label={isPaused ? 'Resume orbital simulation' : 'Pause orbital simulation'}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors ${
                isLightMode
                  ? 'bg-white border-[#D4CEC2] text-[#16213A] hover:border-[#1F3863]'
                  : 'bg-[#141D38] border-[#26355E] text-[#D9E3FA] hover:border-[#6FCB9F]'
              }`}
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              <span>{isPaused ? 'Play' : 'Pause'}</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              aria-label="Reset galaxy physics and camera"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors ${
                isLightMode
                  ? 'bg-white border-[#D4CEC2] text-[#16213A] hover:border-[#1F3863]'
                  : 'bg-[#141D38] border-[#26355E] text-[#D9E3FA] hover:border-[#6FCB9F]'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Expandable Real-Time Controls Body */}
        {dockOpen && (
          <div
            className={`px-3 pb-3 pt-2 border-t space-y-2.5 text-[10px] font-mono ${
              isLightMode ? 'border-[#E4DFD6]' : 'border-[#1E2B4F]'
            }`}
          >
            {/* Row 1: Camera Presets, Observatory Finish & Physics Presets */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-4 space-y-1">
                <div className="uppercase tracking-wider opacity-65">Camera Angle</div>
                <div className="grid grid-cols-4 gap-1">
                  {(['overview', 'operations', 'experience', 'ecliptic'] as CameraPreset[]).map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => onSelectCameraPreset(preset)}
                        className={`px-1.5 py-1 rounded text-[10px] font-semibold capitalize cursor-pointer transition-colors whitespace-nowrap ${
                          cameraPreset === preset
                            ? isLightMode
                              ? 'bg-[#1F3863] text-white'
                              : 'bg-[#6FCB9F] text-[#0B1020]'
                            : isLightMode
                              ? 'bg-[#EFECE4] text-[#4A5163] hover:text-[#16213A]'
                              : 'bg-[#141D38] text-[#A8B4D4] hover:text-white'
                        }`}
                      >
                        {preset}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="md:col-span-3 space-y-1">
                <div className="uppercase tracking-wider opacity-65">Observatory</div>
                <div className="grid grid-cols-3 gap-1">
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
                      onClick={() => onSelectFinish(opt.id)}
                      className={`px-1.5 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                        finish === opt.id
                          ? isLightMode
                            ? 'bg-[#1F3863] text-white'
                            : 'bg-[#8FA6E8] text-[#0B1020]'
                          : isLightMode
                            ? 'bg-[#EFECE4] text-[#4A5163] hover:text-[#16213A]'
                            : 'bg-[#141D38] text-[#A8B4D4] hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-5 space-y-1">
                <div className="uppercase tracking-wider opacity-65">Physics Regime</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {GALAXY_PHYSICS_PRESETS.map((preset) => {
                    const active = activePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onApplyPhysicsPreset(preset)}
                        className={`px-1.5 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors truncate ${
                          active
                            ? isLightMode
                              ? 'bg-[#1C6E46] text-white'
                              : 'bg-[#6FCB9F] text-[#0B1020]'
                            : isLightMode
                              ? 'bg-[#EFECE4] text-[#4A5163] hover:text-[#16213A]'
                              : 'bg-[#141D38] text-[#A8B4D4] hover:text-white'
                        }`}
                        title={`Spin ${preset.spinSpeed}× · Density ${Math.round(preset.starDensity * 100)}% · Decay ${Math.round(preset.orbitalDecay * 100)}%`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 2: Real-Time Sliders — Rotation Speed, Star Density, Orbital Decay & Spread */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-0.5">
              {/* Galaxy Rotation Speed */}
              <div className="space-y-1">
                <div className="flex items-center justify-between uppercase tracking-wider opacity-75">
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
                <div className="flex items-center justify-between uppercase tracking-wider opacity-75">
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
                <div className="flex items-center justify-between uppercase tracking-wider opacity-75">
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
                <div className="flex items-center justify-between uppercase tracking-wider opacity-75">
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
          </div>
        )}
      </div>
    </div>
  );
}
