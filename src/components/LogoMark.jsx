import { motion } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { VIEWBOX, LOOP, DOTS, TICKS, BRUSH } from './logoArt'
import './LogoMark.css'

/**
 * The brand mark, animated: the infinity loop draws itself in gold and
 * fills in, the four colour dots pop in one by one and the colour wheel then
 * turns slowly, and the brush sweeps into place. Same artwork as
 * public/logo.svg, split into its parts so each can move.
 */
export default function LogoMark({ className = '', label = 'Saksham Goel logo' }) {
  const reduced = useReducedMotion()
  return (
    <svg className={`logomark ${className}`} viewBox={VIEWBOX} role="img" aria-label={label}>
      {/* the loop: a gold line traces it, then the fill arrives */}
      <motion.path
        d={LOOP}
        fill="none"
        stroke="#e9b872"
        strokeWidth="3"
        initial={reduced ? false : { pathLength: 0, opacity: 1 }}
        animate={{ pathLength: 1, opacity: 0 }}
        transition={{ pathLength: { duration: 1.4, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.5, delay: 1.3 } }}
      />
      <motion.path
        d={LOOP}
        fill="#cccccc"
        stroke="#ffffff"
        strokeWidth="0.2"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
      />
      {/* the colour wheel: dots pop in, then the whole wheel turns */}
      <g className="logomark__wheel">
        <motion.path fill="#fbb03b" d={DOTS[0].d} style={{ transformBox: 'view-box', transformOrigin: '606.3px 500.8px' }}
          initial={reduced ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.75 }} />
        <motion.path fill="#39b54a" d={DOTS[1].d} style={{ transformBox: 'view-box', transformOrigin: '676.6px 571.1px' }}
          initial={reduced ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.87 }} />
        <motion.path fill="#2e3192" d={DOTS[2].d} style={{ transformBox: 'view-box', transformOrigin: '746.9px 500.8px' }}
          initial={reduced ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.99 }} />
        <motion.path fill="#ed1c24" d={DOTS[3].d} style={{ transformBox: 'view-box', transformOrigin: '676.6px 430.4px' }}
          initial={reduced ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 1.11 }} />
        <motion.g initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.2 }}>
          <path fill="#b3b3b3" d={TICKS[0]} />
          <path fill="#b3b3b3" d={TICKS[1]} />
          <path fill="#b3b3b3" d={TICKS[2]} />
          <path fill="#b3b3b3" d={TICKS[3]} />
          <rect fill="#b3b3b3" x="675.5" y="480.5" width="4.9" height="42" rx="2.5" />
          <rect fill="#b3b3b3" x="675.5" y="480.5" width="4.9" height="42" rx="2.5" transform="translate(1179.5 -176.5) rotate(90)" />
        </motion.g>
      </g>
      {/* the brush sweeps in from the left */}
      <motion.g
        style={{ transformBox: 'view-box', transformOrigin: '430px 560px' }}
        initial={reduced ? false : { x: -90, rotate: -24, opacity: 0 }}
        animate={{ x: 0, rotate: 0, opacity: 1 }}
        transition={{ duration: 1.1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
          <path fill="#808080" d={BRUSH[0].d} />
          <path fill="#b3b3b3" d={BRUSH[1].d} />
          <path fill="#c1272d" d={BRUSH[2].d} />
          <path fill="#892028" d={BRUSH[3].d} />
      </motion.g>
    </svg>
  )
}
