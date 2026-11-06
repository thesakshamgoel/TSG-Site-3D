import { useEffect, useId, useRef, useState } from 'react'

/**
 * The bend of liquid glass: near the rim, what is behind the glass is pulled
 * in from further inside, as through a thick curved edge, while the middle
 * stays flat. It is an SVG displacement filter used as a backdrop-filter, so
 * only Chromium browsers (Chrome, Edge, Brave) can draw it; everywhere else,
 * and on lite devices, the glass keeps its plain light blur and edge lights.
 *
 *   const r = useRefraction(ref, { radius: 30 })
 *   <div ref={ref} className={`lg ${r.className}`} style={r.style}>…</div>{r.filter}
 *
 * The displacement map is drawn from the element's own size and redrawn when
 * it changes size, so the bend always follows the real corner radius.
 */
const supported = () =>
  typeof window !== 'undefined' &&
  !document.documentElement.classList.contains('lite') &&
  !!(window.chrome || navigator.userAgentData?.brands?.some((b) => /Chromium/.test(b.brand)))

function drawMap(w, h, r, bezel) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(w, h)
  const d = img.data
  const hx = w / 2, hy = h / 2, bx = hx - r, by = hy - r
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hx, py = y + 0.5 - hy
      const qx = Math.abs(px) - bx, qy = Math.abs(py) - by
      const inside = r - (Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0))
      // outward normal of the rounded rectangle at this point
      let nx, ny
      if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = (qx / l) * Math.sign(px); ny = (qy / l) * Math.sign(py) }
      else if (qx > qy) { nx = Math.sign(px); ny = 0 }
      else { nx = 0; ny = Math.sign(py) }
      const t = inside <= 0 || inside >= bezel ? 0 : 1 - inside / bezel
      // Strongest at the very rim, easing out over the whole bezel. With the
      // depth set close to the bezel width the rim folds the picture back on
      // itself, like looking through the thick curved edge of a glass slab.
      const s = Math.pow(t, 1.7)
      const i = (y * w + x) * 4
      d[i] = 128 - nx * s * 127 // sample from the inside: the opposite of the outward normal
      d[i + 1] = 128 - ny * s * 127
      d[i + 2] = 128
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL('image/png')
}

export function useRefraction(ref, { radius = 24, bezel = 26, depth = 24 } = {}) {
  const id = 'lg' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const [map, setMap] = useState(null)
  const last = useRef('')

  useEffect(() => {
    const el = ref.current
    if (!el || !supported()) return
    let raf
    const build = () => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight)
      if (!w || !h || last.current === `${w}x${h}`) return
      last.current = `${w}x${h}`
      setMap({ w, h, href: drawMap(w, h, Math.min(radius, w / 2, h / 2), bezel) })
    }
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(build) })
    ro.observe(el)
    build()
    return () => { ro.disconnect(); cancelAnimationFrame(raf) }
  }, [ref, radius, bezel])

  if (!map) return { className: '', style: undefined, filter: null }
  return {
    className: 'lg--refract',
    style: { '--lg-url': `url(#${id})` },
    filter: (
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <filter id={id} x="0" y="0" width={map.w} height={map.h} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feImage href={map.href} x="0" y="0" width={map.w} height={map.h} preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={depth * 2} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    ),
  }
}
