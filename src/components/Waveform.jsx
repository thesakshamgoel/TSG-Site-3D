import { useEffect, useRef } from 'react'
import './Waveform.css'

/**
 * Audio waveform section divider, drawn on a small 2D canvas (only while on
 * screen). Scroll moves the track past a fixed gold playhead; scrolling
 * faster plays it louder.
 *
 * variant "bars"   a stereo timeline track: mirrored channels, the part
 *                  already played lit gold, a running timecode
 * variant "scope"  an oscilloscope: three sound layers weaving together
 * variant "mesh"   a wireframe sound terrain: waveform rows receding in
 *                  perspective, joined into a mesh, rippling over time
 */
// deterministic pseudo-audio: phrases of energy with a little grain
function level(i) {
  const phrase = 0.55 + 0.45 * Math.sin(i * 0.045) * Math.sin(i * 0.013 + 1.3)
  const beat = 0.6 + 0.4 * Math.abs(Math.sin(i * 0.31))
  const grain = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
  return Math.max(0.06, Math.min(1, phrase * beat * (0.7 + grain * 0.3)))
}

export default function Waveform({ variant = 'bars', label = '' }) {
  const canvasRef = useRef(null)
  const tcRef = useRef(null)
  const rootRef = useRef(null)

  useEffect(() => {
    const c = canvasRef.current
    const root = rootRef.current
    if (!c || !root) return
    const ctx = c.getContext('2d')
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let W = 0, H = 0, raf = null, lastY = window.scrollY, loud = 0, t0 = performance.now()
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      W = c.clientWidth
      H = c.clientHeight
      c.width = Math.round(W * dpr)
      c.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    const gold = 'rgba(233, 184, 114, 1)'
    const draw = (now) => {
      raf = requestAnimationFrame(draw)
      const y = window.scrollY
      loud += (Math.min(Math.abs(y - lastY), 90) / 90 - loud) * 0.08
      lastY = y
      const r = root.getBoundingClientRect()
      // 0 as the divider enters at the bottom, 1 as it leaves at the top
      const pass = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight + r.height)))
      ctx.clearRect(0, 0, W, H)
      const mid = H / 2
      if (variant === 'mesh') {
        // pinned: progress through the sticky stretch drives the scale story
        const pp = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)))
        const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x) }
        const unfold = reduced ? 1 : sm(pp / 0.4) // a single line opens into terrain
        const push = reduced ? 0 : sm((pp - 0.58) / 0.42) // then the camera pushes in
        const fade = Math.min(1, pp / 0.05, (1 - pp) / 0.06 + 0.15)
        const time = reduced ? 0 : (now - t0) / 1000
        const ROWS = 18, STEP = 7
        const cols = Math.ceil(W / STEP) + 1
        // a calm, even swell: gentle amplitude, a soft response to scroll speed
        const amp = H * (0.04 + 0.11 * unfold) * (1 + 0.25 * loud)
        const pts = []
        for (let r2 = 0; r2 < ROWS; r2++) {
          const d = r2 / (ROWS - 1) // 0 back .. 1 front
          // rows spread evenly; the push-in is a gentle approach, not a lunge
          const persp = (1 - unfold + unfold * (0.5 + 0.5 * d)) * (1 + push * 0.35 * d)
          const baseY = mid + (d - 0.5) * H * 0.5 * unfold + push * H * 0.06 * d
          const row = []
          for (let c = 0; c < cols; c++) {
            const u = c / (cols - 1) - 0.5
            const x = W / 2 + u * W * persp
            const env = Math.exp(-Math.pow(u * 1.8, 2))
            const ph = time * 0.55 + pp * 3
            // two low, smooth harmonics only: no jagged high-frequency ripple
            const v =
              Math.sin(u * 11 + ph + r2 * 0.32) * 0.65 +
              Math.sin(u * 5 - ph * 0.7 + r2 * 0.18) * 0.45
            row.push([x, baseY - v * amp * env * (0.6 + 0.4 * persp)])
          }
          pts.push(row)
        }
        ctx.globalAlpha = Math.max(0, fade)
        pts.forEach((row, r2) => {
          const d = r2 / (ROWS - 1)
          ctx.beginPath()
          row.forEach(([x, y], c) => (c ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
          const a = unfold < 0.05 ? (r2 === ROWS - 1 ? 0.9 : 0) : 0.08 + 0.55 * d * d
          ctx.strokeStyle = `rgba(233, 184, 114, ${a.toFixed(3)})`
          ctx.lineWidth = 0.5 + d * 0.8
          ctx.stroke()
        })
        if (unfold > 0.05) {
          ctx.lineWidth = 0.6
          for (let c = 0; c < cols; c += 6) {
            ctx.beginPath()
            for (let r2 = 0; r2 < ROWS; r2++) {
              const [x, y] = pts[r2][c]
              r2 ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
            }
            ctx.strokeStyle = `rgba(233, 184, 114, ${(0.07 * unfold).toFixed(3)})`
            ctx.stroke()
          }
          // glowing points riding the peaks of the front rows
          for (let r2 = ROWS - 2; r2 < ROWS; r2++) {
            const row = pts[r2]
            for (let c = 4; c < cols - 4; c += 4) {
              if (row[c][1] < row[c - 4][1] && row[c][1] < row[c + 4][1]) {
                const [x, y] = row[c]
                ctx.fillStyle = 'rgba(255, 236, 200, 0.14)'
                ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.283); ctx.fill()
                ctx.fillStyle = 'rgba(255, 244, 222, 0.9)'
                ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 6.283); ctx.fill()
              }
            }
          }
        }
        ctx.globalAlpha = 1
        if (tcRef.current) tcRef.current.style.opacity = (unfold * (1 - push)).toFixed(3)
        return
      }
      if (variant === 'scope') {
        const time = reduced ? 0 : (now - t0) / 1000
        const amp = H * (0.26 + 0.2 * loud)
        const layers = [
          [0.012, 1.0, 0.85, 2],
          [0.021, 0.6, 0.45, 1.2],
          [0.007, 0.8, 0.3, 1],
        ]
        layers.forEach(([f, a, alpha, lw], li) => {
          ctx.beginPath()
          for (let x = 0; x <= W; x += 3) {
            const env = Math.sin((x / W) * Math.PI) // fade at both ends
            const ph = pass * 18 + time * (0.8 + li * 0.35)
            const v = Math.sin(x * f + ph) * Math.sin(x * f * 0.37 + ph * 0.6 + li) * a
            const yy = mid + v * amp * env
            if (x === 0) ctx.moveTo(x, yy)
            else ctx.lineTo(x, yy)
          }
          ctx.strokeStyle = `rgba(233, 184, 114, ${alpha})`
          ctx.lineWidth = lw
          ctx.stroke()
        })
        return
      }
      // bars: the track scrolls under a fixed playhead in the centre
      const bw = 3, gap = 2, step = bw + gap
      const count = Math.ceil(W / step) + 2
      const offset = pass * 1400 // samples travelled
      const first = Math.floor(offset / step)
      const shift = offset % step
      const playX = W / 2
      for (let k = 0; k < count; k++) {
        const x = k * step - shift
        const lv = level(first + k) * (0.75 + 0.35 * loud)
        const h = lv * (H * 0.42)
        const played = x + bw < playX
        // fade the ends of the strip so it sits softly in the page
        const edge = Math.min(1, x / (W * 0.12), (W - x) / (W * 0.12))
        ctx.fillStyle = played ? `rgba(233, 184, 114, ${0.9 * edge})` : `rgba(243, 236, 225, ${0.28 * edge})`
        ctx.fillRect(x, mid - h - 2, bw, h) // left channel, above
        ctx.fillRect(x, mid + 2, bw, h * 0.86) // right channel, below
      }
      // playhead
      ctx.fillStyle = gold
      ctx.fillRect(playX - 1, 6, 2, H - 12)
      ctx.beginPath()
      ctx.moveTo(playX - 6, 2)
      ctx.lineTo(playX + 6, 2)
      ctx.lineTo(playX, 10)
      ctx.fill()
      if (tcRef.current) {
        const frames = Math.floor(pass * 24 * 96)
        const p2 = (n) => String(n).padStart(2, '0')
        tcRef.current.textContent = `00:${p2(Math.floor(frames / 1440))}:${p2(Math.floor(frames / 24) % 60)}:${p2(frames % 24)}`
      }
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && raf == null) raf = requestAnimationFrame(draw)
      if (!e.isIntersecting && raf != null) { cancelAnimationFrame(raf); raf = null }
    })
    io.observe(root)
    window.addEventListener('resize', size)
    return () => {
      io.disconnect()
      window.removeEventListener('resize', size)
      if (raf != null) cancelAnimationFrame(raf)
    }
  }, [variant])

  return (
    <div className={`wave wave--${variant}`} ref={rootRef} aria-hidden="true">
      {variant === 'bars' && (
        <div className="wave__meta">
          <span className="wave__ch">A1</span>
          <span className="wave__label">{label}</span>
          <span className="wave__tc" ref={tcRef}>00:00:00:00</span>
        </div>
      )}
      {variant === 'mesh' ? (
        <div className="wave__pin">
          <canvas className="wave__canvas" ref={canvasRef} />
          <p className="wave__caption" ref={tcRef}>Sound design · Score · Mix</p>
        </div>
      ) : (
        <canvas className="wave__canvas" ref={canvasRef} />
      )}
      {variant === 'bars' && (
        <div className="wave__meta wave__meta--b">
          <span className="wave__ch">A2</span>
        </div>
      )}
    </div>
  )
}
