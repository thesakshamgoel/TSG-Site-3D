import { useEffect, useRef, useState } from 'react'
import { useScroll } from 'framer-motion'
import './GradeWheels.css'

/**
 * The grade, six at once. The screen is cut into diagonal slats, one scene
 * each. Scroll drives real lift / gamma / gain on every raw plate in a wave
 * from left to right, then each dissolves into its actual final grade.
 * Hovering (or tapping) a slat opens it so the whole frame reads; when the
 * visitor rests on the finished grade the slats take turns opening by
 * themselves. The wheels grade all six together once grabbed.
 * One WebGL shader; before/after frames are packed into two texture atlases.
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
const MAX = 6
const WAVE = 0.035 // grade delay between neighbouring slats, in scroll progress
const TILT = 0.12 // slat lean, as a fraction of the width across the full height
const OPEN_SHARE = 0.8 // width an opened slat takes
const TOUR_MS = 2600 // each slat's turn during the auto tour
const REDUCED = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const FINE = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

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
const FS = `
precision mediump float;
varying vec2 v;
uniform sampler2D uA, uB;
uniform vec2 uRes;
uniform float uImg, uTilt, uHold, uFocus;
// packed tightly: some phones only allow 64 fragment uniform vectors
uniform vec4 uE0, uE1;               // slat edges 0..6
uniform vec3 uLift[6], uGamma[6], uGain[6];
uniform vec3 uCSM[6];                // contrast, saturation, mix per slat
float edge(int k) {
  if (k == 0) return uE0.x; if (k == 1) return uE0.y; if (k == 2) return uE0.z; if (k == 3) return uE0.w;
  if (k == 4) return uE1.x; if (k == 5) return uE1.y; return uE1.z;
}
void main() {
  float xs = v.x - (v.y - 0.5) * uTilt;          // position across the diagonal slats
  float idx = 0.0, e0 = 0.0, e1 = 1.0;
  vec3 lift = vec3(0.0), gam = vec3(1.0), gain = vec3(1.0);
  float con = 1.0, sat = 1.0, mx = 0.0;
  for (int k = 0; k < 6; k++) {
    float a = edge(k), b = edge(k + 1);
    if (xs >= a && xs < b) {
      idx = float(k); e0 = a; e1 = b;
      lift = uLift[k]; gam = uGamma[k]; gain = uGain[k];
      vec3 csm = uCSM[k]; con = csm.x; sat = csm.y; mx = csm.z;
    }
  }
  // each scene is cover-fitted to the whole box and centred under its slat,
  // so an opened slat shows (nearly) the full frame, undistorted
  float c = (e0 + e1) * 0.5;
  vec2 p = vec2(v.x - c + 0.5, v.y);
  float rs = uRes.x / uRes.y;
  vec2 s = rs > uImg ? vec2(1.0, uImg / rs) : vec2(rs / uImg, 1.0);
  vec2 q = (p - 0.5) * s + 0.5;
  q.y = 1.0 - q.y;
  q = clamp(q, 0.003, 0.997);
  float col = mod(idx, 2.0), row = floor(idx / 2.0);
  vec2 at = (vec2(col, row) + q) / vec2(2.0, 3.0);
  vec3 raw = texture2D(uA, at).rgb;
  vec3 g = raw * gain + lift * (1.0 - raw);
  g = pow(max(g, 0.0), 1.0 / gam);
  g = (g - 0.45) * con + 0.45;
  float l = dot(g, vec3(0.2126, 0.7152, 0.0722));
  g = mix(vec3(l), g, sat);
  vec3 o = mix(clamp(g, 0.0, 1.0), texture2D(uB, at).rgb, mx);
  o = mix(o, raw, uHold);
  // dark seams between slats, and the closed slats sit slightly back
  float px = 1.0 / uRes.x;
  float seam = smoothstep(0.0, 2.5 * px, min(xs - e0, e1 - xs));
  float closed = uFocus < 0.0 ? 1.0 : (abs(idx - uFocus) < 0.5 ? 1.0 : 0.72);
  float vg = smoothstep(1.25, 0.35, length(v - 0.5) * 1.4);
  gl_FragColor = vec4(o * seam * closed * mix(0.82, 1.0, vg), 1.0);
}`

function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image()
    i.crossOrigin = 'anonymous'
    i.decoding = 'async'
    i.onload = () => res(i)
    i.onerror = rej
    i.src = src
  })
}
// pack up to six frames into a 2 x 3 atlas, each cover-cropped to 16:9
function atlas(imgs, cw, ch) {
  const c = document.createElement('canvas')
  c.width = cw * 2
  c.height = ch * 3
  const g = c.getContext('2d')
  g.fillStyle = '#000'
  g.fillRect(0, 0, c.width, c.height)
  imgs.forEach((im, k) => {
    if (!im) return
    const col = k % 2, row = Math.floor(k / 2)
    const ir = im.naturalWidth / im.naturalHeight, cr = cw / ch
    let sw = im.naturalWidth, sh = im.naturalHeight, sx = 0, sy = 0
    if (ir > cr) { sw = sh * cr; sx = (im.naturalWidth - sw) / 2 } else { sh = sw / cr; sy = (im.naturalHeight - sh) / 2 }
    g.drawImage(im, sx, sy, sw, sh, col * cw, row * ch, cw, ch)
  })
  return c
}

export default function GradeWheels({ comparisons, onOpenImage }) {
  const pairs = (comparisons || []).filter((c) => c.before && c.after).slice(0, MAX)
  const n = pairs.length
  const ref = useRef(null)
  const stageRef = useRef(null)
  const frameRef = useRef(null)
  const canvasRef = useRef(null)
  const stepRefs = useRef([])
  const finalRef = useRef(null)
  const wheelRefs = useRef({})
  const modeRef = useRef(null)
  const labelRefs = useRef([])
  const state = useRef({
    p: 0, user: false, u: { lift: [0, 0, 0], gamma: [0, 0, 0], gain: [0, 0, 0] }, hold: 0, dirty: true,
    inView: false, last: null, hover: -1, tap: -1, tour: -1, tourT0: 0,
    w: Array(MAX).fill(1), edges: [],
  })
  const glRef = useRef(null)
  const [user, setUser] = useState(false)
  const [hasGL, setHasGL] = useState(false)
  const [focus, setFocus] = useState(-1)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // ── GL setup + atlases ──
  useEffect(() => {
    const canvas = canvasRef.current
    let gl = null
    try { gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false }) } catch { gl = null }
    if (!gl || !n) return
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
    const names = ['uA', 'uB', 'uRes', 'uImg', 'uTilt', 'uHold', 'uFocus', 'uE0', 'uE1', 'uLift', 'uGamma', 'uGain', 'uCSM']
    const loc = {}
    names.forEach((nm) => (loc[nm] = gl.getUniformLocation(prog, nm) || gl.getUniformLocation(prog, nm + '[0]')))
    gl.uniform1i(loc.uA, 0)
    gl.uniform1i(loc.uB, 1)
    const G = { gl, loc, texA: gl.createTexture(), texB: gl.createTexture(), ready: false }
    glRef.current = G
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round((canvas.clientWidth || window.innerWidth) * dpr)
      canvas.height = Math.round((canvas.clientHeight || window.innerHeight) * dpr)
      state.current.dirty = true
    }
    size()
    window.addEventListener('resize', size)
    const ro = window.ResizeObserver ? new ResizeObserver(size) : null
    ro?.observe(canvas)

    // phones get a smaller atlas: the frame band there is only ~400px wide
    const small = window.matchMedia('(max-width: 720px)').matches
    const cw = small ? 1024 : 1600, ch = Math.round((cw * 9) / 16)
    let live = true
    Promise.all(pairs.map((pr) => Promise.all([loadImg(pr.before).catch(() => null), loadImg(pr.after).catch(() => null)]))).then((res) => {
      if (!live) return
      const up = (tex, unit, src) => {
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src)
      }
      up(G.texA, 0, atlas(res.map((r) => r[0]), cw, ch))
      up(G.texB, 1, atlas(res.map((r) => r[1]), cw, ch))
      G.ready = true
      setHasGL(true)
      state.current.dirty = true
    })
    return () => {
      live = false
      window.removeEventListener('resize', size)
      ro?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n])

  useEffect(() => {
    const el = stageRef.current
    if (!el || !window.IntersectionObserver) { state.current.inView = true; return }
    const io = new IntersectionObserver(([e]) => { state.current.inView = e.isIntersecting; state.current.dirty = true }, { threshold: 0.6 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // ── render loop: draws only while something is changing ──
  useEffect(() => {
    const S = state.current
    const unsub = scrollYProgress.on('change', (v) => { S.p = v; S.dirty = true })
    S.p = scrollYProgress.get()
    let raf
    let lastFocus = -2
    let lastT = 0
    const slatGrade = (k) => {
      if (S.user) {
        const b = KEYS[3]
        const add = (a, u) => [a[0] + u[0], a[1] + u[1], a[2] + u[2]]
        return { lift: add(b.lift, S.u.lift), gamma: add(b.gamma, S.u.gamma), gain: add(b.gain, S.u.gain), con: b.con, sat: b.sat, mix: 0 }
      }
      // wave from left to right, finishing together at the end of the scroll
      return gradeAt(clamp01((S.p - k * WAVE) / (1 - (n - 1) * WAVE)))
    }
    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(64, lastT ? now - lastT : 16)
      lastT = now
      // frame-rate independent easing: same glide at 60 Hz and 120 Hz
      const ease = 1 - Math.pow(1 - 0.11, dt / 16.67)
      // which slat is open: hover > tap > auto tour
      const resting = !S.user && S.inView && S.p >= 0.8 && !document.hidden && !REDUCED && n > 1
      const manual = S.hover >= 0 ? S.hover : S.tap
      if (manual < 0 && resting) {
        if (S.tour < 0 || now - S.tourT0 > TOUR_MS) { S.tour = (S.tour + 1) % n; S.tourT0 = now }
      } else if (S.tour >= 0) S.tour = -1
      const f = manual >= 0 ? manual : S.tour
      if (f !== lastFocus) { lastFocus = f; setFocus(f); S.dirty = true }
      // slat widths ease toward their targets
      const big = f >= 0 ? (OPEN_SHARE * (n - 1)) / (1 - OPEN_SHARE) : 1
      let moving = false
      for (let k = 0; k < n; k++) {
        const target = f < 0 ? 1 : k === f ? big : 1
        const nw = lerp(S.w[k], target, ease)
        if (Math.abs(nw - target) > 0.002) moving = true
        S.w[k] = Math.abs(nw - target) > 0.002 ? nw : target
      }
      if (moving) S.dirty = true
      if (!S.dirty) return
      S.dirty = false

      // edges along the diagonal span past both sides so the slats fill the box
      const sum = S.w.slice(0, n).reduce((a, b) => a + b, 0)
      const lo = -TILT / 2, span = 1 + TILT
      const edges = [lo]
      for (let k = 0; k < n; k++) edges.push(edges[k] + (S.w[k] / sum) * span)
      while (edges.length < 7) edges.push(9)
      S.edges = edges

      const grades = Array.from({ length: MAX }, (_, k) => (k < n ? slatGrade(k) : KEYS[0]))
      const lead = grades[f >= 0 ? f : Math.min(2, n - 1)]
      S.last = lead
      const pe = S.p

      STEPS.forEach((st, i) => { const el = stepRefs.current[i]; if (el) el.style.opacity = S.user ? 0 : stepOpacity(pe, st[0], st[1], i) })
      if (finalRef.current) {
        const o = S.user ? 1 : smooth((pe - 0.72) / 0.05)
        finalRef.current.style.opacity = o
        finalRef.current.style.transform = `translateY(${(1 - o) * 20}px)`
      }
      // slat number tags ride on each slat's centre line
      const fw = frameRef.current?.clientWidth || window.innerWidth
      labelRefs.current.forEach((el, k) => {
        if (!el) return
        const c = (edges[k] + edges[k + 1]) / 2
        el.style.transform = `translateX(${(c * fw).toFixed(1)}px)`
        el.classList.toggle('is-on', k === f)
      })
      WHEELS.forEach((w) => {
        const W = wheelRefs.current[w]
        if (!W || !W.ring) return
        const v = lead[w], d = w === 'lift' ? v : [v[0] - 1, v[1] - 1, v[2] - 1]
        const xy = toXY(d), R = (W.ring.clientWidth / 2) * 0.86
        let px = (xy[0] / WSCALE) * R, py = (-xy[1] / WSCALE) * R
        const len = Math.hypot(px, py)
        if (len > R) { px *= R / len; py *= R / len }
        W.puck.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`
        ;(W.vals || []).forEach((el, k) => { if (el) el.textContent = (w === 'lift' && v[k] > 0 ? '+' : '') + v[k].toFixed(3) })
      })
      if (modeRef.current) {
        const t = S.user ? 'Your grade, on all six' : lead.mix >= 0.999 ? 'Final grades' : lead.mix > 0.001 ? 'Dissolving to the final grades' : 'Scroll is grading'
        if (modeRef.current.textContent !== t) modeRef.current.textContent = t
      }
      stageRef.current?.style.setProperty('--mix', S.hold ? 0 : lead.mix.toFixed(3))

      const G = glRef.current
      if (!G || !G.ready) return
      const { gl, loc } = G
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
      gl.uniform2f(loc.uRes, gl.canvas.width, gl.canvas.height)
      gl.uniform1f(loc.uImg, 16 / 9)
      gl.uniform1f(loc.uTilt, TILT)
      gl.uniform1f(loc.uHold, S.hold)
      gl.uniform1f(loc.uFocus, f)
      gl.uniform4f(loc.uE0, edges[0], edges[1], edges[2], edges[3])
      gl.uniform4f(loc.uE1, edges[4], edges[5], edges[6], 9)
      const flat3 = (key) => new Float32Array(grades.flatMap((g) => g[key]))
      gl.uniform3fv(loc.uLift, flat3('lift'))
      gl.uniform3fv(loc.uGamma, flat3('gamma'))
      gl.uniform3fv(loc.uGain, flat3('gain'))
      gl.uniform3fv(loc.uCSM, new Float32Array(grades.flatMap((g) => [g.con, g.sat, S.hold ? 0 : g.mix])))
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); unsub() }
  }, [scrollYProgress, n])

  // ── which slat the pointer picks ──
  // An even split of the width along the same diagonal, NOT the live slat
  // edges: when a slat opens its edges move under the pointer, which used to
  // flip the hover back and forth. This way sweeping across scrubs 1 to 6.
  const slatAt = (e) => {
    const r = frameRef.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height
    const xs = (x - (y - 0.5) * TILT + TILT / 2) / (1 + TILT)
    return Math.max(0, Math.min(n - 1, Math.floor(xs * n)))
  }
  const onMove = (e) => {
    if (!FINE || e.pointerType !== 'mouse') return
    const k = slatAt(e)
    if (k !== state.current.hover) { state.current.hover = k; state.current.dirty = true }
  }
  const onLeave = () => { state.current.hover = -1; state.current.dirty = true }
  const onTap = (e) => {
    const k = slatAt(e)
    if (e.pointerType === 'mouse') {
      // a click on the open slat shows that graded frame full size
      const pr = pairs[k]
      if (pr && onOpenImage) onOpenImage({ title: `${pr.title}, graded`, image: pr.after, mediaType: 'image' })
      return
    }
    state.current.tap = state.current.tap === k ? -1 : k
    state.current.dirty = true
  }

  // ── wheel input: only the puck is grabbable, relative drag, 6px threshold ──
  const goUser = () => { if (!state.current.user) { state.current.user = true; setUser(true) } }
  const setPuck = (w, x, y) => {
    const len = Math.hypot(x, y)
    if (len > 1) { x /= len; y /= len }
    const base = KEYS[3][w], bd = w === 'lift' ? base : [base[0] - 1, base[1] - 1, base[2] - 1]
    const bxy = toXY(bd), want = fromXY(x * WSCALE, y * WSCALE), have = fromXY(bxy[0], bxy[1])
    state.current.u[w] = [want[0] - have[0], want[1] - have[1], want[2] - have[2]]
    state.current.dirty = true
  }
  const onWheelDown = (w) => (e) => {
    if (!e.target.closest('.wheel__puck')) return
    e.preventDefault()
    const ring = e.currentTarget
    const R = (ring.getBoundingClientRect().width / 2) * 0.86
    const last = state.current.last
    const v = last ? last[w] : KEYS[0][w]
    const d = w === 'lift' ? v : [v[0] - 1, v[1] - 1, v[2] - 1]
    const xy = toXY(d)
    const sx = xy[0] / WSCALE, sy = xy[1] / WSCALE
    const x0 = e.clientX, y0 = e.clientY
    let dragging = false
    const move = (ev) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0
      if (!dragging) {
        if (Math.hypot(dx, dy) < 6) return
        dragging = true
        goUser()
      }
      setPuck(w, sx + dx / R, sy - dy / R)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
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

  if (!n) return null
  const focusPair = focus >= 0 ? pairs[focus] : null
  const countWord = ['', 'One scene', 'Two scenes', 'Three scenes', 'Four scenes', 'Five scenes', 'Six scenes'][n]

  return (
    <section className="gw seam-top seam-bottom" id="grade" ref={ref}>
      <div data-opaque className={`gw__stage ${hasGL ? 'has-gl' : ''} ${user ? 'is-user' : ''}`} ref={stageRef}>
        <div className="gw__frame" ref={frameRef} onPointerMove={onMove} onPointerLeave={onLeave} onPointerUp={onTap}>
          <div className="gw__fallback" aria-hidden="true">
            {pairs.map((pr, k) => (
              <div key={pr.id || k} className="gw__fslat">
                <img src={pr.before} alt="" loading="lazy" />
                <img className="gw__fb-out" src={pr.after} alt="" loading="lazy" />
              </div>
            ))}
          </div>
          <canvas className="gw__gl" ref={canvasRef} aria-hidden="true" />
          <div className="gw__tags" aria-hidden="true">
            {pairs.map((pr, k) => (
              <span key={pr.id || k} className="gw__tag" ref={(el) => (labelRefs.current[k] = el)}>
                {String(k + 1).padStart(2, '0')}
              </span>
            ))}
          </div>
        </div>
        <div className="gw__scrim" aria-hidden="true" />

        <div className="gw__copy">
          {STEPS.map((s, i) => (
            <p key={s[2]} className="gw__step" ref={(el) => (stepRefs.current[i] = el)} style={{ opacity: i === 0 ? 1 : 0 }}>
              <b>{s[2]}</b> {s[3]}
            </p>
          ))}
          <div className="gw__final" ref={finalRef} style={{ opacity: 0 }}>
            <h2 className="gw__h">{countWord}, <em>graded.</em></h2>
            <p className="gw__note">
              {FINE ? 'Hover a frame to see it whole.' : 'Tap a frame to see it whole.'} Then take a wheel and grade all {n} yourself.
            </p>
          </div>
        </div>

        <p className="gw__caption" aria-live="polite">
          {focusPair ? (
            <>
              <b>{String(focus + 1).padStart(2, '0')}</b> {focusPair.title}
            </>
          ) : null}
        </p>

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
                  ref={(el) => { if (el) wheelRefs.current[w] = { ...(wheelRefs.current[w] || {}), ring: el, puck: el.firstChild } }}
                >
                  <span className="wheel__puck" />
                </div>
                <p className="wheel__name">{w}</p>
                <p className="wheel__val">
                  {[0, 1, 2].map((k) => (
                    <span key={k} ref={(el) => { const W = (wheelRefs.current[w] = wheelRefs.current[w] || {}); W.vals = W.vals || []; W.vals[k] = el }}>
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
        </div>
      </div>
    </section>
  )
}
