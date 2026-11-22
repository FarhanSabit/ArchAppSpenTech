import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BRAIN_HUBS, SPENTA_APPS } from '../../data/spentaManifest';
import { useStack } from '../../store/StackContext';
import {
  CameraPreset,
  GalaxyControlPanel,
  GalaxyPhysicsPreset,
  ObservatoryFinish,
} from './GalaxyControlPanel';

interface SovereignBrain3DCanvasProps {
  compact?: boolean;
  polarity?: 'light' | 'dark';
  onSelectHub?: (hubId: string) => void;
  selectedHubId?: string | null;
  hubFocusNonce?: number;
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

// Pre-allocated scratch math objects (zero GC inside animation loop)
const _worldPos = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _midCtrl = new THREE.Vector3();
const _packetPos = new THREE.Vector3();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();
const _tmpColor = new THREE.Color();

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
  uniform float uTime;
  uniform float uSpinPhase;
  uniform float uDecayPhase;
  uniform float uDecayRate;
  uniform float uDensity;
  uniform float uPixelRatio;
  uniform float uSpread;

  attribute float aScale;
  attribute float aRadius;
  attribute float aPhase;
  attribute float aTwinkle;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vTwinkle;
  varying float vScale;

  void main() {
    float spreadMult = 0.72 + uSpread * 0.45;
    float diskMask = step(aRadius, 16.5);

    // Continuous gravitational inspiral when orbital decay rate > 0
    float inspiralCycle = fract(uDecayPhase * 0.16 + aPhase * 0.15915494);
    float decayPull = mix(1.0, 1.0 - inspiralCycle * 0.58, clamp(uDecayRate, 0.0, 1.0) * diskMask);
    float r = max(aRadius * spreadMult * decayPull, 0.42);

    // Differential Keplerian rotation + relativistic inspiral spin-up
    float angVel = 0.24 / (pow(max(r, 0.35), 0.58) + 0.32);
    float inspiralTwist = (1.0 - decayPull) * 3.1 * diskMask;
    float angle = uSpinPhase * angVel + inspiralTwist;
    float c = cos(angle);
    float s = sin(angle);

    vec3 pos = position;
    pos.xz *= spreadMult * decayPull;
    vec2 rotatedXZ = vec2(pos.x * c - pos.z * s, pos.x * s + pos.z * c);
    pos.x = rotatedXZ.x;
    pos.z = rotatedXZ.y;
    // Gentle galactic disk harmonic ripple
    pos.y = pos.y * mix(1.0, 0.65, (1.0 - decayPull) * diskMask) + sin(r * 1.15 - uTime * 0.6 + aPhase) * 0.045;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float twinkle = 0.78 + 0.22 * sin(uTime * aTwinkle + aPhase);
    vTwinkle = twinkle;
    // Subtle thermal brightening as decaying matter approaches accretion horizon
    float coreHeat = smoothstep(0.62, 0.38, decayPull) * uDecayRate * diskMask;
    vColor = mix(aColor, vec3(1.0, 0.92, 0.74), coreHeat * 0.55);
    vScale = aScale;

    float densityComp = mix(1.16, 1.0, clamp(uDensity, 0.2, 1.0));
    float size = aScale * densityComp * uPixelRatio * (118.0 / max(-mvPosition.z, 1.2));
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

const NEBULA_VERTEX_SHADER = /* glsl */ `
  uniform float uSpinPhase;
  uniform float uDecayPhase;
  uniform float uDecayRate;
  uniform float uPixelRatio;
  uniform float uSpread;

  attribute float aScale;
  attribute float aRadius;
  attribute float aPhase;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vPhase;

  void main() {
    float spreadMult = 0.72 + uSpread * 0.45;
    float inspiralCycle = fract(uDecayPhase * 0.12 + aPhase * 0.15915494);
    float decayPull = mix(1.0, 1.0 - inspiralCycle * 0.5, clamp(uDecayRate, 0.0, 1.0));
    float r = max(aRadius * spreadMult * decayPull, 0.65);
    float angVel = 0.16 / (pow(max(r, 0.5), 0.6) + 0.45);
    float angle = uSpinPhase * angVel + (1.0 - decayPull) * 2.4;
    float c = cos(angle);
    float s = sin(angle);

    vec3 pos = position;
    pos.xz *= spreadMult * decayPull;
    pos.xz = vec2(pos.x * c - pos.z * s, pos.x * s + pos.z * c);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vColor = aColor;
    vPhase = aPhase;
    gl_PointSize = clamp(aScale * uPixelRatio * (210.0 / max(-mvPosition.z, 2.0)), 8.0, 130.0);
  }
`;

const NEBULA_FRAGMENT_SHADER = /* glsl */ `
  uniform float uIsLight;
  varying vec3 vColor;
  varying float vPhase;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;

    float ang = atan(uv.y, uv.x);
    float wisp = 0.85 + 0.15 * sin(ang * 3.0 + vPhase);
    float radial = smoothstep(0.5, 0.0, dist);
    float cloud = pow(radial, 2.3) * wisp;

    float opacity = uIsLight > 0.5 ? 0.085 : 0.14;
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
}: SovereignBrain3DCanvasProps) {
  const { selectedIds, hitlConfidence, appMap } = useStack();
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [hoveredHubId, setHoveredHubId] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [finish, setFinish] = useState<ObservatoryFinish>(
    polarity === 'light' ? 'stone' : 'cosmos',
  );
  const [spinSpeed, setSpinSpeed] = useState<number>(0.85);
  const [starDensity, setStarDensity] = useState<number>(1.0);
  const [orbitalDecay, setOrbitalDecay] = useState<number>(0.0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [orbitalSpread, setOrbitalSpread] = useState<number>(0.65);
  const [dockOpen, setDockOpen] = useState<boolean>(false);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [callout, setCallout] = useState<ProjectedCallout | null>(null);
  const [projectedNodes, setProjectedNodes] = useState<ProjectedNodeAnchor[]>([]);

  const selectedIdsRef = useRef<string[]>(selectedIds);
  const hitlRef = useRef<number>(hitlConfidence);
  const finishRef = useRef<ObservatoryFinish>(finish);
  const spinSpeedRef = useRef<number>(spinSpeed);
  const starDensityRef = useRef<number>(starDensity);
  const orbitalDecayRef = useRef<number>(orbitalDecay);
  const isPausedRef = useRef<boolean>(isPaused);
  const spreadRef = useRef<number>(orbitalSpread);
  const hoveredHubRef = useRef<string | null>(null);
  const selectedHubRef = useRef<string | null>(selectedHubId);
  const onSelectHubRef = useRef(onSelectHub);
  const focusTriggerRef = useRef<{ hubId: string | null; nonce: number }>({
    hubId: selectedHubId,
    nonce: hubFocusNonce,
  });
  const presetCommandRef = useRef<{ preset: CameraPreset; nonce: number }>({
    preset: 'overview',
    nonce: 0,
  });

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    hitlRef.current = hitlConfidence;
  }, [hitlConfidence]);

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

  // Open cinema dock by default on larger non-compact desktop screens
  useEffect(() => {
    if (!compact && typeof window !== 'undefined' && window.innerWidth >= 768) {
      setDockOpen(true);
    }
  }, [compact]);

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
    presetCommandRef.current = { preset, nonce: presetCommandRef.current.nonce + 1 };
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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 4.8;
    controls.maxDistance = 28.0;
    controls.maxPolarAngle = Math.PI * 0.82;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.target.set(...CAMERA_PRESETS.overview.target);

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
    // 1. 28,000-STAR MULTI-ARM LOGARITHMIC SPIRAL GALAXY (UNIFIED GPU & SW WEBGL)
    // =========================================================================
    const starCount = 28000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starScales = new Float32Array(starCount);
    const starRadii = new Float32Array(starCount);
    const starPhases = new Float32Array(starCount);
    const starTwinkles = new Float32Array(starCount);

    const rand = mulberry32(79372026);
    const branches = 5;
    const maxGalaxyRadius = 15.8;

    const paletteInit = CORE_HEX_BY_FINISH[finishRef.current];
    const colHot = new THREE.Color(paletteInit.coreInner);
    const colGold = new THREE.Color(paletteInit.coreOuter);
    const colArm1 = new THREE.Color(paletteInit.armPrimary);
    const colArm2 = new THREE.Color(paletteInit.armSecondary);
    const colAccent = new THREE.Color(paletteInit.armAccent);
    const colHii = new THREE.Color(paletteInit.hiiKnot);

    // Structural roles for re-tinting on Observatory Finish switches
    // 0=bulge, 1=armPrimary, 2=armSecondary, 3=emeraldCluster, 4=halo, 5=hiiKnot
    const starRole = new Uint8Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const pick = rand();

      let x = 0;
      let y = 0;
      let z = 0;
      let radius = 0;

      if (pick < 0.22) {
        // Dense central galactic bulge
        const u = Math.pow(rand(), 1.9);
        radius = 0.5 + u * 3.2;
        const theta = rand() * Math.PI * 2;
        const phi = Math.acos(2 * rand() - 1);
        x = radius * Math.sin(phi) * Math.cos(theta);
        y = radius * Math.cos(phi) * 0.42;
        z = radius * Math.sin(phi) * Math.sin(theta);
        starRole[i] = 0;
        starScales[i] = 0.9 + rand() * 2.2;
      } else if (pick < 0.88) {
        // 5 Logarithmic spiral arms + warm H-II star-forming knots
        const branchIdx = i % branches;
        const t = Math.pow(rand(), 1.35);
        radius = 1.65 + t * (maxGalaxyRadius - 1.65);
        const branchAngle = (branchIdx / branches) * Math.PI * 2;
        const spinAngle = Math.log(radius + 0.55) * 2.25;

        const scatterScale = (0.28 + Math.pow(t, 1.15) * 1.45) * (rand() < 0.5 ? 1 : -1);
        const radialScatter = Math.pow(rand(), 2.2) * scatterScale;
        const verticalSpread =
          Math.pow(rand(), 2.4) * (0.72 * Math.exp(-t * 1.45) + 0.14) * (rand() < 0.5 ? 1 : -1);

        const finalAngle = branchAngle + spinAngle + radialScatter * 0.36;
        x = Math.cos(finalAngle) * radius + radialScatter * 0.35;
        y = verticalSpread;
        z = Math.sin(finalAngle) * radius + (rand() - 0.5) * 0.45 * t;

        const subPick = rand();
        if (subPick < 0.08) {
          starRole[i] = 5; // Warm H-II star-forming emission knot
          starScales[i] = 1.6 + rand() * 2.2;
        } else if (subPick < 0.24) {
          starRole[i] = 3; // Sovereign Emerald star cluster
          starScales[i] = 1.35 + rand() * 2.35;
        } else {
          starRole[i] = branchIdx % 2 === 0 ? 1 : 2;
          starScales[i] = 0.72 + Math.pow(rand(), 2.0) * 2.85;
        }
      } else {
        // Deep-space cosmic background starfield dome
        radius = 17.5 + rand() * 22.0;
        const theta = rand() * Math.PI * 2;
        const phi = Math.acos(2 * rand() - 1);
        x = radius * Math.sin(phi) * Math.cos(theta);
        y = radius * Math.cos(phi) * 0.72;
        z = radius * Math.sin(phi) * Math.sin(theta);
        starRole[i] = 4;
        starScales[i] = 0.75 + rand() * 1.65;
      }

      starPositions[i3] = x;
      starPositions[i3 + 1] = y;
      starPositions[i3 + 2] = z;
      starRadii[i] = Math.hypot(x, z);
      starPhases[i] = rand() * Math.PI * 2;
      starTwinkles[i] = 0.8 + rand() * 2.6;
    }

    const applyStarPalette = (targetFinish: ObservatoryFinish) => {
      const p = CORE_HEX_BY_FINISH[targetFinish];
      colHot.set(p.coreInner);
      colGold.set(p.coreOuter);
      colArm1.set(p.armPrimary);
      colArm2.set(p.armSecondary);
      colAccent.set(p.armAccent);
      colHii.set(p.hiiKnot);

      for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        const role = starRole[i];
        const rNorm = Math.min(starRadii[i] / maxGalaxyRadius, 1);

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
      }
      if (galaxyGeo.attributes.aColor) {
        (galaxyGeo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
      }
    };

    const galaxyGeo = new THREE.BufferGeometry();
    galaxyGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    galaxyGeo.setAttribute('aColor', new THREE.BufferAttribute(starColors, 3));
    galaxyGeo.setAttribute('aScale', new THREE.BufferAttribute(starScales, 1));
    galaxyGeo.setAttribute('aRadius', new THREE.BufferAttribute(starRadii, 1));
    galaxyGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));
    galaxyGeo.setAttribute('aTwinkle', new THREE.BufferAttribute(starTwinkles, 1));
    applyStarPalette(finishRef.current);

    const galaxyUniforms = {
      uTime: { value: 0 },
      uSpinPhase: { value: 0 },
      uDecayPhase: { value: 0 },
      uDecayRate: { value: orbitalDecayRef.current },
      uDensity: { value: starDensityRef.current },
      uPixelRatio: { value: dpr },
      uSpread: { value: spreadRef.current },
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
    // 2. VOLUMETRIC NEBULA & GALACTIC DUST CLOUDS (UNIFIED COUNT)
    // =========================================================================
    const nebulaCount = 1100;
    const nebPos = new Float32Array(nebulaCount * 3);
    const nebCol = new Float32Array(nebulaCount * 3);
    const nebScales = new Float32Array(nebulaCount);
    const nebRadii = new Float32Array(nebulaCount);
    const nebPhases = new Float32Array(nebulaCount);
    const nebRole = new Uint8Array(nebulaCount);

    for (let i = 0; i < nebulaCount; i++) {
      const i3 = i * 3;
      const branchIdx = i % branches;
      const t = Math.pow(rand(), 1.2);
      const radius = 2.0 + t * 11.8;
      const angle =
        (branchIdx / branches) * Math.PI * 2 +
        Math.log(radius + 0.55) * 2.25 +
        (rand() - 0.5) * 0.6;
      const x = Math.cos(angle) * radius;
      const y = (rand() - 0.5) * 0.55;
      const z = Math.sin(angle) * radius;

      nebPos[i3] = x;
      nebPos[i3 + 1] = y;
      nebPos[i3 + 2] = z;
      nebRadii[i] = radius;
      nebScales[i] = 2.8 + rand() * 5.2;
      nebPhases[i] = rand() * Math.PI * 2;
      nebRole[i] = branchIdx % 3;
    }

    const applyNebulaPalette = (targetFinish: ObservatoryFinish) => {
      const p = CORE_HEX_BY_FINISH[targetFinish];
      const c0 = new THREE.Color(p.coreOuter);
      const c1 = new THREE.Color(p.armPrimary);
      const c2 = new THREE.Color(p.armAccent);
      for (let i = 0; i < nebulaCount; i++) {
        const i3 = i * 3;
        const r = nebRole[i];
        _tmpColor.copy(r === 0 ? c0 : r === 1 ? c1 : c2);
        nebCol[i3] = _tmpColor.r;
        nebCol[i3 + 1] = _tmpColor.g;
        nebCol[i3 + 2] = _tmpColor.b;
      }
      if (nebulaGeo.attributes.aColor) {
        (nebulaGeo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
      }
    };

    const nebulaGeo = new THREE.BufferGeometry();
    nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
    nebulaGeo.setAttribute('aColor', new THREE.BufferAttribute(nebCol, 3));
    nebulaGeo.setAttribute('aScale', new THREE.BufferAttribute(nebScales, 1));
    nebulaGeo.setAttribute('aRadius', new THREE.BufferAttribute(nebRadii, 1));
    nebulaGeo.setAttribute('aPhase', new THREE.BufferAttribute(nebPhases, 1));
    applyNebulaPalette(finishRef.current);

    const nebulaUniforms = {
      uSpinPhase: { value: 0 },
      uDecayPhase: { value: 0 },
      uDecayRate: { value: orbitalDecayRef.current },
      uPixelRatio: { value: dpr },
      uSpread: { value: spreadRef.current },
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
    let elapsed = 0;
    let spinPhase = 0;
    let decayPhase = 0;
    let lastTime = performance.now();
    let lastAppliedFinish: ObservatoryFinish = finishRef.current;
    let lastAppliedDensity = -1;
    let lastHudSyncMs = 0;

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

      const effectiveSpeed = reducedMotion || isPausedRef.current ? 0 : spinSpeedRef.current;
      const effectiveDecay = reducedMotion || isPausedRef.current ? 0 : orbitalDecayRef.current;
      elapsed += rawDt * (effectiveSpeed === 0 ? 0.12 : 1.0);
      spinPhase += rawDt * effectiveSpeed;
      decayPhase += rawDt * effectiveDecay;

      // Handle Finish palette switches cleanly
      const curFinish = finishRef.current;
      const isStone = curFinish === 'stone';
      if (curFinish !== lastAppliedFinish) {
        lastAppliedFinish = curFinish;
        applyStarPalette(curFinish);
        applyNebulaPalette(curFinish);

        const nextBlend = isStone ? THREE.NormalBlending : THREE.AdditiveBlending;
        galaxyMat.blending = nextBlend;
        galaxyMat.needsUpdate = true;
        nebulaMat.blending = nextBlend;
        nebulaMat.needsUpdate = true;
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

      // Dynamic Star & Nebula Density via GPU drawRange (zero buffer re-uploads)
      const targetDensity = starDensityRef.current;
      if (Math.abs(targetDensity - lastAppliedDensity) > 0.001) {
        lastAppliedDensity = targetDensity;
        galaxyGeo.setDrawRange(0, Math.max(1000, Math.round(starCount * targetDensity)));
        nebulaGeo.setDrawRange(0, Math.max(120, Math.round(nebulaCount * targetDensity)));
      }

      // Smoothly lerp scene background, exponential fog & lighting
      (scene.background as THREE.Color).lerp(BG_COLORS[curFinish], Math.min(1, rawDt * 6));
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(scene.background as THREE.Color);
      }
      hemiLight.intensity = isStone ? 1.35 : 0.9;
      solarPointLight.intensity = isStone ? 2.6 : 4.2;

      // Update GLSL Galaxy & Nebula Uniforms (smooth integrated spin & orbital decay)
      galaxyUniforms.uTime.value = elapsed;
      galaxyUniforms.uSpinPhase.value = spinPhase;
      galaxyUniforms.uDecayPhase.value = decayPhase;
      galaxyUniforms.uDecayRate.value = THREE.MathUtils.damp(
        galaxyUniforms.uDecayRate.value,
        orbitalDecayRef.current,
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
      galaxyUniforms.uIsLight.value = isStone ? 1.0 : 0.0;

      nebulaUniforms.uSpinPhase.value = spinPhase;
      nebulaUniforms.uDecayPhase.value = decayPhase;
      nebulaUniforms.uDecayRate.value = galaxyUniforms.uDecayRate.value;
      nebulaUniforms.uSpread.value = galaxyUniforms.uSpread.value;
      nebulaUniforms.uIsLight.value = isStone ? 1.0 : 0.0;

      // Update Solar Core, Corona, Relativistic Photon Halo & Accretion Disk
      const opaPass = hitlRef.current >= 0.88;
      solarUniforms.uTime.value = elapsed;
      solarUniforms.uPulse.value = 0.5 + 0.5 * Math.sin(elapsed * 2.2);
      solarUniforms.uColorHot.value.set(
        isStone ? '#FEF3C7' : curFinish === 'nocturnal' ? '#E8F6FF' : '#FFFBEB',
      );
      solarUniforms.uColorMid.value.set(
        opaPass
          ? curFinish === 'nocturnal'
            ? '#38BDF8'
            : '#F59E0B'
          : '#D97706',
      );
      solarUniforms.uColorEdge.value.set(opaPass ? '#34D399' : '#F59E0B');

      coronaUniforms.uColor.value.set(opaPass ? '#6FCB9F' : '#F59E0B');
      coronaUniforms.uIntensity.value = isStone ? 0.25 : 0.68;

      photonHaloUniforms.uTime.value = elapsed;
      photonHaloUniforms.uColorInner.value.set(
        isStone ? '#B45309' : curFinish === 'nocturnal' ? '#E0F2FE' : '#FFF7D6',
      );
      photonHaloUniforms.uColorOuter.value.set(opaPass ? '#34D399' : '#F59E0B');
      photonHaloUniforms.uIntensity.value = isStone ? 0.24 : 0.72;
      photonHaloMesh.quaternion.copy(camera.quaternion);

      accretionUniforms.uTime.value = elapsed;
      accretionUniforms.uInnerCol.value.set(isStone ? '#B45309' : '#FDE68A');
      accretionUniforms.uOuterCol.value.set(
        opaPass ? (isStone ? '#1C6E46' : '#38BDF8') : '#F59E0B',
      );
      accretionUniforms.uOpacity.value = isStone ? 0.42 : 0.72;

      solarMesh.rotation.y += rawDt * 0.14 * (effectiveSpeed + 0.2);
      opaRingGroup.rotation.y -= rawDt * 0.28 * (effectiveSpeed + 0.25);
      opaRingMat.color.set(opaPass ? (isStone ? '#1C6E46' : '#6FCB9F') : '#D97706');
      opaRingMat.emissive.set(opaPass ? '#1C6E46' : '#B45309');

      // Check Camera Preset triggers
      if (presetCommandRef.current.nonce !== lastHandledPresetNonce) {
        lastHandledPresetNonce = presetCommandRef.current.nonce;
        const p = CAMERA_PRESETS[presetCommandRef.current.preset];
        _camGoalPos.set(...p.pos);
        _camGoalTarget.set(...p.target);
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

      // Update 8 Orbiting Hub Assemblies, Satellites, Filaments & Photons
      const spreadScale = 0.72 + galaxyUniforms.uSpread.value * 0.45;
      const selIds = selectedIdsRef.current;
      const curHovered = hoveredHubRef.current;
      const curSelectedHub = selectedHubRef.current;

      let packetIdx = 0;

      for (let h = 0; h < hubMetas.length; h++) {
        const meta = hubMetas[h];
        const hubAppsActiveCount = meta.satellites.filter((s) =>
          selIds.includes(s.appId),
        ).length;
        const isActiveHub = hubAppsActiveCount > 0;
        const isSelected = curSelectedHub === meta.hubId;
        const isHovered = curHovered === meta.hubId;

        // Advance Keplerian orbital position with gravitational orbital decay & conservation of angular momentum
        const targetDecayScale =
          orbitalDecayRef.current > 0.001
            ? 1.0 -
              orbitalDecayRef.current * 0.34 -
              0.045 *
                orbitalDecayRef.current *
                (0.5 + 0.5 * Math.sin(decayPhase * 0.85 + h * 0.7))
            : 1.0;
        meta.decayFactor = THREE.MathUtils.damp(
          meta.decayFactor,
          targetDecayScale,
          orbitalDecayRef.current > 0.001 ? 1.6 + orbitalDecayRef.current * 1.4 : 2.8,
          rawDt,
        );
        const keplerBoost = 1 / Math.pow(Math.max(meta.decayFactor, 0.55), 1.45);
        meta.currentAngle += rawDt * meta.orbitSpeed * effectiveSpeed * keplerBoost;

        const curOrbitR = Math.max(2.05, meta.baseRadius * spreadScale * meta.decayFactor);
        meta.orbitRingLine.scale.setScalar(curOrbitR / meta.baseRadius);
        meta.trailMat.uniforms.uHeadAngle.value = meta.currentAngle;
        meta.trailMat.uniforms.uRadius.value = curOrbitR;
        meta.trailMat.uniforms.uArcSpan.value = 1.18 + (1.0 - meta.decayFactor) * 2.9;
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
          Math.sin(elapsed * 1.1 + h) * 0.08,
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
        const pulseWave = 0.5 + 0.5 * Math.sin(elapsed * 3.1 + h * 0.8);
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

        // Orbiting Module Satellites (13 Spenta Apps)
        for (let s = 0; s < meta.satellites.length; s++) {
          const sat = meta.satellites[s];
          const satActive = selIds.includes(sat.appId);
          const satAng = sat.phase + elapsed * sat.orbitSpeed * (satActive ? 1.1 : 0.5);
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

        // Telemetry Photons streaming along active/selected filaments
        for (let p = 0; p < packetsPerHub; p++) {
          if (isActiveHub || isSelected) {
            const tFlow = (elapsed * 0.34 + p / packetsPerHub + h * 0.17) % 1;
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

      // Smooth Camera Fly-To / Hub Tracking
      if (cameraFlyActive) {
        if (trackedHubId) {
          const tMeta = hubMetas.find((h) => h.hubId === trackedHubId);
          if (tMeta) {
            tMeta.hubGroup.getWorldPosition(_worldPos);
            _camGoalTarget.copy(_worldPos).multiplyScalar(0.65);
            const radialDir = _worldPos.clone().normalize();
            _camGoalPos
              .copy(_worldPos)
              .addScaledVector(radialDir, 4.4)
              .add(new THREE.Vector3(0, 2.35, 0));
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

      controls.update();

      // Render (GPU Bloom Pipeline or Software WebGL Direct Render)
      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      // Throttled 2D Screen-Space Projection for Callout & Emissive Pulse Beacons (16 Hz)
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

        setProjectedNodes(anchors);
        setCallout(nextCallout);
      }

      afterDraw(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
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
  const opaPass = hitlConfidence >= 0.88;

  return (
    <div
      className={`relative w-full h-full min-h-[380px] rounded-[12px] overflow-hidden select-none border ${
        isLightMode
          ? 'bg-[#EDEAE2] border-[#D8D2C6]'
          : 'bg-[#040712] border-[#1F2A48]'
      }`}
    >
      {/* Pure WebGL Spiral Galaxy Mount */}
      <div ref={mountRef} className="w-full h-full" />

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

      {/* Top-Left Minimal Observatory Title + OPA Status Readout (No backdrop-blur over WebGL) */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-1 max-w-[65%]">
        <div
          className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border font-mono text-[10px] tracking-[0.14em] uppercase ${
            isLightMode
              ? 'bg-[#FAF8F4]/92 border-[#D4CEC2] text-[#16213A]'
              : 'bg-[#0A1024]/88 border-[#25345C] text-[#D9E3FA]'
          }`}
        >
          <span className="font-bold">SPENTA SPIRAL GALAXY</span>
          <span className="opacity-40">·</span>
          <span className={opaPass ? 'text-[#1C6E46] dark:text-[#6FCB9F]' : 'text-amber-500'}>
            OPA {hitlConfidence.toFixed(2)} {opaPass ? 'PASS' : 'HITL'}
          </span>
        </div>
        {!compact && (
          <div
            className={`text-[10px] font-mono px-1 ${
              isLightMode ? 'text-[#4A5163]' : 'text-[#8E9DC2]'
            }`}
          >
            Drag to orbit · Scroll to zoom · Click hub to inspect · Press H for controls
          </div>
        )}
      </div>

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
              Restoring GPU telemetry for the Spenta Spiral Galaxy. All 8 sovereign hubs remain selectable in the inspector.
            </p>
          </div>
        </div>
      )}

      {/* Dedicated Collapsible Spiral Galaxy Control Panel Component */}
      <GalaxyControlPanel
        isLightMode={isLightMode}
        dockOpen={dockOpen}
        onToggleDock={() => setDockOpen((v) => !v)}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((p) => !p)}
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
        onOrbitalDecayChange={(val) => {
          setOrbitalDecay(val);
          if (isPaused) setIsPaused(false);
        }}
        orbitalSpread={orbitalSpread}
        onOrbitalSpreadChange={setOrbitalSpread}
        totalStarCapacity={28000}
        activeHubCount={BRAIN_HUBS.length}
        onApplyPhysicsPreset={(preset: GalaxyPhysicsPreset) => {
          setSpinSpeed(preset.spinSpeed);
          setStarDensity(preset.starDensity);
          setOrbitalDecay(preset.orbitalDecay);
          setOrbitalSpread(preset.orbitalSpread);
          if (isPaused) setIsPaused(false);
        }}
        onReset={() => {
          setSpinSpeed(0.85);
          setStarDensity(1.0);
          setOrbitalDecay(0.0);
          setOrbitalSpread(0.65);
          setIsPaused(false);
          applyCameraPreset('overview');
        }}
      />
    </div>
  );
}
