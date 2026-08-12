import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { clamp, lerp } from "@/lib/timeline";

function softPointMaterial(color: string, size: number, opacity: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uSize: { value: size },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      uniform float uSize;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * (300.0 / max(0.001, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float a = smoothstep(0.5, 0.04, d);
        if (a <= 0.001) discard;
        gl_FragColor = vec4(uColor, a * uOpacity);
      }
    `,
  });
}

export function HangarDust() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 900;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 120;
      arr[i * 3 + 1] = Math.random() * 70 - 15;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  const mat = useMemo(() => softPointMaterial("#9fb4d6", 0.9, 0.45), []);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.008;
  });
  return (
    <points ref={ref} geometry={geo} material={mat} />
  );
}

function Girder({
  position,
  size,
}: {
  position: [number, number, number];
  size: [number, number, number];
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#2a2f3a" metalness={0.85} roughness={0.55} />
    </mesh>
  );
}

export function LaunchPad({ reveal }: { reveal: number }) {
  const group = useRef<THREE.Group>(null);
  const lights = useMemo(() => [0, 1, 2, 3, 4, 5], []);
  useFrame(() => {
    if (group.current) {
      group.current.visible = reveal > 0.01;
      const s = clamp(reveal);
      group.current.traverse((o) => {
        const mesh = o as THREE.Mesh;
        const mat = mesh.material as THREE.Material | undefined;
        if (mat && "opacity" in mat) {
          (mat as THREE.MeshStandardMaterial).transparent = s < 0.99;
          (mat as THREE.MeshStandardMaterial).opacity = s;
        }
      });
    }
  });

  return (
    <group ref={group}>
      {/* deck */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <cylinderGeometry args={[42, 46, 1.2, 64]} />
        <meshStandardMaterial color="#1b1e25" metalness={0.35} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.5, 7, 64]} />
        <meshStandardMaterial color="#c96a2c" metalness={0.2} roughness={0.8} />
      </mesh>
      {/* flame trench */}
      <mesh position={[0, -0.9, 0]}>
        <cylinderGeometry args={[4.6, 4.6, 2, 48, 1, true]} />
        <meshStandardMaterial color="#0b0d12" side={THREE.DoubleSide} />
      </mesh>

      {/* tower */}
      <group position={[-11, 0, 0]}>
        {[
          [-1.6, -1.6],
          [1.6, -1.6],
          [-1.6, 1.6],
          [1.6, 1.6],
        ].map(([x, z], i) => (
          <Girder key={i} position={[x as number, 21, z as number]} size={[0.5, 42, 0.5]} />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <Girder key={`d${i}`} position={[0, 3 + i * 4.2, 0]} size={[3.6, 0.28, 3.6]} />
        ))}
        {/* support arms */}
        {[9, 20, 30].map((y, i) => (
          <Girder key={`a${i}`} position={[5.5, y, 0]} size={[9, 0.6, 1.6]} />
        ))}
        {lights.map((i) => (
          <mesh key={`l${i}`} position={[2, 5 + i * 7, 1.9]}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshBasicMaterial color={i % 2 ? "#ff5a35" : "#5ad1ff"} />
          </mesh>
        ))}
      </group>

      {/* ground service equipment */}
      {([
        [18, 12],
        [-20, -16],
        [22, -10],
      ] as [number, number][]).map(([x, z], i) => (
        <Girder key={`g${i}`} position={[x, 1.1, z]} size={[4, 2.2, 6]} />
      ))}

      {/* floodlights */}
      <pointLight position={[26, 14, 20]} color="#cfe0ff" intensity={220} distance={90} />
      <pointLight position={[-26, 10, -18]} color="#ffb27a" intensity={160} distance={80} />
    </group>
  );
}

export function GroundSmoke({ amountRef }: { amountRef: { current: number } }) {
  const ref = useRef<THREE.Points>(null);
  const mat = useMemo(() => softPointMaterial("#c9d0dc", 14, 0), []);
  const { geo, seeds } = useMemo(() => {
    const n = 700;
    const arr = new Float32Array(n * 3);
    const s = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 6;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = Math.random() * 2;
      arr[i * 3 + 2] = Math.sin(a) * r;
      s[i * 3] = Math.cos(a) * (0.6 + Math.random());
      s[i * 3 + 1] = 0.2 + Math.random() * 0.8;
      s[i * 3 + 2] = Math.sin(a) * (0.6 + Math.random());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return { geo: g, seeds: s };
  }, []);

  useFrame((state, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const amount = amountRef.current;
    pts.visible = amount > 0.01;
    (pts.material as THREE.ShaderMaterial).uniforms['uOpacity']!.value = 0.42 * clamp(amount);
    if (!pts.visible) return;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const k = i * 3;
      const arr = pos.array as Float32Array;
      let x = arr[k]! + seeds[k]! * dt * 9 * amount;
      let y = arr[k + 1]! + seeds[k + 1]! * dt * 4 * amount;
      let z = arr[k + 2]! + seeds[k + 2]! * dt * 9 * amount;
      const d = Math.hypot(x, z);
      if (d > 48 || y > 26) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 4;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        y = Math.random() * 1.5;
      }
      arr[k] = x;
      arr[k + 1] = y;
      arr[k + 2] = z;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geo} material={mat} />
  );
}

/** Clouds passing during atmospheric flight */
export function CloudDeck({ visible, lift }: { visible: number; lift: number }) {
  const ref = useRef<THREE.Group>(null);
  const puffs = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        p: [
          (Math.random() - 0.5) * 260,
          260 + Math.random() * 420,
          (Math.random() - 0.5) * 260,
        ] as [number, number, number],
        s: 26 + Math.random() * 50,
      })),
    [],
  );
  useFrame(() => {
    if (ref.current) {
      ref.current.visible = visible > 0.02;
      ref.current.position.y = -lift;
    }
  });
  return (
    <group ref={ref}>
      {puffs.map((c, i) => (
        <mesh key={i} position={c.p}>
          <sphereGeometry args={[c.s, 12, 10]} />
          <meshBasicMaterial color="#cdd8e8" transparent opacity={0.16} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- procedural planet textures (no network fetch) ---------- */

function makeNoise(seed: number) {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const size = 256;
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  const at = (x: number, y: number) =>
    grid[(((y % size) + size) % size) * size + (((x % size) + size) % size)]!;
  const smoothN = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    return lerp(
      lerp(at(xi, yi), at(xi + 1, yi), u),
      lerp(at(xi, yi + 1), at(xi + 1, yi + 1), u),
      v,
    );
  };
  return (x: number, y: number, oct = 5) => {
    let a = 0.5;
    let f = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < oct; o++) {
      sum += smoothN(x * f, y * f) * a;
      norm += a;
      a *= 0.5;
      f *= 2;
    }
    return sum / norm;
  };
}

function planetTextures() {
  const W = 1024;
  const H = 512;
  const land = document.createElement("canvas");
  land.width = W;
  land.height = H;
  const lc = land.getContext("2d")!;
  const img = lc.createImageData(W, H);

  const cloudsCv = document.createElement("canvas");
  cloudsCv.width = W;
  cloudsCv.height = H;
  const cc = cloudsCv.getContext("2d")!;
  const cimg = cc.createImageData(W, H);

  const n1 = makeNoise(1337);
  const n2 = makeNoise(90210);
  const nc = makeNoise(4242);

  for (let y = 0; y < H; y++) {
    const v = y / H;
    const lat = (v - 0.5) * Math.PI; // -pi/2..pi/2
    const latAbs = Math.abs(lat) / (Math.PI / 2);
    for (let x = 0; x < W; x++) {
      const u = x / W;
      // spherical-ish sampling to limit polar stretching
      const sx = u * 34;
      const sy = v * 17;
      let h = n1(sx, sy, 6);
      h = h * 0.75 + n2(sx * 2.4, sy * 2.4, 4) * 0.25;
      // continent shaping
      h = h + 0.16 * Math.sin(u * Math.PI * 3.0) - 0.1;

      const i = (y * W + x) * 4;
      let r: number, g: number, b: number;
      const sea = 0.52;
      if (h < sea) {
        const d = (sea - h) / sea;
        r = lerp(28, 6, d);
        g = lerp(78, 26, d);
        b = lerp(126, 62, d);
      } else {
        const t = Math.min(1, (h - sea) / 0.28);
        const dry = n2(sx * 1.3 + 11, sy * 1.3 + 7, 3);
        r = lerp(48, 132, t) + dry * 60;
        g = lerp(96, 118, t) - dry * 18;
        b = lerp(52, 78, t) + dry * 10;
        if (t > 0.72) {
          const m = (t - 0.72) / 0.28;
          r = lerp(r, 210, m);
          g = lerp(g, 210, m);
          b = lerp(b, 214, m);
        }
      }
      // ice caps
      const ice = Math.max(0, (latAbs - 0.78) / 0.22);
      if (ice > 0) {
        r = lerp(r, 236, ice);
        g = lerp(g, 244, ice);
        b = lerp(b, 255, ice);
      }
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;

      // clouds: banded turbulence
      let c = nc(sx * 0.9 + 3, sy * 0.9 + 3, 6);
      c += 0.14 * Math.sin(lat * 7.0);
      const band = 1 - Math.abs(Math.sin(lat * 3.1)) * 0.35;
      const a = Math.max(0, Math.min(1, (c * band - 0.5) / 0.28));
      cimg.data[i] = 255;
      cimg.data[i + 1] = 255;
      cimg.data[i + 2] = 255;
      cimg.data[i + 3] = Math.pow(a, 1.2) * 235;
    }
  }
  lc.putImageData(img, 0, 0);
  cc.putImageData(cimg, 0, 0);

  const tex = new THREE.CanvasTexture(land);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const ctex = new THREE.CanvasTexture(cloudsCv);
  ctex.colorSpace = THREE.SRGBColorSpace;
  ctex.wrapS = THREE.RepeatWrapping;
  return { tex, ctex };
}

const R = 380;

export function EarthBelow({ reveal, lift }: { reveal: number; lift: number }) {
  const g = useRef<THREE.Group>(null);
  const surface = useRef<THREE.Mesh>(null);
  const clouds = useRef<THREE.Mesh>(null);

  const maps = useMemo(() => {
    if (typeof document === "undefined") return null;
    return planetTextures();
  }, []);

  // self-lit planet: fixed sun direction, unaffected by the harsh scene lights
  const SUN = useMemo(() => new THREE.Vector3(-0.55, 0.45, 0.7).normalize(), []);

  const surfaceMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: maps ? maps.tex : null },
        uSun: { value: SUN },
      },
      vertexShader: `
        varying vec2 vUv; varying vec3 vN;
        void main(){
          vUv = uv;
          vN = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap; uniform vec3 uSun;
        varying vec2 vUv; varying vec3 vN;
        void main(){
          vec3 base = texture2D(uMap, vUv).rgb;
          float nl = dot(normalize(vN), normalize(uSun));
          float day = smoothstep(-0.18, 0.35, nl);
          vec3 col = base * (0.09 + 0.62 * day);
          // faint night-side city warmth
          col += base * 0.05 * (1.0 - day) * vec3(1.0, 0.75, 0.45);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, [maps, SUN]);

  const cloudMat = useMemo(() => {
    if (!maps) return null;
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uMap: { value: maps.ctex }, uSun: { value: SUN } },
      vertexShader: `
        varying vec2 vUv; varying vec3 vN;
        void main(){
          vUv = uv;
          vN = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap; uniform vec3 uSun;
        varying vec2 vUv; varying vec3 vN;
        void main(){
          vec4 c = texture2D(uMap, vUv);
          float day = smoothstep(-0.12, 0.4, dot(normalize(vN), normalize(uSun)));
          gl_FragColor = vec4(vec3(0.95) * (0.05 + 0.62 * day), c.a * 0.75);
        }
      `,
    });
  }, [maps, SUN]);

  const glowMat = useMemo(

    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color("#6fc4ff") } },
        vertexShader: `
          varying vec3 vN; varying vec3 vP;
          void main(){
            vN = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position,1.0);
            vP = mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor; varying vec3 vN; varying vec3 vP;
          void main(){
            float f = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 3.0);
            gl_FragColor = vec4(uColor, f * 0.45);
          }
        `,
      }),
    [],
  );

  useFrame((s) => {
    if (!g.current) return;
    const r = clamp(reveal);
    g.current.visible = r > 0.01;
    // sits low and slightly behind: only the upper limb fills the bottom of frame
    g.current.position.set(0, lift - lerp(430, 465, r), -lerp(400, 470, r));
    if (surface.current) surface.current.rotation.y = s.clock.elapsedTime * 0.01;
    if (clouds.current) clouds.current.rotation.y = s.clock.elapsedTime * 0.016;
  });

  return (
    <group ref={g} rotation={[0.22, 0, 0.12]}>
      <mesh ref={surface} material={surfaceMat}>
        <sphereGeometry args={[R, 128, 96]} />
      </mesh>

      {maps && (
        <mesh ref={clouds} material={cloudMat!}>
          <sphereGeometry args={[R * 1.012, 96, 64]} />
        </mesh>
      )}

      {/* atmospheric limb */}
      <mesh material={glowMat}>
        <sphereGeometry args={[R * 1.055, 96, 64]} />
      </mesh>
      <mesh>
        <sphereGeometry args={[R * 1.12, 64, 48]} />
        <meshBasicMaterial
          color="#2f8fd6"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}


