import { useId, useLayoutEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { LITE } from '../perf'
import LogoMark from '../components/LogoMark'
import './Hero.css'

/**
 * The name, drawn as a line. On arrival every letter's outline traces itself
 * in a fine hairline, then the letters fill. After that a short gold line keeps
 * travelling round the outlines, slowly and for good: a quiet, continuous
 * detail rather than a glow. (Phones and reduced motion skip the travelling
 * line; reduced motion also skips the draw.) It is SVG text sized to its own
 * measured bounds, so it fills the width it is given at every screen size.
 */
function DrawnName({ name, ready, reduced }) {
  const ref = useRef(null)
  const mid = 'nm' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const [box, setBox] = useState('0 -80 600 100')
  useLayoutEffect(() => {
    let live = true
    const measure = () => {
      const t = ref.current
      if (!t || !live) return
      const b = t.getBBox()
      if (b.width) setBox(`${(b.x - 4).toFixed(1)} ${(b.y - 4).toFixed(1)} ${(b.width + 8).toFixed(1)} ${(b.height + 8).toFixed(1)}`)
    }
    measure()
    // measure again once the display face has loaded (the fallback is wider)
    document.fonts?.ready.then(measure)
    return () => { live = false }
  }, [name])
  const cls = `hero__nsvg ${ready ? 'is-on' : ''} ${reduced ? 'is-still' : ''}`
  return (
    <svg className={cls} viewBox={box} aria-hidden="true">
      {/* The gold lines are only ever drawn outside the letters: the mask is
          the letters cut out of a white field. The font builds some letters
          from overlapping shapes, and a plain outline showed every one of
          those inner edges as a line through the letter. */}
      <defs>
        <mask id={mid} maskUnits="userSpaceOnUse" x="-100" y="-200" width="1000" height="400">
          <rect x="-100" y="-200" width="1000" height="400" fill="#fff" />
          <text className="hero__nt" x="0" y="0" fill="#000">{name}</text>
        </mask>
      </defs>
      <g mask={`url(#${mid})`}>
        <text className="hero__nt hero__nt--line" x="0" y="0">{name}</text>
        {!LITE && !reduced && <text className="hero__nt hero__nt--trace" x="0" y="0">{name}</text>}
      </g>
      <text ref={ref} className="hero__nt hero__nt--fill" x="0" y="0">{name}</text>
    </svg>
  )
}


// what he does, under the mark: one at a time, rolling through like frames
const ROLES = ['Cinematographer', 'DI Colorist', 'Film & Motion Editor']

export default function Hero({ profile, ready = true, logoHidden = false }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  // The hero holds while you scroll through it and the camera dollies
  // forward through it: everything parts from the centre and leaves the
  // frame (the logo up and past you, the studio's name to either side, the
  // timeline and the name down), faster as it goes. Nothing fades; the centre
  // clears for the reel, which comes out of the depth behind.
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const k = useTransform(p, (v) => Math.pow(Math.min(1, v / 0.85), 1.6)) // 0..1, accelerating
  const W = () => window.innerWidth
  const Hh = () => window.innerHeight
  const logoY = useTransform(k, (v) => -v * Hh() * 0.95)
  const logoS = useTransform(k, (v) => 1 + v * 1.8)
  const leftX = useTransform(k, (v) => -v * W() * 0.75)
  const rightX = useTransform(k, (v) => v * W() * 0.75)
  const sideS = useTransform(k, (v) => 1 + v * 0.6)
  const nameY = useTransform(k, (v) => v * Hh() * 0.65)
  const nameS = useTransform(k, (v) => 1 + v * 0.5)

  const [left, right] = profile.tagline.replace(/\s*&\s*/, '|').split('|')

  return (
    <section className={`hero section ${reduced ? 'is-still' : ''}`} id="hero" ref={ref}>
      <div className="hero__stage">
        <div className="hero__inner">
          {/* the mark at the centre of the frame, the studio either side */}
          <div className="hero__center">
            <motion.div className="hero__exit hero__exit--l" style={reduced ? undefined : { x: leftX, scale: sideS }}>
            <motion.p
              className="hero__side hero__side--l"
              initial={reduced ? false : { opacity: 0, x: -24 }}
              animate={ready ? { opacity: 1, x: 0 } : undefined}
              transition={{ duration: 1, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
              {left}
              <motion.span
                className="hero__lead hero__lead--l"
                aria-hidden="true"
                initial={reduced ? false : { scaleX: 0 }}
                animate={ready ? { scaleX: 1 } : undefined}
                transition={{ duration: 0.9, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.p>
            </motion.div>
            <motion.div className="hero__mark hero__layer hero__layer--1" style={reduced ? undefined : { y: logoY, scale: logoS }}>
              <LogoMark className={`hero__logo${logoHidden ? ' is-hidden' : ''}`} label={`${profile.name} logo`} />
              <motion.p
                className={`hero__roles ${ready ? 'is-on' : ''}`}
                initial={reduced ? false : { opacity: 0 }}
                animate={ready ? { opacity: 1 } : undefined}
                transition={{ duration: 0.8, delay: 1.2 }}
              >
                <span className="hero__rule-s" aria-hidden="true" />
                {/* every role sits in the same cell, so the window is as wide
                    as the longest one and nothing around it moves */}
                <span className="hero__roll">
                  {ROLES.map((r, i) => (
                    <span key={r} className="hero__role" style={{ '--i': i }}>{r}</span>
                  ))}
                </span>
                <span className="hero__rule-s" aria-hidden="true" />
              </motion.p>
            </motion.div>
            {right && (
              <motion.div className="hero__exit hero__exit--r" style={reduced ? undefined : { x: rightX, scale: sideS }}>
              <motion.p
                className="hero__side hero__side--r"
                initial={reduced ? false : { opacity: 0, x: 24 }}
                animate={ready ? { opacity: 1, x: 0 } : undefined}
                transition={{ duration: 1, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.span
                  className="hero__lead hero__lead--r"
                  aria-hidden="true"
                  initial={reduced ? false : { scaleX: 0 }}
                  animate={ready ? { scaleX: 1 } : undefined}
                  transition={{ duration: 0.9, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
                />
                {right}
              </motion.p>
              </motion.div>
            )}
          </div>

          {/* the name, one line across the bottom, drawn as a line */}
          <motion.div className="hero__name-wrap hero__layer hero__layer--2" style={reduced ? undefined : { y: nameY, scale: nameS }}>
            <h1 className="hero__name">
              <span className="sr-only">{profile.name}</span>
              <DrawnName name={profile.name} ready={ready} reduced={reduced} />
            </h1>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
