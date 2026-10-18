import { useRef } from 'react'
import { motion, useScroll, useTransform, useVelocity, useSpring } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './Marquee.css'

/**
 * Giant type divider: two rows travelling in opposite directions, driven by
 * this strip's own pass through the viewport. The strip leans and swells as
 * it crosses the screen, and skews with scroll speed.
 */
export default function Marquee({ words, reverse = false }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollY } = useScroll()
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const vel = useSpring(useVelocity(scrollY), { stiffness: 120, damping: 30 })
  const skew = useTransform(vel, [-2500, 0, 2500], [8, 0, -8])
  const dir = reverse ? -1 : 1
  const xA = useTransform(p, [0, 1], [`${-6 * dir}%`, `${-38 * dir}%`])
  const xB = useTransform(p, [0, 1], [`${-36 * dir}%`, `${-4 * dir}%`])
  const rotate = useTransform(p, [0, 0.5, 1], [-3 * dir, 0, 3 * dir])
  const scale = useTransform(p, [0, 0.5, 1], [0.92, 1.04, 0.92])
  const opacity = useTransform(p, [0, 0.18, 0.82, 1], [0.2, 1, 1, 0.2])
  const line = [...words, ...words, ...words, ...words]
  return (
    <div className="mq" ref={ref} aria-hidden="true">
      <motion.div className="mq__rows" style={reduced ? undefined : { rotate, scale, opacity }}>
        <motion.div className="mq__track" style={reduced ? undefined : { x: xA, skewX: skew }}>
          {line.map((w, i) => (
            <span key={i}>
              {w}
              <i />
            </span>
          ))}
        </motion.div>
        <motion.div className="mq__track mq__track--o" style={reduced ? undefined : { x: xB, skewX: skew }}>
          {line.map((w, i) => (
            <span key={i}>
              {w}
              <i />
            </span>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}
