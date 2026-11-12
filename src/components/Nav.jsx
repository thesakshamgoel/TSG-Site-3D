import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import AuthPortal from './AuthPortal'
import './Nav.css'
import { asset } from '../data/asset'
import { useReducedMotion } from '../hooks/useReducedMotion'

const LINKS = [
  { id: 'film', label: 'Film & Video' },
  { id: 'graphics', label: 'Graphics' },
  { id: 'about', label: 'About' },
]

export default function Nav({ name, onOpenConsole, onNavigate, galleryCat }) {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const reduced = useReducedMotion()
  // a thin gold line rests under the section you are in, and slides to
  // whatever you point at
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
      <div className="nav__inner">
        <a href="#top" className="nav__brand" onClick={(e) => go(e, 'top')}>
          <img className="nav__logo" src={asset('/logo.svg')} alt={name} />
          <span className="nav__name">TSG Studios</span>
        </a>

        <nav className="nav__links" onPointerLeave={() => setHover(null)}>
          {LINKS.map((l, i) => (
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
              <span className="nav__no" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <span className="nav__label">{l.label}</span>
              {lens === l.id && (
                <motion.span
                  layoutId="nav-line"
                  className="nav__line"
                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38, mass: 0.7 }}
                />
              )}
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
