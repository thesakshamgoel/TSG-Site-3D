import { useMemo, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { thumbFor } from '../data/media'
import { LITE } from '../perf'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './ReelWall.css'

const GAP = 340 // depth between frames, px
const COUNT = LITE ? 12 : 22
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

// faint line-art film props that drift through the same depth as the frames
const PROPS = {
  reel: (
    <g fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="50" cy="50" r="44" />
      <circle cx="50" cy="50" r="7" />
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={50 + Math.cos((a * Math.PI) / 180) * 25} cy={50 + Math.sin((a * Math.PI) / 180) * 25} r="10" />
      ))}
    </g>
  ),
  clapper: (
    <g fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="12" y="40" width="76" height="48" rx="3" />
      <path d="M12 40 L84 22 L88 34 L16 52" />
      <path d="M30 35 L36 47 M48 30 L54 42 M66 26 L72 38" />
    </g>
  ),
  lens: (
    <g fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="50" cy="50" r="40" />
      <circle cx="50" cy="50" r="30" />
      <circle cx="50" cy="50" r="18" />
      <path d="M50 10 v8 M50 82 v8 M10 50 h8 M82 50 h8" />
    </g>
  ),
  can: (
    <g fill="none" stroke="currentColor" strokeWidth="1.4">
      <ellipse cx="50" cy="38" rx="40" ry="12" />
      <path d="M10 38 v24 a40 12 0 0 0 80 0 v-24" />
    </g>
  ),
}
const PROP_LIST = ['reel', 'lens', 'clapper', 'reel', 'can', 'lens', 'reel', 'clapper', 'can', 'reel']

function Prop({ p, kind, i, total, reduced }) {
  const z0 = -(i + 0.5) * GAP * 2.1 - LEAD
  const x = (i % 2 ? 1 : -1) * (12 + rand(i, 7) * 38)
  const y = (rand(i, 8) - 0.5) * 90
  const z = useTransform(p, (v) => z0 + v * total * 1.05)
  const transform = useTransform(z, (zz) => `translate3d(${x}vw, ${y}vh, ${Math.min(zz, 700)}px)`)
  const opacity = useTransform(z, (zz) => {
    const inn = Math.min(1, Math.max(0, (zz + 4400) / 1600))
    const out = 1 - Math.min(1, Math.max(0, (zz - 300) / 320))
    return inn * out * 0.32
  })
  if (reduced) return null
  return (
    <motion.span className="rw__prop" style={{ transform, opacity }} aria-hidden="true">
      <svg viewBox="0 0 100 100" style={{ animationDuration: `${18 + rand(i, 9) * 16}s`, animationDirection: i % 2 ? 'reverse' : 'normal' }}>
        {PROPS[kind]}
      </svg>
    </motion.span>
  )
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

  const spaceO = useTransform(e, [0.55, 1], [0, 1])
  const headY = useTransform(e, [0.5, 1], [80, 0])
  const headScale = useTransform(p, [0, 0.5, 1], [0.92, 1.06, 1.5])
  const headOpacity = useTransform([e, p], ([a, b]) => Math.min(1, Math.max(0, (a - 0.6) / 0.4)) * (1 - Math.min(1, Math.max(0, (b - 0.72) / 0.18))))
  const count = useTransform(p, [0, 0.6], [0, filmCount])
  const countText = useTransform(count, (v) => Math.round(v))

  return (
    <section className="rw" id="reelwall" ref={ref}>
      <div className="rw__pin" data-opaque>
        <motion.div className="rw__space" style={reduced ? undefined : { opacity: spaceO }}>
          {PROP_LIST.map((k, i) => (
            <Prop key={i} p={p} kind={k} i={i} total={total} reduced={reduced} />
          ))}
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
      </div>
    </section>
  )
}
