const { useState: useFState, useEffect: useFEffect, useRef: useFRef } = React;

// ─────────────────────────────────────────────────────────────────────────
// DataFlow — centerpiece SVG animation: glasses → Claude → glasses
// Heavy use of <animateMotion>, dash-stroke orbits, conic-pulse, scan beam
// ─────────────────────────────────────────────────────────────────────────
const DataFlow = ({ accent, ink, line, muted, panel, bg }) => {
  // Particle generator helpers
  const upstream = (i, delay) => (
    <g key={`u${i}`}>
      <circle r="2.4" fill={accent}>
        <animateMotion dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1">
          <mpath href="#pathL" />
        </animateMotion>
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" />
      </circle>
    </g>
  );
  const upstreamR = (i, delay) => (
    <g key={`ur${i}`}>
      <circle r="2.4" fill={accent}>
        <animateMotion dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" rotate="auto">
          <mpath href="#pathR" />
        </animateMotion>
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" />
      </circle>
    </g>
  );
  const downstream = (i, delay) => (
    <g key={`d${i}`}>
      <rect x="-3" y="-1" width="6" height="2" rx="0.5" fill={ink}>
        <animateMotion dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" rotate="auto">
          <mpath href="#pathDownL" />
        </animateMotion>
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" />
      </rect>
    </g>
  );
  const downstreamR = (i, delay) => (
    <g key={`dr${i}`}>
      <rect x="-3" y="-1" width="6" height="2" rx="0.5" fill={ink}>
        <animateMotion dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" rotate="auto">
          <mpath href="#pathDownR" />
        </animateMotion>
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" />
      </rect>
    </g>
  );

  return (
    <svg viewBox="0 0 1200 540" style={{ width: "100%", height: "auto", display: "block" }} aria-hidden="true">
      <defs>
        {/* upstream paths: lens centers up to brain core */}
        <path id="pathL"     d="M 280 360 C 340 260, 480 220, 600 180" fill="none" />
        <path id="pathR"     d="M 920 360 C 860 260, 720 220, 600 180" fill="none" />
        {/* downstream paths: brain back down to lenses (slightly offset to avoid overlap) */}
        <path id="pathDownL" d="M 600 220 C 480 260, 360 300, 300 380" fill="none" />
        <path id="pathDownR" d="M 600 220 C 720 260, 840 300, 900 380" fill="none" />

        <radialGradient id="lensGlowL" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.7" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="brainGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>

        {/* stripes placeholder texture */}
        <pattern id="flowStripes" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={line} strokeWidth="1" />
        </pattern>

        {/* mask for scanline reveal across path */}
        <linearGradient id="scanGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity="0" />
          <stop offset="50%" stopColor={accent} stopOpacity="1" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* faint guideline rules */}
      <g stroke={line} strokeWidth="1" opacity="0.55">
        <line x1="0" y1="180" x2="1200" y2="180" strokeDasharray="2 6" />
        <line x1="0" y1="380" x2="1200" y2="380" strokeDasharray="2 6" />
      </g>
      <g fontFamily="ui-monospace, monospace" fontSize="10" fill={muted}>
        <text x="20" y="174">CLOUD · CLAUDE-VISION RUNTIME</text>
        <text x="20" y="402">EDGE · YOUR FRAMES</text>
        <text x="1100" y="402" textAnchor="end">240 ms ↺</text>
      </g>

      {/* visible flow paths */}
      <g fill="none" stroke={accent} strokeWidth="1.3" opacity="0.4" strokeDasharray="3 5">
        <use href="#pathL" />
        <use href="#pathR" />
      </g>
      <g fill="none" stroke={ink} strokeWidth="1.3" opacity="0.32" strokeDasharray="3 5">
        <use href="#pathDownL" />
        <use href="#pathDownR" />
      </g>

      {/* Brain / Claude core */}
      <g transform="translate(600 180)">
        <circle r="78" fill="url(#brainGlow)" />
        <circle r="46" fill={panel} stroke={ink} strokeWidth="1.5" />
        {/* orbiting dashed ring */}
        <g>
          <circle r="58" fill="none" stroke={ink} strokeWidth="1" strokeDasharray="3 6" opacity="0.6">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="14s" repeatCount="indefinite" />
          </circle>
        </g>
        <g>
          <circle r="68" fill="none" stroke={accent} strokeWidth="1.2" strokeDasharray="10 28" opacity="0.85">
            <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="22s" repeatCount="indefinite" />
          </circle>
        </g>
        {/* central aperture */}
        <g stroke={ink} strokeWidth="1.4" fill="none">
          <circle r="20" />
          <circle r="9" fill={accent} />
        </g>
        {/* pulse */}
        <circle r="46" fill="none" stroke={accent} strokeWidth="1.5">
          <animate attributeName="r" values="46;82;46" dur="3.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0;0.7" dur="3.2s" repeatCount="indefinite" />
        </circle>
        {/* label */}
        <text y="-58" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10" fill={muted} letterSpacing="1.5">
          REASONING · CORE
        </text>
      </g>

      {/* Left glasses lens */}
      <g transform="translate(280 380)">
        <circle r="52" fill="url(#lensGlowL)" />
        <rect x="-58" y="-38" width="116" height="76" rx="20" fill={panel} stroke={ink} strokeWidth="1.5" />
        <rect x="-58" y="-38" width="116" height="76" rx="20" fill="url(#flowStripes)" opacity="0.35" />
        {/* scanning beam across the lens */}
        <rect x="-58" y="-38" width="22" height="76" fill="url(#scanGrad)" opacity="0.85">
          <animate attributeName="x" from="-58" to="36" dur="2.4s" repeatCount="indefinite" />
        </rect>
        {/* aperture */}
        <g stroke={accent} strokeWidth="1.4" fill="none">
          <circle r="14" />
          <circle r="5" />
        </g>
        {/* corner crops */}
        <g stroke={ink} strokeWidth="1" opacity="0.6">
          <path d="M -52 -32 l 6 0 M -52 -32 l 0 6" />
          <path d="M 52 -32 l -6 0 M 52 -32 l 0 6" />
          <path d="M -52 32 l 6 0 M -52 32 l 0 -6" />
          <path d="M 52 32 l -6 0 M 52 32 l 0 -6" />
        </g>
        <text y="60" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10" fill={muted}>
          LENS · L · 1080p · 30fps
        </text>
      </g>

      {/* Right glasses lens */}
      <g transform="translate(920 380)">
        <circle r="52" fill="url(#lensGlowL)" />
        <rect x="-58" y="-38" width="116" height="76" rx="20" fill={panel} stroke={ink} strokeWidth="1.5" />
        <rect x="-58" y="-38" width="116" height="76" rx="20" fill="url(#flowStripes)" opacity="0.35" />
        <rect x="-58" y="-38" width="22" height="76" fill="url(#scanGrad)" opacity="0.85">
          <animate attributeName="x" from="36" to="-58" dur="2.4s" repeatCount="indefinite" />
        </rect>
        <g stroke={accent} strokeWidth="1.4" fill="none">
          <circle r="14" />
          <circle r="5" />
        </g>
        <g stroke={ink} strokeWidth="1" opacity="0.6">
          <path d="M -52 -32 l 6 0 M -52 -32 l 0 6" />
          <path d="M 52 -32 l -6 0 M 52 -32 l 0 6" />
          <path d="M -52 32 l 6 0 M -52 32 l 0 -6" />
          <path d="M 52 32 l -6 0 M 52 32 l 0 -6" />
        </g>
        <text y="60" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10" fill={muted}>
          LENS · R · 1080p · 30fps
        </text>
      </g>

      {/* upstream + downstream particles, staggered */}
      {[0, 0.4, 0.9, 1.4, 1.9].map((d, i) => upstream(i, d))}
      {[0.2, 0.7, 1.1, 1.6, 2.1].map((d, i) => upstreamR(i, d))}
      {[0.1, 0.6, 1.0, 1.5, 2.0].map((d, i) => downstream(i, d))}
      {[0.3, 0.8, 1.2, 1.7, 2.2].map((d, i) => downstreamR(i, d))}

      {/* small dataset tags floating up along paths */}
      <g fontFamily="ui-monospace, monospace" fontSize="9" fill={muted}>
        <g>
          <text>frame_0142.jpg</text>
          <animateMotion dur="2.6s" begin="0.5s" repeatCount="indefinite">
            <mpath href="#pathL" />
          </animateMotion>
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="2.6s" begin="0.5s" repeatCount="indefinite" />
        </g>
        <g>
          <text>audio_t=04:21</text>
          <animateMotion dur="2.6s" begin="1.3s" repeatCount="indefinite">
            <mpath href="#pathR" />
          </animateMotion>
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
        </g>
        <g fill={ink}>
          <text>caption →</text>
          <animateMotion dur="2.6s" begin="0.9s" repeatCount="indefinite">
            <mpath href="#pathDownL" />
          </animateMotion>
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="2.6s" begin="0.9s" repeatCount="indefinite" />
        </g>
        <g fill={ink}>
          <text>whisper →</text>
          <animateMotion dur="2.6s" begin="1.7s" repeatCount="indefinite">
            <mpath href="#pathDownR" />
          </animateMotion>
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="2.6s" begin="1.7s" repeatCount="indefinite" />
        </g>
      </g>

      {/* corner crops */}
      <g stroke={ink} strokeWidth="1" opacity="0.5">
        <path d="M 20 20 L 32 20 M 20 20 L 20 32" />
        <path d="M 1180 20 L 1168 20 M 1180 20 L 1180 32" />
        <path d="M 20 520 L 32 520 M 20 520 L 20 508" />
        <path d="M 1180 520 L 1168 520 M 1180 520 L 1180 508" />
      </g>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// LiveCaptureCard — animated transcript ticker
// ─────────────────────────────────────────────────────────────────────────
const LIVE_LINES = [
  { t: "04:21:03", role: "voice",  text: "Hey Aside — what time does the bakery on Main close?" },
  { t: "04:21:04", role: "aside",  text: "Looking now. Pulling local hours…" },
  { t: "04:21:05", role: "aside",  text: "It closes in nine minutes. Two blocks east — want directions?" },
  { t: "04:21:07", role: "voice",  text: "Yes, navigate there." },
  { t: "04:21:08", role: "aside",  text: "Routing. I'll cue you at each turn." }
];

const LiveCaptureCard = ({ accent, ink, muted, line, bg, panel }) => {
  const [n, setN] = useFState(1);
  useFEffect(() => {
    const id = setInterval(() => setN(prev => prev >= LIVE_LINES.length ? 1 : prev + 1), 1600);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      background: bg, border: `1px solid ${line}`, borderRadius: 14, padding: 18,
      fontFamily: "'Inter Tight', sans-serif", minWidth: 320, maxWidth: 360
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: 999, background: accent,
            boxShadow: `0 0 0 4px ${accent}33`,
            animation: "liveDot 1.4s ease-in-out infinite"
          }} />
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Live transcript</span>
        </div>
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: muted }}>session · 0x4F2A</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
        {LIVE_LINES.slice(0, n).map((l, i) => {
          const isLast = i === n - 1;
          const roleColor = l.role === "aside" ? accent : (l.role === "voice" ? ink : muted);
          return (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "60px 60px 1fr", gap: 8, alignItems: "baseline",
              animation: isLast ? "lineIn 380ms cubic-bezier(.2,.9,.3,1)" : "none",
              opacity: i < n - 3 ? 0.4 : 1, transition: "opacity 300ms"
            }}>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: muted }}>{l.t}</span>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: roleColor, textTransform: "uppercase", letterSpacing: "0.08em" }}>{l.role}</span>
              <span style={{ fontSize: 13, color: ink, lineHeight: 1.4 }}>{l.text}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, height: 1, background: line }} />
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Waveform accent={accent} muted={muted} />
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: muted }}>240 ms</span>
      </div>
    </div>
  );
};

const Waveform = ({ accent, muted }) => {
  const bars = 18;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 22 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} style={{
          width: 3, background: i % 4 === 0 ? accent : muted, borderRadius: 1,
          animation: `wave 1.1s ease-in-out ${i * 0.06}s infinite`,
          transformOrigin: "center"
        }} />
      ))}
    </div>
  );
};

Object.assign(window, { DataFlow, LiveCaptureCard, Waveform });
