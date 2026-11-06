import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { thumbHiFor, thumbFallbackFor, isVimeo } from '../data/media'
import { useConsent } from '../components/consent'
import { useImgFallback } from '../hooks/useImgFallback'
import { useLetterbox, letterboxCrop } from '../hooks/useLetterbox'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './Highlights.css'

// Muted, chrome-less background loop of the actual film.
function bgSrc(s) {
  if (isVimeo(s)) return `https://player.vimeo.com/video/${s.vimeoId}?background=1&autoplay=1&loop=1&muted=1&dnt=1`
  const id = s.youtubeId
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&playsinline=1&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3&start=20&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const pad = (n) => String(n).padStart(2, '0')

/**
 * Highlighted work as opening titles. Each film fills the screen; its title
 * sets in large over the picture with a credits line under it. Between films
 * a shutter closes, a slate for the next film shows on the blades, and the
 * shutter opens on the new picture. Scrolling only picks the film; the change
 * itself always plays at the same pace, so a fast scroll can't rush it or
 * make it stutter. Only transform and opacity move.
 */
const CHANGE_S = 1.15 // one shutter close-and-open, in seconds
// shutter closure over a change's progress: 0 open, 1 shut at the midpoint.
// Symmetric, so a change can be restarted from its mirror point seamlessly.
const shutAt = (p) => smooth(0.03, 0.34, Math.min(p, 1 - p)) // shut and held from 0.34 to 0.66
function Shot({ s, on, live }) {
  const thumb = useImgFallback(thumbHiFor(s), thumbFallbackFor(s), s.id)
  const [shown, setShown] = useState(false)
  const bars = useLetterbox(thumb.broken ? '' : thumb.src)
  const vis = 1 - bars.top - bars.bottom
  const frameRef = useRef(null)

  useEffect(() => {
    if (!live) { setShown(false); return }
    if (isVimeo(s)) return
    const onMsg = (e) => {
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return
      let d = e.data
      try { d = typeof d === 'string' ? JSON.parse(d) : d } catch { return }
      const st = d?.event === 'infoDelivery' ? d.info?.playerState : d?.event === 'onStateChange' ? d.info : undefined
      if (st === 1) setShown(true)
      if (st === 0) {
        const cmd = (func, args = []) =>
          frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
        cmd('seekTo', [20, true])
        cmd('playVideo')
      }
      if (d?.event === 'onError') setShown(false)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [live, s])
  const onFrameLoad = () => {
    if (isVimeo(s)) { setTimeout(() => setShown(true), 1200); return }
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: s.id }), '*')
  }

  return (
    <div className={`hl__shot ${on ? 'is-on' : ''}`} aria-hidden="true">
      {/* swapped only while the shutter is shut; a slow push-in while it holds */}
      <div className="hl__pic">
        {!thumb.broken ? (
          <img className="hl__poster" src={thumb.src} alt="" onError={thumb.onError} decoding="async" style={letterboxCrop(bars)} />
        ) : (
          <span className="hl__ph" />
        )}
        {live && (
          <iframe
            style={vis < 0.995 ? { scale: String(1.08 / vis) } : undefined}
            className={`hl__video ${shown ? 'is-on' : ''}`}
            src={bgSrc(s)}
            title=""
            tabIndex={-1}
            aria-hidden="true"
            inert=""
            allow="autoplay; encrypted-media; picture-in-picture"
            ref={frameRef}
            onLoad={onFrameLoad}
          />
        )}
      </div>
    </div>
  )
}

/** The title card for the facing film: each line rises out of its own mask. */
function Titles({ s, n, idx, shut }) {
  // 0 while the film holds, 1 once the shutter is closing on it
  const away = useTransform(shut, (v) => smooth(0, 0.7, v))
  const rise = (delay) => (v) => `${(smooth(delay, 1, v) * 105).toFixed(2)}%`
  const yTitle = useTransform(away, rise(0))
  const yCred = useTransform(away, rise(0.15))
  const yTop = useTransform(away, rise(0.3))
  const o = useTransform(away, (v) => 1 - smooth(0.5, 1, v))
  const credits = [s.role, ...(s.tags || [])].filter(Boolean)
  return (
    <motion.div className="hl__titles" style={{ opacity: o }}>
      <span className="hl__mask">
        <motion.span className="hl__over" style={{ y: yTop }}>
          {s.award && <b>Award-winning</b>}
          <span>Scene {pad(idx + 1)} of {pad(n)}</span>
        </motion.span>
      </span>
      <h3 className="hl__title">
        <span className="hl__mask">
          <motion.span style={{ y: yTitle }}>{s.title}</motion.span>
        </span>
      </h3>
      <span className="hl__mask">
        <motion.span className="hl__credits" style={{ y: yCred }}>
          {credits.map((c, k) => <span key={k}>{c}</span>)}
        </motion.span>
      </span>
    </motion.div>
  )
}

export default function Highlights({ projects, onOpenProject }) {
  const slides = (projects || []).slice(0, 4)
  const n = slides.length
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // the film the scroll position asks for
  const want = useTransform(p, (v) => Math.round(Math.min(1, Math.max(0, (v - 0.04) / 0.92)) * (n - 1)))
  // the change in progress: from -> to, phase 0..1 (1 = settled)
  const phase = useMotionValue(1)
  const shut = useTransform(phase, shutAt)
  const bladeTop = useTransform(shut, (v) => `${((v - 1) * 100).toFixed(3)}%`)
  const bladeBot = useTransform(shut, (v) => `${((1 - v) * 100).toFixed(3)}%`)
  // the slate comes up as the blades meet and is gone before they part
  const slateO = useTransform(phase, (ph) => (ph <= 0.5 ? smooth(0.26, 0.36, ph) : 1 - smooth(0.6, 0.67, ph)))
  const slateY = useTransform(slateO, (v) => `${((1 - v) * 14).toFixed(2)}px`)
  // the clapper stick is up while the shutter closes and claps shut on it
  const stick = useTransform(phase, (ph) => (ph <= 0.5 ? -16 * (1 - smooth(0.42, 0.5, ph)) : 0))
  const progress = useMotionValue(0)
  const [view, setView] = useState({ from: 0, to: 0 })
  const [shown, setShown] = useState(0) // the film behind the shutter right now
  const run = useRef({ from: 0, to: 0, anim: null })

  const go = (target) => {
    const r = run.current
    if (target === r.to) return
    animate(progress, n > 1 ? target / (n - 1) : 1, { duration: reduced ? 0 : CHANGE_S, ease: [0.65, 0, 0.35, 1] })
    const ph = phase.get()
    if (ph < 0.5 && r.anim) {
      // still closing: just retarget, the shutter opens on the new film
      r.to = target
      setView({ from: r.from, to: target })
      return
    }
    // settled, or already opening: start a change from where the shutter is
    r.anim?.stop()
    r.from = r.to
    r.to = target
    setView({ from: r.from, to: target })
    if (reduced) { phase.set(1); setShown(target); return }
    phase.set(ph < 1 ? 1 - ph : 0)
    r.anim = animate(phase, 1, {
      duration: CHANGE_S * (1 - phase.get()),
      ease: 'linear', // the shutter curve itself is eased (shutAt)
      onComplete: () => { r.anim = null },
    })
  }
  // while the scroll is being paged by us, the scroll position must not
  // re-decide the film: we already chose it
  // (a deadline, not a flag: an interrupted scroll animation can never leave
  // it stuck on)
  const pagingUntil = useRef(0)
  const isPaging = () => performance.now() < pagingUntil.current
  useMotionValueEvent(want, 'change', (v) => { if (!isPaging()) go(v) })
  // swap the picture at the midpoint, while the shutter is shut
  useMotionValueEvent(phase, 'change', (ph) => {
    const v = ph < 0.5 ? run.current.from : run.current.to
    setShown((p) => (p === v ? p : v))
  })
  useEffect(() => () => run.current.anim?.stop(), [])

  const [live, setLive] = useState(-1)
  const { media } = useConsent()
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 721px)').matches
  // The silent preview starts only once a change has finished and the page
  // has been still for a moment; any new change stops it.
  const [settled, setSettled] = useState(true)
  useMotionValueEvent(phase, 'change', (ph) => setSettled((p) => (p === (ph >= 1) ? p : ph >= 1)))
  const lastMove = useRef(0)
  useMotionValueEvent(p, 'change', () => { lastMove.current = performance.now() })
  useEffect(() => {
    setLive(-1)
    if (!settled || reduced || !wide || !media) return
    let t
    const check = () => {
      if (performance.now() - lastMove.current > 900) setLive(shown)
      else t = setTimeout(check, 300)
    }
    t = setTimeout(check, 900)
    return () => clearTimeout(t)
  }, [settled, shown, reduced, wide, media])

  // Where each film rests, in page scroll positions.
  const geom = () => {
    const el = ref.current
    const top = el.getBoundingClientRect().top + window.scrollY
    const travel = el.offsetHeight - window.innerHeight
    return { top, travel, at: (i) => top + (0.04 + (i / Math.max(1, n - 1)) * 0.92) * travel }
  }
  const pageTo = (i, duration = 1.2) => {
    const lenis = window.__lenis
    const y = geom().at(i)
    if (!lenis) { window.scrollTo({ top: y, behavior: 'smooth' }); return }
    pagingUntil.current = performance.now() + duration * 1000 + 120
    go(i)
    lenis.scrollTo(y, {
      duration,
      easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      force: true,
    })
  }
  const jump = (i) => pageTo(i, 1.0)

  // One scroll gesture, one film. A fast flick or a long trackpad swipe moves
  // exactly one film and then waits for the shutter to finish; it cannot run
  // past the film you wanted. At the first and last film the scroll leaves the
  // section as normal. A scroll that stops between films (touch, scroll bar,
  // keys) settles onto the nearest one.
  useEffect(() => {
    if (reduced || n < 2) return
    let lastWheel = 0, restT = 0, touching = false, leaving = false
    const inside = (g, y) => y >= g.top - 2 && y <= g.top + g.travel + 2
    const onWheel = (e) => {
      const lenis = window.__lenis
      if (!lenis || lenis.isStopped || Math.abs(e.deltaY) < 1 || e.ctrlKey) return
      const g = geom()
      if (!inside(g, window.scrollY)) return
      const next = run.current.to + (e.deltaY > 0 ? 1 : -1)
      const now = performance.now()
      const gap = now - lastWheel
      lastWheel = now
      // A new gesture is either one that follows a pause, or a deliberate
      // notch or swipe (a big delta) once the shutter has finished. The tail of
      // a trackpad swipe is a stream of small deltas, so it never counts; but
      // spinning a mouse wheel without stopping must not lock the page either.
      const fresh = !isPaging() && phase.get() >= 1 && (gap >= 140 || Math.abs(e.deltaY) >= 60)
      if (fresh) leaving = false
      // At the first or last film a fresh gesture scrolls on, out of the
      // section, and all of that gesture goes with it. The tail of a hard
      // flick that just paged onto this film is swallowed instead.
      if (next < 0 || next > n - 1) {
        if (fresh) leaving = true
        if (leaving) return
      }
      e.preventDefault()
      e.stopImmediatePropagation()
      if (fresh && next >= 0 && next <= n - 1) pageTo(next, 1.0)
    }
    // A scroll that stops between films (touch, scroll bar, keys) goes on to
    // the next film in the direction it was moving, once it has moved a little
    // way off the one it started on. Snapping to the nearest film instead would
    // pull a short swipe straight back, and the page would never advance.
    const settle = () => {
      const g = geom(), y = window.scrollY
      if (isPaging() || touching || !inside(g, y) || y < g.at(0) || y > g.at(n - 1)) return
      const cur = run.current.to
      const d = y - g.at(cur)
      if (Math.abs(d) < 3) return
      const gap = (g.at(n - 1) - g.at(0)) / (n - 1)
      const target = Math.abs(d) > gap * 0.1 ? Math.min(n - 1, Math.max(0, cur + Math.sign(d))) : cur
      pageTo(target, 0.6)
    }
    const onScroll = () => { clearTimeout(restT); if (!isPaging()) restT = setTimeout(settle, 180) }
    const down = () => { touching = true }
    const up = () => { touching = false; onScroll() }
    window.addEventListener('wheel', onWheel, { capture: true, passive: false })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchend', up, { passive: true })
    window.addEventListener('touchcancel', up, { passive: true })
    return () => {
      clearTimeout(restT)
      window.removeEventListener('wheel', onWheel, { capture: true })
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('touchstart', down)
      window.removeEventListener('touchend', up)
      window.removeEventListener('touchcancel', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, reduced])

  // decode the posters while idle, so the first scroll in never stalls
  useEffect(() => {
    const ric = window.requestIdleCallback || ((f) => setTimeout(f, 1500))
    const id = ric(() => {
      slides.forEach((sl) => {
        const src = thumbHiFor(sl)
        if (!src) return
        const im = new Image()
        im.decoding = 'async'
        im.src = src
        im.decode?.().catch(() => {})
      })
    })
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n])

  if (!n) return null
  const s = slides[shown] || slides[0]
  const next = slides[view.to] || slides[0]

  return (
    <section className="hl" id="highlights" ref={ref} style={{ height: `${(n * 1.1 + 1) * 100}vh` }}>
      <div className="hl__pin">
        <button type="button" className="hl__screen" onClick={() => onOpenProject(s)} aria-label={`Watch ${s.title} with sound`}>
          {slides.map((sl, i) => (
            <Shot key={sl.id} s={sl} on={shown === i} live={live === i} />
          ))}
          <span className="hl__scrim" aria-hidden="true" />
        </button>

        {/* the shutter, with the next film's slate on its blades */}
        {!reduced && (
          <div className="hl__shutter" aria-hidden="true">
            <motion.span className="hl__blade hl__blade--t" style={{ y: bladeTop }} />
            <motion.span className="hl__blade hl__blade--b" style={{ y: bladeBot }} />
            <motion.div className="hl__slate" style={{ opacity: slateO, y: slateY }}>
              <div className="hl__board">
                <div className="hl__clap">
                  <motion.span className="hl__stick" style={{ rotate: stick }} />
                  <span className="hl__bar" />
                </div>
                <div className="hl__fields">
                  <div className="hl__f hl__f--wide"><span>Prod.</span><b>TSG Studios</b></div>
                  <div className="hl__f"><span>Roll</span><b>A{pad(view.to + 1)}</b></div>
                  <div className="hl__f hl__f--title"><span>Title</span><strong>{next.title}</strong></div>
                  <div className="hl__f"><span>Scene</span><b>{pad(view.to + 1)}</b></div>
                  <div className="hl__f"><span>Take</span><b>1</b></div>
                  <div className="hl__f"><span>Of</span><b>{pad(n)}</b></div>
                  <div className="hl__f hl__f--wide"><span>DoP</span><b>Saksham Goel</b></div>
                  <div className="hl__f"><span>FPS</span><b>24</b></div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        <header className="hl__top">
          <span className="slate">Featured</span>
          <h2 className="hl__head">Highlighted work</h2>
          <span className="hl__count-all" aria-hidden="true">{pad(shown + 1)} / {pad(n)}</span>
        </header>

        <div className="hl__bottom">
          <Titles key={s.id} s={s} n={n} idx={shown} shut={shut} />
          <div className="hl__actions">
            <button type="button" className="hl__play" onClick={() => onOpenProject(s)}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
              Watch with sound
            </button>
            <div className="hl__dots" role="tablist" aria-label="Highlighted films">
              {slides.map((sl, i) => (
                <button
                  key={sl.id}
                  type="button"
                  role="tab"
                  aria-selected={i === view.to}
                  aria-label={sl.title}
                  className={i === view.to ? 'is-on' : ''}
                  onClick={() => jump(i)}
                />
              ))}
            </div>
          </div>
        </div>
        {!reduced && <motion.span className="hl__progress" style={{ scaleX: progress }} aria-hidden="true" />}
      </div>
    </section>
  )
}
