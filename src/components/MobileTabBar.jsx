import { useEffect, useRef, useState } from 'react'
import './MobileTabBar.css'

/**
 * Phone navigation: a floating dock with the five places worth jumping to.
 * A gold pill slides to the section you are in, a hairline along the top
 * fills with page progress, and the dock tucks away while you scroll down
 * (more screen for the work) and returns the moment you scroll up.
 * Everything moves with transform only, so it never costs a scroll frame.
 */
const TABS = [
  { id: 'top', label: 'Home', icon: HomeIcon },
  { id: 'reelwall', label: 'Reel', icon: ReelIcon },
  { id: 'grade', label: 'Grade', icon: WheelIcon },
  { id: 'work', label: 'Work', icon: GridIcon },
  { id: 'about', label: 'About', icon: UserIcon },
]

function layoutTop(el) {
  let y = 0
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop
  return y
}

export default function MobileTabBar({ galleryCat, onNavigate }) {
  const [active, setActive] = useState(0)
  const [hidden, setHidden] = useState(false)
  const progRef = useRef(null)

  useEffect(() => {
    if (galleryCat === 'film' || galleryCat === 'graphics') {
      setActive(3) // a reel is open: you are inside Work
      setHidden(false)
      return
    }
    let raf = null
    let lastY = window.scrollY
    const update = () => {
      raf = null
      const y = window.scrollY
      const vh = window.innerHeight
      const max = Math.max(1, document.documentElement.scrollHeight - vh)
      // section you are in = the last one whose top has passed mid-screen.
      // Layout offsets, not getBoundingClientRect: the page's entrance
      // animation tilts <main> in 3D, which distorts on-screen rects.
      let a = 0
      TABS.forEach((t, i) => {
        if (i === 0) return
        const el = document.getElementById(t.id)
        if (el && layoutTop(el) < y + vh * 0.5) a = i
      })
      setActive(a)
      // tuck away on the way down, back on the way up, always shown at the ends
      const dy = y - lastY
      if (Math.abs(dy) > 6) {
        setHidden(dy > 0 && y > vh * 0.6 && y < max - 40)
        lastY = y
      }
      if (progRef.current) progRef.current.style.transform = `scaleX(${(y / max).toFixed(4)})`
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    // the page is still settling when the dock mounts (pinned sections take
    // their heights a moment later), so re-check whenever the layout resizes
    const ro = window.ResizeObserver ? new ResizeObserver(onScroll) : null
    ro?.observe(document.body)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      ro?.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [galleryCat])

  const go = (i) => {
    setActive(i)
    setHidden(false)
    try { navigator.vibrate?.(8) } catch { /* not supported */ }
    onNavigate(TABS[i].id)
  }

  return (
    <nav className={`mtab ${hidden ? 'is-hidden' : ''}`} aria-label="Primary" style={{ '--n': TABS.length, '--i': active }}>
      <span className="mtab__prog" aria-hidden="true"><span ref={progRef} /></span>
      <span className="mtab__pill" aria-hidden="true" />
      {TABS.map((t, i) => {
        const Icon = t.icon
        return (
          <button
            key={t.id}
            type="button"
            className={`mtab__btn ${active === i ? 'is-active' : ''}`}
            onClick={() => go(i)}
            aria-current={active === i ? 'page' : undefined}
          >
            <span className="mtab__icon"><Icon /></span>
            <span className="mtab__label">{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

/* ── icons (stroke, inherit currentColor) ─────────────────────────────────── */
const svg = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
function HomeIcon() {
  return (
    <svg {...svg}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  )
}
function ReelIcon() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="7" r="1.6" />
      <circle cx="12" cy="17" r="1.6" />
      <circle cx="7" cy="12" r="1.6" />
      <circle cx="17" cy="12" r="1.6" />
    </svg>
  )
}
function WheelIcon() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" opacity="0.45" />
      <circle cx="15.5" cy="8.5" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}
function GridIcon() {
  return (
    <svg {...svg}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  )
}
function UserIcon() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  )
}
