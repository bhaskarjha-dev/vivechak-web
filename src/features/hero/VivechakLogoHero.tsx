import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { soundEngine } from '@/shared/lib/sound';
import type { ThemeMode } from '@/shared/lib/theme';
import { VivechakLogoCanvas2D } from './VivechakLogoCanvas2D';
import type { SieveMode } from './LogoShared';

export type { SieveMode };

interface VivechakLogoHeroProps {
  mode: SieveMode;
  theme: ThemeMode;
  impulseNonce: number;
  impulseText?: string;
  rotationPaused?: boolean;
  onPulseClick: () => void;
  onSuperDistill?: () => void;
  onTruthPulse?: () => void;
}

// Canonical Vivechak SVG Geometry Constants (docs/BRAND.md: S = 36 on 512x512 canvas)
const SCALE = 1 / 72;
const CX = 256;
const CY = 246;
const tx = (x: number) => (x - CX) * SCALE;
const ty = (y: number) => (CY - y) * SCALE;
const DROP_RADIUS = 21.6 * SCALE;
const DROP_Y = ty(374.16);
const APEX_Y = ty(330.5);

const OUTER_SVG =
  'M 112 116.25 H 400 A 18 18 0 0 1 400 152.25 H 375.8 A 10.8 10.8 0 0 0 366.45 157.65 L 271.59 321.96 A 18 18 0 0 1 240.41 321.96 L 145.55 157.65 A 10.8 10.8 0 0 0 136.2 152.25 H 112 A 18 18 0 0 1 112 116.25 Z';
const INNER_SVG =
  'M 315.53 152.25 H 196.47 A 7.2 7.2 0 0 0 190.24 163.05 L 249.76 266.16 A 7.2 7.2 0 0 0 262.24 266.16 L 321.76 163.05 A 7.2 7.2 0 0 0 315.53 152.25 Z';

// Seamless canonical BRAND.md monolith shape (used in Sift & Sealed)
function buildCanonicalSieveShape(): { shape: THREE.Shape; hole: THREE.Path } {
  const shape = new THREE.Shape();
  shape.moveTo(tx(112), ty(116.25));
  shape.lineTo(tx(400), ty(116.25));
  shape.absarc(tx(400), ty(134.25), 18 * SCALE, Math.PI / 2, -Math.PI / 2, true);
  shape.lineTo(tx(375.8), ty(152.25));
  shape.quadraticCurveTo(tx(370.2), ty(152.25), tx(366.45), ty(157.65));
  shape.lineTo(tx(271.59), ty(321.96));
  shape.quadraticCurveTo(tx(256), ty(338.8), tx(240.41), ty(321.96));
  shape.lineTo(tx(145.55), ty(157.65));
  shape.quadraticCurveTo(tx(141.8), ty(152.25), tx(136.2), ty(152.25));
  shape.lineTo(tx(112), ty(152.25));
  shape.absarc(tx(112), ty(134.25), 18 * SCALE, -Math.PI / 2, Math.PI / 2, true);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(tx(315.53), ty(152.25));
  hole.lineTo(tx(196.47), ty(152.25));
  hole.quadraticCurveTo(tx(187.8), ty(152.25), tx(190.24), ty(163.05));
  hole.lineTo(tx(249.76), ty(266.16));
  hole.quadraticCurveTo(tx(256), ty(275.5), tx(262.24), ty(266.16));
  hole.lineTo(tx(321.76), ty(163.05));
  hole.quadraticCurveTo(tx(324.2), ty(152.25), tx(315.53), ty(152.25));
  hole.closePath();

  shape.holes.push(hole);
  return { shape, hole };
}

// 3 Precision kinematic segments for Raw Chat aperture split
function buildSplitShapes(): { bar: THREE.Shape; left: THREE.Shape; right: THREE.Shape } {
  const bar = new THREE.Shape();
  bar.moveTo(tx(112), ty(116.25));
  bar.lineTo(tx(400), ty(116.25));
  bar.absarc(tx(400), ty(134.25), 18 * SCALE, Math.PI / 2, -Math.PI / 2, true);
  bar.lineTo(tx(112), ty(152.25));
  bar.absarc(tx(112), ty(134.25), 18 * SCALE, -Math.PI / 2, Math.PI / 2, true);
  bar.closePath();

  const left = new THREE.Shape();
  left.moveTo(tx(145.55), ty(154));
  left.lineTo(tx(188), ty(154));
  left.lineTo(tx(254.5), ty(270));
  left.lineTo(tx(254.5), ty(329));
  left.quadraticCurveTo(tx(246), ty(328), tx(240.41), ty(321.96));
  left.lineTo(tx(145.55), ty(157.65));
  left.closePath();

  const right = new THREE.Shape();
  right.moveTo(tx(366.45), ty(154));
  right.lineTo(tx(324), ty(154));
  right.lineTo(tx(257.5), ty(270));
  right.lineTo(tx(257.5), ty(329));
  right.quadraticCurveTo(tx(266), ty(328), tx(271.59), ty(321.96));
  right.lineTo(tx(366.45), ty(157.65));
  right.closePath();

  return { bar, left, right };
}

function buildBrushedMetalTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y++) {
      const v = 118 + Math.floor(Math.sin(y * 0.45) * 6 + (Math.random() - 0.5) * 18);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(0, y, size, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.55, 0.55);
  return tex;
}

function buildStudioEnvMap(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x131d36);

  const addSoftbox = (
    color: number,
    w: number,
    h: number,
    pos: [number, number, number],
    lookAt: [number, number, number] = [0, 0, 0]
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
    );
    mesh.position.set(...pos);
    mesh.lookAt(...lookAt);
    envScene.add(mesh);
  };

  addSoftbox(0xfbf5ea, 15, 7.5, [1.5, 5.4, 8.8]);
  addSoftbox(0xffffff, 16, 1.8, [-1.0, 8.5, 4.5]);
  addSoftbox(0x88b4ff, 9.5, 11, [-8.2, 2.2, 5.2]);
  addSoftbox(0xffc266, 8.5, 9.5, [8.4, 0.8, 4.8]);
  addSoftbox(0xf2a33a, 9.5, 6.0, [0, -7.2, 4.2]);
  addSoftbox(0x4b7be0, 12, 9, [0, 1.5, -8.5]);

  const rt = pmrem.fromScene(envScene, 0.028);
  pmrem.dispose();
  envScene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      (obj.material as THREE.Material).dispose();
    }
  });
  return rt;
}

const DROP_VERT = `
  uniform float uTime;
  uniform float uPulse;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  void main() {
    vec3 p = position;
    float w = sin(p.y * 14.0 - uTime * 2.8) * cos(p.x * 12.0 + uTime * 1.9);
    p += normal * (w * 0.007 * (1.0 + uPulse * 1.8));
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vWorldPos = wp.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const DROP_FRAG = `
  uniform float uTime;
  uniform float uMode;
  uniform float uPulse;
  uniform float uLightMode;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    float ndotv = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, 2.1);

    float c1 = sin(vWorldPos.y * 12.0 - uTime * 2.2 + vWorldPos.x * 8.0);
    float c2 = cos(vWorldPos.z * 13.0 + uTime * 1.8 - vWorldPos.y * 9.0);
    float caustic = clamp((c1 * c2) * 0.5 + 0.5, 0.0, 1.0);

    vec3 deepAmber = mix(vec3(0.74, 0.34, 0.02), vec3(0.68, 0.30, 0.01), uLightMode);
    vec3 canonicalSaffron = mix(vec3(0.955, 0.648, 0.235), vec3(0.94, 0.59, 0.11), uLightMode);
    vec3 moltenGold = mix(vec3(1.0, 0.87, 0.52), vec3(0.99, 0.80, 0.34), uLightMode);
    vec3 whiteHot = vec3(1.0, 0.98, 0.92);
    vec3 lightRimAmber = vec3(0.78, 0.40, 0.03);
    vec3 sealedEmerald = mix(vec3(0.24, 0.90, 0.68), vec3(0.06, 0.56, 0.38), uLightMode);

    vec3 L1 = normalize(vec3(0.55, 0.80, 0.65));
    vec3 L2 = normalize(vec3(-0.55, -0.45, 0.55));
    float diff1 = max(dot(N, L1), 0.0);
    float diff2 = max(dot(N, L2), 0.0);
    vec3 H1 = normalize(L1 + V);
    float spec1 = pow(max(dot(N, H1), 0.0), 84.0);

    vec3 col = mix(deepAmber, canonicalSaffron, 0.44 + diff1 * 0.56);
    col = mix(col, moltenGold, caustic * 0.28 + diff2 * 0.24);
    vec3 fresnelTarget = mix(whiteHot, lightRimAmber, uLightMode);
    col = mix(col, fresnelTarget, fresnel * mix(0.76, 0.58, uLightMode));
    col += whiteHot * spec1 * mix(1.3, 1.15, uLightMode);
    col += whiteHot * uPulse * 0.42;

    if (uMode > 0.5 && uMode < 1.5) {
      col = mix(vec3(0.18, 0.08, 0.10), vec3(0.72, 0.22, 0.20), diff1 * 0.65 + fresnel * 0.4);
    } else if (uMode > 1.5) {
      col = mix(col, sealedEmerald, fresnel * 0.45);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

const RIPPLE_FRAG = `
  uniform float uOpacity;
  uniform float uLightMode;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float core = smoothstep(0.036, 0.0, abs(r - 0.86));
    float halo = smoothstep(0.095, 0.0, abs(r - 0.86)) * 0.22;
    float alpha = (core + halo) * uOpacity * mix(0.95, 0.86, uLightMode);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

interface Claim3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  kind: 'verified' | 'noise';
  state: 'entering' | 'deflected' | 'funneling';
  life: number;
  maxLife: number;
  radius: number;
}

export const VivechakLogoHero: React.FC<VivechakLogoHeroProps> = ({
  mode,
  theme,
  impulseNonce,
  impulseText = '+1 GRADE A VERIFIED',
  rotationPaused = false,
  onPulseClick,
  onSuperDistill,
  onTruthPulse,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [webglLive, setWebglLive] = useState(false);
  const [useCanvas2D, setUseCanvas2D] = useState(false);
  const [replayNonce, setReplayNonce] = useState(0);
  const [hudLabel, setHudLabel] = useState<string>('');
  const [hoveredStage, setHoveredStage] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasCustomSpin, setHasCustomSpin] = useState(false);

  const modeRef = useRef<SieveMode>(mode);
  const themeRef = useRef<ThemeMode>(theme);
  const pausedRef = useRef(rotationPaused);
  const pulseClickRef = useRef(onPulseClick);
  const superCbRef = useRef(onSuperDistill);
  const pulseCbRef = useRef(onTruthPulse);
  const hoveredRef = useRef(false);
  const entranceRef = useRef(0);
  const condenseRef = useRef(1);
  const resetQuatRef = useRef(false);

  modeRef.current = mode;
  themeRef.current = theme;
  pausedRef.current = rotationPaused;
  pulseClickRef.current = onPulseClick;
  superCbRef.current = onSuperDistill;
  pulseCbRef.current = onTruthPulse;

  useEffect(() => {
    if (impulseNonce > 0) {
      condenseRef.current = 0;
    }
  }, [impulseNonce]);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setUseCanvas2D(true);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.localClippingEnabled = true;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
    camera.position.set(0, -0.02, 11.25);

    const studioEnv = buildStudioEnvMap(renderer);
    scene.environment = studioEnv.texture;
    const brushTex = buildBrushedMetalTexture();

    // Clean 4-point architectural studio lighting
    scene.add(new THREE.HemisphereLight(0xf6f9ff, 0x162445, 1.35));
    const keyLight = new THREE.DirectionalLight(0xfff9ee, 3.0);
    keyLight.position.set(3.8, 6.2, 8.0);
    scene.add(keyLight);

    const rimBlue = new THREE.DirectionalLight(0x6da6ff, 1.5);
    rimBlue.position.set(-6.5, 2.0, -3.5);
    scene.add(rimBlue);

    const dropLight = new THREE.PointLight(0xf2a33a, 8.5, 7.2, 1.5);
    dropLight.position.set(0, DROP_Y + 0.15, 0.9);
    scene.add(dropLight);

    const rig = new THREE.Group();
    scene.add(rig);

    const isLightInit = themeRef.current === 'light';
    const revealClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2.4);

    // Sculpted Lacquered Porcelain Face + Machined Sapphire-Titanium Chamfer Materials
    const faceMat = new THREE.MeshPhysicalMaterial({
      color: isLightInit ? 0x162b5c : 0xf4efe4,
      metalness: isLightInit ? 0.12 : 0.16,
      roughness: isLightInit ? 0.28 : 0.24,
      roughnessMap: brushTex,
      bumpMap: brushTex,
      bumpScale: 0.006,
      clearcoat: 0.86,
      clearcoatRoughness: 0.14,
      envMapIntensity: isLightInit ? 1.05 : 1.32,
      clippingPlanes: [revealClip],
    });
    const sideMat = new THREE.MeshPhysicalMaterial({
      color: isLightInit ? 0x22468c : 0x284e9a,
      metalness: 0.78,
      roughness: 0.22,
      clearcoat: 0.62,
      envMapIntensity: 1.55,
      clippingPlanes: [revealClip],
    });

    const extrudeOpts: THREE.ExtrudeGeometryOptions = {
      depth: 0.4,
      bevelEnabled: true,
      bevelSegments: 7,
      steps: 1,
      bevelSize: 0.055,
      bevelThickness: 0.068,
      curveSegments: 48,
    };

    // Seamless canonical monolith (Sift & Sealed)
    const { shape, hole } = buildCanonicalSieveShape();
    const wholeGeom = new THREE.ExtrudeGeometry(shape, extrudeOpts);
    wholeGeom.translate(0, 0, -0.2);
    const wholeMesh = new THREE.Mesh(wholeGeom, [faceMat, sideMat]);
    rig.add(wholeMesh);

    // Delicate inner 4S aperture brass/emerald bezel inlay (BOTH Front & Back faces for 360° inspection!)
    const holePts = hole.getSpacedPoints(120);
    const innerCurve = new THREE.CatmullRomCurve3(
      holePts.map((p) => new THREE.Vector3(p.x, p.y, 0.26)),
      true
    );
    const innerRimGeom = new THREE.TubeGeometry(innerCurve, 128, 0.017, 10, true);
    const innerRimMat = new THREE.MeshStandardMaterial({
      color: isLightInit ? 0xc97b12 : 0xf6b94c,
      metalness: 0.9,
      roughness: 0.2,
      emissive: isLightInit ? 0x6b3a02 : 0xf2a33a,
      emissiveIntensity: isLightInit ? 0.15 : 0.35,
      clippingPlanes: [revealClip],
    });
    const innerRimMesh = new THREE.Mesh(innerRimGeom, innerRimMat);
    const innerRimBackMesh = new THREE.Mesh(innerRimGeom, innerRimMat);
    innerRimBackMesh.position.z = -0.52;
    rig.add(innerRimMesh, innerRimBackMesh);

    // 3 Kinematic Split Blades (visible smoothly during Raw Chat aperture split!)
    const splitParts = buildSplitShapes();
    const splitGroup = new THREE.Group();
    splitGroup.visible = false;
    rig.add(splitGroup);

    const barGeom = new THREE.ExtrudeGeometry(splitParts.bar, extrudeOpts);
    barGeom.translate(0, 0, -0.2);
    const barMesh = new THREE.Mesh(barGeom, [faceMat, sideMat]);
    splitGroup.add(barMesh);

    const leftGeom = new THREE.ExtrudeGeometry(splitParts.left, extrudeOpts);
    leftGeom.translate(0, 0, -0.2);
    const leftPivot = new THREE.Group();
    leftPivot.position.set(tx(198), ty(240), 0);
    leftGeom.translate(-tx(198), -ty(240), 0);
    leftPivot.add(new THREE.Mesh(leftGeom, [faceMat, sideMat]));
    splitGroup.add(leftPivot);

    const rightGeom = new THREE.ExtrudeGeometry(splitParts.right, extrudeOpts);
    rightGeom.translate(0, 0, -0.2);
    const rightPivot = new THREE.Group();
    rightPivot.position.set(tx(314), ty(240), 0);
    rightGeom.translate(-tx(314), -ty(240), 0);
    rightPivot.add(new THREE.Mesh(rightGeom, [faceMat, sideMat]));
    splitGroup.add(rightPivot);

    // Liquid-Gold Teardrop Condensation Mesh + Tapered Meniscus Neck across the exact 0.6S gap
    const pearlGeom = new THREE.SphereGeometry(0.145, 28, 28);
    const pearlMat = new THREE.MeshPhysicalMaterial({
      color: 0xffc65c,
      emissive: 0xe6840e,
      emissiveIntensity: 0.68,
      metalness: 0.22,
      roughness: 0.08,
      clearcoat: 1.0,
    });
    const pearlMesh = new THREE.Mesh(pearlGeom, pearlMat);
    pearlMesh.visible = false;
    rig.add(pearlMesh);

    const meniscusGeom = new THREE.ConeGeometry(0.082, 0.28, 20);
    const meniscusMesh = new THREE.Mesh(meniscusGeom, pearlMat);
    meniscusMesh.rotation.x = Math.PI;
    meniscusMesh.visible = false;
    rig.add(meniscusMesh);

    // Living Cut-Citrine / Molten Amber Saffron Truth Drop
    const dropGroup = new THREE.Group();
    dropGroup.position.set(0, DROP_Y, 0);
    rig.add(dropGroup);

    const dropGeom = new THREE.SphereGeometry(DROP_RADIUS, 72, 72);
    const dropUniforms = {
      uTime: { value: 0 },
      uMode: { value: 0 },
      uPulse: { value: 0 },
      uLightMode: { value: isLightInit ? 1 : 0 },
    };
    const dropMat = new THREE.ShaderMaterial({
      vertexShader: DROP_VERT,
      fragmentShader: DROP_FRAG,
      uniforms: dropUniforms,
    });
    dropGroup.add(new THREE.Mesh(dropGeom, dropMat));

    // Grounded Contact Shadow / Focused Warm Floor Glow (strictly tied to dropAppear!)
    const floorGeom = new THREE.PlaneGeometry(2.8, 0.85);
    const floorUniforms = {
      uIntensity: { value: 0 },
      uLightMode: { value: isLightInit ? 1 : 0 },
    };
    const floorMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: floorUniforms,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uIntensity;
        uniform float uLightMode;
        varying vec2 vUv;
        void main() {
          float d = length((vUv - 0.5) * 2.0);
          float g = exp(-d * d * 5.2);
          vec3 col = mix(vec3(0.95, 0.65, 0.22), vec3(0.07, 0.13, 0.25), uLightMode);
          gl_FragColor = vec4(col, g * uIntensity * mix(0.32, 0.22, uLightMode));
        }
      `,
    });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.position.set(0, DROP_Y - 0.64, -0.15);
    rig.add(floorMesh);

    // Dual Concentric Impact Ripples (Primary + Secondary Echo, Gently Perspective-Tilted for 1× DPR Clarity)
    const rippleGeom = new THREE.PlaneGeometry(2.1, 2.1);
    const rippleUniforms = {
      uOpacity: { value: 0 },
      uLightMode: { value: isLightInit ? 1 : 0 },
      uColor: { value: new THREE.Color(isLightInit ? 0xc2700a : 0xffcb66) },
    };
    const rippleMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: rippleUniforms,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: RIPPLE_FRAG,
    });
    const rippleMesh = new THREE.Mesh(rippleGeom, rippleMat);
    rippleMesh.position.set(0, DROP_Y, -0.04);
    rippleMesh.rotation.x = Math.PI * 0.14;
    rig.add(rippleMesh);

    const rippleUniforms2 = {
      uOpacity: { value: 0 },
      uLightMode: { value: isLightInit ? 1 : 0 },
      uColor: { value: new THREE.Color(isLightInit ? 0xc2700a : 0xffcb66) },
    };
    const rippleMat2 = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: rippleUniforms2,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: RIPPLE_FRAG,
    });
    const rippleMesh2 = new THREE.Mesh(rippleGeom, rippleMat2);
    rippleMesh2.position.set(0, DROP_Y, -0.05);
    rippleMesh2.rotation.x = Math.PI * 0.14;
    rig.add(rippleMesh2);

    // Perpetual Precision Circular Ring Around Bottom Bubble (Calibrated for 1× DPR Full HD -> 2× Retina in ALL Modes!)
    const sealGroup = new THREE.Group();
    sealGroup.position.set(0, DROP_Y, 0);
    rig.add(sealGroup);

    const RING_R = DROP_RADIUS * 1.60;
    const sealBaseGeom = new THREE.TorusGeometry(RING_R, 0.0155, 16, 120);
    const sealBaseMat = new THREE.MeshStandardMaterial({
      color: isLightInit ? 0xb86c08 : 0xf2a33a,
      emissive: isLightInit ? 0x6b3a02 : 0xb5680b,
      emissiveIntensity: isLightInit ? 0.25 : 0.42,
      metalness: 0.72,
      roughness: 0.22,
      transparent: true,
      opacity: 0,
    });
    sealGroup.add(new THREE.Mesh(sealBaseGeom, sealBaseMat));

    const sealArcGeom = new THREE.TorusGeometry(RING_R, 0.0265, 16, 48, Math.PI * 0.44);
    const sealArcMat = new THREE.MeshStandardMaterial({
      color: isLightInit ? 0xc8740a : 0xffd57a,
      emissive: isLightInit ? 0x854904 : 0xf2a33a,
      emissiveIntensity: isLightInit ? 0.36 : 0.72,
      metalness: 0.8,
      roughness: 0.15,
      transparent: true,
      opacity: 0,
    });
    const sealArc1 = new THREE.Mesh(sealArcGeom, sealArcMat);
    const sealArc2 = new THREE.Mesh(sealArcGeom, sealArcMat);
    sealArc2.rotation.z = Math.PI;
    sealGroup.add(sealArc1, sealArc2);

    // 4 Precision Cardinal Vernier Ticks (Subtle Gold in Sift, Gleaming Emerald in Sealed)
    const tickGeom = new THREE.BoxGeometry(0.022, 0.095, 0.022);
    const tickMat = new THREE.MeshStandardMaterial({
      color: isLightInit ? 0xb86c08 : 0xffd57a,
      emissive: isLightInit ? 0x6b3a02 : 0xf2a33a,
      emissiveIntensity: 0.45,
      metalness: 0.8,
      roughness: 0.18,
      transparent: true,
      opacity: 0,
    });
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      const tick = new THREE.Mesh(tickGeom, tickMat);
      tick.position.set(Math.cos(a) * RING_R, Math.sin(a) * RING_R, 0);
      tick.rotation.z = a + Math.PI / 2;
      sealGroup.add(tick);
    }

    // Press-and-Hold Radial Distillation Charge Shader Plane (visible ONLY while holding!)
    const chargePlaneGeom = new THREE.PlaneGeometry(DROP_RADIUS * 3.85, DROP_RADIUS * 3.85);
    const chargeUniforms = {
      uProgress: { value: 0 },
      uLightMode: { value: isLightInit ? 1 : 0 },
    };
    const chargeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: chargeUniforms,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uProgress;
        uniform float uLightMode;
        varying vec2 vUv;
        void main() {
          if (uProgress < 0.02) discard;
          vec2 p = (vUv - 0.5) * 2.0;
          float r = length(p);
          float track = smoothstep(0.036, 0.0, abs(r - 0.84));
          float ang = mod(atan(p.x, p.y) + 6.2831853, 6.2831853) / 6.2831853;
          float arcFill = step(ang, uProgress) * smoothstep(0.055, 0.0, abs(r - 0.84));
          vec3 col = mix(vec3(0.98, 0.78, 0.36), vec3(0.75, 0.44, 0.04), uLightMode);
          float alpha = max(track * 0.22, arcFill * 0.96) * min(1.0, uProgress * 4.0);
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    const chargeMesh = new THREE.Mesh(chargePlaneGeom, chargeMat);
    chargeMesh.position.set(0, DROP_Y, 0.16);
    rig.add(chargeMesh);

    // Whisper-Quiet 3D Horological Orbital Gimbal Ring (0 opacity at rest; fades in ONLY during active 360° drag)
    const gimbalGeom = new THREE.TorusGeometry(2.38, 0.0085, 10, 128);
    const gimbalMat = new THREE.MeshBasicMaterial({
      color: isLightInit ? 0x12203f : 0xf4f0e8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const gimbalOuter = new THREE.Mesh(gimbalGeom, gimbalMat);
    const gimbalEq = new THREE.Mesh(gimbalGeom, gimbalMat.clone());
    gimbalEq.rotation.x = Math.PI / 2;
    rig.add(gimbalOuter, gimbalEq);

    // 36 Crisp, Deliberate 3D Interactive Claim Droplets (Calibrated for 1× DPR Full HD Clarity!)
    const MAX_CLAIMS = 36;
    const claimGeom = new THREE.SphereGeometry(0.064, 16, 16);
    const claimMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.12,
      roughness: 0.24,
      emissive: 0x000000,
    });
    const claimInst = new THREE.InstancedMesh(claimGeom, claimMat, MAX_CLAIMS);
    claimInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    claimInst.frustumCulled = false;
    claimInst.count = 0;
    // Initialize instanceColor before Frame 1 so USE_INSTANCING_COLOR compiles cleanly
    claimInst.setColorAt(0, new THREE.Color(0xffffff));
    if (claimInst.instanceColor) claimInst.instanceColor.setUsage(THREE.DynamicDrawUsage);
    rig.add(claimInst);

    const claims: Claim3D[] = [];
    const dummy = new THREE.Object3D();
    const tmpCol = new THREE.Color();

    const spawnClaim = (xWorld?: number, yWorld?: number, forceKind?: 'verified' | 'noise') => {
      if (claims.length >= MAX_CLAIMS) return;
      const isVerified = forceKind ? forceKind === 'verified' : Math.random() < 0.44;
      const x =
        xWorld !== undefined
          ? Math.max(-2.1, Math.min(2.1, xWorld))
          : isVerified
            ? (Math.random() - 0.5) * 1.35
            : (Math.random() < 0.5 ? -1 : 1) * (0.75 + Math.random() * 1.25);
      const y = yWorld !== undefined ? yWorld : 2.38 + Math.random() * 0.42;
      claims.push({
        x,
        y,
        z: (Math.random() - 0.5) * 0.22,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(0.55 + Math.random() * 0.35),
        vz: (Math.random() - 0.5) * 0.12,
        kind: isVerified ? 'verified' : 'noise',
        state: 'entering',
        life: 0,
        maxLife: 3.3 + Math.random() * 1.0,
        radius: isVerified ? 1.08 : 0.88,
      });
    };

    // Unified tactile pointer state (Hover Pour + Hold-to-Distill + Slow 360° Horological Auto-Rotate + Axis-Memory Flick Cruise + Elastic Drop Pull)
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const forceChargePreview = search.includes('charging=1');
    const forceOrbitPreview = search.includes('orbit=1');
    const forceFlipPreview = search.includes('flip=1');
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const AXIS_X = new THREE.Vector3(1, 0, 0);
    const AXIS_Y = new THREE.Vector3(0, 1, 0);
    const AXIS_Z = new THREE.Vector3(0, 0, 1);
    const DEFAULT_CRUISE_AXIS = new THREE.Vector3(0.05, 1.0, 0.0).normalize();
    const DEFAULT_CRUISE_SPEED = 0.62; // ~10.1s per full 360° 3D revolution (~35.5°/sec)
    const IDENTITY_Q = new THREE.Quaternion();
    const tmpQ1 = new THREE.Quaternion();
    const tmpQ2 = new THREE.Quaternion();
    const tmpVec = new THREE.Vector3();
    const frontNormal = new THREE.Vector3();
    const dropWorldVec = new THREE.Vector3();
    const tmpEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    const baseTiltQ = new THREE.Quaternion();

    const userQuat = new THREE.Quaternion();
    if (forceOrbitPreview) {
      userQuat.setFromEuler(new THREE.Euler(-0.32, 0.78, 0.22, 'YXZ'));
    } else if (forceFlipPreview) {
      userQuat.setFromEuler(new THREE.Euler(0.28, 2.55, -0.36, 'YXZ'));
    }

    const cruiseAxis = DEFAULT_CRUISE_AXIS.clone();
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, wx: 0, wy: 0, inside: false };
    const gesture = {
      mode: (forceChargePreview ? 'charge' : forceOrbitPreview || forceFlipPreview ? 'orbit' : 'idle') as
        | 'idle'
        | 'charge'
        | 'orbit'
        | 'pull-drop',
      pointerId: -1,
      downX: 0,
      downY: 0,
      prevX: 0,
      prevY: 0,
      prevAngle: 0,
      zRoll: false,
      downTime: 0,
      charge: forceChargePreview ? 0.68 : 0,
      chargeTriggered: false,
      lastChargeTick: 0,
      velX: 0,
      velY: 0,
      velZ: 0,
      extraSpeed: 0,
      cruiseSpeed: DEFAULT_CRUISE_SPEED,
      customSpin: false,
      hudTimer: 0,
      hoverBrake: 1,
      resetting: false,
      pullX: 0,
      pullY: 0,
      pullVelX: 0,
      pullVelY: 0,
      superHalo: 0,
      isSuperDrop: false,
    };
    let lastPourTs = 0;
    let lastHudText = '';
    const syncHud = (next: string) => {
      if (next !== lastHudText) {
        lastHudText = next;
        setHudLabel(next);
      }
    };

    const domEl = renderer.domElement;
    domEl.style.touchAction = 'none';
    domEl.style.cursor = 'grab';

    const onDoubleClick = () => {
      gesture.velX = 0;
      gesture.velY = 0;
      gesture.velZ = 0;
      gesture.extraSpeed = 0;
      gesture.cruiseSpeed = DEFAULT_CRUISE_SPEED;
      gesture.customSpin = false;
      cruiseAxis.copy(DEFAULT_CRUISE_AXIS);
      gesture.resetting = true;
      gesture.hudTimer = 0;
      setHasCustomSpin(false);
      syncHud('');
      soundEngine.playSieveDrop();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointer.wx = nx * 2.85;
      pointer.wy = ny * 2.85;
      pointer.inside = true;

      gesture.pointerId = e.pointerId;
      gesture.downX = e.clientX;
      gesture.downY = e.clientY;
      gesture.prevX = e.clientX;
      gesture.prevY = e.clientY;
      gesture.prevAngle = Math.atan2(ny, nx);
      gesture.zRoll = e.shiftKey || Math.hypot(nx, ny) > 0.68;
      gesture.downTime = performance.now();
      gesture.chargeTriggered = false;
      gesture.lastChargeTick = 0;
      gesture.resetting = false;
      gesture.velX = 0;
      gesture.velY = 0;
      gesture.velZ = 0;
      gesture.extraSpeed = 0;

      // Project the actual rotated bottom Saffron Drop position so grabbing it works at any gentle turn angle
      dropWorldVec.set(0, DROP_Y, 0).applyQuaternion(userQuat);
      frontNormal.set(0, 0, 1).applyQuaternion(userQuat);
      const faceFacing = Math.abs(frontNormal.z) > 0.55;
      if (faceFacing && Math.hypot(pointer.wx - dropWorldVec.x, pointer.wy - dropWorldVec.y) < 0.72 && entranceRef.current > 0.85) {
        gesture.mode = 'pull-drop';
        soundEngine.playTick(680);
      } else {
        gesture.mode = 'charge';
      }
      domEl.style.cursor = 'grabbing';
      try {
        domEl.setPointerCapture(e.pointerId);
      } catch {
        // ignore synthetic events
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = -(e.clientY / window.innerHeight - 0.5) * 2;
      const rect = container.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      pointer.inside = isInside;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      if (isInside) {
        pointer.wx = nx * 2.85;
        pointer.wy = ny * 2.85;
      }

      if (gesture.mode === 'pull-drop') {
        const dx = pointer.wx;
        const dy = pointer.wy - DROP_Y;
        const dist = Math.hypot(dx, dy);
        const maxPull = 0.72;
        const cl = dist > maxPull ? maxPull / dist : 1;
        gesture.pullX = dx * cl * 0.75;
        gesture.pullY = Math.min(0.24, dy * cl * 0.82);
        return;
      }

      if (gesture.mode === 'charge' || gesture.mode === 'orbit') {
        const moveDist = Math.hypot(e.clientX - gesture.downX, e.clientY - gesture.downY);
        if (gesture.mode === 'charge' && moveDist > 12 && gesture.charge < 0.65) {
          gesture.mode = 'orbit';
          gesture.prevX = e.clientX;
          gesture.prevY = e.clientY;
          gesture.prevAngle = Math.atan2(ny, nx);
        }
        if (gesture.mode === 'orbit') {
          const curAngle = Math.atan2(ny, nx);
          if (gesture.zRoll || e.shiftKey) {
            let dA = curAngle - gesture.prevAngle;
            if (dA > Math.PI) dA -= Math.PI * 2;
            if (dA < -Math.PI) dA += Math.PI * 2;
            tmpQ1.setFromAxisAngle(AXIS_Z, dA * 1.15);
            userQuat.premultiply(tmpQ1).normalize();
            gesture.velZ = Math.max(-9, Math.min(9, dA * 24));
            gesture.velX *= 0.6;
            gesture.velY *= 0.6;
          } else {
            const dx = (e.clientX - gesture.prevX) * 0.0115;
            const dy = (e.clientY - gesture.prevY) * 0.0115;
            tmpQ1.setFromAxisAngle(AXIS_Y, dx);
            tmpQ2.setFromAxisAngle(AXIS_X, dy);
            userQuat.premultiply(tmpQ1).premultiply(tmpQ2).normalize();
            gesture.velY = Math.max(-10, Math.min(10, dx * 26));
            gesture.velX = Math.max(-10, Math.min(10, dy * 26));
            gesture.velZ *= 0.6;
          }
          gesture.prevX = e.clientX;
          gesture.prevY = e.clientY;
          gesture.prevAngle = curAngle;
          gesture.hudTimer = 2.0;
          if (!gesture.customSpin) {
            gesture.customSpin = true;
            setHasCustomSpin(true);
          }
        }
        return;
      }

      if (isInside) {
        const now = performance.now();
        if (pointer.wy > 0.7 && pointer.wy < 2.6 && Math.abs(pointer.wx) < 2.2 && now - lastPourTs > 135 && entranceRef.current > 0.85) {
          lastPourTs = now;
          spawnClaim(pointer.wx, Math.max(pointer.wy, 1.95), Math.abs(pointer.wx) < 0.75 ? 'verified' : 'noise');
        }
      }
    };

    const finishGesture = (e?: PointerEvent) => {
      if (gesture.mode === 'idle') return;
      const prevMode = gesture.mode;
      const heldMs = performance.now() - gesture.downTime;

      if (prevMode === 'pull-drop') {
        if (Math.hypot(gesture.pullX, gesture.pullY) > 0.16) {
          soundEngine.playSpringSnap();
          dropVel += 3.1;
          rippleAge = 0;
          pulseClickRef.current();
        } else {
          gesture.isSuperDrop = false;
          condenseRef.current = 0;
          pulseClickRef.current();
        }
      } else if (prevMode === 'charge' && !gesture.chargeTriggered) {
        gesture.isSuperDrop = gesture.charge > 0.72;
        condenseRef.current = 0;
        if (gesture.charge > 0.72) {
          gesture.superHalo = 1.0;
          superCbRef.current?.();
        } else if (heldMs < 950) {
          pulseClickRef.current();
        }
      } else if (prevMode === 'orbit') {
        soundEngine.playTick(540);
        // Adopt the user's exact 3D flick axis & spin direction (CW / CCW / diagonal / Z-roll) as continuous cruise!
        const releaseSpeed = Math.hypot(gesture.velX, gesture.velY, gesture.velZ);
        if (releaseSpeed > 0.18) {
          tmpVec.set(gesture.velX, gesture.velY, gesture.velZ).normalize();
          cruiseAxis.copy(tmpVec);
          gesture.cruiseSpeed = 0.62;
          gesture.extraSpeed = pausedRef.current ? 0 : Math.min(8.5, Math.max(0, releaseSpeed - gesture.cruiseSpeed));
        } else {
          // User deliberately positioned the logo at an angle: preserve angle with gentle slow cruise
          gesture.cruiseSpeed = 0.36;
          gesture.extraSpeed = 0;
        }
        gesture.velX = 0;
        gesture.velY = 0;
        gesture.velZ = 0;
        gesture.hudTimer = 1.9;
      }

      gesture.mode = 'idle';
      domEl.style.cursor = 'grab';
      if (e && gesture.pointerId === e.pointerId) {
        try {
          domEl.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
      gesture.pointerId = -1;
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('dblclick', onDoubleClick);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', finishGesture);
    window.addEventListener('pointercancel', finishGesture);

    const resize = () => {
      const w = Math.max(260, container.clientWidth || 520);
      const h = Math.max(260, container.clientHeight || 520);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      rig.scale.setScalar(w < 360 ? 0.94 : 1.0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let isVisible = true;
    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.02 }
    );
    io.observe(container);

    const forceCondensePreview = search.includes('midcondense=1');
    if (
      search.includes('settled=1') ||
      forceCondensePreview ||
      forceChargePreview ||
      forceOrbitPreview ||
      forceFlipPreview
    ) {
      entranceRef.current = 1;
      for (let i = 0; i < 14; i++) {
        spawnClaim(undefined, 0.35 + Math.random() * 2.0, i % 2 === 0 ? 'verified' : undefined);
      }
      if (forceCondensePreview) {
        condenseRef.current = 0.44;
      }
    } else if (search.includes('midforge=1')) {
      entranceRef.current = 0.56;
      condenseRef.current = 0.28;
    }

    const clock = new THREE.Clock();
    let rafId = 0;
    let notifiedLive = false;
    let spawnAccum = 0;
    let autoPulseTimer = 0;
    let noiseBlend = 0;
    let sealedBlend = 0;
    let dropSquash = 0;
    let dropVel = 0;
    let rippleAge = forceCondensePreview ? 0.24 : 99;
    let prevImpact = false;
    let prevIsLight = isLightInit;
    let initialStreamSeeded =
      search.includes('settled=1') ||
      forceCondensePreview ||
      forceChargePreview ||
      forceOrbitPreview ||
      forceFlipPreview;
    let entranceDropFired =
      search.includes('settled=1') ||
      forceCondensePreview ||
      forceChargePreview ||
      forceOrbitPreview ||
      forceFlipPreview;

    const darkFaceCol = new THREE.Color(0xf4efe4);
    const lightFaceCol = new THREE.Color(0x162b5c);
    const darkSideCol = new THREE.Color(0x284e9a);
    const lightSideCol = new THREE.Color(0x22468c);
    const noiseFaceDark = new THREE.Color(0xb8a8a6);
    const noiseFaceLight = new THREE.Color(0x2c2232);
    const ringColTmp = new THREE.Color();
    const ringEmTmp = new THREE.Color();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const dt = Math.min(Math.max(0, clock.getDelta()), 0.05);
      const elapsed = clock.elapsedTime;
      const curMode = modeRef.current;
      const modeVal = curMode === 'noise' ? 1 : curMode === 'sealed' ? 2 : 0;
      const isLight = themeRef.current === 'light';
      const damp = 1 - Math.exp(-dt * 7.2);

      noiseBlend += ((curMode === 'noise' ? 1 : 0) - noiseBlend) * damp;
      sealedBlend += ((curMode === 'sealed' ? 1 : 0) - sealedBlend) * damp;

      if (resetQuatRef.current) {
        resetQuatRef.current = false;
        userQuat.copy(IDENTITY_Q);
        cruiseAxis.copy(DEFAULT_CRUISE_AXIS);
        gesture.velX = 0;
        gesture.velY = 0;
        gesture.velZ = 0;
        gesture.extraSpeed = 0;
        gesture.cruiseSpeed = DEFAULT_CRUISE_SPEED;
        gesture.customSpin = false;
        gesture.resetting = false;
        gesture.hudTimer = 0;
        setHasCustomSpin(false);
        syncHud('');
      }

      // Press-and-Hold Distillation Charge (0 -> 1) + Continuous Smooth 3D Whole-Logo Auto-Rotate & Axis-Memory Cruise
      const rotAngleFromHome = 2 * Math.acos(Math.min(1, Math.abs(userQuat.w)));
      const wantBrake = hoveredRef.current && gesture.mode === 'idle' && !gesture.customSpin ? 0.58 : 1.0;
      gesture.hoverBrake += (wantBrake - gesture.hoverBrake) * (1 - Math.exp(-dt * 5.0));

      if (gesture.mode === 'charge' && !gesture.chargeTriggered) {
        if (!forceChargePreview) {
          gesture.charge = Math.min(1, gesture.charge + dt * 0.96);
        }
        const nowMs = performance.now();
        if (gesture.charge > 0.12 && nowMs - gesture.lastChargeTick > 135) {
          gesture.lastChargeTick = nowMs;
          soundEngine.playChargeTick(gesture.charge);
          spawnClaim((Math.random() - 0.5) * 2.1, 2.35, 'verified');
        }
        syncHud(gesture.charge > 0.08 ? `DISTILLING TRUTH · ${Math.round(gesture.charge * 100)}%` : '');
        if (gesture.charge >= 1.0 && !forceChargePreview) {
          gesture.chargeTriggered = true;
          gesture.isSuperDrop = true;
          condenseRef.current = 0;
          gesture.superHalo = 1.0;
          syncHud('');
          superCbRef.current?.();
        }
      } else {
        if (!forceChargePreview) gesture.charge = Math.max(0, gesture.charge - dt * 3.8);

        if (gesture.mode === 'idle' && !forceOrbitPreview && !forceFlipPreview) {
          if (gesture.resetting) {
            userQuat.slerp(IDENTITY_Q, 1 - Math.exp(-dt * 7.5));
            if (2 * Math.acos(Math.min(1, Math.abs(userQuat.w))) < 0.012) {
              userQuat.copy(IDENTITY_Q);
              gesture.resetting = false;
            }
          } else if (entranceRef.current > 0.25) {
            const ramp = Math.min(1, (entranceRef.current - 0.25) / 0.45);
            const smoothRamp = ramp * ramp * (3 - 2 * ramp);
            const motionScale = prefersReducedMotion ? 0.35 : 1.0;
            const baseSpin = pausedRef.current ? 0 : gesture.cruiseSpeed * gesture.hoverBrake * motionScale;
            const activeSpeed = (baseSpin + gesture.extraSpeed) * smoothRamp;
            if (activeSpeed > 0.002) {
              tmpQ1.setFromAxisAngle(cruiseAxis, activeSpeed * dt);
              userQuat.premultiply(tmpQ1).normalize();
            }
            if (gesture.extraSpeed > 0.004) {
              gesture.extraSpeed *= Math.exp(-dt * (pausedRef.current ? 4.5 : 2.4));
            } else {
              gesture.extraSpeed = 0;
            }
          }
        }

        if (gesture.hudTimer > 0 && gesture.mode === 'idle') {
          gesture.hudTimer = Math.max(0, gesture.hudTimer - dt);
        }

        if (gesture.mode === 'orbit' || gesture.hudTimer > 0.02 || forceOrbitPreview || forceFlipPreview) {
          tmpEuler.setFromQuaternion(userQuat, 'YXZ');
          const dx = Math.round(THREE.MathUtils.radToDeg(tmpEuler.x));
          const dy = Math.round(THREE.MathUtils.radToDeg(tmpEuler.y));
          const dz = Math.round(THREE.MathUtils.radToDeg(tmpEuler.z));
          const fmt = (n: number) => `${n >= 0 ? '+' : ''}${n}°`;
          syncHud(
            gesture.mode === 'orbit' && gesture.zRoll
              ? `Z-ROLL · Z ${fmt(dz)} · DBL-CLICK RESET`
              : `AXIS LOCKED · X ${fmt(dx)}  Y ${fmt(dy)}  Z ${fmt(dz)} · DBL-CLICK`
          );
        } else if (gesture.mode === 'pull-drop') {
          syncHud('RELEASE TO CONDENSE');
        } else if (!forceChargePreview) {
          syncHud('');
        }
      }
      gesture.superHalo = Math.max(0, gesture.superHalo - dt * 0.65);

      if (gesture.mode !== 'pull-drop') {
        const ax = -190 * gesture.pullX - 13 * gesture.pullVelX;
        const ay = -190 * gesture.pullY - 13 * gesture.pullVelY;
        gesture.pullVelX += ax * dt;
        gesture.pullVelY += ay * dt;
        gesture.pullX += gesture.pullVelX * dt;
        gesture.pullY += gesture.pullVelY * dt;
      }

      if (entranceRef.current < 1 && !search.includes('midforge=1')) {
        entranceRef.current = Math.min(1, entranceRef.current + dt * 0.72);
      }
      const ent = entranceRef.current;
      const bodyEase = 1 - Math.pow(1 - Math.min(1, ent / 0.62), 3);
      const dropAppear = 1 - Math.pow(1 - Math.min(1, Math.max(0, (ent - 0.52) / 0.42)), 3);

      // Clean architectural top-down clip reveal (no harsh laser bar)
      revealClip.constant = -THREE.MathUtils.lerp(2.0, -1.85, bodyEase);

      if (!entranceDropFired && ent >= 0.48) {
        entranceDropFired = true;
        condenseRef.current = 0;
      }

      if (!initialStreamSeeded && ent >= 0.66) {
        initialStreamSeeded = true;
        for (let i = 0; i < 7; i++) {
          spawnClaim(undefined, 0.75 + Math.random() * 1.65, i < 4 ? 'verified' : 'noise');
        }
      }

      if (curMode === 'sift' && ent >= 0.99 && condenseRef.current >= 1 && gesture.mode === 'idle') {
        autoPulseTimer += dt;
        if (autoPulseTimer > 2.6) {
          autoPulseTimer = 0;
          gesture.isSuperDrop = false;
          condenseRef.current = 0;
          pulseCbRef.current?.();
        }
      }

      if (condenseRef.current < 1 && !search.includes('midforge=1') && !forceCondensePreview) {
        condenseRef.current = Math.min(1, condenseRef.current + dt * 0.85);
      }
      const cT = condenseRef.current;

      // Liquid-Gold Teardrop Condensation + Tapered Meniscus across the exact 0.6S gap
      if (gesture.charge > 0.14 && noiseBlend < 0.4 && cT >= 0.66) {
        pearlMesh.visible = true;
        meniscusMesh.visible = true;
        const dropOffset = 0.06 + gesture.charge * 0.25;
        pearlMesh.position.set(0, APEX_Y - dropOffset, 0.03);
        pearlMesh.scale.set(0.42 + gesture.charge * 0.56, 0.48 + gesture.charge * 1.15, 0.42 + gesture.charge * 0.56);
        meniscusMesh.position.set(0, APEX_Y - dropOffset * 0.42, 0.03);
        meniscusMesh.scale.set(0.55 + gesture.charge * 0.45, Math.max(0.35, dropOffset * 3.4), 0.55 + gesture.charge * 0.45);
      } else if (cT < 0.66 && noiseBlend < 0.4) {
        pearlMesh.visible = true;
        const sc = gesture.isSuperDrop ? 1.24 : 1.0;
        if (cT < 0.40) {
          const p = cT / 0.40;
          const ease = 1 - Math.pow(1 - p, 2);
          const dropOffset = 0.05 + ease * 0.26;
          pearlMesh.position.set(0, APEX_Y - dropOffset, 0.03);
          pearlMesh.scale.set((0.40 + ease * 0.54) * sc, (0.48 + ease * 1.08) * sc, (0.40 + ease * 0.54) * sc);
          meniscusMesh.visible = true;
          meniscusMesh.position.set(0, APEX_Y - dropOffset * 0.44, 0.03);
          meniscusMesh.scale.set((0.72 - p * 0.34) * sc, Math.max(0.35, dropOffset * 3.5) * sc, (0.72 - p * 0.34) * sc);
        } else {
          meniscusMesh.visible = false;
          const p = (cT - 0.40) / 0.26;
          const accel = p * p;
          pearlMesh.position.set(0, THREE.MathUtils.lerp(APEX_Y - 0.31, DROP_Y, accel), 0.03);
          pearlMesh.scale.set(0.84 * sc, 1.24 * sc, 0.84 * sc);
        }
      } else {
        pearlMesh.visible = false;
        meniscusMesh.visible = false;
      }

      if (cT >= 0.62 && cT < 0.95 && !prevImpact) {
        prevImpact = true;
        dropVel += gesture.isSuperDrop ? 4.2 : 2.8;
        rippleAge = 0;
      }
      if (cT < 0.42) prevImpact = false;

      // Damped spring squash & stretch on Saffron Drop
      const accel = -140 * dropSquash - 12 * dropVel;
      dropVel += accel * dt;
      dropSquash += dropVel * dt;

      // Dual Concentric Impact Ripples (Primary + Secondary Echo — Unclipped & Crisp on 1× DPR Full HD)
      if (rippleAge < 1.38) {
        if (!forceCondensePreview) rippleAge += dt;
        const p1 = Math.min(1, rippleAge / 1.15);
        const e1 = 1 - Math.pow(1 - p1, 2.5);
        rippleMesh.scale.setScalar(0.38 + e1 * 1.12);
        rippleUniforms.uOpacity.value = rippleAge < 1.15 ? (1 - p1) * 0.94 : 0;

        const age2 = rippleAge - 0.18;
        if (age2 > 0 && age2 < 1.18) {
          const p2 = Math.min(1, age2 / 1.18);
          const e2 = 1 - Math.pow(1 - p2, 2.5);
          rippleMesh2.scale.setScalar(0.35 + e2 * 0.86);
          rippleUniforms2.uOpacity.value = (1 - p2) * 0.58;
        } else {
          rippleUniforms2.uOpacity.value = 0;
        }
      } else {
        rippleUniforms.uOpacity.value = 0;
        rippleUniforms2.uOpacity.value = 0;
      }

      // Seamless vs 3-Piece Kinematic Aperture Split in Raw Chat
      const showSplit = noiseBlend > 0.015;
      wholeMesh.visible = !showSplit;
      innerRimMesh.visible = !showSplit;
      innerRimBackMesh.visible = !showSplit;
      splitGroup.visible = showSplit;
      if (showSplit) {
        const es = noiseBlend * noiseBlend * (3 - 2 * noiseBlend);
        barMesh.position.y = es * 0.32;
        leftPivot.position.set(tx(198) - es * 0.24, ty(240) - es * 0.08, 0);
        leftPivot.rotation.z = es * 0.075;
        rightPivot.position.set(tx(314) + es * 0.24, ty(240) - es * 0.08, 0);
        rightPivot.rotation.z = -es * 0.075;
      }

      // Theme & Mode color synchronization (instant lockstep snap on Dark <-> Light toggle!)
      const themeSwitched = isLight !== prevIsLight;
      prevIsLight = isLight;
      const matBlend = themeSwitched ? 1 : damp;
      const curL = themeSwitched
        ? isLight
          ? 1
          : 0
        : dropUniforms.uLightMode.value + ((isLight ? 1 : 0) - dropUniforms.uLightMode.value) * damp;
      dropUniforms.uLightMode.value = curL;
      floorUniforms.uLightMode.value = curL;
      rippleUniforms.uLightMode.value = curL;
      rippleUniforms2.uLightMode.value = curL;
      dropUniforms.uTime.value = elapsed;
      dropUniforms.uMode.value = modeVal;
      dropUniforms.uPulse.value = Math.min(1, Math.abs(dropSquash) * 4.5);

      const targetFace = curMode === 'noise' ? (isLight ? noiseFaceLight : noiseFaceDark) : isLight ? lightFaceCol : darkFaceCol;
      faceMat.color.lerp(targetFace, matBlend);
      faceMat.metalness += ((isLight ? 0.12 : 0.16) - faceMat.metalness) * matBlend;
      faceMat.roughness += ((isLight ? 0.28 : 0.24) - faceMat.roughness) * matBlend;
      faceMat.envMapIntensity += ((isLight ? 1.05 : 1.32) - faceMat.envMapIntensity) * matBlend;
      sideMat.color.lerp(isLight ? lightSideCol : darkSideCol, matBlend);
      innerRimMat.color.setHex(
        curMode === 'sealed' ? (isLight ? 0x0c865c : 0x3ce3a8) : isLight ? 0xd08314 : 0xf6b94c
      );
      const ripHex =
        curMode === 'sealed' ? (isLight ? 0x0c7e56 : 0x3ce3a8) : isLight ? 0xb86c08 : 0xffcb66;
      rippleUniforms.uColor.value.setHex(ripHex);
      rippleUniforms2.uColor.value.setHex(ripHex);
      pearlMat.color.setHex(isLight ? 0xd97d0c : 0xffc65c);
      pearlMat.emissive.setHex(isLight ? 0x994c04 : 0xe6840e);
      pearlMat.emissiveIntensity = isLight ? 0.42 : 0.68;

      // Perpetual Precision Circular Ring Around Bottom Bubble (Saffron in Sift -> Emerald in Sealed -> Crimson in Raw Chat)
      const emeraldVis = Math.max(sealedBlend, gesture.superHalo);
      const impactBoost = Math.min(1, Math.abs(dropSquash) * 4.2);
      const baseRingHex =
        emeraldVis > 0.35
          ? isLight ? 0x0c865c : 0x3ce3a8
          : noiseBlend > 0.45
            ? isLight ? 0xb8322c : 0xe05852
            : isLight ? 0xb86c08 : 0xf2a33a;
      const arcRingHex =
        emeraldVis > 0.35
          ? isLight ? 0x0a724d : 0x62f5c0
          : noiseBlend > 0.45
            ? isLight ? 0x992620 : 0xf07169
            : isLight ? 0xc8740a : 0xffd57a;
      ringColTmp.setHex(baseRingHex);
      sealBaseMat.color.lerp(ringColTmp, matBlend);
      ringEmTmp.setHex(baseRingHex);
      sealBaseMat.emissive.lerp(ringEmTmp, matBlend);
      sealBaseMat.emissiveIntensity = (isLight ? 0.26 : 0.46) + impactBoost * 0.35;

      ringColTmp.setHex(arcRingHex);
      sealArcMat.color.lerp(ringColTmp, matBlend);
      sealArcMat.emissive.lerp(ringColTmp, matBlend);
      sealArcMat.emissiveIntensity = (isLight ? 0.38 : 0.72) + impactBoost * 0.45;

      tickMat.color.copy(sealArcMat.color);
      tickMat.emissive.copy(sealArcMat.emissive);

      const baseRingAlpha = emeraldVis > 0.35 ? 0.56 : noiseBlend > 0.45 ? 0.42 : isLight ? 0.46 : 0.50;
      const arcRingAlpha = emeraldVis > 0.35 ? 0.98 : noiseBlend > 0.45 ? 0.64 : 0.94;
      const tickAlpha = emeraldVis > 0.35 ? 0.94 : noiseBlend > 0.45 ? 0.32 : 0.58;
      sealBaseMat.opacity = dropAppear * baseRingAlpha;
      sealArcMat.opacity = dropAppear * arcRingAlpha;
      tickMat.opacity = dropAppear * tickAlpha;
      const ringBreath = 1 + Math.abs(dropSquash) * 0.26 + gesture.charge * 0.06;
      sealGroup.scale.setScalar(Math.max(0.001, dropAppear * ringBreath));
      // Keep the precision halo ring anchored smoothly to the rotating 3D sculpture (no competing spin)
      sealGroup.rotation.z = 0;
      sealGroup.rotation.x = 0;

      chargeUniforms.uProgress.value = gesture.charge;
      chargeUniforms.uLightMode.value = curL;

      // Flush-mounted horological brass/emerald aperture inlays on BOTH front & back faces
      innerRimMesh.position.z = 0;
      innerRimBackMesh.position.z = -0.52;

      // Update Saffron Drop buoyancy, magnetic cursor tether, elastic pull & squash-stretch
      let magX = 0;
      let magY = 0;
      if (pointer.inside && gesture.mode === 'idle') {
        const d = Math.hypot(pointer.wx, pointer.wy - DROP_Y);
        if (d < 1.55 && d > 0.01) {
          const pull = (1 - d / 1.55) * 0.14;
          magX = (pointer.wx / d) * pull;
          magY = ((pointer.wy - DROP_Y) / d) * pull;
        }
      }
      dropGroup.position.x += (magX + gesture.pullX - dropGroup.position.x) * damp;
      dropGroup.position.y += (DROP_Y + magY + gesture.pullY + Math.sin(elapsed * 1.65) * 0.032 - dropGroup.position.y) * damp;
      dropGroup.position.z += (0 - dropGroup.position.z) * damp;
      const sq = Math.max(-0.2, Math.min(0.24, dropSquash));
      const dSc = Math.max(0.001, dropAppear * (1 + gesture.charge * 0.09));
      dropGroup.scale.set(dSc * (1 + sq * 0.85), dSc * (1 - sq * 0.72), dSc * (1 + sq * 0.4));
      sealGroup.position.copy(dropGroup.position);
      rippleMesh.position.set(dropGroup.position.x, dropGroup.position.y, dropGroup.position.z - 0.04);
      rippleMesh2.position.set(dropGroup.position.x, dropGroup.position.y, dropGroup.position.z - 0.05);
      chargeMesh.position.set(dropGroup.position.x, dropGroup.position.y, dropGroup.position.z + 0.16);
      floorUniforms.uIntensity.value = dropAppear;

      // Calm 3D claim physics
      if (ent > 0.72 && curMode !== 'sealed') {
        spawnAccum += dt * (curMode === 'noise' ? 6.8 : 5.2);
        while (spawnAccum >= 1) {
          spawnAccum -= 1;
          spawnClaim(undefined, undefined, curMode === 'noise' ? (Math.random() < 0.8 ? 'noise' : 'verified') : undefined);
        }
      }

      for (let i = claims.length - 1; i >= 0; i--) {
        const m = claims[i];
        m.life += dt;
        if (m.life >= m.maxLife || m.y < -3.0 || Math.abs(m.x) > 3.2) {
          claims.splice(i, 1);
          continue;
        }
        if (noiseBlend > 0.55) {
          m.vy = Math.max(-2.6, m.vy - 1.5 * dt);
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          continue;
        }
        if (m.state === 'entering') {
          m.vy = Math.max(-1.75, m.vy - 0.65 * dt);
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.kind === 'noise' && m.y <= ty(114) && m.y >= ty(155) && Math.abs(m.x) >= 0.76 && Math.abs(m.x) <= 2.3) {
            const s = m.x >= 0 ? 1 : -1;
            m.state = 'deflected';
            m.vx = s * (0.95 + Math.random() * 0.6);
            m.vy = 0.42 + Math.random() * 0.25;
            m.vz = (m.z >= 0 ? 1 : -1) * (0.42 + Math.random() * 0.35);
          } else if (m.y <= ty(150)) {
            if (m.kind === 'verified' && Math.abs(m.x) < 0.85) {
              m.state = 'funneling';
            } else {
              const s = m.x >= 0 ? 1 : -1;
              m.state = 'deflected';
              m.vx = s * (1.1 + Math.random() * 0.55);
              m.vy = 0.22;
              m.vz = (m.z >= 0 ? 1 : -1) * (0.35 + Math.random() * 0.3);
            }
          }
        } else if (m.state === 'deflected') {
          m.vy -= 1.65 * dt;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          m.z += m.vz * dt;
        } else {
          m.vx += (0 - m.x) * 6.5 * dt;
          m.vx *= 0.88;
          m.vy = Math.max(-2.2, m.vy - 1.6 * dt);
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          m.z *= 1 - Math.min(1, dt * 3.5);
          if (m.y <= DROP_Y + 0.16) {
            dropVel += 0.52;
            claims.splice(i, 1);
          }
        }
      }

      const activeClaims = Math.min(claims.length, MAX_CLAIMS);
      claimInst.count = activeClaims;
      for (let i = 0; i < activeClaims; i++) {
        const m = claims[i];
        const fade = Math.min(1, (2.82 - m.y) / 0.36) * Math.min(1, (m.maxLife - m.life) / 0.55);
        const sc = Math.max(0.001, m.radius * Math.max(0, fade));
        dummy.position.set(m.x, m.y, m.z);
        if (m.kind === 'verified' && m.state === 'funneling') {
          dummy.scale.set(sc * 0.88, sc * 1.52, sc * 0.88);
        } else {
          dummy.scale.setScalar(sc);
        }
        dummy.updateMatrix();
        claimInst.setMatrixAt(i, dummy.matrix);
        if (m.kind === 'verified') {
          tmpCol.setHex(isLight ? 0xd97d0c : 0xffd26e);
        } else if (m.state === 'deflected' || noiseBlend > 0.5) {
          tmpCol.setHex(isLight ? 0xc23c34 : 0xff6b62);
        } else {
          tmpCol.setHex(isLight ? 0x34548f : 0x9ec0f5);
        }
        claimInst.setColorAt(i, tmpCol);
      }
      if (activeClaims > 0) {
        claimInst.instanceMatrix.needsUpdate = true;
        if (claimInst.instanceColor) claimInst.instanceColor.needsUpdate = true;
      }

      // Cursor-driven 3D studio light glide + Full 360° Quaternion Orientation & Hold Gravity Zoom!
      const ptrDamp = 1 - Math.exp(-dt * 5.0);
      pointer.x += (pointer.tx - pointer.x) * ptrDamp;
      pointer.y += (pointer.ty - pointer.y) * ptrDamp;
      keyLight.position.x = 3.8 + pointer.x * 3.8 + Math.sin(elapsed * 0.48) * 1.8;
      keyLight.position.y = 6.2 + pointer.y * 2.2;

      // Subtle sculptural breathing pitch tilt layered gently over the continuous 3D rotation
      const isPaused = pausedRef.current;
      const breatheWeight = isPaused ? 0 : gesture.customSpin ? 0.16 : 0.45;
      tmpEuler.set(
        (-pointer.y * 0.08 + Math.sin(elapsed * 0.42) * 0.11) * breatheWeight,
        pointer.x * 0.12 * (isPaused ? 0 : gesture.customSpin ? 0.25 : 0.55),
        Math.sin(elapsed * 0.31) * 0.03 * breatheWeight,
        'YXZ'
      );
      baseTiltQ.setFromEuler(tmpEuler);
      rig.quaternion.copy(userQuat).multiply(baseTiltQ);
      // Avoid unused variable warning for rotAngleFromHome
      void rotAngleFromHome;
      const targetRigY = isPaused ? 0.22 : 0.22 + Math.sin(elapsed * 0.95) * 0.04;
      rig.position.y += (targetRigY - rig.position.y) * damp;
      camera.position.z = 11.25 - (hoveredRef.current ? 0.14 : 0) - gesture.charge * 0.42;

      // Orbital gimbal reticle fades in smoothly ONLY while actively dragging 360°
      const wantGimbal = gesture.mode === 'orbit' || forceOrbitPreview || forceFlipPreview ? 1 : 0;
      const gTargetOp = wantGimbal * (gesture.zRoll ? 0.34 : 0.16);
      gimbalMat.opacity += (gTargetOp - gimbalMat.opacity) * damp;
      gimbalMat.color.setHex(
        gesture.zRoll ? (isLight ? 0xb86c08 : 0xf2a33a) : isLight ? 0x12203f : 0xf4f0e8
      );
      const eqMat = gimbalEq.material as THREE.MeshBasicMaterial;
      eqMat.opacity += (wantGimbal * 0.11 - eqMat.opacity) * damp;
      eqMat.color.setHex(isLight ? 0x12203f : 0xf4f0e8);

      renderer.render(scene, camera);
      if (!notifiedLive) {
        notifiedLive = true;
        setWebglLive(true);
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      io.disconnect();
      ro.disconnect();
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('dblclick', onDoubleClick);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finishGesture);
      window.removeEventListener('pointercancel', finishGesture);
      studioEnv.dispose();
      brushTex.dispose();
      wholeGeom.dispose();
      barGeom.dispose();
      leftGeom.dispose();
      rightGeom.dispose();
      innerRimGeom.dispose();
      innerRimMat.dispose();
      faceMat.dispose();
      sideMat.dispose();
      pearlGeom.dispose();
      meniscusGeom.dispose();
      pearlMat.dispose();
      dropGeom.dispose();
      dropMat.dispose();
      floorGeom.dispose();
      floorMat.dispose();
      rippleGeom.dispose();
      rippleMat.dispose();
      rippleMat2.dispose();
      sealBaseGeom.dispose();
      sealBaseMat.dispose();
      sealArcGeom.dispose();
      sealArcMat.dispose();
      tickGeom.dispose();
      tickMat.dispose();
      chargePlaneGeom.dispose();
      chargeMat.dispose();
      gimbalGeom.dispose();
      gimbalMat.dispose();
      (gimbalEq.material as THREE.Material).dispose();
      claimGeom.dispose();
      claimMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    entranceRef.current = 0;
    condenseRef.current = 1;
    resetQuatRef.current = true;
    setReplayNonce((n) => n + 1);
  };

  const liveActive = webglLive || useCanvas2D;

  return (
    <div
      className={`logo-hero-stage mode-${mode}`}
      data-engine={useCanvas2D ? 'canvas2d' : 'webgl2'}
      id="sculpture-pulse-btn"
      role="button"
      tabIndex={0}
      aria-label="Interactive 3D Vivechak sieve sculpture — drag to orbit 3D, hold to distill truth, pull the drop, or press Enter"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPulseClick();
        }
      }}
      onPointerEnter={() => {
        hoveredRef.current = true;
        setHoveredStage(true);
      }}
      onPointerLeave={() => {
        hoveredRef.current = false;
        setHoveredStage(false);
      }}
      onPointerDown={() => {
        setHasInteracted(true);
      }}
    >
      <div className={`logo-prelude-svg ${liveActive ? 'is-hidden' : ''}`} aria-hidden={liveActive}>
        <svg viewBox="0 0 512 512" className="logo-hero-svg" role="img" aria-label="Vivechak Epistemic Sieve mark">
          <path d={`${OUTER_SVG} ${INNER_SVG}`} fillRule="evenodd" className="vck-mark-body" />
          <circle cx="256" cy="374.16" r="34.5" fill="none" stroke="#F2A33A" strokeOpacity="0.38" strokeWidth="1.6" />
          <circle cx="256" cy="374.16" r="21.6" fill="#F2A33A" />
        </svg>
      </div>

      {!useCanvas2D ? (
        <div ref={hostRef} className={`logo-webgl-host ${webglLive ? 'is-live' : ''}`} />
      ) : (
        <VivechakLogoCanvas2D
          mode={mode}
          theme={theme}
          impulseNonce={impulseNonce}
          replayNonce={replayNonce}
          rotationPaused={rotationPaused}
          onQuickPulse={onPulseClick}
          onSuperDistill={onSuperDistill}
          onTruthPulse={onTruthPulse}
        />
      )}

      <div className="logo-pulse-layer" aria-hidden="true">
        <AnimatePresence>
          {impulseNonce > 0 && (
            <motion.span
              key={impulseNonce}
              className={`sculpture-pulse-tag mono ${impulseText.includes('EXIT 0') ? 'is-super' : ''}`}
              initial={{ opacity: 0.98, y: 12, scale: 0.92 }}
              animate={{ opacity: 0, y: -38, scale: 1.02 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {impulseText}
            </motion.span>
          )}
        </AnimatePresence>
        {hoveredStage && !hasInteracted && !hudLabel && mode === 'sift' && (
          <span className="logo-first-whisper mono">DRAG TO SPIN · HOLD TO DISTILL</span>
        )}
        {hudLabel && <span className="logo-hud-chip mono">{hudLabel}</span>}
      </div>

      <div className="logo-corner-controls">
        {hasCustomSpin && (
          <button
            type="button"
            id="btn-reset-axis"
            className="logo-replay-btn is-visible mono"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playSieveDrop();
              resetQuatRef.current = true;
            }}
            title="Reset rotation axis & upright angle"
            aria-label="Reset 3D rotation axis"
          >
            <RotateCcw size={11} />
            <span>Reset Axis</span>
          </button>
        )}
        <button
          type="button"
          id="btn-replay-logo"
          className="logo-replay-btn mono"
          onClick={handleReplay}
          title="Replay entrance & liquid condensation"
          aria-label="Replay Vivechak logo animation"
        >
          <RotateCcw size={11} />
          <span>Replay</span>
        </button>
      </div>
    </div>
  );
};
