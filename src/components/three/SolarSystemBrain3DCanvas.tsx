import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Maximize2, Minimize2 } from 'lucide-react';
import { BRAIN_HUBS, SPENTA_APPS } from '../../data/spentaManifest';
import { useStack } from '../../store/StackContext';
import { GalaxyControlPanel } from './GalaxyControlPanel';
import {
  InspectablePlanetSpec,
  SolarPlanetInspectCard,
} from './SolarPlanetInspectCard';

export interface SolarSystemBrain3DCanvasProps {
  compact?: boolean;
  polarity?: 'light' | 'dark';
  onSelectHub?: (hubId: string) => void;
  selectedHubId?: string | null;
  hubFocusNonce?: number;
  transitionFromSpiral?: boolean;
  onToggleAlternativeSystem?: () => void;
}

type SolarViewMode = 'overview' | 'ecliptic' | 'inner-core';

interface PlanetBlueprint extends InspectablePlanetSpec {
  orbitRadius: number;
  /** Signed direction & relative weight for dynamic 0°..45° Orbital Inclination scaling */
  tiltSignZ: 1 | -1;
  tiltSignX: 1 | -1;
  planetRadius: number;
  orbitSpeed: number;
  initialAngle: number;
  bandHex: string;
  hasRings?: boolean;
  ringColorHex?: string;
}

const DEFAULT_ORBITAL_VELOCITY = 1.0;
const DEFAULT_ORBITAL_INCLINATION_DEG = 6;
const ORBIT_JITTER_RANGE = 0.15;

const PLANET_BLUEPRINTS: PlanetBlueprint[] = [
  {
    hubId: 'healthcare',
    celestialTier: 'Inner Silicate · Clinical Core',
    celestialAnalog: 'Mercury-Class World',
    auValue: 0.39,
    auDistance: '0.39 AU',
    kmEquiv: '57.9M km eq.',
    orbitPeriod: '88 d cycle',
    orbitRadius: 3.1,
    eccentricity: 0.06,
    tiltSignZ: 1,
    tiltSignX: 1,
    tiltWeight: 1.0,
    planetRadius: 0.34,
    orbitSpeed: 0.56,
    initialAngle: 0.4,
    baseHex: '#10B981',
    bandHex: '#A7F3D0',
    accentHex: '#6FCB9F',
    atmosphere: {
      composition: [
        { gas: 'O₂', percent: 42, color: '#68E4EF' },
        { gas: 'Na', percent: 29, color: '#FFB563' },
        { gas: 'H₂', percent: 22, color: '#488EFF' },
        { gas: 'He', percent: 7, color: '#A7F3D0' },
      ],
      surfacePressure: '< 10⁻¹⁴ bar (Exosphere)',
      meanTemp: '167 °C (440 K)',
      weatherSummary: 'Ultra-thin solar-wind sputtered exosphere with extreme 600 K day-night thermal swing.',
    },
    orbitalStats: {
      meanVelocityKmS: 47.4,
      axialTiltDeg: '0.03°',
      surfaceGravity: '3.70 m/s²',
      escapeVelocityKmS: 4.3,
    },
  },
  {
    hubId: 'fintech',
    celestialTier: 'Golden Atmosphere · Settlement',
    celestialAnalog: 'Venus-Class Cloud World',
    auValue: 0.72,
    auDistance: '0.72 AU',
    kmEquiv: '108.2M km eq.',
    orbitPeriod: '225 d cycle',
    orbitRadius: 4.5,
    eccentricity: 0.03,
    tiltSignZ: -1,
    tiltSignX: 1,
    tiltWeight: 0.78,
    planetRadius: 0.44,
    orbitSpeed: 0.42,
    initialAngle: 1.9,
    baseHex: '#F59E0B',
    bandHex: '#FFE0BB',
    accentHex: '#FFB563',
    atmosphere: {
      composition: [
        { gas: 'CO₂', percent: 96, color: '#FFB563' },
        { gas: 'N₂', percent: 3.5, color: '#488EFF' },
        { gas: 'SO₂', percent: 0.5, color: '#FF894F' },
      ],
      surfacePressure: '92.0 bar',
      meanTemp: '464 °C (737 K)',
      weatherSummary: 'Super-rotating sulfuric cloud decks circulating the globe every 4 Earth days.',
    },
    orbitalStats: {
      meanVelocityKmS: 35.0,
      axialTiltDeg: '177.4° (Retro)',
      surfaceGravity: '8.87 m/s²',
      escapeVelocityKmS: 10.4,
    },
  },
  {
    hubId: 'enterprise',
    celestialTier: 'Sovereign Terra · Core ERP/BI',
    celestialAnalog: 'Terra-Class Biosphere',
    auValue: 1.0,
    auDistance: '1.00 AU',
    kmEquiv: '149.6M km eq.',
    orbitPeriod: '365 d cycle',
    orbitRadius: 6.1,
    eccentricity: 0.025,
    tiltSignZ: 1,
    tiltSignX: -1,
    tiltWeight: 0.58,
    planetRadius: 0.52,
    orbitSpeed: 0.33,
    initialAngle: 3.4,
    baseHex: '#0B57D0',
    bandHex: '#488EFF',
    accentHex: '#68E4EF',
    atmosphere: {
      composition: [
        { gas: 'N₂', percent: 78, color: '#488EFF' },
        { gas: 'O₂', percent: 21, color: '#68E4EF' },
        { gas: 'Ar/CO₂', percent: 1, color: '#C4D6F0' },
      ],
      surfacePressure: '1.01 bar',
      meanTemp: '15 °C (288 K)',
      weatherSummary: 'Magnetosphere-shielded troposphere supporting liquid hydrosphere and zonal jet streams.',
    },
    orbitalStats: {
      meanVelocityKmS: 29.8,
      axialTiltDeg: '23.4°',
      surfaceGravity: '9.81 m/s²',
      escapeVelocityKmS: 11.2,
    },
  },
  {
    hubId: 'infra',
    celestialTier: 'Citadel World · Security TEE',
    celestialAnalog: 'Mars-Class Oxide World',
    auValue: 1.52,
    auDistance: '1.52 AU',
    kmEquiv: '227.9M km eq.',
    orbitPeriod: '687 d cycle',
    orbitRadius: 7.7,
    eccentricity: 0.075,
    tiltSignZ: -1,
    tiltSignX: -1,
    tiltWeight: 0.9,
    planetRadius: 0.41,
    orbitSpeed: 0.26,
    initialAngle: 5.0,
    baseHex: '#E11D48',
    bandHex: '#FDA4AF',
    accentHex: '#FF894F',
    atmosphere: {
      composition: [
        { gas: 'CO₂', percent: 95, color: '#FF894F' },
        { gas: 'N₂', percent: 3, color: '#488EFF' },
        { gas: 'Ar', percent: 2, color: '#C4D6F0' },
      ],
      surfacePressure: '0.006 bar',
      meanTemp: '-65 °C (208 K)',
      weatherSummary: 'Thin carbon-dioxide envelope prone to hemisphere-spanning ferric dust storms.',
    },
    orbitalStats: {
      meanVelocityKmS: 24.1,
      axialTiltDeg: '25.2°',
      surfaceGravity: '3.72 m/s²',
      escapeVelocityKmS: 5.0,
    },
  },
  {
    hubId: 'xr',
    celestialTier: 'Gas Giant · Spatial XR Studio',
    celestialAnalog: 'Jupiter-Class Gas Giant',
    auValue: 5.2,
    auDistance: '5.20 AU',
    kmEquiv: '778.5M km eq.',
    orbitPeriod: '11.9 yr cycle',
    orbitRadius: 10.6,
    eccentricity: 0.045,
    tiltSignZ: 1,
    tiltSignX: 1,
    tiltWeight: 0.68,
    planetRadius: 0.78,
    orbitSpeed: 0.17,
    initialAngle: 0.95,
    baseHex: '#3B82F6',
    bandHex: '#C4D6F0',
    accentHex: '#488EFF',
    atmosphere: {
      composition: [
        { gas: 'H₂', percent: 89, color: '#488EFF' },
        { gas: 'He', percent: 10, color: '#FFE0BB' },
        { gas: 'CH₄/NH₃', percent: 1, color: '#68E4EF' },
      ],
      surfacePressure: '> 1,000 bar (Deep)',
      meanTemp: '-110 °C (163 K)',
      weatherSummary: 'Counter-flowing ammonia cloud belts with persistent anticyclonic vortex storms.',
    },
    orbitalStats: {
      meanVelocityKmS: 13.1,
      axialTiltDeg: '3.1°',
      surfaceGravity: '24.79 m/s²',
      escapeVelocityKmS: 59.5,
    },
  },
  {
    hubId: 'voice',
    celestialTier: 'Ringed Giant · Multimodal AI',
    celestialAnalog: 'Saturn-Class Ringed World',
    auValue: 9.58,
    auDistance: '9.58 AU',
    kmEquiv: '1.43B km eq.',
    orbitPeriod: '29.5 yr cycle',
    orbitRadius: 13.4,
    eccentricity: 0.052,
    tiltSignZ: -1,
    tiltSignX: 1,
    tiltWeight: 0.96,
    planetRadius: 0.68,
    orbitSpeed: 0.125,
    initialAngle: 2.85,
    baseHex: '#D97706',
    bandHex: '#FFF1DD',
    accentHex: '#FFB563',
    hasRings: true,
    ringColorHex: '#FFE0BB',
    atmosphere: {
      composition: [
        { gas: 'H₂', percent: 96, color: '#FFB563' },
        { gas: 'He', percent: 3, color: '#FFE0BB' },
        { gas: 'CH₄', percent: 1, color: '#68E4EF' },
      ],
      surfacePressure: '> 1,000 bar (Deep)',
      meanTemp: '-140 °C (133 K)',
      weatherSummary: '1,800 km/h equatorial winds beneath hexagonal polar jet streams and crystalline ring ice.',
    },
    orbitalStats: {
      meanVelocityKmS: 9.7,
      axialTiltDeg: '26.7°',
      surfaceGravity: '10.44 m/s²',
      escapeVelocityKmS: 35.5,
    },
  },
  {
    hubId: 'retail',
    celestialTier: 'Ice Giant · Commerce & Brand',
    celestialAnalog: 'Uranus-Class Ice Giant',
    auValue: 19.2,
    auDistance: '19.20 AU',
    kmEquiv: '2.87B km eq.',
    orbitPeriod: '84 yr cycle',
    orbitRadius: 16.0,
    eccentricity: 0.04,
    tiltSignZ: 1,
    tiltSignX: -1,
    tiltWeight: 0.84,
    planetRadius: 0.54,
    orbitSpeed: 0.095,
    initialAngle: 4.5,
    baseHex: '#06B6D4',
    bandHex: '#A5F3FC',
    accentHex: '#68E4EF',
    atmosphere: {
      composition: [
        { gas: 'H₂', percent: 83, color: '#68E4EF' },
        { gas: 'He', percent: 15, color: '#97C4FF' },
        { gas: 'CH₄', percent: 2, color: '#06B6D4' },
      ],
      surfacePressure: '> 1,000 bar (Mantle)',
      meanTemp: '-195 °C (78 K)',
      weatherSummary: 'Methane haze absorbing red solar wavelengths with extreme 42-year polar seasonal cycles.',
    },
    orbitalStats: {
      meanVelocityKmS: 6.8,
      axialTiltDeg: '97.8°',
      surfaceGravity: '8.69 m/s²',
      escapeVelocityKmS: 21.3,
    },
  },
  {
    hubId: 'energy',
    celestialTier: 'Deep Azure · IoT & Edge AI',
    celestialAnalog: 'Neptune-Class Ice Giant',
    auValue: 30.05,
    auDistance: '30.05 AU',
    kmEquiv: '4.50B km eq.',
    orbitPeriod: '165 yr cycle',
    orbitRadius: 18.5,
    eccentricity: 0.02,
    tiltSignZ: -1,
    tiltSignX: -1,
    tiltWeight: 0.72,
    planetRadius: 0.56,
    orbitSpeed: 0.072,
    initialAngle: 5.8,
    baseHex: '#1D4ED8',
    bandHex: '#93C5FD',
    accentHex: '#488EFF',
    atmosphere: {
      composition: [
        { gas: 'H₂', percent: 80, color: '#488EFF' },
        { gas: 'He', percent: 19, color: '#97C4FF' },
        { gas: 'CH₄', percent: 1, color: '#68E4EF' },
      ],
      surfacePressure: '> 1,000 bar (Mantle)',
      meanTemp: '-200 °C (73 K)',
      weatherSummary: 'Fastest supersonic winds in the system (2,100 km/h) driven by deep internal heat flux.',
    },
    orbitalStats: {
      meanVelocityKmS: 5.4,
      axialTiltDeg: '28.3°',
      surfaceGravity: '11.15 m/s²',
      escapeVelocityKmS: 23.5,
    },
  },
];

const NOMINAL_ORBIT_SCALES: number[] = PLANET_BLUEPRINTS.map(() => 1.0);

/**
 * Procedurally jitter-shifts each planet's orbital radius by +/-15% from its nominal
 * distance while guaranteeing a fresh visible delta on every trigger and preserving
 * safe non-overlapping clearance between adjacent worlds.
 */
function generateJitteredOrbitScales(prevScales: number[]): number[] {
  const minScale = 1 - ORBIT_JITTER_RANGE;
  const maxScale = 1 + ORBIT_JITTER_RANGE;

  const radii = PLANET_BLUEPRINTS.map((spec, idx) => {
    const prev = prevScales[idx] ?? 1.0;
    let candidate = 1 + (Math.random() * 2 - 1) * ORBIT_JITTER_RANGE;
    // Guarantee every trigger creates a fresh perceptible shift per planet
    if (Math.abs(candidate - prev) < 0.04) {
      const flipped = 2 - candidate;
      candidate =
        Math.abs(flipped - prev) >= 0.04
          ? flipped
          : prev >= 1
            ? Math.max(minScale, prev - 0.09)
            : Math.min(maxScale, prev + 0.09);
    }
    return spec.orbitRadius * THREE.MathUtils.clamp(candidate, minScale, maxScale);
  });

  // Symmetric separation pass keeping every orbit strictly within [0.85x, 1.15x]
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < radii.length; i++) {
      const prevSpec = PLANET_BLUEPRINTS[i - 1];
      const currSpec = PLANET_BLUEPRINTS[i];
      const minGap = prevSpec.planetRadius + currSpec.planetRadius + 0.28;
      const gap = radii[i] - radii[i - 1];
      if (gap < minGap) {
        const push = (minGap - gap) * 0.52;
        radii[i - 1] = THREE.MathUtils.clamp(
          radii[i - 1] - push,
          prevSpec.orbitRadius * minScale,
          prevSpec.orbitRadius * maxScale,
        );
        radii[i] = THREE.MathUtils.clamp(
          radii[i] + push,
          currSpec.orbitRadius * minScale,
          currSpec.orbitRadius * maxScale,
        );
      }
    }
  }

  return radii.map((r, idx) =>
    THREE.MathUtils.clamp(r / PLANET_BLUEPRINTS[idx].orbitRadius, minScale, maxScale),
  );
}

function formatScaledAu(bp: PlanetBlueprint, scale: number): string {
  const scaled = bp.auValue * scale;
  const pct = Math.round((scale - 1) * 100);
  if (pct === 0) return bp.auDistance;
  const sign = pct > 0 ? '+' : '';
  return `${scaled.toFixed(2)} AU (${sign}${pct}%)`;
}

const SOLAR_VIEW_CAMERA: Record<
  SolarViewMode,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  overview: { pos: [0.0, 14.5, 25.5], target: [0, -0.4, 0] },
  ecliptic: { pos: [0.0, 2.3, 24.0], target: [0, 0, 0] },
  'inner-core': { pos: [5.4, 5.6, 10.4], target: [0, 0, 0] },
};

const SOLAR_PHOTOSPHERE_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vViewDir;

  void main() {
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const SOLAR_PHOTOSPHERE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uOpaPass;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vViewDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.04 + vec3(0.13, -0.09, 0.17);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 p = normalize(vPos) * 3.4 + vec3(uTime * 0.16, -uTime * 0.11, uTime * 0.09);
    float n = fbm(p);
    float n2 = fbm(p * 2.1 - vec3(uTime * 0.22));
    float plasma = clamp(n * 0.65 + n2 * 0.45, 0.0, 1.0);

    float ndotv = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
    float rim = pow(1.0 - ndotv, 2.2);

    vec3 colHot = vec3(1.0, 0.96, 0.89);
    vec3 colAmber = vec3(1.0, 0.71, 0.39);
    vec3 colFlare = vec3(1.0, 0.53, 0.31);
    vec3 colRimStable = vec3(0.41, 0.89, 0.94);

    vec3 col = mix(colFlare, colAmber, smoothstep(0.24, 0.68, plasma));
    col = mix(col, colHot, smoothstep(0.62, 0.95, plasma));
    col = mix(col, mix(colFlare, colRimStable, uOpaPass * 0.35), rim * 0.52);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const CORONA_HALO_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CORONA_HALO_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uOpaPass;
  varying vec2 vUv;

  void main() {
    vec2 c = vUv - 0.5;
    float d = length(c) * 2.0;
    if (d > 1.0) discard;
    float ang = atan(c.y, c.x);
    float rays = 0.88 + 0.12 * sin(ang * 9.0 + uTime * 0.8) * cos(ang * 5.0 - uTime * 0.5);
    float glow = exp(-d * d * 4.4) * 0.78 + exp(-d * 3.1) * 0.42 * rays;
    vec3 inner = vec3(1.0, 0.88, 0.73);
    vec3 outer = mix(vec3(1.0, 0.54, 0.31), vec3(0.28, 0.56, 1.0), uOpaPass * 0.45);
    vec3 col = mix(inner, outer, smoothstep(0.18, 0.82, d));
    gl_FragColor = vec4(col, clamp(glow * (1.0 - d), 0.0, 0.92));
  }
`;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSolarPlanetTexture(baseHex: string, bandHex: string, seed: number): THREE.CanvasTexture {
  const rand = mulberry32(seed);
  const w = 256;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#040A16');
  grad.addColorStop(0.18, baseHex);
  grad.addColorStop(0.48, bandHex);
  grad.addColorStop(0.76, baseHex);
  grad.addColorStop(1, '#040A16');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 18; i++) {
    const y = rand() * h;
    const bandH = 2 + rand() * 8;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(4,10,22,0.18)';
    ctx.fillRect(0, y, w, bandH);
  }
  for (let j = 0; j < 26; j++) {
    const x = rand() * w;
    const y = 16 + rand() * (h - 32);
    const rx = 5 + rand() * 18;
    const ry = 2 + rand() * 5;
    ctx.fillStyle = 'rgba(255, 245, 228, 0.16)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createPlanetRingTexture(ringHex: string): THREE.CanvasTexture {
  const w = 256;
  const h = 16;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  for (let x = 0; x < w; x++) {
    const t = x / w;
    const innerEdge = Math.min(1, Math.max(0, (t - 0.12) / 0.12));
    const outerEdge = Math.min(1, Math.max(0, (0.96 - t) / 0.12));
    const cassiniGap = t > 0.56 && t < 0.63 ? 0.12 : 1.0;
    const ripple = 0.65 + 0.35 * Math.sin(t * 95.0);
    const alpha = innerEdge * outerEdge * cassiniGap * ripple * 0.72;
    ctx.fillStyle = ringHex;
    ctx.globalAlpha = alpha;
    ctx.fillRect(x, 0, 1, h);
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface ProjectedPlanetCallout {
  hubId: string;
  x: number;
  y: number;
}

const _pWorld = new THREE.Vector3();
const _pProj = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _targetGoal = new THREE.Vector3();
const _radialScratch = new THREE.Vector3();

export default function SolarSystemBrain3DCanvas({
  compact = false,
  onSelectHub,
  selectedHubId = null,
  hubFocusNonce = 0,
  transitionFromSpiral = false,
  onToggleAlternativeSystem,
}: SolarSystemBrain3DCanvasProps) {
  const { selectedIds, hitlConfidence, appMap } = useStack();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gsapActiveRef = useRef<boolean>(false);
  const isSwitchingOutRef = useRef<boolean>(false);
  const activeGsapTlRef = useRef<gsap.core.Timeline | null>(null);
  const transitionFromSpiralRef = useRef<boolean>(transitionFromSpiral);

  const [viewMode, setViewMode] = useState<SolarViewMode>(
    transitionFromSpiral ? 'ecliptic' : 'overview',
  );
  const [focusedBodyId, setFocusedBodyId] = useState<string>(selectedHubId ?? 'sun');
  const [inspectedPlanetId, setInspectedPlanetId] = useState<string | null>(null);
  const [hoveredHubId, setHoveredHubId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [orbitalVelocity, setOrbitalVelocity] = useState<number>(DEFAULT_ORBITAL_VELOCITY);
  const [orbitalInclinationDeg, setOrbitalInclinationDeg] = useState<number>(
    DEFAULT_ORBITAL_INCLINATION_DEG,
  );
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [orbitRadiusScales, setOrbitRadiusScales] = useState<number[]>(NOMINAL_ORBIT_SCALES);
  const [orbitJitterCount, setOrbitJitterCount] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [callout, setCallout] = useState<ProjectedPlanetCallout | null>(null);

  const selectedIdsRef = useRef<string[]>(selectedIds);
  const hitlRef = useRef<number>(hitlConfidence);
  const focusedBodyRef = useRef<string>(focusedBodyId);
  const inspectedPlanetRef = useRef<string | null>(inspectedPlanetId);
  const hoveredHubRef = useRef<string | null>(null);
  const isPausedRef = useRef<boolean>(isPaused);
  const orbitalVelocityRef = useRef<number>(orbitalVelocity);
  const orbitalInclinationRef = useRef<number>(orbitalInclinationDeg);
  const showOrbitsRef = useRef<boolean>(showOrbits);
  const orbitRadiusScalesRef = useRef<number[]>(orbitRadiusScales);
  const autoRotateRef = useRef<boolean>(autoRotate);
  const onSelectHubRef = useRef(onSelectHub);
  const cameraCmdRef = useRef<{
    pos: [number, number, number];
    target: [number, number, number];
    nonce: number;
  }>({
    pos: transitionFromSpiral ? SOLAR_VIEW_CAMERA.ecliptic.pos : SOLAR_VIEW_CAMERA.overview.pos,
    target: transitionFromSpiral
      ? SOLAR_VIEW_CAMERA.ecliptic.target
      : SOLAR_VIEW_CAMERA.overview.target,
    nonce: 0,
  });

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);
  useEffect(() => {
    hitlRef.current = hitlConfidence;
  }, [hitlConfidence]);
  useEffect(() => {
    focusedBodyRef.current = focusedBodyId;
  }, [focusedBodyId]);
  useEffect(() => {
    inspectedPlanetRef.current = inspectedPlanetId;
  }, [inspectedPlanetId]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    orbitalVelocityRef.current = orbitalVelocity;
  }, [orbitalVelocity]);
  useEffect(() => {
    orbitalInclinationRef.current = orbitalInclinationDeg;
  }, [orbitalInclinationDeg]);
  useEffect(() => {
    showOrbitsRef.current = showOrbits;
  }, [showOrbits]);
  useEffect(() => {
    orbitRadiusScalesRef.current = orbitRadiusScales;
  }, [orbitRadiusScales]);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);
  useEffect(() => {
    onSelectHubRef.current = onSelectHub;
  }, [onSelectHub]);

  // Sync external hub selection (Pathway / Brain Architecture Profile -> Solar Map)
  useEffect(() => {
    if (selectedHubId && hubFocusNonce > 0) {
      setFocusedBodyId(selectedHubId);
      setInspectedPlanetId(selectedHubId);
    }
  }, [selectedHubId, hubFocusNonce]);

  // Dismiss Inspect Planet popup on Escape key
  useEffect(() => {
    if (!inspectedPlanetId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInspectedPlanetId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inspectedPlanetId]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(
        Boolean(document.fullscreenElement && document.fullscreenElement === rootRef.current),
      );
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFullscreen = async () => {
    const el = rootRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  };

  const handleSelectView = (mode: SolarViewMode) => {
    setViewMode(mode);
    setFocusedBodyId('sun');
    setInspectedPlanetId(null);
    const cam = SOLAR_VIEW_CAMERA[mode];
    cameraCmdRef.current = {
      pos: cam.pos,
      target: cam.target,
      nonce: cameraCmdRef.current.nonce + 1,
    };
  };

  const handleFocusBodyChange = (nextId: string) => {
    setFocusedBodyId(nextId);
    if (nextId === 'sun') {
      setInspectedPlanetId(null);
      const cam = SOLAR_VIEW_CAMERA[viewMode];
      cameraCmdRef.current = {
        pos: cam.pos,
        target: cam.target,
        nonce: cameraCmdRef.current.nonce + 1,
      };
    } else {
      setInspectedPlanetId(nextId);
      onSelectHub?.(nextId);
    }
  };

  const handleCycleInspectedPlanet = (direction: -1 | 1) => {
    const currentIdx = PLANET_BLUEPRINTS.findIndex((p) => p.hubId === inspectedPlanetId);
    const nextIdx =
      currentIdx < 0
        ? 0
        : (currentIdx + direction + PLANET_BLUEPRINTS.length) % PLANET_BLUEPRINTS.length;
    const nextHubId = PLANET_BLUEPRINTS[nextIdx].hubId;
    setFocusedBodyId(nextHubId);
    setInspectedPlanetId(nextHubId);
    onSelectHub?.(nextHubId);
  };

  const handleRandomizeOrbits = () => {
    setOrbitRadiusScales((prev) => generateJitteredOrbitScales(prev));
    setOrbitJitterCount((c) => c + 1);
  };

  const handleResetMap = () => {
    setViewMode('overview');
    setFocusedBodyId('sun');
    setInspectedPlanetId(null);
    setIsPaused(false);
    setOrbitalVelocity(DEFAULT_ORBITAL_VELOCITY);
    setOrbitalInclinationDeg(DEFAULT_ORBITAL_INCLINATION_DEG);
    setShowOrbits(true);
    setOrbitRadiusScales(NOMINAL_ORBIT_SCALES);
    setOrbitJitterCount(0);
    setAutoRotate(false);
    cameraCmdRef.current = {
      pos: SOLAR_VIEW_CAMERA.overview.pos,
      target: SOLAR_VIEW_CAMERA.overview.target,
      nonce: cameraCmdRef.current.nonce + 1,
    };
  };

  // GSAP exit morph when switching from Solar System ecliptic back to Spiral Galaxy
  const handleRequestAlternativeSystem = () => {
    if (!onToggleAlternativeSystem || isSwitchingOutRef.current) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    const stageEl = rootRef.current;

    setInspectedPlanetId(null);
    if (prefersReducedMotion || !cam || !ctrl) {
      onToggleAlternativeSystem();
      return;
    }

    isSwitchingOutRef.current = true;
    gsapActiveRef.current = true;
    activeGsapTlRef.current?.kill();

    const offset = cam.position.clone().sub(ctrl.target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    const proxy = {
      radius: sph.radius,
      phi: sph.phi,
      theta: sph.theta,
      tx: ctrl.target.x,
      ty: ctrl.target.y,
      tz: ctrl.target.z,
      fov: cam.fov,
    };

    const tl = gsap.timeline({
      onComplete: () => {
        activeGsapTlRef.current = null;
        onToggleAlternativeSystem();
      },
    });
    tl.to(
      proxy,
      {
        radius: 26.5,
        phi: 0.28,
        theta: sph.theta + 0.32,
        tx: 0,
        ty: 0,
        tz: 0,
        fov: 50,
        duration: 0.54,
        ease: 'power2.inOut',
        onUpdate: () => {
          sph.set(proxy.radius, proxy.phi, proxy.theta);
          cam.position.setFromSpherical(sph).add(ctrl.target.set(proxy.tx, proxy.ty, proxy.tz));
          cam.fov = proxy.fov;
          cam.updateProjectionMatrix();
          ctrl.update();
        },
      },
      0,
    );
    if (stageEl) {
      tl.to(stageEl, { opacity: 0, duration: 0.24, ease: 'power2.in' }, 0.32);
    }
    activeGsapTlRef.current = tl;
  };

  const focusOptions = useMemo(
    () => [
      { id: 'sun', label: 'Spenta Solar Core (0.00 AU)' },
      ...PLANET_BLUEPRINTS.map((bp, idx) => {
        const hub = BRAIN_HUBS.find((h) => h.id === bp.hubId);
        const scale = orbitRadiusScales[idx] ?? 1.0;
        return {
          id: bp.hubId,
          label: `HUB ${hub?.num ?? ''} · ${hub?.label ?? bp.hubId} (${formatScaledAu(bp, scale)})`,
        };
      }),
    ],
    [orbitRadiusScales],
  );

  const activeBlueprintIndex = useMemo(
    () => PLANET_BLUEPRINTS.findIndex((b) => b.hubId === focusedBodyId),
    [focusedBodyId],
  );
  const activeBlueprint = activeBlueprintIndex >= 0 ? PLANET_BLUEPRINTS[activeBlueprintIndex] : null;
  const activeOrbitScale =
    activeBlueprintIndex >= 0 ? (orbitRadiusScales[activeBlueprintIndex] ?? 1.0) : 1.0;

  const activeHubMeta = useMemo(
    () => BRAIN_HUBS.find((h) => h.id === (hoveredHubId ?? focusedBodyId)) ?? null,
    [hoveredHubId, focusedBodyId],
  );

  const inspectedBlueprintIndex = useMemo(
    () => (inspectedPlanetId ? PLANET_BLUEPRINTS.findIndex((b) => b.hubId === inspectedPlanetId) : -1),
    [inspectedPlanetId],
  );
  const inspectedBlueprint =
    inspectedBlueprintIndex >= 0 ? PLANET_BLUEPRINTS[inspectedBlueprintIndex] : null;
  const inspectedOrbitScale =
    inspectedBlueprintIndex >= 0 ? (orbitRadiusScales[inspectedBlueprintIndex] ?? 1.0) : 1.0;
  const inspectedHubMeta = useMemo(
    () => (inspectedPlanetId ? BRAIN_HUBS.find((h) => h.id === inspectedPlanetId) ?? null : null),
    [inspectedPlanetId],
  );
  const inspectedHubApps = useMemo(
    () => (inspectedPlanetId ? SPENTA_APPS.filter((a) => a.hubId === inspectedPlanetId) : []),
    [inspectedPlanetId],
  );

  const calloutBlueprintIndex = useMemo(
    () => (callout ? PLANET_BLUEPRINTS.findIndex((b) => b.hubId === callout.hubId) : -1),
    [callout],
  );
  const calloutBlueprint =
    calloutBlueprintIndex >= 0 ? PLANET_BLUEPRINTS[calloutBlueprintIndex] : null;
  const calloutOrbitScale =
    calloutBlueprintIndex >= 0 ? (orbitRadiusScales[calloutBlueprintIndex] ?? 1.0) : 1.0;
  const calloutHubMeta = useMemo(
    () => (callout ? BRAIN_HUBS.find((h) => h.id === callout.hubId) ?? null : null),
    [callout],
  );
  const calloutApps = useMemo(
    () => (callout ? SPENTA_APPS.filter((a) => a.hubId === callout.hubId) : []),
    [callout],
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let currentWidth = Math.max(container.clientWidth, 320);
    let currentHeight = Math.max(container.clientHeight, 360);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    const glCtx = renderer.getContext();
    const debugExt = glCtx.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugExt
      ? String(glCtx.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) || '')
      : '';
    const isSoftwareWebGL = /SwiftShader|llvmpipe|Software|Basic Render|ANGLE.*Microsoft/i.test(
      rendererStr,
    );
    const isWebGL2 =
      typeof WebGL2RenderingContext !== 'undefined' && glCtx instanceof WebGL2RenderingContext;

    const dpr = Math.min(window.devicePixelRatio || 1, isSoftwareWebGL ? 1 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(currentWidth, currentHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#040814');

    const camera = new THREE.PerspectiveCamera(44, currentWidth / currentHeight, 0.1, 220);
    camera.position.set(
      ...(transitionFromSpiralRef.current
        ? SOLAR_VIEW_CAMERA.ecliptic.pos
        : SOLAR_VIEW_CAMERA.overview.pos),
    );
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 3.6;
    controls.maxDistance = 46.0;
    controls.maxPolarAngle = Math.PI * 0.86;
    controls.minPolarAngle = Math.PI * 0.08;
    controls.target.set(
      ...(transitionFromSpiralRef.current
        ? SOLAR_VIEW_CAMERA.ecliptic.target
        : SOLAR_VIEW_CAMERA.overview.target),
    );
    controlsRef.current = controls;

    // Phase B GSAP camera morph: Spiral Galaxy top-down perspective -> Solar System ecliptic plane
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (transitionFromSpiralRef.current && !prefersReducedMotion) {
      gsapActiveRef.current = true;
      const eclipticTargetSph = new THREE.Spherical().setFromVector3(
        new THREE.Vector3(...SOLAR_VIEW_CAMERA.ecliptic.pos),
      );
      const entrySph = new THREE.Spherical(31.2, 0.12, -0.42);
      camera.position.setFromSpherical(entrySph);
      camera.fov = 52;
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();

      const stageEl = rootRef.current;
      if (stageEl) {
        gsap.set(stageEl, { opacity: 0 });
      }
      const proxy = {
        radius: entrySph.radius,
        phi: entrySph.phi,
        theta: entrySph.theta,
        fov: 52,
      };
      const tl = gsap.timeline({
        onComplete: () => {
          gsapActiveRef.current = false;
          activeGsapTlRef.current = null;
        },
      });
      if (stageEl) {
        tl.to(stageEl, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0);
      }
      tl.to(
        proxy,
        {
          radius: eclipticTargetSph.radius,
          phi: eclipticTargetSph.phi,
          theta: eclipticTargetSph.theta,
          fov: 44,
          duration: 1.35,
          ease: 'power3.inOut',
          onUpdate: () => {
            entrySph.set(proxy.radius, proxy.phi, proxy.theta);
            camera.position.setFromSpherical(entrySph);
            controls.target.set(0, 0, 0);
            camera.fov = proxy.fov;
            camera.updateProjectionMatrix();
            controls.update();
          },
        },
        0,
      );
      activeGsapTlRef.current = tl;
    }

    const ambientLight = new THREE.AmbientLight('#89A8DC', 0.42);
    scene.add(ambientLight);
    const sunLight = new THREE.PointLight('#FFF5E4', 5.2, 95, 0.32);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    const rimFill = new THREE.DirectionalLight('#488EFF', 0.55);
    rimFill.position.set(-18, 12, -16);
    scene.add(rimFill);

    const disposableGeos: THREE.BufferGeometry[] = [];
    const disposableMats: THREE.Material[] = [];
    const disposableTex: THREE.Texture[] = [];

    // 1. Deep-Space Celestial Star Dome
    const rand = mulberry32(20260711);
    const starCount = 3200;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const tmpCol = new THREE.Color();
    for (let i = 0; i < starCount; i++) {
      const r = 46 + rand() * 58;
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(2 * rand() - 1);
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = r * Math.cos(ph);
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const tint = rand();
      if (tint < 0.25) tmpCol.set('#C4D6F0');
      else if (tint < 0.45) tmpCol.set('#FFE0BB');
      else tmpCol.set('#F7FBFF');
      const b = 0.45 + rand() * 0.55;
      starCol[i * 3] = tmpCol.r * b;
      starCol[i * 3 + 1] = tmpCol.g * b;
      starCol[i * 3 + 2] = tmpCol.b * b;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.24,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      depthWrite: false,
    });
    scene.add(new THREE.Points(starGeo, starMat));
    disposableGeos.push(starGeo);
    disposableMats.push(starMat);

    // 2. Central Spenta Solar Core
    const sunGeo = new THREE.SphereGeometry(1.52, 48, 48);
    const sunUniforms = {
      uTime: { value: 0 },
      uOpaPass: { value: hitlRef.current >= 0.88 ? 1.0 : 0.0 },
    };
    const sunMat = new THREE.ShaderMaterial({
      vertexShader: SOLAR_PHOTOSPHERE_VERT,
      fragmentShader: SOLAR_PHOTOSPHERE_FRAG,
      uniforms: sunUniforms,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.userData = { bodyId: 'sun' };
    scene.add(sunMesh);
    disposableGeos.push(sunGeo);
    disposableMats.push(sunMat);

    const coronaGeo = new THREE.PlaneGeometry(6.8, 6.8);
    const coronaUniforms = {
      uTime: { value: 0 },
      uOpaPass: { value: hitlRef.current >= 0.88 ? 1.0 : 0.0 },
    };
    const coronaMat = new THREE.ShaderMaterial({
      vertexShader: CORONA_HALO_VERT,
      fragmentShader: CORONA_HALO_FRAG,
      uniforms: coronaUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    scene.add(coronaMesh);
    disposableGeos.push(coronaGeo);
    disposableMats.push(coronaMat);

    // 3. Main Sovereign Data Asteroid Belt (grouped for smooth coupled inclination)
    const beltGroup = new THREE.Group();
    scene.add(beltGroup);
    const beltCount = 1500;
    const beltPos = new Float32Array(beltCount * 3);
    const beltCol = new Float32Array(beltCount * 3);
    for (let i = 0; i < beltCount; i++) {
      const a = rand() * Math.PI * 2;
      const r = 8.75 + rand() * 1.15;
      beltPos[i * 3] = Math.cos(a) * r;
      beltPos[i * 3 + 1] = (rand() - 0.5) * 0.38;
      beltPos[i * 3 + 2] = Math.sin(a) * r;
      const tone = 0.55 + rand() * 0.45;
      tmpCol.set(i % 4 === 0 ? '#FFB563' : '#97C4FF');
      beltCol[i * 3] = tmpCol.r * tone;
      beltCol[i * 3 + 1] = tmpCol.g * tone;
      beltCol[i * 3 + 2] = tmpCol.b * tone;
    }
    const beltGeo = new THREE.BufferGeometry();
    beltGeo.setAttribute('position', new THREE.BufferAttribute(beltPos, 3));
    beltGeo.setAttribute('color', new THREE.BufferAttribute(beltCol, 3));
    const beltMat = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beltPoints = new THREE.Points(beltGeo, beltMat);
    beltGroup.add(beltPoints);
    disposableGeos.push(beltGeo);
    disposableMats.push(beltMat);

    // 3b. Faint Dashed Flat Ecliptic Reference Ring (helps read 3D inclination tilt clearly)
    const eclipticRefPts: THREE.Vector3[] = [];
    const eclipticRefSegs = 160;
    const eclipticRefRadius = 19.6;
    for (let s = 0; s <= eclipticRefSegs; s++) {
      const theta = (s / eclipticRefSegs) * Math.PI * 2;
      eclipticRefPts.push(
        new THREE.Vector3(Math.cos(theta) * eclipticRefRadius, 0, Math.sin(theta) * eclipticRefRadius),
      );
    }
    const eclipticRefGeo = new THREE.BufferGeometry().setFromPoints(eclipticRefPts);
    const eclipticRefMat = new THREE.LineDashedMaterial({
      color: '#488EFF',
      transparent: true,
      opacity: 0.14,
      dashSize: 0.65,
      gapSize: 0.55,
      depthWrite: false,
    });
    const eclipticRefLine = new THREE.Line(eclipticRefGeo, eclipticRefMat);
    eclipticRefLine.computeLineDistances();
    scene.add(eclipticRefLine);
    disposableGeos.push(eclipticRefGeo);
    disposableMats.push(eclipticRefMat);

    // 4. 8 Sovereign Planetary Hub Worlds + Faint Dashed Elliptical Orbits + Module Moons + Wake Trails
    interface PlanetRuntime {
      spec: PlanetBlueprint;
      orbitPivot: THREE.Group;
      orbitLine: THREE.Line;
      orbitMat: THREE.LineDashedMaterial;
      planetGroup: THREE.Group;
      planetMesh: THREE.Mesh;
      atmoMat: THREE.MeshBasicMaterial;
      selectRing: THREE.Mesh;
      selectRingMat: THREE.MeshBasicMaterial;
      wakeLine: THREE.Line;
      wakeMat: THREE.LineBasicMaterial;
      moons: {
        appId: string;
        mesh: THREE.Mesh;
        mat: THREE.MeshStandardMaterial;
        radius: number;
        speed: number;
        phase: number;
        tilt: number;
      }[];
      angle: number;
      currentRadiusScale: number;
    }

    const planetRuntimes: PlanetRuntime[] = [];
    const pickables: THREE.Object3D[] = [sunMesh];
    const sharedMoonGeo = new THREE.SphereGeometry(0.085, 12, 12);
    disposableGeos.push(sharedMoonGeo);

    const initInclRad = THREE.MathUtils.degToRad(orbitalInclinationRef.current);

    PLANET_BLUEPRINTS.forEach((spec, idx) => {
      const orbitPivot = new THREE.Group();
      orbitPivot.rotation.z = initInclRad * spec.tiltWeight * spec.tiltSignZ;
      orbitPivot.rotation.x = initInclRad * spec.tiltWeight * 0.48 * spec.tiltSignX;
      scene.add(orbitPivot);

      const rx = spec.orbitRadius;
      const rz = spec.orbitRadius * (1 - spec.eccentricity);

      const orbitPts: THREE.Vector3[] = [];
      const segments = 160;
      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        orbitPts.push(new THREE.Vector3(Math.cos(theta) * rx, 0, Math.sin(theta) * rz));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
      const orbitMat = new THREE.LineDashedMaterial({
        color: '#97C4FF',
        transparent: true,
        opacity: 0.28,
        dashSize: 0.24 + spec.orbitRadius * 0.022,
        gapSize: 0.18 + spec.orbitRadius * 0.016,
        scale: 1,
        depthWrite: false,
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      orbitLine.computeLineDistances();
      orbitPivot.add(orbitLine);
      disposableGeos.push(orbitGeo);
      disposableMats.push(orbitMat);

      const wakePts: THREE.Vector3[] = [];
      const wakeSegs = 28;
      for (let w = 0; w <= wakeSegs; w++) {
        const lag = -(w / wakeSegs) * 0.55;
        wakePts.push(new THREE.Vector3(Math.cos(lag) * rx, 0, Math.sin(lag) * rz));
      }
      const wakeGeo = new THREE.BufferGeometry().setFromPoints(wakePts);
      const wakeMat = new THREE.LineBasicMaterial({
        color: spec.accentHex,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
      });
      const wakeLine = new THREE.Line(wakeGeo, wakeMat);
      orbitPivot.add(wakeLine);
      disposableGeos.push(wakeGeo);
      disposableMats.push(wakeMat);

      const planetGroup = new THREE.Group();
      orbitPivot.add(planetGroup);

      const planetTex = createSolarPlanetTexture(spec.baseHex, spec.bandHex, 4100 + idx * 97);
      disposableTex.push(planetTex);

      const planetGeo = new THREE.SphereGeometry(spec.planetRadius, 32, 32);
      const planetMat = new THREE.MeshStandardMaterial({
        map: planetTex,
        roughness: 0.58,
        metalness: 0.14,
        emissive: new THREE.Color(spec.baseHex),
        emissiveIntensity: 0.16,
      });
      const planetMesh = new THREE.Mesh(planetGeo, planetMat);
      planetMesh.userData = { hubId: spec.hubId };
      planetGroup.add(planetMesh);
      pickables.push(planetMesh);
      disposableGeos.push(planetGeo);
      disposableMats.push(planetMat);

      const atmoGeo = new THREE.SphereGeometry(spec.planetRadius * 1.13, 24, 24);
      const atmoMat = new THREE.MeshBasicMaterial({
        color: spec.accentHex,
        transparent: true,
        opacity: 0.14,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      });
      planetGroup.add(new THREE.Mesh(atmoGeo, atmoMat));
      disposableGeos.push(atmoGeo);
      disposableMats.push(atmoMat);

      const selGeo = new THREE.RingGeometry(spec.planetRadius * 1.38, spec.planetRadius * 1.54, 48);
      const selectRingMat = new THREE.MeshBasicMaterial({
        color: '#FFB563',
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
      });
      const selectRing = new THREE.Mesh(selGeo, selectRingMat);
      selectRing.rotation.x = Math.PI * 0.5;
      planetGroup.add(selectRing);
      disposableGeos.push(selGeo);
      disposableMats.push(selectRingMat);

      if (spec.hasRings && spec.ringColorHex) {
        const ringGeo = new THREE.RingGeometry(
          spec.planetRadius * 1.42,
          spec.planetRadius * 2.38,
          64,
        );
        const posAttr = ringGeo.attributes.position as THREE.BufferAttribute;
        const uvAttr = ringGeo.attributes.uv as THREE.BufferAttribute;
        const v3 = new THREE.Vector3();
        for (let vi = 0; vi < posAttr.count; vi++) {
          v3.fromBufferAttribute(posAttr, vi);
          const distNorm =
            (v3.length() - spec.planetRadius * 1.42) / (spec.planetRadius * (2.38 - 1.42));
          uvAttr.setXY(vi, distNorm, 0.5);
        }
        const ringTex = createPlanetRingTexture(spec.ringColorHex);
        disposableTex.push(ringTex);
        const ringMat = new THREE.MeshBasicMaterial({
          map: ringTex,
          transparent: true,
          opacity: 0.82,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI * 0.42;
        ringMesh.rotation.y = 0.25;
        planetGroup.add(ringMesh);
        disposableGeos.push(ringGeo);
        disposableMats.push(ringMat);
      }

      const hubApps = SPENTA_APPS.filter((a) => a.hubId === spec.hubId);
      const moons = hubApps.map((app, mIdx) => {
        const mMat = new THREE.MeshStandardMaterial({
          color: '#C4D6F0',
          emissive: new THREE.Color('#68E4EF'),
          emissiveIntensity: 0.3,
          roughness: 0.4,
          metalness: 0.25,
        });
        disposableMats.push(mMat);
        const mMesh = new THREE.Mesh(sharedMoonGeo, mMat);
        planetGroup.add(mMesh);
        return {
          appId: app.id,
          mesh: mMesh,
          mat: mMat,
          radius: spec.planetRadius * (1.75 + mIdx * 0.45),
          speed: 1.15 + mIdx * 0.42,
          phase: mIdx * 2.1 + idx,
          tilt: (mIdx % 2 === 0 ? 1 : -1) * 0.26,
        };
      });

      planetRuntimes.push({
        spec,
        orbitPivot,
        orbitLine,
        orbitMat,
        planetGroup,
        planetMesh,
        atmoMat,
        selectRing,
        selectRingMat,
        wakeLine,
        wakeMat,
        moons,
        angle: spec.initialAngle,
        currentRadiusScale: orbitRadiusScalesRef.current[idx] ?? 1.0,
      });
    });

    // Raycasting & Pointer Interactions
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownX = 0;
    let pointerDownY = 0;
    let cameraFlyActive = false;
    let lastHandledCmdNonce = cameraCmdRef.current.nonce;
    let lastTrackedBody = focusedBodyRef.current;

    const updatePointerNdc = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerMove = (e: PointerEvent) => {
      updatePointerNdc(e);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(pickables, false);
      const hitHub = hits[0]?.object?.userData?.hubId as string | undefined;
      if (hitHub !== hoveredHubRef.current) {
        hoveredHubRef.current = hitHub ?? null;
        setHoveredHubId(hitHub ?? null);
        renderer.domElement.style.cursor = hitHub ? 'pointer' : 'grab';
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY) > 6) return;
      updatePointerNdc(e);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(pickables, false);
      const hitHub = hits[0]?.object?.userData?.hubId as string | undefined;
      const hitBody = hits[0]?.object?.userData?.bodyId as string | undefined;
      if (hitHub) {
        setFocusedBodyId(hitHub);
        setInspectedPlanetId(hitHub);
        onSelectHubRef.current?.(hitHub);
      } else if (hitBody === 'sun') {
        setFocusedBodyId('sun');
        setInspectedPlanetId(null);
        cameraCmdRef.current = {
          pos: SOLAR_VIEW_CAMERA.overview.pos,
          target: SOLAR_VIEW_CAMERA.overview.target,
          nonce: cameraCmdRef.current.nonce + 1,
        };
      }
    };

    const handleControlStart = () => {
      cameraFlyActive = false;
      if (gsapActiveRef.current && !isSwitchingOutRef.current) {
        activeGsapTlRef.current?.kill();
        activeGsapTlRef.current = null;
        gsapActiveRef.current = false;
      }
    };

    controls.addEventListener('start', handleControlStart);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(Math.round(entry.contentRect.width), 280);
        const h = Math.max(Math.round(entry.contentRect.height), 340);
        if (w !== currentWidth || h !== currentHeight) {
          currentWidth = w;
          currentHeight = h;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
        }
      }
    });
    resizeObserver.observe(container);

    // Software WebGL GPU-fence pacing
    let disposed = false;
    let rafId = 0;
    let syncTimerId = 0;
    let activeSync: WebGLSync | null = null;
    const afterDraw = (next: FrameRequestCallback) => {
      if (disposed) return;
      if (!isSoftwareWebGL) {
        rafId = requestAnimationFrame(next);
        return;
      }
      if (isWebGL2) {
        const gl2 = glCtx as WebGL2RenderingContext;
        if (activeSync) gl2.deleteSync(activeSync);
        activeSync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl2.flush();
        const pollFence = () => {
          if (disposed) return;
          if (!activeSync) {
            rafId = requestAnimationFrame(next);
            return;
          }
          const status = gl2.clientWaitSync(activeSync, 0, 0);
          if (status === gl2.ALREADY_SIGNALED || status === gl2.CONDITION_SATISFIED) {
            gl2.deleteSync(activeSync);
            activeSync = null;
            rafId = requestAnimationFrame(next);
          } else {
            syncTimerId = window.setTimeout(pollFence, 16);
          }
        };
        syncTimerId = window.setTimeout(pollFence, 16);
      } else {
        syncTimerId = window.setTimeout(() => {
          if (!disposed) rafId = requestAnimationFrame(next);
        }, 32);
      }
    };

    let lastMs = performance.now();
    let elapsedSim = 0;
    let realTime = 0;
    let lastHudMs = 0;

    const tick = (now: number) => {
      if (disposed) return;
      const rawDt = Math.min((now - lastMs) / 1000, 0.05);
      lastMs = now;
      realTime += rawDt;

      const curVel = isPausedRef.current ? 0 : orbitalVelocityRef.current;
      elapsedSim += rawDt * curVel;

      const opaPassVal = hitlRef.current >= 0.88 ? 1.0 : 0.0;
      sunUniforms.uTime.value = realTime;
      sunUniforms.uOpaPass.value = opaPassVal;
      sunMesh.rotation.y = realTime * 0.08;

      coronaUniforms.uTime.value = realTime;
      coronaUniforms.uOpaPass.value = opaPassVal;
      coronaMesh.quaternion.copy(camera.quaternion);

      // Smoothly scale per-orbit 3D inclination (0° flat ecliptic -> 45° steep 3D tilt)
      const targetInclRad = THREE.MathUtils.degToRad(orbitalInclinationRef.current);
      beltGroup.rotation.z = THREE.MathUtils.damp(
        beltGroup.rotation.z,
        targetInclRad * 0.22,
        6.0,
        rawDt,
      );
      beltGroup.rotation.x = THREE.MathUtils.damp(
        beltGroup.rotation.x,
        -targetInclRad * 0.14,
        6.0,
        rawDt,
      );
      beltPoints.rotation.y = elapsedSim * 0.032;

      const selIds = selectedIdsRef.current;
      const focusedId = focusedBodyRef.current;
      const hoveredId = hoveredHubRef.current;
      const orbitsVisible = showOrbitsRef.current;
      const targetScales = orbitRadiusScalesRef.current;
      const wakeOpacityScale = Math.min(1, 0.22 + curVel * 0.38);

      eclipticRefLine.visible = orbitsVisible && orbitalInclinationRef.current > 0.5;
      eclipticRefMat.opacity = Math.min(0.18, 0.08 + (orbitalInclinationRef.current / 45) * 0.1);

      for (let i = 0; i < planetRuntimes.length; i++) {
        const pr = planetRuntimes[i];
        const targetRadiusScale = targetScales[i] ?? 1.0;
        pr.currentRadiusScale = THREE.MathUtils.damp(
          pr.currentRadiusScale,
          targetRadiusScale,
          5.6,
          rawDt,
        );

        const rx = pr.spec.orbitRadius * pr.currentRadiusScale;
        const rz = pr.spec.orbitRadius * (1 - pr.spec.eccentricity) * pr.currentRadiusScale;
        // Continuous Keplerian integration so orbital jitter & velocity changes never snap angles
        pr.angle += rawDt * curVel * (pr.spec.orbitSpeed / Math.pow(pr.currentRadiusScale, 0.65));
        const angle = pr.angle;

        // Smoothly damp each planetary orbit's distinct 3D inclination angle
        const goalRotZ = targetInclRad * pr.spec.tiltWeight * pr.spec.tiltSignZ;
        const goalRotX = targetInclRad * pr.spec.tiltWeight * 0.48 * pr.spec.tiltSignX;
        pr.orbitPivot.rotation.z = THREE.MathUtils.damp(
          pr.orbitPivot.rotation.z,
          goalRotZ,
          6.2,
          rawDt,
        );
        pr.orbitPivot.rotation.x = THREE.MathUtils.damp(
          pr.orbitPivot.rotation.x,
          goalRotX,
          6.2,
          rawDt,
        );

        pr.planetGroup.position.set(Math.cos(angle) * rx, 0, Math.sin(angle) * rz);
        pr.planetMesh.rotation.y = realTime * (0.45 + i * 0.04);

        pr.orbitLine.scale.setScalar(pr.currentRadiusScale);
        pr.orbitMat.scale = pr.currentRadiusScale;
        pr.wakeLine.scale.setScalar(pr.currentRadiusScale);
        pr.wakeLine.rotation.y = -angle;
        pr.orbitLine.visible = orbitsVisible;
        pr.wakeLine.visible = orbitsVisible && curVel > 0.01;
        pr.wakeMat.opacity = 0.52 * wakeOpacityScale;

        const isFocused = focusedId === pr.spec.hubId;
        const isHovered = hoveredId === pr.spec.hubId;
        const hasActiveMod = pr.moons.some((m) => selIds.includes(m.appId));

        pr.orbitMat.color.set(isFocused || isHovered ? '#FFB563' : '#97C4FF');
        pr.orbitMat.opacity = isFocused ? 0.72 : isHovered ? 0.54 : hasActiveMod ? 0.36 : 0.24;
        pr.selectRingMat.opacity = isFocused ? 0.85 : isHovered ? 0.55 : 0.0;
        pr.selectRing.rotation.z = realTime * 0.6;
        pr.atmoMat.opacity = isFocused ? 0.28 : hasActiveMod ? 0.2 : 0.12;

        for (let m = 0; m < pr.moons.length; m++) {
          const moon = pr.moons[m];
          const active = selIds.includes(moon.appId);
          const mAng = moon.phase + elapsedSim * moon.speed;
          moon.mesh.position.set(
            Math.cos(mAng) * moon.radius,
            Math.sin(mAng) * moon.radius * Math.sin(moon.tilt),
            Math.sin(mAng) * moon.radius * Math.cos(moon.tilt),
          );
          moon.mesh.scale.setScalar(active ? 1.35 : 0.85);
          moon.mat.emissive.set(active ? '#68E4EF' : '#488EFF');
          moon.mat.emissiveIntensity = active ? 1.2 : 0.18;
        }
      }

      if (cameraCmdRef.current.nonce !== lastHandledCmdNonce) {
        lastHandledCmdNonce = cameraCmdRef.current.nonce;
        if (gsapActiveRef.current && !isSwitchingOutRef.current) {
          activeGsapTlRef.current?.kill();
          activeGsapTlRef.current = null;
          gsapActiveRef.current = false;
        }
        _camGoal.set(...cameraCmdRef.current.pos);
        _targetGoal.set(...cameraCmdRef.current.target);
        cameraFlyActive = true;
      }

      if (focusedId !== lastTrackedBody) {
        lastTrackedBody = focusedId;
        if (focusedId !== 'sun') {
          if (gsapActiveRef.current && !isSwitchingOutRef.current) {
            activeGsapTlRef.current?.kill();
            activeGsapTlRef.current = null;
            gsapActiveRef.current = false;
          }
          cameraFlyActive = true;
        }
      }

      if (!gsapActiveRef.current) {
        if (focusedId !== 'sun') {
          const targetPlanet = planetRuntimes.find((p) => p.spec.hubId === focusedId);
          if (targetPlanet) {
            targetPlanet.planetGroup.getWorldPosition(_pWorld);
            controls.target.x = THREE.MathUtils.damp(controls.target.x, _pWorld.x, 5.2, rawDt);
            controls.target.y = THREE.MathUtils.damp(controls.target.y, _pWorld.y, 5.2, rawDt);
            controls.target.z = THREE.MathUtils.damp(controls.target.z, _pWorld.z, 5.2, rawDt);
            if (cameraFlyActive) {
              _radialScratch.copy(_pWorld).normalize();
              const standOff = Math.max(3.6, targetPlanet.spec.planetRadius * 6.5);
              _camGoal.copy(_pWorld).addScaledVector(_radialScratch, standOff);
              _camGoal.y += standOff * 0.42;
              camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoal.x, 4.2, rawDt);
              camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoal.y, 4.2, rawDt);
              camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoal.z, 4.2, rawDt);
              if (camera.position.distanceTo(_camGoal) < 0.14) {
                cameraFlyActive = false;
              }
            }
          }
        } else if (cameraFlyActive) {
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoal.x, 4.2, rawDt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoal.y, 4.2, rawDt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoal.z, 4.2, rawDt);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetGoal.x, 4.8, rawDt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetGoal.y, 4.8, rawDt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetGoal.z, 4.8, rawDt);
          if (
            camera.position.distanceTo(_camGoal) < 0.1 &&
            controls.target.distanceTo(_targetGoal) < 0.06
          ) {
            cameraFlyActive = false;
          }
        }
      }

      controls.autoRotate = autoRotateRef.current && !cameraFlyActive && !gsapActiveRef.current;
      controls.autoRotateSpeed = 0.65;
      controls.update();

      renderer.render(scene, camera);

      if (now - lastHudMs > 62) {
        lastHudMs = now;
        const inspectedId = inspectedPlanetRef.current;
        const candidateHub = hoveredId ?? (focusedId !== 'sun' ? focusedId : null);
        // Hide compact hover tooltip when the same planet is already open in Inspect Planet card
        const calloutHub = candidateHub && candidateHub !== inspectedId ? candidateHub : null;
        if (calloutHub) {
          const pr = planetRuntimes.find((p) => p.spec.hubId === calloutHub);
          if (pr) {
            pr.planetGroup.getWorldPosition(_pWorld);
            _pProj.copy(_pWorld).project(camera);
            if (_pProj.z > -1 && _pProj.z < 1) {
              const sx = (_pProj.x * 0.5 + 0.5) * currentWidth;
              const sy = (-_pProj.y * 0.5 + 0.5) * currentHeight;
              setCallout({
                hubId: calloutHub,
                x: Math.min(Math.max(sx, 126), currentWidth - 126),
                y: Math.min(Math.max(sy - 32, 68), currentHeight - 135),
              });
            } else {
              setCallout(null);
            }
          }
        } else {
          setCallout(null);
        }
      }

      afterDraw(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      activeGsapTlRef.current?.kill();
      activeGsapTlRef.current = null;
      gsapActiveRef.current = false;
      isSwitchingOutRef.current = false;
      cameraRef.current = null;
      controlsRef.current = null;
      cancelAnimationFrame(rafId);
      window.clearTimeout(syncTimerId);
      if (activeSync && isWebGL2) {
        (glCtx as WebGL2RenderingContext).deleteSync(activeSync);
        activeSync = null;
      }
      resizeObserver.disconnect();
      controls.removeEventListener('start', handleControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
      disposableTex.forEach((t) => t.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const opaPass = hitlConfidence >= 0.88;

  return (
    <div
      ref={rootRef}
      data-qa="solar-system-3d-neural-core"
      className={`solar-map-scope relative w-full h-full min-h-[380px] overflow-hidden select-none bg-[var(--solar-bg-void)] text-[var(--solar-fg-primary)] ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'rounded-[10px]'
      }`}
    >
      {/* Pure WebGL Heliocentric Solar System Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Top-Left Distance & Orbital Telemetry Card (design.md: .solar-map-distance-card) */}
      <div
        data-qa="solar-map-distance-card"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(4, 10, 22, 0.84), rgba(4, 10, 22, 0.32))',
          borderLeft: '2px solid var(--solar-accent-amber)',
          boxShadow: 'var(--solar-shadow-card)',
        }}
        className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-[5px] py-[8px] px-[11px] max-w-[290px] sm:max-w-[350px]"
      >
        <div className="flex items-center justify-between gap-2 text-[10px] font-mono tracking-[0.08em] text-[var(--solar-fg-warm)]">
          <span className="font-bold uppercase truncate">
            {activeBlueprint && activeHubMeta
              ? `HUB ${activeHubMeta.num} · ${activeHubMeta.label}`
              : 'SPENTA SOLAR SYSTEM MODEL'}
          </span>
          <span
            className={
              opaPass
                ? 'text-[#68E4EF] font-bold shrink-0'
                : 'text-[#FFB563] font-bold shrink-0'
            }
          >
            OPA {hitlConfidence.toFixed(2)}
          </span>
        </div>

        <div className="font-mono text-[12px] font-semibold tabular-nums text-[var(--solar-fg-bright)]">
          {activeBlueprint
            ? `${formatScaledAu(activeBlueprint, activeOrbitScale)} · ${activeBlueprint.kmEquiv} · ${activeBlueprint.orbitPeriod}`
            : `0.00 AU · ${orbitalVelocity.toFixed(2)}× vel · ${Math.round(orbitalInclinationDeg)}° incl`}
        </div>

        <span className="solar-map-scale-note font-mono text-[10px] font-medium leading-[12px] text-[var(--solar-fg-soft)]">
          {activeBlueprint
            ? `${activeBlueprint.celestialTier} · ${orbitalVelocity.toFixed(2)}× vel · ${Math.round(orbitalInclinationDeg)}° tilt`
            : orbitJitterCount > 0
              ? `Heliocentric Keplerian orbits · ±15% Layout #${orbitJitterCount} · ${showOrbits ? 'Dashed paths ON' : 'Paths hidden'}`
              : 'Heliocentric Keplerian orbits · 8 Planetary Hubs · 13 Sovereign Modules'}
        </span>
      </div>

      {/* Top-Right View Mode Navigation (.solar-map-views) & Fullscreen Button (.solar-map-fullscreen) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-[8px]">
        <nav
          aria-label="Solar System 3D camera views"
          data-qa="solar-map-views"
          style={{
            backgroundColor: 'var(--solar-bg-strip)',
            borderColor: 'var(--solar-border-subtle)',
          }}
          className="flex items-center gap-[4px] p-[4px] rounded-[8px] border"
        >
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'ecliptic', label: 'Ecliptic' },
              { id: 'inner-core', label: 'Inner Core' },
            ] as { id: SolarViewMode; label: string }[]
          ).map((tab) => {
            const active = viewMode === tab.id && focusedBodyId === 'sun';
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleSelectView(tab.id)}
                style={
                  active
                    ? {
                        backgroundColor: 'var(--solar-accent-amber-bg)',
                        color: 'var(--solar-accent-amber-fg)',
                        boxShadow: 'rgba(255, 181, 99, 0.396) 0px 0px 0px 1px inset',
                      }
                    : {
                        backgroundColor: 'transparent',
                        color: 'var(--solar-fg-blue)',
                      }
                }
                className="px-[9px] sm:px-[11px] py-[6px] rounded-[5px] text-[11px] font-semibold leading-[15px] cursor-pointer transition-colors whitespace-nowrap hover:text-white"
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen solar map' : 'Open fullscreen solar map'}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen 3D Solar Map'}
          data-qa="solar-map-fullscreen"
          style={{
            backgroundColor: 'var(--solar-bg-panel)',
            borderColor: 'var(--solar-border-strong)',
            boxShadow: 'var(--solar-shadow-glow)',
            color: 'var(--solar-fg-bright)',
          }}
          className="grid place-items-center w-[40px] h-[40px] rounded-[8px] border cursor-pointer transition-colors hover:border-[#488EFF]"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" strokeWidth={1.75} />
          ) : (
            <Maximize2 className="w-4 h-4" strokeWidth={1.75} />
          )}
        </button>
      </div>

      {/* Projected Planetary Hub Inspection Callout */}
      {callout && calloutHubMeta && calloutBlueprint && (
        <div
          style={{
            left: `${callout.x}px`,
            top: `${callout.y}px`,
            backgroundColor: 'rgba(4, 10, 22, 0.92)',
            borderColor: 'var(--solar-border-strong)',
            boxShadow: 'var(--solar-shadow-glow)',
          }}
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full w-[236px] rounded-[8px] border px-3 py-2.5"
        >
          <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
            <span className="font-bold text-[var(--solar-accent-amber-fg)]">
              HUB {calloutHubMeta.num} · {formatScaledAu(calloutBlueprint, calloutOrbitScale)}
            </span>
            <span className="text-[var(--solar-fg-blue-muted)]">
              {calloutHubMeta.keyLayers.join('/')}
            </span>
          </div>
          <div className="text-xs font-bold text-white mt-0.5 leading-snug">
            {calloutHubMeta.label}
          </div>
          <div className="text-[10px] font-mono text-[var(--solar-fg-soft)] mt-0.5">
            {calloutBlueprint.celestialTier}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {calloutApps.map((app) => {
              const active = selectedIds.includes(app.id);
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
          <div className="mt-1.5 pt-1 border-t border-[var(--solar-border-subtle)] text-[9px] font-mono text-[var(--solar-accent-amber-fg)]">
            Click planet to inspect atmosphere &amp; orbits
          </div>
        </div>
      )}

      {/* Inspect Planet Detailed Popup Card (Atmospheric Data & Orbital Stats) */}
      {inspectedBlueprint && inspectedHubMeta && (
        <SolarPlanetInspectCard
          planet={inspectedBlueprint}
          hubMeta={inspectedHubMeta}
          hubApps={inspectedHubApps}
          selectedAppIds={selectedIds}
          appMap={appMap}
          orbitScale={inspectedOrbitScale}
          orbitalVelocityMultiplier={isPaused ? 0 : orbitalVelocity}
          orbitalInclinationDeg={orbitalInclinationDeg}
          onClose={() => setInspectedPlanetId(null)}
          onCyclePlanet={handleCycleInspectedPlanet}
          onReturnToOverview={() => handleSelectView('ecliptic')}
        />
      )}

      {/* Unified 3D Neural Core Bottom Control Panel in Solar System Mode (.solar-map-scope CSS tokens) */}
      <GalaxyControlPanel
        systemMode="solar-map"
        onToggleAlternativeSystem={
          onToggleAlternativeSystem ? handleRequestAlternativeSystem : undefined
        }
        isLightMode={false}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((v) => !v)}
        onReset={handleResetMap}
        solarControls={{
          focusedBodyId,
          focusOptions,
          onFocusBodyChange: handleFocusBodyChange,
          isPaused,
          onTogglePause: () => setIsPaused((p) => !p),
          showOrbits,
          onToggleOrbits: () => setShowOrbits((v) => !v),
          onRandomizeOrbits: handleRandomizeOrbits,
          orbitJitterCount,
          orbitalVelocity,
          onOrbitalVelocityChange: (val) => {
            setOrbitalVelocity(val);
            if (isPaused && val > 0) setIsPaused(false);
          },
          orbitalInclinationDeg,
          onOrbitalInclinationChange: setOrbitalInclinationDeg,
          compact,
        }}
      />
    </div>
  );
}
