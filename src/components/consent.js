import { useSyncExternalStore } from 'react'

/**
 * Cookie and embed consent. One choice, stored on this device:
 *   media: true   the visitor allows content from other companies
 *                 (the Instagram feed, and film previews that play on the page)
 *   media: false  essential only; those stay off and show a plain link instead
 * Until a choice exists, nothing from a third party is loaded.
 * `decided` lets the bar know whether to show itself.
 */
const KEY = 'tsg_consent_v1'
const listeners = new Set()
let state = read()

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (v && typeof v.media === 'boolean') return { decided: true, media: v.media, at: v.at }
  } catch {}
  return { decided: false, media: false, at: null }
}

function emit() { listeners.forEach((l) => l()) }

export function setConsent(media) {
  state = { decided: true, media, at: new Date().toISOString() }
  try { localStorage.setItem(KEY, JSON.stringify({ media, at: state.at })) } catch {}
  emit()
}

export function reopenConsent() {
  state = { ...state, decided: false }
  emit()
}

export function useConsent() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => state,
    () => state
  )
}
