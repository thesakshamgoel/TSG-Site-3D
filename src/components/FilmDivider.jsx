import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './FilmDivider.css'

/**
 * Divider between sections: a strip of film edge. A hairline with sprocket
 * ticks draws out from the centre as it scrolls into view, with the next
 * reel's edge code on the left and a running timecode on the right.
 */
const pad = (n) => String(n).padStart(2, '0')

export default function FilmDivider({ reel, label }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const draw = useTransform(p, [0.1, 0.45], [0, 1])
  const textO = useTransform(p, [0.25, 0.45, 0.8, 0.95], [0, 1, 1, 0])
  const textY = useTransform(p, [0.25, 0.45], [10, 0])
  const tc = useTransform(p, (v) => {
    const f = Math.round(Math.min(1, Math.max(0, v)) * 24 * 6)
    return `00:00:${pad(Math.floor(f / 24))}:${pad(f % 24)}`
  })
  return (
    <div className="fdiv" ref={ref} role="separator" aria-label={label}>
      <motion.div className="fdiv__edge" style={reduced ? undefined : { scaleX: draw }} aria-hidden="true">
        <span className="fdiv__line" />
        <span className="fdiv__ticks" />
      </motion.div>
      <motion.div className="fdiv__meta" style={reduced ? undefined : { opacity: textO, y: textY }} aria-hidden="true">
        <span className="fdiv__reel">REEL {pad(reel)}</span>
        <span className="fdiv__label">{label}</span>
        <motion.span className="fdiv__tc">{tc}</motion.span>
      </motion.div>
    </div>
  )
}
