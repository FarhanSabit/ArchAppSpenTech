import React from 'react';
import { Disc3, Flame, Orbit } from 'lucide-react';

export type GalaxyPresetId =
  | 'andromeda-spiral'
  | 'elliptical-dense'
  | 'active-starburst';

export interface GalaxyTypePreset {
  id: GalaxyPresetId;
  label: string;
  shortLabel: string;
  classification: string;
  description: string;
  spinSpeed: number;
  starDensity: number;
  orbitalDecay: number;
  orbitalSpread: number;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
}

export const GALAXY_TYPE_PRESETS: GalaxyTypePreset[] = [
  {
    id: 'andromeda-spiral',
    label: 'Andromeda-like Spiral',
    shortLabel: 'Andromeda Spiral',
    classification: 'SA(s)b · Grand-Design Disk',
    description: 'Sweeping 5-arm logarithmic spiral disk with warm core bulge and H-II star-forming knots',
    spinSpeed: 0.85,
    starDensity: 1.0,
    orbitalDecay: 0.0,
    orbitalSpread: 0.65,
    cameraPos: [0.0, 7.6, 13.8],
    cameraTarget: [0, -0.15, 0],
  },
  {
    id: 'elliptical-dense',
    label: 'Elliptical Dense',
    shortLabel: 'Elliptical Dense',
    classification: 'E3 · Triaxial Spheroid',
    description: 'High-density golden triaxial spheroid with 18 ancient globular clusters and 3D shell orbits',
    spinSpeed: 0.35,
    starDensity: 1.0,
    orbitalDecay: 0.15,
    orbitalSpread: 0.55,
    cameraPos: [5.4, 5.2, 12.2],
    cameraTarget: [0, 0, 0],
  },
  {
    id: 'active-starburst',
    label: 'Active Starburst',
    shortLabel: 'Active Starburst',
    classification: 'I0 · Bipolar Superwind',
    description: 'Hyper-luminous starburst nucleus driving ionized crimson and violet bipolar outflow plumes',
    spinSpeed: 1.55,
    starDensity: 1.0,
    orbitalDecay: 0.3,
    orbitalSpread: 0.72,
    cameraPos: [-6.2, 3.1, 13.5],
    cameraTarget: [0, 0.1, 0],
  },
];

function PresetIcon({ id }: { id: GalaxyPresetId }) {
  if (id === 'andromeda-spiral') {
    return <Orbit className="w-3 h-3 shrink-0" strokeWidth={1.85} />;
  }
  if (id === 'elliptical-dense') {
    return <Disc3 className="w-3 h-3 shrink-0" strokeWidth={1.85} />;
  }
  return <Flame className="w-3 h-3 shrink-0" strokeWidth={1.85} />;
}

export interface GalaxyPresetSelectorProps {
  activePreset: GalaxyPresetId;
  onSelectPreset: (preset: GalaxyTypePreset) => void;
  isLightMode: boolean;
  /** 0..1 morph completion progress for subtle transition hairline on active preset */
  morphProgress?: number;
  compact?: boolean;
}

export function GalaxyPresetSelector({
  activePreset,
  onSelectPreset,
  isLightMode,
  morphProgress = 1,
  compact = false,
}: GalaxyPresetSelectorProps) {
  const isMorphing = morphProgress < 0.985;

  return (
    <div
      className="grid grid-cols-3 gap-1 w-full"
      role="radiogroup"
      aria-label="Galaxy Type Preset Selector"
    >
      {GALAXY_TYPE_PRESETS.map((preset) => {
        const active = activePreset === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelectPreset(preset)}
            title={`${preset.label} (${preset.classification}) — ${preset.description}`}
            className={`relative overflow-hidden inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-mono font-semibold cursor-pointer transition-colors whitespace-nowrap border ${
              active
                ? isLightMode
                  ? 'bg-[#1C6E46] border-[#1C6E46] text-white shadow-xs'
                  : 'bg-[#6FCB9F] border-[#6FCB9F] text-[#0B1020] shadow-xs'
                : isLightMode
                  ? 'bg-[#EFECE4] border-[#DCD6C9] text-[#334155] hover:border-[#1F3863] hover:text-[#16213A]'
                  : 'bg-[#141D38] border-[#253359] text-[#C3CCE4] hover:border-[#6FCB9F] hover:text-white'
            }`}
          >
            <PresetIcon id={preset.id} />
            <span className="truncate">{compact ? preset.shortLabel : preset.label}</span>
            {active && isMorphing && (
              <span
                aria-hidden="true"
                style={{ transform: `scaleX(${Math.max(0.08, Math.min(1, morphProgress))})` }}
                className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left transition-transform duration-75 ${
                  isLightMode ? 'bg-white/85' : 'bg-[#0B1020]/75'
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
