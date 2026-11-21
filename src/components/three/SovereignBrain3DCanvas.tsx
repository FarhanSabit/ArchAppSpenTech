import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { BRAIN_HUBS, SPENTA_APPS } from '../../data/spentaManifest';
import { useStack } from '../../store/StackContext';

interface SovereignBrain3DCanvasProps {
  compact?: boolean;
  onSelectHub?: (hubId: string) => void;
  selectedHubId?: string | null;
}

type CameraPreset = 'overview' | 'operations' | 'experience' | 'top';
type MaterialFinish = 'obsidian' | 'heritage';

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

// Pre-allocated scratch math objects (zero GC inside animation loop)
const _packetPos = new THREE.Vector3();
const _worldPos = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _emeraldColor = new THREE.Color('#1EB56A');
const _amberColor = new THREE.Color('#F59E0B');
const _obsidianBg = new THREE.Color('#07130F');
const _heritageBg = new THREE.Color('#0E162B');
const _obsidianRim = new THREE.Color('#14B8A6');
const _heritageRim = new THREE.Color('#7FA6FF');
const _obsidianMetal = new THREE.Color('#D1FAE5');
const _heritageMetal = new THREE.Color('#DCE5FA');
const _obsidianGlass = new THREE.Color('#0D2F22');
const _heritageGlass = new THREE.Color('#1F3863');

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

  ctx.fillStyle = '#091A14';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(30, 181, 106, 0.26)';
  ctx.lineWidth = 2;
  for (let r = 46; r <= 236; r += 38) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(20, 184, 166, 0.24)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(size / 2 + Math.cos(a) * 44, size / 2 + Math.sin(a) * 44);
    ctx.lineTo(size / 2 + Math.cos(a) * 238, size / 2 + Math.sin(a) * 238);
    ctx.stroke();

    ctx.fillStyle = i % 2 === 0 ? '#1EB56A' : '#14B8A6';
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
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.5, 'rgba(2, 10, 8, 0.32)');
  grad.addColorStop(1, 'rgba(7, 19, 15, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export default function SovereignBrain3DCanvas({
  compact = false,
  onSelectHub,
  selectedHubId = null,
}: SovereignBrain3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { selectedIds, hitlConfidence, toggleApp } = useStack();
  const [hoveredHubId, setHoveredHubId] = useState<string | null>(null);
  const [projectedCallout, setProjectedCallout] = useState<ProjectedCallout | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [activePreset, setActivePreset] = useState<CameraPreset>('overview');
  const [materialFinish, setMaterialFinish] = useState<MaterialFinish>('obsidian');

  const selectedIdsRef = useRef<string[]>(selectedIds);
  const hitlRef = useRef<number>(hitlConfidence);
  const selectedHubRef = useRef<string | null>(selectedHubId);
  const onSelectHubRef = useRef(onSelectHub);
  const finishRef = useRef<MaterialFinish>(materialFinish);
  const pendingPulseHubRef = useRef<string | null>(null);
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

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

    // Detect software WebGL from GPU renderer string
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
    renderer.toneMappingExposure = 1.12;
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
    const bgColor = new THREE.Color('#07130F');
    scene.background = bgColor;
    const fog = new THREE.FogExp2('#07130F', 0.04);
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
    const hemiLight = new THREE.HemisphereLight('#99F6E4', '#051A13', 0.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFF7ED', 1.95);
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

    const rimLight = new THREE.DirectionalLight('#14B8A6', 1.35);
    rimLight.position.set(-7, 4, -6);
    scene.add(rimLight);

    const coreLight = new THREE.PointLight('#1EB56A', 2.5, 14);
    coreLight.position.set(0, 0.2, 0);
    scene.add(coreLight);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    // Procedural Textures (Brushed Metal Grain + Circuit Pedestal + Radial Contact Shadow)
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const circuitTex = createProceduralCircuitTexture(maxAniso);
    const brushedGrainTex = createBrushedMetalGrainTexture(maxAniso);
    const contactShadowTex = createContactShadowTexture();
    textures.push(circuitTex, brushedGrainTex, contactShadowTex);

    // Grounded Brushed-Titanium Circuit Pedestal + Contact Shadow
    const pedestalGeo = new THREE.CylinderGeometry(3.6, 4.1, 0.22, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      map: circuitTex,
      roughness: 0.56,
      metalness: 0.42,
    });
    const pedestalBevelGeo = new THREE.TorusGeometry(3.65, 0.06, 14, 64);
    const pedestalBevelMat = new THREE.MeshPhysicalMaterial({
      color: '#D1FAE5',
      emissive: '#065F46',
      emissiveIntensity: 0.4,
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
      opacity: 0.55,
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

    // Composite Multi-Part Sovereign Neural Core:
    // Frosted Optical Glass Hemispheres + Glowing Inner Crystalline Cores + Anisotropic Brushed Titanium Ribs + L1–L6 Spine
    const brainCoreGroup = new THREE.Group();
    rootGroup.add(brainCoreGroup);

    const hemiOuterGeo = new THREE.IcosahedronGeometry(1.38, 2);
    const hemiInnerGeo = new THREE.IcosahedronGeometry(0.92, 1);
    const collarRibGeo = new THREE.TorusGeometry(1.44, 0.034, 12, 56);
    geometries.push(hemiOuterGeo, hemiInnerGeo, collarRibGeo);

    // Left Hemisphere — Operations Engine (Frosted Optical Glass + Brushed Metal Rib)
    const leftHemiGroup = new THREE.Group();
    leftHemiGroup.position.x = -0.35;
    leftHemiGroup.scale.set(0.84, 1.06, 0.92);
    const leftGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#0D2F22',
      emissive: '#10B981',
      emissiveIntensity: 0.24,
      roughness: 0.24,
      metalness: 0.08,
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
      color: '#10B981',
      emissive: '#10B981',
      emissiveIntensity: 0.85,
      roughness: 0.3,
      metalness: 0.2,
      flatShading: true,
    });
    const leftRibMat = new THREE.MeshPhysicalMaterial({
      color: '#D1FAE5',
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

    // Right Hemisphere — Experience Engine (Frosted Optical Glass + Brushed Metal Rib)
    const rightHemiGroup = new THREE.Group();
    rightHemiGroup.position.x = 0.35;
    rightHemiGroup.scale.set(0.84, 1.06, 0.92);
    const rightGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#0B2C2B',
      emissive: '#0D9488',
      emissiveIntensity: 0.28,
      roughness: 0.24,
      metalness: 0.08,
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
      color: '#14B8A6',
      emissive: '#0D9488',
      emissiveIntensity: 0.9,
      roughness: 0.3,
      metalness: 0.2,
      flatShading: true,
    });
    const rightRibMat = new THREE.MeshPhysicalMaterial({
      color: '#CCFBF1',
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

    // L1-L6 Vertical Sovereign Stack Core Spine (6 Precision Brushed-Titanium Rings)
    const spineRingGeo = new THREE.TorusGeometry(0.44, 0.036, 12, 32);
    geometries.push(spineRingGeo);
    const spineMat = new THREE.MeshPhysicalMaterial({
      color: '#ECFDF5',
      emissive: '#1EB56A',
      emissiveIntensity: 0.55,
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

    // Orbiting OPA 0.88 HITL Governance Ring (Brushed Anodized Titanium)
    const opaRingGroup = new THREE.Group();
    rootGroup.add(opaRingGroup);
    const opaTorusGeo = new THREE.TorusGeometry(2.48, 0.048, 14, 72);
    const opaGateGeo = new THREE.BoxGeometry(0.16, 0.16, 0.26);
    geometries.push(opaTorusGeo, opaGateGeo);

    const opaRingMat = new THREE.MeshPhysicalMaterial({
      color: '#1EB56A',
      emissive: '#1EB56A',
      emissiveIntensity: 0.65,
      roughness: 0.2,
      metalness: 0.9,
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
    // 5 parts each: Frosted glass outer octahedron + glowing inner crystal + brushed-metal bevel collar + top/bottom machined caps + shockwave ripple ring
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
        transmission: isSoftwareGl ? 0 : 0.72,
        ior: 1.5,
        thickness: 0.9,
        clearcoat: 1.0,
        clearcoatRoughness: 0.12,
        transparent: true,
        opacity: isSoftwareGl ? 0.62 : 0.94,
        depthWrite: !isSoftwareGl,
      });

      const innerCoreMat = new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        emissive: hub.accent,
        emissiveIntensity: 0.95,
        roughness: 0.25,
        metalness: 0.15,
      });

      const collarMat = new THREE.MeshPhysicalMaterial({
        color: '#E2E8F0',
        emissive: hub.accent,
        emissiveIntensity: 0.26,
        roughness: 0.22,
        metalness: 0.92,
        anisotropy: 0.82,
        clearcoat: 0.35,
        bumpMap: brushedGrainTex,
        bumpScale: 0.015,
      });

      const capMat = new THREE.MeshPhysicalMaterial({
        color: '#112520',
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
        opacity: 0.36,
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
    const packetMat = new THREE.MeshBasicMaterial({ color: '#A7F3D0' });
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

    // WebGL2 Fence-Sync afterDraw pacing for software WebGL
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;
    let lastCalloutSync = 0;

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

      // Smooth exponential camera preset transition
      if (targetCamPosRef.current && targetLookAtRef.current) {
        const alpha = 1 - Math.exp(-5.5 * dt);
        camera.position.lerp(targetCamPosRef.current, alpha);
        controls.target.lerp(targetLookAtRef.current, alpha);
        if (camera.position.distanceTo(targetCamPosRef.current) < 0.04) {
          targetCamPosRef.current = null;
          targetLookAtRef.current = null;
        }
      }

      // Smooth Material Finish Interpolation (Obsidian Titanium <-> OITS Heritage Stone & Navy)
      const isHeritage = finishRef.current === 'heritage';
      const finishAlpha = 1 - Math.exp(-5 * dt);
      bgColor.lerp(isHeritage ? _heritageBg : _obsidianBg, finishAlpha);
      fog.color.copy(bgColor);
      rimLight.color.lerp(isHeritage ? _heritageRim : _obsidianRim, finishAlpha);
      leftRibMat.color.lerp(isHeritage ? _heritageMetal : _obsidianMetal, finishAlpha);
      rightRibMat.color.lerp(isHeritage ? _heritageMetal : _obsidianMetal, finishAlpha);
      pedestalBevelMat.color.lerp(isHeritage ? _heritageMetal : _obsidianMetal, finishAlpha);
      leftGlassMat.color.lerp(isHeritage ? _heritageGlass : _obsidianGlass, finishAlpha);

      const currentSelected = new Set(selectedIdsRef.current);
      const activeHubs = new Set<string>();
      SPENTA_APPS.forEach((a) => {
        if (currentSelected.has(a.id)) activeHubs.add(a.hubId);
      });

      const passHitl = hitlRef.current >= 0.88;
      const targetRingColor = passHitl ? _emeraldColor : _amberColor;
      const colorStep = 1 - Math.exp(-6 * dt);
      opaRingMat.color.lerp(targetRingColor, colorStep);
      opaRingMat.emissive.lerp(targetRingColor, colorStep);
      coreLight.color.lerp(targetRingColor, colorStep);

      brainCoreGroup.rotation.y += dt * 0.16;
      opaRingGroup.rotation.y -= dt * (passHitl ? 0.28 : 0.62);
      opaRingGroup.rotation.z = Math.sin(elapsed * 0.5) * 0.08;

      // Consume pending click/selection shockwave trigger
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

        // Expanding radial emissive shockwave ripple animation
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

        // Tactile emissive radiance pulse feedback
        const pulseWave = isFocus ? 0.25 * Math.sin(elapsed * 5.2 + idx) : 0;
        node.glassShellMat.emissiveIntensity = THREE.MathUtils.damp(
          node.glassShellMat.emissiveIntensity,
          (isFocus ? 0.85 : isActive ? 0.48 : 0.14) + pulseWave,
          7,
          dt,
        );
        node.innerCoreMat.emissiveIntensity = THREE.MathUtils.damp(
          node.innerCoreMat.emissiveIntensity,
          (isFocus ? 2.1 : isActive ? 1.3 : 0.45) + pulseWave,
          7,
          dt,
        );
        node.collarMat.emissiveIntensity = THREE.MathUtils.damp(
          node.collarMat.emissiveIntensity,
          isFocus ? 0.95 : isActive ? 0.5 : 0.1,
          7,
          dt,
        );
        node.lineMat.opacity = THREE.MathUtils.damp(
          node.lineMat.opacity,
          isFocus ? 0.95 : isActive ? 0.72 : 0.18,
          6,
          dt,
        );

        for (let p = 0; p < 4; p++) {
          const speed = isFocus ? 0.62 : isActive ? 0.42 : 0.14;
          const t = (elapsed * speed + p * 0.25 + idx * 0.11) % 1;
          node.curve.getPoint(t, _packetPos);
          dummy.position.copy(_packetPos);
          const s = isFocus ? 1.25 : isActive ? 1.0 : 0.32;
          dummy.scale.set(s, s, s);
          dummy.updateMatrix();
          packetMesh.setMatrixAt(instIdx++, dummy.matrix);
        }
      });
      packetMesh.instanceMatrix.needsUpdate = true;

      controls.update();
      renderer.render(scene, camera);

      // Project hovered 3D hub world position into clamped 2D viewport callout coords
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

  if (contextLost) {
    return (
      <div className="w-full h-full min-h-[420px] bg-[#07130F] text-white rounded-xl p-6 flex flex-col justify-center items-center text-center">
        <div className="text-xs font-mono uppercase tracking-wider text-[#6EE7B7] mb-2">
          WebGL 2D Fallback Mode
        </div>
        <h3 className="text-lg font-bold">Spenta 3D Sovereign Neural Core</h3>
        <p className="text-xs text-slate-300 max-w-md mt-2">
          Hardware WebGL context is unavailable in this viewport. Inspect and compose all 8 hubs below.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 w-full max-w-2xl">
          {BRAIN_HUBS.map((hub) => {
            const active = activeHubIds.has(hub.id);
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => onSelectHub?.(hub.id)}
                className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-950 border-[#1EB56A] text-white'
                    : 'bg-[#0C1F18] border-emerald-900/60 text-slate-300'
                }`}
              >
                <div className="text-[10px] font-mono text-[#6EE7B7]">HUB {hub.num}</div>
                <div className="text-xs font-semibold mt-0.5">{hub.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[450px] bg-[#07130F] rounded-xl overflow-hidden select-none">
      {/* Isolated Stable WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full min-h-[450px]" />

      {/* Minimal Top-Left Spec Badge (Zero Side-Flank Occlusion, Solid Surface) */}
      <div className="absolute top-3 left-3 pointer-events-none flex flex-wrap items-center gap-2">
        <div className="bg-[#07130F]/95 border border-emerald-800/70 rounded-lg px-3 py-1.5 text-white">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#6EE7B7]">
            3D Neural Core · {activeHubIds.size}/8 Hubs · {selectedIds.length} Apps
          </div>
        </div>
        <div
          className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-semibold tabular-nums ${
            hitlPass
              ? 'bg-[#07130F]/95 border-[#1EB56A] text-[#6EE7B7]'
              : 'bg-[#07130F]/95 border-[#F59E0B] text-[#FCD34D]'
          }`}
        >
          OPA {hitlConfidence.toFixed(2)} · {hitlPass ? 'AUTO-COMMIT' : 'HITL AUDIT'}
        </div>
      </div>

      {/* 3D-Projected Hover Telemetry Callout (Solid Surface, Zero backdrop-filter Over WebGL) */}
      {projectedCallout && hoveredCalloutHub && (
        <div
          className="absolute pointer-events-none z-20 -translate-x-1/2 -translate-y-full transition-transform duration-100"
          style={{ left: `${projectedCallout.x}px`, top: `${projectedCallout.y}px` }}
        >
          <div className="w-[228px] rounded-lg bg-[#091511] border border-[#1EB56A]/80 px-3 py-2 text-white shadow-lg">
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
              <span className="text-[#6EE7B7] font-bold">
                HUB {hoveredCalloutHub.hub.num} · {hoveredCalloutHub.hub.keyLayers.join('/')}
              </span>
              <span className="text-slate-300 tabular-nums">
                {hoveredCalloutHub.activeCount}/{hoveredCalloutHub.totalApps} active
              </span>
            </div>
            <div className="text-xs font-bold text-white mt-0.5 truncate">
              {hoveredCalloutHub.hub.label}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
              {hoveredCalloutHub.hub.summary}
            </div>
            <div className="mt-1.5 pt-1 border-t border-white/10 text-[9.5px] font-mono text-[#6EE7B7] flex items-center justify-between">
              <span>Brushed Ti · Frosted Glass</span>
              <span>Click to pulse</span>
            </div>
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (Zero backdrop-filter over WebGL) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(94%,780px)] flex flex-col items-center pointer-events-none">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-[#07130F]/95 border border-b-0 border-emerald-800/70 text-[10px] font-mono text-slate-300 hover:text-white cursor-pointer"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? 'Show Controls (H)' : 'Hide Controls (H)'}</span>
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto w-full bg-[#07130F]/95 border border-emerald-800/70 rounded-xl px-3.5 py-2.5 text-white space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1">
                {(['overview', 'operations', 'experience', 'top'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyCameraPreset(preset)}
                    className={`px-2.5 py-1 rounded-md font-mono text-[10px] uppercase font-semibold transition-colors cursor-pointer ${
                      activePreset === preset
                        ? 'bg-[#1EB56A] text-[#07130F]'
                        : 'bg-[#0E241C] text-slate-300 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => applyCameraPreset('overview')}
                  className="p-1 rounded-md bg-[#0E241C] text-slate-300 hover:text-white cursor-pointer"
                  title="Reset camera"
                  aria-label="Reset camera"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tactile PBR Finish Switcher */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMaterialFinish('obsidian')}
                  className={`px-2 py-1 rounded-md font-mono text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    materialFinish === 'obsidian'
                      ? 'bg-[#1EB56A] text-[#07130F]'
                      : 'bg-[#0E241C] text-slate-300 hover:text-white'
                  }`}
                >
                  Obsidian Ti
                </button>
                <button
                  type="button"
                  onClick={() => setMaterialFinish('heritage')}
                  className={`px-2 py-1 rounded-md font-mono text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    materialFinish === 'heritage'
                      ? 'bg-[#8FA6E8] text-[#0B1020]'
                      : 'bg-[#0E241C] text-slate-300 hover:text-white'
                  }`}
                >
                  Heritage Navy
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-900/50">
              {inspectedHub ? (
                <div className="text-[11px] font-mono text-[#6EE7B7] truncate">
                  HUB {inspectedHub.num}: <strong className="text-white">{inspectedHub.label}</strong>
                </div>
              ) : (
                <div className="text-[10px] font-mono text-slate-400">
                  Hover node for 3D callout · Click hub to pulse &amp; toggle apps
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
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#1EB56A] text-[#07130F] border-[#1EB56A] font-bold'
                            : 'bg-[#0E241C] text-slate-200 border-emerald-800 hover:border-[#1EB56A]'
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
