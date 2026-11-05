import { useEffect } from 'react'
import { useConsent, setConsent } from './consent'
import './ConsentBar.css'

/**
 * A small card in the corner. It never blocks the page or covers the middle
 * of the screen. Both answers are equally easy to give; "Essential only" keeps
 * every third-party embed off.
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
        No cookies of our own. Instagram and YouTube embeds stay off until you allow them.{' '}
        <button type="button" className="consent__link" onClick={() => onOpenLegal('privacy')}>
          Privacy
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
