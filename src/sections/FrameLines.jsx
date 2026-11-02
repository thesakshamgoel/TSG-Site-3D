import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './FrameLines.css'

/**
 * Frame lines: recent stills on a cinematographer's monitor, each shown
 * through one of the aspect ratios cinema uses most. As you scroll, the matte
 * bars glide from one format to the next, the gold frame-line corners track
 * the picture area, and the stills cross-dissolve. Transforms and opacity only.
 */
const BASE = 16 / 9
const FORMATS = [
  { r: 1.33, label: '1.33 : 1', name: 'Academy' },
  { r: 1.66, label: '1.66 : 1', name: 'European widescreen' },
  { r: 1.85, label: '1.85 : 1', name: 'Flat' },
  { r: 2.0, label: '2.00 : 1', name: 'Univisium' },
  { r: 2.39, label: '2.39 : 1', name: 'Scope' },
]
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }

function Still({ s, i, cursor, onOpen, reduced }) {
  const o = useTransform(cursor, (c) => 1 - smooth(0.25, 0.75, Math.abs(c - i)))
  const sc = useTransform(cursor, (c) => 1.08 - 0.08 * clamp01(1 - (c - i + 0.5)))
  return (
    <motion.button
      type="button"
      className="fl__still"
      style={reduced ? undefined : { opacity: o, scale: sc }}
      onClick={() => onOpen({ title: s.title, image: s.image, mediaType: 'image' })}
      aria-label={`View ${s.title}`}
      tabIndex={-1}
    >
      <img src={s.image} alt={s.title} loading="lazy" decoding="async" draggable="false" />
    </motion.button>
  )
}

export default function FrameLines({ stills = [], onOpenImage }) {
  const frames = stills.slice(0, FORMATS.length)
  const n = frames.length
  const ref = useRef(null)
  const boxRef = useRef(null)
  const reduced = useReducedMotion()
  const boxW = useMotionValue(0)
  const boxH = useMotionValue(0)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => { boxW.set(el.offsetWidth); boxH.set(el.offsetHeight) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [boxW, boxH])

  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  // ease into each format so it holds while you read it
  const cursor = useTransform(p, (v) => {
    const raw = v * (n - 1)
    const base = Math.min(n - 1, Math.floor(raw))
    return base >= n - 1 ? n - 1 : base + smooth(0.3, 0.7, raw - base)
  })
  useMotionValueEvent(cursor, 'change', (c) => setActive(Math.round(c)))

  // the current ratio, interpolated between neighbouring formats
  const ratio = useTransform(cursor, (c) => {
    const a = Math.floor(c), b = Math.min(n - 1, a + 1), f = c - a
    const ra = FORMATS[Math.max(0, a)]?.r ?? BASE, rb = FORMATS[b]?.r ?? ra
    return ra + (rb - ra) * f
  })
  // matte bars: letterbox (top/bottom) for wider than 16:9, pillarbox (sides) for narrower
  const letter = useTransform(ratio, (r) => (r > BASE ? 1 - BASE / r : 0))
  const pillar = useTransform(ratio, (r) => (r < BASE ? 1 - r / BASE : 0))
  // frame-line corners sit on the edge of the picture area
  const cx = useTransform([ratio, boxW], ([r, w]) => (w / 2) * (r < BASE ? r / BASE : 1))
  const cy = useTransform([ratio, boxH], ([r, h]) => (h / 2) * (r > BASE ? BASE / r : 1))
  const ncx = useTransform(cx, (v) => -v)
  const ncy = useTransform(cy, (v) => -v)

  const headO = useTransform(p, [0, 0.12], [1, 0.35])

  if (!n) return null
  const f = FORMATS[active] || FORMATS[0]

  return (
    <section className="fl" id="frames" ref={ref} style={reduced ? undefined : { height: `${(n * 0.8 + 1) * 100}vh` }}>
      <div className="fl__pin">
        <motion.header className="fl__head" style={reduced ? undefined : { opacity: headO }}>
          <span className="slate">Stills</span>
          <h2 className="fl__title">Frame lines.</h2>
          <p className="fl__sub">Recent stills, shown through the five aspect ratios cinema uses most.</p>
        </motion.header>

        <div className="fl__monitor" ref={boxRef}>
          {frames.map((s, i) => (
            <Still key={s.id} s={s} i={i} cursor={cursor} onOpen={onOpenImage} reduced={reduced} />
          ))}
          {!reduced && (
            <>
              <motion.span className="fl__matte fl__matte--t" style={{ scaleY: letter }} />
              <motion.span className="fl__matte fl__matte--b" style={{ scaleY: letter }} />
              <motion.span className="fl__matte fl__matte--l" style={{ scaleX: pillar }} />
              <motion.span className="fl__matte fl__matte--r" style={{ scaleX: pillar }} />
              <span className="fl__lines" aria-hidden="true">
                <motion.i className="fl__c fl__c--tl" style={{ x: ncx, y: ncy }} />
                <motion.i className="fl__c fl__c--tr" style={{ x: cx, y: ncy }} />
                <motion.i className="fl__c fl__c--bl" style={{ x: ncx, y: cy }} />
                <motion.i className="fl__c fl__c--br" style={{ x: cx, y: cy }} />
                <i className="fl__cross" />
              </span>
            </>
          )}
        </div>

        <div className="fl__readout" aria-live="polite">
          <div className="fl__ratio">{f.label}</div>
          <div className="fl__name">{f.name}</div>
        </div>
        <ol className="fl__steps" aria-hidden="true">
          {FORMATS.slice(0, n).map((x, i) => (
            <li key={x.label} className={i === active ? 'is-on' : ''}>{x.label.replace(' : 1', '')}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}
