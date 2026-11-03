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
    let ramp = null
    // Ease the wheel speed to its new value instead of switching it in one
    // step: a sudden change of scroll speed at the section's edge read as a
    // jerk. About 350 ms, then it stops running.
    const easeTo = (target) => {
      cancelAnimationFrame(ramp)
      const lenis = window.__lenis
      if (!lenis) return
      let last = performance.now()
      const step = (t) => {
        const dt = Math.min(64, t - last); last = t
        const cur = lenis.options.wheelMultiplier
        const next = cur + (target - cur) * (1 - Math.exp(-dt / 120))
        lenis.options.wheelMultiplier = Math.abs(next - target) < 0.004 ? target : next
        if (lenis.options.wheelMultiplier !== target) ramp = requestAnimationFrame(step)
      }
      ramp = requestAnimationFrame(step)
    }
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
      easeTo(inside ? base * factor : base)
    }
    const onScroll = () => { if (raf == null) raf = requestAnimationFrame(check) }
    window.addEventListener('scroll', onScroll, { passive: true })
    check()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
      cancelAnimationFrame(ramp)
      if (inside && window.__lenis) window.__lenis.options.wheelMultiplier = window.__lenisWheel || 0.9
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
