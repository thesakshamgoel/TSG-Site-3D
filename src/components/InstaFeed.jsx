import { useEffect, useRef, useState } from 'react'
import './InstaFeed.css'

/**
 * Instagram strip. If a widget embed URL is provided (LightWidget / Behold /
 * SnapWidget), it shows a LIVE feed in an iframe. Otherwise it shows a styled
 * follow card — a true live feed needs a widget/API, which those services give
 * for free (paste the URL into PROFILE.instagramWidget).
 */
export default function InstaFeed({ profile }) {
  const handle = profile.instagramHandle || 'instagram'

  // Load the right widget script once. Behold uses a web component; iframe
  // widgets (SnapWidget / LightWidget-paid) need no script but LightWidget's
  // auto-resize helper is loaded when its URL is used.
  const rootRef = useRef(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = rootRef.current
    if (!el || !window.IntersectionObserver) return setNear(true)
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect() } }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    // third-party widget scripts load only when the feed is about to be seen
    if (!near) return
    if (profile.instagramElfsight && !document.querySelector('script[data-elfsight]')) {
      const s = document.createElement('script')
      s.src = 'https://elfsightcdn.com/platform.js'
      s.async = true
      s.setAttribute('data-elfsight', '1')
      document.body.appendChild(s)
    }
    if (profile.instagramBehold && !document.querySelector('script[data-behold]')) {
      const s = document.createElement('script')
      s.src = 'https://w.behold.so/widget.js'
      s.type = 'module'
      s.async = true
      s.setAttribute('data-behold', '1')
      document.body.appendChild(s)
    }
    if (
      profile.instagramWidget &&
      /lightwidget/.test(profile.instagramWidget) &&
      !document.querySelector('script[data-lightwidget]')
    ) {
      const s = document.createElement('script')
      s.src = 'https://cdn.lightwidget.com/widgets/lightwidget.js'
      s.async = true
      s.setAttribute('data-lightwidget', '1')
      document.body.appendChild(s)
    }
  }, [profile.instagramElfsight, profile.instagramBehold, profile.instagramWidget, near])

  return (
    <section className="insta section" id="insta">
      <div className="container">
        <div className="insta__head">
          <span className="slate">On the Grid</span>
          <h2 className="section-title">
            Latest from <span className="gradient-text">@{handle}</span>
          </h2>
        </div>

        {profile.instagramElfsight ? (
          <div className="insta__widget insta__widget--elfsight">
            <span className="perf-row insta__perf" aria-hidden="true" />
            <div
              className={`elfsight-app-${profile.instagramElfsight}`}
              data-elfsight-app-lazy=""
            />
            {/* Scroll shield: embedded feeds can swallow the wheel and trap the
                page scroll. This transparent layer keeps the page scrolling and
                sends a click straight to the Instagram profile. */}
            <a
              className="insta__shield"
              href={profile.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open @${handle} on Instagram`}
            />
            <span className="perf-row insta__perf" aria-hidden="true" />
          </div>
        ) : profile.instagramBehold ? (
          <div className="insta__widget insta__widget--behold">
            <span className="perf-row insta__perf" aria-hidden="true" />
            <behold-widget feed-id={profile.instagramBehold} />
            <span className="perf-row insta__perf" aria-hidden="true" />
          </div>
        ) : profile.instagramWidget ? (
          <div className="insta__widget">
            <span className="perf-row insta__perf" aria-hidden="true" />
            <iframe
              src={profile.instagramWidget}
              title={`Instagram feed — @${handle}`}
              className="lightwidget-widget"
              scrolling="no"
              allowtransparency="true"
            />
            <span className="perf-row insta__perf" aria-hidden="true" />
          </div>
        ) : (
          <a
            className="insta__card glass"
            href={profile.instagram}
            target="_blank"
            rel="noreferrer"
          >
            <div className="insta__glyph" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div className="insta__card-text">
              <strong>Follow @{handle}</strong>
              <span>Behind-the-scenes, frames &amp; reels — updated daily.</span>
            </div>
            <span className="insta__go">Open Instagram →</span>
          </a>
        )}
      </div>
    </section>
  )
}
