import { useEffect, useRef } from 'react'
import { LITE } from '../perf'

/**
 * Star tunnel on a 2D canvas: stars stream out of the centre and draw short
 * streaks.
 *
 * intensity  number, motion value, or function: 0 hides, 1 full brightness.
 *            A function is called once per frame and must be cheap.
 * speed      optional function returning travel speed per 16.7 ms of time.
 *            Motion is scaled by real elapsed time, so it looks identical on
 *            60, 120 and 144 Hz screens.
 *
 * It does no work while invisible: when intensity reaches 0 the loop stops
 * (and clears the canvas once); `wake()` via a scroll event restarts it.
 */
const read = (v) => (typeof v === 'function' ? v() : v && typeof v.get === 'function' ? v.get() : v ?? 1)

export default function StarTunnel({ intensity = 1, speed, reduced = false, className = '' }) {
  const ref = useRef(null)
  const props = useRef({ intensity, speed })
  props.current = { intensity, speed }

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d', { alpha: true })
    const small = window.matchMedia('(max-width: 720px)').matches
    const N = LITE ? (small ? 70 : 110) : 200
    let W = 0, H = 0, raf = null, last = 0, lastY = window.scrollY, vel = 0, onScreen = true, cleared = false
    const stars = Array.from({ length: N }, () => ({ x: 0, y: 0, z: 0, pz: 0 }))
    const seed = (s, far) => {
      s.x = (Math.random() - 0.5) * 2
      s.y = (Math.random() - 0.5) * 2
      s.z = far ? 1 : Math.random()
      s.pz = s.z
    }
    stars.forEach((s) => seed(s, false))
    const size = () => {
      W = c.clientWidth
      H = c.clientHeight
      c.width = Math.max(1, Math.round(W))
      c.height = Math.max(1, Math.round(H))
    }
    size()

    const draw = (now) => {
      raf = null
      if (!onScreen) return
      // elapsed time in 60 Hz frames, clamped so a stalled tab never jumps
      const k60 = Math.min(3, last ? (now - last) / 16.667 : 1)
      last = now
      const y = window.scrollY
      vel += (Math.min(Math.abs(y - lastY), 120) - vel) * Math.min(1, 0.12 * k60)
      lastY = y
      const k = read(props.current.intensity)
      if (k <= 0.01) {
        // fully hidden: clear once, then stand down until woken
        if (!cleared) { ctx.clearRect(0, 0, W, H); cleared = true }
        last = 0
        return
      }
      cleared = false
      const sp = (props.current.speed ? props.current.speed() : reduced ? 0.0015 : 0.0025 + vel * 0.00045) * k60
      ctx.clearRect(0, 0, W, H)
      ctx.lineCap = 'round'
      const cx = W / 2, cy = H / 2, f = Math.max(W, H) * 0.5
      for (const s of stars) {
        s.pz = s.z
        s.z -= sp
        if (s.z <= 0.02) { seed(s, true); continue }
        const x = cx + (s.x / s.z) * f, y2 = cy + (s.y / s.z) * f
        const px = cx + (s.x / s.pz) * f, py = cy + (s.y / s.pz) * f
        if (x < -40 || x > W + 40 || y2 < -40 || y2 > H + 40) { seed(s, true); continue }
        const a = Math.min(1, (1 - s.z) * 1.4) * k
        ctx.strokeStyle = `rgba(255, 240, 214, ${(a * 0.85).toFixed(2)})`
        ctx.lineWidth = (1 - s.z) * 2.2 + 0.3
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x + 0.01, y2 + 0.01); ctx.stroke()
      }
      raf = requestAnimationFrame(draw)
    }
    const wake = () => { if (raf == null && onScreen) raf = requestAnimationFrame(draw) }

    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting
      if (onScreen) wake()
      else if (raf != null) { cancelAnimationFrame(raf); raf = null; last = 0 }
    })
    io.observe(c)
    // a hidden field wakes on scroll (cheap listener, no layout reads)
    window.addEventListener('scroll', wake, { passive: true })
    window.addEventListener('resize', size)
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', wake)
      window.removeEventListener('resize', size)
      if (raf != null) cancelAnimationFrame(raf)
    }
  }, [reduced])

  return <canvas className={`star-tunnel ${className}`} ref={ref} aria-hidden="true" />
}
