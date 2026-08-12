import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { lerp, seg, smooth, clamp } from "@/lib/timeline";

const R = 2.2;

/** Assembled layout (base of stack at y = 0) */
export const PARTS = {
  engines: { y: 2.2, h: 4.4 },
  lowerTank: { y: 10.5, h: 12 },
  upperTank: { y: 20.2, h: 7.4 },
  avionics: { y: 25.4, h: 3 },
  payload: { y: 30, h: 6.2 },
  nose: { y: 35.6, h: 5 },
} as const;

export type PartKey = keyof typeof PARTS;

/** Where each part floats in the dark hangar before assembly */
export const SCATTER: Record<PartKey, { p: [number, number, number]; r: [number, number, number] }> = {
  nose: { p: [-14, 26, 10], r: [0.3, 0.6, -0.25] },
  payload: { p: [16, 18, -6], r: [-0.2, 1.1, 0.35] },
  avionics: { p: [-18, 9, -14], r: [0.5, -0.7, 0.2] },
  upperTank: { p: [20, 3, 14], r: [1.3, 0.3, 0.4] },
  lowerTank: { p: [-22, -4, 20], r: [1.5, -0.4, -0.3] },
  engines: { p: [10, -10, 26], r: [0.25, 0.9, 0.15] },
};

/** exploded-stack spacing multiplier */
const EXPLODE = 1.75;

const ORDER: PartKey[] = ["engines", "lowerTank", "upperTank", "avionics", "payload", "nose"];

function useMaterials() {
  return useMemo(() => {
    const ceramic = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#f2f5fa"),
      metalness: 0.12,
      roughness: 0.34,
      clearcoat: 0.7,
      clearcoatRoughness: 0.25,
    });
    const titanium = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#c3cddc"),
      metalness: 1,
      roughness: 0.22,
      envMapIntensity: 1.5,
    });
    const carbon = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#2a2f3a"),
      metalness: 0.55,
      roughness: 0.42,
      clearcoat: 0.5,
      envMapIntensity: 1.2,
    });
    const copper = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#d08a4e"),
      metalness: 1,
      roughness: 0.28,
      envMapIntensity: 1.4,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#e8b558"),
      metalness: 1,
      roughness: 0.18,
      envMapIntensity: 1.6,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#5ad1ff"),
      metalness: 0.1,
      roughness: 0.1,
      emissive: new THREE.Color("#1d5f80"),
      emissiveIntensity: 1.6,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#c8402f"),
      metalness: 0.35,
      roughness: 0.45,
    });
    return { ceramic, titanium, carbon, copper, gold, glass, accent };
  }, []);
}

function Ribs({ count, from, to, radius }: { count: number; from: number; to: number; radius: number }) {
  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => from + ((to - from) * i) / (count - 1)),
    [count, from, to],
  );
  return (
    <>
      {items.map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[radius + 0.02, 0.045, 8, 64]} />
          <meshStandardMaterial color="#aab6c8" metalness={1} roughness={0.28} />
        </mesh>
      ))}
    </>
  );
}

/** vertical panel seams around a cylindrical section */
function PanelSeams({ count = 16, h, radius }: { count?: number; h: number; radius: number }) {
  const angles = useMemo(
    () => Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2),
    [count],
  );
  return (
    <>
      {angles.map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * (radius + 0.012), 0, Math.sin(a) * (radius + 0.012)]}
          rotation={[0, -a, 0]}
        >
          <boxGeometry args={[0.02, h * 0.94, 0.05]} />
          <meshStandardMaterial color="#7f8a9c" metalness={0.9} roughness={0.5} />
        </mesh>
      ))}
    </>
  );
}

/** cable raceway conduit running along a section */
function Raceway({ h, radius, angle = 0.6 }: { h: number; radius: number; angle?: number }) {
  const x = Math.cos(angle) * (radius + 0.13);
  const z = Math.sin(angle) * (radius + 0.13);
  return (
    <group>
      <mesh position={[x, 0, z]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[0.3, h * 0.9, 0.22]} />
        <meshStandardMaterial color="#38414f" metalness={0.7} roughness={0.45} />
      </mesh>
      {Array.from({ length: Math.max(2, Math.round(h / 2.4)) }, (_, i) => {
        const y = -h * 0.42 + (i * (h * 0.84)) / Math.max(1, Math.round(h / 2.4) - 1);
        return (
          <mesh key={i} position={[x, y, z]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[0.38, 0.09, 0.3]} />
            <meshStandardMaterial color="#8f9aab" metalness={1} roughness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

/** small RCS thruster quad */
function RCSQuad({ y, radius }: { y: number; radius: number }) {
  return (
    <>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <group key={i} position={[Math.cos(a) * radius, y, Math.sin(a) * radius]} rotation={[0, -a, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.13, 0.09, 0.34, 12]} />
              <meshStandardMaterial color="#59626f" metalness={1} roughness={0.3} />
            </mesh>
            <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <coneGeometry args={[0.14, 0.2, 12, 1, true]} />
              <meshStandardMaterial color="#1e222b" metalness={0.8} roughness={0.5} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/** thin seam that follows the ogive profile instead of a flat plank */
function OgiveSeam({ h, rotation = 0 }: { h: number; rotation?: number }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const r = R * Math.pow(1 - t, 0.62);
      pts.push(new THREE.Vector2(Math.max(r + 0.015, 0.02), t * h - h / 2));
    }
    // very narrow lathe sweep => a raised seam strip hugging the surface
    return new THREE.LatheGeometry(pts, 4, rotation, 0.045);
  }, [h, rotation]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#8792a5" metalness={1} roughness={0.35} side={THREE.DoubleSide} />
    </mesh>
  );
}

function NoseCone() {
  const m = useMaterials();
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const h = PARTS.nose.h;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      // ogive profile
      const y = t * h;
      const r = R * Math.pow(1 - t, 0.62);
      pts.push(new THREE.Vector2(Math.max(r, 0.02), y - h / 2));
    }
    return new THREE.LatheGeometry(pts, 96);
  }, []);
  return (
    <group>
      <mesh geometry={geo} material={m.ceramic} castShadow />
      {/* two fairing split seams, following the cone surface */}
      <OgiveSeam h={PARTS.nose.h} rotation={0} />
      <OgiveSeam h={PARTS.nose.h} rotation={Math.PI} />
      {/* accent chevron band */}
      <mesh position={[0, -PARTS.nose.h / 2 + 0.9, 0]} material={m.accent}>
        <cylinderGeometry args={[R * 0.9, R * 0.96, 0.55, 64, 1, true]} />
      </mesh>
      <mesh position={[0, -PARTS.nose.h / 2 + 0.1, 0]}>
        <cylinderGeometry args={[R + 0.03, R + 0.03, 0.35, 64]} />
        <meshStandardMaterial color="#2b3140" metalness={0.9} roughness={0.35} />
      </mesh>
      {/* separation ring bolts */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * (R + 0.05), -PARTS.nose.h / 2 + 0.1, Math.sin(a) * (R + 0.05)]} rotation={[0, -a, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.08, 8]} />
            <meshStandardMaterial color="#c9d2e0" metalness={1} roughness={0.25} />
          </mesh>
        );
      })}
      <RCSQuad y={-PARTS.nose.h / 2 + 1.7} radius={R * 0.72} />
      {/* pitot / beacon */}
      <mesh position={[0, PARTS.nose.h / 2 - 0.15, 0]} material={m.titanium}>
        <cylinderGeometry args={[0.05, 0.09, 0.7, 12]} />
      </mesh>
      <mesh position={[0, PARTS.nose.h / 2 - 0.4, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#ff7a3d" emissive="#ff7a3d" emissiveIntensity={3} />
      </mesh>
    </group>
  );
}


function PayloadModule() {
  const m = useMaterials();
  const h = PARTS.payload.h;
  return (
    <group>
      <mesh material={m.ceramic}>
        <cylinderGeometry args={[R, R, h, 64, 1, true]} />
      </mesh>
      <PanelSeams count={12} h={h} radius={R} />
      {/* payload bay doors */}
      <mesh position={[0, 0.3, R * 0.72]} rotation={[0, 0, 0]}>
        <boxGeometry args={[2.4, h * 0.62, 0.12]} />
        <meshStandardMaterial color="#151a24" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.3, R * 0.74]}>
        <boxGeometry args={[2.0, h * 0.5, 0.06]} />
        <meshStandardMaterial color="#24406b" metalness={0.4} roughness={0.22} emissive="#154468" emissiveIntensity={1.1} />
      </mesh>
      {/* gold thermal blanket band */}
      <mesh position={[0, -h / 2 + 1.5, 0]} material={m.gold}>
        <cylinderGeometry args={[R * 1.005, R * 1.005, 0.9, 64, 1, true]} />
      </mesh>
      {/* satellite / instruments hint */}
      <mesh position={[0, -h / 2 + 0.6, 0]} material={m.carbon}>
        <cylinderGeometry args={[R * 0.98, R * 0.98, 0.5, 64]} />
      </mesh>
      <Ribs count={3} from={-h / 2 + 1.2} to={h / 2 - 1.2} radius={R} />
      {/* stowed solar array + antenna dish */}
      <mesh position={[R + 0.55, 0.8, 0]} rotation={[0, 0, Math.PI / 2]} material={m.titanium}>
        <boxGeometry args={[0.08, 1.1, 2.2]} />
      </mesh>
      <mesh position={[R + 0.62, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.03, 1.0, 2.0]} />
        <meshStandardMaterial color="#16305c" metalness={0.6} roughness={0.2} emissive="#0b2244" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-R - 0.35, -1.1, 0]} rotation={[0, 0, -Math.PI / 2.2]} material={m.ceramic}>
        <sphereGeometry args={[0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
      </mesh>
      <Raceway h={h} radius={R} angle={2.4} />
    </group>
  );
}

function Avionics() {
  const m = useMaterials();
  const h = PARTS.avionics.h;
  const boxes = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return { a, y: (i % 3) * 0.6 - 0.6 };
      }),
    [],
  );
  return (
    <group>
      <mesh material={m.carbon}>
        <cylinderGeometry args={[R * 0.98, R * 0.98, h, 64]} />
      </mesh>
      {boxes.map((b, i) => (
        <mesh
          key={i}
          position={[Math.cos(b.a) * (R * 0.99), b.y, Math.sin(b.a) * (R * 0.99)]}
          rotation={[0, -b.a, 0]}
          material={m.titanium}
        >
          <boxGeometry args={[0.16, 0.42, 0.7]} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[R * 1.0, 0.05, 8, 64]} />
        <meshStandardMaterial color="#5ad1ff" emissive="#5ad1ff" emissiveIntensity={2.2} />
      </mesh>
      <mesh position={[0, h / 2 + 0.35, 0]} material={m.titanium}>
        <cylinderGeometry args={[0.1, 0.1, 0.7, 12]} />
      </mesh>
    </group>
  );
}

/** stowed grid fin (first stage) */
function GridFin({ y, angle }: { y: number; angle: number }) {
  const cells = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) out.push([i * 0.24, j * 0.24]);
    return out;
  }, []);
  return (
    <group position={[Math.cos(angle) * (R + 0.36), y, Math.sin(angle) * (R + 0.36)]} rotation={[0, -angle, 0]}>
      <mesh>
        <boxGeometry args={[0.1, 0.85, 1.35]} />
        <meshStandardMaterial color="#9aa5b6" metalness={1} roughness={0.32} />
      </mesh>
      {cells.map(([a, b], i) => (
        <mesh key={i} position={[0.06, b, a]}>
          <boxGeometry args={[0.04, 0.2, 0.2]} />
          <meshStandardMaterial color="#5d6675" metalness={0.9} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[-0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 12]} />
        <meshStandardMaterial color="#c9d2e0" metalness={1} roughness={0.22} />
      </mesh>
    </group>
  );
}

/** service ladder / step rungs */
function Ladder({ h, angle }: { h: number; angle: number }) {
  const n = Math.max(3, Math.round(h / 1.1));
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const y = -h * 0.4 + (i * h * 0.8) / (n - 1);
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * (R + 0.1), y, Math.sin(angle) * (R + 0.1)]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[0.14, 0.05, 0.42]} />
            <meshStandardMaterial color="#aab6c8" metalness={1} roughness={0.35} />
          </mesh>
        );
      })}
    </>
  );
}

function Tank({ h, insulated }: { h: number; insulated?: boolean }) {

  const m = useMaterials();
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[R, R, h, 64, 1, true]} />
        <meshPhysicalMaterial
          color={insulated ? "#e0864a" : "#dde3ed"}
          metalness={insulated ? 0.18 : 0.95}
          roughness={insulated ? 0.78 : 0.2}
          clearcoat={insulated ? 0.1 : 0.6}
          envMapIntensity={1.5}
        />
      </mesh>
      <PanelSeams count={18} h={h} radius={R} />
      {/* black livery band + accent stripe */}
      <mesh position={[0, h / 2 - 1.6, 0]} material={m.carbon}>
        <cylinderGeometry args={[R * 1.004, R * 1.004, 1.1, 64, 1, true]} />
      </mesh>
      <mesh position={[0, h / 2 - 2.35, 0]} material={m.accent}>
        <cylinderGeometry args={[R * 1.004, R * 1.004, 0.28, 64, 1, true]} />
      </mesh>
      <mesh position={[0, h / 2, 0]} material={m.titanium}>
        <sphereGeometry args={[R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, -h / 2, 0]} rotation={[Math.PI, 0, 0]} material={m.titanium}>
        <sphereGeometry args={[R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <Ribs count={5} from={-h / 2 + 0.8} to={h / 2 - 0.8} radius={R} />
      {/* plumbing */}
      <mesh position={[R + 0.16, 0, 0]} material={m.titanium}>
        <cylinderGeometry args={[0.14, 0.14, h - 0.6, 16]} />
      </mesh>
      <mesh position={[-R * 0.7, 0, R * 0.75]} material={m.copper}>
        <cylinderGeometry args={[0.09, 0.09, h - 1.4, 12]} />
      </mesh>
      <mesh position={[R + 0.16, h / 2 - 1.1, 0]} material={m.copper}>
        <boxGeometry args={[0.45, 0.45, 0.45]} />
      </mesh>
      {/* pressurant spheres */}
      {[0.9, 2.3].map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * (R + 0.36), -h / 2 + 1.5 + i * 0.9, Math.sin(a) * (R + 0.36)]}
          material={m.titanium}
        >
          <sphereGeometry args={[0.34, 20, 14]} />
        </mesh>
      ))}
      <Raceway h={h} radius={R} angle={-1.2} />
      <RCSQuad y={h / 2 - 0.9} radius={R + 0.06} />
      <Ladder h={h} angle={1.9} />
      {/* interstage skirt with vent ports */}
      <mesh position={[0, h / 2 - 0.35, 0]}>
        <cylinderGeometry args={[R * 1.01, R * 1.01, 0.7, 64, 1, true]} />
        <meshStandardMaterial color="#1d222c" metalness={0.9} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        return (
          <mesh key={i} position={[Math.cos(a) * (R + 0.03), h / 2 - 0.35, Math.sin(a) * (R + 0.03)]} rotation={[Math.PI / 2, 0, -a]}>
            <cylinderGeometry args={[0.11, 0.11, 0.1, 12]} />
            <meshStandardMaterial color="#0d1018" metalness={0.6} roughness={0.7} />
          </mesh>
        );
      })}
      {insulated && (
        <>
          {[0.4, 1.97, 3.54, 5.11].map((a, i) => (
            <GridFin key={i} y={h / 2 - 2.9} angle={a} />
          ))}
          {/* frost banding on the cryogenic section */}
          <mesh position={[0, -h / 2 + 3.2, 0]}>
            <cylinderGeometry args={[R * 1.006, R * 1.006, 3.6, 64, 1, true]} />
            <meshStandardMaterial color="#e8eef7" metalness={0.05} roughness={0.95} transparent opacity={0.55} />
          </mesh>
        </>
      )}

    </group>
  );
}

function Nozzle({ scale = 1 }: { scale?: number }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const y = -t * 2.4;
      const r = 0.32 + Math.pow(t, 1.5) * 0.85;
      pts.push(new THREE.Vector2(r, y));
    }
    return new THREE.LatheGeometry(pts, 48);
  }, []);
  const tubes = useMemo(() => Array.from({ length: 28 }, (_, i) => (i / 28) * Math.PI * 2), []);
  return (
    <group scale={scale}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial
          color="#b9c0cc"
          metalness={1}
          roughness={0.18}
          envMapIntensity={1.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* regenerative cooling tubes down the bell */}
      {tubes.map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * 0.83, -1.25, Math.sin(a) * 0.83]}
          rotation={[Math.cos(a) * 0.16, -a, Math.sin(a) * 0.16]}
        >
          <cylinderGeometry args={[0.035, 0.045, 2.2, 6]} />
          <meshStandardMaterial color="#8d95a3" metalness={1} roughness={0.3} />
        </mesh>
      ))}
      {/* nozzle exit lip */}
      <mesh position={[0, -2.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.16, 0.055, 8, 48]} />
        <meshStandardMaterial color="#3a3f4a" metalness={1} roughness={0.4} />
      </mesh>
      {/* combustion chamber + injector */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.42, 0.32, 1.1, 32]} />
        <meshStandardMaterial color="#d08a4e" metalness={1} roughness={0.26} />
      </mesh>
      {/* turbopump */}
      <mesh position={[0.6, 0.95, 0.2]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.26, 0.26, 0.6, 20]} />
        <meshStandardMaterial color="#969dab" metalness={1} roughness={0.3} />
      </mesh>
      <mesh position={[-0.55, 0.9, -0.25]}>
        <cylinderGeometry args={[0.2, 0.2, 0.5, 16]} />
        <meshStandardMaterial color="#969dab" metalness={1} roughness={0.3} />
      </mesh>
      {/* gimbal actuators */}
      {[0.7, -0.7].map((s, i) => (
        <mesh key={i} position={[s * 0.7, 0.1, s * 0.35]} rotation={[0.35 * s, 0, -0.35 * s]}>
          <cylinderGeometry args={[0.075, 0.075, 1.1, 10]} />
          <meshStandardMaterial color="#c9d2e0" metalness={1} roughness={0.22} />
        </mesh>
      ))}
      {/* propellant feed lines */}
      <mesh position={[0.38, 1.2, -0.32]} rotation={[0.3, 0, 0.2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.9, 10]} />
        <meshStandardMaterial color="#7c8492" metalness={1} roughness={0.35} />
      </mesh>
    </group>
  );
}

function EngineCluster({ live }: { live: Live }) {
  const m = useMaterials();
  const h = PARTS.engines.h;
  const engineLights = useMemo<THREE.PointLight[]>(() => [], []);
  useFrame(() => {
    for (const l of engineLights) l.intensity = live.ign * 90;
  });
  const positions = useMemo<[number, number][]>(
    () => [
      [0, 0],
      [1.1, 0.7],
      [-1.1, 0.7],
      [0.0, -1.25],
    ],
    [],
  );
  return (
    <group>
      {/* thrust structure skirt */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[R, R * 0.92, h * 0.72, 64, 1, true]} />
        <meshStandardMaterial color="#20242e" metalness={0.85} roughness={0.42} side={THREE.DoubleSide} />
      </mesh>
      <Ribs count={2} from={0.1} to={1.4} radius={R * 0.95} />
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, -0.6, z]}>
          <Nozzle scale={0.82} />
          <pointLight
            color="#ff8a45"
            distance={22}
            intensity={0}
            ref={(l) => {
              if (l) engineLights.push(l);
            }}
            position={[0, -2.2, 0]}
          />
        </group>
      ))}
      {/* aft fins */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * (R + 0.55), 1.1, Math.sin(a) * (R + 0.55)]}
            rotation={[0, -a, 0]}
            material={m.carbon}
          >
            <boxGeometry args={[1.3, 2.2, 0.14]} />
          </mesh>
        );
      })}
    </group>
  );
}

export type Live = { p: number; ign: number; lift: number };

function Part({
  id,
  live,
  children,
}: {
  id: PartKey;
  live: Live;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const idx = ORDER.indexOf(id);
  const scatter = SCATTER[id];
  const finalY = PARTS[id].y;
  const explodedY = (finalY - 18) * EXPLODE + 22;

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const p = live.p;
    const t = state.clock.elapsedTime;

    // phase 1: scattered -> exploded stack
    const gather = seg(p, 0.44, 0.56);
    // phase 2: exploded -> assembled (staggered, engines first)
    const a0 = 0.56 + idx * 0.017;
    const lock = seg(p, a0, a0 + 0.055);

    const drift = Math.sin(t * 0.35 + idx) * 0.35 * (1 - gather);

    const x = lerp(scatter.p[0], 0, gather);
    const z = lerp(scatter.p[2], 0, gather);
    const y = lerp(scatter.p[1] + drift, explodedY, gather);
    const yFinal = lerp(y, finalY, lock);

    // small settling vibration right after lock
    const settle = lock > 0.001 && lock < 1 ? 0 : 0;
    const vib =
      lock > 0.85 && lock < 1
        ? Math.sin((lock - 0.85) * 260) * 0.05 * (1 - (lock - 0.85) / 0.15)
        : settle;

    g.position.set(x, yFinal + vib, z);

    const spin = (1 - gather) * (t * 0.18 + idx);
    g.rotation.set(
      lerp(scatter.r[0], 0, gather) * (1 - lock),
      lerp(scatter.r[1] + spin, 0, gather * 0.9) * (1 - lock),
      lerp(scatter.r[2], 0, gather) * (1 - lock),
    );
  });

  return <group ref={ref}>{children}</group>;
}

export function Rocket({ live }: { live: Live }) {
  const root = useRef<THREE.Group>(null);
  useFrame(() => {
    if (root.current) root.current.position.y = live.lift;
  });

  return (
    <group ref={root}>
      <Part id="engines" live={live}>
        <EngineCluster live={live} />
      </Part>
      <Part id="lowerTank" live={live}>
        <Tank h={PARTS.lowerTank.h} insulated />
      </Part>
      <Part id="upperTank" live={live}>
        <Tank h={PARTS.upperTank.h} />
      </Part>
      <Part id="avionics" live={live}>
        <Avionics />
      </Part>
      <Part id="payload" live={live}>
        <PayloadModule />
      </Part>
      <Part id="nose" live={live}>
        <NoseCone />
      </Part>
      <Plume live={live} />
    </group>
  );
}

function Plume({ live }: { live: Live }) {
  const ref = useRef<THREE.Points>(null);
  const core = useRef<THREE.Mesh>(null);

  // four engine nozzle centers, scaled from EngineCluster layout
  const NOZZLES: [number, number][] = [
    [0, 0],
    [0.9, 0.57],
    [-0.9, 0.57],
    [0, -1.02],
  ];

  const { geo, mat } = useMemo(() => {
    const N = 1600;
    const pos = new Float32Array(N * 3);
    const start = new Float32Array(N);
    const center = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const nz = NOZZLES[i % 4]!;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.5;
      pos[i * 3] = nz[0] + Math.cos(a) * r;
      pos[i * 3 + 1] = -0.8 + Math.random() * 0.4;
      pos[i * 3 + 2] = nz[1] + Math.sin(a) * r;
      center[i * 3] = nz[0];
      center[i * 3 + 1] = -0.8;
      center[i * 3 + 2] = nz[1];
      start[i] = Math.random();
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aStart", new THREE.BufferAttribute(start, 1));
    g.setAttribute("aCenter", new THREE.BufferAttribute(center, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));

    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uIgnition: { value: 0 },
        uGrowth: { value: 0 },
        uSize: { value: 3.0 },
      },
      vertexShader: `
        attribute float aStart;
        attribute vec3 aCenter;
        attribute float aSeed;
        uniform float uTime;
        uniform float uIgnition;
        uniform float uGrowth;
        uniform float uSize;
        varying float vA;
        varying vec3 vC;
        void main() {
          float L = mix(1.3, 2.4, fract(aSeed * 7.31));
          float life = fract(uTime / L + aStart);
          float fade = pow(1.0 - life, 2.0);
          float emit = uIgnition;

          vec3 p = aCenter + vec3(
            (fract(aSeed * 13.7) - 0.5) * 0.9,
            (fract(aSeed * 7.1) - 0.5) * 0.5,
            (fract(aSeed * 3.3) - 0.5) * 0.9);

          float spread = (0.9 + uGrowth * 2.6) * (0.4 + life);
          p.x += sin(uTime * 4.5 + aSeed * 38.0 + life * 7.0) * spread * 0.55;
          p.z += cos(uTime * 3.9 + aSeed * 29.0 + life * 6.0) * spread * 0.55;
          p.y -= life * (7.0 + uGrowth * 85.0);

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float size = uSize * (0.55 + life * 1.7) * (0.4 + emit) * fade;
          gl_PointSize = max(1.0, size * (300.0 / max(0.001, -mv.z)));
          gl_Position = projectionMatrix * mv;

          // white-hot core -> gold -> ember red
          vec3 white = vec3(1.0, 0.98, 0.92);
          vec3 gold  = vec3(1.0, 0.62, 0.28);
          vec3 ember = vec3(0.72, 0.18, 0.06);
          vC = mix(white, gold, smoothstep(0.0, 0.35, life));
          vC = mix(vC, ember, smoothstep(0.45, 1.0, life));
          vA = fade * emit;
        }
      `,
      fragmentShader: `
        varying float vA;
        varying vec3 vC;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float a = smoothstep(0.5, 0.02, d);
          if (a <= 0.01) discard;
          gl_FragColor = vec4(vC, a * vA);
        }
      `,
    });
    return { geo: g, mat: m };
  }, []);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const ignition = live.ign;
    const lift = live.lift;
    const growth = clamp(lift / 120);

    mat.uniforms['uTime']!.value = t;
    mat.uniforms['uIgnition']!.value = ignition;
    mat.uniforms['uGrowth']!.value = growth;

    g.visible = ignition > 0.01;

    // dense hot core cone hugs the nozzles while thrusting
    if (core.current) {
      core.current.visible = ignition > 0.01;
      const flicker = 1 + Math.sin(t * 43) * 0.06 + Math.sin(t * 17) * 0.035;
      const s = (0.6 + growth * 1.1) * flicker;
      core.current.scale.set(s, 1 + growth * 1.6, s);
      (core.current.material as THREE.MeshBasicMaterial).opacity =
        0.5 * smooth(clamp(ignition));
    }
  });

  return (
    <group position={[0, -0.9, 0]}>
      <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />
      <mesh ref={core} position={[0, -2.6, 0]}>
        <coneGeometry args={[0.7, 6.5, 24, 1, true]} />
        <meshBasicMaterial
          color="#dfe8ff"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
