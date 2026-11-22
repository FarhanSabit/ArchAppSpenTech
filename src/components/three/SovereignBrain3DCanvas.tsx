import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { BRAIN_HUBS, SPENTA_APPS } from '../../data/spentaManifest';
import { useStack } from '../../store/StackContext';

interface SovereignBrain3DCanvasProps {
  compact?: boolean;
  polarity?: 'light' | 'dark';
  onSelectHub?: (hubId: string) => void;
  selectedHubId?: string | null;
  hubFocusNonce?: number;
}

type CameraPreset = 'overview' | 'operations' | 'experience' | 'top';
type MaterialFinish = 'heritage-light' | 'heritage-dark' | 'obsidian';

interface HubNodeMeta {
  hubId: string;
  group: THREE.Group;
  glassShellMat: THREE.MeshPhysicalMaterial;
  innerCoreMat: THREE.MeshStandardMaterial;
  collarMat: THREE.MeshPhysicalMaterial;
  capMat: THREE.MeshPhysicalMaterial;
  lineMat: THREE.LineBasicMaterial;
  rippleMesh: THREE.Mesh;
  rippleMat: THREE.MeshBasicMaterial;
  rippleTimer: number;
  basePos: THREE.Vector3;
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
    '--brain-emissive-border': hexToRgba(accent, isLight ? 0.52 : 0.62),
    '--brain-emissive-bright': hexToRgba(accent, isLight ? 0.92 : 0.98),
    '--brain-emissive-dim': hexToRgba(accent, isLight ? 0.16 : 0.24),
    '--brain-emissive-glow': hexToRgba(accent, isLight ? 0.42 : 0.62),
    '--brain-emissive-inner': hexToRgba(accent, isLight ? 0.2 : 0.34),
  } as React.CSSProperties;
}

// Pre-allocated scratch math objects (zero GC inside animation loop)
const _packetPos = new THREE.Vector3();
const _worldPos = new THREE.Vector3();
const _projVec = new THREE.Vector3();

// Semantic OPA gate colors
const _passLightColor = new THREE.Color('#1C6E46');
const _passDarkColor = new THREE.Color('#6FCB9F');
const _passObsidianColor = new THREE.Color('#1EB56A');
const _holdLightColor = new THREE.Color('#B45309');
const _holdDarkColor = new THREE.Color('#E0B063');

// Three-way Studio Finish Palettes (Warm Stone Light, Nocturnal Navy Dark, Obsidian Ti)
const _bgHeritageLight = new THREE.Color('#F2EFE9');
const _bgHeritageDark = new THREE.Color('#0B1020');
const _bgObsidian = new THREE.Color('#07130F');

const _rimHeritageLight = new THREE.Color('#3B66B0');
const _rimHeritageDark = new THREE.Color('#7FA6FF');
const _rimObsidian = new THREE.Color('#14B8A6');

const _hemiSkyLight = new THREE.Color('#FFFFFF');
const _hemiGroundLight = new THREE.Color('#D7D0C4');
const _hemiSkyDark = new THREE.Color('#9BB4F0');
const _hemiGroundDark = new THREE.Color('#090E1C');
const _hemiSkyObsidian = new THREE.Color('#99F6E4');
const _hemiGroundObsidian = new THREE.Color('#051A13');

const _metalHeritageLight = new THREE.Color('#1F3863');
const _metalHeritageDark = new THREE.Color('#B8C9F5');
const _metalObsidian = new THREE.Color('#D1FAE5');

const _glassLeftLight = new THREE.Color('#DCE6F5');
const _glassRightLight = new THREE.Color('#D4ECE4');
const _glassLeftDark = new THREE.Color('#1C3159');
const _glassRightDark = new THREE.Color('#143839');
const _glassLeftObsidian = new THREE.Color('#0D2F22');
const _glassRightObsidian = new THREE.Color('#0B2C2B');

const _pedestalLight = new THREE.Color('#E6E1D8');
const _pedestalDark = new THREE.Color('#141C36');
const _pedestalObsidian = new THREE.Color('#0F231B');

const _packetLight = new THREE.Color('#1F3863');
const _packetDark = new THREE.Color('#8FA6E8');
const _packetObsidian = new THREE.Color('#A7F3D0');

const CAMERA_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  overview: { pos: [0, 2.35, 10.2], target: [0, -0.1, 0] },
  operations: { pos: [-5.6, 1.8, 7.6], target: [-1.1, 0, 0] },
  experience: { pos: [5.6, 1.8, 7.6], target: [1.1, 0, 0] },
  top: { pos: [0, 9.8, 2.8], target: [0, 0, 0] },
};

function createProceduralCircuitTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(31, 56, 99, 0.24)';
  ctx.lineWidth = 2;
  for (let r = 46; r <= 236; r += 38) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(28, 110, 70, 0.22)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(size / 2 + Math.cos(a) * 44, size / 2 + Math.sin(a) * 44);
    ctx.lineTo(size / 2 + Math.cos(a) * 238, size / 2 + Math.sin(a) * 238);
    ctx.stroke();

    ctx.fillStyle = i % 2 === 0 ? 'rgba(31, 56, 99, 0.55)' : 'rgba(28, 110, 70, 0.55)';
    ctx.beginPath();
    ctx.arc(size / 2 + Math.cos(a) * 198, size / 2 + Math.sin(a) * 198, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural anisotropic brushed-titanium bump & roughness grain map (zero external assets).
 */
function createBrushedMetalGrainTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const base = 116 + Math.floor(Math.sin(y * 0.45) * 14);
    for (let s = 0; s < 5; s++) {
      const shade = Math.max(70, Math.min(205, base + ((y * 17 + s * 31) % 42) - 21));
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      const x = (y * 37 + s * 61) % size;
      const w = 36 + ((y + s * 13) % 88);
      ctx.fillRect(x, y, w, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 12, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(11, 16, 32, 0.58)');
  grad.addColorStop(0.5, 'rgba(22, 33, 58, 0.24)');
  grad.addColorStop(1, 'rgba(22, 33, 58, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export default function SovereignBrain3DCanvas({
  compact = false,
  polarity = 'dark',
  onSelectHub,
  selectedHubId = null,
  hubFocusNonce = 0,
}: SovereignBrain3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { selectedIds, hitlConfidence, toggleApp } = useStack();
  const [hoveredHubId, setHoveredHubId] = useState<string | null>(null);
  const [projectedCallout, setProjectedCallout] = useState<ProjectedCallout | null>(null);
  const [projectedAnchors, setProjectedAnchors] = useState<ProjectedNodeAnchor[]>([]);
  const [contextLost, setContextLost] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 480 : false,
  );
  const [activePreset, setActivePreset] = useState<CameraPreset>('overview');
  const [materialFinish, setMaterialFinish] = useState<MaterialFinish>(
    polarity === 'light' ? 'heritage-light' : 'heritage-dark',
  );

  const selectedIdsRef = useRef<string[]>(selectedIds);
  const hitlRef = useRef<number>(hitlConfidence);
  const selectedHubRef = useRef<string | null>(selectedHubId);
  const onSelectHubRef = useRef(onSelectHub);
  const finishRef = useRef<MaterialFinish>(materialFinish);
  const pendingPulseHubRef = useRef<string | null>(null);
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

  // Sync OITS Heritage Light <-> Nocturnal Dark finish automatically with parent polarity toggle
  useEffect(() => {
    setMaterialFinish((prev) => {
      if (prev === 'obsidian') return prev;
      return polarity === 'light' ? 'heritage-light' : 'heritage-dark';
    });
  }, [polarity]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    hitlRef.current = hitlConfidence;
  }, [hitlConfidence]);

  useEffect(() => {
    selectedHubRef.current = selectedHubId;
    if (selectedHubId) {
      pendingPulseHubRef.current = selectedHubId;
    }
  }, [selectedHubId]);

  useEffect(() => {
    if (!hubFocusNonce || !selectedHubId) return;
    pendingPulseHubRef.current = selectedHubId;
    const isOpsHemisphere = ['healthcare', 'fintech', 'enterprise', 'infra'].includes(
      selectedHubId,
    );
    const preset: CameraPreset = isOpsHemisphere ? 'operations' : 'experience';
    setActivePreset(preset);
    const cfg = CAMERA_PRESETS[preset];
    targetCamPosRef.current = new THREE.Vector3(
      cfg.pos[0],
      cfg.pos[1],
      compact ? cfg.pos[2] * 0.96 : cfg.pos[2],
    );
    targetLookAtRef.current = new THREE.Vector3(cfg.target[0], cfg.target[1], cfg.target[2]);
  }, [hubFocusNonce, selectedHubId, compact]);

  useEffect(() => {
    onSelectHubRef.current = onSelectHub;
  }, [onSelectHub]);

  useEffect(() => {
    finishRef.current = materialFinish;
  }, [materialFinish]);

  // Keyboard shortcut 'H' to collapse/expand bottom control dock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.key.toLowerCase() === 'h') {
        setDockCollapsed((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const applyCameraPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    const cfg = CAMERA_PRESETS[preset];
    targetCamPosRef.current = new THREE.Vector3(
      cfg.pos[0],
      cfg.pos[1],
      compact ? cfg.pos[2] * 0.96 : cfg.pos[2],
    );
    targetLookAtRef.current = new THREE.Vector3(cfg.target[0], cfg.target[1], cfg.target[2]);
  };

  const activeHubIds = useMemo(() => {
    const set = new Set<string>();
    SPENTA_APPS.forEach((app) => {
      if (selectedIds.includes(app.id)) set.add(app.hubId);
    });
    return set;
  }, [selectedIds]);

  const inspectedHub = useMemo(() => {
    const id = hoveredHubId ?? selectedHubId;
    if (!id) return null;
    return BRAIN_HUBS.find((h) => h.id === id) ?? null;
  }, [hoveredHubId, selectedHubId]);

  const inspectedApps = useMemo(() => {
    if (!inspectedHub) return [];
    return SPENTA_APPS.filter((a) => a.hubId === inspectedHub.id);
  }, [inspectedHub]);

  const hoveredCalloutHub = useMemo(() => {
    if (!projectedCallout?.visible) return null;
    const hub = BRAIN_HUBS.find((h) => h.id === projectedCallout.hubId);
    if (!hub) return null;
    const apps = SPENTA_APPS.filter((a) => a.hubId === hub.id);
    const activeCount = apps.filter((a) => selectedIds.includes(a.id)).length;
    return { hub, totalApps: apps.length, activeCount };
  }, [projectedCallout, selectedIds]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const glProbe = probeCanvas.getContext('webgl2');
        if (!glProbe) return true;
        const ext = glProbe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : glProbe.RENDERER;
        const gpu = String(glProbe.getParameter(param));
        glProbe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setContextLost(true);
      return;
    }

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth || 640, container.clientHeight || 460);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    const initialBg =
      finishRef.current === 'heritage-light'
        ? _bgHeritageLight.clone()
        : finishRef.current === 'obsidian'
          ? _bgObsidian.clone()
          : _bgHeritageDark.clone();
    scene.background = initialBg;
    const fog = new THREE.FogExp2(initialBg.getHex(), 0.036);
    scene.fog = fog;

    // Mandatory Studio PBR Environment Reflection for Brushed Metal & Frosted Glass
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      42,
      (container.clientWidth || 640) / (container.clientHeight || 460),
      0.1,
      100,
    );
    const startCfg = CAMERA_PRESETS.overview;
    camera.position.set(
      startCfg.pos[0],
      startCfg.pos[1],
      compact ? startCfg.pos[2] * 0.96 : startCfg.pos[2],
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 6.2;
    controls.maxDistance = 16.0;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.minPolarAngle = Math.PI * 0.16;
    controls.target.set(0, -0.1, 0);

    let isDraggingOrbit = false;
    const onControlStart = () => {
      isDraggingOrbit = true;
      targetCamPosRef.current = null;
      targetLookAtRef.current = null;
    };
    const onControlEnd = () => {
      isDraggingOrbit = false;
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('end', onControlEnd);

    // 3-Point Warm/Cool Studio Rig
    const hemiLight = new THREE.HemisphereLight('#9BB4F0', '#090E1C', 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFF8F0', 1.9);
    keyLight.position.set(6, 9, 7);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -7;
      keyLight.shadow.camera.right = 7;
      keyLight.shadow.camera.top = 7;
      keyLight.shadow.camera.bottom = -7;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#7FA6FF', 1.35);
    rimLight.position.set(-7, 4, -6);
    scene.add(rimLight);

    const coreLight = new THREE.PointLight('#6FCB9F', 2.2, 14);
    coreLight.position.set(0, 0.2, 0);
    scene.add(coreLight);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const circuitTex = createProceduralCircuitTexture(maxAniso);
    const brushedGrainTex = createBrushedMetalGrainTexture(maxAniso);
    const contactShadowTex = createContactShadowTexture();
    textures.push(circuitTex, brushedGrainTex, contactShadowTex);

    // Grounded Brushed-Titanium Circuit Pedestal + Contact Shadow
    const pedestalGeo = new THREE.CylinderGeometry(3.6, 4.1, 0.22, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: '#141C36',
      map: circuitTex,
      roughness: 0.56,
      metalness: 0.35,
    });
    const pedestalBevelGeo = new THREE.TorusGeometry(3.65, 0.06, 14, 64);
    const pedestalBevelMat = new THREE.MeshPhysicalMaterial({
      color: '#B8C9F5',
      emissive: '#1F3863',
      emissiveIntensity: 0.35,
      roughness: 0.22,
      metalness: 0.92,
      anisotropy: 0.8,
      clearcoat: 0.4,
      bumpMap: brushedGrainTex,
      bumpScale: 0.014,
    });
    const shadowPlaneGeo = new THREE.PlaneGeometry(7.2, 7.2);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    geometries.push(pedestalGeo, pedestalBevelGeo, shadowPlaneGeo);
    materials.push(pedestalMat, pedestalBevelMat, shadowPlaneMat);

    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.y = -2.85;
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.position.y = 0.11;
    pedestalMesh.receiveShadow = !isSoftwareGl;
    const pedestalTrim = new THREE.Mesh(pedestalBevelGeo, pedestalBevelMat);
    pedestalTrim.rotation.x = Math.PI / 2;
    pedestalTrim.position.y = 0.22;
    const contactShadow = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.24;
    pedestalGroup.add(pedestalMesh, pedestalTrim, contactShadow);
    scene.add(pedestalGroup);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Composite Multi-Part Sovereign Neural Core
    const brainCoreGroup = new THREE.Group();
    rootGroup.add(brainCoreGroup);

    const hemiOuterGeo = new THREE.IcosahedronGeometry(1.38, 2);
    const hemiInnerGeo = new THREE.IcosahedronGeometry(0.92, 1);
    const collarRibGeo = new THREE.TorusGeometry(1.44, 0.034, 12, 56);
    geometries.push(hemiOuterGeo, hemiInnerGeo, collarRibGeo);

    // Left Hemisphere — Operations Engine
    const leftHemiGroup = new THREE.Group();
    leftHemiGroup.position.x = -0.35;
    leftHemiGroup.scale.set(0.84, 1.06, 0.92);
    const leftGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#1C3159',
      emissive: '#1F3863',
      emissiveIntensity: 0.24,
      roughness: 0.22,
      metalness: 0.06,
      transmission: isSoftwareGl ? 0 : 0.68,
      ior: 1.52,
      thickness: 1.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.14,
      transparent: true,
      opacity: isSoftwareGl ? 0.68 : 0.96,
      depthWrite: !isSoftwareGl,
      flatShading: true,
    });
    const leftInnerCoreMat = new THREE.MeshStandardMaterial({
      color: '#1F3863',
      emissive: '#3B66B0',
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.25,
      flatShading: true,
    });
    const leftRibMat = new THREE.MeshPhysicalMaterial({
      color: '#B8C9F5',
      roughness: 0.2,
      metalness: 0.94,
      anisotropy: 0.8,
      clearcoat: 0.35,
      bumpMap: brushedGrainTex,
      bumpScale: 0.015,
    });
    materials.push(leftGlassMat, leftInnerCoreMat, leftRibMat);

    const leftGlassMesh = new THREE.Mesh(hemiOuterGeo, leftGlassMat);
    leftGlassMesh.renderOrder = 2;
    leftGlassMesh.castShadow = !isSoftwareGl;
    const leftInnerMesh = new THREE.Mesh(hemiInnerGeo, leftInnerCoreMat);
    const leftRib = new THREE.Mesh(collarRibGeo, leftRibMat);
    leftRib.rotation.y = Math.PI / 2;
    leftHemiGroup.add(leftInnerMesh, leftGlassMesh, leftRib);
    brainCoreGroup.add(leftHemiGroup);

    // Right Hemisphere — Experience Engine
    const rightHemiGroup = new THREE.Group();
    rightHemiGroup.position.x = 0.35;
    rightHemiGroup.scale.set(0.84, 1.06, 0.92);
    const rightGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#143839',
      emissive: '#1C6E46',
      emissiveIntensity: 0.24,
      roughness: 0.22,
      metalness: 0.06,
      transmission: isSoftwareGl ? 0 : 0.68,
      ior: 1.52,
      thickness: 1.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.14,
      transparent: true,
      opacity: isSoftwareGl ? 0.68 : 0.96,
      depthWrite: !isSoftwareGl,
      flatShading: true,
    });
    const rightInnerCoreMat = new THREE.MeshStandardMaterial({
      color: '#1C6E46',
      emissive: '#1C6E46',
      emissiveIntensity: 0.82,
      roughness: 0.3,
      metalness: 0.25,
      flatShading: true,
    });
    const rightRibMat = new THREE.MeshPhysicalMaterial({
      color: '#B8C9F5',
      roughness: 0.2,
      metalness: 0.94,
      anisotropy: 0.8,
      clearcoat: 0.35,
      bumpMap: brushedGrainTex,
      bumpScale: 0.015,
    });
    materials.push(rightGlassMat, rightInnerCoreMat, rightRibMat);

    const rightGlassMesh = new THREE.Mesh(hemiOuterGeo, rightGlassMat);
    rightGlassMesh.renderOrder = 2;
    rightGlassMesh.castShadow = !isSoftwareGl;
    const rightInnerMesh = new THREE.Mesh(hemiInnerGeo, rightInnerCoreMat);
    const rightRib = new THREE.Mesh(collarRibGeo, rightRibMat);
    rightRib.rotation.y = Math.PI / 2;
    rightHemiGroup.add(rightInnerMesh, rightGlassMesh, rightRib);
    brainCoreGroup.add(rightHemiGroup);

    // L1–L6 Vertical Sovereign Stack Core Spine
    const spineRingGeo = new THREE.TorusGeometry(0.44, 0.036, 12, 32);
    geometries.push(spineRingGeo);
    const spineMat = new THREE.MeshPhysicalMaterial({
      color: '#B8C9F5',
      emissive: '#1F3863',
      emissiveIntensity: 0.45,
      roughness: 0.18,
      metalness: 0.92,
      anisotropy: 0.85,
      clearcoat: 0.45,
      bumpMap: brushedGrainTex,
      bumpScale: 0.012,
    });
    materials.push(spineMat);
    for (let i = 0; i < 6; i++) {
      const r = new THREE.Mesh(spineRingGeo, spineMat);
      r.rotation.x = Math.PI / 2;
      r.position.y = -0.85 + i * 0.34;
      brainCoreGroup.add(r);
    }

    // Orbiting OPA 0.88 HITL Governance Ring
    const opaRingGroup = new THREE.Group();
    rootGroup.add(opaRingGroup);
    const opaTorusGeo = new THREE.TorusGeometry(2.48, 0.048, 14, 72);
    const opaGateGeo = new THREE.BoxGeometry(0.16, 0.16, 0.26);
    geometries.push(opaTorusGeo, opaGateGeo);

    const opaRingMat = new THREE.MeshPhysicalMaterial({
      color: '#1C6E46',
      emissive: '#1C6E46',
      emissiveIntensity: 0.52,
      roughness: 0.22,
      metalness: 0.88,
      anisotropy: 0.75,
      clearcoat: 0.4,
      bumpMap: brushedGrainTex,
      bumpScale: 0.012,
    });
    materials.push(opaRingMat);
    const opaMainRing = new THREE.Mesh(opaTorusGeo, opaRingMat);
    opaMainRing.rotation.x = Math.PI / 2 - 0.18;
    opaRingGroup.add(opaMainRing);

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const gate = new THREE.Mesh(opaGateGeo, opaRingMat);
      gate.position.set(
        Math.cos(angle) * 2.48,
        Math.sin(angle) * 2.48 * Math.sin(0.18),
        Math.sin(angle) * 2.48 * Math.cos(0.18),
      );
      gate.lookAt(0, 0, 0);
      opaRingGroup.add(gate);
    }

    // 8 Orbiting Composite Domain Hub Assemblies
    const hubGlassGeo = new THREE.OctahedronGeometry(0.36, 0);
    const hubInnerGeo = new THREE.OctahedronGeometry(0.19, 0);
    const hubCollarGeo = new THREE.TorusGeometry(0.49, 0.036, 12, 32);
    const hubCapGeo = new THREE.CylinderGeometry(0.08, 0.15, 0.12, 8);
    const rippleRingGeo = new THREE.RingGeometry(0.45, 0.56, 36);
    geometries.push(hubGlassGeo, hubInnerGeo, hubCollarGeo, hubCapGeo, rippleRingGeo);

    const hubNodes: HubNodeMeta[] = [];
    const hitTargets: THREE.Object3D[] = [];

    BRAIN_HUBS.forEach((hub, index) => {
      const isLeft = hub.side === 'left';
      const sideIdx = index % 4;
      const angleBase = isLeft
        ? Math.PI * (0.72 + sideIdx * 0.19)
        : Math.PI * (-0.28 + sideIdx * 0.19);
      const radius = 4.18;
      const yOffset = (1.5 - sideIdx) * 0.85;
      const basePos = new THREE.Vector3(
        Math.cos(angleBase) * radius,
        yOffset,
        Math.sin(angleBase) * (radius * 0.65),
      );

      const group = new THREE.Group();
      group.position.copy(basePos);
      group.userData.hubId = hub.id;

      const glassShellMat = new THREE.MeshPhysicalMaterial({
        color: hub.accent,
        emissive: hub.accent,
        emissiveIntensity: 0.22,
        roughness: 0.22,
        metalness: 0.05,
        transmission: isSoftwareGl ? 0 : 0.7,
        ior: 1.5,
        thickness: 0.9,
        clearcoat: 1.0,
        clearcoatRoughness: 0.12,
        transparent: true,
        opacity: isSoftwareGl ? 0.65 : 0.94,
        depthWrite: !isSoftwareGl,
      });

      const innerCoreMat = new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        emissive: hub.accent,
        emissiveIntensity: 0.85,
        roughness: 0.25,
        metalness: 0.15,
      });

      const collarMat = new THREE.MeshPhysicalMaterial({
        color: '#B8C9F5',
        emissive: hub.accent,
        emissiveIntensity: 0.22,
        roughness: 0.22,
        metalness: 0.92,
        anisotropy: 0.82,
        clearcoat: 0.35,
        bumpMap: brushedGrainTex,
        bumpScale: 0.015,
      });

      const capMat = new THREE.MeshPhysicalMaterial({
        color: '#1F3863',
        roughness: 0.28,
        metalness: 0.88,
        anisotropy: 0.7,
        bumpMap: brushedGrainTex,
        bumpScale: 0.012,
      });

      const rippleMat = new THREE.MeshBasicMaterial({
        color: hub.accent,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      materials.push(glassShellMat, innerCoreMat, collarMat, capMat, rippleMat);

      const glassMesh = new THREE.Mesh(hubGlassGeo, glassShellMat);
      glassMesh.renderOrder = 3;
      glassMesh.userData.hubId = hub.id;

      const innerMesh = new THREE.Mesh(hubInnerGeo, innerCoreMat);
      innerMesh.userData.hubId = hub.id;

      const collarMesh = new THREE.Mesh(hubCollarGeo, collarMat);
      collarMesh.rotation.x = Math.PI / 3;
      collarMesh.userData.hubId = hub.id;

      const topCap = new THREE.Mesh(hubCapGeo, capMat);
      topCap.position.y = 0.4;
      topCap.userData.hubId = hub.id;

      const botCap = new THREE.Mesh(hubCapGeo, capMat);
      botCap.position.y = -0.4;
      botCap.rotation.x = Math.PI;
      botCap.userData.hubId = hub.id;

      const rippleMesh = new THREE.Mesh(rippleRingGeo, rippleMat);
      rippleMesh.visible = false;

      group.add(innerMesh, glassMesh, collarMesh, topCap, botCap, rippleMesh);
      rootGroup.add(group);
      hitTargets.push(glassMesh, collarMesh, topCap, botCap);

      const mid = basePos.clone().multiplyScalar(0.55);
      mid.y += isLeft ? 0.55 : -0.45;
      const curve = new THREE.QuadraticBezierCurve3(
        basePos,
        mid,
        new THREE.Vector3(isLeft ? -0.9 : 0.9, 0, 0),
      );
      const points = curve.getPoints(30);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      geometries.push(lineGeo);
      const lineMat = new THREE.LineBasicMaterial({
        color: hub.accent,
        transparent: true,
        opacity: 0.42,
      });
      materials.push(lineMat);
      const line = new THREE.Line(lineGeo, lineMat);
      rootGroup.add(line);

      hubNodes.push({
        hubId: hub.id,
        group,
        glassShellMat,
        innerCoreMat,
        collarMat,
        capMat,
        lineMat,
        rippleMesh,
        rippleMat,
        rippleTimer: 0,
        basePos,
        curve,
      });
    });

    // InstancedMesh Synaptic Packets
    const packetCount = BRAIN_HUBS.length * 4;
    const packetGeo = new THREE.SphereGeometry(0.068, 8, 8);
    geometries.push(packetGeo);
    const packetMat = new THREE.MeshBasicMaterial({ color: '#8FA6E8' });
    materials.push(packetMat);
    const packetMesh = new THREE.InstancedMesh(packetGeo, packetMat, packetCount);
    packetMesh.frustumCulled = false;
    rootGroup.add(packetMesh);

    const dummy = new THREE.Object3D();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Throttled Raycaster Pointer Interaction
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredLocal: string | null = null;
    let lastRaycastMs = 0;
    let pointerDownPos = { x: 0, y: 0 };

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRaycastMs < 32) return;
      lastRaycastMs = now;
      updatePointer(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitTargets, false);
      const hitHubId = hits.length > 0 ? (hits[0].object.userData.hubId as string) : null;
      if (hitHubId !== hoveredLocal) {
        hoveredLocal = hitHubId;
        setHoveredHubId(hitHubId);
        if (!hitHubId) setProjectedCallout(null);
        renderer.domElement.style.cursor = hitHubId ? 'pointer' : 'grab';
      }
    };

    const handlePointerLeave = () => {
      hoveredLocal = null;
      setHoveredHubId(null);
      setProjectedCallout(null);
      renderer.domElement.style.cursor = 'grab';
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return;
      updatePointer(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitTargets, false);
      if (hits.length > 0) {
        const hubId = hits[0].object.userData.hubId as string;
        pendingPulseHubRef.current = hubId;
        onSelectHubRef.current?.(hubId);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(200, Math.floor(entry.contentRect.width));
        const h = Math.max(200, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;
    let lastCalloutSync = 0;
    let lastAnchorSync = 0;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      elapsed += dt;

      if (targetCamPosRef.current && targetLookAtRef.current) {
        const alpha = 1 - Math.exp(-5.5 * dt);
        camera.position.lerp(targetCamPosRef.current, alpha);
        controls.target.lerp(targetLookAtRef.current, alpha);
        if (camera.position.distanceTo(targetCamPosRef.current) < 0.04) {
          targetCamPosRef.current = null;
          targetLookAtRef.current = null;
        }
      }

      // Smooth Three-Way Studio Finish Interpolation (Heritage Stone Light <-> Heritage Nocturnal <-> Obsidian Ti)
      const finish = finishRef.current;
      const isStoneLight = finish === 'heritage-light';
      const isObsidian = finish === 'obsidian';
      const fAlpha = 1 - Math.exp(-5.5 * dt);

      const targetBg = isStoneLight
        ? _bgHeritageLight
        : isObsidian
          ? _bgObsidian
          : _bgHeritageDark;
      const targetRim = isStoneLight
        ? _rimHeritageLight
        : isObsidian
          ? _rimObsidian
          : _rimHeritageDark;
      const targetMetal = isStoneLight
        ? _metalHeritageLight
        : isObsidian
          ? _metalObsidian
          : _metalHeritageDark;
      const targetGlassL = isStoneLight
        ? _glassLeftLight
        : isObsidian
          ? _glassLeftObsidian
          : _glassLeftDark;
      const targetGlassR = isStoneLight
        ? _glassRightLight
        : isObsidian
          ? _glassRightObsidian
          : _glassRightDark;
      const targetPedestal = isStoneLight
        ? _pedestalLight
        : isObsidian
          ? _pedestalObsidian
          : _pedestalDark;
      const targetPacket = isStoneLight
        ? _packetLight
        : isObsidian
          ? _packetObsidian
          : _packetDark;

      initialBg.lerp(targetBg, fAlpha);
      fog.color.copy(initialBg);
      rimLight.color.lerp(targetRim, fAlpha);
      hemiLight.color.lerp(
        isStoneLight ? _hemiSkyLight : isObsidian ? _hemiSkyObsidian : _hemiSkyDark,
        fAlpha,
      );
      hemiLight.groundColor.lerp(
        isStoneLight ? _hemiGroundLight : isObsidian ? _hemiGroundObsidian : _hemiGroundDark,
        fAlpha,
      );
      hemiLight.intensity = THREE.MathUtils.damp(hemiLight.intensity, isStoneLight ? 1.35 : 0.85, 5, dt);
      leftRibMat.color.lerp(targetMetal, fAlpha);
      rightRibMat.color.lerp(targetMetal, fAlpha);
      spineMat.color.lerp(targetMetal, fAlpha);
      pedestalBevelMat.color.lerp(targetMetal, fAlpha);
      pedestalMat.color.lerp(targetPedestal, fAlpha);
      leftGlassMat.color.lerp(targetGlassL, fAlpha);
      rightGlassMat.color.lerp(targetGlassR, fAlpha);
      packetMat.color.lerp(targetPacket, fAlpha);

      const currentSelected = new Set(selectedIdsRef.current);
      const activeHubs = new Set<string>();
      SPENTA_APPS.forEach((a) => {
        if (currentSelected.has(a.id)) activeHubs.add(a.hubId);
      });

      const passHitl = hitlRef.current >= 0.88;
      const targetRingColor = passHitl
        ? isStoneLight
          ? _passLightColor
          : isObsidian
            ? _passObsidianColor
            : _passDarkColor
        : isStoneLight
          ? _holdLightColor
          : _holdDarkColor;

      const colorStep = 1 - Math.exp(-6 * dt);
      opaRingMat.color.lerp(targetRingColor, colorStep);
      opaRingMat.emissive.lerp(targetRingColor, colorStep);
      coreLight.color.lerp(targetRingColor, colorStep);
      coreLight.intensity = THREE.MathUtils.damp(coreLight.intensity, isStoneLight ? 1.15 : 2.35, 5, dt);

      brainCoreGroup.rotation.y += dt * 0.16;
      opaRingGroup.rotation.y -= dt * (passHitl ? 0.28 : 0.62);
      opaRingGroup.rotation.z = Math.sin(elapsed * 0.5) * 0.08;

      const triggerPulseId = pendingPulseHubRef.current;
      if (triggerPulseId) {
        pendingPulseHubRef.current = null;
      }

      let instIdx = 0;
      let hoveredNodeRef: HubNodeMeta | null = null;

      hubNodes.forEach((node, idx) => {
        const isActive = activeHubs.has(node.hubId);
        const isHovered = hoveredLocal === node.hubId;
        const isSelected = selectedHubRef.current === node.hubId;
        const isFocus = isHovered || isSelected;

        if (isHovered) hoveredNodeRef = node;

        if (triggerPulseId === node.hubId) {
          node.rippleTimer = 1.0;
          node.rippleMesh.visible = true;
        }

        if (node.rippleTimer > 0) {
          node.rippleTimer = Math.max(0, node.rippleTimer - dt * 1.45);
          const progress = 1 - node.rippleTimer;
          const scale = 1 + progress * 2.15;
          node.rippleMesh.scale.set(scale, scale, scale);
          node.rippleMesh.lookAt(camera.position);
          node.rippleMat.opacity = Math.sin(node.rippleTimer * Math.PI * 0.5) * 0.78;
          if (node.rippleTimer <= 0.001) {
            node.rippleMesh.visible = false;
            node.rippleMat.opacity = 0;
          }
        }

        const targetScale = isHovered ? 1.34 : isSelected ? 1.24 : isActive ? 1.1 : 0.88;
        node.group.scale.x = THREE.MathUtils.damp(node.group.scale.x, targetScale, 8, dt);
        node.group.scale.y = THREE.MathUtils.damp(node.group.scale.y, targetScale, 8, dt);
        node.group.scale.z = THREE.MathUtils.damp(node.group.scale.z, targetScale, 8, dt);

        node.group.position.y = node.basePos.y + Math.sin(elapsed * 1.4 + idx) * 0.11;
        node.group.rotation.y += dt * (isFocus ? 1.15 : isActive ? 0.78 : 0.3);

        node.collarMat.color.lerp(targetMetal, fAlpha);

        const pulseWave = prefersReducedMotion
          ? 0
          : isFocus
            ? 0.32 * (0.5 + 0.5 * Math.sin(elapsed * 3.4 + idx))
            : isActive
              ? 0.2 * (0.5 + 0.5 * Math.sin(elapsed * 2.4 + idx * 0.9))
              : 0;
        const lightDamp = isStoneLight ? 0.58 : 1.0;
        node.glassShellMat.emissiveIntensity = THREE.MathUtils.damp(
          node.glassShellMat.emissiveIntensity,
          ((isFocus ? 0.65 : isActive ? 0.34 : 0.14) + pulseWave) * lightDamp,
          7,
          dt,
        );
        node.innerCoreMat.emissiveIntensity = THREE.MathUtils.damp(
          node.innerCoreMat.emissiveIntensity,
          ((isFocus ? 1.75 : isActive ? 1.05 : 0.45) + pulseWave * 1.45) * lightDamp,
          7,
          dt,
        );
        node.collarMat.emissiveIntensity = THREE.MathUtils.damp(
          node.collarMat.emissiveIntensity,
          ((isFocus ? 0.72 : isActive ? 0.34 : 0.1) + pulseWave * 0.65) * lightDamp,
          7,
          dt,
        );
        node.lineMat.opacity = THREE.MathUtils.damp(
          node.lineMat.opacity,
          isFocus ? 0.95 : isActive ? 0.74 : 0.24,
          6,
          dt,
        );

        for (let p = 0; p < 4; p++) {
          const speed = isFocus ? 0.62 : isActive ? 0.42 : 0.14;
          const t = (elapsed * speed + p * 0.25 + idx * 0.11) % 1;
          node.curve.getPoint(t, _packetPos);
          dummy.position.copy(_packetPos);
          const s = isFocus ? 1.25 : isActive ? 1.0 : 0.36;
          dummy.scale.set(s, s, s);
          dummy.updateMatrix();
          packetMesh.setMatrixAt(instIdx++, dummy.matrix);
        }
      });
      packetMesh.instanceMatrix.needsUpdate = true;

      controls.update();
      renderer.render(scene, camera);

      if (now - lastAnchorSync > 60) {
        lastAnchorSync = now;
        const w = container.clientWidth || 640;
        const h = container.clientHeight || 460;
        const nextAnchors: ProjectedNodeAnchor[] = [];
        for (let i = 0; i < hubNodes.length; i++) {
          const node = hubNodes[i];
          const isNodeActive = activeHubs.has(node.hubId);
          const isNodeSelected = selectedHubRef.current === node.hubId;
          if (!isNodeActive && !isNodeSelected) continue;
          node.group.getWorldPosition(_worldPos);
          _projVec.copy(_worldPos).project(camera);
          if (_projVec.z >= 1) continue;
          const sx = ((_projVec.x + 1) / 2) * w;
          const sy = ((-_projVec.y + 1) / 2) * h;
          if (sx < 14 || sx > w - 14 || sy < 14 || sy > h - 14) continue;
          const meta = BRAIN_HUBS[i];
          nextAnchors.push({
            hubId: node.hubId,
            num: meta?.num ?? String(i + 1).padStart(2, '0'),
            x: Math.round(sx),
            y: Math.round(sy),
            isSelected: isNodeSelected,
            isActive: isNodeActive,
            accent: meta?.accent ?? '#6FCB9F',
          });
        }
        setProjectedAnchors(nextAnchors);
      }

      if (hoveredNodeRef && !isDraggingOrbit && now - lastCalloutSync > 45) {
        lastCalloutSync = now;
        const targetNode = hoveredNodeRef as HubNodeMeta;
        targetNode.group.getWorldPosition(_worldPos);
        _projVec.copy(_worldPos).project(camera);
        const w = container.clientWidth || 640;
        const h = container.clientHeight || 460;
        const rawX = ((_projVec.x + 1) / 2) * w;
        const rawY = ((-_projVec.y + 1) / 2) * h;
        const clampedX = Math.max(120, Math.min(w - 120, rawX));
        const clampedY = Math.max(76, Math.min(h - 140, rawY - 42));
        setProjectedCallout({
          hubId: targetNode.hubId,
          x: clampedX,
          y: clampedY,
          visible: _projVec.z < 1,
        });
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('end', onControlEnd);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      controls.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      envTex.dispose();
      renderer.dispose();
    };
  }, [compact]);

  const hitlPass = hitlConfidence >= 0.88;
  const isLightHud = materialFinish === 'heritage-light';

  if (contextLost) {
    return (
      <div
        className={`w-full h-full min-h-[420px] rounded-[10px] p-6 flex flex-col justify-center items-center text-center ${
          isLightHud ? 'bg-[#F2EFE9] text-[#16213A]' : 'bg-[#0B1020] text-[#E7EBF5]'
        }`}
      >
        <div
          className={`text-xs font-mono font-bold mb-2 ${
            isLightHud ? 'text-[#1F3863]' : 'text-[#8FA6E8]'
          }`}
        >
          WebGL 2D Fallback Mode
        </div>
        <h3 className="text-lg font-bold">Spenta 3D Sovereign Neural Core</h3>
        <p className={`text-xs max-w-md mt-2 ${isLightHud ? 'text-[#4A5163]' : 'text-[#C3CCE4]'}`}>
          Hardware WebGL context is unavailable in this viewport. Inspect and compose all 8 hubs below.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 w-full max-w-2xl">
          {BRAIN_HUBS.map((hub) => {
            const active = activeHubIds.has(hub.id);
            const selected = selectedHubId === hub.id;
            const pulseClass = selected
              ? 'brain-node-emissive-pulse--selected'
              : active
                ? 'brain-node-emissive-pulse'
                : '';
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => onSelectHub?.(hub.id)}
                style={active || selected ? getEmissiveCssVars(hub.accent, isLightHud) : undefined}
                className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${pulseClass} ${
                  isLightHud
                    ? selected
                      ? 'bg-[#EEF3FB] border-[#1F3863] text-[#16213A]'
                      : active
                        ? 'bg-[#EBF6F0] border-[#1C6E46] text-[#16213A]'
                        : 'bg-[#FFFFFF] border-[#E4DFD6] text-[#4A5163]'
                    : selected
                      ? 'bg-[#1B2547] border-[#8FA6E8] text-[#E7EBF5]'
                      : active
                        ? 'bg-[#0F2A22] border-[#6FCB9F] text-[#E7EBF5]'
                        : 'bg-[#141A32] border-[#232B4A] text-[#C3CCE4]'
                }`}
              >
                <div className="text-[10px] font-mono font-bold">HUB {hub.num}</div>
                <div className="text-xs font-semibold mt-0.5">{hub.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Solid-surface HUD styling (zero backdrop-filter over WebGL)
  const hudShell = isLightHud
    ? 'bg-[#FAF8F4]/95 border-[#CFC8BC] text-[#16213A]'
    : materialFinish === 'obsidian'
      ? 'bg-[#07130F]/95 border-emerald-800/70 text-white'
      : 'bg-[#0F1529]/95 border-[#2E3862] text-[#E7EBF5]';

  const hudInactiveBtn = isLightHud
    ? 'bg-[#FFFFFF] text-[#4A5163] hover:text-[#16213A] border border-[#E4DFD6]'
    : materialFinish === 'obsidian'
      ? 'bg-[#0E241C] text-slate-300 hover:text-white'
      : 'bg-[#141A32] text-[#C3CCE4] hover:text-white border border-[#232B4A]';

  return (
    <div
      className={`relative w-full h-full min-h-[450px] rounded-[10px] overflow-hidden select-none ${
        isLightHud ? 'bg-[#F2EFE9]' : materialFinish === 'obsidian' ? 'bg-[#07130F]' : 'bg-[#0B1020]'
      }`}
    >
      {/* Isolated Stable WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full min-h-[450px]" />

      {/* Projected CSS Emissive Pulse Halos on Active & Selected 3D Brain Nodes (Zero backdrop-filter) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10" aria-hidden="true">
        {projectedAnchors.map((anchor) => {
          const size = anchor.isSelected ? 46 : 34;
          return (
            <div
              key={`pulse-${anchor.hubId}`}
              className="brain-node-ring-pulse absolute rounded-full border"
              style={{
                left: `${anchor.x}px`,
                top: `${anchor.y}px`,
                width: `${size}px`,
                height: `${size}px`,
                borderColor: hexToRgba(anchor.accent, anchor.isSelected ? 0.88 : 0.58),
                ...getEmissiveCssVars(anchor.accent, isLightHud),
              }}
            />
          );
        })}
      </div>

      {/* Minimal Top-Left Spec Badge (Zero Side-Flank Occlusion, Solid Surface) */}
      <div className="absolute top-3 left-3 pointer-events-none flex flex-wrap items-center gap-2">
        <div className={`border rounded-lg px-3 py-1.5 ${hudShell}`}>
          <div
            className={`text-[10px] font-mono font-semibold tabular-nums ${
              isLightHud ? 'text-[#1F3863]' : materialFinish === 'obsidian' ? 'text-[#6EE7B7]' : 'text-[#8FA6E8]'
            }`}
          >
            3D Neural Core · {activeHubIds.size}/8 Hubs · {selectedIds.length} Apps
          </div>
        </div>
        <div
          className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-semibold tabular-nums ${
            hitlPass
              ? isLightHud
                ? 'bg-[#EBF6F0] border-[#1C6E46] text-[#1C6E46]'
                : 'bg-[#0F2A22] border-[#6FCB9F] text-[#6FCB9F]'
              : isLightHud
                ? 'bg-[#FDF5E6] border-[#8A5C10] text-[#8A5C10]'
                : 'bg-[#2A2112] border-[#E0B063] text-[#E0B063]'
          }`}
        >
          OPA {hitlConfidence.toFixed(2)} · {hitlPass ? 'Auto-Commit' : 'HITL Audit'}
        </div>
      </div>

      {/* 3D-Projected Hover Telemetry Callout (Solid Surface, Zero backdrop-filter Over WebGL) */}
      {projectedCallout && hoveredCalloutHub && (
        <div
          className="absolute pointer-events-none z-20 -translate-x-1/2 -translate-y-full transition-transform duration-100"
          style={{ left: `${projectedCallout.x}px`, top: `${projectedCallout.y}px` }}
        >
          <div
            className={`w-[232px] rounded-lg border px-3 py-2 shadow-lg ${
              isLightHud
                ? 'bg-[#FFFFFF] border-[#1F3863] text-[#16213A]'
                : 'bg-[#0F1529] border-[#8FA6E8] text-[#E7EBF5]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
              <span className={isLightHud ? 'text-[#1F3863] font-bold' : 'text-[#8FA6E8] font-bold'}>
                HUB {hoveredCalloutHub.hub.num} · {hoveredCalloutHub.hub.keyLayers.join('/')}
              </span>
              <span className="opacity-80 tabular-nums">
                {hoveredCalloutHub.activeCount}/{hoveredCalloutHub.totalApps} active
              </span>
            </div>
            <div className="text-xs font-bold mt-0.5 truncate">
              {hoveredCalloutHub.hub.label}
            </div>
            <div className="text-[10px] opacity-80 mt-0.5 leading-snug line-clamp-2">
              {hoveredCalloutHub.hub.summary}
            </div>
            <div
              className={`mt-1.5 pt-1 border-t text-[9.5px] font-mono flex items-center justify-between ${
                isLightHud ? 'border-[#E4DFD6] text-[#1C6E46]' : 'border-[#232B4A] text-[#6FCB9F]'
              }`}
            >
              <span>Brushed Ti · Frosted Glass</span>
              <span>Click to inspect</span>
            </div>
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (Zero backdrop-filter over WebGL) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(94%,780px)] flex flex-col items-center pointer-events-none">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className={`pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-t-lg border border-b-0 text-[10px] font-mono cursor-pointer ${hudShell}`}
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? 'Show Controls (H)' : 'Hide Controls (H)'}</span>
        </button>

        {!dockCollapsed && (
          <div className={`pointer-events-auto w-full border rounded-xl px-3.5 py-2.5 space-y-2 ${hudShell}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1">
                {(['overview', 'operations', 'experience', 'top'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyCameraPreset(preset)}
                    className={`px-2.5 py-1 rounded-md font-mono text-[10px] uppercase font-semibold transition-colors cursor-pointer ${
                      activePreset === preset
                        ? isLightHud
                          ? 'bg-[#1F3863] text-white'
                          : 'bg-[#8FA6E8] text-[#0B1020]'
                        : hudInactiveBtn
                    }`}
                  >
                    {preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => applyCameraPreset('overview')}
                  className={`p-1 rounded-md cursor-pointer ${hudInactiveBtn}`}
                  title="Reset camera"
                  aria-label="Reset camera"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Three-Way Tactile PBR Finish Switcher */}
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    { id: 'heritage-light', label: 'Stone Studio' },
                    { id: 'heritage-dark', label: 'Nocturnal Navy' },
                    { id: 'obsidian', label: 'Obsidian Ti' },
                  ] as const
                ).map((fin) => (
                  <button
                    key={fin.id}
                    type="button"
                    onClick={() => setMaterialFinish(fin.id)}
                    className={`px-2 py-1 rounded-md font-mono text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      materialFinish === fin.id
                        ? fin.id === 'heritage-light'
                          ? 'bg-[#1F3863] text-white'
                          : fin.id === 'obsidian'
                            ? 'bg-[#1EB56A] text-[#07130F]'
                            : 'bg-[#8FA6E8] text-[#0B1020]'
                        : hudInactiveBtn
                    }`}
                  >
                    {fin.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive 8-Hub 3D Node Selector Strip with Custom CSS Emissive Pulse on Active/Selected States */}
            <div
              className={`flex flex-wrap items-center gap-1.5 pt-1.5 border-t ${
                isLightHud ? 'border-[#E4DFD6]' : 'border-[#232B4A]'
              }`}
              role="group"
              aria-label="3D Brain hub node quick selector"
            >
              {BRAIN_HUBS.map((hub) => {
                const isActiveNode = activeHubIds.has(hub.id);
                const isSelectedNode = selectedHubId === hub.id;
                const pulseClass = isSelectedNode
                  ? 'brain-node-emissive-pulse--selected'
                  : isActiveNode
                    ? 'brain-node-emissive-pulse'
                    : '';
                return (
                  <button
                    key={hub.id}
                    type="button"
                    onClick={() => {
                      pendingPulseHubRef.current = hub.id;
                      onSelectHub?.(hub.id);
                    }}
                    aria-pressed={isSelectedNode}
                    style={
                      isActiveNode || isSelectedNode
                        ? getEmissiveCssVars(hub.accent, isLightHud)
                        : undefined
                    }
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${pulseClass} ${
                      isSelectedNode
                        ? isLightHud
                          ? 'bg-[#EEF3FB] border-[#1F3863] text-[#16213A]'
                          : 'bg-[#1B2547] border-[#8FA6E8] text-white'
                        : isActiveNode
                          ? isLightHud
                            ? 'bg-[#EBF6F0] border-[#1C6E46]/70 text-[#16213A]'
                            : 'bg-[#0F2A22] border-[#6FCB9F]/70 text-[#E7EBF5]'
                          : hudInactiveBtn
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isActiveNode || isSelectedNode ? 'brain-core-dot-pulse' : 'opacity-45'
                      }`}
                      style={{ backgroundColor: hub.accent }}
                    />
                    <span>H{hub.num}</span>
                  </button>
                );
              })}
            </div>

            <div
              className={`flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t ${
                isLightHud ? 'border-[#E4DFD6]' : 'border-[#232B4A]'
              }`}
            >
              {inspectedHub ? (
                <div
                  className={`text-[11px] font-mono truncate ${
                    isLightHud ? 'text-[#1F3863]' : 'text-[#8FA6E8]'
                  }`}
                >
                  HUB {inspectedHub.num}:{' '}
                  <strong className={isLightHud ? 'text-[#16213A]' : 'text-white'}>
                    {inspectedHub.label}
                  </strong>
                </div>
              ) : (
                <div className="text-[10px] font-mono opacity-75">
                  Hover node for 3D callout · Click hub to sync profile &amp; toggle apps
                </div>
              )}

              {inspectedHub && inspectedApps.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {inspectedApps.map((app) => {
                    const isSelected = selectedIds.includes(app.id);
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => {
                          pendingPulseHubRef.current = inspectedHub.id;
                          toggleApp(app.id);
                        }}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? isLightHud
                              ? 'bg-[#1C6E46] text-white border-[#1C6E46] font-bold'
                              : 'bg-[#6FCB9F] text-[#0B1020] border-[#6FCB9F] font-bold'
                            : hudInactiveBtn
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {app.shortName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
