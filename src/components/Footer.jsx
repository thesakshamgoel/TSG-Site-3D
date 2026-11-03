import { useEffect, useState } from 'react'
import { firebaseEnabled } from '../firebase/config'
import { watchUser, watchOwner } from '../firebase/auth'
import { reopenConsent } from './consent'
import './Footer.css'

const ICONS = {
  Instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  LinkedIn: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3.5" />
      <path d="M8 10.5V16M8 7.8v.1M11.5 16v-3.2c0-1.4.9-2.3 2.1-2.3 1.2 0 1.9.8 1.9 2.2V16M11.5 10.5V16" />
    </>
  ),
  YouTube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.2 9.4v5.2l4.4-2.6z" fill="currentColor" stroke="none" />
    </>
  ),
  Email: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="3" />
      <path d="M4 8l8 5.5L20 8" />
    </>
  ),
}

export default function Footer({ profile, onOpenConsole, onOpenLegal }) {
  // Direct contact details are visitor-login-gated (see About). Mirror that
  // here so the footer's Email link doesn't leak the address when gated.
  const [user, setUser] = useState(null)
  const [owner, setOwner] = useState(null)
  useEffect(() => watchUser(setUser), [])
  useEffect(() => watchOwner(setOwner), [])
  const showEmail = !firebaseEnabled || !!user
  // With auth on, the console entry point exists only for the owner account.
  const showConsole = !firebaseEnabled || !!owner

  const links = [
    profile.instagram && { label: 'Instagram', url: profile.instagram },
    profile.linkedin && { label: 'LinkedIn', url: profile.linkedin },
    profile.youtube && { label: 'YouTube', url: profile.youtube },
    showEmail && profile.email && { label: 'Email', url: `mailto:${profile.email}`, internal: true },
  ].filter(Boolean)

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__top">
          <div className="footer__brand">
            <span className="footer__name">{profile.name}</span>
            <span className="footer__tag">Cinematographer, colorist and graphic designer</span>
          </div>
          <ul className="footer__social">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.url}
                  aria-label={l.label}
                  {...(l.internal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[l.label]}</svg>
                  <span>{l.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__bottom">
          <span>&copy; {new Date().getFullYear()} {profile.name}</span>
          <nav className="footer__legal" aria-label="Legal">
            <button type="button" onClick={() => onOpenLegal('privacy')}>Privacy notice</button>
            <button type="button" onClick={() => onOpenLegal('terms')}>Terms</button>
            <button type="button" onClick={reopenConsent}>Cookie settings</button>
            {showConsole && (
              <button type="button" onClick={onOpenConsole}>Developer console</button>
            )}
          </nav>
        </div>
        <p className="footer__fine">
          The films, photographs and designs on this site belong to {profile.name} and to the
          collaborators and clients credited beside them. Please ask before reusing anything. Other
          brands and logos belong to their owners.
        </p>
      </div>
    </footer>
  )
}
