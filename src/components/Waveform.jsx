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
 * variant "dots"   a random dot cloud that assembles into a waveform in
 *                  titanium and gold as it scrolls in
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
  const grid = useRef(null)
  const gridRef = useRef(null) // the resting dot grid: drawn once, its own layer

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
      if (variant === 'dots') {
        const small = window.matchMedia('(max-width: 720px)').matches
        // seeded random so the cloud is the same on every visit
        let seed = 7
        const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
        // resting dust: sparse random specks, drawn once on their own layer
        const dust = gridRef.current
        dust.width = Math.max(1, Math.round(W * dpr))
        dust.height = Math.max(1, Math.round(H * dpr))
        const f = dust.getContext('2d')
        f.setTransform(dpr, 0, 0, dpr, 0, 0)
        const specks = Math.round((W * H) / 1400)
        for (let i = 0; i < specks; i++) {
          f.fillStyle = `rgba(210, 200, 186, ${(0.05 + rnd() * 0.12).toFixed(3)})`
          const d = 0.6 + rnd() * 1.1
          f.fillRect(rnd() * W, rnd() * H, d, d)
        }
        // the waveform cloud: each dot has a random place inside the wave's
        // envelope, its own size, brightness and drift, and a random start
        // to fly in from (kept inside the canvas so nothing is clipped)
        const N = small ? 1500 : 3400
        const BUCKETS = 8
        const pts = []
        for (let i = 0; i < N; i++) {
          const u = rnd()
          pts.push({
            u,
            v: (rnd() * 2 - 1) * (0.35 + 0.65 * Math.sqrt(rnd())),
            size: (small ? 0.9 : 1) * (0.8 + Math.pow(rnd(), 2) * 2.2),
            alpha: 0.35 + rnd() * 0.65,
            ph: rnd() * 6.283,
            sx: (0.08 + rnd() * 0.84) * W,
            sy: (0.12 + rnd() * 0.76) * H,
            b: Math.min(BUCKETS - 1, Math.floor(u * BUCKETS)),
          })
        }
        pts.sort((a, b) => a.b - b.b) // draw colour bucket by bucket
        grid.current = { pts, BUCKETS }
      }
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
      if (variant === 'dots') {
        // a random dot cloud that forms a mirrored waveform: dust is always
        // there (never a blank start); as the divider scrolls in the dots
        // fly from random places into the wave, centre first, then shimmer.
        // Brushed titanium on the left warms to gold on the right, and a
        // light sheen slides across.
        const time = reduced ? 0 : (now - t0) / 1000
        const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x) }
        const assemble = reduced ? 1 : sm((pass - 0.04) / 0.4)
        const G = grid.current
        if (!G) return
        const sheenX = (((time * 0.12 + pass * 0.8) % 1.5) - 0.25) * W
        const boost = 1 + 0.3 * loud
        let bucket = -1
        for (const q of G.pts) {
          if (q.b !== bucket) {
            bucket = q.b
            const k = sm((bucket / (G.BUCKETS - 1)) * 1.3 - 0.15)
            ctx.fillStyle = `rgb(${Math.round(160 + 73 * k)},${Math.round(157 + 27 * k)},${Math.round(152 - 38 * k)})`
          }
          const u = q.u - 0.5
          const env = Math.exp(-Math.pow(u * 1.7, 2))
          const osc = 0.5 + 0.5 * Math.sin(u * 13 + time * 1.3) * Math.sin(u * 4.6 - time * 0.75)
          const amp = (H / 2) * 0.8 * env * (0.25 + 0.75 * osc) * boost
          const tx = q.u * W + Math.sin(time * 0.7 + q.ph) * 2.2
          const ty = mid + q.v * amp + Math.cos(time * 0.9 + q.ph) * 1.6
          // centre first: each dot starts its flight a little later the
          // further it sits from the middle
          const k = sm(assemble * 1.5 - Math.abs(u) * 0.8)
          const x = q.sx + (tx - q.sx) * k
          const y = q.sy + (ty - q.sy) * k
          const shine = Math.exp(-Math.pow((x - sheenX - (y - mid) * 0.5) / 70, 2))
          ctx.globalAlpha = Math.min(1, q.alpha * (0.3 + 0.7 * k) + shine * 0.5)
          const d = q.size + shine * 1.1
          ctx.fillRect(x - d / 2, y - d / 2, d, d)
        }
        ctx.globalAlpha = 1
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
      {variant === 'dots' && <canvas className="wave__canvas wave__grid" ref={gridRef} />}
      <canvas className="wave__canvas" ref={canvasRef} />
      {variant === 'dots' && <p className="wave__caption" ref={tcRef}>Sound design · Score · Mix</p>}
      {variant === 'bars' && (
        <div className="wave__meta wave__meta--b">
          <span className="wave__ch">A2</span>
        </div>
      )}
    </div>
  )
}
