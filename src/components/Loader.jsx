import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StarTunnel from './StarTunnel'
import './Loader.css'

/**
 * Intro: a film-reel tunnel. Frames from the filmography ride a ring through
 * the star tunnel toward the camera, accelerating as the counter fills, with
 * the mark growing at the centre. At 100% the film-strip gate parts and the
 * site is revealed behind (App runs a matching "unfold" as this clears).
 *
 * Smoothness: one rAF loop writes every transform and the counter directly
 * (no React re-render per frame), and App holds the 3D background back until
 * the loader is gone so nothing competes with it.
 */
const DURATION = 1600
const RING = 14 // frames on the ring
const GAP = 520 // depth between frames, px

export default function Loader({ onDone, name = 'Saksham Goel', thumbs: thumbsProp = [] }) {
  const [exiting, setExiting] = useState(false)
  // take the frames once: live content arriving mid-load must not rebuild the
  // ring (that restarted the whole animation, a visible jerk back to 000)
  const [thumbs] = useState(thumbsProp)
  const progressRef = useRef(0)
  const readyRef = useRef(false)
  const countRef = useRef(null)
  const markRef = useRef(null)
  const frameRefs = useRef([])

  // a fixed ring layout: frames spiral around the tunnel axis
  const ring = useMemo(() => {
    const pics = thumbs.filter(Boolean)
    if (!pics.length) return []
    return Array.from({ length: RING }, (_, i) => ({
      src: pics[i % pics.length],
      a: (i / RING) * Math.PI * 2 * 2.3, // just over two turns along the tunnel
      z0: -i * GAP,
    }))
  }, [thumbs])

  useEffect(() => {
    let raf
    let last = null
    let elapsed = 0
    let first = null
    let smoothRun = 0
    const travel = RING * GAP + 1400
    const step = (ts) => {
      // the clock advances at most one frame's worth per frame: when the
      // browser stalls (the site booting behind), the reel pauses for a
      // moment instead of jumping ahead to catch up
      const raw = last == null ? 0 : ts - last
      last = ts
      if (first == null) first = ts
      // wait for the site's boot to finish (a few smooth frames in a row, at
      // most 1.2s) so the reel starts once and then runs uninterrupted
      if (!readyRef.current) {
        smoothRun = raw > 0 && raw < 24 ? smoothRun + 1 : 0
        if (smoothRun >= 6 || ts - first > 1200) readyRef.current = true
        raf = requestAnimationFrame(step)
        return
      }
      const dt = Math.min(raw, 1000 / 50)
      elapsed += dt
      const t = Math.min(elapsed / DURATION, 1)
      // ease-in-out: a gentle start, a warp in the middle, a settle at 100%
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      progressRef.current = e
      if (countRef.current) countRef.current.textContent = String(Math.round(e * 100)).padStart(3, '0')
      if (markRef.current) {
        markRef.current.style.transform = `translate(-50%, -50%) scale(${(0.72 + e * 0.5).toFixed(4)})`
        markRef.current.style.opacity = Math.min(1, 0.25 + e * 1.5).toFixed(3)
      }
      const W = window.innerWidth, H = window.innerHeight
      const R = Math.min(W, H) * 0.42
      ring.forEach((f, i) => {
        const el = frameRefs.current[i]
        if (!el) return
        const z = f.z0 + e * travel - 400
        const x = Math.cos(f.a + e * 1.2) * R
        const y = Math.sin(f.a + e * 1.2) * R * 0.62
        // fog in from the deep end, burn out as the frame passes the lens
        const inn = Math.min(1, Math.max(0, (z + 6200) / 2000))
        const out = 1 - Math.min(1, Math.max(0, (z - 300) / 300))
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${Math.min(z, 640).toFixed(1)}px)`
        el.style.opacity = (inn * out).toFixed(3)
        el.style.visibility = z > 620 ? 'hidden' : 'visible'
      })
      if (t < 1) raf = requestAnimationFrame(step)
      else setExiting(true)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [ring])

  const ease = [0.76, 0, 0.24, 1]

  return (
    <AnimatePresence onExitComplete={onDone}>
      {!exiting && (
        <motion.div className="loader" exit={{ opacity: 0, transition: { duration: 0.7, ease } }}>
          <div className="loader__canvas">
            <StarTunnel className="loader__stars" speed={() => (readyRef.current ? 0.003 + Math.pow(progressRef.current, 2) * 0.05 : 0.0006)} />
            <div className="loader__ring" aria-hidden="true">
              {ring.map((f, i) => (
                <div key={i} className="loader__frame" ref={(el) => (frameRefs.current[i] = el)}>
                  <img src={f.src} alt="" decoding="async" />
                </div>
              ))}
            </div>
            <div className="loader__mark" ref={markRef} style={{ transform: 'translate(-50%, -50%) scale(0.72)', opacity: 0.25 }}>
              <img src="/logo.svg" alt="" />
            </div>
          </div>

          {/* film-strip gate */}
          <motion.div className="loader__strip loader__strip--top" exit={{ y: '-100%', transition: { duration: 0.7, ease } }} />
          <motion.div className="loader__strip loader__strip--bottom" exit={{ y: '100%', transition: { duration: 0.7, ease } }} />

          {/* HUD */}
          <motion.div className="loader__hud" exit={{ opacity: 0, transition: { duration: 0.4 } }}>
            <div className="loader__count">
              <span ref={countRef}>000</span>
              <span className="loader__pct">%</span>
            </div>
            <div className="loader__meta">
              <span className="loader__name">{name}</span>
              <span className="loader__role timecode">THREADING REEL · CINEMATOGRAPHER · COLORIST · DESIGNER</span>
            </div>
          </motion.div>

          <div className="loader__vignette" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
