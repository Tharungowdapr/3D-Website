import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Environment, Lightformer } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Rocket, type Live } from "./Rocket";
import { CloudDeck, EarthBelow, GroundSmoke, HangarDust, LaunchPad } from "./Environment";
import { clamp, damp, lerp, seg, smooth } from "@/lib/timeline";
import { useMouseParallax, useScrollRef } from "@/hooks/useScrollProgress";

type Key = { t: number; pos: [number, number, number]; look: [number, number, number] };

const KEYS: Key[] = [
  { t: 0.0, pos: [0, 22, 190], look: [0, 18, 0] },
  { t: 0.06, pos: [0, 24, 96], look: [0, 20, 0] },
  { t: 0.12, pos: [-8.5, 27.5, 19], look: [-14, 26, 10] },
  { t: 0.2, pos: [22, 19.5, 3], look: [16, 18, -6] },
  { t: 0.28, pos: [-12.5, 10, -6], look: [-18, 9, -14] },
  { t: 0.36, pos: [11, 4, 27], look: [20, 3, 14] },
  { t: 0.44, pos: [7, -8.5, 33], look: [10, -10, 26] },
  { t: 0.52, pos: [0, 24, 104], look: [0, 24, 0] },
  { t: 0.62, pos: [46, 26, 76], look: [0, 20, 0] },
  { t: 0.72, pos: [0, 20, 92], look: [0, 20, 0] },
  { t: 0.79, pos: [26, 3.5, 42], look: [0, 20, 0] },
  { t: 0.85, pos: [34, 17, 64], look: [0, 20, 0] },
  { t: 0.895, pos: [15, 2.5, 32], look: [0, 7, 0] },
  { t: 0.93, pos: [32, 26, 74], look: [0, 24, 0] },
  { t: 0.965, pos: [14, 30, 52], look: [0, 24, 0] },
  { t: 0.99, pos: [-34, 30, 66], look: [0, 22, 0] },
  { t: 1.0, pos: [-96, 44, 170], look: [0, 20, 0] },
];

function sampleCamera(p: number) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1]!.t) i++;
  const a = KEYS[i]!;
  const b = KEYS[i + 1]!;
  const t = smooth(clamp((p - a.t) / Math.max(0.0001, b.t - a.t)));
  return {
    px: lerp(a.pos[0], b.pos[0], t),
    py: lerp(a.pos[1], b.pos[1], t),
    pz: lerp(a.pos[2], b.pos[2], t),
    lx: lerp(a.look[0], b.look[0], t),
    ly: lerp(a.look[1], b.look[1], t),
    lz: lerp(a.look[2], b.look[2], t),
  };
}

export const liftAt = (p: number) => Math.pow(clamp((p - 0.905) / 0.095), 2.4) * 1500;
export const ignitionAt = (p: number) => seg(p, 0.868, 0.905);

type World = Live & { pad: number; space: number; clouds: number; smoke: number };

function SceneContents() {
  const scroll = useScrollRef();
  const mouse = useMouseParallax();
  const { camera, scene } = useThree();
  const target = useRef(new THREE.Vector3(0, 18, 0));
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const starsGroup = useRef<THREE.Group>(null);
  const padGroup = useRef<THREE.Group>(null);
  const cloudGroup = useRef<THREE.Group>(null);
  const earthGroup = useRef<THREE.Group>(null);

  const world = useMemo<World>(
    () => ({ p: 0, ign: 0, lift: 0, pad: 0, space: 0, clouds: 0, smoke: 0 }),
    [],
  );

  const fog = useMemo(() => new THREE.FogExp2(new THREE.Color("#0a1220"), 0.0026), []);
  scene.fog = fog;

  useFrame((state, dt) => {
    const p = scroll.current;
    const d = Math.min(dt, 0.05);

    world.p = p;
    world.ign = ignitionAt(p);
    world.lift = liftAt(p);
    world.pad = seg(p, 0.72, 0.79);
    world.space = clamp((p - 0.928) / 0.045);
    world.clouds = seg(p, 0.910, 0.928) * (1 - seg(p, 0.934, 0.949));
    world.smoke = clamp(world.ign * 1.25) * (1 - clamp((world.lift - 260) / 420));

    const k = sampleCamera(p);
    const follow = clamp((p - 0.905) / 0.015) * world.lift;
    const shake = world.ign * (1 - clamp((p - 0.95) / 0.03)) * 0.3;
    const t = state.clock.elapsedTime;

    camera.position.set(
      damp(camera.position.x, k.px + mouse.current.x * 2.4 + Math.sin(t * 31) * shake, 3.2, d),
      damp(camera.position.y, k.py + follow - mouse.current.y * 1.5 + Math.cos(t * 27) * shake, 3.2, d),
      damp(camera.position.z, k.pz, 3.2, d),
    );
    target.current.set(
      damp(target.current.x, k.lx, 3.6, d),
      damp(target.current.y, k.ly + follow, 3.6, d),
      damp(target.current.z, k.lz, 3.6, d),
    );
    camera.lookAt(target.current);

    fog.density = lerp(0.0026, 0.0, world.space) * lerp(1, 0.5, world.pad);
    if (keyLight.current) {
      keyLight.current.intensity = lerp(2.6, 4.4, Math.max(world.pad, world.space));
    }
    if (starsGroup.current) starsGroup.current.visible = p > 0.86;
    if (padGroup.current) {
      padGroup.current.visible = world.pad > 0.02;
      padGroup.current.position.y = 0;
    }
    if (cloudGroup.current) {
      cloudGroup.current.visible = world.clouds > 0.02;
      cloudGroup.current.position.y = -world.lift * 1.9 + 150;
    }

    if (earthGroup.current) {
      earthGroup.current.visible = world.space > 0.01;
      earthGroup.current.position.y = world.lift;
    }
  });

  return (
    <>
      {/* studio-style image based lighting built from lightformers (no network fetch) */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#dbe9ff" scale={[60, 90, 1]} position={[-70, 30, 20]} target={[0, 18, 0]} />
        <Lightformer form="rect" intensity={1.6} color="#9dc6ff" scale={[60, 90, 1]} position={[70, 24, -30]} target={[0, 18, 0]} />
        <Lightformer form="rect" intensity={1.1} color="#ff9b5e" scale={[80, 30, 1]} position={[0, -40, 40]} target={[0, 10, 0]} />
        <Lightformer form="ring" intensity={2.0} color="#ffffff" scale={[30, 30, 1]} position={[0, 70, 0]} target={[0, 20, 0]} />
      </Environment>

      <directionalLight ref={keyLight} position={[60, 80, 40]} intensity={2.6} color="#eaf2ff" />
      {/* cool rim from behind separates the hardware from the dark background */}
      <directionalLight position={[-70, 40, -60]} intensity={2.2} color="#7fd3ff" />
      <directionalLight position={[30, -30, -50]} intensity={1.0} color="#ff8a55" />
      <ambientLight intensity={0.55} color="#a8bfe0" />
      <hemisphereLight args={["#3d5a86", "#0a0f1a", 0.9]} />
      <pointLight position={[-42, 30, 28]} intensity={2600} color="#5ad1ff" distance={220} />
      <pointLight position={[44, 8, -28]} intensity={2000} color="#ff7a3d" distance={220} />
      <spotLight
        position={[0, 76, 62]}
        angle={0.85}
        penumbra={1}
        intensity={5200}
        distance={300}
        color="#cfe0ff"
      />

      <group ref={starsGroup}>
        <Stars radius={700} depth={240} count={4500} factor={14} saturation={0} fade speed={0.3} />
      </group>

      <HangarDust />
      <Rocket live={world} />
      <SmokeHost world={world} />

      <group ref={padGroup}>
        <LaunchPad reveal={1} />
      </group>
      <group ref={cloudGroup}>
        <CloudDeck visible={1} lift={0} />
      </group>
      <group ref={earthGroup}>
        <EarthBelow reveal={1} lift={0} />
      </group>
    </>
  );
}

function SmokeHost({ world }: { world: World }) {
  const amount = useRef(0);
  useFrame(() => {
    amount.current = world.smoke;
  });
  return null; // ground haze is handled by the volumetric cloud/fog layers
}

export function AuroraCanvas() {
  return (
    <Canvas
      gl={{ antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 1.8]}
      camera={{ fov: 42, near: 0.5, far: 8000, position: [0, 22, 190] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
    >
      <color attach="background" args={["#070d17"]} />
      <SceneContents />
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={1.15}
          luminanceThreshold={0.18}
          luminanceSmoothing={0.9}
          mipmapBlur
          radius={0.72}
        />
        <Vignette eskil={false} offset={0.22} darkness={0.72} />
      </EffectComposer>
    </Canvas>
  );
}
