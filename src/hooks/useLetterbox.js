import { useEffect, useState } from 'react'

/**
 * Finds black letterbox bars baked into an image (film thumbnails often carry
 * them) and reports how much of the height they take at the top and bottom,
 * as fractions. The image is drawn once into a small canvas; results are
 * cached per URL. Falls back to { top: 0, bottom: 0 } if pixels can't be read.
 */
const cache = new Map()

function measure(src) {
  if (cache.has(src)) return cache.get(src)
  const job = new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      try {
        const w = 96, h = Math.max(8, Math.round((img.naturalHeight / img.naturalWidth) * w))
        const c = document.createElement('canvas')
        c.width = w; c.height = h
        const ctx = c.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, w, h)
        const px = ctx.getImageData(0, 0, w, h).data
        // a row is "bar" when it is near-black all the way across
        const black = (y) => {
          let sum = 0, max = 0
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4
            const l = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]
            sum += l; if (l > max) max = l
          }
          return sum / w < 14 && max < 42
        }
        let top = 0; while (top < h * 0.3 && black(top)) top++
        let bot = 0; while (bot < h * 0.3 && black(h - 1 - bot)) bot++
        // ignore a row or two of noise; keep a hair of margin inside the bars
        resolve({ top: top > 1 ? (top + 0.5) / h : 0, bottom: bot > 1 ? (bot + 0.5) / h : 0 })
      } catch {
        resolve({ top: 0, bottom: 0 })
      }
    }
    img.onerror = () => resolve({ top: 0, bottom: 0 })
    img.src = src
  })
  cache.set(src, job)
  return job
}

export function useLetterbox(src) {
  const [bars, setBars] = useState({ top: 0, bottom: 0 })
  useEffect(() => {
    if (!src) return
    let live = true
    measure(src).then((b) => live && setBars(b))
    return () => { live = false }
  }, [src])
  return bars
}

// style for an <img> inside an overflow-hidden box: stretch it so the bars
// fall outside the box, then cover-fit the remaining picture
export function letterboxCrop({ top, bottom }) {
  const vis = 1 - top - bottom
  if (vis >= 0.995) return undefined
  return { position: 'absolute', left: 0, width: '100%', top: `${(-top / vis) * 100}%`, height: `${100 / vis}%`, objectFit: 'cover' }
}
