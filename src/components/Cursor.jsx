import { useEffect, useRef, useState } from 'react'
import './Cursor.css'

/**
 * Custom cursor: a small pointer arrow with a tiny camera riding at its
 * corner, plus a soft glow that trails the pointer so the site reacts to
 * where the mouse is. The arrow tip is the exact click point and follows
 * the mouse with no lag. Disabled on touch / coarse pointers and when the
 * user prefers reduced motion (falls back to the native cursor).
 */
export default function Cursor() {
  const dotRef = useRef(null)
  const glowRef = useRef(null)
  const [enabled, setEnabled] = useState(false)
  const [hot, setHot] = useState(false) // over an interactive element

  useEffect(() => {
    const fine =
      window.matchMedia &&
      window.matchMedia('(pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine) return
    setEnabled(true)
    document.body.classList.add('has-custom-cursor')

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const pos = { ...target }
    const glow = { ...target }

    const onMove = (e) => {
      target.x = e.clientX
      target.y = e.clientY
      // expose pointer position to the whole page for ambient glow + parallax
      document.documentElement.style.setProperty('--px', `${e.clientX}px`)
      document.documentElement.style.setProperty('--py', `${e.clientY}px`)
      document.documentElement.style.setProperty(
        '--pnx',
        `${(e.clientX / window.innerWidth - 0.5) * 2}`
      )
      document.documentElement.style.setProperty(
        '--pny',
        `${(e.clientY / window.innerHeight - 0.5) * 2}`
      )

      const interactive = e.target.closest(
        'a, button, [role="button"], [role="slider"], [role="tab"], [tabindex]:not([tabindex="-1"]), label, summary, input, select, textarea, .card, .workcard, .film, .rw__frame, .fr__frame, .hl__frame'
      )
      setHot(!!interactive)
    }

    let raf
    const loop = () => {
      // the arrow sits exactly on the pointer; only the glow trails behind
      pos.x = target.x
      pos.y = target.y
      glow.x += (target.x - glow.x) * 0.12
      glow.y += (target.y - glow.y) * 0.12
      if (dotRef.current)
        // the arrow tip is drawn at (2, 2) inside the svg: that is the hotspot
        dotRef.current.style.transform = `translate(${pos.x - 2}px, ${pos.y - 2}px)`
      if (glowRef.current)
        glowRef.current.style.transform = `translate(${glow.x}px, ${glow.y}px) translate(-50%, -50%)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onDown = () => dotRef.current?.classList.add('is-down')
    const onUp = () => dotRef.current?.classList.remove('is-down')
    const onLeave = () => dotRef.current?.classList.add('is-hidden')
    const onEnter = () => dotRef.current?.classList.remove('is-hidden')

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)

    return () => {
      cancelAnimationFrame(raf)
      document.body.classList.remove('has-custom-cursor')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
    }
  }, [])

  if (!enabled) return null

  return (
    <>
      <div ref={glowRef} className="cursor-glow" aria-hidden="true" />
      <div
        ref={dotRef}
        className={`cursor-cam ${hot ? 'is-hot' : ''}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 30 30" width="30" height="30">
          {/* pointer arrow: the tip at (2, 2) is the click point */}
          <path
            className="cursor-arrow"
            d="M2 2 L2 20.5 L6.9 15.9 L10.4 23.4 L13.7 21.9 L10.3 14.5 L16.8 14.5 Z"
            strokeLinejoin="round"
          />
          {/* the camera riding at the arrow's corner */}
          <g className="cursor-cam__body">
            <rect x="14.5" y="19" width="10" height="7.4" rx="1.8" />
            <path d="M24.5 21.4 L29 19.2 L29 26.2 L24.5 24 Z" strokeLinejoin="round" />
            <circle className="cursor-lens" cx="18.6" cy="22.7" r="2.1" />
            <rect x="15.6" y="17.4" width="3.6" height="1.9" rx="0.6" />
          </g>
          <circle className="cursor-rec" cx="23" cy="20.6" r="1" />
        </svg>
      </div>
    </>
  )
}
