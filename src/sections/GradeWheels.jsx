import { useEffect, useRef, useState } from 'react'
import { useScroll } from 'framer-motion'
import './GradeWheels.css'

/**
 * The grade. Scroll drives real lift / gamma / gain on the ungraded plate,
 * the wheels move by themselves, then the frame dissolves into the actual
 * final grade. After that the visitor can grab a wheel and grade it.
 * WebGL with an <img> crossfade fallback.
 */
const KEYS = [
  { p: 0.06, lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], con: 1, sat: 1, mix: 0 },
  { p: 0.28, lift: [-0.035, 0, 0.05], gamma: [1, 1, 1], gain: [1, 1, 1], con: 1.04, sat: 0.98, mix: 0 },
  { p: 0.46, lift: [-0.035, 0, 0.05], gamma: [1.04, 1, 0.95], gain: [1.12, 1.02, 0.88], con: 1.06, sat: 1.04, mix: 0 },
  { p: 0.62, lift: [-0.04, 0, 0.055], gamma: [1.05, 1, 0.95], gain: [1.14, 1.02, 0.86], con: 1.32, sat: 1.22, mix: 0 },
  { p: 0.78, lift: [-0.04, 0, 0.055], gamma: [1.05, 1, 0.95], gain: [1.14, 1.02, 0.86], con: 1.32, sat: 1.22, mix: 1 },
]
const STEPS = [
  [0, 0.2, 'Log.', 'Flat, honest, exactly what the sensor saw.'],
  [0.2, 0.38, 'Lift.', 'The shadows sink into teal.'],
  [0.38, 0.54, 'Gain.', 'Skin and tungsten warm up.'],
  [0.54, 0.7, 'Contrast.', 'The night comes back.'],
]
const WHEELS = ['lift', 'gamma', 'gain']
const WSCALE = 0.09
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x) }
const lerp = (a, b, t) => a + (b - a) * t
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
function gradeAt(p) {
  if (p <= KEYS[0].p) return KEYS[0]
  for (let i = 1; i < KEYS.length; i++) {
    if (p <= KEYS[i].p) {
      const A = KEYS[i - 1], B = KEYS[i], t = smooth((p - A.p) / (B.p - A.p))
      return { lift: mix3(A.lift, B.lift, t), gamma: mix3(A.gamma, B.gamma, t), gain: mix3(A.gain, B.gain, t),
        con: lerp(A.con, B.con, t), sat: lerp(A.sat, B.sat, t), mix: lerp(A.mix, B.mix, t) }
    }
  }
  return KEYS[KEYS.length - 1]
}
const toXY = (d) => { const m = (d[0] + d[1] + d[2]) / 3; const r = d[0] - m, g = d[1] - m, b = d[2] - m; return [r - 0.5 * (g + b), 0.866 * (g - b)] }
const fromXY = (x, y) => [(2 * x) / 3, -x / 3 + y / Math.sqrt(3), -x / 3 - y / Math.sqrt(3)]
const stepOpacity = (p, a, b, i) => {
  const r = 0.03
  const inn = i === 0 ? 1 : smooth((p - a) / r)
  return inn * (1 - smooth((p - (b - r)) / r))
}

const VS = 'attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}'
const FS = [
  'precision mediump float;varying vec2 v;',
  'uniform sampler2D uA,uB;uniform vec2 uRes;uniform float uImg,uSat,uCon,uMix,uHold;',
  'uniform vec3 uLift,uGamma,uGain;',
  'vec2 cover(vec2 p){float rs=uRes.x/uRes.y;vec2 s=rs>uImg?vec2(1.,uImg/rs):vec2(rs/uImg,1.);return (p-.5)*s+.5;}',
  'void main(){vec2 uv=cover(v);uv.y=1.-uv.y;',
  'vec3 raw=texture2D(uA,uv).rgb;vec3 c=raw*uGain+uLift*(1.-raw);',
  'c=pow(max(c,0.),1./uGamma);c=(c-.45)*uCon+.45;',
  'float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,uSat);',
  'vec3 o=mix(clamp(c,0.,1.),texture2D(uB,uv).rgb,uMix);o=mix(o,raw,uHold);',
  'float vg=smoothstep(1.25,.35,length(v-.5)*1.4);gl_FragColor=vec4(o*mix(.82,1.,vg),1.);}',
].join('')

function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image()
    i.crossOrigin = 'anonymous'
    i.onload = () => res(i)
    i.onerror = rej
    i.src = src
  })
}

export default function GradeWheels({ comparisons }) {
  const pairs = (comparisons || []).filter((c) => c.before && c.after).slice(0, 6)
  const ref = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const stepRefs = useRef([])
  const finalRef = useRef(null)
  const wheelRefs = useRef({})
  const modeRef = useRef(null)
  const state = useRef({ p: 0, user: false, u: { lift: [0, 0, 0], gamma: [0, 0, 0], gain: [0, 0, 0] }, hold: 0, dirty: true })
  const glRef = useRef(null)
  const [scene, setScene] = useState(0)
  const [user, setUser] = useState(false)
  const [hasGL, setHasGL] = useState(false)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // ── GL setup ──
  useEffect(() => {
    const canvas = canvasRef.current
    let gl = null
    try { gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false }) } catch { gl = null }
    if (!gl) return
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o }
    const prog = gl.createProgram()
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aLoc = gl.getAttribLocation(prog, 'a')
    gl.enableVertexAttribArray(aLoc)
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0)
    const loc = {}
    ;['uA', 'uB', 'uRes', 'uImg', 'uSat', 'uCon', 'uMix', 'uHold', 'uLift', 'uGamma', 'uGain'].forEach((n) => (loc[n] = gl.getUniformLocation(prog, n)))
    gl.uniform1i(loc.uA, 0)
    gl.uniform1i(loc.uB, 1)
    glRef.current = { gl, loc, texA: gl.createTexture(), texB: gl.createTexture(), ready: false, aspect: 16 / 9 }
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      // size to the canvas box, not the window: on phones the frame is a
      // 16:9 band, not the full portrait screen
      canvas.width = Math.round((canvas.clientWidth || window.innerWidth) * dpr)
      canvas.height = Math.round((canvas.clientHeight || window.innerHeight) * dpr)
      state.current.dirty = true
    }
    size()
    window.addEventListener('resize', size)
    const ro = window.ResizeObserver ? new ResizeObserver(size) : null
    ro?.observe(canvas)
    return () => {
      window.removeEventListener('resize', size)
      ro?.disconnect()
    }
  }, [])

  // ── load the chosen pair ──
  useEffect(() => {
    const G = glRef.current
    const pair = pairs[scene]
    if (!G || !pair) return
    let live = true
    Promise.all([loadImg(pair.before), loadImg(pair.after)]).then(([a, b]) => {
      if (!live) return
      const { gl } = G
      ;[[G.texA, 0, a], [G.texB, 1, b]].forEach(([tex, unit, img]) => {
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
      })
      G.aspect = a.naturalWidth / a.naturalHeight
      G.ready = true
      setHasGL(true)
      state.current.dirty = true
    }).catch(() => {})
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, pairs.length])

  // ── render loop: only draws when progress or input changed ──
  useEffect(() => {
    const S = state.current
    const unsub = scrollYProgress.on('change', (v) => { S.p = v; S.dirty = true })
    S.p = scrollYProgress.get()
    let raf
    const effective = () => {
      if (!S.user) return gradeAt(S.p)
      const b = KEYS[3]
      const add = (a, u) => [a[0] + u[0], a[1] + u[1], a[2] + u[2]]
      return { lift: add(b.lift, S.u.lift), gamma: add(b.gamma, S.u.gamma), gain: add(b.gain, S.u.gain), con: b.con, sat: b.sat, mix: 0 }
    }
    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (!S.dirty) return
      S.dirty = false
      const s = effective()
      // copy
      STEPS.forEach((st, i) => { const n = stepRefs.current[i]; if (n) n.style.opacity = S.user ? 0 : stepOpacity(S.p, st[0], st[1], i) })
      if (finalRef.current) {
        const o = S.user ? 1 : smooth((S.p - 0.7) / 0.05)
        finalRef.current.style.opacity = o
        finalRef.current.style.transform = `translateY(${(1 - o) * 20}px)`
      }
      // wheels
      WHEELS.forEach((w) => {
        const W = wheelRefs.current[w]
        if (!W) return
        const v = s[w], d = w === 'lift' ? v : [v[0] - 1, v[1] - 1, v[2] - 1]
        const xy = toXY(d), R = (W.ring.clientWidth / 2) * 0.86
        let px = (xy[0] / WSCALE) * R, py = (-xy[1] / WSCALE) * R
        const len = Math.hypot(px, py)
        if (len > R) { px *= R / len; py *= R / len }
        W.puck.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`
        W.vals.forEach((n, k) => { if (n) n.textContent = (w === 'lift' && v[k] > 0 ? '+' : '') + v[k].toFixed(3) })
      })
      if (modeRef.current) {
        modeRef.current.textContent = S.user ? 'Your grade' : s.mix >= 0.999 ? 'Final grade' : s.mix > 0.001 ? 'Dissolving to the final grade' : 'Scroll is grading'
      }
      stageRef.current?.style.setProperty('--mix', S.hold ? 0 : s.mix.toFixed(3))
      const G = glRef.current
      if (!G || !G.ready) return
      const { gl, loc } = G
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
      gl.uniform2f(loc.uRes, gl.canvas.width, gl.canvas.height)
      gl.uniform1f(loc.uImg, G.aspect)
      gl.uniform3fv(loc.uLift, s.lift)
      gl.uniform3fv(loc.uGamma, s.gamma)
      gl.uniform3fv(loc.uGain, s.gain)
      gl.uniform1f(loc.uCon, s.con)
      gl.uniform1f(loc.uSat, s.sat)
      gl.uniform1f(loc.uMix, s.mix)
      gl.uniform1f(loc.uHold, S.hold)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); unsub() }
  }, [scrollYProgress])

  // ── wheel input ──
  const goUser = () => { if (!state.current.user) { state.current.user = true; setUser(true) } }
  const dragAt = (w, e, ring) => {
    const r = ring.getBoundingClientRect(), R = (r.width / 2) * 0.86
    let x = (e.clientX - r.left - r.width / 2) / R, y = -(e.clientY - r.top - r.height / 2) / R
    const len = Math.hypot(x, y)
    if (len > 1) { x /= len; y /= len }
    const base = KEYS[3][w], bd = w === 'lift' ? base : [base[0] - 1, base[1] - 1, base[2] - 1]
    const bxy = toXY(bd), want = fromXY(x * WSCALE, y * WSCALE), have = fromXY(bxy[0], bxy[1])
    state.current.u[w] = [want[0] - have[0], want[1] - have[1], want[2] - have[2]]
    state.current.dirty = true
  }
  const onWheelDown = (w) => (e) => {
    e.preventDefault()
    const ring = e.currentTarget
    goUser()
    dragAt(w, e, ring)
    const move = (ev) => dragAt(w, ev, ring)
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const onWheelKey = (w) => (e) => {
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]
    if (!k) return
    e.preventDefault()
    goUser()
    const d = fromXY(k[0] * 0.006, k[1] * 0.006), u = state.current.u[w]
    state.current.u[w] = [u[0] + d[0], u[1] + d[1], u[2] + d[2]]
    state.current.dirty = true
  }
  const reset = () => {
    state.current.user = false
    state.current.u = { lift: [0, 0, 0], gamma: [0, 0, 0], gain: [0, 0, 0] }
    state.current.dirty = true
    setUser(false)
  }
  const hold = (v) => () => { state.current.hold = v; state.current.dirty = true }

  if (!pairs.length) return null
  const pair = pairs[scene]

  return (
    <section className="gw" id="grade" ref={ref}>
      <div data-opaque className={`gw__stage ${hasGL ? 'has-gl' : ''} ${user ? 'is-user' : ''}`} ref={stageRef}>
        <div className="gw__frame">
        <div className="gw__fallback" aria-hidden="true">
          <img src={pair.before} alt="" />
          <img className="gw__fb-out" src={pair.after} alt="" />
        </div>
        <canvas className="gw__gl" ref={canvasRef} aria-hidden="true" />
        </div>
        <div className="gw__scrim" aria-hidden="true" />

        <div className="gw__copy">
          {STEPS.map((s, i) => (
            <p key={s[2]} className="gw__step" ref={(n) => (stepRefs.current[i] = n)} style={{ opacity: i === 0 ? 1 : 0 }}>
              <b>{s[2]}</b> {s[3]}
            </p>
          ))}
          <div className="gw__final" ref={finalRef} style={{ opacity: 0 }}>
            <h2 className="gw__h">{pair.title}, <em>graded.</em></h2>
            <p className="gw__note">Saksham's final grade. Now take a wheel and make it yours.</p>
          </div>
        </div>

        <div className="gw__panel" role="group" aria-label="Colour wheels">
          <div className="gw__wheels">
            {WHEELS.map((w) => (
              <div className="wheel" key={w}>
                <div
                  className="wheel__ring"
                  tabIndex={0}
                  role="slider"
                  aria-label={`${w} wheel. Arrow keys move the colour balance.`}
                  onPointerDown={onWheelDown(w)}
                  onKeyDown={onWheelKey(w)}
                  ref={(n) => { if (n) wheelRefs.current[w] = { ring: n, puck: n.firstChild, vals: wheelRefs.current[w]?.vals || [] } }}
                >
                  <span className="wheel__puck" />
                </div>
                <p className="wheel__name">{w}</p>
                <p className="wheel__val">
                  {[0, 1, 2].map((k) => (
                    <span key={k} ref={(n) => { wheelRefs.current[w] = { ...(wheelRefs.current[w] || {}), vals: Object.assign(wheelRefs.current[w]?.vals || [], { [k]: n }) } }}>
                      {w === 'lift' ? '0.000' : '1.000'}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
          <div className="gw__tools">
            <p className="gw__mode"><span className="gw__dot" /><span ref={modeRef}>Scroll is grading</span></p>
            <button type="button" className="gw__chip" onPointerDown={hold(1)} onPointerUp={hold(0)} onPointerLeave={hold(0)}
              onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && hold(1)()} onKeyUp={hold(0)} onBlur={hold(0)}>
              Hold to see raw
            </button>
            {user && <button type="button" className="gw__chip" onClick={reset}>Back to his grade</button>}
          </div>
          <div className="gw__scenes" role="radiogroup" aria-label="Choose a scene">
            {pairs.map((c, i) => (
              <button
                key={c.id || i}
                type="button"
                role="radio"
                aria-checked={i === scene}
                aria-label={c.title}
                style={{ backgroundImage: `url(${c.after})` }}
                onClick={() => setScene(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
