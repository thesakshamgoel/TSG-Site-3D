import { useEffect } from 'react'
import { useConsent, setConsent } from './consent'
import './ConsentBar.css'

/**
 * A short bar at the bottom of the screen. It never blocks the page. Both
 * answers are equally easy to give; "Essential only" keeps every third-party
 * embed off.
 */
export default function ConsentBar({ onOpenLegal }) {
  const { decided } = useConsent()
  useEffect(() => {
    document.body.classList.toggle('has-consent-bar', !decided)
    return () => document.body.classList.remove('has-consent-bar')
  }, [decided])
  if (decided) return null
  return (
    <div className="consent" role="dialog" aria-label="Cookies and embedded content">
      <p className="consent__text">
        This site sets no cookies of its own. The Instagram feed and the film previews that play on
        the page come from other companies (Elfsight, YouTube) and may set theirs. They stay off
        unless you allow them.{' '}
        <button type="button" className="consent__link" onClick={() => onOpenLegal('privacy')}>
          Privacy notice
        </button>
      </p>
      <div className="consent__actions">
        <button type="button" className="consent__btn" onClick={() => setConsent(false)}>
          Essential only
        </button>
        <button type="button" className="consent__btn" onClick={() => setConsent(true)}>
          Allow embeds
        </button>
      </div>
    </div>
  )
}
