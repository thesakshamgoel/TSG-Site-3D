/**
 * Media helpers — one place that knows how to turn a project into a thumbnail
 * and an embed URL, for both YouTube and Vimeo. Used everywhere so adding a
 * provider only touches this file.
 */

export function isVimeo(p) {
  return p?.provider === 'vimeo' || !!p?.vimeoId
}
export function isInstagram(p) {
  return p?.provider === 'instagram' || !!p?.instagramId
}

/**
 * Parse any video link into { provider, id }. Handles YouTube (incl. Shorts),
 * Vimeo, and Instagram reels/posts. A bare 11-char string is treated as a
 * YouTube id.
 */
export function parseVideoInput(input) {
  if (!input) return { provider: '', id: '' }
  const s = String(input).trim()
  let m = s.match(/instagram\.com\/(?:reel|reels|p|tv)\/([\w-]+)/i)
  if (m) return { provider: 'instagram', id: m[1] }
  m = s.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (m) return { provider: 'vimeo', id: m[1] }
  m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i)
  if (m) return { provider: 'youtube', id: m[1] }
  if (/^[\w-]{11}$/.test(s)) return { provider: 'youtube', id: s }
  return { provider: '', id: s }
}

/** grid thumbnail (a custom `thumb` override always wins, e.g. for a video) */
export function thumbFor(p) {
  if (!p) return ''
  if (p.thumb) return p.thumb
  if (p.mediaType === 'image') return p.image || ''
  if (isVimeo(p)) return `https://vumbnail.com/${p.vimeoId}.jpg`
  if (p.youtubeId) return `https://i.ytimg.com/vi/${p.youtubeId}/hqdefault.jpg`
  return ''
}

/** large / hero thumbnail */
// Full-resolution frame grabs (from the source video, up to 2560px) for the
// featured films. YouTube's best thumbnail is a heavily compressed 1280px,
// which goes soft at full-screen. Drop more in public/highlights/<id>.jpg.
const HIRES = new Set(['iRlNM-tP0UA', 'yv9y7f4v6Yc', 'zZ2kurHSgzI', 'eiPDl-pBDK0', '_HE3d1wNVfA', 'rQFBpsqHCCM'])

export function thumbHiFor(p) {
  if (!p) return ''
  if (p.thumb) return p.thumb
  if (p.mediaType === 'image') return p.image || ''
  if (isVimeo(p)) return `https://vumbnail.com/${p.vimeoId}_large.jpg`
  if (p.youtubeId && HIRES.has(p.youtubeId)) return `/highlights/${p.youtubeId}.jpg`
  if (p.youtubeId) return `https://i.ytimg.com/vi/${p.youtubeId}/maxresdefault.jpg`
  return ''
}

/** fallback thumbnail when the hi-res one 404s (YouTube maxres often missing) */
export function thumbFallbackFor(p) {
  if (p?.thumb) return p.thumb
  if (isVimeo(p)) return `https://vumbnail.com/${p.vimeoId}.jpg`
  if (p?.youtubeId) return `https://i.ytimg.com/vi/${p.youtubeId}/hqdefault.jpg`
  return ''
}

/** iframe src for the lightbox */
export function embedFor(p) {
  if (!p) return ''
  if (isInstagram(p))
    return `https://www.instagram.com/reel/${p.instagramId}/embed/`
  if (isVimeo(p))
    return `https://player.vimeo.com/video/${p.vimeoId}?autoplay=1&title=0&byline=0&portrait=0`
  if (p.youtubeId)
    return `https://www.youtube.com/embed/${p.youtubeId}?autoplay=1&rel=0`
  return ''
}
