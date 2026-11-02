import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { thumbHiFor, thumbFallbackFor, isVimeo } from '../data/media'
import { useImgFallback } from '../hooks/useImgFallback'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './Highlights.css'

// Muted, chrome-less background loop of the actual film. Far sharper than any
// YouTube thumbnail, which tops out at a heavily compressed 1280px.
function bgSrc(s) {
  if (isVimeo(s)) return `https://player.vimeo.com/video/${s.vimeoId}?background=1&autoplay=1&loop=1&muted=1&dnt=1`
  const id = s.youtubeId
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&playsinline=1&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3&start=20&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }

/**
 * Highlighted work as a row of cinema screens in 3D.
 *
 * Scroll moves a "cursor" along the row. Each film waits angled in the depth
 * to the right, swings round to face you and opens to fill the screen, holds
 * there (its film plays silently), then swings away to the left as the next
 * arrives. The cursor eases into each film so every one gets a real hold.
 * Transform and opacity only, so the whole move stays on the compositor.
 */
function Char({ ch, k, len, open, reduced }) {
  const a = 0.35 + (k / Math.max(len, 1)) * 0.4
  const y = useTransform(open, [a, a + 0.25], ['105%', '0%'])
  if (ch === ' ') return <span className="hl__sp"> </span>
  return (
    <span className="hl__ch">
      <motion.span style={reduced ? undefined : { y }}>{ch}</motion.span>
    </span>
  )
}

function Screen({ s, i, n, cursor, onOpen, reduced }) {
  const thumb = useImgFallback(thumbHiFor(s), thumbFallbackFor(s), s.id)
  const [live, setLive] = useState(false)
  const [shown, setShown] = useState(false)
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 721px)').matches

  // t: where this film sits relative to the cursor. 0 = facing you, full screen;
  // positive = still to come (right, deep), negative = already passed (left)
  const t = useTransform(cursor, (c) => i - c)
  const open = useTransform(t, (v) => 1 - smooth(0, 0.24, Math.abs(v)))
  const scale = useTransform(open, (o) => 0.5 + 0.5 * o)
  const x = useTransform(t, (v) => `${(Math.sign(v) * smooth(0.06, 1.1, Math.abs(v)) * 60).toFixed(3)}vw`)
  const z = useTransform(t, (v) => -smooth(0, 1.2, Math.abs(v)) * 620)
  const rotateY = useTransform(t, (v) => -Math.sign(v) * smooth(0.04, 0.9, Math.abs(v)) * 40)
  const opacity = useTransform(t, (v) => 1 - smooth(1.15, 1.7, Math.abs(v)))
  const dim = useTransform(t, (v) => smooth(0.12, 0.8, Math.abs(v)) * 0.55)
  const zIndex = useTransform(t, (v) => 100 - Math.round(Math.abs(v) * 10))
  const metaO = useTransform(open, [0.55, 1], [0, 1])
  const metaY = useTransform(open, [0.55, 1], [28, 0])
  const inner = useTransform(open, [0, 1], [1.16, 1])

  // play only while this film is the open one and the visitor has rested on it
  const wantRef = useRef(false)
  const timerRef = useRef(null)
  const decide = () => {
    // desktop only: phones keep the poster (YouTube forces its own controls
    // over mobile embeds, and a silent stream costs their data)
    const on = !reduced && wide && open.get() > 0.97
    wantRef.current = on
    clearTimeout(timerRef.current)
    if (!on) {
      if (live) { setLive(false); setShown(false) }
      return
    }
    if (!live) timerRef.current = setTimeout(() => { if (wantRef.current) setLive(true) }, 450)
  }
  useEffect(() => () => clearTimeout(timerRef.current), [])
  useMotionValueEvent(open, 'change', decide)

  // reveal the player only once it is really playing; films that refuse
  // embedding keep their poster instead of showing YouTube's error card
  const frameRef = useRef(null)
  useEffect(() => {
    if (!live || isVimeo(s)) return
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
    <motion.div
      className="hl__screen"
      style={reduced ? undefined : { x, z, rotateY, scale, opacity, zIndex }}
    >
      <button type="button" className="hl__frame" onClick={() => onOpen(s)} aria-label={`Watch ${s.title} with sound`}>
        <motion.div className="hl__inner" style={reduced ? undefined : { scale: inner }}>
          {!thumb.broken ? (
            <img className="hl__poster" src={thumb.src} alt="" onError={thumb.onError} decoding="async" />
          ) : (
            <div className="hl__ph"><span>{s.title}</span></div>
          )}
          {live && (
            <iframe
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
        </motion.div>
        <span className="hl__shade" />
        <motion.span className="hl__dim" style={reduced ? undefined : { opacity: dim }} />
      </button>
      <motion.div className="hl__meta" style={reduced ? undefined : { opacity: metaO, y: metaY }}>
        <div className="hl__tags">
          <span className="hl__count">{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
          {s.award && <span className="hl__award">Award-winning</span>}
          {(s.tags || []).map((tg) => <span key={tg}>{tg}</span>)}
        </div>
        <h3 className="hl__title" aria-label={s.title}>
          <span aria-hidden="true">
            {Array.from(s.title).map((ch, k, arr) => (
              <Char key={k} ch={ch} k={k} len={arr.length} open={open} reduced={reduced} />
            ))}
          </span>
        </h3>
        <p className="hl__role">{s.role}</p>
        <button type="button" className="hl__play" onClick={() => onOpen(s)}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
          Watch with sound
        </button>
      </motion.div>
    </motion.div>
  )
}

// a thumbnail on the rail: lights up while its film is facing you
function RailItem({ s, i, cursor, onJump }) {
  const thumb = useImgFallback(thumbHiFor(s), thumbFallbackFor(s), s.id)
  const on = useTransform(cursor, (c) => 1 - smooth(0, 0.5, Math.abs(i - c)))
  const o = useTransform(on, [0, 1], [0.45, 1])
  const bar = useTransform(on, [0, 1], [0, 1])
  return (
    <motion.button type="button" className="hl__rail-item" style={{ opacity: o }} onClick={() => onJump(i)} aria-label={`Go to ${s.title}`}>
      {!thumb.broken && <img src={thumb.src} alt="" onError={thumb.onError} loading="lazy" decoding="async" />}
      <motion.span className="hl__rail-bar" style={{ scaleX: bar }} />
    </motion.button>
  )
}

export default function Highlights({ projects, onOpenProject }) {
  const slides = (projects || []).slice(0, 4)
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const n = slides.length
  const span = n - 1 + 0.9
  // Lenis already smooths the scroll; no second smoother here (it only adds lag)
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  // the cursor eases into each film, so each one holds the screen for a while
  const cursor = useTransform(p, (v) => {
    const raw = -0.45 + v * span
    const base = Math.floor(raw)
    return base + smooth(0.22, 0.78, raw - base)
  })
  const headO = useTransform(p, [0, 0.07], [1, 0])
  const headY = useTransform(p, [0, 0.07], [0, -50])
  const railO = useTransform(p, [0.02, 0.08, 0.94, 1], [0, 1, 1, 0])

  const jump = (i) => {
    const el = ref.current
    if (!el) return
    // invert the cursor: hold point of film i sits at raw = i (+0.5 inside its ease)
    const v = (i + 0.45) / span
    const top = el.getBoundingClientRect().top + window.scrollY
    const y = top + v * (el.offsetHeight - window.innerHeight)
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.2 })
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }

  if (!n) return null

  return (
    <section className="hl" id="highlights" ref={ref} style={reduced ? undefined : { height: `${(span + 1) * 100}vh` }}>
      <div className="hl__pin">
        <div className="hl__stage">
          {slides.map((s, i) => (
            <Screen key={s.id} s={s} i={i} n={n} cursor={cursor} onOpen={onOpenProject} reduced={reduced} />
          ))}
        </div>
        <motion.h2 className="hl__head" style={reduced ? undefined : { opacity: headO, y: headY }}>
          <span className="slate">Featured</span>
          Highlighted work
        </motion.h2>
        {!reduced && (
          <motion.div className="hl__rail" style={{ opacity: railO }}>
            {slides.map((s, i) => (
              <RailItem key={s.id} s={s} i={i} cursor={cursor} onJump={jump} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}
