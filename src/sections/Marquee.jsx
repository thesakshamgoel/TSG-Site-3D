import { motion, useScroll, useTransform, useVelocity, useSpring } from 'framer-motion'
import './Marquee.css'

/**
 * Giant type strip. Its travel follows scroll position and its skew follows
 * scroll velocity, so it reacts to how hard the visitor scrolls.
 */
export default function Marquee({ words, reverse = false }) {
  const { scrollY, scrollYProgress } = useScroll()
  const vel = useSpring(useVelocity(scrollY), { stiffness: 90, damping: 30 })
  const skew = useTransform(vel, [-3000, 0, 3000], [10, 0, -10])
  const base = useTransform(
    scrollYProgress,
    [0, 1],
    reverse ? ['-30%', '0%'] : ['0%', '-30%']
  )
  const line = [...words, ...words, ...words]
  return (
    <div className="mq" aria-hidden="true">
      <motion.div className="mq__track" style={{ x: base, skewX: skew }}>
        {line.map((w, i) => (
          <span key={i} className={i % 2 ? 'mq__o' : ''}>
            {w}
            <i />
          </span>
        ))}
      </motion.div>
    </div>
  )
}
