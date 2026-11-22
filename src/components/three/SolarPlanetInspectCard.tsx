import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Gauge,
  Globe,
  Orbit,
  Thermometer,
  Wind,
  X,
} from 'lucide-react';
import type { BrainHub, SpentaApp } from '../../data/spentaManifest';

export interface PlanetAtmosphereGas {
  gas: string;
  percent: number;
  color: string;
}

export interface PlanetAtmosphereData {
  composition: PlanetAtmosphereGas[];
  surfacePressure: string;
  meanTemp: string;
  weatherSummary: string;
}

export interface PlanetOrbitalStats {
  meanVelocityKmS: number;
  axialTiltDeg: string;
  surfaceGravity: string;
  escapeVelocityKmS: number;
}

export interface InspectablePlanetSpec {
  hubId: string;
  celestialTier: string;
  celestialAnalog: string;
  auValue: number;
  auDistance: string;
  kmEquiv: string;
  orbitPeriod: string;
  eccentricity: number;
  tiltWeight: number;
  baseHex: string;
  accentHex: string;
  atmosphere: PlanetAtmosphereData;
  orbitalStats: PlanetOrbitalStats;
}

export interface SolarPlanetInspectCardProps {
  planet: InspectablePlanetSpec;
  hubMeta: BrainHub;
  hubApps: SpentaApp[];
  selectedAppIds: string[];
  appMap: Record<string, SpentaApp>;
  orbitScale: number;
  orbitalVelocityMultiplier: number;
  orbitalInclinationDeg: number;
  onClose: () => void;
  onCyclePlanet: (direction: -1 | 1) => void;
  onReturnToOverview: () => void;
}

export function SolarPlanetInspectCard({
  planet,
  hubMeta,
  hubApps,
  selectedAppIds,
  appMap,
  orbitScale,
  orbitalVelocityMultiplier,
  orbitalInclinationDeg,
  onClose,
  onCyclePlanet,
  onReturnToOverview,
}: SolarPlanetInspectCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: 12, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out', clearProps: 'transform' },
    );
    return () => {
      tween.kill();
    };
  }, [planet.hubId]);

  const scaledAu = planet.auValue * orbitScale;
  const jitterPct = Math.round((orbitScale - 1) * 100);
  const jitterLabel =
    jitterPct === 0 ? 'Nominal' : `${jitterPct > 0 ? '+' : ''}${jitterPct}% jitter`;
  const effectiveInclinationDeg = orbitalInclinationDeg * planet.tiltWeight;
  const effectiveSimKmS =
    planet.orbitalStats.meanVelocityKmS *
    (orbitalVelocityMultiplier / Math.pow(orbitScale, 0.5));

  return (
    <aside
      ref={cardRef}
      role="dialog"
      aria-label={`Inspect Planet: HUB ${hubMeta.num} ${hubMeta.label}`}
      data-qa="solar-planet-inspect-card"
      style={{
        backgroundColor: 'rgba(4, 10, 22, 0.94)',
        borderColor: 'var(--solar-border-strong)',
        boxShadow: 'var(--solar-shadow-glow)',
        color: 'var(--solar-fg-primary)',
      }}
      className="solar-map-scope absolute top-[62px] right-3 z-30 w-[calc(100%-24px)] max-w-[332px] max-h-[calc(100%-178px)] overflow-y-auto rounded-[10px] border p-3.5"
    >
      {/* Header: Planet Identity + Cycle + Close */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[var(--solar-border-subtle)]">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] uppercase text-[var(--solar-accent-amber-fg)] font-bold">
            <span
              style={{ backgroundColor: planet.baseHex, borderColor: planet.accentHex }}
              className="inline-block w-2.5 h-2.5 rounded-full border shrink-0"
              aria-hidden="true"
            />
            <span>Inspect Planet · HUB {hubMeta.num}</span>
          </div>
          <h4 className="text-[14px] font-bold text-white leading-tight mt-0.5 truncate">
            {hubMeta.label}
          </h4>
          <p className="text-[10px] font-mono text-[var(--solar-fg-soft)] mt-0.5 leading-snug">
            {planet.celestialAnalog} · {planet.celestialTier}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onCyclePlanet(-1)}
            aria-label="Inspect previous planet"
            title="Previous planet"
            style={{
              backgroundColor: 'var(--solar-bg-chip)',
              borderColor: 'var(--solar-border-subtle)',
              color: 'var(--solar-fg-blue)',
            }}
            className="grid place-items-center w-6 h-6 rounded-[5px] border cursor-pointer transition-colors hover:text-white hover:border-[var(--solar-accent-blue)]"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onCyclePlanet(1)}
            aria-label="Inspect next planet"
            title="Next planet"
            style={{
              backgroundColor: 'var(--solar-bg-chip)',
              borderColor: 'var(--solar-border-subtle)',
              color: 'var(--solar-fg-blue)',
            }}
            className="grid place-items-center w-6 h-6 rounded-[5px] border cursor-pointer transition-colors hover:text-white hover:border-[var(--solar-accent-blue)]"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close planet inspection card"
            title="Close inspector (Esc)"
            style={{
              backgroundColor: 'var(--solar-bg-chip)',
              borderColor: 'var(--solar-border-subtle)',
              color: 'var(--solar-fg-blue)',
            }}
            className="grid place-items-center w-6 h-6 rounded-[5px] border cursor-pointer transition-colors hover:text-white hover:border-[var(--solar-accent-amber)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Section 1: Atmospheric Data */}
      <div className="pt-2.5 pb-2.5 border-b border-[var(--solar-border-subtle)] space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-[0.06em] text-[var(--solar-fg-blue)]">
          <span className="inline-flex items-center gap-1.5">
            <Wind className="w-3 h-3 text-[#68E4EF]" strokeWidth={1.85} />
            Atmospheric Data
          </span>
          <span className="text-[var(--solar-fg-soft)] normal-case font-medium">
            Spectral Telemetry
          </span>
        </div>

        {/* Segmented Atmospheric Gas Composition Bar */}
        <div className="space-y-1.5">
          <div
            className="flex h-2 w-full overflow-hidden rounded-[3px] bg-[#081226]"
            role="img"
            aria-label={`Atmospheric composition: ${planet.atmosphere.composition
              .map((g) => `${g.gas} ${g.percent}%`)
              .join(', ')}`}
          >
            {planet.atmosphere.composition.map((item) => (
              <div
                key={item.gas}
                style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                className="h-full first:rounded-l-[3px] last:rounded-r-[3px]"
                title={`${item.gas}: ${item.percent}%`}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono tabular-nums">
            {planet.atmosphere.composition.map((item) => (
              <span key={item.gas} className="inline-flex items-center gap-1 text-[var(--solar-fg-bright)]">
                <span
                  style={{ backgroundColor: item.color }}
                  className="inline-block w-2 h-2 rounded-[2px] shrink-0"
                  aria-hidden="true"
                />
                <span className="font-semibold">{item.gas}</span>
                <span className="text-[var(--solar-fg-soft)]">{item.percent}%</span>
              </span>
            ))}
          </div>
        </div>

        {/* Surface Pressure & Mean Temperature */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <div
            style={{
              backgroundColor: 'rgba(8, 18, 38, 0.85)',
              borderColor: 'var(--solar-border-subtle)',
            }}
            className="rounded-[6px] border px-2 py-1.5"
          >
            <div className="flex items-center gap-1 text-[9px] font-mono uppercase text-[var(--solar-fg-blue-muted)]">
              <Gauge className="w-2.5 h-2.5" />
              <span>Surface Pressure</span>
            </div>
            <div className="text-[11px] font-mono font-semibold text-white tabular-nums mt-0.5">
              {planet.atmosphere.surfacePressure}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(8, 18, 38, 0.85)',
              borderColor: 'var(--solar-border-subtle)',
            }}
            className="rounded-[6px] border px-2 py-1.5"
          >
            <div className="flex items-center gap-1 text-[9px] font-mono uppercase text-[var(--solar-fg-blue-muted)]">
              <Thermometer className="w-2.5 h-2.5" />
              <span>Mean Temp</span>
            </div>
            <div className="text-[11px] font-mono font-semibold text-white tabular-nums mt-0.5">
              {planet.atmosphere.meanTemp}
            </div>
          </div>
        </div>

        <p className="text-[10px] font-mono text-[var(--solar-fg-soft)] leading-relaxed">
          {planet.atmosphere.weatherSummary}
        </p>
      </div>

      {/* Section 2: Orbital Stats */}
      <div className="pt-2.5 pb-2.5 border-b border-[var(--solar-border-subtle)] space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-[0.06em] text-[var(--solar-fg-blue)]">
          <span className="inline-flex items-center gap-1.5">
            <Orbit className="w-3 h-3 text-[var(--solar-accent-amber)]" strokeWidth={1.85} />
            Orbital Stats
          </span>
          <span className="text-[var(--solar-accent-amber-fg)] normal-case font-semibold tabular-nums">
            {jitterLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 font-mono">
          <div
            style={{
              backgroundColor: 'rgba(8, 18, 38, 0.85)',
              borderColor: 'var(--solar-border-subtle)',
            }}
            className="rounded-[6px] border px-2 py-1.5"
          >
            <div className="text-[9px] uppercase text-[var(--solar-fg-blue-muted)]">
              Semi-Major Axis
            </div>
            <div className="text-[11px] font-semibold text-white tabular-nums mt-0.5">
              {scaledAu.toFixed(2)} AU
            </div>
            <div className="text-[9px] text-[var(--solar-fg-soft)] tabular-nums">
              {planet.kmEquiv}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(8, 18, 38, 0.85)',
              borderColor: 'var(--solar-border-subtle)',
            }}
            className="rounded-[6px] border px-2 py-1.5"
          >
            <div className="text-[9px] uppercase text-[var(--solar-fg-blue-muted)]">
              Orbital Velocity
            </div>
            <div className="text-[11px] font-semibold text-white tabular-nums mt-0.5">
              {planet.orbitalStats.meanVelocityKmS.toFixed(1)} km/s
            </div>
            <div className="text-[9px] text-[var(--solar-accent-amber-fg)] tabular-nums">
              Sim: {effectiveSimKmS.toFixed(1)} km/s
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(8, 18, 38, 0.85)',
              borderColor: 'var(--solar-border-subtle)',
            }}
            className="rounded-[6px] border px-2 py-1.5"
          >
            <div className="text-[9px] uppercase text-[var(--solar-fg-blue-muted)]">
              3D Inclination
            </div>
            <div className="text-[11px] font-semibold text-white tabular-nums mt-0.5">
              {effectiveInclinationDeg.toFixed(1)}°
            </div>
            <div className="text-[9px] text-[var(--solar-fg-soft)] tabular-nums">
              Eccentricity e={planet.eccentricity.toFixed(3)}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(8, 18, 38, 0.85)',
              borderColor: 'var(--solar-border-subtle)',
            }}
            className="rounded-[6px] border px-2 py-1.5"
          >
            <div className="text-[9px] uppercase text-[var(--solar-fg-blue-muted)]">
              Orbital Period
            </div>
            <div className="text-[11px] font-semibold text-white tabular-nums mt-0.5">
              {planet.orbitPeriod}
            </div>
            <div className="text-[9px] text-[var(--solar-fg-soft)] tabular-nums">
              Tilt {planet.orbitalStats.axialTiltDeg}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--solar-fg-soft)] tabular-nums pt-0.5">
          <span>Gravity: {planet.orbitalStats.surfaceGravity}</span>
          <span>Escape: {planet.orbitalStats.escapeVelocityKmS.toFixed(1)} km/s</span>
        </div>
      </div>

      {/* Section 3: Orbiting Sovereign Spenta Modules (Moons) + Return Action */}
      <div className="pt-2.5 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-[0.06em] text-[var(--solar-fg-blue)]">
          <span className="inline-flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-[#488EFF]" strokeWidth={1.85} />
            Orbiting Hub Modules ({hubApps.length})
          </span>
          <span className="text-[var(--solar-fg-blue-muted)]">
            {hubMeta.keyLayers.join('/')}
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {hubApps.map((app) => {
            const active = selectedAppIds.includes(app.id);
            return (
              <span
                key={app.id}
                style={
                  active
                    ? {
                        backgroundColor: 'var(--solar-accent-amber-bg)',
                        borderColor: 'var(--solar-accent-amber)',
                        color: 'var(--solar-accent-amber-fg)',
                      }
                    : {
                        backgroundColor: 'rgba(8, 18, 38, 0.85)',
                        borderColor: 'var(--solar-border-subtle)',
                        color: 'var(--solar-fg-blue)',
                      }
                }
                className="text-[10px] font-mono px-1.5 py-0.5 rounded-[5px] border font-semibold"
              >
                {appMap[app.id]?.shortName ?? app.shortName}
              </span>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onReturnToOverview}
          style={{
            backgroundColor: 'var(--solar-bg-chip)',
            borderColor: 'var(--solar-border-mid)',
            color: 'var(--solar-fg-bright)',
          }}
          className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 h-[30px] rounded-[6px] border text-[10px] font-mono font-semibold cursor-pointer transition-colors hover:border-[var(--solar-accent-amber)] hover:text-white"
        >
          <Compass className="w-3 h-3 text-[var(--solar-accent-amber-fg)]" />
          <span>Return to Solar Ecliptic View</span>
        </button>
      </div>
    </aside>
  );
}
