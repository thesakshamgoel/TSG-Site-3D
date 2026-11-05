import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { firebaseEnabled } from '../firebase/config'
import { signInOwner } from '../firebase/auth'
import './ConsolePin.css'

/**
 * Owner-only gate for the developer console: Google sign-in through Firebase,
 * accepted only for the owner's account. Writes are also locked to that
 * account by the Firestore rules, so the gate is enforced on the server too.
 * There is no passcode fallback: without Firebase the console stays closed.
 */
export default function ConsolePin({ onClose }) {
  const [busy, setBusy] = useState(false)
  const [authErr, setAuthErr] = useState('')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const googleSignIn = async () => {
    setBusy(true)
    setAuthErr('')
    try {
      await signInOwner() // owner-auth state in App flips the gate to the console
    } catch (e) {
      setAuthErr(
        e?.message === 'not-owner'
          ? 'That Google account isn’t the owner.'
          : 'Sign-in failed — try again.'
      )
    } finally {
      setBusy(false)
    }
  }

  if (!firebaseEnabled) {
    return (
      <div className="pin" onClick={onClose}>
        <div className="pin__panel" onClick={(e) => e.stopPropagation()}>
          <span className="slate">Restricted</span>
          <h3>Developer Console</h3>
          <p>The console needs Firebase sign-in, which isn’t set up on this copy of the site.</p>
          <div className="pin__actions">
            <button type="button" className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pin" onClick={onClose}>
      <motion.div
        className="pin__panel"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <span className="slate">Restricted</span>
        <h3>Developer Console</h3>
        <p>Owner access only. Sign in with your Google account.</p>
        <button
          type="button"
          className="btn primary pin__google"
          onClick={googleSignIn}
          disabled={busy}
        >
          {busy ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {authErr && (
          <span className="pin__err" role="alert">
            {authErr}
          </span>
        )}
        <div className="pin__actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  )
}
