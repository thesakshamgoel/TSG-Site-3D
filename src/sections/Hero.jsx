import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useMagnetic } from '../hooks/useMagnetic'
import { useReducedMotion } from '../hooks/useReducedMotion'
import StarTunnel from '../components/StarTunnel'
import './Hero.css'

const REEL_LABELS = [
  'CINEMATOGRAPHER',
  'DI ARTIST',
  'VFX ARTIST',
  'FILM EDITOR',
  'DIT',
  'GRAPHIC DESIGNER',
  'LOGO DESIGNER',
  'CAMERA OPERATOR',
]

// one letter of the name: flips up out of a mask on arrival, and drifts away
// from the centre of the name as the hero scrolls out
function NameChar({ ch, k, mid, delay, exit, reduced }) {
  const x = useTransform(exit, [0, 1], [0, (k - mid) * 16])
  return (
    <span className="hero__char-mask">
      <motion.span
        className="hero__char"
        initial={reduced ? false : { y: '70%', rotateX: -85, opacity: 0 }}
        animate={{ y: '0%', rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.95, delay, ease: [0.22, 1, 0.36, 1] }}
        style={reduced ? undefined : { x }}
      >
        {ch}
      </motion.span>
    </span>
  )
}

// counts a published figure up from zero ("100+" -> 0..100, then "+")
function CountUp({ value, delay = 0.5 }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    const m = String(value).match(/^(\d+)(.*)$/)
    const el = ref.current
    if (!m || !el || reduced) return
    const target = +m[1], suffix = m[2]
    let raf, t0 = null
    const step = (t) => {
      if (t0 == null) t0 = t + delay * 1000
      const k = Math.min(1, Math.max(0, (t - t0) / 1600))
      const e = 1 - Math.pow(1 - k, 3)
      el.textContent = Math.round(target * e) + (k >= 1 ? suffix : '')
      if (k < 1) raf = requestAnimationFrame(step)
    }
    el.textContent = '0'
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, delay, reduced])
  return <b ref={ref}>{value}</b>
}

export default function Hero({ profile, onExplore }) {
  const magnet = useMagnetic(8)
  const nameWords = profile.name.split(' ')
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, -160])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.18])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const reduced = useReducedMotion()
  // the star drift is the same field that becomes the reel's tunnel below
  const starsO = useTransform(scrollYProgress, [0, 1], [0.55, 0.9])
  let charIndex = 0
  const nameLen = profile.name.replace(/\s/g, '').length

  return (
    <section className="hero section" id="hero" ref={ref}>
      <StarTunnel className="hero__stars" intensity={starsO} speed={reduced ? () => 0.0008 : undefined} reduced={reduced} />
      <span className="hero__sweep" aria-hidden="true" />
      <motion.div className="hero__scroll" style={{ y, scale, opacity }}>
      <div className="container hero__inner">
        <span className="hero__logo-wrap">
          <span className="hero__halo" aria-hidden="true" />
          <motion.img
            className="hero__logo"
            src="/logo.svg"
            alt={`${profile.name} logo`}
            initial={{ opacity: 0, scale: 0.7, y: 10, rotate: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </span>

        <motion.span
          className="slate hero__slate"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          Portfolio · Reel 2026
        </motion.span>

        {/* pointer-parallax wrapper — floats the name against the section tilt */}
        <div className="hero__name-float">
          <motion.h1
            aria-label={profile.name}
            className="hero__name hero__breathe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {nameWords.map((word, i) => (
              <span className="hero__word-mask" key={`${word}-${i}`} aria-hidden="true">
                {Array.from(word).map((ch) => {
                  const k = charIndex++
                  return (
                    <NameChar
                      key={k}
                      ch={ch}
                      k={k}
                      mid={(nameLen - 1) / 2}
                      delay={0.25 + k * 0.045}
                      exit={scrollYProgress}
                      reduced={reduced}
                    />
                  )
                })}
              </span>
            ))}
          </motion.h1>
        </div>

        <motion.p
          className="hero__tagline gradient-text"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18 }}
        >
          {profile.tagline}
        </motion.p>


        <motion.p
          className="hero__intro"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.26 }}
        >
          {profile.intro}
        </motion.p>

        {profile.stats?.length > 0 && (
          <motion.div
            className="hero__stats"
            aria-label="Track record"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {profile.stats.map((s) => (
              <div className="hero__stat" key={s.label}>
                <CountUp value={s.value} />
                <span>{s.label}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* film-strip accent */}
        <motion.div
          className="hero__reel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.36 }}
          aria-hidden="true"
        >
          <span className="perf-row hero__reel-perf" />
          <div className="hero__reel-frames">
            <div className="hero__reel-track">
              {[...REEL_LABELS, ...REEL_LABELS].map((f, i) => (
                <span key={i} className="hero__reel-frame">
                  {f}
                </span>
              ))}
            </div>
          </div>
          <span className="perf-row hero__reel-perf" />
        </motion.div>

        <motion.div
          className="hero__cta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.46 }}
        >
          <button
            className="btn primary"
            ref={magnet.ref}
            onMouseMove={magnet.onMouseMove}
            onMouseLeave={magnet.onMouseLeave}
            onClick={onExplore}
          >
            Roll the reel
          </button>
          <a href="#about" className="btn">
            About &amp; reviews
          </a>
        </motion.div>
      </div>
      </motion.div>

    </section>
  )
}
