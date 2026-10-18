import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './FramesReel.css'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

/**
 * One still in the coverflow. Every frame is the same 16:9 size; its place in
 * the arc comes from its distance d to the frame in focus: centre faces you,
 * neighbours swing back in depth, smaller and dimmer.
 */
function Frame({ s, i, c, onOpen, reduced }) {
  const d = useTransform(c, (v) => i - v)
  const transform = useTransform(d, (v) => {
    const a = Math.abs(v)
    const x = clamp(v, -3, 3) * 58 // % of the frame width
    const z = -Math.min(a, 3) * 260
    const ry = clamp(v, -1, 1) * -34
    const sc = 1 - Math.min(a, 2) * 0.12
    return `translateX(${x}%) translateZ(${z}px) rotateY(${ry}deg) scale(${sc})`
  })
  const opacity = useTransform(d, (v) => 1 - Math.min(Math.abs(v), 2.6) * 0.33)
  const zIndex = useTransform(d, (v) => 100 - Math.round(Math.abs(v) * 10))
  const imgX = useTransform(d, (v) => `${clamp(v, -2, 2) * -7}%`)
  const shade = useTransform(d, (v) => Math.min(Math.abs(v), 1) * 0.55)
  return (
    <motion.button
      type="button"
      className="fr__frame"
      style={reduced ? undefined : { transform, opacity, zIndex }}
      onClick={() => onOpen({ title: s.title, image: s.image, mediaType: 'image' })}
      aria-label={`View ${s.title}`}
    >
      <motion.img src={s.image} alt={s.title} draggable="false" loading="lazy" style={reduced ? undefined : { x: imgX }} />
      <motion.span className="fr__shade" style={reduced ? undefined : { opacity: shade }} />
      <span className="fr__perf fr__perf--t" aria-hidden="true" />
      <span className="fr__perf fr__perf--b" aria-hidden="true" />
    </motion.button>
  )
}

/**
 * Frames from the field: a pinned coverflow. Vertical scroll turns the reel;
 * a thumbnail strip along the bottom shows where you are and jumps.
 */
export default function FramesReel({ stills, onOpenImage }) {
  const slides = (stills || []).slice(0, 5)
  const n = slides.length
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const [active, setActive] = useState(0)

  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  // continuous index of the frame in focus, with a short settle at each end
  const c = useTransform(p, (v) => clamp((v - 0.06) / 0.88, 0, 1) * (n - 1))
  useMotionValueEvent(c, 'change', (v) => setActive(Math.round(v)))
  const bgx = useTransform(p, [0, 1], ['6%', '-34%'])
  const fill = useTransform(p, [0, 1], [0, 1])

  const jump = (i) => {
    const el = ref.current
    if (!el) return
    const travel = el.offsetHeight - window.innerHeight
    const v = 0.06 + (i / Math.max(n - 1, 1)) * 0.88
    window.scrollTo({ top: el.offsetTop + v * travel, behavior: 'smooth' })
  }

  if (!n) return null

  return (
    <section className="fr" id="frames" ref={ref} style={reduced ? undefined : { height: `${n * 75 + 100}vh` }}>
      <div className="fr__pin">
        <motion.p className="fr__bg" aria-hidden="true" style={reduced ? undefined : { x: bgx }}>
          Frames from the field
        </motion.p>
        <div className="fr__head container">
          <span className="slate">Latest Stills</span>
          <h2 className="section-title">
            Frames from <span className="gradient-text">the field.</span>
          </h2>
        </div>

        <div className="fr__stage">
          <div className="fr__arc">
            {slides.map((s, i) => (
              <Frame key={s.id} s={s} i={i} c={c} onOpen={onOpenImage} reduced={reduced} />
            ))}
          </div>
        </div>

        <div className="fr__foot container">
          <p className="fr__count" aria-live="polite">
            <b>{String(active + 1).padStart(2, '0')}</b>
            <span>/ {String(n).padStart(2, '0')}</span>
          </p>
          <div className="fr__strip" role="tablist" aria-label="Stills">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={s.title}
                className="fr__thumb"
                style={{ backgroundImage: `url(${s.image})` }}
                onClick={() => jump(i)}
              />
            ))}
            <motion.i className="fr__bar" aria-hidden="true" style={{ scaleX: fill }} />
          </div>
        </div>
      </div>
    </section>
  )
}
