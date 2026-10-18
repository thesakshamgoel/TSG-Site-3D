import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LoaderReel from './LoaderReel'
import './Loader.css'

/**
 * Intro: a real 3D film reel the camera flies into as the counter fills. At
 * 100% the film-strip gate parts and we push through the hub — the site is
 * revealed behind (App runs a matching "unfold" as this clears).
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
            <LoaderReel progressRef={progressRef} />
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
