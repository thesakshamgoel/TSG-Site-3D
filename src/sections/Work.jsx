import { useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Reveal from '../components/Reveal'
import { projectsByCategory } from '../data/store'
import { thumbHiFor, thumbFallbackFor } from '../data/media'
import { useImgFallback } from '../hooks/useImgFallback'
import './Work.css'

// A project whose cover is a real uploaded photo (custom thumb or image post),
// as opposed to a bare YouTube/Vimeo video whose auto-thumbnail we'd rather
// not use as the big card artwork.
const hasRealPhoto = (p) => !!(p?.thumb || (p?.mediaType === 'image' && p?.image))

// pointer parallax only makes sense on true hover devices; on touch it
// "sticks" after a scroll and shifts the image off-centre
const canHover = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches

function Panel({ category, projects, active, dimmed, index, onHover, onLeave, onOpen }) {
  // Prefer an uploaded photo for the card artwork: featured-with-photo first,
  // then any project with a photo, then fall back to the old behaviour.
  const coverProject =
    projects.find((p) => p.featured && hasRealPhoto(p)) ||
    projects.find(hasRealPhoto) ||
    projects.find((p) => p.featured) ||
    projects[0]
  const cover = useImgFallback(thumbHiFor(coverProject), thumbFallbackFor(coverProject))
  const count = projects.length

  const onMove = (e) => {
    if (!canHover()) return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--px', `${((e.clientX - r.left) / r.width - 0.5) * 2}`)
    el.style.setProperty('--py', `${((e.clientY - r.top) / r.height - 0.5) * 2}`)
  }
  const resetParallax = (e) => {
    e.currentTarget.style.setProperty('--px', '0')
    e.currentTarget.style.setProperty('--py', '0')
  }
  const onMoveLeave = (e) => {
    resetParallax(e)
    onLeave()
  }
  const onTouchEnd = (e) => {
    // touch never fires mouseleave reliably — clear any stuck offset here
    resetParallax(e)
    onLeave()
  }

  const handleClick = () => {
    const r = document.getElementById(`panel-${category.id}`)?.getBoundingClientRect()
    const origin = r
      ? {
          x: ((r.left + r.width / 2) / window.innerWidth) * 100,
          y: ((r.top + r.height / 2) / window.innerHeight) * 100,
        }
      : { x: 50, y: 50 }
    onOpen(category.id, origin)
  }

  return (
    <motion.button
      id={`panel-${category.id}`}
      className={`panel ${active ? 'is-active' : ''} ${dimmed ? 'is-dimmed' : ''}`}
      onMouseEnter={onHover}
      onMouseLeave={onMoveLeave}
      onMouseMove={onMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onClick={handleClick}
      initial={{ opacity: 0, y: 60, rotateX: 8 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      transformTemplate={(_, generated) =>
        `rotateX(var(--panel-rx, 0deg)) rotateY(var(--panel-ry, 0deg)) ${
          generated === 'none' ? '' : generated
        }`.trim()
      }
    >
      <div className="panel__media">
        {!coverProject ? (
          <span className="panel__ph">{category.number}</span>
        ) : !cover.broken ? (
          <img src={cover.src} alt="" onError={cover.onError} loading="lazy" />
        ) : (
          <div className="panel__ph panel__ph--title">{coverProject.title}</div>
        )}
        <span className="panel__scan" />
        <span className="panel__grad" />
      </div>

      <div className="panel__content">
        <div className="panel__top">
          <span className="panel__no slate">Reel {category.number}</span>
          <span className="timecode">{count} projects</span>
        </div>

        <div className="panel__bottom">
          <h3 className="panel__title">{category.title}</h3>
          <p className="panel__tag">{category.tagline}</p>

          <ul className="panel__subs">
            {(category.subcats || []).map((s) => (
              <li key={s.id}>{s.label}</li>
            ))}
          </ul>

          <span className="panel__enter">
            Enter reel <span className="panel__arrow">→</span>
          </span>
        </div>
      </div>

      <span className="panel__ring" aria-hidden="true" />
    </motion.button>
  )
}

export default function Work({ categories, projects, onOpenCategory }) {
  const [hover, setHover] = useState(null)
  // the two reels slide in from opposite sides, tilted, and lock together
  // as the section reaches the middle of the screen
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const xL = useTransform(scrollYProgress, [0, 1], ['-22vw', '0vw'])
  const xR = useTransform(scrollYProgress, [0, 1], ['22vw', '0vw'])
  const rL = useTransform(scrollYProgress, [0, 1], [-7, 0])
  const rR = useTransform(scrollYProgress, [0, 1], [7, 0])
  const sc = useTransform(scrollYProgress, [0, 1], [0.82, 1])

  return (
    <section className="work section" id="work" ref={ref}>
      <div className="container">
        <Reveal>
          <div className="work__head">
            <span className="slate">Two Reels</span>
            <h2 className="section-title">
              Pick a reel, <span className="gradient-text">step inside.</span>
            </h2>
          </div>
        </Reveal>

        <div className="work__panels">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              className="work__slot"
              style={{ x: i % 2 ? xR : xL, rotate: i % 2 ? rR : rL, scale: sc }}
            >
            <Panel
              category={cat}
              index={i}
              projects={projectsByCategory(projects, cat.id)}
              active={hover === cat.id}
              dimmed={hover && hover !== cat.id}
              onHover={() => setHover(cat.id)}
              onLeave={() => setHover(null)}
              onOpen={onOpenCategory}
            />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
