import { useEffect, useRef, useState } from 'react'
import './FilmHUD.css'

/**
 * Viewfinder over the hero only: corner brackets, REC with a live timecode and
 * the frame-rate read-out. It frames the opening shot, then the brackets slide
 * out to the corners and fade as the hero leaves, and come back if you return.
 * Purely decorative (pointer-events off); the timecode stops while it is away.
 */
export default function FilmHUD() {
  const tcRef = useRef(null)
  // starts away so it animates in on mount
  const [on, setOn] = useState(false)

  useEffect(() => {
    const hero = document.getElementById('hero')
    if (!hero) return
    const io = new IntersectionObserver(([e]) => setOn(e.intersectionRatio > 0.45), { threshold: [0, 0.45, 1] })
    io.observe(hero)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!on) return
    let raf
    const start = performance.now()
    let last = -1
    const tick = (now) => {
      const totalFrames = Math.floor(((now - start) / 1000) * 24)
      // the read-out only changes 24 times a second: skip the other frames
      if (totalFrames === last) { raf = requestAnimationFrame(tick); return }
      last = totalFrames
      const ff = totalFrames % 24
      const totalSec = Math.floor(totalFrames / 24)
      const ss = totalSec % 60
      const mm = Math.floor(totalSec / 60) % 60
      const hh = Math.floor(totalSec / 3600)
      const p = (n) => String(n).padStart(2, '0')
      if (tcRef.current)
        tcRef.current.textContent = `${p(hh)}:${p(mm)}:${p(ss)}:${p(ff)}`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [on])

  return (
    <div className={`hud ${on ? 'is-on' : ''}`} aria-hidden="true">
      <span className="hud__bracket hud__bracket--tl" />
      <span className="hud__bracket hud__bracket--tr" />
      <span className="hud__bracket hud__bracket--bl" />
      <span className="hud__bracket hud__bracket--br" />

      <div className="hud__bar hud__bar--left">
        <span className="rec">REC</span>
        <span className="timecode" ref={tcRef}>
          00:00:00:00
        </span>
      </div>
      <div className="hud__bar hud__bar--right">
        <span className="timecode">24 FPS · 2.39:1</span>
      </div>
    </div>
  )
}
