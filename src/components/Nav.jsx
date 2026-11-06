import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import AuthPortal from './AuthPortal'
import './Nav.css'
import { asset } from '../data/asset'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useRefraction } from './useRefraction'

// small line icons, drawn on a 20px grid at 1.5px so they sit with the text
const ICONS = {
  film: (
    <>
      <rect x="2.5" y="5" width="11" height="10" rx="2" />
      <path d="M13.5 9 L17.5 6.5 V13.5 L13.5 11" />
    </>
  ),
  graphics: (
    <>
      <path d="M4 16 L13.5 6.5 L15.5 8.5 L6 18 H4 Z" />
      <path d="M12 8 L14 10" />
      <circle cx="15.5" cy="4.5" r="1.6" />
    </>
  ),
  about: (
    <>
      <circle cx="10" cy="7" r="3.2" />
      <path d="M3.5 17 C4.5 13.5 7 12 10 12 C13 12 15.5 13.5 16.5 17" />
    </>
  ),
}
const LINKS = [
  { id: 'film', label: 'Film & Video' },
  { id: 'graphics', label: 'Graphics' },
  { id: 'about', label: 'About' },
]

export default function Nav({ name, onOpenConsole, onNavigate, galleryCat }) {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const reduced = useReducedMotion()
  const barRef = useRef(null)
  const glass = useRefraction(barRef, { radius: 30, bezel: 27, depth: 26 })
  // the glass lens rests on where you are, and slides to whatever you point at
  const [inAbout, setInAbout] = useState(false)
  const [hover, setHover] = useState(null)
  const here = galleryCat || (inAbout ? 'about' : null)
  const lens = hover || here

  useEffect(() => {
    const el = document.getElementById('about')
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInAbout(e.isIntersecting), { rootMargin: '-45% 0px -45% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    let raf = null
    let lastY = window.scrollY
    let travel = 0 // how far the page has moved in the current direction
    const onScroll = () => {
      if (raf != null) return
      raf = requestAnimationFrame(() => {
        raf = null
        const y = window.scrollY
        setScrolled(y > 40)
        // Down hides the bar, up brings it back. It takes a deliberate move
        // (not a twitch) to flip it, and it always shows near the top.
        const dy = y - lastY
        lastY = y
        travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy
        if (y < 90) setHidden(false)
        else if (travel > 36) setHidden(true)
        else if (travel < -14) setHidden(false)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (e, id) => {
    if (onNavigate) {
      e.preventDefault()
      onNavigate(id)
    }
  }

  return (
    <header
      className={`nav ${scrolled ? 'nav--scrolled' : ''} ${hidden ? 'nav--hidden' : ''}`}
      onFocusCapture={() => setHidden(false)}
    >
      {glass.filter}
      <div ref={barRef} className={`nav__inner lg container ${glass.className}`} style={glass.style}>
        <a href="#top" className="nav__brand" onClick={(e) => go(e, 'top')}>
          <img className="nav__logo" src={asset('/logo.svg')} alt={name} />
          <span className="nav__name">TSG Studios</span>
        </a>

        <nav className="nav__links" onPointerLeave={() => setHover(null)}>
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className={l.id === here ? 'is-here' : ''}
              aria-current={l.id === here ? 'page' : undefined}
              onClick={(e) => go(e, l.id)}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(l.id)}
              onFocus={() => setHover(l.id)}
              onBlur={() => setHover(null)}
            >
              {lens === l.id && (
                <motion.span
                  layoutId="nav-lens"
                  className="nav__lens lg-chip"
                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38, mass: 0.7 }}
                />
              )}
              <svg className="nav__icon" viewBox="0 0 20 20" aria-hidden="true">{ICONS[l.id]}</svg>
              <span className="nav__label">{l.label}</span>
            </a>
          ))}
        </nav>

        <div className="nav__right">
          <button
            className="nav__cta"
            onClick={() => onNavigate && onNavigate('contact')}
          >
            Get in touch
          </button>
          <AuthPortal onOpenConsole={onOpenConsole} />
        </div>
      </div>
    </header>
  )
}
