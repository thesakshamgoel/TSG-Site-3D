import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useMotionValue } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './FramesReel.css'

function Frame({ s, i, x, vw, onOpen }) {
  // each image drifts against the track so frames feel like windows, not cards
  const ix = useTransform(x, (v) => `${(v / Math.max(vw, 1)) * -6 - i * 2}%`)
  // frames swell as they cross the centre of the screen and turn away at the edges
  const ref = useRef(null)
  const d = useMotionValue(1)
  useEffect(() => {
    const upd = (v) => {
      const n = ref.current
      if (!n) return
      const c = n.offsetLeft + n.offsetWidth / 2 + v
      d.set((c - window.innerWidth / 2) / window.innerWidth)
    }
    upd(x.get())
    return x.on('change', upd)
  }, [x, d])
  const scale = useTransform(d, (v) => 1.14 - Math.min(Math.abs(v), 0.9) * 0.38)
  const rotateY = useTransform(d, (v) => Math.max(-1, Math.min(1, v)) * -16)
  const opacity = useTransform(d, (v) => 1 - Math.min(Math.abs(v), 0.9) * 0.45)
  return (
    <motion.button
      ref={ref}
      style={{ scale, rotateY, opacity }}
      className={`fr__frame fr__frame--${i % 3}`}
      onClick={() => onOpen({ title: s.title, image: s.image, mediaType: 'image' })}
      aria-label={`View ${s.title}`}
    >
      <motion.img src={s.image} alt={s.title} draggable="false" style={{ x: ix }} loading="lazy" />
      <span className="fr__cap timecode">
        {String(i + 1).padStart(2, '0')} / {s.title}
      </span>
    </motion.button>
  )
}

/**
 * Pinned horizontal travel: vertical scroll drives the strip sideways, with a
 * giant outlined title moving at a different rate behind it for depth.
 */
export default function FramesReel({ stills, onOpenImage }) {
  const slides = (stills || []).slice(0, 5)
  const ref = useRef(null)
  const trackRef = useRef(null)
  const reduced = useReducedMotion()
  const [dist, setDist] = useState(0)
  const [vw, setVw] = useState(1200)
  const [vh, setVh] = useState(800)

  useEffect(() => {
    const m = () => {
      const t = trackRef.current
      if (!t) return
      setVw(window.innerWidth)
      setVh(window.innerHeight)
      setDist(Math.max(0, t.scrollWidth - window.innerWidth))
    }
    m()
    const id = setTimeout(m, 600)
    window.addEventListener('resize', m)
    return () => {
      clearTimeout(id)
      window.removeEventListener('resize', m)
    }
  }, [slides.length])

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = scrollYProgress
  const x = useTransform(p, [0, 1], [0, -dist])
  const bgx = useTransform(p, [0, 1], ['4%', '-30%'])
  const fill = useTransform(p, [0, 1], ['0%', '100%'])

  if (!slides.length) return null

  return (
    <section
      className="fr"
      id="frames"
      ref={ref}
      style={reduced ? undefined : { height: `${Math.max(dist, 1) + vh}px` }}
    >
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
        <motion.div className="fr__track" ref={trackRef} style={reduced ? undefined : { x }}>
          {slides.map((s, i) => (
            <Frame key={s.id} s={s} i={i} x={x} vw={vw} onOpen={onOpenImage} />
          ))}
        </motion.div>
        <i className="fr__prog" aria-hidden="true">
          <motion.b style={{ width: fill }} />
        </i>
      </div>
    </section>
  )
}
