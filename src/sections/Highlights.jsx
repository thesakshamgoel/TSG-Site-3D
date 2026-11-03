import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { thumbMidFor, thumbFallbackFor, isVimeo } from '../data/media'
import { useConsent } from '../components/consent'
import { useImgFallback } from '../hooks/useImgFallback'
import { useLetterbox, letterboxCrop } from '../hooks/useLetterbox'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useScrollDamp } from '../hooks/useScrollDamp'
import './Highlights.css'

// Muted, chrome-less background loop of the actual film. Far sharper than any
// YouTube thumbnail, which tops out at a heavily compressed 1280px.
function bgSrc(s) {
  if (isVimeo(s)) return `https://player.vimeo.com/video/${s.vimeoId}?background=1&autoplay=1&loop=1&muted=1&dnt=1`
  const id = s.youtubeId
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&playsinline=1&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3&start=20&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }

/**
 * Highlighted work: one film at a time in a single frame. Scroll moves a
 * cursor between films; each holds still for a while, then dissolves into the
 * next. Only opacity and a slow scale move, so it stays on the compositor and
 * runs the same at 60 and 120 Hz. The film playing silently behind the
 * poster starts only after the page has been still, and stops the moment you
 * scroll again.
 */
function Screen({ s, i, cursor, live, onOpen }) {
  const thumb = useImgFallback(thumbMidFor(s), thumbFallbackFor(s), s.id)
  const [shown, setShown] = useState(false)
  // crossfade: the film is fully visible only while it holds; neighbours
  // dissolve over it. Opacity and a slow scale are all that moves.
  const d = useTransform(cursor, (c) => Math.abs(c - i))
  const opacity = useTransform(d, (v) => 1 - smoothstep(0.15, 0.85, v))
  const scale = useTransform(cursor, (c) => 1 + 0.045 * (1 - clamp01(1 - (c - i + 1) / 2)))
  const z = useTransform(d, (v) => (v < 0.5 ? 2 : 1))
  // black bars baked into the poster are cropped away before the rails go round it
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
    <motion.div className="hl__screen" style={{ opacity, zIndex: z }}>
      <button type="button" className="hl__frame" onClick={() => onOpen(s)} aria-label={`Watch ${s.title} with sound`}>
        <motion.span className="hl__gate" style={{ scale }}>
        {!thumb.broken ? (
          <img className="hl__poster" src={thumb.src} alt="" onError={thumb.onError} decoding="async" style={letterboxCrop(bars)} />
        ) : (
          <span className="hl__ph">{s.title}</span>
        )}
        {live && (
          <iframe
            style={vis < 0.995 ? { scale: String(1.08 / vis) } : undefined}
            className={`hl__video ${shown ? 'is-on' : ''}`}
            src={bgSrc(s)}
            title=""
            tabIndex={-1}
            aria-hidden="true"
            allow="autoplay; encrypted-media; picture-in-picture"
            ref={frameRef}
            onLoad={onFrameLoad}
          />
        )}
        </motion.span>
        <span className="hl__rail hl__rail--t" aria-hidden="true" />
        <span className="hl__rail hl__rail--b" aria-hidden="true" />
      </button>
    </motion.div>
  )
}

export default function Highlights({ projects, onOpenProject }) {
  const slides = (projects || []).slice(0, 4)
  const n = slides.length
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  // a touch slower inside the ring, so each film gets time on screen
  useScrollDamp(ref, 0.8)

  // the cursor: which film faces you. A soft hold at each film (the speed
  // dips near it but never stops, so the scroll never feels stuck)
  const cursor = useTransform(p, (v) => {
    const raw = Math.min(n - 1, Math.max(0, (v - 0.05) / 0.9)) * (n - 1)
    const base = Math.min(n - 2, Math.floor(raw))
    const f = raw - base
    // flat at each film (a real hold), eased glide in between
    const e = f < 0.3 ? 0 : f > 0.7 ? 1 : (() => { const t = (f - 0.3) / 0.4; return t * t * t * (t * (t * 6 - 15) + 10) })()
    return base + e
  })
  const [active, setActive] = useState(0)
  const [live, setLive] = useState(-1)
  const { media } = useConsent()
  const timer = useRef(null)
  const rest = useRef({ at: 0, live: -1, last: 0 })
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 721px)').matches
  // The film plays only once the page has been still for a moment, and stops
  // the instant the ring really moves: a video player starting or stopping in
  // the middle of a scroll is what made it jerk. Tiny drift from the scroll
  // easing settling does not count as movement.
  useMotionValueEvent(cursor, 'change', (c) => {
    const a = Math.round(c)
    setActive((prev) => (prev === a ? prev : a))
    const r = rest.current
    if (r.live !== -1) {
      if (Math.abs(c - r.at) > 0.012) { r.live = -1; setLive(-1) }
      else return
    }
    if (Math.abs(c - r.last) < 0.0015 && timer.current) { r.last = c; return }
    r.last = c
    clearTimeout(timer.current)
    timer.current = null
    if (!reduced && wide && media && Math.abs(c - a) < 0.03) {
      timer.current = setTimeout(() => { r.at = c; r.live = a; setLive(a) }, 900)
    }
  })
  useEffect(() => () => clearTimeout(timer.current), [])


  const jump = (i) => {
    const el = ref.current
    if (!el) return
    const v = 0.05 + (i / Math.max(1, n - 1)) * 0.9
    const top = el.getBoundingClientRect().top + window.scrollY
    const y = top + v * (el.offsetHeight - window.innerHeight)
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.4 })
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }

  // Decode the posters while the page is idle, so the first scroll into this
  // section does not stall on image decoding.
  useEffect(() => {
    const ric = window.requestIdleCallback || ((f) => setTimeout(f, 1500))
    const id = ric(() => {
      slides.forEach((sl) => {
        const src = thumbMidFor(sl)
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
  const s = slides[active] || slides[0]

  return (
    <section className="hl" id="highlights" ref={ref} style={reduced ? undefined : { height: `${(n * 1.05 + 1) * 100}vh` }}>
      <div className="hl__pin">
        <header className="hl__top">
          <span className="slate">Featured</span>
          <h2 className="hl__head">Highlighted work</h2>
          <span className="hl__count-all" aria-hidden="true">{String(active + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
        </header>

        <div className="hl__stage">
          <div className="hl__view">
            {slides.map((sl, i) => (
              <Screen key={sl.id} s={sl} i={i} cursor={cursor} live={live === i} onOpen={onOpenProject} />
            ))}
          </div>
        </div>

        <div className="hl__meta">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={s.id}
              className="hl__meta-in"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="hl__tags">
                {s.award && <span className="hl__award">Award-winning</span>}
                {(s.tags || []).map((tg) => <span key={tg}>{tg}</span>)}
              </div>
              <h3 className="hl__title">{s.title}</h3>
              <p className="hl__role">{s.role}</p>
            </motion.div>
          </AnimatePresence>
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
                  aria-selected={i === active}
                  aria-label={sl.title}
                  className={i === active ? 'is-on' : ''}
                  onClick={() => jump(i)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
