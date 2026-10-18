import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StarTunnel from './StarTunnel'
import './Loader.css'

/**
 * Intro: the same star tunnel as the reel wall, accelerating into a warp as
 * the counter fills, with the mark growing toward you at its centre. At 100%
 * the film-strip gate parts and the site is revealed behind (App runs a
 * matching "unfold" as this clears). A 2D canvas, so it paints immediately
 * instead of waiting for the 3D library to download.
 */
export default function Loader({ onDone, name = 'Saksham Goel' }) {
  const [count, setCount] = useState(0)
  const [exiting, setExiting] = useState(false)
  const progressRef = useRef(0)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    const DURATION = 1400
    const step = (ts) => {
      if (startRef.current == null) startRef.current = ts
      const t = Math.min((ts - startRef.current) / DURATION, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      progressRef.current = eased
      setCount(Math.round(eased * 100))
      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else setExiting(true)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => rafRef.current && cancelAnimationFrame(rafRef.current)
  }, [])

  const ease = [0.76, 0, 0.24, 1]

  return (
    <AnimatePresence onExitComplete={onDone}>
      {!exiting && (
        <motion.div
          className="loader"
          exit={{ opacity: 0, transition: { duration: 0.7, ease } }}
        >
          <div className="loader__canvas">
            <StarTunnel
              className="loader__stars"
              speed={() => 0.004 + Math.pow(progressRef.current, 2.2) * 0.06}
            />
            <div
              className="loader__mark"
              style={{ transform: `translate(-50%, -50%) scale(${(0.7 + progressRef.current * 0.55).toFixed(3)})`, opacity: Math.min(1, 0.3 + progressRef.current * 1.4) }}
            >
              <img src="/logo.svg" alt="" />
            </div>
          </div>

          {/* film-strip gate */}
          <motion.div
            className="loader__strip loader__strip--top"
            exit={{ y: '-100%', transition: { duration: 0.7, ease } }}
          />
          <motion.div
            className="loader__strip loader__strip--bottom"
            exit={{ y: '100%', transition: { duration: 0.7, ease } }}
          />

          {/* HUD */}
          <motion.div
            className="loader__hud"
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
          >
            <div className="loader__count">
              <span>{String(count).padStart(3, '0')}</span>
              <span className="loader__pct">%</span>
            </div>
            <div className="loader__meta">
              <span className="loader__name">{name}</span>
              <span className="loader__role timecode">
                THREADING REEL · CINEMATOGRAPHER · COLORIST · DESIGNER
              </span>
            </div>
          </motion.div>

          <div className="loader__vignette" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
