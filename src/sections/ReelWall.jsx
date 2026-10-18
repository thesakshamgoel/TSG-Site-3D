import { useEffect, useMemo, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { thumbFor } from '../data/media'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './ReelWall.css'

const GAP = 340 // depth between frames, px
const COUNT = 22
const LEAD = 2 * GAP // first frame starts this deep, so nothing pops in at full size

// deterministic scatter so the wall is identical on every visit
function rand(i, s) {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453
  return x - Math.floor(x)
}

function Frame({ p, f, i, total, onOpen, reduced }) {
  const z0 = -i * GAP - LEAD
  const z = useTransform(p, (v) => z0 + v * total)
  // past ~700px a frame is about to cross the lens: stop drawing it (a frame
  // at the perspective distance projects to infinity and flashes)
  const transform = useTransform(z, (zz) => `translate3d(${f.x}vw, ${f.y}vh, ${Math.min(zz, 720)}px)`)
  const opacity = useTransform(z, (zz) => {
    const inn = Math.min(1, Math.max(0, (zz + 4200) / 1400))
    const out = 1 - Math.min(1, Math.max(0, (zz - 380) / 300))
    return inn * out
  })
  const visibility = useTransform(z, (zz) => (zz > 690 || zz < -4300 ? 'hidden' : 'visible'))
  return (
    <motion.button
      type="button"
      className={`rw__frame rw__frame--${f.size}`}
      style={reduced ? undefined : { transform, opacity, visibility }}
      onClick={() => onOpen(f.p)}
      aria-label={`Watch ${f.p.title}`}
      tabIndex={-1}
    >
      <img src={thumbFor(f.p)} alt="" loading="lazy" draggable="false" />
      <span className="rw__cap">{f.p.title}</span>
    </motion.button>
  )
}

/**
 * Warp-speed star tunnel on a 2D canvas: stars stream out of the centre and
 * draw short glowing streaks. Speed rises with scroll velocity, so a hard
 * scroll feels like a jump. Runs only while the section is on screen.
 */
function StarTunnel({ intensity, reduced }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    const small = window.matchMedia('(max-width: 720px)').matches
    const N = small ? 220 : 520
    let W = 0, H = 0, dpr = 1, raf = null, visible = false, lastY = window.scrollY, vel = 0
    const stars = Array.from({ length: N }, () => ({ x: 0, y: 0, z: 0, pz: 0 }))
    const seed = (s, far) => {
      s.x = (Math.random() - 0.5) * 2
      s.y = (Math.random() - 0.5) * 2
      s.z = far ? 1 : Math.random()
      s.pz = s.z
    }
    stars.forEach((s) => seed(s, false))
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5)
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
      const k = intensity.get()
      const speed = reduced ? 0.0015 : 0.0025 + vel * 0.00045
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, W, H)
      if (k <= 0.01) return
      ctx.globalCompositeOperation = 'lighter'
      const cx = W / 2, cy = H / 2, f = Math.max(W, H) * 0.5
      for (const s of stars) {
        s.pz = s.z
        s.z -= speed
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
      visible = e.isIntersecting
      if (visible && raf == null) raf = requestAnimationFrame(draw)
      if (!visible && raf != null) { cancelAnimationFrame(raf); raf = null }
    })
    io.observe(c)
    window.addEventListener('resize', size)
    return () => {
      io.disconnect()
      window.removeEventListener('resize', size)
      if (raf != null) cancelAnimationFrame(raf)
    }
  }, [intensity, reduced])
  return <canvas className="rw__stars" ref={ref} aria-hidden="true" />
}

/**
 * The reel wall: every frame of his filmography hangs in depth inside a star
 * tunnel, and the scroll flies the camera through it. The section reveals
 * itself as it arrives (no hard edge over the hero), then the frames grow
 * from specks to full-size as they rush past.
 */
export default function ReelWall({ projects, onOpenProject }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const films = useMemo(() => {
    const list = (projects || []).filter((p) => p.category === 'film' && (p.youtubeId || p.vimeoId))
    return list.slice(0, COUNT).map((p, i) => {
      const side = i % 2 ? 1 : -1
      return {
        p,
        // keep the centre lane clear for the headline, push frames to the sides
        x: side * (24 + rand(i, 1) * 30),
        y: (rand(i, 2) - 0.5) * 80,
        size: ['s', 'm', 'l'][Math.floor(rand(i, 3) * 3)],
      }
    })
  }, [projects])
  const filmCount = (projects || []).filter((x) => x.category === 'film').length

  const total = films.length * GAP + LEAD + 600
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  // arrival: 0 while the section rises over the hero, 1 when it pins
  const { scrollYProgress: e } = useScroll({ target: ref, offset: ['start end', 'start start'] })

  const ground = useTransform(e, [0.35, 1], [0, 1]) // the dark backdrop fades up, no hard edge
  const stars = useTransform([e, p], ([a, b]) => Math.min(1, Math.max(0, (a - 0.2) / 0.6)) * (1 - Math.max(0, (b - 0.9) / 0.1)))
  const spaceO = useTransform(e, [0.55, 1], [0, 1])
  const headY = useTransform(e, [0.5, 1], [80, 0])
  const headScale = useTransform(p, [0, 0.5, 1], [0.92, 1.06, 1.5])
  const headOpacity = useTransform([e, p], ([a, b]) => Math.min(1, Math.max(0, (a - 0.6) / 0.4)) * (1 - Math.min(1, Math.max(0, (b - 0.72) / 0.18))))
  const count = useTransform(p, [0, 0.6], [0, filmCount])
  const countText = useTransform(count, (v) => Math.round(v))
  const blurb = useTransform(p, [0.55, 0.65, 0.8, 0.9], [0, 1, 1, 0])

  return (
    <section className="rw" id="reelwall" ref={ref}>
      <div className="rw__pin" data-opaque>
        <motion.div className="rw__ground" style={reduced ? { opacity: 1 } : { opacity: ground }} aria-hidden="true" />
        <StarTunnel intensity={stars} reduced={reduced} />
        <motion.div className="rw__space" style={reduced ? undefined : { opacity: spaceO }}>
          {films.map((f, i) => (
            <Frame key={f.p.id} p={p} f={f} i={i} total={total} onOpen={onOpenProject} reduced={reduced} />
          ))}
        </motion.div>
        <motion.h2 className="rw__head" style={reduced ? undefined : { y: headY, scale: headScale, opacity: headOpacity }}>
          <motion.span className="rw__num">{reduced ? filmCount : countText}</motion.span>
          <span className="rw__line">
            films. <em>One eye.</em>
          </span>
        </motion.h2>
        <motion.p className="rw__blurb" style={reduced ? undefined : { opacity: blurb }}>
          Short films, commercials, music videos. Shot, cut and graded.
        </motion.p>
      </div>
    </section>
  )
}
