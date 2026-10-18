import { useMemo, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { thumbFor } from '../data/media'
import StarTunnel from '../components/StarTunnel'
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

  const stars = useTransform([e, p], ([a, b]) => Math.min(1, Math.max(0, (a - 0.2) / 0.6)) * (1 - Math.max(0, (b - 0.9) / 0.1)))
  const spaceO = useTransform(e, [0.55, 1], [0, 1])
  const headY = useTransform(e, [0.5, 1], [80, 0])
  const headScale = useTransform(p, [0, 0.5, 1], [0.92, 1.06, 1.5])
  const headOpacity = useTransform([e, p], ([a, b]) => Math.min(1, Math.max(0, (a - 0.6) / 0.4)) * (1 - Math.min(1, Math.max(0, (b - 0.72) / 0.18))))
  const count = useTransform(p, [0, 0.6], [0, filmCount])
  const countText = useTransform(count, (v) => Math.round(v))
  const blurb = useTransform(p, [0.55, 0.65, 0.8, 0.9], [0, 1, 1, 0])

  return (
    <section className="rw seam-top" id="reelwall" ref={ref}>
      <div className="rw__pin" data-opaque>
        <div className="rw__ground" aria-hidden="true" />
        <StarTunnel className="rw__stars" intensity={stars} reduced={reduced} />
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
