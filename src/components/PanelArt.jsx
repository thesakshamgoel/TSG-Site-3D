import './PanelArt.css'

/**
 * Line-art for the two reels: gold strokes, no photos. Every animation runs
 * only while the Work section is on screen (the section toggles .is-live),
 * and all motion is CSS transforms / dash offsets on a small SVG.
 */
const rad = (a) => (a * Math.PI) / 180

function FilmArt() {
  const cx = 262, cy = 128
  return (
    <svg className="part" viewBox="0 0 400 300" aria-hidden="true">
      {/* timecode ring, turning the other way */}
      <circle cx={cx} cy={cy} r="118" className="part__line part__line--dash part__counter" />
      {/* focus ring with its ticks */}
      <g className="part__spin">
        {Array.from({ length: 48 }, (_, i) => {
          const a = rad(i * 7.5)
          const r1 = i % 4 === 0 ? 92 : 97
          return <line key={i} x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)} x2={cx + 104 * Math.cos(a)} y2={cy + 104 * Math.sin(a)} className="part__line part__line--fine" />
        })}
        <circle cx={cx} cy={cy} r="88" className="part__line" />
      </g>
      {/* lens barrel rings */}
      <circle cx={cx} cy={cy} r="74" className="part__line part__line--soft" />
      <circle cx={cx} cy={cy} r="62" className="part__line" />
      {/* aperture iris: curved blades breathing open and shut */}
      <g className="part__iris">
        {Array.from({ length: 7 }, (_, i) => {
          const a = rad(i * (360 / 7))
          const b = rad(i * (360 / 7) + 64)
          const x1 = cx + 60 * Math.cos(a), y1 = cy + 60 * Math.sin(a)
          const x2 = cx + 60 * Math.cos(b), y2 = cy + 60 * Math.sin(b)
          const mx = cx + 22 * Math.cos(rad(i * (360 / 7) + 30)), my = cy + 22 * Math.sin(rad(i * (360 / 7) + 30))
          return <path key={i} d={`M${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} className="part__line part__line--soft" />
        })}
      </g>
      <circle cx={cx} cy={cy} r="16" className="part__glass" />
      <path d={`M${cx - 30} ${cy - 36} A 46 46 0 0 1 ${cx + 8} ${cy - 46}`} className="part__line part__glint" />
      {/* light rays leaking from the lens */}
      {[-28, -12, 4].map((a, i) => (
        <line key={a} x1={cx - 70 * Math.cos(rad(a))} y1={cy + 70 * Math.sin(rad(a))} x2={cx - 190 * Math.cos(rad(a))} y2={cy + 190 * Math.sin(rad(a))}
          className="part__line part__ray" style={{ animationDelay: `${i * 0.6}s` }} />
      ))}
      {/* clapperboard: the arm claps shut every few seconds */}
      <g transform="translate(34 40)">
        <rect x="0" y="22" width="92" height="58" rx="4" className="part__line" />
        <line x1="10" y1="44" x2="82" y2="44" className="part__line part__line--fine" />
        <line x1="10" y1="58" x2="62" y2="58" className="part__line part__line--fine" />
        <line x1="10" y1="70" x2="50" y2="70" className="part__line part__line--fine" />
        <rect x="0" y="12" width="92" height="10" className="part__line" />
        <g className="part__clap">
          <rect x="0" y="0" width="92" height="10" className="part__line" />
          {[8, 30, 52, 74].map((x) => <path key={x} d={`M${x} 0 l10 10`} className="part__line" />)}
        </g>
      </g>
      {/* a film strip curving across the bottom, frames and sprockets running */}
      <path className="part__line" d="M396 214 C 300 262, 150 268, 4 236" />
      <path className="part__line" d="M396 250 C 300 298, 150 304, 4 272" />
      <path className="part__frames" d="M396 232 C 300 280, 150 286, 4 254" />
      <path className="part__sprocket" d="M396 220 C 300 268, 150 274, 4 242" />
      <path className="part__sprocket" d="M396 244 C 300 292, 150 298, 4 266" />
    </svg>
  )
}

function GraphicsArt() {
  // Fibonacci squares for a golden spiral, laid out from the big square in
  const sq = [
    [150, 40, 144], // x, y, size
    [294, 40, 89],
    [328, 129, 55],
    [294, 150, 34],
    [294, 129, 21],
  ]
  const spiral = 'M150 184 A144 144 0 0 1 294 40 A89 89 0 0 1 383 129 A55 55 0 0 1 328 184 A34 34 0 0 1 294 150 A21 21 0 0 1 315 129'
  const pen = 'M40 250 C 90 140, 200 150, 250 260'
  const brand = ['#fbb03b', '#e9b872', '#39b54a', '#23c7c7', '#2e3192', '#7c6cff', '#ed1c24', '#c1272d']
  return (
    <svg className="part" viewBox="0 0 400 300" aria-hidden="true">
      {/* a ruler along the top */}
      <line x1="20" y1="16" x2="380" y2="16" className="part__line part__line--fine" />
      {Array.from({ length: 37 }, (_, i) => (
        <line key={i} x1={20 + i * 10} y1="16" x2={20 + i * 10} y2={i % 5 === 0 ? 26 : 21} className="part__line part__line--fine" />
      ))}
      {/* golden-ratio grid and its spiral drawing itself */}
      <g className="part__grid">
        {sq.map(([x, y, s], i) => <rect key={i} x={x} y={y} width={s} height={s} className="part__line part__line--soft" />)}
      </g>
      <path d={spiral} className="part__line part__spiral" />
      {/* colour wheel, turning */}
      <g className="part__wheel">
        {brand.map((c, i) => {
          const a0 = rad(i * 45), a1 = rad(i * 45 + 40)
          const r = 34, cx = 92, cy = 92
          return <path key={i} d={`M${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`} stroke={c} className="part__seg" />
        })}
        <circle cx="92" cy="92" r="20" className="part__line part__line--soft" />
      </g>
      {/* layered shapes rotating at their own speeds */}
      <g className="part__layer part__layer--a"><rect x="40" y="168" width="54" height="54" rx="10" className="part__line part__line--soft" /></g>
      <g className="part__layer part__layer--b"><rect x="50" y="178" width="34" height="34" rx="6" className="part__line" /></g>
      <g className="part__layer part__layer--c"><path d="M232 190 l20 34 h-40 z" className="part__line" /></g>
      {/* a type specimen */}
      <text x="300" y="262" className="part__type">Aa</text>
      {/* the pen tool: a point travelling the curve between its handles */}
      <path d={pen} className="part__line part__draw" />
      <line x1="40" y1="250" x2="90" y2="140" className="part__line part__line--soft" />
      <line x1="250" y1="260" x2="200" y2="150" className="part__line part__line--soft" />
      <rect x="35" y="245" width="10" height="10" className="part__node" />
      <rect x="245" y="255" width="10" height="10" className="part__node" />
      <circle cx="90" cy="140" r="4" className="part__node" />
      <circle cx="200" cy="150" r="4" className="part__node" />
      <circle r="4.5" className="part__runner" style={{ offsetPath: `path('${pen}')` }} />
    </svg>
  )
}

export default function PanelArt({ kind }) {
  return kind === 'film' ? <FilmArt /> : <GraphicsArt />
}
