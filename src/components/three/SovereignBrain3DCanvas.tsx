import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BRAIN_HUBS, SPENTA_APPS } from '../../data/spentaManifest';
import { useStack } from '../../store/StackContext';
import {
  CameraPreset,
  GALAXY_TYPE_PRESETS,
  GalaxyControlPanel,
  GalaxyPresetId,
  GalaxyTypePreset,
  ObservatoryFinish,
  TIMELINE_MAX_MYR,
  TIMELINE_MIN_MYR,
} from './GalaxyControlPanel';
import { GalaxyLegendBox } from './GalaxyLegendBox';

interface SovereignBrain3DCanvasProps {
  compact?: boolean;
  polarity?: 'light' | 'dark';
  onSelectHub?: (hubId: string) => void;
  selectedHubId?: string | null;
  hubFocusNonce?: number;
  transitionFromSolar?: boolean;
  onToggleAlternativeSystem?: () => void;
}

interface SatelliteMeta {
  appId: string;
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  orbitRadius: number;
  orbitSpeed: number;
  phase: number;
  inclination: number;
}

interface HubOrbitMeta {
  hubId: string;
  num: string;
  side: 'left' | 'right';
  accentHex: string;
  orbitGroup: THREE.Group;
  hubGroup: THREE.Group;
  orbitRingLine: THREE.LineLoop;
  orbitRingMat: THREE.LineBasicMaterial;
  trailMesh: THREE.Line;
  trailMat: THREE.ShaderMaterial;
  coreMat: THREE.MeshStandardMaterial;
  shellMat: THREE.MeshPhysicalMaterial;
  gimbalMesh: THREE.Mesh;
  gimbalMat: THREE.MeshPhysicalMaterial;
  spireMat: THREE.MeshStandardMaterial;
  filamentLine: THREE.Line;
  filamentGeo: THREE.BufferGeometry;
  filamentMat: THREE.LineBasicMaterial;
  rippleMesh: THREE.Mesh;
  rippleMat: THREE.MeshBasicMaterial;
  rippleTimer: number;
  baseRadius: number;
  orbitSpeed: number;
  initialAngle: number;
  currentAngle: number;
  decayFactor: number;
  inclinationX: number;
  inclinationZ: number;
  ellipticalInclinationX: number;
  ellipticalInclinationZ: number;
  satellites: SatelliteMeta[];
  curve: THREE.QuadraticBezierCurve3;
}

interface ProjectedCallout {
  hubId: string;
  x: number;
  y: number;
  visible: boolean;
}

interface ProjectedNodeAnchor {
  hubId: string;
  num: string;
  x: number;
  y: number;
  isSelected: boolean;
  isActive: boolean;
  accent: string;
}

interface ProjectedStarStreak {
  id: number;
  x: number;
  y: number;
  angleDeg: number;
  lengthPx: number;
  accent: string;
  delaySec: number;
}

// Pre-allocated scratch math objects (zero GC inside animation loop)
const _worldPos = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _projTailVec = new THREE.Vector3();
const _streakHeadPos = new THREE.Vector3();
const _streakTailPos = new THREE.Vector3();
const _midCtrl = new THREE.Vector3();
const _packetPos = new THREE.Vector3();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _radialDir = new THREE.Vector3();
const _morphWeights = new THREE.Vector3(1, 0, 0);
const _morphTarget = new THREE.Vector3(1, 0, 0);
const _dummyObj = new THREE.Object3D();
const _tmpColor = new THREE.Color();
const _tmpColor2 = new THREE.Color();
const _tmpColor3 = new THREE.Color();
const _coreHotCol = new THREE.Color();
const _coreMidCol = new THREE.Color();
const _coreEdgeCol = new THREE.Color();
const _coronaCol = new THREE.Color();
const _haloInCol = new THREE.Color();
const _haloOutCol = new THREE.Color();
const _accInCol = new THREE.Color();
const _accOutCol = new THREE.Color();

// Palette constants
const BG_COLORS: Record<ObservatoryFinish, THREE.Color> = {
  cosmos: new THREE.Color('#040712'),
  nocturnal: new THREE.Color('#0B1020'),
  stone: new THREE.Color('#EDEAE2'),
};

const CORE_HEX_BY_FINISH: Record<
  ObservatoryFinish,
  {
    coreInner: string;
    coreOuter: string;
    armPrimary: string;
    armSecondary: string;
    armAccent: string;
    hiiKnot: string;
  }
> = {
  cosmos: {
    coreInner: '#FFF8E7',
    coreOuter: '#F59E0B',
    armPrimary: '#7DD3FC',
    armSecondary: '#818CF8',
    armAccent: '#34D399',
    hiiKnot: '#F472B6',
  },
  nocturnal: {
    coreInner: '#EAF6FF',
    coreOuter: '#6FCB9F',
    armPrimary: '#93C5FD',
    armSecondary: '#38BDF8',
    armAccent: '#6FCB9F',
    hiiKnot: '#C084FC',
  },
  stone: {
    coreInner: '#B45309',
    coreOuter: '#1F3863',
    armPrimary: '#1F3863',
    armSecondary: '#0F766E',
    armAccent: '#1C6E46',
    hiiKnot: '#9F1239',
  },
};

const ELLIPTICAL_HEX_BY_FINISH: Record<
  ObservatoryFinish,
  {
    nucleus: string;
    innerGold: string;
    outerAmber: string;
    cluster: string;
    halo: string;
  }
> = {
  cosmos: {
    nucleus: '#FFFBEB',
    innerGold: '#FCD34D',
    outerAmber: '#D97706',
    cluster: '#FDE68A',
    halo: '#B45309',
  },
  nocturnal: {
    nucleus: '#FFF7ED',
    innerGold: '#FBBF24',
    outerAmber: '#EA580C',
    cluster: '#FDE047',
    halo: '#9A3412',
  },
  stone: {
    nucleus: '#78350F',
    innerGold: '#B45309',
    outerAmber: '#92400E',
    cluster: '#1F3863',
    halo: '#57534E',
  },
};

const STARBURST_HEX_BY_FINISH: Record<
  ObservatoryFinish,
  {
    nucleus: string;
    diskBlue: string;
    knotEmerald: string;
    plumeCrimson: string;
    plumeViolet: string;
  }
> = {
  cosmos: {
    nucleus: '#F0F9FF',
    diskBlue: '#38BDF8',
    knotEmerald: '#34D399',
    plumeCrimson: '#FB7185',
    plumeViolet: '#E879F9',
  },
  nocturnal: {
    nucleus: '#ECFEFF',
    diskBlue: '#22D3EE',
    knotEmerald: '#6FCB9F',
    plumeCrimson: '#F43F5E',
    plumeViolet: '#C084FC',
  },
  stone: {
    nucleus: '#0F172A',
    diskBlue: '#0369A1',
    knotEmerald: '#0F766E',
    plumeCrimson: '#BE123C',
    plumeViolet: '#7E22CE',
  },
};

const MORPH_TARGET_BY_PRESET: Record<GalaxyPresetId, [number, number, number]> = {
  'andromeda-spiral': [1, 0, 0],
  'elliptical-dense': [0, 1, 0],
  'active-starburst': [0, 0, 1],
};

const CAMERA_PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  overview: { pos: [0.0, 7.6, 13.8], target: [0, -0.15, 0] },
  operations: { pos: [-7.2, 4.8, 9.6], target: [-1.4, 0, 0] },
  experience: { pos: [7.6, 5.1, 10.2], target: [1.4, 0, 0] },
  ecliptic: { pos: [0.0, 1.8, 15.2], target: [0, 0, 0] },
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return `rgba(111, 203, 159, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getEmissiveCssVars(accent: string, isLight: boolean): React.CSSProperties {
  return {
    '--brain-emissive-border': hexToRgba(accent, isLight ? 0.52 : 0.65),
    '--brain-emissive-bright': hexToRgba(accent, isLight ? 0.92 : 0.98),
    '--brain-emissive-dim': hexToRgba(accent, isLight ? 0.16 : 0.24),
    '--brain-emissive-glow': hexToRgba(accent, isLight ? 0.42 : 0.64),
    '--brain-emissive-inner': hexToRgba(accent, isLight ? 0.2 : 0.36),
  } as React.CSSProperties;
}

// Deterministic pseudo-random generator for stable starfield across reloads
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

function createPlanetaryBandTexture(accentHex: string): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0F172A');
  grad.addColorStop(0.28, accentHex);
  grad.addColorStop(0.5, '#F8FAFC');
  grad.addColorStop(0.72, accentHex);
  grad.addColorStop(1, '#0F172A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.5;
  for (let y = 16; y < h; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// ============================================================================
// CUSTOM GLSL SHADERS — SPIRAL GALAXY, VOLUMETRIC NEBULA, SOLAR CORE & ACCRETION
// ============================================================================

const GALAXY_VERTEX_SHADER = /* glsl */ `
  uniform float uRealTime;
  uniform float uSimEpoch;
  uniform float uDecayRate;
  uniform float uDensity;
  uniform float uPixelRatio;
  uniform float uSpread;
  uniform vec3 uMorphWeights;
  uniform float uTransitionSwirl;

  attribute vec3 aPosElliptical;
  attribute vec3 aPosStarburst;
  attribute vec3 aColor;
  attribute vec3 aColorElliptical;
  attribute vec3 aColorStarburst;
  attribute vec3 aRadiusMorph;
  attribute float aScale;
  attribute float aPhase;
  attribute float aTwinkle;

  varying vec3 vColor;
  varying float vTwinkle;
  varying float vScale;

  void main() {
    float wSpiral = uMorphWeights.x;
    float wEllip = uMorphWeights.y;
    float wBurst = uMorphWeights.z;

    vec3 basePos = position * wSpiral + aPosElliptical * wEllip + aPosStarburst * wBurst;
    vec3 baseCol = aColor * wSpiral + aColorElliptical * wEllip + aColorStarburst * wBurst;
    float morphR = dot(aRadiusMorph, uMorphWeights);
    float diskMask = step(aRadiusMorph.x, 16.5);

    // Normalized cosmic timeline (-1.0 at -500 Myr .. +1.0 at +500 Myr)
    float epochNorm = clamp(uSimEpoch / 500.0, -1.0, 1.0);
    float epochProgress = (uSimEpoch + 500.0) / 1000.0;

    // Historical protogalactic assembly (-500 Myr) -> projected gravitational settling (+500 Myr)
    float epochRadialEvol = mix(1.0, 1.0 - epochNorm * 0.14, diskMask);
    float epochVertEvol = mix(1.0, 1.0 - epochNorm * 0.34, diskMask * (1.0 - wEllip * 0.72));

    float spreadMult = (0.72 + uSpread * 0.45) * epochRadialEvol;

    // Deterministic orbital decay driven by both uDecayRate and timeline epoch
    float inspiralCycle = fract(epochProgress * 1.85 + aPhase * 0.15915494);
    float decayPull = mix(1.0, 1.0 - inspiralCycle * 0.56, clamp(uDecayRate, 0.0, 1.0) * diskMask);
    float r = max(morphR * spreadMult * decayPull, 0.42);

    // Morphology-aware differential rotation + morph transition swirl
    float spinPhase = uSimEpoch * 0.16;
    float kinRate = wSpiral * 1.0 + wEllip * 0.36 + wBurst * 1.32;
    float angVel = (0.24 * kinRate) / (pow(max(r, 0.35), 0.58) + 0.32);
    float inspiralTwist = (1.0 - decayPull) * 3.2 * diskMask;
    float morphSwirl = uTransitionSwirl * (1.35 / (morphR * 0.16 + 0.65)) * diskMask;
    float angle = spinPhase * angVel + inspiralTwist + morphSwirl;
    float c = cos(angle);
    float s = sin(angle);

    vec3 pos = basePos;
    pos.xz *= spreadMult * decayPull;
    vec2 rotatedXZ = vec2(pos.x * c - pos.z * s, pos.x * s + pos.z * c);
    pos.x = rotatedXZ.x;
    pos.z = rotatedXZ.y;

    // Active Starburst bipolar superwind streaming along +/-Y with timeline epoch
    float isPlume = smoothstep(1.15, 2.25, abs(aPosStarburst.y)) * wBurst * diskMask;
    float plumeFlow = 1.0 + epochNorm * 0.28 + sin(aPhase + uSimEpoch * 0.045) * 0.075;
    pos.y = pos.y * mix(epochVertEvol, plumeFlow, isPlume);
    pos.y *= mix(1.0, 0.65, (1.0 - decayPull) * diskMask * (1.0 - isPlume));

    // Gentle galactic harmonic ripple / elliptical 3D velocity dispersion
    float waveAmp = mix(0.045, 0.11, wEllip) * diskMask;
    pos.y += sin(r * 1.15 - uSimEpoch * 0.09 + aPhase) * waveAmp;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float twinkle = 0.78 + 0.22 * sin(uRealTime * aTwinkle + aPhase);
    vTwinkle = twinkle;

    // Subtle spectral evolution across epochs: young blue-cyan assembly (-500 Myr) -> mature golden core (+500 Myr)
    float youngTint = max(-epochNorm, 0.0) * 0.22 * diskMask;
    float matureTint = max(epochNorm, 0.0) * smoothstep(7.5, 1.2, morphR) * 0.24 * diskMask;
    vec3 evolvedCol = mix(baseCol, vec3(0.58, 0.84, 1.0), youngTint);
    evolvedCol = mix(evolvedCol, vec3(1.0, 0.86, 0.62), matureTint);

    // Thermal core brightening under orbital decay & starburst scintillation
    float coreHeat = smoothstep(0.62, 0.38, decayPull) * uDecayRate * diskMask;
    float burstBoost = wBurst * (0.14 + 0.12 * sin(uRealTime * 3.2 + aPhase)) * diskMask;
    vColor = mix(evolvedCol, vec3(1.0, 0.92, 0.74), coreHeat * 0.55) * (1.0 + burstBoost);
    vScale = aScale * (1.0 + wBurst * isPlume * 0.22);

    float densityComp = mix(1.16, 1.0, clamp(uDensity, 0.2, 1.0));
    float size = vScale * densityComp * uPixelRatio * (118.0 / max(-mvPosition.z, 1.2));
    gl_PointSize = clamp(size * twinkle, 1.25, 28.0);
  }
`;

const GALAXY_FRAGMENT_SHADER = /* glsl */ `
  uniform float uIsLight;
  varying vec3 vColor;
  varying float vTwinkle;
  varying float vScale;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;

    // Airy disk bright core + soft optical corona
    float core = exp(-dist * dist * 38.0);
    float halo = exp(-dist * dist * 9.8) * 0.62;

    // Subtle 4-point optical diffraction cross spikes on brightest supergiant stars
    float spikeMask = smoothstep(2.15, 3.1, vScale) * (1.0 - uIsLight * 0.65);
    float spikeH = exp(-abs(uv.y) * 32.0) * exp(-abs(uv.x) * 6.5);
    float spikeV = exp(-abs(uv.x) * 32.0) * exp(-abs(uv.y) * 6.5);
    float spikes = (spikeH + spikeV) * 0.48 * spikeMask;

    float alpha = clamp((core + halo + spikes) * vTwinkle, 0.0, 1.0);
    vec3 col = mix(vColor, vec3(1.0), clamp(core + spikes * 0.5, 0.0, 1.0) * (1.0 - uIsLight * 0.72));
    float finalAlpha = uIsLight > 0.5 ? alpha * 0.74 : alpha * 0.94;
    gl_FragColor = vec4(col, finalAlpha);
  }
`;

// Orbital star particle trail streaks synced with the 2.2s .brain-core-dot-pulse harmonic
const GALAXY_TRAIL_VERTEX_SHADER = /* glsl */ `
  uniform float uRealTime;
  uniform float uSimEpoch;
  uniform float uDecayRate;
  uniform float uSpread;
  uniform float uStreakSpan;
  uniform vec3 uMorphWeights;
  uniform float uTransitionSwirl;

  attribute vec3 aPosElliptical;
  attribute vec3 aPosStarburst;
  attribute vec3 aColor;
  attribute vec3 aColorElliptical;
  attribute vec3 aColorStarburst;
  attribute vec3 aRadiusMorph;
  attribute float aPhase;
  attribute float aTrailT;

  varying vec3 vColor;
  varying float vTrailT;
  varying float vPulse;

  void main() {
    float wSpiral = uMorphWeights.x;
    float wEllip = uMorphWeights.y;
    float wBurst = uMorphWeights.z;

    vec3 basePos = position * wSpiral + aPosElliptical * wEllip + aPosStarburst * wBurst;
    vec3 baseCol = aColor * wSpiral + aColorElliptical * wEllip + aColorStarburst * wBurst;
    float morphR = dot(aRadiusMorph, uMorphWeights);

    float epochNorm = clamp(uSimEpoch / 500.0, -1.0, 1.0);
    float epochProgress = (uSimEpoch + 500.0) / 1000.0;
    float epochRadialEvol = 1.0 - epochNorm * 0.14;
    float epochVertEvol = 1.0 - epochNorm * 0.34 * (1.0 - wEllip * 0.72);
    float spreadMult = (0.72 + uSpread * 0.45) * epochRadialEvol;

    float inspiralCycle = fract(epochProgress * 1.85 + aPhase * 0.15915494);
    float decayPull = mix(1.0, 1.0 - inspiralCycle * 0.56, clamp(uDecayRate, 0.0, 1.0));
    float r = max(morphR * spreadMult * decayPull, 0.42);

    float kinRate = wSpiral * 1.0 + wEllip * 0.36 + wBurst * 1.32;
    float angVel = (0.24 * kinRate) / (pow(max(r, 0.35), 0.58) + 0.32);

    // Offset trailing vertices backward along the instantaneous orbital trajectory
    float trailLag = aTrailT * uStreakSpan;
    float spinPhase = (uSimEpoch - trailLag) * 0.16;
    float inspiralTwist = (1.0 - decayPull) * 3.2;
    float morphSwirl = uTransitionSwirl * (1.35 / (morphR * 0.16 + 0.65));
    float angle = spinPhase * angVel + inspiralTwist + morphSwirl;
    float c = cos(angle);
    float s = sin(angle);

    vec3 pos = basePos;
    pos.xz *= spreadMult * decayPull;
    vec2 rotatedXZ = vec2(pos.x * c - pos.z * s, pos.x * s + pos.z * c);
    pos.x = rotatedXZ.x;
    pos.z = rotatedXZ.y;
    pos.y *= epochVertEvol;

    // Mirror .brain-core-dot-pulse (2.2s ease-in-out cycle: 0.60 -> 1.00 -> 0.60)
    float pulseWave = 0.5 + 0.5 * sin(uRealTime * 2.8559933 + aPhase * 2.0);
    vPulse = mix(0.55, 1.0, pulseWave);
    vTrailT = aTrailT;
    vColor = baseCol;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const GALAXY_TRAIL_FRAGMENT_SHADER = /* glsl */ `
  uniform float uIsLight;
  varying vec3 vColor;
  varying float vTrailT;
  varying float vPulse;

  void main() {
    float headFade = pow(1.0 - clamp(vTrailT, 0.0, 1.0), 1.65);
    float headHot = smoothstep(0.32, 0.0, vTrailT);
    vec3 col = mix(vColor, vec3(1.0), headHot * (1.0 - uIsLight * 0.72));
    float baseAlpha = uIsLight > 0.5 ? 0.52 : 0.76;
    gl_FragColor = vec4(col, headFade * vPulse * baseAlpha);
  }
`;

const NEBULA_VERTEX_SHADER = /* glsl */ `
  uniform float uSimEpoch;
  uniform float uDecayRate;
  uniform float uPixelRatio;
  uniform float uSpread;
  uniform vec3 uMorphWeights;
  uniform float uTransitionSwirl;

  attribute vec3 aPosElliptical;
  attribute vec3 aPosStarburst;
  attribute vec3 aColor;
  attribute vec3 aColorElliptical;
  attribute vec3 aColorStarburst;
  attribute vec3 aRadiusMorph;
  attribute float aScale;
  attribute float aPhase;

  varying vec3 vColor;
  varying float vPhase;
  varying float vOpacityBoost;

  void main() {
    float wSpiral = uMorphWeights.x;
    float wEllip = uMorphWeights.y;
    float wBurst = uMorphWeights.z;

    vec3 basePos = position * wSpiral + aPosElliptical * wEllip + aPosStarburst * wBurst;
    vec3 baseCol = aColor * wSpiral + aColorElliptical * wEllip + aColorStarburst * wBurst;
    float morphR = dot(aRadiusMorph, uMorphWeights);

    float epochNorm = clamp(uSimEpoch / 500.0, -1.0, 1.0);
    float epochProgress = (uSimEpoch + 500.0) / 1000.0;
    float spreadMult = (0.72 + uSpread * 0.45) * (1.0 - epochNorm * 0.08);
    float inspiralCycle = fract(epochProgress * 1.45 + aPhase * 0.15915494);
    float decayPull = mix(1.0, 1.0 - inspiralCycle * 0.48, clamp(uDecayRate, 0.0, 1.0));

    float r = max(morphR * spreadMult * decayPull, 0.65);
    float kinRate = wSpiral * 1.0 + wEllip * 0.32 + wBurst * 1.25;
    float angVel = (0.16 * kinRate) / (pow(max(r, 0.5), 0.6) + 0.45);
    float angle = uSimEpoch * 0.16 * angVel + (1.0 - decayPull) * 2.4 + uTransitionSwirl * 0.85;
    float c = cos(angle);
    float s = sin(angle);

    vec3 pos = basePos;
    pos.xz *= spreadMult * decayPull;
    pos.xz = vec2(pos.x * c - pos.z * s, pos.x * s + pos.z * c);

    float isPlume = smoothstep(1.1, 2.2, abs(aPosStarburst.y)) * wBurst;
    pos.y *= mix(1.0 - epochNorm * 0.16 * (1.0 - wEllip * 0.7), 1.0 + epochNorm * 0.24, isPlume);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vColor = baseCol;
    vPhase = aPhase;
    vOpacityBoost = 1.0 + wBurst * 0.42 + wEllip * 0.16;
    gl_PointSize = clamp(aScale * (1.0 + wBurst * 0.18) * uPixelRatio * (210.0 / max(-mvPosition.z, 2.0)), 8.0, 145.0);
  }
`;

const NEBULA_FRAGMENT_SHADER = /* glsl */ `
  uniform float uIsLight;
  varying vec3 vColor;
  varying float vPhase;
  varying float vOpacityBoost;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;

    float ang = atan(uv.y, uv.x);
    float wisp = 0.85 + 0.15 * sin(ang * 3.0 + vPhase);
    float radial = smoothstep(0.5, 0.0, dist);
    float cloud = pow(radial, 2.3) * wisp;

    float opacity = (uIsLight > 0.5 ? 0.085 : 0.14) * vOpacityBoost;
    gl_FragColor = vec4(vColor, cloud * opacity);
  }
`;

const SOLAR_CORE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vViewDir;

  void main() {
    vPos = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SOLAR_CORE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorHot;
  uniform vec3 uColorMid;
  uniform vec3 uColorEdge;
  uniform float uPulse;

  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vViewDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
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
      p = p * 2.05 + vec3(0.14, -0.11, 0.09);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 p = normalize(vPos) * 3.1;
    float n1 = fbm(p + vec3(uTime * 0.22, -uTime * 0.16, uTime * 0.12));
    float n2 = fbm(p * 1.9 - vec3(uTime * 0.18, uTime * 0.25, -uTime * 0.15) + n1 * 1.15);
    float plasma = clamp(n2 * 1.22, 0.0, 1.0);

    float ndotv = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, 2.2);

    vec3 baseCol = mix(uColorMid, uColorHot, smoothstep(0.28, 0.86, plasma));
    vec3 finalCol = mix(baseCol, uColorEdge, fresnel * 0.78);
    finalCol *= (1.05 + uPulse * 0.18 + fresnel * 0.55);

    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

const CORONA_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float ndotv = abs(dot(normalize(vNormal), normalize(vViewDir)));
    float glow = pow(clamp(1.0 - ndotv, 0.0, 1.0), 2.8);
    gl_FragColor = vec4(uColor, glow * uIntensity);
  }
`;

const ACCRETION_VERTEX_SHADER = /* glsl */ `
  varying vec2 vLocalXZ;
  void main() {
    vLocalXZ = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ACCRETION_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uInnerCol;
  uniform vec3 uOuterCol;
  uniform float uOpacity;

  varying vec2 vLocalXZ;

  void main() {
    float r = length(vLocalXZ);
    float t = clamp((r - 1.15) / 1.35, 0.0, 1.0);
    float angle = atan(vLocalXZ.y, vLocalXZ.x);

    float spiral1 = sin(angle * 4.0 - r * 7.5 + uTime * 1.45) * 0.5 + 0.5;
    float spiral2 = sin(angle * 7.0 - r * 11.0 + uTime * 2.1) * 0.5 + 0.5;
    float rings = sin(r * 24.0 - uTime * 1.2) * 0.5 + 0.5;

    float streak = mix(spiral1, spiral2, 0.45) * 0.75 + rings * 0.25;
    float edgeFade = smoothstep(0.0, 0.18, t) * smoothstep(1.0, 0.15, t);

    vec3 col = mix(uInnerCol, uOuterCol, t) * (0.75 + streak * 0.65);
    float alpha = edgeFade * (0.35 + streak * 0.65) * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

const PHOTON_HALO_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PHOTON_HALO_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorInner;
  uniform vec3 uColorOuter;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p);
    if (r > 0.5) discard;

    // Crisp relativistic photon ring + broad atmospheric corona
    float ring = exp(-pow((r - 0.24) * 28.0, 2.0)) * 0.85;
    float glow = exp(-r * r * 14.5) * 0.72;
    float rays = 0.9 + 0.1 * sin(atan(p.y, p.x) * 8.0 + uTime * 0.9);
    float energy = (ring + glow) * rays * smoothstep(0.5, 0.22, r);

    vec3 col = mix(uColorOuter, uColorInner, clamp(ring + exp(-r * r * 32.0), 0.0, 1.0));
    float alpha = energy * uIntensity;
    if (alpha < 0.008) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

const ORBIT_TRAIL_VERTEX_SHADER = /* glsl */ `
  uniform float uHeadAngle;
  uniform float uRadius;
  uniform float uArcSpan;

  attribute float aTrailT;
  varying float vTrailT;

  void main() {
    vTrailT = aTrailT;
    float theta = uHeadAngle - (1.0 - aTrailT) * uArcSpan;
    vec3 pos = vec3(cos(theta) * uRadius, 0.0, sin(theta) * uRadius);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const ORBIT_TRAIL_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTrailT;

  void main() {
    float alpha = pow(vTrailT, 2.1) * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export default function SovereignBrain3DCanvas({
  compact = false,
  polarity = 'dark',
  onSelectHub,
  selectedHubId = null,
  hubFocusNonce = 0,
  transitionFromSolar = false,
  onToggleAlternativeSystem,
}: SovereignBrain3DCanvasProps) {
  const { selectedIds, hitlConfidence, appMap } = useStack();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gsapActiveRef = useRef<boolean>(false);
  const isSwitchingOutRef = useRef<boolean>(false);
  const activeGsapTlRef = useRef<gsap.core.Timeline | null>(null);
  const transitionFromSolarRef = useRef<boolean>(transitionFromSolar);

  const [hoveredHubId, setHoveredHubId] = useState<string | null>(null);
  const [galaxyPreset, setGalaxyPreset] = useState<GalaxyPresetId>('andromeda-spiral');
  const [simEpoch, setSimEpoch] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [finish, setFinish] = useState<ObservatoryFinish>(
    polarity === 'light' ? 'stone' : 'cosmos',
  );
  const [spinSpeed, setSpinSpeed] = useState<number>(0.85);
  const [starDensity, setStarDensity] = useState<number>(1.0);
  const [orbitalDecay, setOrbitalDecay] = useState<number>(0.0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [orbitalSpread, setOrbitalSpread] = useState<number>(0.65);
  const [morphProgress, setMorphProgress] = useState<number>(1);
  const [dockOpen, setDockOpen] = useState<boolean>(false);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [callout, setCallout] = useState<ProjectedCallout | null>(null);
  const [projectedNodes, setProjectedNodes] = useState<ProjectedNodeAnchor[]>([]);
  const [projectedStarStreaks, setProjectedStarStreaks] = useState<ProjectedStarStreak[]>([]);

  const selectedIdsRef = useRef<string[]>(selectedIds);
  const hitlRef = useRef<number>(hitlConfidence);
  const galaxyPresetRef = useRef<GalaxyPresetId>(galaxyPreset);
  const simEpochRef = useRef<number>(simEpoch);
  const playbackRateRef = useRef<number>(playbackRate);
  const isScrubbingRef = useRef<boolean>(false);
  const finishRef = useRef<ObservatoryFinish>(finish);
  const spinSpeedRef = useRef<number>(spinSpeed);
  const starDensityRef = useRef<number>(starDensity);
  const orbitalDecayRef = useRef<number>(orbitalDecay);
  const isPausedRef = useRef<boolean>(isPaused);
  const autoRotateRef = useRef<boolean>(autoRotate);
  const spreadRef = useRef<number>(orbitalSpread);
  const hoveredHubRef = useRef<string | null>(null);
  const selectedHubRef = useRef<string | null>(selectedHubId);
  const onSelectHubRef = useRef(onSelectHub);
  const focusTriggerRef = useRef<{ hubId: string | null; nonce: number }>({
    hubId: selectedHubId,
    nonce: hubFocusNonce,
  });
  const presetCommandRef = useRef<{
    pos: [number, number, number];
    target: [number, number, number];
    nonce: number;
  }>({
    pos: CAMERA_PRESETS.overview.pos,
    target: CAMERA_PRESETS.overview.target,
    nonce: 0,
  });
  const morphPulseRef = useRef<number>(0);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    hitlRef.current = hitlConfidence;
  }, [hitlConfidence]);

  useEffect(() => {
    galaxyPresetRef.current = galaxyPreset;
  }, [galaxyPreset]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  useEffect(() => {
    spinSpeedRef.current = spinSpeed;
  }, [spinSpeed]);

  useEffect(() => {
    starDensityRef.current = starDensity;
  }, [starDensity]);

  useEffect(() => {
    orbitalDecayRef.current = orbitalDecay;
  }, [orbitalDecay]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    spreadRef.current = orbitalSpread;
  }, [orbitalSpread]);

  useEffect(() => {
    onSelectHubRef.current = onSelectHub;
  }, [onSelectHub]);

  useEffect(() => {
    selectedHubRef.current = selectedHubId;
    focusTriggerRef.current = { hubId: selectedHubId, nonce: hubFocusNonce };
  }, [selectedHubId, hubFocusNonce]);

  useEffect(() => {
    setFinish(polarity === 'light' ? 'stone' : 'cosmos');
  }, [polarity]);

  // Open control dock by default on tablet/desktop screens so physics sliders are immediately accessible
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setDockOpen(true);
    }
  }, []);

  // Cinema Mode keyboard shortcut: press H to toggle Observatory Controls dock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!e.metaKey && !e.ctrlKey && !e.altKey && (e.key === 'h' || e.key === 'H')) {
        setDockOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const activeHubId = hoveredHubId ?? selectedHubId;
  const activeHubMeta = useMemo(
    () => (activeHubId ? BRAIN_HUBS.find((h) => h.id === activeHubId) ?? null : null),
    [activeHubId],
  );
  const activeHubApps = useMemo(
    () => (activeHubId ? SPENTA_APPS.filter((a) => a.hubId === activeHubId) : []),
    [activeHubId],
  );

  const applyCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    const p = CAMERA_PRESETS[preset];
    presetCommandRef.current = {
      pos: p.pos,
      target: p.target,
      nonce: presetCommandRef.current.nonce + 1,
    };
  };

  const applyGalaxyTypePreset = (preset: GalaxyTypePreset) => {
    setGalaxyPreset(preset.id);
    setSpinSpeed(preset.spinSpeed);
    setStarDensity(preset.starDensity);
    setOrbitalDecay(preset.orbitalDecay);
    setOrbitalSpread(preset.orbitalSpread);
    morphPulseRef.current = 1.0;
    presetCommandRef.current = {
      pos: preset.cameraPos,
      target: preset.cameraTarget,
      nonce: presetCommandRef.current.nonce + 1,
    };
  };

  const handleScrubEpoch = (epochMyr: number) => {
    const clamped = Math.max(TIMELINE_MIN_MYR, Math.min(TIMELINE_MAX_MYR, epochMyr));
    simEpochRef.current = clamped;
    setSimEpoch(clamped);
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => {
      if (prev) {
        // Resuming from timeline boundary wraps smoothly to opposite end
        if (playbackRateRef.current > 0 && simEpochRef.current >= TIMELINE_MAX_MYR - 0.5) {
          simEpochRef.current = TIMELINE_MIN_MYR;
          setSimEpoch(TIMELINE_MIN_MYR);
        } else if (playbackRateRef.current < 0 && simEpochRef.current <= TIMELINE_MIN_MYR + 0.5) {
          simEpochRef.current = TIMELINE_MAX_MYR;
          setSimEpoch(TIMELINE_MAX_MYR);
        }
        return false;
      }
      return true;
    });
  };

  const handleRewind = () => {
    if (simEpochRef.current <= TIMELINE_MIN_MYR + 0.5) {
      simEpochRef.current = TIMELINE_MAX_MYR;
      setSimEpoch(TIMELINE_MAX_MYR);
    }
    setIsPaused(false);
    setPlaybackRate((prev) => (prev === -2 ? -4 : prev === -4 ? -1 : -2));
  };

  const handleFastForward = () => {
    if (simEpochRef.current >= TIMELINE_MAX_MYR - 0.5) {
      simEpochRef.current = TIMELINE_MIN_MYR;
      setSimEpoch(TIMELINE_MIN_MYR);
    }
    setIsPaused(false);
    setPlaybackRate((prev) => (prev === 2 ? 4 : prev === 4 ? 1 : 2));
  };

  const handleStepEpoch = (deltaMyr: number) => {
    setIsPaused(true);
    handleScrubEpoch(simEpochRef.current + deltaMyr);
  };

  const handleJumpToPresent = () => {
    handleScrubEpoch(0);
    setPlaybackRate(1);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 340);

    // Software WebGL renderer detection (by renderer string only, releasing probe context immediately)
    let isSoftwareGl = false;
    try {
      const probeCanvas = document.createElement('canvas');
      const probeGl =
        probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (probeGl) {
        const dbg = probeGl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          const rendererStr = String(
            probeGl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '',
          );
          if (/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr)) {
            isSoftwareGl = true;
          }
        }
        probeGl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch {
      isSoftwareGl = false;
    }

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: false,
      powerPreference: isSoftwareGl ? 'default' : 'high-performance',
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    scene.background = BG_COLORS[finishRef.current].clone();
    scene.fog = new THREE.FogExp2(BG_COLORS[finishRef.current].getHex(), 0.012);

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 140);
    camera.position.set(...CAMERA_PRESETS.overview.pos);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 4.8;
    controls.maxDistance = 28.0;
    controls.maxPolarAngle = Math.PI * 0.82;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controlsRef.current = controls;

    // GSAP entry morph when returning from Solar System ecliptic plane -> Spiral Galaxy perspective
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (transitionFromSolarRef.current && !prefersReducedMotion) {
      gsapActiveRef.current = true;
      camera.position.set(0, 1.9, 17.4);
      camera.fov = 50;
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();

      const stageEl = stageRef.current;
      const proxy = {
        x: 0,
        y: 1.9,
        z: 17.4,
        tx: 0,
        ty: 0,
        tz: 0,
        fov: 50,
      };
      if (stageEl) {
        gsap.set(stageEl, { opacity: 0 });
      }
      const tl = gsap.timeline({
        onComplete: () => {
          gsapActiveRef.current = false;
          activeGsapTlRef.current = null;
        },
      });
      if (stageEl) {
        tl.to(stageEl, { opacity: 1, duration: 0.36, ease: 'power2.out' }, 0);
      }
      tl.to(
        proxy,
        {
          x: CAMERA_PRESETS.overview.pos[0],
          y: CAMERA_PRESETS.overview.pos[1],
          z: CAMERA_PRESETS.overview.pos[2],
          tx: CAMERA_PRESETS.overview.target[0],
          ty: CAMERA_PRESETS.overview.target[1],
          tz: CAMERA_PRESETS.overview.target[2],
          fov: 44,
          duration: 1.15,
          ease: 'power3.inOut',
          onUpdate: () => {
            camera.position.set(proxy.x, proxy.y, proxy.z);
            controls.target.set(proxy.tx, proxy.ty, proxy.tz);
            camera.fov = proxy.fov;
            camera.updateProjectionMatrix();
            controls.update();
          },
        },
        0,
      );
      activeGsapTlRef.current = tl;
    }

    // Subtle studio PMREM for metallic gimbals and refractive hub shells
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    // Lighting rig
    const hemiLight = new THREE.HemisphereLight('#C7D9FF', '#090F22', 0.95);
    scene.add(hemiLight);

    const solarPointLight = new THREE.PointLight('#FFF0C2', 4.2, 32, 1.35);
    solarPointLight.position.set(0, 0, 0);
    scene.add(solarPointLight);

    const rimDirLight = new THREE.DirectionalLight('#6FCB9F', 1.15);
    rimDirLight.position.set(-9, 8, -7);
    scene.add(rimDirLight);

    // GPU-only Post-Processing (UnrealBloomPass skipped on Software WebGL)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.setPixelRatio(dpr);
      composer.setSize(width, height);
      const renderPass = new RenderPass(scene, camera);
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        finishRef.current === 'stone' ? 0.14 : 0.62,
        0.52,
        finishRef.current === 'stone' ? 0.86 : 0.48,
      );
      composer.addPass(renderPass);
      composer.addPass(bloomPass);
    }

    // =========================================================================
    // 1. 28,000-STAR MULTI-MORPHOLOGY GALAXY (SPIRAL / ELLIPTICAL / STARBURST)
    // =========================================================================
    const starCount = 28000;
    const starPositions = new Float32Array(starCount * 3);
    const starPosElliptical = new Float32Array(starCount * 3);
    const starPosStarburst = new Float32Array(starCount * 3);

    const starColors = new Float32Array(starCount * 3);
    const starColElliptical = new Float32Array(starCount * 3);
    const starColStarburst = new Float32Array(starCount * 3);

    const starRadiusMorph = new Float32Array(starCount * 3);
    const starScales = new Float32Array(starCount);
    const starPhases = new Float32Array(starCount);
    const starTwinkles = new Float32Array(starCount);

    const rand = mulberry32(79372026);
    const branches = 5;
    const maxGalaxyRadius = 15.8;

    // 18 ancient globular cluster centers for Elliptical Dense morphology
    const globularCenters: [number, number, number][] = [];
    for (let gc = 0; gc < 18; gc++) {
      const r = 4.2 + rand() * 6.8;
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(2 * rand() - 1);
      globularCenters.push([
        r * Math.sin(ph) * Math.cos(th) * 1.18,
        r * Math.cos(ph) * 0.84,
        r * Math.sin(ph) * Math.sin(th) * 0.96,
      ]);
    }

    // 14 super-star-cluster knots for Active Starburst morphology
    const starburstKnots: [number, number, number][] = [];
    for (let sk = 0; sk < 14; sk++) {
      const r = 1.6 + rand() * 6.8;
      const th = (sk / 14) * Math.PI * 2 + (rand() - 0.5) * 0.4;
      starburstKnots.push([Math.cos(th) * r, (rand() - 0.5) * 0.85, Math.sin(th) * r]);
    }

    // Structural roles for finish-aware palette updates across all 3 galaxy types
    const starRole = new Uint8Array(starCount);
    const ellipRole = new Uint8Array(starCount); // 0=nucleus, 1=spheroid, 2=globularCluster, 3=halo
    const burstRole = new Uint8Array(starCount); // 0=nucleus, 1=diskBlue, 2=knotEmerald, 3=plumeCrimson, 4=plumeViolet, 5=halo

    const ellipTiltCos = Math.cos(0.24);
    const ellipTiltSin = Math.sin(0.24);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const pick = rand();

      // --- A. ANDROMEDA-LIKE SPIRAL ---
      let sx = 0;
      let sy = 0;
      let sz = 0;
      if (pick < 0.22) {
        const u = Math.pow(rand(), 1.9);
        const radius = 0.5 + u * 3.2;
        const theta = rand() * Math.PI * 2;
        const phi = Math.acos(2 * rand() - 1);
        sx = radius * Math.sin(phi) * Math.cos(theta);
        sy = radius * Math.cos(phi) * 0.42;
        sz = radius * Math.sin(phi) * Math.sin(theta);
        starRole[i] = 0;
        starScales[i] = 0.9 + rand() * 2.2;
      } else if (pick < 0.88) {
        const branchIdx = i % branches;
        const t = Math.pow(rand(), 1.35);
        const radius = 1.65 + t * (maxGalaxyRadius - 1.65);
        const branchAngle = (branchIdx / branches) * Math.PI * 2;
        const spinAngle = Math.log(radius + 0.55) * 2.25;

        const scatterScale = (0.28 + Math.pow(t, 1.15) * 1.45) * (rand() < 0.5 ? 1 : -1);
        const radialScatter = Math.pow(rand(), 2.2) * scatterScale;
        const verticalSpread =
          Math.pow(rand(), 2.4) * (0.72 * Math.exp(-t * 1.45) + 0.14) * (rand() < 0.5 ? 1 : -1);

        const finalAngle = branchAngle + spinAngle + radialScatter * 0.36;
        sx = Math.cos(finalAngle) * radius + radialScatter * 0.35;
        sy = verticalSpread;
        sz = Math.sin(finalAngle) * radius + (rand() - 0.5) * 0.45 * t;

        const subPick = rand();
        if (subPick < 0.08) {
          starRole[i] = 5;
          starScales[i] = 1.6 + rand() * 2.2;
        } else if (subPick < 0.24) {
          starRole[i] = 3;
          starScales[i] = 1.35 + rand() * 2.35;
        } else {
          starRole[i] = branchIdx % 2 === 0 ? 1 : 2;
          starScales[i] = 0.72 + Math.pow(rand(), 2.0) * 2.85;
        }
      } else {
        const radius = 17.5 + rand() * 22.0;
        const theta = rand() * Math.PI * 2;
        const phi = Math.acos(2 * rand() - 1);
        sx = radius * Math.sin(phi) * Math.cos(theta);
        sy = radius * Math.cos(phi) * 0.72;
        sz = radius * Math.sin(phi) * Math.sin(theta);
        starRole[i] = 4;
        starScales[i] = 0.75 + rand() * 1.65;
      }

      starPositions[i3] = sx;
      starPositions[i3 + 1] = sy;
      starPositions[i3 + 2] = sz;
      const spiralR = Math.hypot(sx, sz);

      // --- B. ELLIPTICAL DENSE (Triaxial E3 Spheroid + Globular Clusters) ---
      let ex = sx;
      let ey = sy;
      let ez = sz;
      if (pick >= 0.88) {
        // Keep deep-space background star dome anchored
        ellipRole[i] = 3;
      } else if (pick > 0.78) {
        // Ancient globular cluster knots orbiting the elliptical halo
        const c = globularCenters[i % globularCenters.length];
        const jR = Math.pow(rand(), 1.8) * 0.62;
        const th = rand() * Math.PI * 2;
        const ph = Math.acos(2 * rand() - 1);
        ex = c[0] + jR * Math.sin(ph) * Math.cos(th);
        ey = c[1] + jR * Math.cos(ph);
        ez = c[2] + jR * Math.sin(ph) * Math.sin(th);
        ellipRole[i] = 2;
      } else {
        // Steep de Vaucouleurs triaxial density distribution
        const u = Math.pow(rand(), 2.35);
        const r = 0.42 + u * 12.2;
        const th = rand() * Math.PI * 2;
        const ph = Math.acos(2 * rand() - 1);
        const rawX = r * Math.sin(ph) * Math.cos(th) * 1.28;
        const rawY = r * Math.cos(ph) * 0.84;
        const rawZ = r * Math.sin(ph) * Math.sin(th) * 0.94;
        ex = rawX * ellipTiltCos - rawY * ellipTiltSin;
        ey = rawX * ellipTiltSin + rawY * ellipTiltCos;
        ez = rawZ;
        ellipRole[i] = r < 2.6 ? 0 : 1;
      }
      starPosElliptical[i3] = ex;
      starPosElliptical[i3 + 1] = ey;
      starPosElliptical[i3 + 2] = ez;
      const ellipR = Math.hypot(ex, ez);

      // --- C. ACTIVE STARBURST (Compact Knotty Disk + Bipolar Superwind Plumes) ---
      let bx = sx;
      let by = sy;
      let bz = sz;
      if (pick >= 0.88) {
        burstRole[i] = 5;
      } else if (pick < 0.18) {
        // Intense hyper-luminous starburst nucleus
        const r = 0.4 + Math.pow(rand(), 1.85) * 2.4;
        const th = rand() * Math.PI * 2;
        const ph = Math.acos(2 * rand() - 1);
        bx = r * Math.sin(ph) * Math.cos(th);
        by = r * Math.cos(ph) * 0.65;
        bz = r * Math.sin(ph) * Math.sin(th);
        burstRole[i] = 0;
      } else if (pick < 0.43) {
        // Dramatic Bipolar Superwind Outflow Plumes erupting along +/-Y cones
        const sign = i % 2 === 0 ? 1 : -1;
        const hNorm = Math.pow(rand(), 1.12);
        const h = 0.75 + hNorm * 9.1;
        const coneR = (0.48 + Math.pow(hNorm, 1.18) * 3.9) * (0.45 + rand() * 0.65);
        const filamentIdx = i % 6;
        const filAng =
          (filamentIdx / 6) * Math.PI * 2 + h * 0.34 + (rand() - 0.5) * 0.58;
        bx = Math.cos(filAng) * coneR;
        by = sign * h;
        bz = Math.sin(filAng) * coneR;
        burstRole[i] = rand() < 0.66 ? 3 : 4;
      } else if (pick < 0.57) {
        // Luminous super-star-cluster knots
        const k = starburstKnots[i % starburstKnots.length];
        const jR = Math.pow(rand(), 1.6) * 0.95;
        const th = rand() * Math.PI * 2;
        const ph = Math.acos(2 * rand() - 1);
        bx = k[0] + jR * Math.sin(ph) * Math.cos(th);
        by = k[1] + jR * Math.cos(ph) * 0.52;
        bz = k[2] + jR * Math.sin(ph) * Math.sin(th);
        burstRole[i] = 2;
      } else {
        // Compact turbulent starburst disk with 3 clumpy ragged arms
        const bArm = i % 3;
        const t = Math.pow(rand(), 1.25);
        const r = 1.45 + t * 9.8;
        const ang =
          (bArm / 3) * Math.PI * 2 +
          Math.log(r + 0.5) * 1.9 +
          (rand() - 0.5) * (0.65 + t * 0.9);
        bx = Math.cos(ang) * r;
        by = (rand() - 0.5) * (1.25 * Math.exp(-t * 0.9) + 0.32);
        bz = Math.sin(ang) * r;
        burstRole[i] = rand() < 0.24 ? 2 : 1;
      }
      starPosStarburst[i3] = bx;
      starPosStarburst[i3 + 1] = by;
      starPosStarburst[i3 + 2] = bz;
      const burstR = Math.hypot(bx, bz);

      starRadiusMorph[i3] = spiralR;
      starRadiusMorph[i3 + 1] = ellipR;
      starRadiusMorph[i3 + 2] = burstR;
      starPhases[i] = rand() * Math.PI * 2;
      starTwinkles[i] = 0.8 + rand() * 2.6;
    }

    const colHot = new THREE.Color();
    const colGold = new THREE.Color();
    const colArm1 = new THREE.Color();
    const colArm2 = new THREE.Color();
    const colAccent = new THREE.Color();
    const colHii = new THREE.Color();

    const applyStarPalette = (targetFinish: ObservatoryFinish) => {
      // 1. Andromeda Spiral palette
      const p = CORE_HEX_BY_FINISH[targetFinish];
      colHot.set(p.coreInner);
      colGold.set(p.coreOuter);
      colArm1.set(p.armPrimary);
      colArm2.set(p.armSecondary);
      colAccent.set(p.armAccent);
      colHii.set(p.hiiKnot);

      // 2. Elliptical Dense palette
      const ep = ELLIPTICAL_HEX_BY_FINISH[targetFinish];
      const eNuc = new THREE.Color(ep.nucleus);
      const eInner = new THREE.Color(ep.innerGold);
      const eOuter = new THREE.Color(ep.outerAmber);
      const eCluster = new THREE.Color(ep.cluster);
      const eHalo = new THREE.Color(ep.halo);

      // 3. Active Starburst palette
      const bp = STARBURST_HEX_BY_FINISH[targetFinish];
      const bNuc = new THREE.Color(bp.nucleus);
      const bDisk = new THREE.Color(bp.diskBlue);
      const bKnot = new THREE.Color(bp.knotEmerald);
      const bPlume1 = new THREE.Color(bp.plumeCrimson);
      const bPlume2 = new THREE.Color(bp.plumeViolet);

      for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        const rNorm = Math.min(starRadiusMorph[i3] / maxGalaxyRadius, 1);

        // Spiral color
        const role = starRole[i];
        if (role === 0) {
          _tmpColor.copy(colHot).lerp(colGold, Math.min(rNorm * 3.2, 1));
        } else if (role === 1) {
          _tmpColor.copy(colGold).lerp(colArm1, Math.min(0.25 + rNorm * 0.95, 1));
        } else if (role === 2) {
          _tmpColor.copy(colArm1).lerp(colArm2, Math.min(0.2 + rNorm * 0.95, 1));
        } else if (role === 3) {
          _tmpColor.copy(colAccent).lerp(colHot, 0.22);
        } else if (role === 5) {
          _tmpColor.copy(colHii).lerp(colHot, 0.25);
        } else {
          _tmpColor.copy(colArm2).lerp(colHot, targetFinish === 'stone' ? 0.1 : 0.45);
        }
        starColors[i3] = _tmpColor.r;
        starColors[i3 + 1] = _tmpColor.g;
        starColors[i3 + 2] = _tmpColor.b;

        // Elliptical color
        const eR = Math.min(starRadiusMorph[i3 + 1] / 12.5, 1);
        const er = ellipRole[i];
        if (er === 0) {
          _tmpColor2.copy(eNuc).lerp(eInner, Math.min(eR * 3.4, 1));
        } else if (er === 1) {
          _tmpColor2.copy(eInner).lerp(eOuter, Math.min(eR * 1.2, 1));
        } else if (er === 2) {
          _tmpColor2.copy(eCluster).lerp(eNuc, 0.28);
        } else {
          _tmpColor2.copy(eHalo).lerp(eNuc, targetFinish === 'stone' ? 0.08 : 0.35);
        }
        starColElliptical[i3] = _tmpColor2.r;
        starColElliptical[i3 + 1] = _tmpColor2.g;
        starColElliptical[i3 + 2] = _tmpColor2.b;

        // Starburst color
        const bR = Math.min(starRadiusMorph[i3 + 2] / 11.2, 1);
        const br = burstRole[i];
        if (br === 0) {
          _tmpColor3.copy(bNuc).lerp(bDisk, Math.min(bR * 2.5, 1));
        } else if (br === 1) {
          _tmpColor3.copy(bDisk).lerp(bNuc, 0.22);
        } else if (br === 2) {
          _tmpColor3.copy(bKnot).lerp(bNuc, 0.25);
        } else if (br === 3) {
          _tmpColor3.copy(bPlume1).lerp(bNuc, 0.14);
        } else if (br === 4) {
          _tmpColor3.copy(bPlume2).lerp(bPlume1, 0.35);
        } else {
          _tmpColor3.copy(bDisk).lerp(bNuc, targetFinish === 'stone' ? 0.08 : 0.38);
        }
        starColStarburst[i3] = _tmpColor3.r;
        starColStarburst[i3 + 1] = _tmpColor3.g;
        starColStarburst[i3 + 2] = _tmpColor3.b;
      }

      if (galaxyGeo.attributes.aColor) {
        (galaxyGeo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
        (galaxyGeo.attributes.aColorElliptical as THREE.BufferAttribute).needsUpdate = true;
        (galaxyGeo.attributes.aColorStarburst as THREE.BufferAttribute).needsUpdate = true;
      }
    };

    const galaxyGeo = new THREE.BufferGeometry();
    galaxyGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    galaxyGeo.setAttribute('aPosElliptical', new THREE.BufferAttribute(starPosElliptical, 3));
    galaxyGeo.setAttribute('aPosStarburst', new THREE.BufferAttribute(starPosStarburst, 3));
    galaxyGeo.setAttribute('aColor', new THREE.BufferAttribute(starColors, 3));
    galaxyGeo.setAttribute('aColorElliptical', new THREE.BufferAttribute(starColElliptical, 3));
    galaxyGeo.setAttribute('aColorStarburst', new THREE.BufferAttribute(starColStarburst, 3));
    galaxyGeo.setAttribute('aRadiusMorph', new THREE.BufferAttribute(starRadiusMorph, 3));
    galaxyGeo.setAttribute('aScale', new THREE.BufferAttribute(starScales, 1));
    galaxyGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));
    galaxyGeo.setAttribute('aTwinkle', new THREE.BufferAttribute(starTwinkles, 1));
    applyStarPalette(finishRef.current);

    const galaxyUniforms = {
      uRealTime: { value: 0 },
      uSimEpoch: { value: simEpochRef.current },
      uDecayRate: { value: orbitalDecayRef.current },
      uDensity: { value: starDensityRef.current },
      uPixelRatio: { value: dpr },
      uSpread: { value: spreadRef.current },
      uMorphWeights: { value: _morphWeights.clone() },
      uTransitionSwirl: { value: 0 },
      uIsLight: { value: finishRef.current === 'stone' ? 1.0 : 0.0 },
    };

    const galaxyMat = new THREE.ShaderMaterial({
      vertexShader: GALAXY_VERTEX_SHADER,
      fragmentShader: GALAXY_FRAGMENT_SHADER,
      uniforms: galaxyUniforms,
      transparent: true,
      depthWrite: false,
      blending:
        finishRef.current === 'stone' ? THREE.NormalBlending : THREE.AdditiveBlending,
    });

    const galaxyPoints = new THREE.Points(galaxyGeo, galaxyMat);
    scene.add(galaxyPoints);

    // =========================================================================
    // 2. VOLUMETRIC NEBULA & GALACTIC DUST CLOUDS (3-MORPHOLOGY GPU BLEND)
    // =========================================================================
    const nebulaCount = 1100;
    const nebPos = new Float32Array(nebulaCount * 3);
    const nebPosEllip = new Float32Array(nebulaCount * 3);
    const nebPosBurst = new Float32Array(nebulaCount * 3);
    const nebCol = new Float32Array(nebulaCount * 3);
    const nebColEllip = new Float32Array(nebulaCount * 3);
    const nebColBurst = new Float32Array(nebulaCount * 3);
    const nebRadiusMorph = new Float32Array(nebulaCount * 3);
    const nebScales = new Float32Array(nebulaCount);
    const nebPhases = new Float32Array(nebulaCount);
    const nebRole = new Uint8Array(nebulaCount);
    const nebBurstRole = new Uint8Array(nebulaCount);

    for (let i = 0; i < nebulaCount; i++) {
      const i3 = i * 3;
      const branchIdx = i % branches;
      const t = Math.pow(rand(), 1.2);
      const radius = 2.0 + t * 11.8;
      const angle =
        (branchIdx / branches) * Math.PI * 2 +
        Math.log(radius + 0.55) * 2.25 +
        (rand() - 0.5) * 0.6;
      const nx = Math.cos(angle) * radius;
      const ny = (rand() - 0.5) * 0.55;
      const nz = Math.sin(angle) * radius;

      nebPos[i3] = nx;
      nebPos[i3 + 1] = ny;
      nebPos[i3 + 2] = nz;

      // Elliptical diffuse triaxial warm gas glow
      const eR = 0.9 + Math.pow(rand(), 1.65) * 8.4;
      const eTh = rand() * Math.PI * 2;
      const ePh = Math.acos(2 * rand() - 1);
      const eRawX = eR * Math.sin(ePh) * Math.cos(eTh) * 1.24;
      const eRawY = eR * Math.cos(ePh) * 0.82;
      const eRawZ = eR * Math.sin(ePh) * Math.sin(eTh) * 0.92;
      nebPosEllip[i3] = eRawX * ellipTiltCos - eRawY * ellipTiltSin;
      nebPosEllip[i3 + 1] = eRawX * ellipTiltSin + eRawY * ellipTiltCos;
      nebPosEllip[i3 + 2] = eRawZ;

      // Active Starburst compact disk + billowing ionized bipolar plumes
      let bnx = 0;
      let bny = 0;
      let bnz = 0;
      if (i % 5 < 2) {
        // 40% bipolar superwind nebula clouds
        const sign = i % 2 === 0 ? 1 : -1;
        const hNorm = Math.pow(rand(), 1.05);
        const h = 1.0 + hNorm * 8.4;
        const cR = (0.65 + hNorm * 3.4) * (0.4 + rand() * 0.7);
        const cA = rand() * Math.PI * 2;
        bnx = Math.cos(cA) * cR;
        bny = sign * h;
        bnz = Math.sin(cA) * cR;
        nebBurstRole[i] = rand() < 0.65 ? 2 : 3;
      } else {
        const bR = 1.2 + Math.pow(rand(), 1.25) * 8.2;
        const bA = rand() * Math.PI * 2;
        bnx = Math.cos(bA) * bR;
        bny = (rand() - 0.5) * 1.1;
        bnz = Math.sin(bA) * bR;
        nebBurstRole[i] = rand() < 0.5 ? 0 : 1;
      }
      nebPosBurst[i3] = bnx;
      nebPosBurst[i3 + 1] = bny;
      nebPosBurst[i3 + 2] = bnz;

      nebRadiusMorph[i3] = radius;
      nebRadiusMorph[i3 + 1] = Math.hypot(nebPosEllip[i3], nebPosEllip[i3 + 2]);
      nebRadiusMorph[i3 + 2] = Math.hypot(bnx, bnz);
      nebScales[i] = 2.8 + rand() * 5.2;
      nebPhases[i] = rand() * Math.PI * 2;
      nebRole[i] = branchIdx % 3;
    }

    const applyNebulaPalette = (targetFinish: ObservatoryFinish) => {
      const p = CORE_HEX_BY_FINISH[targetFinish];
      const c0 = new THREE.Color(p.coreOuter);
      const c1 = new THREE.Color(p.armPrimary);
      const c2 = new THREE.Color(p.armAccent);

      const ep = ELLIPTICAL_HEX_BY_FINISH[targetFinish];
      const ec0 = new THREE.Color(ep.innerGold);
      const ec1 = new THREE.Color(ep.outerAmber);

      const bp = STARBURST_HEX_BY_FINISH[targetFinish];
      const bc0 = new THREE.Color(bp.diskBlue);
      const bc1 = new THREE.Color(bp.knotEmerald);
      const bc2 = new THREE.Color(bp.plumeCrimson);
      const bc3 = new THREE.Color(bp.plumeViolet);

      for (let i = 0; i < nebulaCount; i++) {
        const i3 = i * 3;
        const r = nebRole[i];
        _tmpColor.copy(r === 0 ? c0 : r === 1 ? c1 : c2);
        nebCol[i3] = _tmpColor.r;
        nebCol[i3 + 1] = _tmpColor.g;
        nebCol[i3 + 2] = _tmpColor.b;

        _tmpColor2.copy(i % 2 === 0 ? ec0 : ec1);
        nebColEllip[i3] = _tmpColor2.r;
        nebColEllip[i3 + 1] = _tmpColor2.g;
        nebColEllip[i3 + 2] = _tmpColor2.b;

        const br = nebBurstRole[i];
        _tmpColor3.copy(br === 0 ? bc0 : br === 1 ? bc1 : br === 2 ? bc2 : bc3);
        nebColBurst[i3] = _tmpColor3.r;
        nebColBurst[i3 + 1] = _tmpColor3.g;
        nebColBurst[i3 + 2] = _tmpColor3.b;
      }
      if (nebulaGeo.attributes.aColor) {
        (nebulaGeo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
        (nebulaGeo.attributes.aColorElliptical as THREE.BufferAttribute).needsUpdate = true;
        (nebulaGeo.attributes.aColorStarburst as THREE.BufferAttribute).needsUpdate = true;
      }
    };

    const nebulaGeo = new THREE.BufferGeometry();
    nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
    nebulaGeo.setAttribute('aPosElliptical', new THREE.BufferAttribute(nebPosEllip, 3));
    nebulaGeo.setAttribute('aPosStarburst', new THREE.BufferAttribute(nebPosBurst, 3));
    nebulaGeo.setAttribute('aColor', new THREE.BufferAttribute(nebCol, 3));
    nebulaGeo.setAttribute('aColorElliptical', new THREE.BufferAttribute(nebColEllip, 3));
    nebulaGeo.setAttribute('aColorStarburst', new THREE.BufferAttribute(nebColBurst, 3));
    nebulaGeo.setAttribute('aRadiusMorph', new THREE.BufferAttribute(nebRadiusMorph, 3));
    nebulaGeo.setAttribute('aScale', new THREE.BufferAttribute(nebScales, 1));
    nebulaGeo.setAttribute('aPhase', new THREE.BufferAttribute(nebPhases, 1));
    applyNebulaPalette(finishRef.current);

    const nebulaUniforms = {
      uSimEpoch: { value: simEpochRef.current },
      uDecayRate: { value: orbitalDecayRef.current },
      uPixelRatio: { value: dpr },
      uSpread: { value: spreadRef.current },
      uMorphWeights: { value: _morphWeights.clone() },
      uTransitionSwirl: { value: 0 },
      uIsLight: { value: finishRef.current === 'stone' ? 1.0 : 0.0 },
    };

    const nebulaMat = new THREE.ShaderMaterial({
      vertexShader: NEBULA_VERTEX_SHADER,
      fragmentShader: NEBULA_FRAGMENT_SHADER,
      uniforms: nebulaUniforms,
      transparent: true,
      depthWrite: false,
      blending:
        finishRef.current === 'stone' ? THREE.NormalBlending : THREE.AdditiveBlending,
    });

    const nebulaPoints = new THREE.Points(nebulaGeo, nebulaMat);
    scene.add(nebulaPoints);

    // =========================================================================
    // 2B. ORBITAL STAR PARTICLE TRAIL STREAKS (GPU ARCS + .brain-core-dot-pulse)
    // =========================================================================
    const streakStarCount = 420;
    const streakSegments = 6;
    const streakVertCount = streakStarCount * streakSegments * 2;
    const trPos = new Float32Array(streakVertCount * 3);
    const trPosEllip = new Float32Array(streakVertCount * 3);
    const trPosBurst = new Float32Array(streakVertCount * 3);
    const trCol = new Float32Array(streakVertCount * 3);
    const trColEllip = new Float32Array(streakVertCount * 3);
    const trColBurst = new Float32Array(streakVertCount * 3);
    const trRadiusMorph = new Float32Array(streakVertCount * 3);
    const trPhase = new Float32Array(streakVertCount);
    const trTrailT = new Float32Array(streakVertCount);
    const streakSourceIndices = new Uint32Array(streakStarCount);

    let sampledStreaks = 0;
    for (let i = 0; i < starCount && sampledStreaks < streakStarCount; i += 47) {
      const rSp = starRadiusMorph[i * 3];
      if (rSp < 2.1 || rSp > 14.5) continue;
      streakSourceIndices[sampledStreaks] = i;

      const src3 = i * 3;
      const baseVert = sampledStreaks * streakSegments * 2;
      for (let seg = 0; seg < streakSegments; seg++) {
        const t0 = seg / streakSegments;
        const t1 = (seg + 1) / streakSegments;
        const v0 = baseVert + seg * 2;
        const v1 = v0 + 1;
        for (const vIdx of [v0, v1]) {
          const v3 = vIdx * 3;
          trPos[v3] = starPositions[src3];
          trPos[v3 + 1] = starPositions[src3 + 1];
          trPos[v3 + 2] = starPositions[src3 + 2];

          trPosEllip[v3] = starPosElliptical[src3];
          trPosEllip[v3 + 1] = starPosElliptical[src3 + 1];
          trPosEllip[v3 + 2] = starPosElliptical[src3 + 2];

          trPosBurst[v3] = starPosStarburst[src3];
          trPosBurst[v3 + 1] = starPosStarburst[src3 + 1];
          trPosBurst[v3 + 2] = starPosStarburst[src3 + 2];

          trRadiusMorph[v3] = starRadiusMorph[src3];
          trRadiusMorph[v3 + 1] = starRadiusMorph[src3 + 1];
          trRadiusMorph[v3 + 2] = starRadiusMorph[src3 + 2];

          trPhase[vIdx] = starPhases[i];
        }
        trTrailT[v0] = t0;
        trTrailT[v1] = t1;
      }
      sampledStreaks++;
    }

    const syncTrailColorsFromStars = () => {
      for (let s = 0; s < sampledStreaks; s++) {
        const src3 = streakSourceIndices[s] * 3;
        const baseVert = s * streakSegments * 2;
        const endVert = baseVert + streakSegments * 2;
        for (let vIdx = baseVert; vIdx < endVert; vIdx++) {
          const v3 = vIdx * 3;
          trCol[v3] = starColors[src3];
          trCol[v3 + 1] = starColors[src3 + 1];
          trCol[v3 + 2] = starColors[src3 + 2];

          trColEllip[v3] = starColElliptical[src3];
          trColEllip[v3 + 1] = starColElliptical[src3 + 1];
          trColEllip[v3 + 2] = starColElliptical[src3 + 2];

          trColBurst[v3] = starColStarburst[src3];
          trColBurst[v3 + 1] = starColStarburst[src3 + 1];
          trColBurst[v3 + 2] = starColStarburst[src3 + 2];
        }
      }
      if (starTrailGeo.attributes.aColor) {
        (starTrailGeo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
        (starTrailGeo.attributes.aColorElliptical as THREE.BufferAttribute).needsUpdate = true;
        (starTrailGeo.attributes.aColorStarburst as THREE.BufferAttribute).needsUpdate = true;
      }
    };

    const starTrailGeo = new THREE.BufferGeometry();
    starTrailGeo.setAttribute('position', new THREE.BufferAttribute(trPos, 3));
    starTrailGeo.setAttribute('aPosElliptical', new THREE.BufferAttribute(trPosEllip, 3));
    starTrailGeo.setAttribute('aPosStarburst', new THREE.BufferAttribute(trPosBurst, 3));
    starTrailGeo.setAttribute('aColor', new THREE.BufferAttribute(trCol, 3));
    starTrailGeo.setAttribute('aColorElliptical', new THREE.BufferAttribute(trColEllip, 3));
    starTrailGeo.setAttribute('aColorStarburst', new THREE.BufferAttribute(trColBurst, 3));
    starTrailGeo.setAttribute('aRadiusMorph', new THREE.BufferAttribute(trRadiusMorph, 3));
    starTrailGeo.setAttribute('aPhase', new THREE.BufferAttribute(trPhase, 1));
    starTrailGeo.setAttribute('aTrailT', new THREE.BufferAttribute(trTrailT, 1));
    starTrailGeo.setDrawRange(0, sampledStreaks * streakSegments * 2);
    syncTrailColorsFromStars();

    const starTrailUniforms = {
      uRealTime: { value: 0 },
      uSimEpoch: { value: simEpochRef.current },
      uDecayRate: { value: orbitalDecayRef.current },
      uSpread: { value: spreadRef.current },
      uStreakSpan: { value: 14.0 },
      uMorphWeights: { value: _morphWeights.clone() },
      uTransitionSwirl: { value: 0 },
      uIsLight: { value: finishRef.current === 'stone' ? 1.0 : 0.0 },
    };

    const starTrailMat = new THREE.ShaderMaterial({
      vertexShader: GALAXY_TRAIL_VERTEX_SHADER,
      fragmentShader: GALAXY_TRAIL_FRAGMENT_SHADER,
      uniforms: starTrailUniforms,
      transparent: true,
      depthWrite: false,
      blending:
        finishRef.current === 'stone' ? THREE.NormalBlending : THREE.AdditiveBlending,
    });

    const starTrailLines = new THREE.LineSegments(starTrailGeo, starTrailMat);
    scene.add(starTrailLines);

    // 10 Curated Orbital Guide Stars projected into 2D for .brain-core-dot-pulse motion streak overlays
    const pulseGuideIndices: number[] = [];
    for (let g = 0; g < 10 && g < sampledStreaks; g++) {
      pulseGuideIndices.push(streakSourceIndices[Math.floor((g * sampledStreaks) / 10)]);
    }

    // =========================================================================
    // 3. PROCEDURAL ANIMATED SOLAR / GRAVITATIONAL CORE + OPA 0.88 GYRO RING
    // =========================================================================
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    const solarGeo = new THREE.IcosahedronGeometry(0.96, 4);
    const solarUniforms = {
      uTime: { value: 0 },
      uColorHot: { value: new THREE.Color('#FFFBEB') },
      uColorMid: { value: new THREE.Color('#F59E0B') },
      uColorEdge: { value: new THREE.Color('#34D399') },
      uPulse: { value: 0 },
    };
    const solarMat = new THREE.ShaderMaterial({
      vertexShader: SOLAR_CORE_VERTEX_SHADER,
      fragmentShader: SOLAR_CORE_FRAGMENT_SHADER,
      uniforms: solarUniforms,
    });
    const solarMesh = new THREE.Mesh(solarGeo, solarMat);
    coreGroup.add(solarMesh);

    const coronaGeo = new THREE.SphereGeometry(1.36, 32, 24);
    const coronaUniforms = {
      uColor: { value: new THREE.Color('#F59E0B') },
      uIntensity: { value: 0.72 },
    };
    const coronaMat = new THREE.ShaderMaterial({
      vertexShader: SOLAR_CORE_VERTEX_SHADER,
      fragmentShader: CORONA_FRAGMENT_SHADER,
      uniforms: coronaUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    coreGroup.add(coronaMesh);

    // Camera-facing Relativistic Photon Ring / Gravitational Halo
    const photonHaloGeo = new THREE.PlaneGeometry(4.6, 4.6);
    const photonHaloUniforms = {
      uTime: { value: 0 },
      uColorInner: { value: new THREE.Color('#FFF7D6') },
      uColorOuter: { value: new THREE.Color('#34D399') },
      uIntensity: { value: finishRef.current === 'stone' ? 0.24 : 0.72 },
    };
    const photonHaloMat = new THREE.ShaderMaterial({
      vertexShader: PHOTON_HALO_VERTEX_SHADER,
      fragmentShader: PHOTON_HALO_FRAGMENT_SHADER,
      uniforms: photonHaloUniforms,
      transparent: true,
      depthWrite: false,
      blending:
        finishRef.current === 'stone' ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const photonHaloMesh = new THREE.Mesh(photonHaloGeo, photonHaloMat);
    photonHaloMesh.renderOrder = 3;
    coreGroup.add(photonHaloMesh);

    // Swirling Accretion Disk
    const accretionGeo = new THREE.RingGeometry(1.15, 2.52, 96, 6);
    const accretionUniforms = {
      uTime: { value: 0 },
      uInnerCol: { value: new THREE.Color('#FDE68A') },
      uOuterCol: { value: new THREE.Color('#38BDF8') },
      uOpacity: { value: 0.68 },
    };
    const accretionMat = new THREE.ShaderMaterial({
      vertexShader: ACCRETION_VERTEX_SHADER,
      fragmentShader: ACCRETION_FRAGMENT_SHADER,
      uniforms: accretionUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending:
        finishRef.current === 'stone' ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const accretionDisk = new THREE.Mesh(accretionGeo, accretionMat);
    accretionDisk.rotation.x = -Math.PI / 2;
    coreGroup.add(accretionDisk);

    // OPA 0.88 Governance Gyroscope Ring + 16 Calibration Collars
    const opaRingGroup = new THREE.Group();
    opaRingGroup.rotation.set(0.28, 0, -0.18);
    coreGroup.add(opaRingGroup);

    const opaRingGeo = new THREE.TorusGeometry(1.66, 0.028, 16, 96);
    const opaRingMat = new THREE.MeshStandardMaterial({
      color: '#6FCB9F',
      emissive: '#1C6E46',
      emissiveIntensity: 0.9,
      metalness: 0.82,
      roughness: 0.24,
    });
    const opaRingMesh = new THREE.Mesh(opaRingGeo, opaRingMat);
    opaRingMesh.rotation.x = Math.PI / 2;
    opaRingGroup.add(opaRingMesh);

    const tickGeo = new THREE.BoxGeometry(0.036, 0.08, 0.09);
    const tickInst = new THREE.InstancedMesh(tickGeo, opaRingMat, 16);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      _dummyObj.position.set(Math.cos(a) * 1.66, 0, Math.sin(a) * 1.66);
      _dummyObj.rotation.set(0, -a, 0);
      _dummyObj.scale.setScalar(1);
      _dummyObj.updateMatrix();
      tickInst.setMatrixAt(i, _dummyObj.matrix);
    }
    tickInst.instanceMatrix.needsUpdate = true;
    opaRingGroup.add(tickInst);

    // =========================================================================
    // 4. 8 COMPOSITE ORBITING SPENTA HUB ASSEMBLIES + 13 MODULE SATELLITES
    // =========================================================================
    const hubMetas: HubOrbitMeta[] = [];
    const hitProxies: THREE.Object3D[] = [];
    const disposableTextures: THREE.Texture[] = [];

    const hubShellGeo = new THREE.SphereGeometry(0.42, 28, 20);
    const hubCoreGeo = new THREE.SphereGeometry(0.27, 24, 18);
    const hubGimbalGeo = new THREE.TorusGeometry(0.56, 0.018, 12, 48);
    const hubSpireGeo = new THREE.ConeGeometry(0.055, 0.22, 8);
    const hubRippleGeo = new THREE.RingGeometry(0.44, 0.56, 36);
    const satGeo = new THREE.SphereGeometry(0.075, 12, 10);
    const proxyGeo = new THREE.SphereGeometry(0.76, 12, 10);
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });

    // Shared GPU Orbital Comet Trail Geometry (48 segments along trailing arc)
    const trailSegs = 48;
    const trailDummyPos = new Float32Array(trailSegs * 3);
    const trailTAttr = new Float32Array(trailSegs);
    for (let i = 0; i < trailSegs; i++) {
      trailTAttr[i] = i / (trailSegs - 1);
    }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailDummyPos, 3));
    trailGeo.setAttribute('aTrailT', new THREE.BufferAttribute(trailTAttr, 1));

    BRAIN_HUBS.forEach((hub, index) => {
      const isLeft = hub.side === 'left';
      const localIdx = index % 4;
      // Inner 4 orbits = Operations Engine; Outer 4 orbits = Experience & IR4 Engine
      const baseRadius = isLeft
        ? 3.15 + localIdx * 0.72
        : 6.15 + localIdx * 0.78;
      const initialAngle = isLeft
        ? Math.PI * 0.65 + localIdx * (Math.PI * 0.48)
        : -Math.PI * 0.2 + localIdx * (Math.PI * 0.48);
      const orbitSpeed = (isLeft ? 0.22 : 0.12) / Math.pow(baseRadius * 0.28, 0.55);
      const inclinationX = (localIdx - 1.5) * 0.075 * (isLeft ? 1 : -1.15);
      const inclinationZ = (isLeft ? 0.06 : -0.07) * ((localIdx % 2) * 2 - 1);
      // Triaxial 3D shell orbital inclinations for Elliptical Dense morphology
      const ellipticalInclinationX = ((index % 4) - 1.5) * 0.42 * (isLeft ? 1 : -1);
      const ellipticalInclinationZ = ((index % 3) - 1) * 0.36;

      const orbitGroup = new THREE.Group();
      orbitGroup.rotation.set(inclinationX, 0, inclinationZ);
      scene.add(orbitGroup);

      // Keplerian Orbital Track Ring
      const ringPts: THREE.Vector3[] = [];
      const segments = 96;
      for (let s = 0; s < segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        ringPts.push(new THREE.Vector3(Math.cos(theta) * baseRadius, 0, Math.sin(theta) * baseRadius));
      }
      const orbitRingGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
      const orbitRingMat = new THREE.LineBasicMaterial({
        color: hub.accent,
        transparent: true,
        opacity: 0.22,
      });
      const orbitRingLine = new THREE.LineLoop(orbitRingGeo, orbitRingMat);
      orbitGroup.add(orbitRingLine);

      // GPU-Animated Fading Orbital Comet Wake Arc
      const trailMat = new THREE.ShaderMaterial({
        vertexShader: ORBIT_TRAIL_VERTEX_SHADER,
        fragmentShader: ORBIT_TRAIL_FRAGMENT_SHADER,
        uniforms: {
          uHeadAngle: { value: initialAngle },
          uRadius: { value: baseRadius },
          uArcSpan: { value: 1.18 },
          uColor: { value: new THREE.Color(hub.accent) },
          uOpacity: { value: 0.72 },
        },
        transparent: true,
        depthWrite: false,
        blending:
          finishRef.current === 'stone' ? THREE.NormalBlending : THREE.AdditiveBlending,
      });
      const trailMesh = new THREE.Line(trailGeo, trailMat);
      trailMesh.frustumCulled = false;
      orbitGroup.add(trailMesh);

      // Composite Hub Planetary/Station Group
      const hubGroup = new THREE.Group();
      hubGroup.position.set(
        Math.cos(initialAngle) * baseRadius,
        0,
        Math.sin(initialAngle) * baseRadius,
      );
      orbitGroup.add(hubGroup);

      const bandTex = createPlanetaryBandTexture(hub.accent);
      bandTex.anisotropy = maxAnisotropy;
      disposableTextures.push(bandTex);

      const coreMat = new THREE.MeshStandardMaterial({
        map: bandTex,
        color: hub.accent,
        emissive: hub.accent,
        emissiveIntensity: 0.65,
        metalness: 0.35,
        roughness: 0.32,
      });
      const coreMesh = new THREE.Mesh(hubCoreGeo, coreMat);
      hubGroup.add(coreMesh);

      const shellMat = new THREE.MeshPhysicalMaterial({
        color: hub.accent,
        roughness: 0.12,
        metalness: 0.06,
        transmission: isSoftwareGl ? 0 : 0.68,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        transparent: true,
        opacity: 0.42,
        ior: 1.48,
        depthWrite: false,
      });
      const shellMesh = new THREE.Mesh(hubShellGeo, shellMat);
      shellMesh.renderOrder = 2;
      hubGroup.add(shellMesh);

      const gimbalMat = new THREE.MeshPhysicalMaterial({
        color: '#E2E8F0',
        emissive: hub.accent,
        emissiveIntensity: 0.28,
        metalness: 0.9,
        roughness: 0.22,
        anisotropy: 0.75,
      });
      const gimbalMesh = new THREE.Mesh(hubGimbalGeo, gimbalMat);
      gimbalMesh.rotation.set(Math.PI * 0.42, 0.25, 0);
      hubGroup.add(gimbalMesh);

      // Polar Telemetry Spires (North & South)
      const spireMat = new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        emissive: hub.accent,
        emissiveIntensity: 0.4,
        metalness: 0.78,
        roughness: 0.25,
      });
      const northSpire = new THREE.Mesh(hubSpireGeo, spireMat);
      northSpire.position.y = 0.52;
      hubGroup.add(northSpire);

      const southSpire = new THREE.Mesh(hubSpireGeo, spireMat);
      southSpire.position.y = -0.52;
      southSpire.rotation.x = Math.PI;
      hubGroup.add(southSpire);

      // Selection Shockwave Ripple Ring
      const rippleMat = new THREE.MeshBasicMaterial({
        color: hub.accent,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const rippleMesh = new THREE.Mesh(hubRippleGeo, rippleMat);
      rippleMesh.rotation.x = -Math.PI / 2;
      hubGroup.add(rippleMesh);

      // Dedicated Raycast Proxy (Layer 1)
      const hitProxy = new THREE.Mesh(proxyGeo, proxyMat);
      hitProxy.userData = { hubId: hub.id };
      hitProxy.layers.set(1);
      hubGroup.add(hitProxy);
      hitProxies.push(hitProxy);

      // Orbiting Module Satellites (representing SPENTA_APPS in this hub)
      const hubApps = SPENTA_APPS.filter((a) => a.hubId === hub.id);
      const satellites: SatelliteMeta[] = hubApps.map((app, sIdx) => {
        const satMat = new THREE.MeshStandardMaterial({
          color: '#E2E8F0',
          emissive: hub.accent,
          emissiveIntensity: 0.35,
          metalness: 0.4,
          roughness: 0.3,
        });
        const satMesh = new THREE.Mesh(satGeo, satMat);
        hubGroup.add(satMesh);
        return {
          appId: app.id,
          mesh: satMesh,
          mat: satMat,
          orbitRadius: 0.76 + sIdx * 0.22,
          orbitSpeed: 1.05 + sIdx * 0.45,
          phase: (sIdx / Math.max(hubApps.length, 1)) * Math.PI * 2,
          inclination: (sIdx % 2 === 0 ? 1 : -1) * 0.36,
        };
      });

      // Dynamic Gravitational Filament linking Hub <-> Solar Core
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0.8, 0),
        hubGroup.position.clone(),
      );
      const filamentGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
      const filamentMat = new THREE.LineBasicMaterial({
        color: hub.accent,
        transparent: true,
        opacity: 0.16,
      });
      const filamentLine = new THREE.Line(filamentGeo, filamentMat);
      scene.add(filamentLine);

      hubMetas.push({
        hubId: hub.id,
        num: hub.num,
        side: hub.side,
        accentHex: hub.accent,
        orbitGroup,
        hubGroup,
        orbitRingLine,
        orbitRingMat,
        trailMesh,
        trailMat,
        coreMat,
        shellMat,
        gimbalMesh,
        gimbalMat,
        spireMat,
        filamentLine,
        filamentGeo,
        filamentMat,
        rippleMesh,
        rippleMat,
        rippleTimer: 0,
        baseRadius,
        orbitSpeed,
        initialAngle,
        currentAngle: initialAngle,
        decayFactor: 1.0,
        inclinationX,
        inclinationZ,
        ellipticalInclinationX,
        ellipticalInclinationZ,
        satellites,
        curve,
      });
    });

    // Instanced Telemetry Photons traveling along active Hub <-> Solar Core filaments
    const packetsPerHub = 3;
    const totalPackets = hubMetas.length * packetsPerHub;
    const packetGeo = new THREE.SphereGeometry(0.068, 10, 8);
    const packetMat = new THREE.MeshBasicMaterial({ color: '#A7F3D0' });
    const packetInst = new THREE.InstancedMesh(packetGeo, packetMat, totalPackets);
    packetInst.frustumCulled = false;
    scene.add(packetInst);

    // Pre-compile shaders on hardware GPU (skipped on Software WebGL to avoid stall)
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // =========================================================================
    // 5. INTERACTION, RAYCASTING & CAMERA FLY-TO CONTROLLER
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointerNdc = new THREE.Vector2(-10, -10);
    let lastRaycastMs = 0;

    let cameraFlyActive = false;
    let trackedHubId: string | null = null;
    let lastHandledPresetNonce = presetCommandRef.current.nonce;
    let lastHandledFocusNonce = focusTriggerRef.current.nonce;

    const handleControlStart = () => {
      cameraFlyActive = false;
      trackedHubId = null;
      if (gsapActiveRef.current && !isSwitchingOutRef.current) {
        activeGsapTlRef.current?.kill();
        activeGsapTlRef.current = null;
        gsapActiveRef.current = false;
      }
    };
    controls.addEventListener('start', handleControlStart);

    const updatePointerNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRaycastMs < 40) return;
      lastRaycastMs = now;

      updatePointerNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(hitProxies, false);
      const hitHubId =
        hits.length > 0 ? String(hits[0].object.userData.hubId ?? '') : null;

      if (hitHubId !== hoveredHubRef.current) {
        hoveredHubRef.current = hitHubId;
        setHoveredHubId(hitHubId);
        renderer.domElement.style.cursor = hitHubId ? 'pointer' : 'grab';
      }
    };

    const handlePointerLeave = () => {
      if (hoveredHubRef.current !== null) {
        hoveredHubRef.current = null;
        setHoveredHubId(null);
      }
      renderer.domElement.style.cursor = 'grab';
    };

    let pointerDownPos = { x: 0, y: 0 };
    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moved > 6) return; // Dragging camera, not clicking
      updatePointerNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(hitProxies, false);
      if (hits.length > 0) {
        const hitHubId = String(hits[0].object.userData.hubId ?? '');
        if (hitHubId) {
          const meta = hubMetas.find((h) => h.hubId === hitHubId);
          if (meta) meta.rippleTimer = 1.0;
          trackedHubId = hitHubId;
          cameraFlyActive = true;
          onSelectHubRef.current?.(hitHubId);
        }
      }
    };

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // WebGL Context Loss & Restoration Handling
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // ResizeObserver
    let currentWidth = width;
    let currentHeight = height;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const nextW = Math.max(Math.floor(entry.contentRect.width), 280);
        const nextH = Math.max(Math.floor(entry.contentRect.height), 320);
        if (nextW !== currentWidth || nextH !== currentHeight) {
          currentWidth = nextW;
          currentHeight = nextH;
          camera.aspect = nextW / nextH;
          camera.updateProjectionMatrix();
          renderer.setSize(nextW, nextH);
          composer?.setSize(nextW, nextH);
        }
      }
    });
    resizeObserver.observe(container);

    // =========================================================================
    // 6. MAIN ANIMATION LOOP + SOFTWARE WEBGL FENCESYNC PACING
    // =========================================================================
    let disposed = false;
    let rafId = 0;
    let syncTimerId = 0;
    let activeSync: WebGLSync | null = null;
    let realTime = 0;
    let lastTime = performance.now();
    let lastAppliedFinish: ObservatoryFinish = finishRef.current;
    let lastAppliedDensity = -1;
    let lastHudSyncMs = 0;
    let lastEpochUiSyncMs = 0;
    let lastMorphUiSyncMs = 0;
    let morphUiSettled = true;
    let transitionSwirl = 0;

    // WebGL2 fenceSync pacing helper for Software WebGL (yields via setTimeout)
    const glCtx = renderer.getContext();
    const isWebGL2 =
      typeof WebGL2RenderingContext !== 'undefined' &&
      glCtx instanceof WebGL2RenderingContext;

    const afterDraw = (cb: () => void) => {
      if (!isSoftwareGl || !isWebGL2) {
        rafId = requestAnimationFrame(cb);
        return;
      }
      const gl2 = glCtx as WebGL2RenderingContext;
      const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        syncTimerId = window.setTimeout(cb, 80);
        return;
      }
      activeSync = sync;
      gl2.flush();
      const poll = () => {
        if (disposed) {
          gl2.deleteSync(sync);
          activeSync = null;
          return;
        }
        if (gl2.getSyncParameter(sync, gl2.SYNC_STATUS) === gl2.UNSIGNALED) {
          syncTimerId = window.setTimeout(poll, 5);
        } else {
          gl2.deleteSync(sync);
          activeSync = null;
          syncTimerId = window.setTimeout(cb, 80);
        }
      };
      syncTimerId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;

      const now = performance.now();
      const rawDt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      realTime += rawDt;

      // Advance deterministic cosmic timeline (Myr) when playing and not actively scrubbing
      const playing = !reducedMotion && !isPausedRef.current && !isScrubbingRef.current;
      if (playing && spinSpeedRef.current > 0.001) {
        const deltaMyr = rawDt * 4.8 * playbackRateRef.current * spinSpeedRef.current;
        const nextEpoch = simEpochRef.current + deltaMyr;
        if (nextEpoch >= TIMELINE_MAX_MYR) {
          simEpochRef.current = TIMELINE_MAX_MYR;
          setSimEpoch(TIMELINE_MAX_MYR);
          setIsPaused(true);
        } else if (nextEpoch <= TIMELINE_MIN_MYR) {
          simEpochRef.current = TIMELINE_MIN_MYR;
          setSimEpoch(TIMELINE_MIN_MYR);
          setIsPaused(true);
        } else {
          simEpochRef.current = nextEpoch;
          if (now - lastEpochUiSyncMs > 80) {
            lastEpochUiSyncMs = now;
            setSimEpoch(nextEpoch);
          }
        }
      }

      const curEpoch = simEpochRef.current;
      const epochProgress = (curEpoch - TIMELINE_MIN_MYR) / (TIMELINE_MAX_MYR - TIMELINE_MIN_MYR);

      // Smooth GPU morph interpolation between Spiral, Elliptical Dense, and Active Starburst
      const targetTuple = MORPH_TARGET_BY_PRESET[galaxyPresetRef.current];
      _morphTarget.set(targetTuple[0], targetTuple[1], targetTuple[2]);
      _morphWeights.x = THREE.MathUtils.damp(_morphWeights.x, _morphTarget.x, 3.1, rawDt);
      _morphWeights.y = THREE.MathUtils.damp(_morphWeights.y, _morphTarget.y, 3.1, rawDt);
      _morphWeights.z = THREE.MathUtils.damp(_morphWeights.z, _morphTarget.z, 3.1, rawDt);
      const wSum = _morphWeights.x + _morphWeights.y + _morphWeights.z;
      if (wSum > 0.0001) {
        _morphWeights.divideScalar(wSum);
      }

      // Organic swirl peak mid-transition during one-click preset morphs
      const morphDominance = Math.max(_morphWeights.x, _morphWeights.y, _morphWeights.z);
      const targetSwirl = Math.sin(Math.min(1, (1 - morphDominance) * 2.1) * Math.PI);
      transitionSwirl = THREE.MathUtils.damp(transitionSwirl, targetSwirl, 5.0, rawDt);
      morphPulseRef.current = Math.max(0, morphPulseRef.current - rawDt * 1.4);

      // Sync morph transition progress bar cleanly (works even while paused and always settles to 1)
      const activeTargetWeight =
        galaxyPresetRef.current === 'andromeda-spiral'
          ? _morphWeights.x
          : galaxyPresetRef.current === 'elliptical-dense'
            ? _morphWeights.y
            : _morphWeights.z;
      if (activeTargetWeight < 0.99) {
        morphUiSettled = false;
        if (now - lastMorphUiSyncMs > 50) {
          lastMorphUiSyncMs = now;
          setMorphProgress(activeTargetWeight);
        }
      } else if (!morphUiSettled) {
        morphUiSettled = true;
        setMorphProgress(1);
      }

      // Handle Finish palette switches cleanly
      const curFinish = finishRef.current;
      const isStone = curFinish === 'stone';
      if (curFinish !== lastAppliedFinish) {
        lastAppliedFinish = curFinish;
        applyStarPalette(curFinish);
        applyNebulaPalette(curFinish);
        syncTrailColorsFromStars();

        const nextBlend = isStone ? THREE.NormalBlending : THREE.AdditiveBlending;
        galaxyMat.blending = nextBlend;
        galaxyMat.needsUpdate = true;
        nebulaMat.blending = nextBlend;
        nebulaMat.needsUpdate = true;
        starTrailMat.blending = nextBlend;
        starTrailMat.needsUpdate = true;
        accretionMat.blending = nextBlend;
        accretionMat.needsUpdate = true;
        photonHaloMat.blending = nextBlend;
        photonHaloMat.needsUpdate = true;
        for (let h = 0; h < hubMetas.length; h++) {
          hubMetas[h].trailMat.blending = nextBlend;
          hubMetas[h].trailMat.needsUpdate = true;
        }

        if (bloomPass) {
          bloomPass.strength = isStone ? 0.14 : 0.62;
          bloomPass.threshold = isStone ? 0.86 : 0.48;
        }
      }

      // Dynamic Star, Nebula & Orbital Streak Density via GPU drawRange (zero buffer re-uploads)
      const targetDensity = starDensityRef.current;
      if (Math.abs(targetDensity - lastAppliedDensity) > 0.001) {
        lastAppliedDensity = targetDensity;
        galaxyGeo.setDrawRange(0, Math.max(1000, Math.round(starCount * targetDensity)));
        nebulaGeo.setDrawRange(0, Math.max(120, Math.round(nebulaCount * targetDensity)));
        starTrailGeo.setDrawRange(
          0,
          Math.max(48, Math.round(sampledStreaks * targetDensity)) * streakSegments * 2,
        );
      }

      // Smoothly lerp scene background, exponential fog & lighting
      (scene.background as THREE.Color).lerp(BG_COLORS[curFinish], Math.min(1, rawDt * 6));
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(scene.background as THREE.Color);
      }
      hemiLight.intensity = isStone ? 1.35 : 0.9;
      solarPointLight.intensity =
        (isStone ? 2.6 : 4.2) * (1.0 + _morphWeights.z * 0.25 + _morphWeights.y * 0.15);

      // Update GLSL Galaxy, Nebula & Star Trail Uniforms (GPU morphology + deterministic timeline)
      const futureEpochDecay = Math.max(0, (curEpoch - 180) / 320) * 0.32;
      const effectiveTargetDecay = Math.min(1.0, Math.max(orbitalDecayRef.current, futureEpochDecay));
      galaxyUniforms.uRealTime.value = realTime;
      galaxyUniforms.uSimEpoch.value = curEpoch;
      galaxyUniforms.uDecayRate.value = THREE.MathUtils.damp(
        galaxyUniforms.uDecayRate.value,
        effectiveTargetDecay,
        4.5,
        rawDt,
      );
      galaxyUniforms.uDensity.value = targetDensity;
      galaxyUniforms.uSpread.value = THREE.MathUtils.damp(
        galaxyUniforms.uSpread.value,
        spreadRef.current,
        5,
        rawDt,
      );
      galaxyUniforms.uMorphWeights.value.copy(_morphWeights);
      galaxyUniforms.uTransitionSwirl.value = transitionSwirl;
      galaxyUniforms.uIsLight.value = isStone ? 1.0 : 0.0;

      nebulaUniforms.uSimEpoch.value = curEpoch;
      nebulaUniforms.uDecayRate.value = galaxyUniforms.uDecayRate.value;
      nebulaUniforms.uSpread.value = galaxyUniforms.uSpread.value;
      nebulaUniforms.uMorphWeights.value.copy(_morphWeights);
      nebulaUniforms.uTransitionSwirl.value = transitionSwirl;
      nebulaUniforms.uIsLight.value = isStone ? 1.0 : 0.0;

      const signedVel =
        (isPausedRef.current ? 0.28 : 1.0) *
        (playbackRateRef.current < 0 ? -1 : 1) *
        (0.45 + spinSpeedRef.current * 0.95);
      const targetStreakSpan = signedVel * 16.5;
      starTrailUniforms.uRealTime.value = realTime;
      starTrailUniforms.uSimEpoch.value = curEpoch;
      starTrailUniforms.uDecayRate.value = galaxyUniforms.uDecayRate.value;
      starTrailUniforms.uSpread.value = galaxyUniforms.uSpread.value;
      starTrailUniforms.uStreakSpan.value = THREE.MathUtils.damp(
        starTrailUniforms.uStreakSpan.value,
        targetStreakSpan,
        5.5,
        rawDt,
      );
      starTrailUniforms.uMorphWeights.value.copy(_morphWeights);
      starTrailUniforms.uTransitionSwirl.value = transitionSwirl;
      starTrailUniforms.uIsLight.value = isStone ? 1.0 : 0.0;

      // Update Solar Core, Corona, Photon Halo & Accretion Disk with morphology color blending
      const opaPass = hitlRef.current >= 0.88;
      const coreTime = curEpoch * 0.22 + realTime * 0.25;
      solarUniforms.uTime.value = coreTime;
      solarUniforms.uPulse.value =
        0.5 + 0.5 * Math.sin(realTime * 2.2) + morphPulseRef.current * 0.55;

      // Blend core colors across Spiral -> Elliptical (golden-amber) -> Starburst (cyan-magenta)
      _coreHotCol.set(
        isStone ? '#FEF3C7' : curFinish === 'nocturnal' ? '#E8F6FF' : '#FFFBEB',
      );
      _tmpColor.set(isStone ? '#FDE68A' : '#FFFBEB');
      _tmpColor2.set(isStone ? '#E0F2FE' : '#F0F9FF');
      solarUniforms.uColorHot.value
        .copy(_coreHotCol)
        .lerp(_tmpColor, _morphWeights.y)
        .lerp(_tmpColor2, _morphWeights.z);

      _coreMidCol.set(
        opaPass
          ? curFinish === 'nocturnal'
            ? '#38BDF8'
            : '#F59E0B'
          : '#D97706',
      );
      _tmpColor.set('#F59E0B');
      _tmpColor2.set('#38BDF8');
      solarUniforms.uColorMid.value
        .copy(_coreMidCol)
        .lerp(_tmpColor, _morphWeights.y)
        .lerp(_tmpColor2, _morphWeights.z);

      _coreEdgeCol.set(opaPass ? '#34D399' : '#F59E0B');
      _tmpColor.set('#FBBF24');
      _tmpColor2.set('#FB7185');
      solarUniforms.uColorEdge.value
        .copy(_coreEdgeCol)
        .lerp(_tmpColor, _morphWeights.y)
        .lerp(_tmpColor2, _morphWeights.z);

      _coronaCol.set(opaPass ? '#6FCB9F' : '#F59E0B');
      _tmpColor.set('#F59E0B');
      _tmpColor2.set('#F43F5E');
      coronaUniforms.uColor.value
        .copy(_coronaCol)
        .lerp(_tmpColor, _morphWeights.y)
        .lerp(_tmpColor2, _morphWeights.z);
      coronaUniforms.uIntensity.value =
        (isStone ? 0.25 : 0.68) * (1.0 + _morphWeights.z * 0.28 + morphPulseRef.current * 0.25);

      photonHaloUniforms.uTime.value = coreTime;
      _haloInCol.set(
        isStone ? '#B45309' : curFinish === 'nocturnal' ? '#E0F2FE' : '#FFF7D6',
      );
      _tmpColor.set(isStone ? '#92400E' : '#FEF3C7');
      _tmpColor2.set(isStone ? '#0369A1' : '#E0F2FE');
      photonHaloUniforms.uColorInner.value
        .copy(_haloInCol)
        .lerp(_tmpColor, _morphWeights.y)
        .lerp(_tmpColor2, _morphWeights.z);

      _haloOutCol.set(opaPass ? '#34D399' : '#F59E0B');
      _tmpColor.set('#D97706');
      _tmpColor2.set('#E879F9');
      photonHaloUniforms.uColorOuter.value
        .copy(_haloOutCol)
        .lerp(_tmpColor, _morphWeights.y)
        .lerp(_tmpColor2, _morphWeights.z);
      photonHaloUniforms.uIntensity.value =
        (isStone ? 0.24 : 0.72) * (1.0 + _morphWeights.y * 0.18 + _morphWeights.z * 0.24);
      photonHaloMesh.quaternion.copy(camera.quaternion);

      accretionUniforms.uTime.value = curEpoch * 0.28 + realTime * 0.16;
      _accInCol.set(isStone ? '#B45309' : '#FDE68A');
      _tmpColor.set(isStone ? '#92400E' : '#FCD34D');
      _tmpColor2.set(isStone ? '#0284C7' : '#7DD3FC');
      accretionUniforms.uInnerCol.value
        .copy(_accInCol)
        .lerp(_tmpColor, _morphWeights.y)
        .lerp(_tmpColor2, _morphWeights.z);

      _accOutCol.set(opaPass ? (isStone ? '#1C6E46' : '#38BDF8') : '#F59E0B');
      _tmpColor.set('#D97706');
      _tmpColor2.set('#FB7185');
      accretionUniforms.uOuterCol.value
        .copy(_accOutCol)
        .lerp(_tmpColor, _morphWeights.y)
        .lerp(_tmpColor2, _morphWeights.z);
      // Soften flat equatorial accretion disk slightly in Elliptical Dense spheroid
      accretionUniforms.uOpacity.value =
        (isStone ? 0.42 : 0.72) * (1.0 - _morphWeights.y * 0.38 + _morphWeights.z * 0.2);

      // Deterministic core & OPA gyroscope rotations anchored to simEpoch
      solarMesh.rotation.y = curEpoch * 0.048 + realTime * 0.04;
      opaRingGroup.rotation.y = -curEpoch * 0.092 - realTime * 0.05;
      opaRingMat.color.set(opaPass ? (isStone ? '#1C6E46' : '#6FCB9F') : '#D97706');
      opaRingMat.emissive.set(opaPass ? '#1C6E46' : '#B45309');

      // Check Camera / Galaxy Preset Fly-To triggers
      if (presetCommandRef.current.nonce !== lastHandledPresetNonce) {
        lastHandledPresetNonce = presetCommandRef.current.nonce;
        _camGoalPos.set(...presetCommandRef.current.pos);
        _camGoalTarget.set(...presetCommandRef.current.target);
        trackedHubId = null;
        cameraFlyActive = true;
      }

      // Check external Hub Focus triggers (from Pathway -> 3D Brain sync)
      if (focusTriggerRef.current.nonce !== lastHandledFocusNonce) {
        lastHandledFocusNonce = focusTriggerRef.current.nonce;
        if (focusTriggerRef.current.hubId) {
          trackedHubId = focusTriggerRef.current.hubId;
          cameraFlyActive = true;
          const m = hubMetas.find((h) => h.hubId === focusTriggerRef.current.hubId);
          if (m) m.rippleTimer = 1.0;
        }
      }

      // Update 8 Orbiting Hub Assemblies, Satellites, Filaments & Photons (Deterministic to simEpoch)
      const spreadScale = 0.72 + galaxyUniforms.uSpread.value * 0.45;
      const selIds = selectedIdsRef.current;
      const curHovered = hoveredHubRef.current;
      const curSelectedHub = selectedHubRef.current;
      const absRate = isPausedRef.current ? 1 : Math.abs(playbackRateRef.current);

      let packetIdx = 0;

      for (let h = 0; h < hubMetas.length; h++) {
        const meta = hubMetas[h];
        const hubAppsActiveCount = meta.satellites.filter((s) =>
          selIds.includes(s.appId),
        ).length;
        const isActiveHub = hubAppsActiveCount > 0;
        const isSelected = curSelectedHub === meta.hubId;
        const isHovered = curHovered === meta.hubId;

        // Smoothly tilt orbital planes into 3D triaxial orbits during Elliptical Dense preset
        const targetIncX =
          meta.inclinationX * (1 - _morphWeights.y) +
          meta.ellipticalInclinationX * _morphWeights.y;
        const targetIncZ =
          meta.inclinationZ * (1 - _morphWeights.y) +
          meta.ellipticalInclinationZ * _morphWeights.y;
        meta.orbitGroup.rotation.x = THREE.MathUtils.damp(
          meta.orbitGroup.rotation.x,
          targetIncX,
          4.0,
          rawDt,
        );
        meta.orbitGroup.rotation.z = THREE.MathUtils.damp(
          meta.orbitGroup.rotation.z,
          targetIncZ,
          4.0,
          rawDt,
        );

        // Deterministic orbital decay radius across timeline (-500 Myr wider -> +500 Myr tighter)
        const activeDecay = galaxyUniforms.uDecayRate.value;
        const targetDecayScale =
          activeDecay > 0.001
            ? Math.max(0.56, 1.0 - activeDecay * (0.12 + epochProgress * 0.36))
            : 1.0;
        meta.decayFactor = THREE.MathUtils.damp(meta.decayFactor, targetDecayScale, 6.0, rawDt);

        const keplerBoost = 1 / Math.pow(Math.max(meta.decayFactor, 0.56), 1.35);
        meta.currentAngle =
          meta.initialAngle + curEpoch * 0.175 * meta.orbitSpeed * keplerBoost;

        const curOrbitR = Math.max(2.05, meta.baseRadius * spreadScale * meta.decayFactor);
        meta.orbitRingLine.scale.setScalar(curOrbitR / meta.baseRadius);
        meta.trailMat.uniforms.uHeadAngle.value = meta.currentAngle;
        meta.trailMat.uniforms.uRadius.value = curOrbitR;
        meta.trailMat.uniforms.uArcSpan.value =
          (1.12 + (1.0 - meta.decayFactor) * 2.7) * (0.85 + Math.min(absRate, 4) * 0.16);
        meta.trailMat.uniforms.uOpacity.value = isSelected
          ? 0.92
          : isHovered
            ? 0.76
            : isActiveHub
              ? 0.56
              : isStone
                ? 0.34
                : 0.24;
        meta.hubGroup.position.set(
          Math.cos(meta.currentAngle) * curOrbitR,
          Math.sin(curEpoch * 0.16 + h) * 0.08,
          Math.sin(meta.currentAngle) * curOrbitR,
        );

        // Rotate gimbal & planetary core
        meta.gimbalMesh.rotation.z += rawDt * (isSelected || isHovered ? 1.25 : 0.42);
        meta.hubGroup.scale.setScalar(
          THREE.MathUtils.damp(
            meta.hubGroup.scale.x,
            isSelected ? 1.24 : isHovered ? 1.14 : isActiveHub ? 1.06 : 0.94,
            7,
            rawDt,
          ),
        );

        // Emissive intensity pulse for active/selected hubs
        const pulseWave = 0.5 + 0.5 * Math.sin(realTime * 3.1 + h * 0.8);
        meta.coreMat.emissiveIntensity = isSelected
          ? 1.15 + pulseWave * 0.75
          : isActiveHub
            ? 0.72 + pulseWave * 0.35
            : 0.25;
        meta.shellMat.opacity = isSelected ? 0.56 : isActiveHub ? 0.44 : 0.26;
        meta.orbitRingMat.opacity = isSelected
          ? 0.72
          : isHovered
            ? 0.52
            : isActiveHub
              ? 0.32
              : isStone
                ? 0.2
                : 0.14;

        // Coronal Shockwave Ripple
        if (meta.rippleTimer > 0) {
          meta.rippleTimer = Math.max(0, meta.rippleTimer - rawDt * 1.15);
          const prog = 1 - meta.rippleTimer;
          meta.rippleMesh.scale.setScalar(1 + prog * 2.4);
          meta.rippleMat.opacity = meta.rippleTimer * 0.75;
        } else {
          meta.rippleMat.opacity = 0;
        }

        // Orbiting Module Satellites (13 Spenta Apps, deterministic to simEpoch)
        for (let s = 0; s < meta.satellites.length; s++) {
          const sat = meta.satellites[s];
          const satActive = selIds.includes(sat.appId);
          const satAng =
            sat.phase + curEpoch * 0.21 * sat.orbitSpeed * (satActive ? 1.1 : 0.55);
          sat.mesh.position.set(
            Math.cos(satAng) * sat.orbitRadius,
            Math.sin(satAng) * sat.orbitRadius * Math.sin(sat.inclination),
            Math.sin(satAng) * sat.orbitRadius * Math.cos(sat.inclination),
          );
          sat.mesh.scale.setScalar(satActive ? 1.28 : 0.75);
          sat.mat.emissiveIntensity = satActive ? 1.25 : 0.18;
          sat.mat.color.set(satActive ? '#FFFFFF' : isStone ? '#64748B' : '#94A3B8');
        }

        // Update World Position & Dynamic Filament Curve
        meta.hubGroup.getWorldPosition(_worldPos);
        _midCtrl.set(_worldPos.x * 0.5, _worldPos.y * 0.5 + 1.05, _worldPos.z * 0.5);
        meta.curve.v0.set(0, 0, 0);
        meta.curve.v1.copy(_midCtrl);
        meta.curve.v2.copy(_worldPos);

        const posAttr = meta.filamentGeo.attributes.position as THREE.BufferAttribute;
        for (let pt = 0; pt <= 24; pt++) {
          meta.curve.getPoint(pt / 24, _packetPos);
          posAttr.setXYZ(pt, _packetPos.x, _packetPos.y, _packetPos.z);
        }
        posAttr.needsUpdate = true;
        meta.filamentMat.opacity = isSelected
          ? 0.68
          : isHovered
            ? 0.48
            : isActiveHub
              ? 0.28
              : 0.06;

        // Telemetry Photons streaming along active/selected filaments (positive modulo safe for negative epochs)
        for (let p = 0; p < packetsPerHub; p++) {
          if (isActiveHub || isSelected) {
            const rawFlow = curEpoch * 0.068 + p / packetsPerHub + h * 0.17;
            const tFlow = ((rawFlow % 1) + 1) % 1;
            meta.curve.getPoint(tFlow, _packetPos);
            _dummyObj.position.copy(_packetPos);
            _dummyObj.scale.setScalar(isSelected ? 1.25 : 0.9);
          } else {
            _dummyObj.position.set(0, -999, 0);
            _dummyObj.scale.setScalar(0.001);
          }
          _dummyObj.updateMatrix();
          packetInst.setMatrixAt(packetIdx++, _dummyObj.matrix);
        }
      }
      packetInst.instanceMatrix.needsUpdate = true;
      packetMat.color.set(isStone ? '#1C6E46' : '#A7F3D0');

      // Smooth Camera Fly-To / Hub Tracking (yields cleanly to GSAP system-switch transitions)
      if (!gsapActiveRef.current && cameraFlyActive) {
        if (trackedHubId) {
          const tMeta = hubMetas.find((h) => h.hubId === trackedHubId);
          if (tMeta) {
            tMeta.hubGroup.getWorldPosition(_worldPos);
            _camGoalTarget.copy(_worldPos).multiplyScalar(0.65);
            _radialDir.copy(_worldPos).normalize();
            _camGoalPos.copy(_worldPos).addScaledVector(_radialDir, 4.4);
            _camGoalPos.y += 2.35;
          }
        }
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 4.2, rawDt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 4.2, rawDt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 4.2, rawDt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalTarget.x, 4.8, rawDt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalTarget.y, 4.8, rawDt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalTarget.z, 4.8, rawDt);

        if (
          !trackedHubId &&
          camera.position.distanceTo(_camGoalPos) < 0.08 &&
          controls.target.distanceTo(_camGoalTarget) < 0.05
        ) {
          cameraFlyActive = false;
        }
      }

      // Constant slow cinematic camera orbit when Auto-Rotate is enabled
      controls.autoRotate = autoRotateRef.current && !cameraFlyActive && !gsapActiveRef.current;
      controls.autoRotateSpeed = 0.72;
      controls.update();

      // Render (GPU Bloom Pipeline or Software WebGL Direct Render)
      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      // Throttled 2D Screen-Space Projection for Callout, Emissive Beacons & .brain-core-dot-pulse Star Streaks (16 Hz)
      if (now - lastHudSyncMs > 62) {
        lastHudSyncMs = now;
        const anchors: ProjectedNodeAnchor[] = [];
        let nextCallout: ProjectedCallout | null = null;
        const targetId = hoveredHubRef.current ?? selectedHubRef.current;

        for (let h = 0; h < hubMetas.length; h++) {
          const meta = hubMetas[h];
          const isSelected = selectedHubRef.current === meta.hubId;
          const isActive = meta.satellites.some((s) => selIds.includes(s.appId));

          meta.hubGroup.getWorldPosition(_worldPos);
          _projVec.copy(_worldPos).project(camera);

          if (_projVec.z < 1 && _projVec.z > -1) {
            const sx = (_projVec.x * 0.5 + 0.5) * currentWidth;
            const sy = (-_projVec.y * 0.5 + 0.5) * currentHeight;

            if (
              (isSelected || isActive) &&
              sx > 20 &&
              sx < currentWidth - 20 &&
              sy > 20 &&
              sy < currentHeight - 20
            ) {
              anchors.push({
                hubId: meta.hubId,
                num: meta.num,
                x: sx,
                y: sy,
                isSelected,
                isActive,
                accent: meta.accentHex,
              });
            }

            if (targetId === meta.hubId) {
              nextCallout = {
                hubId: meta.hubId,
                x: Math.min(Math.max(sx, 118), currentWidth - 118),
                y: Math.min(Math.max(sy - 34, 48), currentHeight - 110),
                visible: true,
              };
            }
          }
        }

        // Project 10 curated orbital tracer stars for .brain-core-dot-pulse velocity-aligned streaks
        const streaks: ProjectedStarStreak[] = [];
        const wSp = _morphWeights.x;
        const wEl = _morphWeights.y;
        const wBu = _morphWeights.z;
        const eNorm = Math.max(-1, Math.min(1, curEpoch / 500));
        const eProg = (curEpoch + 500) / 1000;
        const spreadM = (0.72 + galaxyUniforms.uSpread.value * 0.45) * (1 - eNorm * 0.14);
        const vertM = 1 - eNorm * 0.34 * (1 - wEl * 0.72);
        const kinR = wSp * 1.0 + wEl * 0.36 + wBu * 1.32;
        const decayU = galaxyUniforms.uDecayRate.value;
        const trailSpan = starTrailUniforms.uStreakSpan.value;

        for (let g = 0; g < pulseGuideIndices.length; g++) {
          const sIdx = pulseGuideIndices[g];
          const s3 = sIdx * 3;
          const bx =
            starPositions[s3] * wSp + starPosElliptical[s3] * wEl + starPosStarburst[s3] * wBu;
          const by =
            starPositions[s3 + 1] * wSp +
            starPosElliptical[s3 + 1] * wEl +
            starPosStarburst[s3 + 1] * wBu;
          const bz =
            starPositions[s3 + 2] * wSp +
            starPosElliptical[s3 + 2] * wEl +
            starPosStarburst[s3 + 2] * wBu;
          const mR =
            starRadiusMorph[s3] * wSp +
            starRadiusMorph[s3 + 1] * wEl +
            starRadiusMorph[s3 + 2] * wBu;
          const ph = starPhases[sIdx];
          const cyc = ((eProg * 1.85 + ph * 0.15915494) % 1 + 1) % 1;
          const dPull = 1 - cyc * 0.56 * Math.max(0, Math.min(1, decayU));
          const rEff = Math.max(mR * spreadM * dPull, 0.42);
          const aVel = (0.24 * kinR) / (Math.pow(Math.max(rEff, 0.35), 0.58) + 0.32);
          const twist = (1 - dPull) * 3.2;
          const angHead = curEpoch * 0.16 * aVel + twist;
          const angTail = (curEpoch - trailSpan * 0.65) * 0.16 * aVel + twist;

          const ch = Math.cos(angHead);
          const sh = Math.sin(angHead);
          const ct = Math.cos(angTail);
          const st = Math.sin(angTail);
          const scaleXZ = spreadM * dPull;

          _streakHeadPos.set(
            (bx * ch - bz * sh) * scaleXZ,
            by * vertM,
            (bx * sh + bz * ch) * scaleXZ,
          );
          _streakTailPos.set(
            (bx * ct - bz * st) * scaleXZ,
            by * vertM,
            (bx * st + bz * ct) * scaleXZ,
          );

          _projVec.copy(_streakHeadPos).project(camera);
          _projTailVec.copy(_streakTailPos).project(camera);

          if (_projVec.z > -1 && _projVec.z < 1 && _projTailVec.z > -1 && _projTailVec.z < 1) {
            const hx = (_projVec.x * 0.5 + 0.5) * currentWidth;
            const hy = (-_projVec.y * 0.5 + 0.5) * currentHeight;
            const tx = (_projTailVec.x * 0.5 + 0.5) * currentWidth;
            const ty = (-_projTailVec.y * 0.5 + 0.5) * currentHeight;
            if (hx > 18 && hx < currentWidth - 18 && hy > 18 && hy < currentHeight - 18) {
              const dx = hx - tx;
              const dy = hy - ty;
              const distPx = Math.hypot(dx, dy);
              const lengthPx = Math.max(12, Math.min(44, distPx * 1.15));
              const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
              const accentHex =
                wBu > 0.5
                  ? g % 2 === 0
                    ? '#FB7185'
                    : '#38BDF8'
                  : wEl > 0.5
                    ? '#FBBF24'
                    : g % 2 === 0
                      ? '#6FCB9F'
                      : '#7DD3FC';

              streaks.push({
                id: g,
                x: hx,
                y: hy,
                angleDeg,
                lengthPx,
                accent: isStone ? '#1F3863' : accentHex,
                delaySec: Number(((g * 0.22) % 2.2).toFixed(2)),
              });
            }
          }
        }

        setProjectedNodes(anchors);
        setProjectedStarStreaks(streaks);
        setCallout(nextCallout);
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
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      // Dispose all geometries, materials, textures & composer targets
      galaxyGeo.dispose();
      galaxyMat.dispose();
      nebulaGeo.dispose();
      nebulaMat.dispose();
      starTrailGeo.dispose();
      starTrailMat.dispose();
      solarGeo.dispose();
      solarMat.dispose();
      coronaGeo.dispose();
      coronaMat.dispose();
      photonHaloGeo.dispose();
      photonHaloMat.dispose();
      accretionGeo.dispose();
      accretionMat.dispose();
      opaRingGeo.dispose();
      opaRingMat.dispose();
      tickGeo.dispose();
      hubShellGeo.dispose();
      hubCoreGeo.dispose();
      hubGimbalGeo.dispose();
      hubSpireGeo.dispose();
      hubRippleGeo.dispose();
      satGeo.dispose();
      proxyGeo.dispose();
      proxyMat.dispose();
      trailGeo.dispose();
      packetGeo.dispose();
      packetMat.dispose();

      hubMetas.forEach((m) => {
        m.orbitRingLine.geometry.dispose();
        m.orbitRingMat.dispose();
        m.trailMat.dispose();
        m.coreMat.dispose();
        m.shellMat.dispose();
        m.gimbalMat.dispose();
        m.spireMat.dispose();
        m.filamentGeo.dispose();
        m.filamentMat.dispose();
        m.rippleMat.dispose();
        m.satellites.forEach((s) => s.mat.dispose());
      });
      disposableTextures.forEach((t) => t.dispose());
      envTarget.dispose();
      composer?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const isLightMode = finish === 'stone';
  const activePresetMeta =
    GALAXY_TYPE_PRESETS.find((p) => p.id === galaxyPreset) ?? GALAXY_TYPE_PRESETS[0];

  // Phase A of GSAP morph: sweep Spiral Galaxy into top-down vantage before handing off to Solar System ecliptic
  const handleRequestAlternativeSystem = () => {
    if (!onToggleAlternativeSystem || isSwitchingOutRef.current) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    const stageEl = stageRef.current;

    if (prefersReducedMotion || !cam || !ctrl) {
      onToggleAlternativeSystem();
      return;
    }

    isSwitchingOutRef.current = true;
    gsapActiveRef.current = true;
    activeGsapTlRef.current?.kill();

    const proxy = {
      x: cam.position.x,
      y: cam.position.y,
      z: cam.position.z,
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
        x: 0,
        y: 16.2,
        z: 3.0,
        tx: 0,
        ty: 0,
        tz: 0,
        fov: 52,
        duration: 0.56,
        ease: 'power2.inOut',
        onUpdate: () => {
          cam.position.set(proxy.x, proxy.y, proxy.z);
          ctrl.target.set(proxy.tx, proxy.ty, proxy.tz);
          cam.fov = proxy.fov;
          cam.updateProjectionMatrix();
          ctrl.update();
        },
      },
      0,
    );
    if (stageEl) {
      tl.to(stageEl, { opacity: 0, duration: 0.24, ease: 'power2.in' }, 0.34);
    }
    activeGsapTlRef.current = tl;
  };

  return (
    <div
      ref={stageRef}
      className={`relative w-full h-full min-h-[380px] rounded-[10px] overflow-hidden select-none ${
        isLightMode ? 'bg-[#EDEAE2]' : 'bg-[#040712]'
      }`}
    >
      {/* Pure WebGL Spiral Galaxy Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Projected Orbital Star Motion Streaks (.brain-core-dot-pulse animation logic) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {projectedStarStreaks.map((st) => (
          <div
            key={st.id}
            style={{
              left: `${st.x}px`,
              top: `${st.y}px`,
              transform: `translate(-100%, -50%) rotate(${st.angleDeg}deg)`,
              ...getEmissiveCssVars(st.accent, isLightMode),
            }}
            className="absolute flex items-center"
          >
            <div
              style={{
                width: `${st.lengthPx}px`,
                animationDelay: `${st.delaySec}s`,
              }}
              className="h-[1.5px] rounded-full brain-core-trail-streak"
            />
            <div
              style={{
                backgroundColor: st.accent,
                animationDelay: `${st.delaySec}s`,
              }}
              className="w-[4px] h-[4px] rounded-full shrink-0 -ml-[2px] brain-core-dot-pulse"
            />
          </div>
        ))}
      </div>

      {/* Projected Emissive Pulse Beacons (synced with active/selected hubs) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {projectedNodes.map((node) => (
          <div
            key={node.hubId}
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              ...getEmissiveCssVars(node.accent, isLightMode),
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            <div
              className={`rounded-full transition-transform duration-300 ${
                node.isSelected
                  ? 'w-11 h-11 brain-node-emissive-pulse--selected'
                  : 'w-8 h-8 brain-node-emissive-pulse'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Top-Left Informational Galaxy Legend Box (Active Galaxy Type & Gravitational Characteristics) */}
      <GalaxyLegendBox
        activePreset={activePresetMeta}
        isLightMode={isLightMode}
        simEpoch={simEpoch}
        spinSpeed={spinSpeed}
        orbitalDecay={orbitalDecay}
        starDensity={starDensity}
        hitlConfidence={hitlConfidence}
        compact={compact}
      />

      {/* Projected Hub Callout Card (Solid RGBA surface, zero backdrop-filter) */}
      {callout && callout.visible && activeHubMeta && (
        <div
          style={{ left: `${callout.x}px`, top: `${callout.y}px` }}
          className={`pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full w-[228px] rounded-xl border px-3 py-2.5 shadow-xl ${
            isLightMode
              ? 'bg-[#FFFFFF]/96 border-[#D4CEC2] text-[#16213A]'
              : 'bg-[#0C1329]/94 border-[#2C3E6B] text-[#E7EBF5]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
            <span style={{ color: activeHubMeta.accent }} className="font-bold">
              HUB {activeHubMeta.num} · {activeHubMeta.side === 'left' ? 'OPS' : 'EXP / IR4'}
            </span>
            <span className={isLightMode ? 'text-[#5F6576]' : 'text-[#8E9DC2]'}>
              {activeHubMeta.keyLayers.join('/')}
            </span>
          </div>
          <div className="text-xs font-bold mt-0.5 leading-snug">
            {activeHubMeta.label}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {activeHubApps.map((app) => {
              const active = selectedIds.includes(app.id);
              return (
                <span
                  key={app.id}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    active
                      ? 'bg-[#1C6E46]/18 border-[#1C6E46]/50 text-[#1C6E46] dark:bg-[#6FCB9F]/18 dark:border-[#6FCB9F]/45 dark:text-[#6FCB9F] font-semibold'
                      : isLightMode
                        ? 'bg-[#F2EFE9] border-[#E4DFD6] text-[#4A5163]'
                        : 'bg-[#141D38] border-[#253359] text-[#A8B4D4]'
                  }`}
                >
                  {appMap[app.id]?.shortName ?? app.shortName}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* WebGL Context Lost Notice */}
      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0B1020]/92 text-[#E7EBF5] p-6 text-center">
          <div className="max-w-sm space-y-2">
            <div className="font-mono text-xs uppercase tracking-wider text-amber-400">
              WebGL Context Interrupted
            </div>
            <p className="text-xs text-[#C3CCE4]">
              Restoring GPU telemetry for the Spenta 3D Neural Core galaxy. All 8 sovereign hubs remain selectable in the inspector.
            </p>
          </div>
        </div>
      )}

      {/* Unified 3D Neural Core Bottom Control Panel */}
      <GalaxyControlPanel
        systemMode="spiral-galaxy"
        onToggleAlternativeSystem={
          onToggleAlternativeSystem ? handleRequestAlternativeSystem : undefined
        }
        isLightMode={isLightMode}
        dockOpen={dockOpen}
        onToggleDock={() => setDockOpen((v) => !v)}
        galaxyPreset={galaxyPreset}
        onSelectGalaxyPreset={(preset) => {
          setMorphProgress(0.05);
          applyGalaxyTypePreset(preset);
        }}
        morphProgress={morphProgress}
        simEpoch={simEpoch}
        onScrubEpoch={handleScrubEpoch}
        onScrubStart={() => {
          isScrubbingRef.current = true;
        }}
        onScrubEnd={() => {
          isScrubbingRef.current = false;
        }}
        isPaused={isPaused}
        playbackRate={playbackRate}
        onTogglePause={handleTogglePause}
        onRewind={handleRewind}
        onFastForward={handleFastForward}
        onStepEpoch={handleStepEpoch}
        onJumpToPresent={handleJumpToPresent}
        cameraPreset={cameraPreset}
        onSelectCameraPreset={applyCameraPreset}
        finish={finish}
        onSelectFinish={setFinish}
        spinSpeed={spinSpeed}
        onSpinSpeedChange={(val) => {
          setSpinSpeed(val);
          if (isPaused) setIsPaused(false);
        }}
        starDensity={starDensity}
        onStarDensityChange={setStarDensity}
        orbitalDecay={orbitalDecay}
        onOrbitalDecayChange={setOrbitalDecay}
        orbitalSpread={orbitalSpread}
        onOrbitalSpreadChange={setOrbitalSpread}
        totalStarCapacity={28000}
        activeHubCount={BRAIN_HUBS.length}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((v) => !v)}
        onReset={() => {
          const baseline = GALAXY_TYPE_PRESETS[0];
          if (galaxyPreset !== baseline.id) {
            setMorphProgress(0.05);
          }
          applyGalaxyTypePreset(baseline);
          handleScrubEpoch(0);
          setPlaybackRate(1);
          setIsPaused(false);
          setAutoRotate(false);
          setCameraPreset('overview');
        }}
      />
    </div>
  );
}
