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

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

/**
 * One figure in the flyby ("50+ projects."), moving in the same 3D space as
 * the film frames. Timed in screen heights of scroll from the top of the page:
 * it comes from far back, tilted, and straightens as it arrives; drifts closer
 * while its number counts up; then sweeps past the camera, tilting the other
 * way and dimming as it goes, like the frames do. From arrival to exit it is
 * one continuous motion, so there is no corner where it stops and restarts.
 */
function Beat({ vh, value, label, at, side = 1, reduced, as: Tag = 'p' }) {
  const [e0, e1, , l1] = at
  const m = String(value).match(/^(\d+)(.*)$/)
  const target = m ? +m[1] : 0
  const suffix = m ? m[2] : ''
  const digits = String(target).length
  // depth in px: -1500 far away, 0 at rest distance, +720 brushing the lens
  const z = useTransform(vh, (v) => {
    if (v < e1) return -1500 * (1 - easeOut(clamp01((v - e0) / (e1 - e0))))
    const t = clamp01((v - e1) / (l1 - e1))
    return 230 * t + 490 * Math.pow(t, 2.5)
  })
  const rx = useTransform(vh, (v) => (v < e1 ? 16 * (1 - easeOut(clamp01((v - e0) / (e1 - e0)))) : -10 * Math.pow(clamp01((v - e1) / (l1 - e1)), 2)))
  const ry = useTransform(vh, (v) => side * (v < e1 ? 12 * (1 - easeOut(clamp01((v - e0) / (e1 - e0)))) : -8 * Math.pow(clamp01((v - e1) / (l1 - e1)), 2)))
  const transform = useTransform([z, rx, ry], ([zz, x, y]) => `translate3d(-50%, -50%, ${zz.toFixed(1)}px) rotateX(${x.toFixed(2)}deg) rotateY(${y.toFixed(2)}deg)`)
  const opacity = useTransform(z, (zz) => clamp01((zz + 1500) / 700) * (1 - clamp01((zz - 360) / 340)))
  const visibility = useTransform(vh, (v) => (v < e0 || v > l1 ? 'hidden' : 'visible'))
  const n = useTransform(vh, (v) => Math.round(target * easeOut(clamp01((v - e0) / ((e1 - e0) * 1.6)))))
  const MotionTag = motion[Tag]
  return (
    <MotionTag className="rw__head" style={reduced ? undefined : { transform, opacity, visibility }}>
      <span className="rw__fig">
        {/* room for the final number from the start, so the line never shifts */}
        <motion.span className="rw__num" style={{ minWidth: `${digits}ch` }}>{reduced ? target : n}</motion.span>{suffix}
      </span>
      <span className="rw__line">{label}</span>
    </MotionTag>
  )
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
export default function ReelWall({ projects, stats = [], onOpenProject }) {
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
  const total = films.length * GAP + LEAD + 600
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  // Arrival. The reel sits pinned underneath the hero from the top of the
  // page; it shows itself while the camera pushes into the hero's logo, so it
  // comes out of the depth instead of rising from the bottom. (With reduced
  // motion there is no push-in, and it arrives the ordinary way.)
  const { scrollY } = useScroll()
  const { scrollYProgress: e } = useScroll({ target: ref, offset: ['start end', 'start start'] })
  const handoff = useTransform(scrollY, (v) => {
    const H = window.innerHeight
    // starts once the hero has mostly parted and left the centre clear
    return Math.min(1, Math.max(0, (v - 0.4 * H) / (0.5 * H)))
  })
  const arrival = reduced ? e : handoff
  const spaceO = useTransform(arrival, [0.15, 1], [0, 1])
  // scroll in screen heights from the top of the page, for the two figures
  const vh = useTransform(scrollY, (v) => v / window.innerHeight)
  // just the two that matter here: projects and brands
  const beats = stats.slice(0, 2).map((st) => ({ value: st.value, label: `${String(st.label).toLowerCase()}.` }))
  const TIMES = [
    [0.4, 0.9, 1.55, 2.05], // arrives with the hero's exit, holds, flies past
    [1.95, 2.45, 3.05, 3.55],
  ]

  return (
    <section className={`rw ${reduced ? '' : 'rw--under'}`} id="reelwall" ref={ref} data-rail-offset={reduced ? undefined : '1'}>
      <div className="rw__pin" data-opaque>
        <motion.div className="rw__space" style={reduced ? undefined : { opacity: spaceO }}>
          {PROP_LIST.map((k, i) => (
            <Prop key={i} p={p} kind={k} i={i} total={total} reduced={reduced} />
          ))}
          {films.map((f, i) => (
            <Frame key={f.p.id} p={p} f={f} i={i} total={total} onOpen={onOpenProject} reduced={reduced} />
          ))}
        </motion.div>
        <div className="rw__heads">
          {beats.map((bt, i) => (
            <Beat key={bt.label} vh={vh} value={bt.value} label={bt.label} at={TIMES[i]} side={i ? -1 : 1} reduced={reduced} as={i ? 'p' : 'h2'} />
          ))}
        </div>
      </div>
    </section>
  )
}
