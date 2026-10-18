import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Nav from './components/Nav'
import Hero from './sections/Hero'
import Highlights from './sections/Highlights'
import Work from './sections/Work'
import About from './sections/About'
import Footer from './components/Footer'
import Lightbox from './components/Lightbox'
import Loader from './components/Loader'
import Cursor from './components/Cursor'
import ToastViewport from './components/Toast'
import ScreenGuard from './components/ScreenGuard'
import FilmHUD from './components/FilmHUD'
import InstaFeed from './components/InstaFeed'
import ScrollProgress from './components/ScrollProgress'
import MobileTabBar from './components/MobileTabBar'
import ConsolePin from './console/ConsolePin'
import CategoryGallery from './components/CategoryGallery'
import { usePortfolio } from './data/store'
import { thumbFor } from './data/media'
import { firebaseEnabled } from './firebase/config'
import { watchOwner } from './firebase/auth'
import { useLenis } from './hooks/useLenis'
import ReelWall from './sections/ReelWall'
import GradeWheels from './sections/GradeWheels'
import Marquee from './sections/Marquee'
import FramesReel from './sections/FramesReel'
import Waveform from './components/Waveform'
import './App.css'

// Code-split the heavy bits so the hero content paints first.
const Scene3D = lazy(() => import('./three/Scene3D'))
const DevConsole = lazy(() => import('./console/DevConsole'))

export default function App() {
  const data = usePortfolio()
  const [loaded, setLoaded] = useState(false)
  // the 3D background boots a moment after the hero's intro, not on top of it
  const [scene, setScene] = useState(false)
  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => setScene(true), 1400)
    return () => clearTimeout(t)
  }, [loaded])
  const [lightbox, setLightbox] = useState(null)
  const [galleryCat, setGalleryCat] = useState(null)
  const [galleryOrigin, setGalleryOrigin] = useState({ x: 50, y: 50 })
  const [consoleOpen, setConsoleOpen] = useState(false)
  // Firebase: owner Google-auth state. Fallback: session passcode unlock.
  const [ownerAuthed, setOwnerAuthed] = useState(false)
  const [passAuthed, setPassAuthed] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sg_console_ok') === '1'
  )
  const consoleAuthed = firebaseEnabled ? ownerAuthed : passAuthed

  useEffect(() => watchOwner((user) => setOwnerAuthed(!!user)), [])
  // "Get in touch" asks the About section to open a specific contact tab.
  // The bumping nonce makes repeat clicks re-trigger the switch.
  const [contactReq, setContactReq] = useState({ tab: 'review', n: 0 })

  const openCategory = useCallback((id, origin) => {
    if (origin) setGalleryOrigin(origin)
    setGalleryCat(id)
  }, [])

  const snapIds = useMemo(() => ['top', 'highlights', 'grade', 'work'], [])
  // film frames for the loader's reel tunnel (small thumbnails, fast to fetch)
  const loaderThumbs = useMemo(
    () => data.projects.filter((p) => p.category === 'film').slice(0, 14).map((p) => thumbFor(p)),
    [data.projects]
  )
  // the one text divider carries the whole trail
  const marqueeC = useMemo(() => ['Light', 'Story', 'Shoot', 'Editing', 'VFX', 'Sound', 'DI', 'Grade', 'Deliver'], [])
  const progressSections = useMemo(
    () => [
      { id: 'top', label: 'Intro' },
      { id: 'reelwall', label: 'The reel' },
      { id: 'highlights', label: 'Featured' },
      { id: 'frames', label: 'Stills' },
      { id: 'grade', label: 'The grade' },
      { id: 'work', label: 'Work' },
      { id: 'about', label: 'About' },
    ],
    []
  )
  const paused = !!(galleryCat || lightbox || consoleOpen)
  const { scrollToId, indexRef } = useLenis(loaded, paused)

  // section titles reveal as they enter the viewport
  useEffect(() => {
    if (!loaded) return
    document.documentElement.classList.add('js-reveal')
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('is-in'), io.unobserve(e.target))),
      { threshold: 0.2 }
    )
    const scan = () => document.querySelectorAll('.section-title:not(.is-in)').forEach((el) => io.observe(el))
    scan()
    const t = setInterval(scan, 1500) // catches titles mounted later (galleries, tabs)
    return () => {
      clearInterval(t)
      io.disconnect()
      document.documentElement.classList.remove('js-reveal')
    }
  }, [loaded])

  // lock the page + custom scroll while the loader is up
  useEffect(() => {
    document.documentElement.style.overflow = loaded ? '' : 'hidden'
  }, [loaded])

  // flag the body so mobile-only layout (footer bottom-padding) can make room
  // for the fixed bottom tab bar
  useEffect(() => {
    document.body.classList.add('has-mobile-tabs')
    return () => document.body.classList.remove('has-mobile-tabs')
  }, [])

  // Open the console with Ctrl/Cmd + Shift + K or the #console hash
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setConsoleOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    if (window.location.hash === '#console') setConsoleOpen(true)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Escape closes only the topmost overlay — lightbox, then gallery, then
  // console — rather than every open component independently listening and
  // all closing at once.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (lightbox) setLightbox(null)
      else if (galleryCat) setGalleryCat(null)
      else if (consoleOpen) setConsoleOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, galleryCat, consoleOpen])

  const navigate = useCallback(
    (id) => {
      // map nav ids onto real sections; category links open the gallery
      if (['film', 'graphics'].includes(id)) {
        openCategory(id)
      } else if (id === 'contact') {
        // "Get in touch" → the Reviews (testimonials) block in About — a couple
        // of scrolls above the contact form — and pre-select the "Leave a
        // Review" tab on the form below it. Enter tail free-scroll first so the
        // wheel handler doesn't snap back after the smooth scroll.
        setGalleryCat(null)
        setContactReq((r) => ({ tab: 'review', n: r.n + 1 }))
        const el = document.getElementById('reviews') || document.getElementById('contact')
        if (el) {
          if (indexRef) indexRef.current = snapIds.length
          scrollToId(el.id)
        } else {
          scrollToId('about')
        }
      } else {
        setGalleryCat(null)
        scrollToId(id)
      }
    },
    [scrollToId, indexRef, snapIds]
  )

  return (
    <>
      {!loaded && <Loader name={data.profile.name} thumbs={loaderThumbs} onDone={() => setLoaded(true)} />}

      <Cursor />
      <ToastViewport />
      <ScreenGuard />
      {loaded && <FilmHUD />}
      {loaded && <ScrollProgress sections={progressSections} onNavigate={navigate} />}

      {/* the 3D background starts after the loader, so the two never compete */}
      {scene && (
        <Suspense fallback={null}>
          <Scene3D />
        </Suspense>
      )}
      <div className="aurora" aria-hidden="true" />

      <div id="top" className="app">
        <Nav
          name={data.profile.name}
          onOpenConsole={() => setConsoleOpen(true)}
          onNavigate={navigate}
        />

        <main className={loaded ? 'main--in' : 'main--pre'}>
          <Hero profile={data.profile} onExplore={() => scrollToId('highlights')} />

          <ReelWall projects={data.projects} onOpenProject={(p) => setLightbox(p)} />

          <Highlights
            projects={data.featuredProjects}
            onOpenProject={(p) => setLightbox(p)}
          />

          <Waveform variant="bars" label="Dialogue · Score · Foley" />

          <FramesReel stills={data.stills} onOpenImage={(img) => setLightbox(img)} />

          <GradeWheels comparisons={data.comparisons} onOpenImage={(img) => setLightbox(img)} />

          <Marquee words={marqueeC} reverse />

          <Work
            categories={data.categories}
            projects={data.projects}
            onOpenCategory={openCategory}
          />

          <Waveform variant="mesh" />

          <About
            profile={data.profile}
            certificates={data.certificates}
            experiences={data.experiences}
            reviews={data.displayReviews}
            contactReq={contactReq}
            onViewImage={(img) => setLightbox(img)}
          />

          <InstaFeed profile={data.profile} />
        </main>

        <Footer profile={data.profile} onOpenConsole={() => setConsoleOpen(true)} />
      </div>

      {loaded && <MobileTabBar galleryCat={galleryCat} onNavigate={navigate} />}

      <AnimatePresence>
        {galleryCat && (
          <CategoryGallery
            key={galleryCat}
            categoryId={galleryCat}
            categories={data.categories}
            projects={data.projects}
            origin={galleryOrigin}
            onClose={() => setGalleryCat(null)}
            onOpenProject={(p) => setLightbox(p)}
          />
        )}
      </AnimatePresence>

      {lightbox && <Lightbox project={lightbox} onClose={() => setLightbox(null)} />}

      {consoleOpen &&
        (consoleAuthed ? (
          <Suspense fallback={null}>
            <DevConsole data={data} onClose={() => setConsoleOpen(false)} />
          </Suspense>
        ) : (
          <ConsolePin
            pin={data.profile.consolePin || 'saksham26'}
            email={data.profile.consoleEmail || data.profile.email}
            onOk={() => {
              setPassAuthed(true)
              try {
                sessionStorage.setItem('sg_console_ok', '1')
              } catch {}
            }}
            onClose={() => setConsoleOpen(false)}
          />
        ))}
    </>
  )
}
