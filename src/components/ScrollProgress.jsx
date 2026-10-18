import { useEffect, useRef, useState } from 'react'
import './ScrollProgress.css'

/**
 * Right-edge section rail. A hairline track that fills with progress, a dot
 * per section (the active one stretches into a gold capsule), and the active
 * section's name in a small chip that shows only while you scroll, then tucks
 * away so it never sits on top of the work. Hover any dot for its name.
 * Progress is written straight to a transform; React only re-renders when the
 * active section changes.
 */
function layoutTop(el) {
  let y = 0
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop
  return y
}

export default function ScrollProgress({ sections, onNavigate }) {
  const [active, setActive] = useState(0)
  const [moving, setMoving] = useState(false)
  const fillRef = useRef(null)

  useEffect(() => {
    let raf = null
    let idle = null
    const update = () => {
      raf = null
      const n = sections.length
      const ref = window.scrollY + window.innerHeight * 0.4
      const tops = sections.map((s) => {
        const el = document.getElementById(s.id)
        return el ? layoutTop(el) : 0
      })
      let seg = 0
      for (let i = 0; i < n; i++) if (ref >= tops[i]) seg = i
      let pos = seg
      if (seg < n - 1) {
        const span = tops[seg + 1] - tops[seg]
        pos = seg + (span > 0 ? Math.max(0, Math.min(1, (ref - tops[seg]) / span)) : 0)
      }
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${(n > 1 ? pos / (n - 1) : 0).toFixed(4)})`
      setActive((a) => (a === seg ? a : seg))
    }
    const onScroll = () => {
      if (raf == null) raf = requestAnimationFrame(update)
      setMoving(true)
      clearTimeout(idle)
      idle = setTimeout(() => setMoving(false), 1200)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    const ro = window.ResizeObserver ? new ResizeObserver(() => { if (raf == null) raf = requestAnimationFrame(update) }) : null
    ro?.observe(document.body)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      ro?.disconnect()
      clearTimeout(idle)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [sections])

  const n = sections.length
  return (
    <nav className={`sprog ${moving ? 'is-moving' : ''}`} aria-label="Page sections">
      <span className="sprog__count timecode" aria-hidden="true">
        {String(active + 1).padStart(2, '0')}
      </span>
      <div className="sprog__track">
        <span className="sprog__rail" aria-hidden="true">
          <span className="sprog__fill" ref={fillRef} />
        </span>
        {sections.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`sprog__node ${i === active ? 'is-on' : ''} ${i < active ? 'is-past' : ''}`}
            style={{ top: `${(i / Math.max(n - 1, 1)) * 100}%` }}
            onClick={() => onNavigate(s.id)}
            aria-label={s.label}
            aria-current={i === active ? 'true' : undefined}
          >
            <span className="sprog__label">{s.label}</span>
          </button>
        ))}
      </div>
      <span className="sprog__count sprog__count--total timecode" aria-hidden="true">
        {String(n).padStart(2, '0')}
      </span>
    </nav>
  )
}
