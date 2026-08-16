# AURORA — Go Beyond
### Cinematic Scroll-Driven 3D Spacecraft Launch Experience — Technical Specification

---

## 1. Overview

**AURORA — Go Beyond** is a single-page, scroll-driven cinematic experience depicting a rocket launch. There is no traditional navigation — the entire narrative unfolds along one continuous vertical scroll route (`/`), synchronized with a 3D scene, camera choreography, and text overlays.

---

## 2. Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (React 19 + Vite) |
| Routing | TanStack Router, file-based routes |
| Styling | Tailwind v4, tokens defined in `src/styles.css` |
| 3D Engine | `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` |
| Route Structure | Single route: `/` |

---

## 3. Page Shell — `src/routes/index.tsx`

### 3.1 Layer Structure
- **Canvas layer**: fixed, full-viewport `<canvas>`, lazy-loaded, mounted **client-only** (no SSR render of WebGL).
- **Overlay layer**: fixed HTML layer stacked above the canvas, holding all text/UI.

### 3.2 Scroll Spacer
- An empty `div` of height `1800vh` drives the entire timeline.
- `useScrollProgress` hook publishes normalized scroll progress `p` (range `0 → 1`) in two forms:
  - **React state** — consumed by the HTML overlay for cross-fades.
  - **Ref** — consumed directly inside the `useFrame` render loop, so the 3D scene **never triggers a React re-render**.

### 3.3 Camera Parallax
- A mouse-tracking hook computes a subtle offset applied to the camera each frame (not via React state).

### 3.4 Fixed Header
- Left: `AURORA`
- Right: `Mission 01 / Orbital`
- Typography: uppercase, letter-spaced micro-type (matches `.text-eyebrow` styling).

### 3.5 SEO (`head()`)
- `title`: "AURORA — Go Beyond | Cinematic Spacecraft Launch Experience"
- `description`: descriptive summary of the experience
- `og:title`, `og:description`, `og:type`
- `twitter:card`
- One `sr-only` `<h1>` for accessibility/SEO

---

## 4. Design System

### 4.1 Palette (CSS tokens)
| Token | Value | Use |
|---|---|---|
| Background | `#0a1220` (deep navy) | Base background |
| Steel greys | — | Secondary text, structural UI |
| Foreground | Off-white | Primary text |
| Accent — Ember | `#ff5a35` | Warnings, ignition, energy |
| Accent — Ice | `#5ad1ff` | Systems, cold, avionics |

### 4.2 Typography
- Primary typeface: a **technical grotesk** (explicitly *not* Inter or Poppins).
- `.text-eyebrow` utility: `11px`, uppercase, `0.22em` letter-spacing, steel color.

### 4.3 Constraints
- No purple gradients.
- No generic/default SaaS look — every visual choice should feel aerospace/technical.

---

## 5. Timeline System — `src/lib/timeline.ts`

### 5.1 Helper Functions
| Function | Purpose |
|---|---|
| `clamp` | Constrain a value to a range |
| `remap` | Linearly map a value from one range to another |
| `smooth` | Smoothstep easing |
| `seg` | Eased remap over a sub-range (segment) |
| `lerp` | Linear interpolation |
| `damp` | Frame-rate-independent exponential damping |

### 5.2 Chapters Map (`CHAPTERS`)
Scroll-progress ranges (`p`) defining narrative chapters:

| Chapter | Range |
|---|---|
| Hangar | `0.00 – 0.07` |
| Nose | `0.07 – 0.15` |
| Payload | `0.15 – 0.23` |
| Avionics | `0.23 – 0.31` |
| Tanks | `0.31 – 0.39` |
| Engine | `0.39 – 0.48` |
| Exploded | `0.48 – 0.56` |
| Assembly | `0.56 – 0.68` |
| Complete | `0.68 – 0.75` |
| Pad | `0.75 – 0.82` |
| Systems | `0.82 – 0.87` |
| Ignition | `0.87 – 0.91` |
| Liftoff | `0.91 – 0.955` |
| Atmosphere | `0.955 – 0.98` |
| Space | `0.98 – 1.00` |

---

## 6. Camera Choreography

- ~**17 keyframes**, each `{ t, pos, look }`, interpolated with `smoothstep`.
- Narrative arc:
  1. Wide hangar establishing shot
  2. Close orbit — nose
  3. Close orbit — payload
  4. Close orbit — avionics
  5. Close orbit — tanks
  6. Close orbit — engine bell
  7. Pull back for exploded view
  8. Orbiting shot during assembly
  9. Low hero shot at ignition
  10. Climbing chase shots through liftoff/atmosphere
  11. Final wide pullback revealing Earth
- Camera position **and** look-at target are both `damp`-smoothed per frame.
- Mouse parallax offset is added on top of the choreographed position.

---

## 7. The Rocket — `Rocket.tsx`

A single vertical stack, **118 m** tall, composed of six modules. Each module's Y-offset is independently animated:
- **Exploded** apart during the *Exploded* chapter.
- **Sequentially mated** back together, bottom-to-top or top-to-bottom, during the *Assembly* chapter.

### 7.1 Modules

1. **Nose Cone / Fairing**
   - Lathe-generated ogive profile (never a flat-sided box/plank).
   - Thin recessed seam line.
   - Pitot mast + beacon lights.

2. **Payload Module**
   - Gold MLI (multi-layer insulation) thermal blanket material.
   - Stowed solar array.
   - S-band communication dish.
   - Low-shock separation ring.

3. **Avionics Bay**
   - Structural ribbing, access panels, wiring raceway details.

4. **LOX Tank**
   - Isogrid barrel construction.
   - Cryogenic frost banding.
   - Plumbing raceways along the exterior.

5. **LH2 Tank**
   - Isogrid barrel construction.
   - Cryo frost banding.
   - Helium pressurant spheres.
   - Livery bands.
   - Grid fins, stowed at the interstage.

6. **Engine Section**
   - **4 gimballed engine bells**, each built from ~**28 regenerative cooling tubes**.
   - Turbopumps.
   - Gimbal actuators.

### 7.2 Shared Detail Elements
- `meshPhysicalMaterial` with clearcoat for all hull panels.
- Torus-ring ribs.
- Panel seam lines.
- RCS thruster quads.
- Access ladders.

---

## 8. Exhaust Plume

- GPU particle system: **~1,600 points**.
- Custom `ShaderMaterial`, additive blending, soft round sprites.
- Turbulent, billowing motion that **lengthens with lift/altitude**.
- Color ramp: white-hot core → gold → ember red.
- Dense, flickering inner cone for near-nozzle intensity.

---

## 9. Environment — `Environment.tsx`

### 9.1 Hangar
- Slow-rotating dust-mote point cloud.

### 9.2 Launch Pad (revealed at *Pad* chapter)
- Deck cylinder.
- Flame trench with ember-orange ring accent.
- Girder support tower: decks, support arms, strobe lights.
- Ground service equipment.
- Flood lights.

### 9.3 Ground Smoke
- Particle system billowing radially outward from the flame trench.
- Driven by an `ignitionAmount` ref (ramps up through Ignition/Liftoff chapters).

### 9.4 Cloud Deck
- Translucent sphere-based clouds.
- Sweeps past and clears the camera during ascent (Atmosphere chapter).

### 9.5 Earth
- **Fully procedural** — no network texture assets.
- Surface texture generated on `<canvas>` via fBm (fractal Brownian motion) noise:
  - Oceans, continents, deserts, snow peaks, polar ice caps.
- Separate banded cloud-alpha texture on a slightly larger enclosing sphere.
- Custom shader:
  - Fixed sun direction → soft day/night terminator.
  - Faint warm night-side city-light glow.
  - Fresnel-based atmospheric limb (back-side rim glow).
  - Outer haze shell for atmosphere thickness.
- **Framing constraint**: positioned low and behind the rocket/camera so only a small curved arc fills the bottom of frame — **never a full-screen grey mass**.

### 9.6 Space Props (revealed alongside Earth)
- Procedurally cratered moon, with its own directional light source.
- Distant sun: additive glow plane.
- Two orbiting satellites (solar arrays, dish antenna, red beacon light).
- Drifting orbital debris (point cloud).
- `fog={false}` set on all space-chapter materials (no atmospheric fog in the vacuum of space).

### 9.7 Stars
- `<Stars radius={900} count={9000} fade />`
- Only rendered once `p > 0.86`.

### 9.8 Lighting & Post-Processing
- `Environment` (drei) with `Lightformer` strips for studio-style fill.
- Strong key directional light.
- Blue rim light + warm fill light for silhouette separation.
- `FogExp2` in the navy background color for hangar/atmosphere depth.
- `EffectComposer`:
  - **Bloom**: intensity `~1.15`, `luminanceThreshold 0.18`, `mipmapBlur` enabled.
  - **Vignette**.

---

## 10. Overlay — `Overlay.tsx`

### 10.1 Scroll-Synced Text Beats
- Cross-fade in/out over each chapter's scroll range.
- Each beat includes:
  - **Eyebrow** label (e.g. *"Stage 06 — Payload Fairing & Nose Cone"*)
  - **Headline** (large)
  - **Supporting line** of real technical copy
  - **Spec chip row**, e.g.:
    - `18.5 t to LEO`
    - `LH2 @ −253 °C`
    - `7.6 MN sea level`
    - `±8° gimbal`
- Most beats anchor to the **lower third** of the viewport so the rocket remains the visual hero.

### 10.2 Systems Checklist Panel
- Appears during the *Systems* chapter.
- Ticks through status for:
  - Structural
  - Avionics
  - Propulsion
  - Navigation
  - Communication
  - Propellant

### 10.3 Live Ascent HUD
- Appears during flight chapters (Liftoff → Space).
- Displays, computed from scroll progress:
  - **Altitude** (km)
  - **Velocity** (km/h)
  - **Downrange** (km)
  - **Throttle** (%)
  - **T+** mission elapsed time

### 10.4 Additional UI Elements
- Scroll hint at the very top of the page (initial affordance).
- Final card: **"We have lift-off."**
- Thin scroll-progress rail along one screen edge.

---

## 11. Engineering Constraints

- **Strict typing**: `exactOptionalPropertyTypes` enabled — all components/props strictly typed.
- **SSR safety**: guard all `document`/`window`/canvas-texture-generation code so it never executes during server-side rendering.
- **Animation model**: all per-frame animation happens **exclusively inside `useFrame`**, driven by refs.
  - **No per-frame React state updates** — this is critical for performance given the particle counts and continuous camera motion.

---

## 12. Summary Table — Chapter → Visual Focus

| Chapter | Camera Focus | Key Visual Events |
|---|---|---|
| Hangar | Wide establishing shot | Dust motes, full rocket silhouette |
| Nose | Close orbit | Fairing detail, pitot mast |
| Payload | Close orbit | MLI blanket, solar array, dish |
| Avionics | Close orbit | Bay paneling, wiring |
| Tanks | Close orbit | LOX/LH2 isogrid, frost, He spheres |
| Engine | Close orbit | Bell tubes, turbopumps |
| Exploded | Pull back | Modules separate along Y-axis |
| Assembly | Orbit | Modules re-mate sequentially |
| Complete | — | Full stack assembled |
| Pad | — | Pad, tower, GSE revealed |
| Systems | — | Checklist panel ticks through |
| Ignition | Low hero shot | Ground smoke ramps up |
| Liftoff | Climbing chase | Plume lengthens, HUD appears |
| Atmosphere | Climbing chase | Cloud deck sweeps and clears |
| Space | Final wide pullback | Earth, moon, sun, satellites, stars |

---

*End of specification.*
