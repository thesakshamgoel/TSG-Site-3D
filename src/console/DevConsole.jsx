import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  addProject,
  updateProject,
  deleteProject,
  exportLocal,
  importLocal,
  resetLocal,
  setComparisons,
  setDisplayReviews,
  setFeaturedWorks,
  addReview,
  deleteReview,
} from '../data/store'
import { thumbFor, thumbHiFor, parseVideoInput } from '../data/media'
import './DevConsole.css'

// ── ★ Featured: the films in the home "Highlighted work" reel ────────────
const KINDS = [
  ['all', 'All'],
  ['narrative', 'Short films'],
  ['commercial', 'Commercials'],
  ['music-video', 'Music videos'],
  ['reel', 'Reels'],
]
function FeaturedTab({ projects, current, showToast }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('all')
  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const slots = [0, 1, 2].map((i) => byId.get(current[i]) || null)
  const films = projects.filter(
    (p) =>
      (p.category === 'film' || p.mediaType === 'video') &&
      (kind === 'all' || p.subcategory === kind) &&
      (!q || p.title.toLowerCase().includes(q.toLowerCase()))
  )
  const save = (ids) => setFeaturedWorks(ids.filter(Boolean))
  const toggle = (id) => {
    if (current.includes(id)) return save(current.filter((x) => x !== id))
    if (current.length >= 3) return showToast('Three films are featured. Remove one first.')
    save([...current, id])
  }
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= current.length) return
    const next = [...current]
    ;[next[i], next[j]] = [next[j], next[i]]
    save(next)
  }
  return (
    <div className="dc__feat">
      <p className="dc__curate-hint">
        These three films open one after another in “Highlighted work” on the home page, in
        this order. Changes go live straight away.
      </p>
      <div className="dc__feat-slots">
        {slots.map((p, i) => (
          <div key={i} className={`dc__feat-slot ${p ? '' : 'is-empty'}`}>
            <span className="dc__feat-no">{String(i + 1).padStart(2, '0')}</span>
            {p ? (
              <>
                <img src={thumbHiFor(p)} alt="" onError={(e) => (e.currentTarget.src = thumbFor(p))} />
                <div className="dc__feat-meta">
                  <b>{p.title}</b>
                  <span>{p.role}</span>
                </div>
                <div className="dc__feat-actions">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${p.title} earlier`}>↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i >= current.length - 1} aria-label={`Move ${p.title} later`}>↓</button>
                  <button type="button" onClick={() => toggle(p.id)} aria-label={`Remove ${p.title}`}>✕</button>
                </div>
              </>
            ) : (
              <div className="dc__feat-meta">
                <b>Empty slot</b>
                <span>Pick a film below</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="dc__feat-bar">
        <input type="search" placeholder="Search films" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search films" />
        <div className="dc__feat-kinds">
          {KINDS.map(([id, label]) => (
            <button key={id} type="button" className={kind === id ? 'is-on' : ''} onClick={() => setKind(id)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="dc__feat-reset" onClick={() => save([])}>Use the default picks</button>
      </div>
      <div className="dc__feat-grid">
        {films.map((p) => {
          const at = current.indexOf(p.id)
          return (
            <button key={p.id} type="button" className={`dc__feat-film ${at >= 0 ? 'is-on' : ''}`} onClick={() => toggle(p.id)}>
              <img src={thumbFor(p)} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
              {at >= 0 && <span className="dc__feat-badge">{at + 1}</span>}
              <span className="dc__feat-title">{p.title}</span>
            </button>
          )
        })}
        {!films.length && <p className="dc__curate-hint">No films match.</p>}
      </div>
    </div>
  )
}

// role checkboxes → display text
const ROLE_OPTIONS = [
  { key: 'DOP', label: 'DoP' },
  { key: 'DI', label: 'DI' },
  { key: 'EDITOR', label: 'Editor' },
  { key: 'VFX', label: 'VFX' },
  { key: 'DIRECTION', label: 'Director' },
  { key: 'DIT', label: 'DIT' },
]

const EMPTY = {
  title: '',
  category: 'film',
  subcategory: '',
  mediaType: 'video',
  roles: [],
  year: '',
  youtubeId: '',
  image: '',
  thumb: '',
  tags: '',
  featured: false,
  award: false,
}

export default function DevConsole({ data, onClose }) {
  const { categories, projects, reviews } = data
  const [tab, setTab] = useState('add') // add | manage | grade | data
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [toast, setToast] = useState('')
  const [toastErr, setToastErr] = useState(false)
  const fileRef = useRef(null)

  // ── Before / After grading pairs (edited as a set, saved on demand) ──
  const [baDraft, setBaDraft] = useState(() =>
    (data.comparisons || []).map((c) => ({ ...c }))
  )
  const baIdc = useRef(0)
  const baSet = (idx, key, value) =>
    setBaDraft((list) => list.map((c, n) => (n === idx ? { ...c, [key]: value } : c)))
  const baAdd = () =>
    setBaDraft((list) =>
      list.length >= 6
        ? list
        : [...list, { id: `ba-new-${baIdc.current++}`, title: '', before: '', after: '' }]
    )
  const baRemove = (idx) => setBaDraft((list) => list.filter((_, n) => n !== idx))
  const baMove = (idx, dir) =>
    setBaDraft((list) => {
      const to = idx + dir
      if (to < 0 || to >= list.length) return list
      const next = list.slice()
      ;[next[idx], next[to]] = [next[to], next[idx]]
      return next
    })
  const baSave = () => {
    setComparisons(baDraft.filter((c) => c.before?.trim() || c.after?.trim()))
    showToast('Before / After saved ✓')
  }

  // ── Curate: featured works + display reviews (max 3 each, applied live) ──
  const currentFeatured = data.featuredWorkIds || (data.featuredProjects || []).map((p) => p.id)
  const currentDisplay = data.displayReviewIds || (data.displayReviews || []).map((r) => r.id)
  const toggleFeatured = (id) => {
    if (currentFeatured.includes(id)) setFeaturedWorks(currentFeatured.filter((x) => x !== id))
    else if (currentFeatured.length >= 3) showToast('Pick at most 3 featured works')
    else setFeaturedWorks([...currentFeatured, id])
  }
  const toggleDisplayReview = (id) => {
    if (currentDisplay.includes(id)) setDisplayReviews(currentDisplay.filter((x) => x !== id))
    else if (currentDisplay.length >= 3) showToast('Pick at most 3 reviews')
    else setDisplayReviews([...currentDisplay, id])
  }
  const [rev, setRev] = useState({ name: '', role: '', rating: 5, quote: '' })
  const submitNewReview = () => {
    if (!rev.name.trim() || !rev.quote.trim()) return showToast('Review needs a name and a quote')
    addReview({
      name: rev.name.trim(),
      role: rev.role.trim(),
      rating: rev.rating,
      quote: rev.quote.trim(),
    })
    setRev({ name: '', role: '', rating: 5, quote: '' })
    showToast('Review added ✓')
  }

  const showToast = (msg, isError = false) => {
    setToast(msg)
    setToastErr(isError)
    // no timers with Math.random; just clear on next action
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const activeCat = categories.find((c) => c.id === form.category)
  const subcats = activeCat?.subcats || []

  // switching category → default the subcategory to the first available one
  const setCategory = (id) => {
    const cat = categories.find((c) => c.id === id)
    setForm((f) => ({ ...f, category: id, subcategory: cat?.subcats?.[0]?.id || '' }))
  }

  const toggleRole = (key) =>
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(key)
        ? f.roles.filter((r) => r !== key)
        : [...f.roles, key],
    }))

  const rolesToText = (keys) =>
    ROLE_OPTIONS.filter((o) => keys.includes(o.key))
      .map((o) => o.label)
      .join(' · ')

  const buildPayload = () => {
    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const base = {
      title: form.title.trim(),
      category: form.category,
      subcategory: form.subcategory || undefined,
      mediaType: form.mediaType,
      role: rolesToText(form.roles),
      year: form.year.trim(),
      tags,
      featured: !!form.featured,
      award: !!form.award,
    }
    if (form.mediaType === 'image') {
      base.image = form.image.trim()
    } else {
      const { provider, id } = parseVideoInput(form.youtubeId)
      if (provider === 'vimeo') {
        base.provider = 'vimeo'
        base.vimeoId = id
      } else if (provider === 'instagram') {
        base.provider = 'instagram'
        base.instagramId = id
      } else {
        base.youtubeId = id
      }
      if (form.thumb.trim()) base.thumb = form.thumb.trim() // optional custom thumbnail
    }
    return base
  }

  const canSubmit =
    form.title.trim() &&
    (form.mediaType === 'image' ? form.image.trim() : form.youtubeId.trim())

  const submit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    const payload = buildPayload()
    try {
      if (editingId) {
        updateProject(editingId, payload)
        showToast('Project updated ✓')
      } else {
        addProject(payload)
        showToast('Project published ✓')
      }
      setForm(EMPTY)
      setEditingId(null)
      setTab('manage')
    } catch (err) {
      showToast('Save failed — ' + (err?.message || 'unknown error') + '. Try again.', true)
    }
  }

  const startEdit = (p) => {
    setEditingId(p.id)
    // best-effort: pre-check role boxes whose display text appears in the role
    const roleStr = p.role || ''
    const roles = ROLE_OPTIONS.filter((o) =>
      new RegExp(`\\b${o.label}\\b`, 'i').test(roleStr)
    ).map((o) => o.key)
    // reconstruct the generic video field from whichever provider it uses
    const videoInput =
      p.youtubeId ||
      (p.vimeoId ? `https://vimeo.com/${p.vimeoId}` : '') ||
      (p.instagramId ? `https://www.instagram.com/reel/${p.instagramId}/` : '')
    setForm({
      title: p.title || '',
      category: p.category || 'film',
      subcategory: p.subcategory || '',
      mediaType: p.mediaType || 'video',
      roles,
      year: p.year || '',
      youtubeId: videoInput,
      image: p.image || '',
      thumb: p.thumb || '',
      tags: (p.tags || []).join(', '),
      featured: !!p.featured,
      award: !!p.award,
    })
    setTab('add')
  }

  const remove = (p) => {
    deleteProject(p.id)
    showToast('Project removed')
  }

  const grouped = useMemo(() => {
    const g = {}
    for (const c of categories) g[c.id] = []
    for (const p of projects) (g[p.category] ||= []).push(p)
    return g
  }, [categories, projects])

  const doExport = () => {
    const blob = new Blob([exportLocal()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'portfolio-backup.json'
    a.click()
    URL.revokeObjectURL(url)
    showToast('Backup downloaded')
  }

  const doImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        importLocal(String(reader.result))
        showToast('Backup imported ✓')
      } catch {
        showToast('Import failed — invalid file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="dc" onClick={onClose}>
      <motion.aside
        className="dc__panel"
        onClick={(e) => e.stopPropagation()}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      >
        <header className="dc__head">
          <div>
            <h2>Developer Console</h2>
            <p>Publish and manage your work. Saved to this browser.</p>
          </div>
          <button className="dc__x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="dc__tabs">
          {[
            ['add', editingId ? 'Edit' : 'Add project'],
            ['manage', `Manage (${projects.length})`],
            ['featured', '★ Featured'],
            ['curate', 'Curate'],
            ['grade', 'Before / After'],
            ['data', 'Backup'],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? 'is-active' : ''}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {toast && (
          <div
            className={`dc__toast${toastErr ? ' dc__toast--err' : ''}`}
            role={toastErr ? 'alert' : 'status'}
            aria-atomic="true"
          >
            {toast}
          </div>
        )}

        <div className="dc__body">
          {tab === 'add' && (
            <form className="dc__form" onSubmit={submit}>
              {editingId && (
                <div className="dc__editing">
                  Editing an existing item ·{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null)
                      setForm(EMPTY)
                    }}
                  >
                    start new instead
                  </button>
                </div>
              )}

              <label>
                Title *
                <input
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. Short Film — Aftertaste"
                  required
                />
              </label>

              <div className="dc__row">
                <label>
                  Category
                  <select
                    value={form.category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.number} — {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Sub-category
                  <select
                    value={form.subcategory}
                    onChange={(e) => set('subcategory', e.target.value)}
                    disabled={!subcats.length}
                  >
                    <option value="">— none —</option>
                    {subcats.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Media type
                <select
                  value={form.mediaType}
                  onChange={(e) => set('mediaType', e.target.value)}
                >
                  <option value="video">Video (YouTube / Vimeo)</option>
                  <option value="image">Image (poster / logo / deck)</option>
                </select>
              </label>

              {form.mediaType === 'video' ? (
                <>
                  <label>
                    Video link (YouTube / Vimeo / Instagram) *
                    <input
                      value={form.youtubeId}
                      onChange={(e) => set('youtubeId', e.target.value)}
                      placeholder="Paste a YouTube, Vimeo, or Instagram reel link"
                    />
                    {form.youtubeId &&
                      (() => {
                        const { provider, id } = parseVideoInput(form.youtubeId)
                        return provider ? (
                          <span className="dc__hint">
                            {provider} · {id}
                          </span>
                        ) : (
                          <span className="dc__hint">unrecognised link</span>
                        )
                      })()}
                  </label>
                  <label>
                    Custom thumbnail URL (optional)
                    <input
                      value={form.thumb}
                      onChange={(e) => set('thumb', e.target.value)}
                      placeholder="Leave blank to auto-fetch from the video"
                    />
                  </label>
                </>
              ) : (
                <label>
                  Image URL *
                  <input
                    value={form.image}
                    onChange={(e) => set('image', e.target.value)}
                    placeholder="https://…/poster.jpg"
                  />
                </label>
              )}

              <div className="dc__field">
                <span className="dc__field-label">Your role</span>
                <div className="dc__roles">
                  {ROLE_OPTIONS.map((o) => (
                    <label key={o.key} className="dc__role-chip">
                      <input
                        type="checkbox"
                        checked={form.roles.includes(o.key)}
                        onChange={() => toggleRole(o.key)}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="dc__row">
                <label>
                  Year
                  <input
                    value={form.year}
                    onChange={(e) => set('year', e.target.value)}
                    placeholder="2026"
                  />
                </label>
                <label>
                  Tags (comma-separated)
                  <input
                    value={form.tags}
                    onChange={(e) => set('tags', e.target.value)}
                    placeholder="Narrative, Commercial"
                  />
                </label>
              </div>

              <label className="dc__check">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => set('featured', e.target.checked)}
                />
                Feature this (shows first, full-width — use for a showreel/reel)
              </label>

              <label className="dc__check">
                <input
                  type="checkbox"
                  checked={form.award}
                  onChange={(e) => set('award', e.target.checked)}
                />
                ★ Award-winning (adds a gold badge on the card)
              </label>

              {/* live preview */}
              {(form.youtubeId || form.image || form.thumb) && (
                <div className="dc__preview">
                  <span>Preview</span>
                  <img
                    src={
                      form.mediaType === 'image'
                        ? form.image
                        : form.thumb || thumbFor(buildPayload())
                    }
                    alt="preview"
                    onError={(e) => (e.currentTarget.style.opacity = 0.2)}
                  />
                </div>
              )}

              <button className="btn primary dc__submit" disabled={!canSubmit}>
                {editingId ? 'Save changes' : 'Publish project'}
              </button>
            </form>
          )}

          {tab === 'manage' && (
            <div className="dc__manage">
              {categories.map((c) => (
                <div key={c.id} className="dc__group">
                  <h4>
                    {c.number} · {c.title}{' '}
                    <span>{grouped[c.id]?.length || 0}</span>
                  </h4>
                  {(grouped[c.id] || []).map((p) => (
                    <div key={p.id} className="dc__item">
                      <img
                        src={thumbFor(p)}
                        alt=""
                        onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                      />
                      <div className="dc__item-info">
                        <strong>{p.title}</strong>
                        <span>
                          {p.role || '—'}
                          {p.featured ? ' · Featured' : ''}
                          {p._userAdded ? ' · added' : ''}
                        </span>
                      </div>
                      <div className="dc__item-actions">
                        <button onClick={() => startEdit(p)}>Edit</button>
                        <button
                          className="danger"
                          onClick={() => remove(p)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {(grouped[c.id] || []).length === 0 && (
                    <p className="dc__empty">Nothing here yet.</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'featured' && (
            <FeaturedTab projects={projects} current={currentFeatured} showToast={showToast} />
          )}

          {tab === 'curate' && (
            <div className="dc__curate">
              <div className="dc__curate-block">
                <h4>
                  Display reviews <span>{currentDisplay.length}/3</span>
                </h4>
                <p className="dc__curate-hint">
                  The three testimonials shown in the About section.
                </p>
                <div className="dc__pick-list dc__pick-list--reviews">
                  {reviews.map((r) => (
                    <label
                      key={r.id}
                      className={`dc__pick dc__pick--review ${
                        currentDisplay.includes(r.id) ? 'is-on' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={currentDisplay.includes(r.id)}
                        onChange={() => toggleDisplayReview(r.id)}
                      />
                      <div className="dc__pick-review">
                        <strong>{r.name}</strong>{' '}
                        <span className="dc__pick-role">{r.role}</span>
                        <p>{r.quote}</p>
                      </div>
                      {r._added && (
                        <button
                          type="button"
                          className="dc__pick-del"
                          onClick={(e) => {
                            e.preventDefault()
                            deleteReview(r.id)
                          }}
                          aria-label="Delete this review"
                        >
                          ✕
                        </button>
                      )}
                    </label>
                  ))}
                </div>

                <div className="dc__addrev">
                  <h5>Add a review</h5>
                  <p className="dc__curate-hint">
                    Paste in a testimonial (e.g. from an emailed submission), then
                    tick it above to display it.
                  </p>
                  <div className="dc__row">
                    <input
                      placeholder="Name"
                      value={rev.name}
                      onChange={(e) => setRev((v) => ({ ...v, name: e.target.value }))}
                    />
                    <input
                      placeholder="Role / project"
                      value={rev.role}
                      onChange={(e) => setRev((v) => ({ ...v, role: e.target.value }))}
                    />
                  </div>
                  <div className="dc__addrev-stars" role="radiogroup" aria-label="Rating">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        className={n <= rev.rating ? 'is-on' : ''}
                        onClick={() => setRev((v) => ({ ...v, rating: n }))}
                        aria-label={`${n} star${n > 1 ? 's' : ''}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="What was it like working together?"
                    rows={3}
                    value={rev.quote}
                    onChange={(e) => setRev((v) => ({ ...v, quote: e.target.value }))}
                  />
                  <button type="button" className="btn primary" onClick={submitNewReview}>
                    Add review
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'grade' && (
            <div className="dc__ba">
              <p className="dc__ba-intro">
                The home “Before / After” slider. Up to 6 pairs — each shows the
                graded <strong>After</strong> revealed over the ungraded{' '}
                <strong>Before</strong>. Paste image URLs or drop files at{' '}
                <code>public/beforeafter/</code> and reference them as{' '}
                <code>/beforeafter/name.jpg</code>.
              </p>

              {baDraft.map((c, idx) => (
                <div key={c.id} className="dc__ba-item">
                  <div className="dc__ba-item-head">
                    <strong>#{idx + 1}</strong>
                    <div className="dc__ba-reorder">
                      <button
                        type="button"
                        onClick={() => baMove(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => baMove(idx, 1)}
                        disabled={idx === baDraft.length - 1}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => baRemove(idx)}
                        aria-label="Remove pair"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <label>
                    Title
                    <input
                      value={c.title || ''}
                      onChange={(e) => baSet(idx, 'title', e.target.value)}
                      placeholder="e.g. The Chawl"
                    />
                  </label>
                  <div className="dc__row">
                    <label>
                      After (graded) URL
                      <input
                        value={c.after || ''}
                        onChange={(e) => baSet(idx, 'after', e.target.value)}
                        placeholder="/beforeafter/ba-1-after.jpg"
                      />
                    </label>
                    <label>
                      Before (ungraded) URL
                      <input
                        value={c.before || ''}
                        onChange={(e) => baSet(idx, 'before', e.target.value)}
                        placeholder="/beforeafter/ba-1-before.jpg"
                      />
                    </label>
                  </div>

                  {(c.after || c.before) && (
                    <div className="dc__ba-preview">
                      {c.before && (
                        <figure>
                          <img src={c.before} alt="" onError={(e) => (e.currentTarget.style.opacity = 0.15)} />
                          <figcaption>Before</figcaption>
                        </figure>
                      )}
                      {c.after && (
                        <figure>
                          <img src={c.after} alt="" onError={(e) => (e.currentTarget.style.opacity = 0.15)} />
                          <figcaption>After</figcaption>
                        </figure>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="dc__ba-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={baAdd}
                  disabled={baDraft.length >= 6}
                >
                  + Add pair {baDraft.length >= 6 ? '(max 6)' : ''}
                </button>
                <button type="button" className="btn primary" onClick={baSave}>
                  Save Before / After
                </button>
              </div>
            </div>
          )}

          {tab === 'data' && (
            <div className="dc__data">
              <p>
                Your added projects and edits live in this browser's
                localStorage. Back them up here so you can restore them on
                another device — or keep them safe before clearing your browser.
              </p>
              <div className="dc__data-actions">
                <button className="btn" onClick={doExport}>
                  ⬇ Download backup
                </button>
                <button className="btn" onClick={() => fileRef.current?.click()}>
                  ⬆ Import backup
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={doImport}
                />
              </div>
              <button
                className="dc__reset"
                onClick={() => {
                  resetLocal()
                  showToast('Reset to default content')
                }}
              >
                Reset everything to the shipped default content
              </button>

              <div className="dc__note">
                <strong>Want visitors on every device to see your
                additions?</strong>
                <p>
                  Switch the data layer to a free cloud backend later — only
                  <code> src/data/store.js </code> needs to change. See the
                  README.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </div>
  )
}
