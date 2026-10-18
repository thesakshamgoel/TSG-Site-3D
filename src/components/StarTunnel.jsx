import { useEffect, useRef } from 'react'

/**
 * Warp-speed star tunnel on a 2D canvas: stars stream out of the centre and
 * draw short glowing streaks. Used by the loader and the reel wall.
 *
 * intensity  number, motion value or function: 0 hides, 1 full brightness
 * speed      optional function returning the travel speed per frame; when
 *            omitted, speed follows scroll velocity (a hard scroll = a jump)
 * Runs only while the canvas is on screen.
 */
const read = (v) => (typeof v === 'function' ? v() : v && typeof v.get === 'function' ? v.get() : v ?? 1)

export default function StarTunnel({ intensity = 1, speed, reduced = false, className = '' }) {
  const ref = useRef(null)
  const props = useRef({ intensity, speed })
  props.current = { intensity, speed }

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    const small = window.matchMedia('(max-width: 720px)').matches
    const N = small ? 220 : 520
    let W = 0, H = 0, raf = null, lastY = window.scrollY, vel = 0
    const stars = Array.from({ length: N }, () => ({ x: 0, y: 0, z: 0, pz: 0 }))
    const seed = (s, far) => {
      s.x = (Math.random() - 0.5) * 2
      s.y = (Math.random() - 0.5) * 2
      s.z = far ? 1 : Math.random()
      s.pz = s.z
    }
    stars.forEach((s) => seed(s, false))
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5)
      W = c.clientWidth
      H = c.clientHeight
      c.width = Math.round(W * dpr)
      c.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const y = window.scrollY
      vel += (Math.min(Math.abs(y - lastY), 120) - vel) * 0.12
      lastY = y
      const k = read(props.current.intensity)
      const sp = props.current.speed ? props.current.speed() : reduced ? 0.0015 : 0.0025 + vel * 0.00045
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, W, H)
      if (k <= 0.01) return
      ctx.globalCompositeOperation = 'lighter'
      const cx = W / 2, cy = H / 2, f = Math.max(W, H) * 0.5
      for (const s of stars) {
        s.pz = s.z
        s.z -= sp
        if (s.z <= 0.02) { seed(s, true); continue }
        const x = cx + (s.x / s.z) * f, y2 = cy + (s.y / s.z) * f
        const px = cx + (s.x / s.pz) * f, py = cy + (s.y / s.pz) * f
        if (x < -40 || x > W + 40 || y2 < -40 || y2 > H + 40) { seed(s, true); continue }
        const a = Math.min(1, (1 - s.z) * 1.4) * k
        const w = (1 - s.z) * 2.4 + 0.3
        // soft halo, then the bright core
        ctx.strokeStyle = `rgba(233, 184, 114, ${(a * 0.22).toFixed(3)})`
        ctx.lineWidth = w * 3.2
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y2); ctx.stroke()
        ctx.strokeStyle = `rgba(255, 240, 214, ${(a * 0.9).toFixed(3)})`
        ctx.lineWidth = w
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x + 0.01, y2 + 0.01); ctx.stroke()
      }
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && raf == null) raf = requestAnimationFrame(draw)
      if (!e.isIntersecting && raf != null) { cancelAnimationFrame(raf); raf = null }
    })
    io.observe(c)
    window.addEventListener('resize', size)
    return () => {
      io.disconnect()
      window.removeEventListener('resize', size)
      if (raf != null) cancelAnimationFrame(raf)
    }
  }, [reduced])

  return <canvas className={`star-tunnel ${className}`} ref={ref} aria-hidden="true" />
}
