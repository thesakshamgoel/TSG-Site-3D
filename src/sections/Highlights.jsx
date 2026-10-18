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

/**
 * One featured film per screen. Each arrives as a small frame rising from the
 * bottom, then opens out to fill the viewport (transform-only, so it stays on
 * the compositor) while the one beneath sinks back. Once open, the film itself
 * starts playing silently behind the title.
 */
// one letter of the title, rising out of a mask in sequence once the frame is open
function Char({ ch, k, len, open, reduced }) {
  const a = 0.62 + (k / Math.max(len, 1)) * 0.22
  const y = useTransform(open, [a, a + 0.14], ['105%', '0%'])
  if (ch === ' ') return <span className="hl__sp"> </span>
  return (
    <span className="hl__ch">
      <motion.span style={reduced ? undefined : { y }}>{ch}</motion.span>
    </span>
  )
}

function Slide({ s, i, n, p, onOpen, reduced }) {
  const thumb = useImgFallback(thumbHiFor(s), thumbFallbackFor(s), s.id)
  const [live, setLive] = useState(false)
  const [shown, setShown] = useState(false)
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 721px)').matches
  const t = useTransform(p, (v) => Math.min(1, Math.max(0, v * (n + 0.4) - i + (i === 0 ? 0.45 : 0))))
  // the frame comes up tilted back, like a print lifted onto the light table
  const tilt = useTransform(t, [0, 0.45], [26, 0])
  const open = useTransform(t, [0.3, 0.85], [0, 1])
  // frame window grows from 50% x 62% of the screen to full-bleed; the inner
  // layer counter-scales so the picture is cropped, never squashed
  const sx = useTransform(open, (o) => 0.5 + 0.5 * o)
  const sy = useTransform(open, (o) => 0.62 + 0.38 * o)
  const zoom = useTransform(open, [0, 1], [1.25, 1])
  const ix = useTransform([sx, zoom], ([a, z]) => z / a)
  const iy = useTransform([sy, zoom], ([a, z]) => z / a)
  // 0 until the next slide starts rising, 1 once it has fully covered this one
  const after = useTransform(p, (v) => (i === n - 1 ? 0 : Math.min(1, Math.max(0, (v * (n + 0.4) - i - 1) / 0.5))))
  const sink = useTransform(after, [0, 1], [1, 0.9])
  // one vertical track: rise in from below, then drift up as the next takes over
  const y = useTransform([t, after], ([tt, a]) =>
    a > 0 || i === 0 ? `${(-6 * a).toFixed(3)}vh` : `${(100 * (1 - Math.min(1, tt / 0.45))).toFixed(3)}vh`
  )
  const dim = useTransform(after, [0, 1], [0, 0.75])
  // the title arrives with the open frame and leaves as soon as the next one takes over
  const metaO = useTransform([open, after], ([o, a]) => Math.min(1, Math.max(0, (o - 0.72) / 0.28)) * (1 - Math.min(1, a * 3)))
  const metaY = useTransform(open, [0.72, 1], [40, 0])

  // play only while this slide is the open one
  const decide = () => {
    // desktop only: phones get the poster (YouTube forces its own controls
    // over mobile embeds, and a silent background stream costs their data)
    const on = !reduced && wide && open.get() > 0.96 && after.get() < 0.6
    if (on !== live) {
      setLive(on)
      if (!on) setShown(false)
    }
  }
  useMotionValueEvent(open, 'change', decide)
  useMotionValueEvent(after, 'change', decide)

  // Reveal the player only once it reports that it is really playing. Some
  // films do not allow embedding; those keep their poster instead of showing
  // YouTube's error card.
  const frameRef = useRef(null)
  useEffect(() => {
    if (!live || isVimeo(s)) return
    const onMsg = (e) => {
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return
      let d = e.data
      try { d = typeof d === 'string' ? JSON.parse(d) : d } catch { return }
      const st = d?.event === 'infoDelivery' ? d.info?.playerState : d?.event === 'onStateChange' ? d.info : undefined
      if (st === 1) setShown(true)
      // loop by hand: the playlist trick YouTube needs for loop=1 also shows
      // previous / next buttons over the film
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
    // subscribe to the player's state events
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: s.id }), '*')
  }

  return (
    <motion.div
      className="hl__slide"
      style={reduced ? undefined : { y, rotateX: i === 0 ? 0 : tilt, scale: sink, zIndex: i + 1, transformPerspective: 1600 }}
    >
      <motion.button
        type="button"
        className="hl__frame"
        style={reduced ? undefined : { scaleX: sx, scaleY: sy }}
        onClick={() => onOpen(s)}
        aria-label={`Watch ${s.title} with sound`}
      >
        <motion.div className="hl__inner" style={reduced ? undefined : { scaleX: ix, scaleY: iy }}>
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
      </motion.button>
      <motion.div className="hl__meta" style={reduced ? undefined : { opacity: metaO, y: metaY }}>
        <div className="hl__tags">
          <span className="hl__count">{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
          {s.award && <span className="hl__award">★ Award-winning</span>}
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

export default function Highlights({ projects, onOpenProject }) {
  const slides = (projects || []).slice(0, 4)
  const ref = useRef(null)
  const reduced = useReducedMotion()
  // no spring here: Lenis already smooths the scroll, a second smoother only adds lag
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const headO = useTransform(p, [0, 0.12], [1, 0])
  const headY = useTransform(p, [0, 0.12], [0, -40])

  if (!slides.length) return null
  const n = slides.length

  return (
    <section className="hl" id="highlights" ref={ref} style={reduced ? undefined : { height: `${(n + 0.4) * 100}vh` }}>
      <div className="hl__pin" data-opaque>
        {slides.map((s, i) => (
          <Slide key={s.id} s={s} i={i} n={n} p={p} onOpen={onOpenProject} reduced={reduced} />
        ))}
        <motion.h2 className="hl__head" style={reduced ? undefined : { opacity: headO, y: headY }}>
          Highlighted <em>work.</em>
        </motion.h2>
      </div>
    </section>
  )
}
