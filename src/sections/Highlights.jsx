import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform, useVelocity } from 'framer-motion'
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

const STEP = 34 // degrees between films on the ring

/**
 * Highlighted work on a ring of screens in 3D.
 *
 * The films sit around a cylinder; scroll turns the cylinder, so only one
 * element moves per frame (cheap and smooth). The perspective responds to how
 * you scroll: a fast scroll tilts the ring and pulls the camera back a little,
 * and it settles flat when you stop. The film facing you plays silently once
 * you rest on it; its title sits in plain 2D over the scene.
 */
function Screen({ s, i, cursor, live, onOpen }) {
  const thumb = useImgFallback(thumbHiFor(s), thumbFallbackFor(s), s.id)
  const [shown, setShown] = useState(false)
  const dim = useTransform(cursor, (c) => Math.min(0.7, Math.abs(c - i) * 0.6))
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
    <div className="hl__screen" style={{ '--i': i }}>
      <button type="button" className="hl__frame" onClick={() => onOpen(s)} aria-label={`Watch ${s.title} with sound`}>
        {!thumb.broken ? (
          <img className="hl__poster" src={thumb.src} alt="" onError={thumb.onError} decoding="async" />
        ) : (
          <span className="hl__ph">{s.title}</span>
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
        <motion.span className="hl__dim" style={{ opacity: dim }} />
      </button>
    </div>
  )
}

export default function Highlights({ projects, onOpenProject }) {
  const slides = (projects || []).slice(0, 4)
  const n = slides.length
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // the cursor: which film faces you. A soft hold at each film (the speed
  // dips near it but never stops, so the scroll never feels stuck)
  const cursor = useTransform(p, (v) => {
    const raw = Math.min(n - 1, Math.max(0, (v - 0.06) / 0.88)) * (n - 1)
    return raw - (Math.sin(2 * Math.PI * raw) / (2 * Math.PI)) * 0.75
  })
  const turn = useTransform(cursor, (c) => -c * STEP)

  // perspective that answers the scroll: tilt and pull back while moving fast
  const vel = useVelocity(cursor)
  const speed = useSpring(vel, { stiffness: 120, damping: 26, mass: 0.6 })
  const tilt = useTransform(speed, (v) => Math.max(-9, Math.min(9, v * 5)))
  const pull = useTransform(speed, (v) => -Math.min(260, Math.abs(v) * 160))

  const [active, setActive] = useState(0)
  const [live, setLive] = useState(-1)
  const timer = useRef(null)
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 721px)').matches
  useMotionValueEvent(cursor, 'change', (c) => {
    const a = Math.round(c)
    setActive(a)
    // play the facing film once the visitor rests on it (desktop only)
    clearTimeout(timer.current)
    setLive(-1)
    if (!reduced && wide && Math.abs(c - a) < 0.04) timer.current = setTimeout(() => setLive(a), 600)
  })
  useEffect(() => () => clearTimeout(timer.current), [])

  const headO = useTransform(p, [0, 0.05], [1, 0])
  const headY = useTransform(p, [0, 0.05], [0, -40])

  const jump = (i) => {
    const el = ref.current
    if (!el) return
    const v = 0.06 + (i / Math.max(1, n - 1)) * 0.88
    const top = el.getBoundingClientRect().top + window.scrollY
    const y = top + v * (el.offsetHeight - window.innerHeight)
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.4 })
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }

  if (!n) return null
  const s = slides[active] || slides[0]

  return (
    <section className="hl" id="highlights" ref={ref} style={reduced ? undefined : { height: `${(n * 0.85 + 1) * 100}vh` }}>
      <div className="hl__pin">
        <motion.h2 className="hl__head" style={reduced ? undefined : { opacity: headO, y: headY }}>
          <span className="slate">Featured</span>
          Highlighted work
        </motion.h2>

        <div className="hl__stage">
          <motion.div className="hl__camera" style={reduced ? undefined : { rotateX: tilt, z: pull }}>
            <div className="hl__origin">
              <motion.div className="hl__ring" style={reduced ? undefined : { rotateY: turn }}>
                {slides.map((sl, i) => (
                  <Screen key={sl.id} s={sl} i={i} cursor={cursor} live={live === i} onOpen={onOpenProject} />
                ))}
              </motion.div>
            </div>
          </motion.div>
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
                <span className="hl__count">{String(active + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
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
