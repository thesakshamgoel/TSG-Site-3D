import { useEffect, useRef } from 'react'
import './FilmHUD.css'

/**
 * Subtle cinema HUD over the whole viewport: viewfinder corner brackets, a live
 * running timecode and frame-rate read-out. Purely decorative (pointer-events
 * off) — the film touch that frames every screen.
 */
export default function FilmHUD() {
  const tcRef = useRef(null)

  useEffect(() => {
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
  }, [])

  return (
    <div className="hud" aria-hidden="true">
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
