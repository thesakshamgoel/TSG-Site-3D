import { useEffect, useRef, useCallback } from 'react'
import Lenis from 'lenis'

/**
 * Inertial smooth scrolling (Lenis) that replaces the old wheel-snap hook.
 * Free scrolling is what lets pinned, scroll-scrubbed sections work. Keeps the
 * same return shape as before so navigation code does not change.
 */
export function useLenis(ready, paused) {
  const lenisRef = useRef(null)
  const indexRef = useRef(0)

  const reduced =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (reduced) return
    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.2,
    })
    lenisRef.current = lenis
    let raf
    const loop = (t) => {
      lenis.raf(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    // in-page links (#about etc.): a native hash jump fights the smoothed
    // scroll position, so glide there through Lenis instead
    const onClick = (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]')
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return
      const id = a.getAttribute('href').slice(1)
      const el = id && document.getElementById(id)
      if (!el) return
      e.preventDefault()
      // re-measure first: images that loaded since mount make the page taller,
      // and a stale height clamps the jump short
      lenis.resize()
      lenis.scrollTo(el, { duration: 1.2, offset: -64, force: true })
    }
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('click', onClick)
      cancelAnimationFrame(raf)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [reduced])

  useEffect(() => {
    const l = lenisRef.current
    if (!l) return
    if (!ready || paused) l.stop()
    else l.start()
  }, [ready, paused])

  const scrollToId = useCallback((id) => {
    const el = id === 'top' ? document.documentElement : document.getElementById(id)
    if (!el) return
    const l = lenisRef.current
    if (l) {
      l.resize()
      l.scrollTo(id === 'top' ? 0 : el, { duration: 1.2, offset: id === 'top' ? 0 : -64, force: true })
    }
    else el.scrollIntoView({ behavior: 'auto', block: 'start' })
  }, [])

  return { scrollToId, disabled: reduced, indexRef }
}
