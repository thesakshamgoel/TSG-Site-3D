import { useEffect, useMemo, useRef, useState } from 'react'
import StarTunnel from './StarTunnel'
import { VIEWBOX, WHEEL_CENTER, LOOP, DOTS, TICKS, BRUSH } from './logoArt'
import './Loader.css'

/**
 * Intro, in two acts that run as one shot.
 *
 * Load: the mark floats in the star tunnel as a layered 3D object (loop at the
 * back, colour wheel and brush in front of it), tilting in depth while its
 * colour wheel spins up like a reel. Film frames ride a ring toward the camera.
 *
 * Hand-off: at 100% the mark flies to the exact spot of the hero logo,
 * flattens its layers, and slows its wheel so it lands at the same angle and
 * speed as the hero logo's own turning wheel. The stars slow to the hero's
 * cruising speed, the film-strip gate parts and the black lifts, so the hero
 * builds in around a logo that never cut. Then the hero logo takes over.
 *
 * One rAF loop writes every transform directly (no React re-render per frame).
 */
const DURATION = 1600
const FLIGHT = 1150
const RING = 14
const GAP = 520
const HERO_WHEEL_DEG_PER_MS = 360 / 24000 // matches .logomark__wheel (24s per turn)
const HERO_WHEEL_DELAY = 2000

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const span = (a, b, x) => clamp01((x - a) / (b - a))
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

// where the hero's wheel will be pointing `ahead` ms from now
function heroWheelAngle(ahead) {
  const el = document.querySelector('.hero__logo .logomark__wheel')
  const anim = el?.getAnimations?.()[0]
  if (!anim || anim.currentTime == null) return 0
  const t = Math.max(0, Number(anim.currentTime) + ahead - HERO_WHEEL_DELAY)
  return (t * HERO_WHEEL_DEG_PER_MS) % 360
}

export default function Loader({ onReveal, onDone, name = 'Saksham Goel', thumbs: thumbsProp = [] }) {
  // take the frames once: content arriving mid-load must not rebuild the ring
  const [thumbs] = useState(thumbsProp)
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const rootRef = useRef(null)
  const countRef = useRef(null)
  const hudRef = useRef(null)
  const ringRef = useRef(null)
  const starsRef = useRef(null)
  const stripTopRef = useRef(null)
  const stripBotRef = useRef(null)
  const vignetteRef = useRef(null)
  const markRef = useRef(null)
  const rigRef = useRef(null)
  const layerRefs = useRef([])
  const wheelRef = useRef(null)
  const frameRefs = useRef([])
  const starSpeed = useRef(0.0006)
  const cb = useRef({ onReveal, onDone })
  cb.current = { onReveal, onDone }

  const ring = useMemo(() => {
    const pics = thumbs.filter(Boolean)
    if (!pics.length) return []
    return Array.from({ length: RING }, (_, i) => ({
      src: pics[i % pics.length],
      a: (i / RING) * Math.PI * 2 * 2.3,
      z0: -i * GAP,
    }))
  }, [thumbs])

  useEffect(() => {
    let raf, last = null, first = null, smoothRun = 0, ready = false
    let elapsed = 0, flightStart = null, flight = null
    let wheel = 0, wheelVel = 0 // deg, deg per ms
    const travel = RING * GAP + 1400
    const depth = [0, 42, 78] // loop, wheel, brush: px toward the viewer

    const step = (ts) => {
      raf = requestAnimationFrame(step)
      const raw = last == null ? 0 : ts - last
      last = ts
      if (first == null) first = ts
      // wait for the site's boot to settle (a few smooth frames, max 1.2s) so
      // the reel starts once and then runs uninterrupted
      if (!ready) {
        smoothRun = raw > 0 && raw < 24 ? smoothRun + 1 : 0
        if (smoothRun >= 6 || ts - first > 1200) ready = true
        return
      }
      const dt = Math.min(raw, 1000 / 50)
      const W = window.innerWidth, H = window.innerHeight
      const mark = markRef.current, rig = rigRef.current
      const mw = mark.offsetWidth, mh = mark.offsetHeight

      if (flightStart == null) {
        /* ---------- act one: loading ---------- */
        elapsed += dt
        const t = Math.min(elapsed / DURATION, 1)
        const e = easeInOut(t)
        if (countRef.current) countRef.current.textContent = String(Math.round(e * 100)).padStart(3, '0')
        starSpeed.current = 0.003 + e * e * 0.05

        wheelVel = reduced ? 0 : 0.05 + e * e * 0.9 // spins up like a reel
        wheel = (wheel + wheelVel * dt) % 360
        const s = 1.18 + e * 0.12
        mark.style.transform = `translate3d(${(W - mw) / 2}px, ${(H - mh) / 2 - H * 0.04}px, 0) scale(${s.toFixed(4)})`
        mark.style.opacity = Math.min(1, 0.2 + e * 1.6).toFixed(3)
        const ry = reduced ? 0 : Math.sin(elapsed / 520) * 32 * (1 - e * 0.35)
        const rx = reduced ? 0 : 12 + Math.cos(elapsed / 700) * 8
        rig.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`
        layerRefs.current.forEach((l, i) => l && (l.style.transform = `translateZ(${reduced ? 0 : depth[i]}px)`))

        const R = Math.min(W, H) * 0.42
        ring.forEach((f, i) => {
          const el = frameRefs.current[i]
          if (!el) return
          const z = f.z0 + e * travel - 400
          const x = Math.cos(f.a + e * 1.2) * R
          const y = Math.sin(f.a + e * 1.2) * R * 0.62
          const inn = clamp01((z + 6200) / 2000)
          const out = 1 - clamp01((z - 300) / 300)
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${Math.min(z, 640).toFixed(1)}px)`
          el.style.opacity = (inn * out).toFixed(3)
          el.style.visibility = z > 620 ? 'hidden' : 'visible'
        })

        if (t >= 1) {
          // freeze the start of the flight from wherever everything is right now
          flightStart = ts
          flight = {
            x: (W - mw) / 2, y: (H - mh) / 2 - H * 0.04, s, ry, rx,
            a0: wheel, v0: wheelVel,
          }
          const dur = reduced ? 1 : FLIGHT
          // land on the hero wheel's angle at landing time, turning at its speed
          let aT = heroWheelAngle(dur)
          const vEnd = reduced ? 0 : HERO_WHEEL_DEG_PER_MS
          const travelDeg = ((flight.v0 + vEnd) / 2) * dur
          while (aT < flight.a0 + travelDeg - 180) aT += 360
          flight.aT = aT; flight.vEnd = vEnd; flight.dur = dur
          rootRef.current.style.pointerEvents = 'none'
          cb.current.onReveal?.()
        }
        wheelRef.current?.setAttribute('transform', `rotate(${wheel.toFixed(2)} ${WHEEL_CENTER.x} ${WHEEL_CENTER.y})`)
        return
      }

      /* ---------- act two: hand-off to the hero ---------- */
      const u = clamp01((ts - flightStart) / flight.dur)
      const e = easeInOut(u)
      const flat = easeOut(span(0, 0.85, u))

      // the hero logo is laid out under us: re-measure every frame so the
      // landing is exact even if the page shifts mid-flight
      const target = document.querySelector('.hero__logo')?.getBoundingClientRect()
      let tx = flight.x, ty = flight.y, ts2 = flight.s
      if (target && target.width) {
        ts2 = target.width / mw
        tx = target.left - (mw - mw * ts2) / 2
        ty = target.top - (mh - mh * ts2) / 2
      }
      const x = flight.x + (tx - flight.x) * e
      const y = flight.y + (ty - flight.y) * e
      const sc = flight.s + (ts2 - flight.s) * e
      mark.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${sc.toFixed(4)})`
      rig.style.transform = `rotateX(${(flight.rx * (1 - flat)).toFixed(2)}deg) rotateY(${(flight.ry * (1 - flat)).toFixed(2)}deg)`
      layerRefs.current.forEach((l, i) => l && (l.style.transform = `translateZ(${(depth[i] * (1 - flat)).toFixed(2)}px)`))

      // wheel: cubic Hermite from (angle, speed) now to (hero angle, hero speed) at landing
      const T = flight.dur, h = u
      const h00 = 2 * h ** 3 - 3 * h ** 2 + 1, h10 = h ** 3 - 2 * h ** 2 + h, h01 = -2 * h ** 3 + 3 * h ** 2, h11 = h ** 3 - h ** 2
      const ang = h00 * flight.a0 + h10 * flight.v0 * T + h01 * flight.aT + h11 * flight.vEnd * T
      wheelRef.current?.setAttribute('transform', `rotate(${ang.toFixed(2)} ${WHEEL_CENTER.x} ${WHEEL_CENTER.y})`)

      // the world around it settles into the hero
      starSpeed.current = 0.053 + (0.0025 - 0.053) * easeOut(span(0, 0.7, u))
      const lift = span(0.12, 0.72, u)
      rootRef.current.style.backgroundColor = `rgba(6, 5, 7, ${(1 - easeInOut(lift)).toFixed(3)})`
      if (starsRef.current) starsRef.current.style.opacity = (1 - span(0.35, 0.95, u)).toFixed(3)
      if (vignetteRef.current) vignetteRef.current.style.opacity = (1 - lift).toFixed(3)
      if (ringRef.current) ringRef.current.style.opacity = (1 - span(0, 0.4, u)).toFixed(3)
      if (hudRef.current) {
        hudRef.current.style.opacity = (1 - span(0, 0.22, u)).toFixed(3)
        hudRef.current.style.transform = `translateY(${(span(0, 0.3, u) * 16).toFixed(1)}px)`
      }
      const g = easeInOut(span(0, 0.6, u))
      if (stripTopRef.current) stripTopRef.current.style.transform = `translateY(${(-g * 100).toFixed(2)}%)`
      if (stripBotRef.current) stripBotRef.current.style.transform = `translateY(${(g * 100).toFixed(2)}%)`

      if (u >= 1) {
        cancelAnimationFrame(raf)
        cb.current.onDone?.()
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [ring, reduced])

  return (
    <div className="loader" ref={rootRef} aria-hidden="true">
      <div className="loader__canvas">
        <div className="loader__fade" ref={starsRef}>
          <StarTunnel className="loader__stars" speed={() => starSpeed.current} />
        </div>
        <div className="loader__ring" ref={ringRef}>
          {ring.map((f, i) => (
            <div key={i} className="loader__frame" ref={(el) => (frameRefs.current[i] = el)}>
              <img src={f.src} alt="" decoding="async" />
            </div>
          ))}
        </div>
      </div>

      <div className="loader__vignette" ref={vignetteRef} />

      {/* film-strip gate */}
      <div className="loader__strip loader__strip--top" ref={stripTopRef} />
      <div className="loader__strip loader__strip--bottom" ref={stripBotRef} />

      <div className="loader__hud" ref={hudRef}>
        <div className="loader__count">
          <span ref={countRef}>000</span>
          <span className="loader__pct">%</span>
        </div>
        <div className="loader__meta">
          <span className="loader__name">{name}</span>
          <span className="loader__role timecode">CINEMATOGRAPHER · COLORIST · DESIGNER</span>
        </div>
      </div>

      {/* the mark: three depth layers that flatten into the hero logo */}
      <div className="lmark" ref={markRef} style={{ opacity: 0 }}>
        <div className="lmark__rig" ref={rigRef}>
          <svg className="lmark__layer" viewBox={VIEWBOX} ref={(el) => (layerRefs.current[0] = el)}>
            <path d={LOOP} fill="#cccccc" stroke="#ffffff" strokeWidth="0.2" />
          </svg>
          <svg className="lmark__layer" viewBox={VIEWBOX} ref={(el) => (layerRefs.current[1] = el)}>
            <g ref={wheelRef}>
              {DOTS.map((d) => <path key={d.fill} fill={d.fill} d={d.d} />)}
              {TICKS.map((d, i) => <path key={i} fill="#b3b3b3" d={d} />)}
              <rect fill="#b3b3b3" x="675.5" y="480.5" width="4.9" height="42" rx="2.5" />
              <rect fill="#b3b3b3" x="675.5" y="480.5" width="4.9" height="42" rx="2.5" transform="translate(1179.5 -176.5) rotate(90)" />
            </g>
          </svg>
          <svg className="lmark__layer" viewBox={VIEWBOX} ref={(el) => (layerRefs.current[2] = el)}>
            {BRUSH.map((b) => <path key={b.fill} fill={b.fill} d={b.d} />)}
          </svg>
        </div>
      </div>
    </div>
  )
}
