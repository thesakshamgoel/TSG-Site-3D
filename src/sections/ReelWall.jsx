import { useMemo, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { thumbFor } from '../data/media'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './ReelWall.css'

const GAP = 340 // depth between frames, px
const COUNT = 22

// deterministic scatter so the wall is identical on every visit
function rand(i, s) {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453
  return x - Math.floor(x)
}

function Frame({ p, f, i, total, onOpen, reduced }) {
  const z0 = -i * GAP
  const z = useTransform(p, (v) => z0 + v * total)
  const transform = useTransform(z, (zz) => `translate3d(${f.x}vw, ${f.y}vh, ${zz}px)`)
  // fog in from the deep end, burn out as it passes the lens
  const opacity = useTransform(z, (zz) => {
    const inn = Math.min(1, Math.max(0, (zz + 4200) / 1400))
    const out = 1 - Math.min(1, Math.max(0, (zz - 420) / 280))
    return inn * out
  })
  return (
    <motion.button
      type="button"
      className={`rw__frame rw__frame--${f.size}`}
      style={reduced ? undefined : { transform, opacity }}
      onClick={() => onOpen(f.p)}
      aria-label={`Watch ${f.p.title}`}
    >
      <img src={thumbFor(f.p)} alt="" loading="lazy" draggable="false" />
      <span className="rw__cap">{f.p.title}</span>
    </motion.button>
  )
}

/**
 * The reel wall: every frame of his filmography hangs in depth, and the scroll
 * flies the camera through it. Frames grow from specks to full-size as they
 * rush past, so the sheer amount of work is felt rather than listed.
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

  const total = films.length * GAP + 600
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = scrollYProgress

  const headScale = useTransform(p, [0, 0.5, 1], [0.86, 1.08, 1.6])
  const headOpacity = useTransform(p, [0, 0.06, 0.7, 0.9], [0, 1, 1, 0])
  const count = useTransform(p, [0.04, 0.6], [0, (projects || []).filter((x) => x.category === 'film').length])
  const countText = useTransform(count, (v) => Math.round(v))

  return (
    <section className="rw" id="reelwall" ref={ref}>
      <div className="rw__pin" data-opaque>
        <div className="rw__space">
          {films.map((f, i) => (
            <Frame key={f.p.id} p={p} f={f} i={i} total={total} onOpen={onOpenProject} reduced={reduced} />
          ))}
        </div>
        <motion.h2
          className="rw__head"
          style={reduced ? undefined : { scale: headScale, opacity: headOpacity }}
        >
          <motion.span className="rw__num">{reduced ? films.length : countText}</motion.span>
          <span className="rw__line">
            films. <em>One eye.</em>
          </span>
        </motion.h2>
      </div>
    </section>
  )
}
