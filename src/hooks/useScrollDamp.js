import { useEffect } from 'react'

/**
 * Slows the wheel / trackpad scroll inside a pinned section, so its frames
 * get more time on screen without locking anything. `factor` 0.7 means 30%
 * slower. Works through the smooth-scroll engine's wheel multiplier; native
 * touch scrolling on phones is left alone.
 */
function layoutTop(el) {
  let y = 0
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop
  return y
}

export function useScrollDamp(ref, factor = 0.7) {
  useEffect(() => {
    let inside = false
    let raf = null
    const check = () => {
      raf = null
      const el = ref.current
      const lenis = window.__lenis
      if (!el || !lenis) return
      const top = layoutTop(el)
      const travel = el.offsetHeight - window.innerHeight
      const y = window.scrollY
      const now = y >= top - 1 && y <= top + travel + 1
      if (now === inside) return
      inside = now
      const base = window.__lenisWheel || 0.9
      lenis.options.wheelMultiplier = inside ? base * factor : base
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(check) }
    window.addEventListener('scroll', onScroll, { passive: true })
    check()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
      if (inside && window.__lenis) window.__lenis.options.wheelMultiplier = window.__lenisWheel || 0.9
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
