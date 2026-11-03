import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Reveal from '../components/Reveal'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { thumbHiFor, thumbFallbackFor } from '../data/media'
import { useImgFallback } from '../hooks/useImgFallback'
import { useLetterbox, letterboxCrop } from '../hooks/useLetterbox'
import { emailEnabled, sendEmail } from '../data/email'
import { toast } from '../components/Toast'
import { firebaseEnabled } from '../firebase/config'
import { watchUser, signInVisitor, signOutUser } from '../firebase/auth'
import './About.css'
import { asset } from '../data/asset'

function Chapter({ no, title, children }) {
  return (
    <div className="chapter">
      <Reveal>
        <div className="chapter__head">
          {no && <span className="chapter__no">{no}</span>}
          <h3 className="chapter__title">{title}</h3>
          <motion.span
            className="chapter__rule"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: '0 50%' }}
          />
        </div>
      </Reveal>
      {children}
    </div>
  )
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }

/**
 * The opener: the portrait is exposed out of the page's own dark, low-key and
 * black and white, one soft light on the face. It has real transparency, so
 * there is no black shape of its own: it fades in, holds, and fades back out
 * into the page as you scroll on.
 */
function PortraitIntro({ profile, reduced }) {
  const ref = useRef(null)
  const [ok, setOk] = useState(true)
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const expose = useTransform(p, [0.18, 0.5, 0.8, 0.98], [0, 1, 1, 0])
  const scale = useTransform(p, [0.18, 0.8], [1.08, 1])
  const bioO = useTransform(p, [0.5, 0.64, 0.8, 0.95], [0, 1, 1, 0])
  const bioY = useTransform(p, [0.5, 0.64], [14, 0])
  const src = profile.photoLowkey || asset('/photo-lowkey.webp')
  return (
    <div className="ap" ref={ref}>
      <div className="ap__pin">
        <motion.div className="ap__photo" style={reduced ? undefined : { opacity: expose, scale }}>
          {ok ? (
            <img src={src} alt={`Portrait of ${profile.name}`} onError={() => setOk(false)} decoding="async" />
          ) : (
            <div className="ap__ph" aria-hidden="true" />
          )}
        </motion.div>
        <motion.div className="ap__bio" style={reduced ? undefined : { opacity: bioO, y: bioY }}>
          <h2 className="ap__name">{profile.name}</h2>
          <p>Cinematographer, colorist and designer</p>
        </motion.div>
      </div>
    </div>
  )
}

// experience as a filmography: year, project, role; the heading stays the
// largest thing on screen and each row reads in one line
function Credits({ experiences }) {
  return (
    <ol className="exp">
      {experiences.map((e) => {
        const [role, project] = e.role.split(/\s+—\s+/)
        return (
          <motion.li
            key={e.id}
            className="exp__row"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8% 0px' }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          >
            <span className="exp__year">{e.period}</span>
            <span className="exp__main">
              <span className="exp__title">{(project || role).replace(/["“”]/g, '')}</span>
              <span className="exp__role">{project ? role : e.org}</span>
            </span>
            <span className="exp__org">
              {project ? e.org : ''}
              {e.highlight && <b>{e.highlight}</b>}
            </span>
          </motion.li>
        )
      })}
    </ol>
  )
}

/**
 * Credentials: large prints in a grid, each with its caption underneath.
 * Tap or click one to see it full size.
 */
function CertGrid({ certificates, onView }) {
  return (
    <ul className="certs2">
      {certificates.map((c, i) => (
        <CertPrint key={c.id} c={c} i={i} onView={onView} />
      ))}
    </ul>
  )
}
function CertPrint({ c, i, onView }) {
  const [imgOk, setImgOk] = useState(true)
  const hasImg = c.image && imgOk
  return (
    <motion.li
      className="certs2__item"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: [0.23, 1, 0.32, 1] }}
    >
      <button
        type="button"
        className="certs2__print"
        onClick={() => hasImg && onView(c)}
        aria-label={`View ${c.title}, ${c.issuer}, ${c.year}`}
      >
        {hasImg ? (
          <img src={c.image} alt="" onError={() => setImgOk(false)} loading="lazy" decoding="async" />
        ) : (
          <span className="certs2__blank" />
        )}
      </button>
      <div className="certs2__cap">
        <b>{c.title}</b>
        <span>{c.issuer} · {c.year}</span>
      </div>
    </motion.li>
  )
}

// a heading whose letters rise out of a mask when it comes into view
function RollIn({ text, as: Tag = 'h4', className }) {
  return (
    <Tag className={className} aria-label={text}>
      {Array.from(text).map((ch, k) => (
        <span key={k} className="rollin" aria-hidden="true">
          <motion.span
            initial={{ y: '105%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, delay: k * 0.035, ease: [0.22, 1, 0.36, 1] }}
          >
            {ch === ' ' ? '\u00a0' : ch}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}

/**
 * Reviews as subtitles: a dark cinema screen, and each review arrives as the
 * subtitle line along its bottom, one at a time as you scroll.
 */
// the film a review is about, matched by the title quoted in its role
// Matches on the quoted title first, then on any film title that appears in
// the role or the quote. Reviews that name no film (a visitor's own review, or
// one whose wording differs) borrow one of the highlighted films in turn, so
// the screen always shows a picture and never an empty black frame.
function filmFor(r, projects, i = 0) {
  const films = (projects || []).filter((p) => p.mediaType !== 'image' && (p.youtubeId || p.vimeoId))
  const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
  const quoted = norm((/["“”]([^"“”]+)["“”]/.exec(r.role || '') || [])[1])
  if (quoted) {
    const exact = films.find((p) => norm(p.title) === quoted)
    if (exact) return exact
  }
  const hay = ' ' + norm(`${r.role} ${r.quote}`) + ' '
  const hit = films
    .filter((p) => norm(p.title).length > 3 && hay.includes(' ' + norm(p.title) + ' '))
    .sort((a, b) => b.title.length - a.title.length)[0]
  if (hit) return hit
  const pool = films.filter((p) => p.highlight || p.featured)
  const list = pool.length ? pool : films
  return list.length ? list[i % list.length] : null
}

function Subtitles({ reviews, projects, reduced }) {
  const ref = useRef(null)
  const n = reviews.length
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const cur = useTransform(p, (v) => {
    const raw = v * (n - 1)
    const base = Math.min(n - 1, Math.floor(raw))
    return base >= n - 1 ? n - 1 : base + smooth(0.4, 0.6, raw - base)
  })
  return (
    <div className="subs" id="reviews" ref={ref} style={reduced ? undefined : { height: `${(n * 0.7 + 1) * 100}vh` }}>
      <div className="subs__pin">
        <h3 className="subs__head">Kind words</h3>
        <div className="subs__screen">
          <span className="subs__tc" aria-hidden="true">SUBTITLES · EN</span>
          {reviews.map((r, i) => (
            <SubLine key={r.id} r={r} i={i} cur={cur} film={filmFor(r, projects, i)} reduced={reduced} />
          ))}
        </div>
      </div>
    </div>
  )
}
function SubLine({ r, i, cur, film, reduced }) {
  const o = useTransform(cur, (c) => 1 - smooth(0.2, 0.5, Math.abs(c - i)))
  const y = useTransform(cur, (c) => (i - c) * 16)
  const zoom = useTransform(cur, (c) => 1.08 - 0.08 * clamp01(c - i + 1))
  // films overlap through the change, so the screen never flashes black
  const filmO = useTransform(cur, (c) => 1 - smooth(0.5, 0.95, Math.abs(c - i)))
  const thumb = useImgFallback(film ? thumbHiFor(film) : '', film ? thumbFallbackFor(film) : '', film?.id)
  const src = thumb.broken ? '' : thumb.src
  const bars = useLetterbox(src)
  return (
    <>
    {film && !thumb.broken && (
      <motion.span className="subs__film" style={reduced ? undefined : { opacity: filmO, scale: zoom }}>
        <img src={src} alt="" decoding="async" onError={thumb.onError} style={letterboxCrop(bars)} />
      </motion.span>
    )}
    <motion.figure className="subs__line" style={reduced ? undefined : { opacity: o, y }}>
      <blockquote>{r.quote}</blockquote>
      <figcaption>
        {r.name} <span>{r.role}</span>
      </figcaption>
    </motion.figure>
    </>
  )
}

function ContactForm({ email, user }) {
  // prefilled from the visitor's Google account when they're signed in
  const [form, setForm] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    type: 'Narrative Short / Feature',
    budget: 'Under $2,000',
    timeline: 'Within 2 – 4 weeks',
    message: '',
  })
  const [sent, setSent] = useState(false)
  const [drafted, setDrafted] = useState(false)
  const [sending, setSending] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const mailtoFallback = () => {
    const subject = encodeURIComponent(`New enquiry — ${form.type} — ${form.name}`)
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nProject: ${form.type}\nBudget: ${form.budget}\nTimeline: ${form.timeline}\n\n${form.message}`
    )
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
  }
  const openDraft = () => {
    try {
      mailtoFallback()
    } catch {
      toast.error(
        `Couldn’t open your email app. Please send this enquiry directly to ${email}.`
      )
      return
    }
    setDrafted(true)
    toast.info(
      'Your email app opened with the message drafted — press Send there to finish.'
    )
  }
  const submit = async (e) => {
    e.preventDefault()
    if (emailEnabled) {
      setSending(true)
      try {
        await sendEmail({
          subject: `New enquiry — ${form.type} — ${form.name}`,
          from_name: form.name,
          replyto: form.email,
          Name: form.name,
          Email: form.email,
          Project: form.type,
          Budget: form.budget,
          Timeline: form.timeline,
          Brief: form.message,
        })
        setSent(true)
        toast.success('Enquiry sent — I’ll reply within 24–48h.')
      } catch {
        openDraft() // relay failed — still deliver via the mail client
      } finally {
        setSending(false)
      }
    } else {
      openDraft() // local mode — straight to the mail client
    }
  }
  return (
    <form className="cform" onSubmit={submit} aria-busy={sending || undefined}>
      <div className="cform__row">
        <label>
          <span>Name</span>
          <input required autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" />
        </label>
        <label>
          <span>Email</span>
          <input required type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@studio.com" />
        </label>
      </div>
      <label>
        <span>Project scope</span>
        <select value={form.type} onChange={(e) => set('type', e.target.value)}>
          <option>Commercial Trailer / Spot</option>
          <option>Official Music Video</option>
          <option>Documentary / Sports Feature</option>
          <option>Narrative Short / Feature</option>
          <option>Colour Grading &amp; Finishing</option>
          <option>Photo &amp; Graphics</option>
          <option>Other</option>
        </select>
      </label>
      <div className="cform__row">
        <label>
          <span>Budget</span>
          <select value={form.budget} onChange={(e) => set('budget', e.target.value)}>
            <option>Under $2,000</option>
            <option>$2,000 – $5,000</option>
            <option>$5,000 – $10,000</option>
            <option>$10,000+</option>
          </select>
        </label>
        <label>
          <span>Timeline</span>
          <select value={form.timeline} onChange={(e) => set('timeline', e.target.value)}>
            <option>Urgent (&lt; 1 week)</option>
            <option>Within 2 – 4 weeks</option>
            <option>1 – 2 months</option>
            <option>Flexible schedule</option>
          </select>
        </label>
      </div>
      <label>
        <span>Brief</span>
        <textarea required rows={4} value={form.message} onChange={(e) => set('message', e.target.value)} placeholder="Tell me about the project, timeline and budget…" />
      </label>
      <div className="cform__foot">
        <button className="btn primary" type="submit" disabled={sending || sent || drafted}>
          {sent ? 'Sent ✓' : drafted ? 'Draft opened' : sending ? 'Sending…' : 'Send enquiry'}
        </button>
        <span className="timecode">Replies within 24–48h</span>
      </div>
    </form>
  )
}

function ReviewForm({ email, user }) {
  const [form, setForm] = useState({
    name: user?.displayName || '',
    role: '',
    rating: 5,
    quote: '',
  })
  const [sent, setSent] = useState(false)
  const [drafted, setDrafted] = useState(false)
  const [sending, setSending] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const mailtoFallback = () => {
    const subject = encodeURIComponent(`New review — ${form.name}`)
    const stars = '★'.repeat(form.rating) + '☆'.repeat(5 - form.rating)
    const account = user?.email ? `\nGoogle account: ${user.email}` : ''
    const body = encodeURIComponent(
      `Name: ${form.name}\nRole / Project: ${form.role}\nRating: ${stars} (${form.rating}/5)${account}\n\n${form.quote}`
    )
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
  }
  const openDraft = () => {
    try {
      mailtoFallback()
    } catch {
      toast.error(
        `Couldn’t open your email app. Please send this review directly to ${email}.`
      )
      return
    }
    setDrafted(true)
    toast.info(
      'Your email app opened with the review drafted — press Send there to finish.'
    )
  }
  const submit = async (e) => {
    e.preventDefault()
    const stars = '★'.repeat(form.rating) + '☆'.repeat(5 - form.rating)
    if (emailEnabled) {
      setSending(true)
      try {
        const fields = {
          subject: `New review — ${form.name} (${form.rating}/5)`,
          from_name: form.name,
          Name: form.name,
          Role: form.role,
          Rating: `${stars} (${form.rating}/5)`,
          Review: form.quote,
        }
        if (user?.email) {
          // signed-in Google account — verified sender, reply straight to them
          fields.replyto = user.email
          fields['Google account'] = user.email
        }
        await sendEmail(fields)
        setSent(true)
        toast.success('Review sent — thank you!')
      } catch {
        openDraft() // relay failed — still deliver via the mail client
      } finally {
        setSending(false)
      }
    } else {
      openDraft() // local mode — straight to the mail client
    }
  }
  return (
    <form className="cform" onSubmit={submit} aria-busy={sending || undefined}>
      <div className="cform__row">
        <label>
          <span>Name</span>
          <input required autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" />
        </label>
        <label>
          <span>Role / Project</span>
          <input
            required
            autoComplete="organization"
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            placeholder="Director, 'Question Mark'"
          />
        </label>
      </div>
      <label>
        <span>Rating</span>
        <div className="cform__stars" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={form.rating === n}
              className={`cform__star ${n <= form.rating ? 'is-on' : ''}`}
              onClick={() => set('rating', n)}
            >
              ★
            </button>
          ))}
        </div>
      </label>
      <label>
        <span>Your review</span>
        <textarea
          required
          rows={4}
          value={form.quote}
          onChange={(e) => set('quote', e.target.value)}
          placeholder="What was it like working together?"
        />
      </label>
      <div className="cform__foot">
        <button className="btn primary" type="submit" disabled={sending || sent || drafted}>
          {sent ? 'Sent ✓' : drafted ? 'Draft opened' : sending ? 'Sending…' : 'Send review'}
        </button>
        <span className="timecode">Sent directly to Saksham</span>
      </div>
    </form>
  )
}

export default function About({
  profile,
  projects,
  certificates,
  experiences,
  reviews,
  contactReq,
  onViewImage,
}) {
  const reduced = useReducedMotion()
  const [formTab, setFormTab] = useState('project') // 'project' | 'review'

  // "Get in touch" (or any external request) can open a specific contact tab.
  useEffect(() => {
    if (contactReq?.n) setFormTab(contactReq.tab)
  }, [contactReq])

  // Visitor Google login. Viewing the site is always open; starting a project,
  // leaving a review, and seeing direct contact details require signing in.
  // Without Firebase configured there's no auth to check, so nothing is gated.
  const [user, setUser] = useState(null)
  const [authErr, setAuthErr] = useState('')
  useEffect(() => watchUser(setUser), [])
  const gated = firebaseEnabled && !user
  const doSignIn = async () => {
    setAuthErr('')
    try {
      await signInVisitor()
    } catch (e) {
      if (e?.message !== 'firebase-disabled')
        setAuthErr('Sign-in failed — please try again.')
    }
  }
  return (
    <section className="about" id="about">
      <PortraitIntro profile={profile} reduced={reduced} />

      <div className="container">
        <div className="about__block">
          <h3 className="about__h">Experience</h3>
          <Credits experiences={experiences} />
        </div>

        <div className="about__block">
          <h3 className="about__h">Credentials</h3>
          <CertGrid
            certificates={certificates}
            onView={(cert) => onViewImage?.({ title: cert.title, image: cert.image, mediaType: 'image' })}
          />
        </div>
      </div>

      <Subtitles reviews={reviews} projects={projects} reduced={reduced} />

      <div className="container">
        <Chapter no="" title="Start a project">
          <div className="contact" id="contact">
            <div className="contact__intro">
              <RollIn text="Let's roll." />
              <p>Available for cinematography, colour &amp; design work worldwide.</p>
              {!gated && (
                <>
                  <a href={`mailto:${profile.email}`} className="contact__email">
                    {profile.email}
                  </a>
                  {profile.phone && (
                    <a
                      href={`tel:${profile.phone.replace(/\s/g, '')}`}
                      className="contact__phone timecode"
                    >
                      {profile.phone}
                    </a>
                  )}
                </>
              )}
              <div className="contact__actions">
                {profile.cv && (
                  <a href={profile.cv} download className="btn">
                    Download CV
                  </a>
                )}
                {profile.instagram && (
                  <a href={profile.instagram} target="_blank" rel="noreferrer" className="btn">
                    @{profile.instagramHandle}
                  </a>
                )}
              </div>
            </div>

            <div className="contact__form-col">
              {gated ? (
                <div className="contact__gate">
                  <h4>Sign in to get in touch</h4>
                  <p>
                    Use your Google account to start a project or leave a
                    review — and to see direct contact details. Browsing the
                    portfolio never needs an account.
                  </p>
                  <button type="button" className="btn primary" onClick={doSignIn}>
                    Sign in with Google
                  </button>
                  {authErr && <span className="contact__gate-err">{authErr}</span>}
                </div>
              ) : (
                <>
                  {firebaseEnabled && user && (
                    <div className="contact__signed">
                      {user.photoURL && (
                        <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                      )}
                      <span>
                        Signed in as <strong>{user.displayName || user.email}</strong>
                      </span>
                      <button type="button" onClick={() => signOutUser()}>
                        Sign out
                      </button>
                    </div>
                  )}
                  <div className="cform__tabs" role="tablist">
                    <button
                      role="tab"
                      aria-selected={formTab === 'project'}
                      className={formTab === 'project' ? 'is-active' : ''}
                      onClick={() => setFormTab('project')}
                    >
                      Start a Project
                    </button>
                    <button
                      role="tab"
                      aria-selected={formTab === 'review'}
                      className={formTab === 'review' ? 'is-active' : ''}
                      onClick={() => setFormTab('review')}
                    >
                      Leave a Review
                    </button>
                  </div>
                  {formTab === 'project' ? (
                    <ContactForm key={user?.uid || 'anon'} email={profile.email} user={user} />
                  ) : (
                    <ReviewForm key={user?.uid || 'anon'} email={profile.email} user={user} />
                  )}
                </>
              )}
            </div>
          </div>
        </Chapter>
      </div>
    </section>
  )
}
