import { useEffect, useRef } from 'react'
import { reopenConsent } from './consent'
import './LegalDialog.css'

const UPDATED = '3 November 2026'
const EMAIL = 'thesakshamgoel@gmail.com'

function Privacy() {
  return (
    <>
      <p className="legal__meta">Last updated {UPDATED}</p>
      <h3>Who this is about</h3>
      <p>
        This site belongs to Saksham Goel (&ldquo;I&rdquo;). I decide what is collected and why. You can
        reach me at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
      </p>
      <h3>When you only browse</h3>
      <p>
        I do not run analytics or advertising on this site and it sets no cookies of its own. It
        stores one note on your device: your choice about embedded content. The site is hosted on
        GitHub Pages, which keeps ordinary server logs (such as your IP address) under{' '}
        <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noreferrer">GitHub&rsquo;s privacy statement</a>.
        Fonts and most images are served from this site. Two things are not, and they load as soon
        as you open the page: the small film thumbnails come from YouTube&rsquo;s image servers, and
        the shared content (published reviews and featured picks) is read from Google Firebase.
        Both receive your IP address and browser details, as any website you open does.
      </p>
      <h3>Enquiry and review forms</h3>
      <p>
        If you send an enquiry or a review I receive what you type: your name, email address, the
        project details and your message. They are delivered to my inbox through Web3Forms, or your
        own email app opens with the message ready to send. I use them only to reply to you or, for
        reviews you ask me to publish, to show them on this site. I keep an enquiry for as long as
        it takes to deal with it, and delete it when you ask.
      </p>
      <h3>Signing in with Google</h3>
      <p>
        Sending a form or seeing my contact details needs a Google sign-in. Firebase Authentication
        (a Google service) records your account so you stay signed in. I use your name and email to
        fill in the form for you. I do not use it for anything else. You can sign out at any time.
      </p>
      <h3>Embedded content, only if you allow it</h3>
      <p>
        The Instagram feed (provided by Elfsight) and the film previews that play on the page
        (YouTube, Vimeo) come from other companies. If you choose &ldquo;Allow embeds&rdquo; they load, may set their own cookies, and
        can see your IP address and that you visited. If you choose &ldquo;Essential only&rdquo;
        none of them load and you get plain links instead. You can change your choice at any time
        with &ldquo;Cookie settings&rdquo; at the bottom of the page.
      </p>
      <h3>Your rights</h3>
      <p>
        You can ask me to show you what I hold about you, correct it, or delete it, and you can
        withdraw your consent at any time. Under India&rsquo;s Digital Personal Data Protection Act,
        2023 you can also nominate someone to act for you and complain to me or to the Data
        Protection Board. Email me and I will answer as soon as I can.
      </p>
      <h3>Children</h3>
      <p>This site is not meant for people under 18 and I do not knowingly collect their data.</p>
      <h3>Changes</h3>
      <p>If this notice changes, the date above changes with it.</p>
    </>
  )
}

function Terms() {
  return (
    <>
      <p className="legal__meta">Last updated {UPDATED}</p>
      <h3>The work on this site</h3>
      <p>
        The films, photographs, designs, text and code on this site were made by Saksham Goel, or by
        him with the collaborators and clients credited beside them. Please do not copy, edit or reuse
        them without written permission. Links and embeds point to material owned by other people.
      </p>
      <h3>Other people&rsquo;s names and logos</h3>
      <p>
        Names, logos and brands that appear belong to their owners. Showing them here does not mean
        they endorse this site or me.
      </p>
      <h3>Enquiries</h3>
      <p>
        Sending an enquiry or a review does not create a contract or a booking. Any work is agreed
        separately and in writing.
      </p>
      <h3>Reviews</h3>
      <p>
        If you send a review you confirm it is yours and true, and you allow me to publish it with the
        name and role you give.
      </p>
      <h3>Availability</h3>
      <p>
        I try to keep the site working and accurate, but I give no promise that it is always available
        or free of mistakes, and I am not responsible for sites I link to.
      </p>
      <h3>Law</h3>
      <p>These terms are governed by the laws of India.</p>
    </>
  )
}

export default function LegalDialog({ page, onClose, onSwitch }) {
  const ref = useRef(null)
  useEffect(() => {
    const prev = document.activeElement
    ref.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll('a[href], button:not([disabled])')
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [onClose])

  return (
    <div className="legal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="legal__panel" role="dialog" aria-modal="true" aria-labelledby="legal-title" ref={ref} tabIndex={-1} data-lenis-prevent>
        <header className="legal__head">
          <div className="legal__tabs" role="tablist">
            <button role="tab" aria-selected={page === 'privacy'} className={page === 'privacy' ? 'is-on' : ''} onClick={() => onSwitch('privacy')}>Privacy notice</button>
            <button role="tab" aria-selected={page === 'terms'} className={page === 'terms' ? 'is-on' : ''} onClick={() => onSwitch('terms')}>Terms</button>
          </div>
          <button type="button" className="legal__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="legal__body">
          <h2 id="legal-title">{page === 'terms' ? 'Terms of use' : 'Privacy notice'}</h2>
          {page === 'terms' ? <Terms /> : <Privacy />}
          {page === 'privacy' && (
            <button type="button" className="legal__cookie" onClick={() => { onClose(); reopenConsent() }}>
              Change cookie settings
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
