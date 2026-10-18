import { useEffect, useState } from 'react'
import AuthPortal from './AuthPortal'
import './Nav.css'

const LINKS = [
  { id: 'film', num: '01', label: 'Film / Video' },
  { id: 'graphics', num: '02', label: 'Graphics' },
  { id: 'about', num: '03', label: 'About' },
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
          <img className="nav__logo" src="/logo.svg" alt={name} />
          <span className="nav__name">TSG Studios</span>
        </a>

        <nav className="nav__links">
          {LINKS.map((l) => (
            <a key={l.id} href={`#${l.id}`} onClick={(e) => go(e, l.id)}>
              <span className="nav__num">{l.num}</span>
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
