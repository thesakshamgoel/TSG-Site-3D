import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Reveal from '../components/Reveal'
import { emailEnabled, sendEmail } from '../data/email'
import { toast } from '../components/Toast'
import { firebaseEnabled } from '../firebase/config'
import { watchUser, signInVisitor, signOutUser } from '../firebase/auth'
import './About.css'

function Chapter({ no, title, children }) {
  return (
    <div className="chapter">
      <Reveal>
        <div className="chapter__head">
          <span className="chapter__no">{no}</span>
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

function CertCard({ cert, onView, i = 0 }) {
  const [imgOk, setImgOk] = useState(true)
  const hasImg = cert.image && imgOk
  return (
    <motion.button
      className={`cert glass ${hasImg ? 'cert--img' : ''}`}
      onClick={() => hasImg && onView(cert)}
      initial={{ opacity: 0, y: 40, rotateX: -24 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.8, delay: (i % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformPerspective: 900 }}
    >
      {hasImg && (
        <div className="cert__scan">
          <img src={cert.image} alt={cert.title} onError={() => setImgOk(false)} loading="lazy" />
        </div>
      )}
      <div className="cert__row">
        {!hasImg && <div className="cert__icon">🎖</div>}
        <div>
          <div className="cert__title">{cert.title}</div>
          <div className="cert__meta">
            {cert.issuer} · {cert.year}
          </div>
        </div>
      </div>
    </motion.button>
  )
}

// timeline whose gold line draws down with the scroll, entries sliding in
function Timeline({ experiences }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 55%'] })
  return (
    <ol className="timeline" ref={ref}>
      <motion.span className="timeline__draw" style={{ scaleY: scrollYProgress }} aria-hidden="true" />
      {experiences.map((e, i) => (
        <motion.li
          key={e.id}
          className="timeline__item"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="timeline__dot" />
          <div className="timeline__period timecode">{e.period}</div>
          <div className="timeline__role">
            {e.role}
            {e.highlight && <span className="timeline__badge">★ {e.highlight}</span>}
          </div>
          <div className="timeline__org">{e.org}</div>
          {e.detail && <p className="timeline__detail">{e.detail}</p>}
        </motion.li>
      ))}
    </ol>
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

// reviews: staggered rise, and the columns drift at different speeds
function Reviews({ reviews }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y0 = useTransform(scrollYProgress, [0, 1], [40, -40])
  const y1 = useTransform(scrollYProgress, [0, 1], [90, -60])
  const y2 = useTransform(scrollYProgress, [0, 1], [20, -20])
  const ys = [y0, y1, y2]
  return (
    <div className="reviews" id="reviews" ref={ref}>
      {reviews.map((r, i) => (
        <motion.div key={r.id} className="review__drift" style={{ y: ys[i % 3] }}>
          <motion.figure
            className="review glass"
            initial={{ opacity: 0, y: 50, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="review__quote">"</div>
            <blockquote>{r.quote}</blockquote>
            <figcaption>
              <span className="review__name">{r.name}</span>
              <span className="review__role">{r.role}</span>
            </figcaption>
          </motion.figure>
        </motion.div>
      ))}
    </div>
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
  certificates,
  experiences,
  reviews,
  contactReq,
  onViewImage,
}) {
  const [photoOk, setPhotoOk] = useState(true)
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
    <section className="about section" id="about">
      <div className="container">
        <Reveal>
          <div className="about__lead">
            <div className="about__lead-text">
              <span className="slate">End Credits</span>
              <h2 className="section-title">
                The person <span className="gradient-text">behind the lens.</span>
              </h2>
              <p className="section-sub">
                Experience, credentials, kind words, and a way to start a
                conversation.
              </p>
              {profile.bio && <p className="about__bio">{profile.bio}</p>}
            </div>
            <div className="about__portrait-wrap">
              <motion.div
                className="about__portrait"
                initial={{ clipPath: 'inset(100% 0% 0% 0% round 16px)' }}
                whileInView={{ clipPath: 'inset(0% 0% 0% 0% round 16px)' }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
              >
                {profile.photo && photoOk ? (
                  <motion.img
                    src={profile.photo}
                    alt={profile.name}
                    onError={() => setPhotoOk(false)}
                    initial={{ scale: 1.3 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                ) : (
                  <div className="about__portrait-ph">
                    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <rect x="3" y="6" width="18" height="13" rx="3" />
                      <circle cx="12" cy="12.5" r="3.3" />
                      <path d="M8 6l1.4-2h5.2L16 6" />
                    </svg>
                    <span>Add your portrait</span>
                    <span className="timecode">public/photo.jpg</span>
                  </div>
                )}
              </motion.div>
              <div className="about__portrait-card">
                <strong>{profile.name}</strong>
                <span>Filmmaker</span>
              </div>
            </div>
          </div>
        </Reveal>

        <Chapter no="01" title="Experience">
          <Timeline experiences={experiences} />
        </Chapter>

        <Chapter no="02" title="Credentials">
          <div className="certs">
            {certificates.map((c, i) => (
              <CertCard key={c.id} i={i} cert={c} onView={(cert) => onViewImage?.({ title: cert.title, image: cert.image, mediaType: 'image' })} />
            ))}
          </div>
        </Chapter>

        <Chapter no="03" title="Reviews">
          <Reviews reviews={reviews} />
        </Chapter>

        <Chapter no="04" title="Start a Project">
          <div className="contact" id="contact">
            <div className="contact__intro">
              <RollIn text="Let's roll." />
              <p>Available for cinematography, colour &amp; design work worldwide.</p>
              {gated ? (
                <button type="button" className="contact__locked" onClick={doSignIn}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <rect x="4" y="10" width="16" height="11" rx="2.5" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                  Sign in to view email &amp; phone
                </button>
              ) : (
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
                    ⬇ Download CV
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
