import { useEffect, useState } from 'react'
import AuthPortal from './AuthPortal'
import './Nav.css'
import { asset } from '../data/asset'

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

export default function Nav({ name, onOpenConsole, onNavigate }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let raf = null
    const onScroll = () => {
      if (raf != null) return
      raf = requestAnimationFrame(() => { raf = null; setScrolled(window.scrollY > 40) })
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
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
      <div className="nav__inner container">
        <a href="#top" className="nav__brand" onClick={(e) => go(e, 'top')}>
          <img className="nav__logo" src={asset('/logo.svg')} alt={name} />
          <span className="nav__name">TSG Studios</span>
        </a>

        <nav className="nav__links">
          {LINKS.map((l) => (
            <a key={l.id} href={`#${l.id}`} onClick={(e) => go(e, l.id)}>
              <svg className="nav__icon" viewBox="0 0 20 20" aria-hidden="true">{ICONS[l.id]}</svg>
              {l.label}
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
