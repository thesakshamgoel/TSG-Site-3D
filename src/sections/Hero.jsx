import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useMagnetic } from '../hooks/useMagnetic'
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

export default function Hero({ profile, onExplore }) {
  const magnet = useMagnetic(8)
  const nameWords = profile.name.split(' ')
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, -160])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.18])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <section className="hero section" id="hero" ref={ref}>
      <motion.div className="hero__scroll" style={{ y, scale, opacity }}>
      <div className="container hero__inner">
        <motion.img
          className="hero__logo"
          src="/logo.svg"
          alt={`${profile.name} logo`}
          initial={{ opacity: 0, scale: 0.7, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />

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
            className="hero__name hero__breathe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {nameWords.map((word, i) => (
              <span className="hero__word-mask" key={`${word}-${i}`}>
                <motion.span
                  className="hero__word"
                  initial={{ y: '110%' }}
                  animate={{ y: '0%' }}
                  transition={{
                    duration: 0.9,
                    delay: 0.2 + i * 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {word}
                </motion.span>
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
                <b>{s.value}</b>
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
