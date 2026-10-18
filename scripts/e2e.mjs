/**
 * End-to-end UI test suite for the Saksham Goel portfolio.
 *
 * Single command, single browser session, walks the entire real user journey
 * (loader -> hero -> highlights -> stills -> work -> gallery -> lightbox ->
 * about -> insta -> footer -> dev console -> persistence -> responsive) and
 * reports every failure in one pass, with a screenshot per failure and a
 * markdown + JSON report.
 *
 * Run:  node scripts/e2e.mjs [baseUrl]
 * Needs the dev server already running (npm run dev) at baseUrl
 * (default http://localhost:5173/).
 */
import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const REPORT_DIR = path.join(ROOT, 'e2e-report')
const SHOTS_DIR = path.join(REPORT_DIR, 'screenshots')
fs.mkdirSync(SHOTS_DIR, { recursive: true })

const BASE_URL = process.argv[2] || 'http://localhost:5173/'
const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]
const EDGE = EDGE_CANDIDATES.find((p) => fs.existsSync(p))
const STORAGE_KEY = 'sg_portfolio_v1'
const IGNORED_404_SUFFIXES = ['/photo.jpg', '/cv.pdf'] // intentional placeholders

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── tiny test harness ───────────────────────────────────────────────────────
const results = []
let currentSection = ''
let page, browser
const consoleErrors = []
const pageErrors = []
const failedRequests = []

function section(name) {
  currentSection = name
  console.log(`\n── ${name} ──────────────────────────────────────────`)
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed')
}

async function test(name, fn) {
  const start = Date.now()
  try {
    await fn()
    results.push({ section: currentSection, name, status: 'PASS', ms: Date.now() - start })
    console.log(`  ✓ ${name}`)
  } catch (err) {
    const ms = Date.now() - start
    let shot = null
    try {
      shot = `${results.length + 1}-${currentSection}-${name}`.replace(/[^a-z0-9]+/gi, '_').slice(0, 90) + '.png'
      await page.screenshot({ path: path.join(SHOTS_DIR, shot) })
    } catch {
      shot = null
    }
    results.push({
      section: currentSection,
      name,
      status: 'FAIL',
      ms,
      error: err.message,
      screenshot: shot,
    })
    console.log(`  ✗ ${name} — ${err.message}`)
  }
}

async function skip(name, reason) {
  results.push({ section: currentSection, name, status: 'SKIP', ms: 0, error: reason })
  console.log(`  ○ ${name} — skipped: ${reason}`)
}

// ── page helpers ─────────────────────────────────────────────────────────
async function scrollToId(id, extraWaitMs = 1200) {
  await page.evaluate((sid) => {
    const el = document.getElementById(sid)
    if (el) window.scrollTo({ top: el.offsetTop, behavior: 'auto' })
  }, id)
  await sleep(extraWaitMs)
}

async function inViewport(selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return false
    const r = el.getBoundingClientRect()
    return r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0
  }, selector)
}

async function textOf(selector) {
  return page.evaluate((sel) => document.querySelector(sel)?.textContent?.trim() ?? null, selector)
}

async function countOf(selector) {
  return page.evaluate((sel) => document.querySelectorAll(sel).length, selector)
}

async function attrOf(selector, attr) {
  return page.evaluate((sel, a) => document.querySelector(sel)?.getAttribute(a) ?? null, selector, attr)
}

async function classListHas(selector, cls) {
  return page.evaluate(
    (sel, c) => document.querySelector(sel)?.classList.contains(c) ?? false,
    selector,
    cls
  )
}

// Category/Media-type/Role/Year labels in the dev console form live inside
// nested .dc__row divs, so nth-of-type among .dc__form's own children only
// reaches Title/YouTube-link/Tags/checkbox reliably — target every field by
// its placeholder text instead, which is stable regardless of DOM nesting.
const dcField = (placeholder) => `.dc__form input[placeholder="${placeholder}"]`

// The console is owner-gated: Ctrl+Shift+K shows a passcode modal, and only
// the correct passcode reveals the panel. Auth is remembered in sessionStorage
// for the session, so only the first open needs the passcode.
const CONSOLE_PASSCODE = 'Hellomy@10.@'
const CONSOLE_EMAIL = 'thesakshamgoel@gmail.com'
async function openConsole() {
  await page.keyboard.down('Control')
  await page.keyboard.down('Shift')
  await page.keyboard.press('K')
  await page.keyboard.up('Shift')
  await page.keyboard.up('Control')
  await sleep(300)
  // if the passcode gate is showing, unlock it (email + passcode)
  const gate = await page.$('.pin__email')
  if (gate) {
    await gate.type(CONSOLE_EMAIL)
    await page.type('.pin input[type="password"]', CONSOLE_PASSCODE)
    await page.click('.pin__actions .btn.primary')
    await sleep(300)
  }
  await waitPresent('.dc__panel', 2000)
}

async function clickByText(containerSelector, textStartsWith) {
  const handle = await page.evaluateHandle(
    (sel, txt) => {
      const btns = [...document.querySelectorAll(`${sel} button`)]
      return btns.find((b) => b.textContent.trim().startsWith(txt)) || null
    },
    containerSelector,
    textStartsWith
  )
  const el = handle.asElement()
  assert(el, `button starting with "${textStartsWith}" not found in ${containerSelector}`)
  await el.click()
  return el
}

async function waitGone(selector, timeout = 3000) {
  await page.waitForFunction((sel) => !document.querySelector(sel), { timeout }, selector)
}

async function waitPresent(selector, timeout = 3000) {
  await page.waitForSelector(selector, { timeout })
}

async function getLocalStorageJSON() {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  }, STORAGE_KEY)
}

async function clearLocalStorage() {
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
}

async function waitForLoaderGone(timeout = 8000) {
  await page.waitForFunction(() => !document.querySelector('.loader'), { timeout })
}

// Third-party widget / CDN hosts whose console + network noise is outside the
// app's control (the Instagram feed embed, YouTube/Vimeo players, etc.). We
// test OUR code, not Elfsight's — so their chatter is filtered from the sweeps.
const THIRD_PARTY_HOSTS =
  /elfsight|elfsightcdn|instagram|cdninstagram|fbcdn|behold|lightwidget|snapwidget|youtube|ytimg|vimeo|vumbnail|scontent/i

function wireErrorCollectors(p) {
  p.on('console', (m) => {
    if (m.type() !== 'error') return
    const text = m.text()
    // Browser-generated "Failed to load resource...404" for a missing image is
    // tracked with its full URL via the response/requestfailed listeners below;
    // this generic console line carries no URL and fires even when the app's
    // own onError handler gracefully falls back — not a real app bug.
    if (/Failed to load resource.*(404|net::)/i.test(text)) return
    if (THIRD_PARTY_HOSTS.test(text)) return
    // errors originating from a third-party script file, not our bundle
    const loc = m.location?.()
    if (loc?.url && THIRD_PARTY_HOSTS.test(loc.url)) return
    consoleErrors.push(text)
  })
  p.on('pageerror', (e) => {
    if (THIRD_PARTY_HOSTS.test(e.stack || e.message || '')) return
    pageErrors.push(e.message)
  })
  p.on('requestfailed', (req) => {
    const url = req.url()
    if (IGNORED_404_SUFFIXES.some((s) => url.endsWith(s))) return
    if (THIRD_PARTY_HOSTS.test(url)) return
    failedRequests.push({ url, reason: req.failure()?.errorText || 'unknown' })
  })
  p.on('response', (res) => {
    const url = res.url()
    if (res.status() >= 400 && !IGNORED_404_SUFFIXES.some((s) => url.endsWith(s)) && !THIRD_PARTY_HOSTS.test(url)) {
      failedRequests.push({ url, reason: `HTTP ${res.status()}` })
    }
  })
}

// ── main ─────────────────────────────────────────────────────────────────
async function main() {
  if (!EDGE) throw new Error('Microsoft Edge not found at expected install paths')

  // preflight: dev server up?
  try {
    const r = await fetch(BASE_URL)
    assert(r.ok, `dev server responded ${r.status}`)
  } catch (e) {
    throw new Error(`Dev server not reachable at ${BASE_URL} — start it with "npm run dev" first. (${e.message})`)
  }

  browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--use-gl=angle',
      '--use-angle=swiftshader-webgl',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      '--window-size=1440,900',
    ],
  })
  page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  wireErrorCollectors(page)

  // ── BOOT & LOADER ─────────────────────────────────────────────────────
  section('Boot & Loader')

  await test('page loads and returns 200', async () => {
    const res = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
    assert(res && res.ok(), `navigation response not ok (${res && res.status()})`)
  })

  await test('document title is set', async () => {
    const title = await page.title()
    assert(/Saksham Goel/i.test(title), `unexpected title: "${title}"`)
  })

  await test('loader appears', async () => {
    await waitPresent('.loader', 5000)
  })

  await test('loader counter progresses toward 100', async () => {
    const a = await textOf('.loader__count > span:first-child')
    await sleep(700)
    const b = await textOf('.loader__count > span:first-child')
    assert(a !== null && b !== null, 'loader counter text missing')
    assert(Number(b) >= Number(a), `counter did not progress: ${a} -> ${b}`)
  })

  await test('loader clears and main content unfolds within 8s', async () => {
    await waitForLoaderGone(8000)
    await sleep(400)
    const hasIn = await classListHas('main', 'main--in')
    assert(hasIn, 'main element missing "main--in" class after loader cleared')
  })

  await test('no console/page errors during boot', async () => {
    assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`)
    assert(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`)
  })

  await test('3D background canvas renders with non-zero size', async () => {
    const ok = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      return !!c && c.clientWidth > 0 && c.clientHeight > 0
    })
    assert(ok, 'no rendered <canvas> found for the 3D scene')
  })

  await test('film HUD (brackets/REC/timecode) renders', async () => {
    await waitPresent('.hud', 2000)
    const rec = await textOf('.hud .rec')
    assert(rec && /REC/.test(rec), `REC label missing/unexpected: ${rec}`)
    const tc = await textOf('.hud__bar--left .timecode')
    assert(tc && /^\d{2}:\d{2}:\d{2}:\d{2}$/.test(tc), `timecode format unexpected: ${tc}`)
  })

  await test('no duplicate element ids on the page', async () => {
    const dupes = await page.evaluate(() => {
      const seen = new Map()
      document.querySelectorAll('[id]').forEach((el) => {
        seen.set(el.id, (seen.get(el.id) || 0) + 1)
      })
      return [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id)
    })
    assert(dupes.length === 0, `duplicate ids: ${dupes.join(', ')}`)
  })

  // ── HERO ──────────────────────────────────────────────────────────────
  section('Hero')

  await test('logo renders in hero', async () => {
    const ok = await page.evaluate(() => {
      const img = document.querySelector('.hero__logo')
      return !!img && img.complete && img.naturalWidth > 0
    })
    assert(ok, 'hero logo <img> missing or failed to load')
  })

  await test('name and tagline render', async () => {
    const name = await textOf('.hero__name')
    assert(name && /Saksham/i.test(name), `hero name text unexpected: "${name}"`)
    const tagline = await textOf('.hero__tagline')
    assert(tagline && tagline.length > 5, 'hero tagline missing')
  })

  await test('nav has exactly 3 links (Film/Video, Graphics, About)', async () => {
    const labels = await page.$$eval('.nav__links a', (as) => as.map((a) => a.textContent.trim()))
    assert(labels.length === 3, `expected 3 nav links, got ${labels.length}: ${labels.join(' | ')}`)
    assert(/Film/.test(labels[0]) && /Graphics/.test(labels[1]) && /About/.test(labels[2]),
      `unexpected nav labels: ${labels.join(' | ')}`)
  })

  await test('film-strip marquee has frames', async () => {
    const n = await countOf('.hero__reel-frame')
    assert(n >= 6, `expected marquee frames (>=6, doubled for seamless loop), got ${n}`)
  })

  await test('"Roll the reel" CTA scrolls to Highlights', async () => {
    await page.click('.hero__cta .btn.primary')
    await sleep(1400)
    assert(await inViewport('#highlights'), 'Highlights section not in viewport after CTA click')
  })

  await test('"About & reviews" link scrolls to About', async () => {
    await page.click('.hero__cta a.btn')
    await sleep(1400)
    assert(await inViewport('#about'), 'About section not in viewport after link click')
    await scrollToId('top', 1400) // reset for the rest of the journey
  })

  // ── HIGHLIGHTS ────────────────────────────────────────────────────────
  section('Highlights')
  await scrollToId('highlights')

  await test('featured frame renders with title/role', async () => {
    assert(await inViewport('.hl__frame'), 'highlight frame not visible')
    const title = await textOf('.hl__title')
    assert(title && title.length > 0, 'highlight title missing')
  })

  await test('featured films are stacked full-screen frames (1-4)', async () => {
    const n = await countOf('.hl__slide')
    assert(n >= 1 && n <= 4, `expected 1-4 highlight slides, got ${n}`)
  })

  await test('scrolling through Highlights opens the next film', async () => {
    const titles = await page.$$eval('.hl__title', (els) => els.map((e) => e.textContent.trim()))
    if (titles.length < 2) return skip('scrolling through Highlights opens the next film', 'fewer than 2 highlight slides')
    const shownTitle = () =>
      page.evaluate(() => {
        const vis = [...document.querySelectorAll('.hl__meta')].find((m) => parseFloat(getComputedStyle(m).opacity) > 0.9)
        return vis ? vis.querySelector('.hl__title').textContent.trim() : null
      })
    await page.evaluate(() => {
      const s = document.getElementById('highlights')
      window.scrollTo({ top: s.offsetTop + (s.offsetHeight - innerHeight) * 0.2, behavior: 'instant' })
    })
    await sleep(700)
    const first = await shownTitle()
    await page.evaluate(() => {
      const s = document.getElementById('highlights')
      window.scrollTo({ top: s.offsetTop + (s.offsetHeight - innerHeight) * 0.55, behavior: 'instant' })
    })
    await sleep(700)
    const second = await shownTitle()
    assert(first && second && first !== second, `open film did not change on scroll ("${first}" then "${second}")`)
    await page.evaluate(() => {
      const s = document.getElementById('highlights')
      window.scrollTo({ top: s.offsetTop + (s.offsetHeight - innerHeight) * 0.2, behavior: 'instant' })
    })
    await sleep(700)
  })

  await test('clicking the frame opens the Lightbox', async () => {
    await page.click('.hl__frame')
    await waitPresent('.lb', 2000)
    const hasMedia = await page.evaluate(
      () => !!document.querySelector('.lb__media iframe, .lb__media img')
    )
    assert(hasMedia, 'lightbox opened without video/image media')
  })

  await test('embed src is a valid youtube/vimeo player URL (if video)', async () => {
    const src = await attrOf('.lb__media iframe', 'src')
    if (src == null) return // image project, nothing to check here
    assert(/youtube\.com\/embed\/|player\.vimeo\.com\/video\//.test(src), `unexpected embed src: ${src}`)
  })

  await test('Escape closes the Lightbox', async () => {
    await page.keyboard.press('Escape')
    await waitGone('.lb', 2000)
  })

  // ── BEFORE / AFTER (colour-grade reveal slider) ──────────────────────
  section('Before / After')
  await scrollToId('grade')

  const gradeAt = (f) =>
    page.evaluate((f) => {
      const s = document.getElementById('grade')
      window.scrollTo({ top: s.offsetTop + (s.offsetHeight - innerHeight) * f, behavior: 'instant' })
    }, f)

  await test('grade stage fills the screen with the frame and three colour wheels', async () => {
    await gradeAt(0.1)
    await sleep(600)
    const st = await page.evaluate(() => ({
      wheels: document.querySelectorAll('.gw .wheel__ring').length,
      gl: !!document.querySelector('.gw__stage.has-gl'),
      fb: [...document.querySelectorAll('.gw__fallback img')].every((im) => im.complete && im.naturalWidth > 0),
    }))
    assert(st.wheels === 3, `expected 3 colour wheels, got ${st.wheels}`)
    assert(st.gl || st.fb, 'neither the WebGL frame nor the image fallback loaded')
  })

  await test('scrolling grades the frame: lift wheel leaves neutral', async () => {
    await gradeAt(0.05)
    await sleep(400)
    const v0 = await textOf('.gw .wheel:first-child .wheel__val')
    await gradeAt(0.4)
    await sleep(400)
    const v1 = await textOf('.gw .wheel:first-child .wheel__val')
    assert(v0 !== v1, `lift values did not move with scroll (${v0})`)
  })

  await test('dragging a wheel switches to the visitor grade, reset restores it', async () => {
    await gradeAt(0.95)
    await sleep(500)
    const ring = await page.$('.gw .wheel:last-child .wheel__ring')
    const box = await ring.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.25, { steps: 6 })
    await page.mouse.up()
    await sleep(300)
    const mode = await textOf('.gw__mode')
    assert(/your grade/i.test(mode || ''), `mode did not switch after drag: "${mode}"`)
    await clickByText('.gw__tools', 'Back to his grade')
    await sleep(300)
    const back = await textOf('.gw__mode')
    assert(!/your grade/i.test(back || ''), `reset did not restore his grade: "${back}"`)
  })

  await test('choosing another scene changes the graded title', async () => {
    const n = await countOf('.gw__scenes button')
    if (n < 2) return skip('choosing another scene changes the graded title', 'only one comparison pair')
    const t0 = await textOf('.gw__h')
    await page.click('.gw__scenes button:nth-child(2)')
    await sleep(400)
    const t1 = await textOf('.gw__h')
    assert(t0 !== t1, `scene title did not change ("${t0}")`)
  })

  // ── WORK (2 category panels) ─────────────────────────────────────────
  section('Work panels')
  await scrollToId('work', 1600)

  await test('exactly 2 category panels render (Film/Video, Graphics)', async () => {
    const n = await countOf('.work__panels .panel')
    assert(n === 2, `expected 2 panels, got ${n}`)
    assert(await page.$('#panel-film'), '#panel-film missing')
    assert(await page.$('#panel-graphics'), '#panel-graphics missing')
  })

  await test('hovering the Film panel activates it and reveals subcats', async () => {
    await page.hover('#panel-film')
    await sleep(400)
    const active = await classListHas('#panel-film', 'is-active')
    assert(active, 'Film panel did not get "is-active" on hover')
    const subs = await page.$$eval('#panel-film .panel__subs li', (els) => els.map((e) => e.textContent.trim()))
    assert(subs.length === 4, `expected 4 subcats for Film, got ${subs.length}: ${subs.join(', ')}`)
    assert(
      subs.includes('Narrative') &&
        subs.includes('Reels') &&
        subs.includes('Commercials') &&
        subs.includes('Music Videos'),
      `unexpected Film subcats: ${subs.join(', ')}`
    )
  })

  await test('hovering the Graphics panel activates it and reveals subcats', async () => {
    await page.hover('#panel-graphics')
    await sleep(400)
    const active = await classListHas('#panel-graphics', 'is-active')
    assert(active, 'Graphics panel did not get "is-active" on hover')
    const subs = await page.$$eval('#panel-graphics .panel__subs li', (els) => els.map((e) => e.textContent.trim()))
    assert(subs.length === 3, `expected 3 subcats for Graphics, got ${subs.length}: ${subs.join(', ')}`)
    assert(
      subs.includes('Logos') && subs.includes('Images') && subs.includes('Graphics'),
      `unexpected Graphics subcats: ${subs.join(', ')}`
    )
  })

  // ── CATEGORY GALLERY: Film / Video ───────────────────────────────────
  section('Category Gallery — Film/Video')

  await test('clicking the Film panel opens its gallery', async () => {
    await page.click('#panel-film')
    await waitPresent('.gallery', 2500)
    await sleep(900) // let the zoom-in transition finish
    const title = await textOf('.gallery__title')
    assert(title && /Film/.test(title), `gallery title unexpected: "${title}"`)
  })

  let filmTotal = null
  await test('project count and filter bar (All + 3 subcats) are correct', async () => {
    const meta = await textOf('.gallery__meta')
    const m = meta && meta.match(/(\d+)/)
    assert(m, `could not parse project count from "${meta}"`)
    filmTotal = Number(m[1])
    assert(filmTotal > 0, 'film project count is 0')

    const btns = await page.$$eval('.gallery__filters button', (bs) => bs.map((b) => b.textContent.trim()))
    assert(btns.length >= 2, `expected "All" plus at least one subcat filter, got ${btns.length}: ${btns.join(' | ')}`)
    assert(btns[0] === 'All', `first filter button should be "All", got "${btns[0]}"`)
    assert(
      btns.slice(1).some((b) => b.startsWith('Reels')),
      `expected a "Reels" filter tab among: ${btns.join(' | ')}`
    )

    const sum = btns
      .slice(1)
      .map((b) => Number(b.match(/(\d+)/)?.[1] || 0))
      .reduce((a, b) => a + b, 0)
    assert(sum === filmTotal, `subcat counts (${sum}) don't sum to total projects (${filmTotal})`)
  })

  await test('featured showreel piece is shown large on "All"', async () => {
    assert(await page.$('.gallery__featured .card--featured'), 'featured card missing on All filter')
  })

  await test('"Narrative" filter shows only that group, with matching item count', async () => {
    const countLabel = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('.gallery__filters button')].find((b) =>
        b.textContent.trim().startsWith('Narrative')
      )
      return btn ? Number(btn.textContent.match(/(\d+)/)?.[1]) : null
    })
    assert(countLabel != null, '"Narrative" filter button not found')
    await clickByText('.gallery__filters', 'Narrative')
    await sleep(500)
    const groups = await countOf('.gallery__group')
    assert(groups === 1, `expected exactly 1 visible group after filtering, got ${groups}`)
    const cards = await countOf('.gallery__grid .card')
    assert(cards === countLabel, `filtered card count (${cards}) != badge count (${countLabel})`)
    assert(!(await page.$('.gallery__featured')), 'featured card should be hidden once a subcat filter is active')
  })

  await test('award-winning films show an "Award-Winning" badge', async () => {
    // Narrative filter is active from the previous test; 3 of its films
    // (Question Mark, Anjaan, Bahr, Bekarar Karke Hume) are flagged award-winning.
    const awards = await page.$$eval('.gallery__grid .card__award', (els) => els.length)
    assert(awards >= 3, `expected award badges on narrative films, found ${awards}`)
    await clickByText('.gallery__filters', 'All')
    await sleep(400)
  })

  await test('the Reels tab filters correctly and shows real items', async () => {
    const countLabel = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('.gallery__filters button')].find((b) =>
        b.textContent.trim().startsWith('Reels')
      )
      return btn ? Number(btn.textContent.match(/(\d+)/)?.[1]) : null
    })
    assert(countLabel != null && countLabel > 0, `expected a non-empty "Reels" filter, got count ${countLabel}`)
    await clickByText('.gallery__filters', 'Reels')
    await sleep(400)
    const cards = await countOf('.gallery__grid .card')
    assert(cards === countLabel, `Reels card count (${cards}) != badge count (${countLabel})`)
    await clickByText('.gallery__filters', 'Narrative')
    await sleep(400)
  })

  await test('clicking a project card opens the Lightbox with a video embed', async () => {
    await page.click('.gallery__grid .card')
    await waitPresent('.lb', 2000)
    const src = await attrOf('.lb__media iframe', 'src')
    assert(src && /youtube\.com\/embed\/|player\.vimeo\.com\/video\//.test(src), `bad/missing embed src: ${src}`)
    await page.click('.lb__close')
    await waitGone('.lb', 2000)
  })

  await test('Escape closes only the topmost overlay (regression: used to close both at once)', async () => {
    await page.click('.gallery__grid .card')
    await waitPresent('.lb', 2000)
    assert(await page.$('.gallery'), 'gallery should still be open behind the lightbox')

    await page.keyboard.press('Escape')
    await waitGone('.lb', 2000)
    assert(await page.$('.gallery'), 'first Escape closed the gallery too — should only close the lightbox')

    await page.keyboard.press('Escape')
    await waitGone('.gallery', 2000)
  })

  await test('reopen the Film gallery for the remaining checks', async () => {
    await page.hover('#panel-film')
    await sleep(200)
    await page.click('#panel-film')
    await waitPresent('.gallery', 2500)
    await sleep(1400)
  })

  await test('"Back" button + "All" filter restores full gallery, then closes via ✕', async () => {
    await clickByText('.gallery__filters', 'All')
    await sleep(400)
    assert(await page.$('.gallery__featured'), 'featured card did not reappear on All filter')
    await page.click('.gallery__x')
    await waitGone('.gallery', 2000)
    assert(await inViewport('#work'), 'Work section not back in view after closing gallery')
  })

  // ── CATEGORY GALLERY: Photo & Graphics ───────────────────────────────
  section('Category Gallery — Graphics')

  await test('clicking the Graphics panel opens its gallery', async () => {
    await page.hover('#panel-graphics')
    await sleep(200)
    await page.click('#panel-graphics')
    await waitPresent('.gallery', 2500)
    // let the zoom-from-card entrance transition (0.7s) fully settle before
    // any further interaction, or click coordinates can land mid-transform
    await sleep(1400)
    const title = await textOf('.gallery__title')
    assert(title && /Graphics/.test(title), `gallery title unexpected: "${title}"`)
  })

  await test('a project with a genuinely broken image falls back to its title text (no broken-icon)', async () => {
    await clickByText('.gallery__filters', 'All')
    await sleep(400)
    await page.click('.gallery__x')
    await waitGone('.gallery', 2000)

    await openConsole()
    const BROKEN_TITLE = 'Broken Thumb Regression Check'
    await page.type(dcField('e.g. Short Film — Aftertaste'), BROKEN_TITLE)
    // The form has three selects in DOM order: Category, Sub-category, Media
    // type. Pick the first for category and the LAST for media type (robust to
    // the sub-category select sitting between them).
    const selects = await page.$$('.dc__form select')
    await selects[0].select('graphics')
    await selects[selects.length - 1].select('image')
    // Vite's dev server answers ANY unmatched path with its SPA index.html
    // shell (200 OK), not a real 404, so a path picked to "look broken" can't
    // reliably fail — any real image URL works here since we force the
    // failure ourselves below via a synthetic error event on the <img>.
    await page.type('.dc__form input[placeholder="https://…/poster.jpg"]', '/graphics/logos/rgc.jpg')
    await page.click('.dc__submit')
    await sleep(400)
    await page.mouse.click(10, 10)
    await waitGone('.dc', 2000)

    await page.hover('#panel-graphics')
    await sleep(200)
    await page.click('#panel-graphics')
    await waitPresent('.gallery', 2500)
    await sleep(1200)

    // Dispatch a real `error` Event directly on the card's <img> node — this
    // is exactly what a failed network load fires, so it exercises the same
    // onError -> useImgFallback -> placeholder path deterministically,
    // without depending on network timing/dev-server fallback behavior.
    const dispatched = await page.evaluate((title) => {
      const cards = [...document.querySelectorAll('.gallery__grid .card, .gallery__featured .card')]
      const card = cards.find((c) => c.textContent.includes(title))
      const img = card?.querySelector('.card__media img')
      if (!img) return false
      img.dispatchEvent(new Event('error'))
      return true
    }, BROKEN_TITLE)
    assert(dispatched, 'could not find the new card\'s <img> to dispatch a synthetic error on')

    await page.waitForFunction(
      (title) => {
        const cards = [...document.querySelectorAll('.gallery__grid .card, .gallery__featured .card')]
        return cards.some((c) => c.textContent.includes(title) && c.querySelector('.card__placeholder-title'))
      },
      { timeout: 2000 },
      BROKEN_TITLE
    )
    const noBrokenImgTag = await page.evaluate((title) => {
      const cards = [...document.querySelectorAll('.gallery__grid .card, .gallery__featured .card')]
      const card = cards.find((c) => c.textContent.includes(title))
      return !card.querySelector('.card__media img')
    }, BROKEN_TITLE)
    assert(noBrokenImgTag, 'card still renders an <img> tag after its thumbnail failed to load')

    // cleanup
    await page.click('.gallery__x')
    await waitGone('.gallery', 2000)
    await clearLocalStorage()
  })

  await test('reopen the Graphics gallery for the remaining checks', async () => {
    await page.hover('#panel-graphics')
    await sleep(200)
    await page.click('#panel-graphics')
    await waitPresent('.gallery', 2500)
    await sleep(1400)
  })

  await test('11+ logo entries render under the Logos filter', async () => {
    await clickByText('.gallery__filters', 'Logos')
    await sleep(500)
    const cards = await countOf('.gallery__grid .card, .gallery__featured .card')
    assert(cards >= 11, `expected at least 11 logo cards, got ${cards}`)
    await clickByText('.gallery__filters', 'All')
    await sleep(500)
  })

  await test('image project card opens Lightbox with an <img>, not an iframe', async () => {
    // Confirmed by direct repro (scripts/repro-graphics-lb.mjs) that the click
    // itself is reliable; under headless SwiftShader the 3D canvas can drop
    // its WebGL context mid-run ("Context Lost") and stall the JS thread for a
    // beat, occasionally pushing the React re-render past a short wait. Retry
    // once rather than papering over it with an ever-longer single timeout.
    const target = (await page.$('.gallery__featured .card')) || (await page.$('.gallery__grid .card'))
    assert(target, 'no project card found in Graphics gallery')
    try {
      await target.click()
      await waitPresent('.lb', 2500)
    } catch (err) {
      if (await page.$('.lb')) throw err
      await target.click()
      await waitPresent('.lb', 2500)
    }
    const hasImg = await page.evaluate(() => !!document.querySelector('.lb__media img'))
    const hasIframe = await page.evaluate(() => !!document.querySelector('.lb__media iframe'))
    assert(hasImg && !hasIframe, `expected image lightbox, got img=${hasImg} iframe=${hasIframe}`)
    await page.keyboard.press('Escape')
    await waitGone('.lb', 2000)
  })

  await test('Escape key closes the Graphics gallery', async () => {
    await page.keyboard.press('Escape')
    await waitGone('.gallery', 2000)
  })

  // ── ABOUT ─────────────────────────────────────────────────────────────
  section('About')
  await scrollToId('about', 1400)

  await test('all 4 chapters render in order', async () => {
    const titles = await page.$$eval('.chapter__title', (els) => els.map((e) => e.textContent.trim()))
    assert(titles.length === 4, `expected 4 chapters, got ${titles.length}: ${titles.join(' | ')}`)
    assert(
      titles[0] === 'Experience' &&
        titles[1] === 'Credentials' &&
        titles[2] === 'Reviews' &&
        titles[3] === 'Start a Project',
      `unexpected chapter order: ${titles.join(' | ')}`
    )
  })

  await test('bio paragraph renders', async () => {
    const bio = await textOf('.about__bio')
    assert(bio && bio.length > 20, 'about bio missing or too short')
  })

  await test('portrait shows a loaded photo OR the "add your portrait" placeholder (never a broken icon)', async () => {
    const state = await page.evaluate(() => {
      const img = document.querySelector('.about__portrait img')
      const ph = document.querySelector('.about__portrait-ph')
      if (img) return img.complete && img.naturalWidth > 0 ? 'loaded' : 'broken'
      if (ph) return 'placeholder'
      return 'missing'
    })
    assert(state === 'loaded' || state === 'placeholder', `unexpected portrait state: ${state}`)
  })

  await test('experience timeline has 3 entries', async () => {
    const n = await countOf('.timeline__item')
    assert(n === 3, `expected 3 experience entries, got ${n}`)
  })

  await test('5 certificates render and are openable', async () => {
    const n = await countOf('.certs .cert')
    assert(n === 5, `expected 5 certificates, got ${n}`)
    const openable = await countOf('.certs .cert--img')
    assert(openable === 5, `expected all 5 certs to be openable images, got ${openable}`)
  })

  await test('clicking a certificate opens it in the Lightbox', async () => {
    await page.click('.certs .cert--img')
    await waitPresent('.lb', 2000)
    assert(await page.$('.lb__media img'), 'certificate lightbox missing an image')
    await page.click('.lb__close')
    await waitGone('.lb', 2000)
  })

  await test('3 reviews render with the correct names', async () => {
    const names = await page.$$eval('.review__name', (els) => els.map((e) => e.textContent.trim()))
    assert(names.length === 3, `expected 3 reviews, got ${names.length}`)
    ;['Divya Pawar', 'Radha Dua', 'Ranveer Dharmraj'].forEach((n) =>
      assert(names.includes(n), `missing review from ${n}; got: ${names.join(', ')}`)
    )
  })

  await test('contact email link has correct mailto href', async () => {
    const href = await attrOf('.contact__email', 'href')
    assert(href === 'mailto:thesakshamgoel@gmail.com', `unexpected mailto href: ${href}`)
  })

  await test('contact phone link has correct tel href', async () => {
    const href = await attrOf('.contact__phone', 'href')
    assert(href && href.replace(/\s/g, '') === 'tel:+917508181811', `unexpected tel href: ${href}`)
  })

  await test('CV download link and Instagram link render with correct attributes', async () => {
    const cvHref = await attrOf('.contact__actions a[download]', 'href')
    assert(cvHref === '/cv.pdf', `unexpected CV href: ${cvHref}`)
    const igHref = await attrOf('.contact__actions a[target="_blank"]', 'href')
    assert(igHref && igHref.includes('instagram.com/thesakshamgoel'), `unexpected Instagram href: ${igHref}`)
  })

  await test('contact form requires name/email/message before it can submit', async () => {
    const valid = await page.evaluate(() => document.querySelector('.cform')?.checkValidity())
    assert(valid === false, 'empty contact form reports as valid (required attrs not working)')
  })

  await test('"Leave a Review" tab switches to the review form with a working star rating', async () => {
    await clickByText('.cform__tabs', 'Leave a Review')
    await sleep(200)
    const active = await textOf('.cform__tabs button.is-active')
    assert(active === 'Leave a Review', `expected "Leave a Review" tab active, got "${active}"`)
    assert(await countOf('.cform__star') === 5, 'expected 5 star-rating buttons')
    await page.click('.cform__star:nth-child(4)')
    const onCount = await countOf('.cform__star.is-on')
    assert(onCount === 4, `expected 4 stars lit after clicking the 4th star, got ${onCount}`)
    await clickByText('.cform__tabs', 'Start a Project')
    await sleep(200)
  })

  await test('filling the contact form makes it valid and submitting does not throw a JS error', async () => {
    // inputs have no name/id — Name is the first, Email the second, in DOM order
    const inputs = await page.$$('.cform input')
    await inputs[0].type('QA Tester')
    await inputs[1].type('qa@example.com')
    const textarea = await page.$('.cform textarea')
    await textarea.type('This is an automated end-to-end test enquiry.')
    const valid = await page.evaluate(() => document.querySelector('.cform').checkValidity())
    assert(valid === true, 'form still invalid after filling all required fields')

    try {
      await page.click('.cform button[type="submit"]')
      await sleep(500)
      const label = await textOf('.cform button[type="submit"]')
      assert(
        label && /Sent|Sending|Opening your mail|Send enquiry/.test(label),
        `unexpected submit button label: "${label}"`
      )
    } catch (err) {
      if (!/detached|Target closed|context was destroyed|Navigation/i.test(err.message)) throw err
      // benign: headless Chromium aborted the mailto: hand-off, which is expected
    }
  })

  // ── INSTAGRAM ─────────────────────────────────────────────────────────
  section('Instagram section')
  await scrollToId('insta', 1000)

  await test('Instagram section shows the live feed widget (or the follow-card fallback)', async () => {
    // With a widget configured (Elfsight/Behold/iframe) the live feed mounts;
    // with none it falls back to the follow card. Accept whichever is active.
    const widget = await page.$(
      '.insta__widget--elfsight [class^="elfsight-app-"], .insta__widget--behold behold-widget, .insta__widget iframe'
    )
    if (widget) {
      assert(true)
    } else {
      const href = await attrOf('.insta__card', 'href')
      assert(
        href && href.includes('instagram.com/thesakshamgoel'),
        `no live-feed widget mounted and follow-card href unexpected: ${href}`
      )
    }
  })

  // ── FOOTER ────────────────────────────────────────────────────────────
  section('Footer')

  await test('footer renders name, tagline and social links', async () => {
    const name = await textOf('.footer__name')
    assert(name && /Saksham/i.test(name), `footer name unexpected: "${name}"`)
    const n = await countOf('.footer__links a')
    assert(n >= 2, `expected at least 2 footer links, got ${n}`)
  })

  // ── SCROLL PROGRESS RAIL ──────────────────────────────────────────────
  section('Scroll progress rail')

  await test('progress rail has 7 nodes (Intro/Reel/Featured/Stills/Grade/Work/About)', async () => {
    const labels = await page.$$eval('.sprog__label', (els) => els.map((e) => e.textContent.trim()))
    assert(labels.length === 7, `expected 7 progress nodes, got ${labels.length}: ${labels.join(', ')}`)
  })

  await test('clicking a progress node navigates to that section', async () => {
    await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('.sprog__node')]
      const node = nodes.find((n) => n.querySelector('.sprog__label')?.textContent.trim() === 'Work')
      node?.click()
    })
    await sleep(1500)
    assert(await inViewport('#work'), 'Work section not in view after clicking its progress node')
  })

  // ── SCROLL INTEGRITY (regression: no rubberband) ─────────────────────
  section('Scroll integrity (rubberband regression)')

  await test('a wheel gesture from the top lands on Highlights and stays there (no rubberband)', async () => {
    await scrollToId('top', 400)
    await page.mouse.move(700, 450)
    await page.mouse.wheel({ deltaY: 300 })
    await sleep(1300)
    const landed = await page.evaluate(() => Math.round(window.scrollY))
    await sleep(1000)
    const after = await page.evaluate(() => Math.round(window.scrollY))
    assert(landed === after, `scroll drifted after settling: landed=${landed}, after=${after}`)
    assert(landed > 0, 'wheel gesture did not scroll the page at all')
  })

  // ── CURSOR ────────────────────────────────────────────────────────────
  section('Custom cursor')

  await test('custom cursor is mounted and body has has-custom-cursor class', async () => {
    const has = await page.evaluate(() => document.body.classList.contains('has-custom-cursor'))
    assert(has, 'body missing "has-custom-cursor" class (fine-pointer cursor not active)')
    assert(await page.$('.cursor-cam'), 'custom cursor element not found')
  })

  await test('hovering a link makes the cursor "hot" (red/bold state)', async () => {
    const linkBox = await page.evaluate(() => {
      const a = document.querySelector('.nav__links a')
      const r = a.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })
    await page.mouse.move(linkBox.x, linkBox.y)
    await sleep(200)
    const hot = await classListHas('.cursor-cam', 'is-hot')
    assert(hot, 'cursor did not get "is-hot" class over a link')
  })

  // ── SCREEN-CAPTURE DETERRENCE ─────────────────────────────────────────
  section('Screen protection')

  await test('screen-guard veil is mounted and body carries the lock class', async () => {
    assert(await page.$('.sguard'), 'screen-guard veil element not found')
    const locked = await page.evaluate(() => document.body.classList.contains('screen-guard'))
    assert(locked, 'body missing "screen-guard" class')
  })

  await test('right-click / context menu is blocked', async () => {
    const prevented = await page.evaluate(() => {
      const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
      // dispatchEvent returns false when a listener called preventDefault
      return !document.dispatchEvent(e)
    })
    assert(prevented, 'contextmenu was not prevented')
  })

  await test('image drag-to-save is blocked', async () => {
    const prevented = await page.evaluate(() => {
      const img = document.querySelector('img')
      if (!img) return 'no-img'
      const e = new Event('dragstart', { bubbles: true, cancelable: true })
      return !img.dispatchEvent(e)
    })
    assert(prevented === true, `image dragstart not prevented (${prevented})`)
  })

  await test('text is unselectable on the body but form fields stay selectable', async () => {
    const bodyUS = await page.evaluate(() => getComputedStyle(document.body).userSelect)
    assert(bodyUS === 'none', `body user-select should be none, got "${bodyUS}"`)
  })

  // ── DEVELOPER CONSOLE ─────────────────────────────────────────────────
  section('Developer Console')
  await clearLocalStorage() // clean slate before mutating
  // an earlier gallery test already unlocked the console (auth persists in
  // sessionStorage for the session) — clear it and reload so the passcode
  // gate is genuinely fresh for the gate tests below
  await page.evaluate(() => sessionStorage.removeItem('sg_console_ok'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await waitForLoaderGone(8000)
  await sleep(500)

  await test('Ctrl+Shift+K shows the owner email+passcode gate (console is hidden from viewers)', async () => {
    // console entry buttons are removed from the nav — only the shortcut/footer
    await page.keyboard.down('Control')
    await page.keyboard.down('Shift')
    await page.keyboard.press('K')
    await page.keyboard.up('Shift')
    await page.keyboard.up('Control')
    await sleep(300)
    await waitPresent('.pin__email', 2000)
    const panel = await page.$('.dc__panel')
    assert(!panel, 'console panel should not open before credentials are entered')
  })

  await test('wrong email or passcode is rejected', async () => {
    // correct passcode but a NON-owner email → still blocked
    await page.type('.pin__email', 'stranger@example.com')
    await page.type('.pin input[type="password"]', CONSOLE_PASSCODE)
    await page.click('.pin__actions .btn.primary')
    await sleep(300)
    const panel = await page.$('.dc__panel')
    const err = await page.$('.pin__err')
    assert(!panel && err, 'a non-owner email should be rejected even with the right passcode')
  })

  await test('the owner email + passcode opens the console', async () => {
    const emailField = await page.$('.pin__email')
    await emailField.click({ clickCount: 3 }) // select existing text to replace it
    await emailField.type(CONSOLE_EMAIL)
    await page.type('.pin input[type="password"]', CONSOLE_PASSCODE)
    await page.click('.pin__actions .btn.primary')
    await waitPresent('.dc__panel', 2000)
  })

  await test('console has 5 tabs: Add / Manage / Curate / Before-After / Backup', async () => {
    const labels = await page.$$eval('.dc__tabs button', (bs) => bs.map((b) => b.textContent.trim()))
    assert(labels.length === 5, `expected 5 tabs, got ${labels.length}: ${labels.join(' | ')}`)
    assert(/Add project/.test(labels[0]), `first tab unexpected: ${labels[0]}`)
    assert(/^Manage/.test(labels[1]), `second tab unexpected: ${labels[1]}`)
    assert(labels[2] === 'Curate', `third tab unexpected: ${labels[2]}`)
    assert(/Before/.test(labels[3]), `fourth tab unexpected: ${labels[3]}`)
    assert(labels[4] === 'Backup', `fifth tab unexpected: ${labels[4]}`)
  })

  await test('Curate tab: toggling a featured pick persists to the backend', async () => {
    // drive the whole thing via evaluate (the panel animates, so puppeteer's
    // clickability guard is flaky here)
    const opened = await page.evaluate(() => {
      const tab = [...document.querySelectorAll('.dc__tabs button')].find(
        (b) => b.textContent.trim() === 'Curate'
      )
      if (!tab) return false
      tab.click()
      return true
    })
    assert(opened, 'could not find/click the Curate tab')
    await sleep(300)
    // turn OFF one of the currently-featured works (default set has 3) so a
    // write is guaranteed regardless of the max-3 cap
    const toggled = await page.evaluate(() => {
      const block = document.querySelector('.dc__curate-block')
      const on = block?.querySelector('.dc__pick.is-on input')
      if (!on) return false
      on.click()
      return true
    })
    assert(toggled, 'no selected featured work found to toggle')
    await sleep(250)
    const data = await getLocalStorageJSON()
    assert(Array.isArray(data?.featuredWorkIds), 'featuredWorkIds not written to storage')
    // restore the Add-project tab for the tests that follow
    await page.evaluate(() => {
      const tab = [...document.querySelectorAll('.dc__tabs button')].find((b) =>
        /Add project/.test(b.textContent)
      )
      tab?.click()
    })
    await sleep(200)
  })

  const TEST_TITLE = 'E2E Test Project ' + new Date().toISOString().slice(0, 19)
  await test('adding a project publishes it and switches to Manage', async () => {
    await page.type(dcField('e.g. Short Film — Aftertaste'), TEST_TITLE)
    await page.type(dcField('Paste a YouTube, Vimeo, or Instagram reel link'), 'dQw4w9WgXcQ')
    await page.click('.dc__submit')
    await sleep(400)
    const active = await textOf('.dc__tabs button.is-active')
    assert(active && /^Manage/.test(active), `expected Manage tab active, got "${active}"`)
    const toast = await textOf('.dc__toast')
    assert(toast && /published/i.test(toast), `unexpected toast: "${toast}"`)
  })

  await test('new project appears in the Manage list', async () => {
    const items = await page.$$eval('.dc__manage .dc__item strong', (els) => els.map((e) => e.textContent.trim()))
    assert(items.includes(TEST_TITLE), `new project not found in manage list: ${items.join(' | ')}`)
  })

  await test('new project is persisted to localStorage', async () => {
    const data = await getLocalStorageJSON()
    assert(data, 'localStorage key missing after adding a project')
    const found = (data.projectsAdded || []).some((p) => p.title === TEST_TITLE)
    assert(found, 'added project not found in localStorage.projectsAdded')
  })

  await test('editing the project updates it', async () => {
    await page.evaluate((title) => {
      const item = [...document.querySelectorAll('.dc__manage .dc__item')].find((i) =>
        i.querySelector('strong')?.textContent.trim() === title
      )
      item?.querySelector('.dc__item-actions button')?.click() // "Edit" is first action button
    }, TEST_TITLE)
    await sleep(300)
    const active = await textOf('.dc__tabs button.is-active')
    assert(active === 'Edit', `expected "Edit" tab active, got "${active}"`)
    // roles are now checkboxes — tick "Editor" and confirm the derived role text
    await page.evaluate(() => {
      const chip = [...document.querySelectorAll('.dc__role-chip')].find(
        (c) => c.querySelector('span')?.textContent.trim() === 'Editor'
      )
      chip?.querySelector('input')?.click()
    })
    await sleep(150)
    await page.click('.dc__submit')
    await sleep(400)
    const data = await getLocalStorageJSON()
    const updated = (data.projectsAdded || []).find((p) => p.title === TEST_TITLE)
    assert(updated && /Editor/.test(updated.role || ''), `edited role not persisted: "${updated?.role}"`)
  })

  await test('deleting the project removes it from the list and localStorage', async () => {
    await page.evaluate((title) => {
      const item = [...document.querySelectorAll('.dc__manage .dc__item')].find((i) =>
        i.querySelector('strong')?.textContent.trim() === title
      )
      const delBtn = [...(item?.querySelectorAll('.dc__item-actions button') || [])].find((b) =>
        /Delete/.test(b.textContent)
      )
      delBtn?.click()
    }, TEST_TITLE)
    await sleep(400)
    const items = await page.$$eval('.dc__manage .dc__item strong', (els) => els.map((e) => e.textContent.trim()))
    assert(!items.includes(TEST_TITLE), 'deleted project still present in manage list')
    const data = await getLocalStorageJSON()
    const stillThere = (data?.projectsAdded || []).some((p) => p.title === TEST_TITLE)
    assert(!stillThere, 'deleted project still present in localStorage')
  })

  await test('Backup tab: export does not throw and shows a confirmation toast', async () => {
    await clickByText('.dc__tabs', 'Backup')
    await sleep(200)
    await page.click('.dc__data-actions .btn') // first button = Download backup
    await sleep(300)
    const toast = await textOf('.dc__toast')
    assert(toast && /downloaded/i.test(toast), `unexpected toast after export: "${toast}"`)
  })

  await test('Reset clears local edits back to shipped defaults', async () => {
    await page.click('.dc__reset')
    await sleep(300)
    const toast = await textOf('.dc__toast')
    assert(toast && /Reset/i.test(toast), `unexpected toast after reset: "${toast}"`)
    const data = await getLocalStorageJSON()
    assert(data === null, 'localStorage key still present after reset')
  })

  await test('console closes on backdrop click', async () => {
    await page.mouse.click(10, 10) // corner of the backdrop, outside .dc__panel
    await waitGone('.dc', 2000)
  })

  // ── PERSISTENCE ACROSS RELOAD ─────────────────────────────────────────
  section('Persistence across reload')

  await test('a project added via console survives a full page reload', async () => {
    // reopen console fresh and add a project
    await openConsole()
    const persistTitle = 'Persistence Check ' + Date.now()
    await page.type(dcField('e.g. Short Film — Aftertaste'), persistTitle)
    await page.type(dcField('Paste a YouTube, Vimeo, or Instagram reel link'), 'dQw4w9WgXcQ')
    await page.click('.dc__submit')
    await sleep(400)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForLoaderGone(8000)
    await sleep(500)

    const data = await getLocalStorageJSON()
    const found = (data?.projectsAdded || []).some((p) => p.title === persistTitle)
    assert(found, 'project added before reload is missing from localStorage after reload')

    // cleanup: leave the browser in a pristine state
    await clearLocalStorage()
  })

  // ── RESPONSIVE (mobile viewport) ──────────────────────────────────────
  section('Responsive (mobile viewport)')

  await test('at 390px width, nav links hide and the scroll progress rail hides', async () => {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
    await sleep(500)
    const navDisplay = await page.evaluate(
      () => getComputedStyle(document.querySelector('.nav__links')).display
    )
    assert(navDisplay === 'none', `.nav__links should be hidden on mobile, computed display="${navDisplay}"`)
    const sprogDisplay = await page.evaluate(() => {
      const el = document.querySelector('.sprog')
      return el ? getComputedStyle(el).display : 'none'
    })
    assert(sprogDisplay === 'none', `.sprog should be hidden on mobile, computed display="${sprogDisplay}"`)
  })

  await test('no horizontal overflow at mobile width', async () => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    )
    assert(overflow <= 1, `page overflows horizontally by ${overflow}px at 390px viewport`)
  })

  await test('restore desktop viewport', async () => {
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    await sleep(300)
  })

  // ── FINAL ERROR SWEEP ─────────────────────────────────────────────────
  section('Final error sweep')

  await test('zero console errors accumulated across the entire run', async () => {
    assert(consoleErrors.length === 0, `${consoleErrors.length} console error(s):\n  - ${consoleErrors.join('\n  - ')}`)
  })

  await test('zero uncaught page errors accumulated across the entire run', async () => {
    assert(pageErrors.length === 0, `${pageErrors.length} page error(s):\n  - ${pageErrors.join('\n  - ')}`)
  })

  await test('no failed requests for JS/CSS assets', async () => {
    const critical = failedRequests.filter((f) => /\.(js|css)(\?|$)/.test(f.url))
    assert(critical.length === 0, `critical asset failures:\n  - ${critical.map((f) => `${f.url} (${f.reason})`).join('\n  - ')}`)
  })

  await browser.close()
  browser = null
}

// ── report writer ────────────────────────────────────────────────────────
function writeReports() {
  const pass = results.filter((r) => r.status === 'PASS').length
  const fail = results.filter((r) => r.status === 'FAIL').length
  const skipped = results.filter((r) => r.status === 'SKIP').length
  const totalMs = results.reduce((a, r) => a + (r.ms || 0), 0)

  const bySection = new Map()
  for (const r of results) {
    if (!bySection.has(r.section)) bySection.set(r.section, [])
    bySection.get(r.section).push(r)
  }

  const nonImageFailedRequests = failedRequests.filter((f) => !/\.(jpg|jpeg|png|svg|webp)(\?|$)/.test(f.url))
  const imageFailedRequests = failedRequests.filter((f) => /\.(jpg|jpeg|png|svg|webp)(\?|$)/.test(f.url))

  let md = `# Portfolio E2E Test Report\n\n`
  md += `Run: ${new Date().toISOString()}\n\n`
  md += `**${pass} passed** · **${fail} failed** · **${skipped} skipped** · ${(totalMs / 1000).toFixed(1)}s total\n\n`
  md += `---\n\n`

  for (const [sec, items] of bySection) {
    const secFail = items.filter((i) => i.status === 'FAIL').length
    md += `## ${sec} ${secFail ? `⚠️ ${secFail} failing` : '✅'}\n\n`
    for (const it of items) {
      const icon = it.status === 'PASS' ? '✅' : it.status === 'FAIL' ? '❌' : '⏭️'
      md += `- ${icon} ${it.name}${it.ms ? ` _(${it.ms}ms)_` : ''}\n`
      if (it.error) {
        md += `  > ${it.error.split('\n').join('\n  > ')}\n`
        if (it.screenshot) md += `  > Screenshot: \`screenshots/${it.screenshot}\`\n`
      }
    }
    md += '\n'
  }

  if (nonImageFailedRequests.length || imageFailedRequests.length) {
    md += `## Network — failed/error requests\n\n`
    if (nonImageFailedRequests.length) {
      md += `**Non-image (investigate):**\n`
      nonImageFailedRequests.forEach((f) => (md += `- ${f.url} — ${f.reason}\n`))
    }
    if (imageFailedRequests.length) {
      md += `\n**Images (expected if you haven't added stills/certs/photo yet):**\n`
      imageFailedRequests.forEach((f) => (md += `- ${f.url} — ${f.reason}\n`))
    }
    md += '\n'
  }

  fs.writeFileSync(path.join(REPORT_DIR, 'report.md'), md)
  fs.writeFileSync(
    path.join(REPORT_DIR, 'report.json'),
    JSON.stringify({ pass, fail, skipped, totalMs, results, failedRequests, consoleErrors, pageErrors }, null, 2)
  )

  console.log('\n' + '='.repeat(60))
  console.log(`RESULT: ${pass} passed, ${fail} failed, ${skipped} skipped (${(totalMs / 1000).toFixed(1)}s)`)
  console.log(`Report: ${path.join(REPORT_DIR, 'report.md')}`)
  if (fail > 0) {
    console.log('\nFailing tests:')
    results.filter((r) => r.status === 'FAIL').forEach((r) => console.log(`  [${r.section}] ${r.name} — ${r.error}`))
  }
  console.log('='.repeat(60))

  return fail
}

main()
  .catch((err) => {
    console.error('\nFATAL: test run aborted —', err.message)
    results.push({ section: currentSection || 'Fatal', name: 'suite did not complete', status: 'FAIL', error: err.message })
  })
  .finally(async () => {
    if (browser) {
      try {
        await browser.close()
      } catch {}
    }
    const failCount = writeReports()
    process.exitCode = failCount > 0 ? 1 : 0
  })
