import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './Intertitle.css'

/**
 * A chapter card between sections, like a silent-film intertitle: a small
 * chapter numeral, the next section's name set large, and two short rules.
 * It rises in and fades out with the scroll; nothing else moves.
 */
export default function Intertitle({ no, title }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const o = useTransform(p, [0.15, 0.4, 0.62, 0.85], [0, 1, 1, 0])
  const y = useTransform(p, [0.15, 0.4, 0.62, 0.85], [36, 0, 0, -36])
  const rule = useTransform(p, [0.2, 0.45], [0, 1])
  return (
    <div className="itt" ref={ref}>
      <motion.div className="itt__card" style={reduced ? undefined : { opacity: o, y }}>
        <span className="itt__no">{no}</span>
        <div className="itt__row">
          <motion.span className="itt__rule itt__rule--l" style={reduced ? undefined : { scaleX: rule }} />
          <h2 className="itt__title">{title}</h2>
          <motion.span className="itt__rule itt__rule--r" style={reduced ? undefined : { scaleX: rule }} />
        </div>
      </motion.div>
    </div>
  )
}
