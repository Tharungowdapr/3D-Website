import { useScrollProgress } from "@/hooks/useScrollProgress";
import { clamp } from "@/lib/timeline";

type Beat = {
  a: number;
  b: number;
  eyebrow?: string;
  headline: string;
  sub?: string;
  tags?: string[];
  /** anchor text to the lower third so the vehicle stays the hero */
  low?: boolean;
};

const BEATS: Beat[] = [
  {
    a: 0.0,
    b: 0.07,
    eyebrow: "Aurora — Mission 01 · Heavy Launch Vehicle",
    headline: "The next journey begins here.",
    sub: "118 m tall. 6 stages of engineering. One window to orbit. Scroll to walk the vehicle, nose to nozzle.",
  },
  {
    a: 0.08,
    low: true,
    b: 0.15,
    eyebrow: "Stage 06 — Payload Fairing & Nose Cone",
    headline: "Built to cut through the atmosphere.",
    sub: "A two-piece ogive fairing splits along the seam and jettisons at 110 km, once dynamic pressure falls to zero.",
    tags: ["Ogive aeroshell", "Ablative TPS", "Split-seam jettison", "Pitot & beacon mast"],
  },
  {
    a: 0.16,
    low: true,
    b: 0.23,
    eyebrow: "Stage 05 — Payload Module",
    headline: "Everything begins with what we carry.",
    sub: "18.5 t to low Earth orbit, cradled in a gold thermal blanket and released by a low-shock separation ring.",
    tags: ["18.5 t to LEO", "Deployable solar array", "S-band dish", "MLI thermal blanket"],
  },
  {
    a: 0.24,
    low: true,
    b: 0.31,
    eyebrow: "Stage 04 — Avionics & Guidance",
    headline: "Precision decides everything.",
    sub: "Triple-redundant flight computers vote 2-of-3 every 4 ms, steering the stack through max-Q and staging.",
    tags: ["Triple-redundant FCC", "Ring-laser IMU", "GNSS fusion", "S-band telemetry"],
  },
  {
    a: 0.32,
    low: true,
    b: 0.39,
    eyebrow: "Stage 03 & 02 — Propellant",
    headline: "Stored energy. Controlled perfectly.",
    sub: "Cryogenic LOX above, insulated LH2 below — held at −253 °C behind isogrid walls and helium pressurant spheres.",
    tags: ["LOX @ −183 °C", "LH2 @ −253 °C", "Helium pressurisation", "Isogrid barrels", "Grid fins"],
  },
  {
    a: 0.4,
    low: true,
    b: 0.475,
    eyebrow: "Stage 01 — Propulsion",
    headline: "Power begins here.",
    sub: "Four staged-combustion engines, gimballed ±8°, producing 7.6 MN at sea level through regeneratively cooled bells.",
    tags: ["4 × staged combustion", "7.6 MN sea level", "Regenerative cooling", "±8° gimbal", "Turbopump fed"],
  },
  {
    a: 0.485,
    b: 0.555,
    eyebrow: "Exploded view",
    headline: "Every mission is made of thousands of decisions.",
    sub: "Now, bring them together.",
  },
  {
    low: true,
    a: 0.565,
    b: 0.675,
    eyebrow: "Assembly sequence",
    headline: "Integration in progress.",
    sub: "Engines first, then tankage, avionics, payload and fairing — each mated on the same vertical axis.",
  },
  { low: true, a: 0.685, b: 0.745, headline: "One machine. One mission. One destination." },
  {
    a: 0.755,
    low: true,
    b: 0.815,
    eyebrow: "Launch complex 01",
    headline: "Ready for launch.",
    sub: "Vehicle vertical. Arms retracting. Propellant load complete.",
  },
  {
    low: true,
    a: 0.868,
    b: 0.905,
    eyebrow: "T−00:00:03",
    headline: "Ignition.",
    sub: "Engine start sequence. Thrust building to 7.6 MN.",
  },
  { low: true, a: 0.912, b: 0.95, eyebrow: "T+00:00:04", headline: "Liftoff.", sub: "Tower cleared. Pitch-over begins." },
  {
    a: 0.952,
    low: true,
    b: 0.978,
    eyebrow: "Max-Q passed",
    headline: "The atmosphere is only the beginning.",
    sub: "Fairing away. The horizon starts to curve.",
  },
  { low: true, a: 0.979, b: 0.993, headline: "We have lift-off.", sub: "Now, the journey begins." },
];

const SYSTEMS: [string, string][] = [
  ["Structural", "READY"],
  ["Avionics", "NOMINAL"],
  ["Propulsion", "ARMED"],
  ["Navigation", "LOCKED"],
  ["Communication", "S-BAND OK"],
  ["Propellant", "100%"],
];


function beatOpacity(p: number, beat: Beat) {
  const fade = 0.012;
  const inn = clamp((p - beat.a) / fade);
  const out = 1 - clamp((p - (beat.b - fade)) / fade);
  return Math.min(inn, out);
}

export function Overlay() {
  const p = useScrollProgress();
  const systems = clamp((p - 0.818) / 0.05);
  const finale = clamp((p - 0.993) / 0.006);

  // derived ascent telemetry
  const flight = clamp((p - 0.905) / 0.095);
  const ascent = clamp((p - 0.9) / 0.02) * (1 - clamp((p - 0.99) / 0.006));
  const altitude = Math.pow(flight, 2.4) * 148;
  const velocity = Math.round(Math.pow(flight, 1.6) * 27500);
  const downrange = Math.pow(flight, 2.1) * 320;
  const throttle = flight < 0.35 ? 100 : flight < 0.5 ? 68 : 92;
  const stage = flight < 0.55 ? "01 · BOOST" : flight < 0.8 ? "SEPARATION" : "02 · VACUUM";
  const secs = Math.round(flight * 512);
  const met = `T+${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;


  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      {BEATS.map((beat) => {
        const o = beatOpacity(p, beat);
        if (o <= 0.001) return null;
        return (
          <div
            key={beat.a}
            className={`absolute inset-0 flex flex-col items-center px-[8vw] text-center ${
              beat.low ? "justify-end pb-[12vh]" : "justify-center"
            }`}
            style={{ opacity: o }}
          >
            {beat.eyebrow && (
              <p className="text-eyebrow mb-5 text-steel">{beat.eyebrow}</p>
            )}
            <h2
              className={`max-w-4xl text-balance font-light leading-[1.15] tracking-tight ${
                beat.low ? "text-[clamp(26px,3.6vw,50px)]" : "text-[clamp(30px,5vw,68px)]"
              }`}
              style={{
                filter: `blur(${(1 - o) * 8}px)`,
                transform: `translateY(${(1 - o) * 18}px)`,
              }}
            >
              {beat.headline}
            </h2>
            {beat.sub && (
              <p className="mt-5 max-w-lg text-sm font-light leading-relaxed text-steel">
                {beat.sub}
              </p>
            )}
            {beat.tags && (
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                {beat.tags.map((t) => (
                  <span key={t} className="spec-tag">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* mission control telemetry */}
      <div
        className="absolute left-[6vw] top-1/2 w-[260px] -translate-y-1/2 rounded-sm border border-steel/15 bg-space/60 p-5 backdrop-blur-md max-md:left-1/2 max-md:-translate-x-1/2"
        style={{ opacity: systems * (1 - clamp((p - 0.878) / 0.02)) }}
      >
        <h4 className="text-eyebrow mb-4 text-foreground">Mission status</h4>
        {SYSTEMS.map(([label, value], i) => (
          <div
            key={label}
            className="flex items-center justify-between border-b border-steel/15 py-1.5 text-[11px] tracking-wider text-steel"
            style={{ opacity: clamp((systems - i * 0.11) * 6) }}
          >
            <span className="uppercase">{label}</span>
            <span className="font-semibold text-signal">{value}</span>
          </div>
        ))}
        <p
          className="mt-4 text-center text-[11px] font-semibold tracking-[0.35em] text-ember"
          style={{ opacity: clamp((systems - 0.75) * 4) }}
        >
          ALL SYSTEMS GO
        </p>
      </div>

      {/* ascent telemetry HUD */}
      <div
        className="absolute right-[6vw] top-[14vh] w-[220px] rounded-sm border border-steel/15 bg-space/55 p-4 backdrop-blur-md max-md:right-4 max-md:top-4 max-md:w-[168px]"
        style={{ opacity: ascent }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-eyebrow text-foreground">Ascent</h4>
          <span className="text-[10px] font-semibold tracking-[0.25em] text-ember">{met}</span>
        </div>
        {([
          ["Altitude", `${altitude.toFixed(1)} km`],
          ["Velocity", `${velocity.toLocaleString()} km/h`],
          ["Downrange", `${downrange.toFixed(1)} km`],
          ["Throttle", `${throttle}%`],
          ["Stage", stage],
        ] as [string, string][]).map(([k, v]) => (
          <div
            key={k}
            className="flex items-center justify-between border-b border-steel/15 py-1.5 text-[11px] tracking-wider text-steel"
          >
            <span className="uppercase">{k}</span>
            <span className="font-semibold text-ice tabular-nums">{v}</span>
          </div>
        ))}
      </div>


      {/* final scene */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ opacity: finale, pointerEvents: finale > 0.6 ? "auto" : "none" }}
      >
        <h1 className="font-extralight tracking-tight text-[clamp(52px,10vw,140px)]">GO BEYOND.</h1>
        <p className="mt-3 text-xs font-semibold tracking-[0.5em] text-ice">AURORA — MISSION 01</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button className="btn-primary">Explore the mission</button>
          <button className="btn-ghost">Learn more</button>
        </div>
      </div>

      {/* progress rail */}
      <div className="absolute right-7 top-1/2 h-40 w-px -translate-y-1/2 bg-steel/25">
        <div
          className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-ember to-ice"
          style={{ height: `${p * 100}%` }}
        />
      </div>

      <div
        className="text-eyebrow absolute bottom-9 left-1/2 -translate-x-1/2 text-steel"
        style={{ opacity: 1 - clamp(p / 0.02) }}
      >
        Scroll to begin
      </div>
    </div>
  );
}
