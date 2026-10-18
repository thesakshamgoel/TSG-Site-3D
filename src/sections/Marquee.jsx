import { useRef } from 'react'
import { motion, useScroll, useTransform, useVelocity, useSpring } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './Marquee.css'

/**
 * Giant type divider. The strip pins in the middle of the screen for about
 * two screens of scroll while its words travel all the way across, so the
 * whole trail is read instead of glimpsed. Two rows run in opposite
 * directions on a gently curved 3D band; words light up solid gold as they
 * cross the centre (a static window over a gold copy of the row), and the
 * band skews with scroll speed.
 */
function Row({ words, x, skew, className, reduced }) {
  const line = [...words, ...words, ...words, ...words]
  return (
    <motion.div className={`mq__track ${className || ''}`} style={reduced ? undefined : { x, skewX: skew }}>
      {line.map((w, i) => (
        <span key={i}>
          {w}
          <i />
        </span>
      ))}
    </motion.div>
  )
}

export default function Marquee({ words, reverse = false }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollY } = useScroll()
  // progress across the whole pinned stretch
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const vel = useSpring(useVelocity(scrollY), { stiffness: 120, damping: 30 })
  const skew = useTransform(vel, [-2500, 0, 2500], [7, 0, -7])
  const dir = reverse ? -1 : 1
  // rows travel the full trail: the track is four copies wide, so -50% is two copies
  // a row moving left travels 0% -> -50%; moving right it travels -50% -> 0%
  // (mirroring the sign instead would slide the row off the right edge)
  const leftward = ['2%', '-52%']
  const rightward = ['-52%', '2%']
  const xA = useTransform(p, [0, 1], dir > 0 ? leftward : rightward)
  const xB = useTransform(p, [0, 1], dir > 0 ? rightward : leftward)
  const rotY = useTransform(p, [0, 1], [-9 * dir, 9 * dir])
  const scale = useTransform(p, [0, 0.5, 1], [0.94, 1.03, 0.94])
  const opacity = useTransform(p, [0, 0.1, 0.9, 1], [0, 1, 1, 0])

  return (
    <div className="mq" ref={ref} aria-hidden="true">
      <div className="mq__pin">
        <motion.div className="mq__band" style={reduced ? undefined : { rotateY: rotY, scale, opacity }}>
          <div className="mq__row mq__row--a">
            <Row words={words} x={xA} skew={skew} reduced={reduced} />
          </div>
          <div className="mq__row mq__row--b">
            <Row words={words} x={xB} skew={skew} className="mq__track--o" reduced={reduced} />
            {/* the same row, solid gold, seen only through the centre window */}
            <div className="mq__lit">
              <Row words={words} x={xB} skew={skew} className="mq__track--lit" reduced={reduced} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
