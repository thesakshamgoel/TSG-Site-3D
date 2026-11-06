import { asset } from './asset'
/**
 * SEED DATA — the shared, public default content every visitor sees.
 * Edit this file (then redeploy) to change the baseline site for everyone.
 * The developer console layers local edits on top via localStorage.
 *
 * Two top-level categories, each sub-classified:
 *   01 Film / Video Production → narrative · reel · commercial · music-video
 *   02 Photo & Graphics        → logo · image · graphic
 *
 * Videos: set `youtubeId` (11-char id) OR provider:'vimeo' + `vimeoId`.
 * Thumbnails + embeds are derived automatically (see src/data/media.js).
 */

export const CATEGORIES = [
  {
    id: 'film',
    number: '01',
    title: 'Film / Video Production',
    tagline: 'Cinematography · Editing · DI',
    description:
      'Behind the camera and in the timeline — shooting, cutting and grading short films, commercials and music videos.',
    accent: '#e9b872',
    subcats: [
      { id: 'narrative', label: 'Narrative' },
      { id: 'reel', label: 'Reels' },
      { id: 'commercial', label: 'Commercials' },
      { id: 'music-video', label: 'Music Videos' },
    ],
  },
  {
    id: 'graphics',
    number: '02',
    title: 'Photo & Graphics',
    tagline: 'Logos · Images · Graphics',
    description:
      'Visual identity and layout — logo systems, photography and graphic design work.',
    accent: '#23c7c7',
    subcats: [
      { id: 'logo', label: 'Logos' },
      { id: 'image', label: 'Images' },
      { id: 'graphic', label: 'Graphics' },
    ],
  },
]

// ── project builders (keep the seed compact) ───────────────────────────────
const yt = (id, title, subcategory, extra = {}) => ({
  id: `film-${id}`,
  category: 'film',
  subcategory,
  mediaType: 'video',
  youtubeId: id,
  title,
  role: 'DoP · Editor · DI Artist',
  ...extra,
})
const vm = (id, title, subcategory, extra = {}) => ({
  id: `film-v${id}`,
  category: 'film',
  subcategory,
  mediaType: 'video',
  provider: 'vimeo',
  vimeoId: id,
  title,
  role: 'DoP · Editor · DI Artist',
  ...extra,
})

export const PROJECTS = [
  // ── 01 · FILM / VIDEO PRODUCTION ─────────────────────────────────────────
  // featured piece — award-winning short film
  yt('zZ2kurHSgzI', 'Supaari', 'narrative', {
    featured: true,
    award: true,
    role: 'DoP · Editor · DI Artist',
    tags: ['Short Film', 'Action'],
  }),
  yt('SKeM6ncjq2I', 'Charm of Cinematography', 'commercial', {
    role: 'Director · DoP · Editor · DI Artist',
    tags: ['Visual Experience'],
  }),

  // Short films (narrative)
  yt('iRlNM-tP0UA', 'Question Mark', 'narrative', { highlight: true, award: true, tags: ['Short Film'] }),
  yt('eiPDl-pBDK0', 'Anjaan', 'narrative', { award: true, tags: ['Short Film'] }),
  yt('aZyUnre6P-c', 'Paywat', 'narrative', { tags: ['Short Film'] }),
  yt('P00wFoAXCxk', 'Good News', 'narrative', { tags: ['Short Film'] }),
  yt('LyqcqK9bVA4', 'For These Are Your Sins', 'narrative', { tags: ['Short Film'] }),
  yt('_HE3d1wNVfA', 'Bahr', 'narrative', { award: true, tags: ['Short Film'] }),
  yt('Tgdba-p4lRo', 'Saanp Seedi', 'narrative', { tags: ['Short Film'] }),
  yt('rQFBpsqHCCM', 'Bekarar Karke Hume', 'narrative', { award: true, tags: ['Short Film'] }),
  yt('APuvw-bEZmU', 'Last Breath', 'narrative', { tags: ['Horror'] }),
  yt('orAXrJdr4jc', 'Parwah', 'narrative', { tags: ['Short Film'] }),
  yt('R78E534xcRg', 'Pados', 'narrative', { tags: ['Short Film'] }),
  yt('2mjchRGZ21w', 'Jo Guzar Gaya', 'narrative', { tags: ['Short Film'] }),
  yt('_4hG0wSAXoU', 'One Live One Blank', 'narrative', { tags: ['Short Film'] }),
  yt('1ZRo0NYj7GI', 'Pehlu', 'narrative', { tags: ['Short Film'] }),
  yt('99K7cE_tO_0', 'The Mirror', 'narrative', { tags: ['Short Film'] }),

  // Reels
  yt('b_b1zUJjjO4', 'Oregon Honey', 'reel', { tags: ['Reel'] }),
  yt('_XXG2blBFes', 'July Coffee Beans', 'reel', { tags: ['Reel'] }),
  yt('VdkY_xyT_wA', 'July — The Coffee', 'reel', { tags: ['Reel'] }),
  yt('N-YvGYHAZY4', "Nature's Basket", 'reel', { tags: ['Reel'] }),
  yt('oXQrsb0g8bA', 'Coffee Bar 2', 'reel', { tags: ['Reel'] }),
  yt('v_-ITtwvU-Q', 'Coffee Bar 1', 'reel', { tags: ['Reel'] }),
  yt('reLL1GgU1BQ', 'July Poster', 'reel', { tags: ['Reel'] }),
  yt('-K6Uurrkg8c', 'Al Fresco', 'reel', { tags: ['Reel'] }),

  // Commercials
  yt('0z4bdm26OjM', 'The Golden Cage', 'commercial', { tags: ['Commercial'] }),
  vm('1081046541', 'Aamchi Mumbai', 'commercial', { tags: ['Commercial'] }),
  yt('4MK1XkdF1bE', 'Select — Coffee or Tea', 'commercial', { tags: ['Commercial'] }),
  yt('R6dhyHhbBKg', 'Toyota Fortuner Legender', 'commercial', { tags: ['Automotive'] }),
  yt('5ySyAqFdXa0', 'Iss Holi Bura Manenge', 'commercial', { tags: ['Commercial'] }),
  yt('E3O0MEVAyGA', 'Routine Coffee', 'commercial', { tags: ['Observational'] }),
  vm('1081047127', 'Charm of Editing', 'commercial', { tags: ['Editing'] }),
  yt('hNc3PlSXk-k', 'Just Endure — Nike (Spec)', 'commercial', { tags: ['Spec Ad'] }),

  // Music videos
  yt('yv9y7f4v6Yc', 'Raat Ko Jaagoon', 'music-video', { highlight: true, tags: ['Music Video'] }),
  yt('3fNTMp8hbo8', 'Kahaani', 'music-video', { tags: ['Music Video'] }),
  yt('BpuHTL4sawk', 'Impression — Shalmali Kholgade', 'music-video', { tags: ['Music Video'] }),
  yt('ADhhRIkNcR8', 'Door Ja — Parvathy Naveen', 'music-video', { tags: ['Music Video'] }),
  yt('48NFDeX2eg0', 'I Got The Keys — Rex Meet', 'music-video', { tags: ['Music Video'] }),
  yt('zAm0H3AYpes', 'Kasar Na Chhodna', 'music-video', { award: true, tags: ['Music Video'] }),
  yt('ZLK2zrXfOXI', 'Ae Mere Watan', 'music-video', { tags: ['Music Video'] }),
  yt('EDG98qMv7YI', 'Communicate — Nakshtra', 'music-video', { tags: ['Music Video'] }),
  yt('2lghhduCf-E', 'Ishq Di Baajiyaan', 'music-video', { tags: ['Cover'] }),
  yt('VuXjbj4dtaY', 'Dil-e-Nadaan', 'music-video', { tags: ['Music Video'] }),
  yt('blPNRqXz4lA', 'Stratosphere', 'music-video', { tags: ['Music Video'] }),
  yt('jL8HQBH08dQ', 'Tere Bina — PaperParachute', 'music-video', { tags: ['Music Video'] }),

  // ── 02 · PHOTO & GRAPHICS ────────────────────────────────────────────────
  // Graphics — real graphic-design work, drop new files in public/graphics/graphics/
  {
    id: 'g-graphic-mun',
    category: 'graphics',
    subcategory: 'graphic',
    mediaType: 'image',
    title: 'MUN',
    role: 'Graphic Design',
    image: asset('/graphics/graphics/mun.jpg'),
    tags: ['Graphic'],
  },
  {
    id: 'g-graphic-solar',
    category: 'graphics',
    subcategory: 'graphic',
    mediaType: 'image',
    title: 'Solar',
    role: 'Graphic Design',
    image: asset('/graphics/graphics/solar.jpg'),
    tags: ['Graphic'],
  },
  // Logos — real work, drop new files in public/graphics/logos/
  {
    id: 'g-logo-saksham',
    category: 'graphics',
    subcategory: 'logo',
    mediaType: 'image',
    title: 'Saksham Goel — Brand Mark',
    role: 'Personal Brand Identity',
    image: asset('/graphics/logos/saksham-goel-mark.png'),
    tags: ['Logo', 'Brand Identity'],
  },
  {
    id: 'g-logo-navigoin-wordmark',
    category: 'graphics',
    subcategory: 'logo',
    mediaType: 'image',
    title: 'Navigoin — Wordmark',
    role: 'Logo Design',
    image: asset('/graphics/logos/navigoin-wordmark.png'),
    tags: ['Logo', 'Wordmark'],
  },
  {
    id: 'g-logo-navigoin-stacked',
    category: 'graphics',
    subcategory: 'logo',
    mediaType: 'image',
    title: 'Navigoin — Stacked',
    role: 'Logo Design',
    image: asset('/graphics/logos/navigoin-wordmark-stacked.png'),
    tags: ['Logo', 'Wordmark'],
  },
  {
    id: 'g-logo-navigoin-gradient',
    category: 'graphics',
    subcategory: 'logo',
    mediaType: 'image',
    title: 'Navigoin — Gradient Mark',
    role: 'Logo Design',
    image: asset('/graphics/logos/navigoin-gradient-mark.png'),
    tags: ['Logo', 'Icon'],
  },
  {
    id: 'g-logo-navigoin-badge',
    category: 'graphics',
    subcategory: 'logo',
    mediaType: 'image',
    title: 'Navigoin — Pin Badge',
    role: 'Logo Design',
    image: asset('/graphics/logos/navigoin-pin-badge.png'),
    tags: ['Logo', 'Badge'],
  },
  {
    id: 'g-logo-creators-paradise',
    category: 'graphics',
    subcategory: 'logo',
    mediaType: 'image',
    title: "Creator's Paradise",
    role: 'Logo Design',
    image: asset('/graphics/logos/creators-paradise.jpg'),
    tags: ['Logo'],
  },
  {
    id: 'g-logo-rgc',
    category: 'graphics',
    subcategory: 'logo',
    mediaType: 'image',
    title: 'RGC',
    role: 'Logo Design',
    image: asset('/graphics/logos/rgc.jpg'),
    tags: ['Logo'],
  },
  {
    id: 'g-logo-collection',
    category: 'graphics',
    subcategory: 'logo',
    mediaType: 'image',
    title: 'Logo Collection',
    role: 'Logo Design',
    image: asset('/graphics/logos/logo-collection.png'),
    tags: ['Logo'],
  },
  {
    id: 'g-logo-clr',
    category: 'graphics',
    subcategory: 'logo',
    mediaType: 'image',
    title: 'Logo — Colour Study',
    role: 'Logo Design',
    image: asset('/graphics/logos/logo-clr.png'),
    tags: ['Logo'],
  },
  {
    id: 'g-logo-detail',
    category: 'graphics',
    subcategory: 'logo',
    mediaType: 'image',
    title: 'Logo — Detail',
    role: 'Logo Design',
    image: asset('/graphics/logos/logo-detail.png'),
    tags: ['Logo'],
  },
  {
    id: 'g-logo-presentation',
    category: 'graphics',
    subcategory: 'logo',
    mediaType: 'image',
    title: 'Logo Presentation',
    role: 'Logo Design',
    image: asset('/graphics/logos/logo-presentation.png'),
    tags: ['Logo'],
  },
  {
    id: 'g-logo-pen-mark',
    category: 'graphics',
    subcategory: 'logo',
    mediaType: 'image',
    title: 'Pen Mark',
    role: 'Logo Design',
    image: asset('/graphics/logos/pen-mark.webp'),
    tags: ['Logo'],
  },

  // Images — real work, drop new files in public/graphics/images/
  {
    id: 'g-image-studio',
    category: 'graphics',
    subcategory: 'image',
    mediaType: 'image',
    title: 'Studio',
    role: 'Photography',
    image: asset('/graphics/images/studio.jpg'),
    tags: ['Image'],
  },
  {
    id: 'g-image-outdoor',
    category: 'graphics',
    subcategory: 'image',
    mediaType: 'image',
    title: 'Outdoor',
    role: 'Photography',
    image: asset('/graphics/images/outdoor.jpg'),
    tags: ['Image'],
  },
  {
    id: 'g-image-spice',
    category: 'graphics',
    subcategory: 'image',
    mediaType: 'image',
    title: 'Spice',
    role: 'Photography',
    image: asset('/graphics/images/spice.jpg'),
    tags: ['Image'],
  },
  {
    id: 'g-image-sheernia',
    category: 'graphics',
    subcategory: 'image',
    mediaType: 'image',
    title: 'Sheernia',
    role: 'Photography',
    image: asset('/graphics/images/sheernia.jpg'),
    tags: ['Image'],
  },
  {
    id: 'g-image-wolf-scenery',
    category: 'graphics',
    subcategory: 'image',
    mediaType: 'image',
    featured: true,
    title: 'Wolf Scenery',
    role: 'Photography',
    image: asset('/graphics/images/wolf-scenery.jpg'),
    tags: ['Image'],
  },
  {
    id: 'g-image-rgc-wallpaper',
    category: 'graphics',
    subcategory: 'image',
    mediaType: 'image',
    title: 'RGC Wallpaper',
    role: 'Photography',
    image: asset('/graphics/images/rgc-wallpaper.jpg'),
    tags: ['Image'],
  },
  {
    id: 'g-image-informative',
    category: 'graphics',
    subcategory: 'image',
    mediaType: 'image',
    title: 'Informative',
    role: 'Photography',
    image: asset('/graphics/images/informative.jpg'),
    tags: ['Image'],
  },
  {
    id: 'g-image-02',
    category: 'graphics',
    subcategory: 'image',
    mediaType: 'image',
    title: 'Image 02',
    role: 'Photography',
    image: asset('/graphics/images/image-02.jpg'),
    tags: ['Image'],
  },
  {
    id: 'g-image-01',
    category: 'graphics',
    subcategory: 'image',
    mediaType: 'image',
    title: 'Untitled 01',
    role: 'Photography',
    image: asset('/graphics/images/untitled-01.jpg'),
    tags: ['Image'],
  },
]

// Certificates — real credentials, each openable (click → full view). The
// styled SVG stand-ins live in public/certificates/; overwrite any of them
// with a real scan (keep the filename, or update `image` here) to swap it.
export const CERTIFICATES = [
  {
    id: 'cert-wwi-degree',
    title: 'BSc. in Filmmaking',
    issuer: 'Whistling Woods International',
    year: '2025',
    image: asset('/certificates/cert-5.svg'),
  },
  {
    id: 'cert-freelance-colorist',
    title: 'Freelance Colorist',
    issuer: 'Online Course · Certificate of Completion',
    year: '2026',
    image: asset('/certificates/cert-4.svg'),
  },
  {
    id: 'cert-dolby-vision',
    title: 'Dolby Vision Essentials Training',
    issuer: 'Dolby Institute',
    year: '2025',
    image: asset('/certificates/cert-3.svg'),
  },
  {
    id: 'cert-bmd-grading',
    title: 'Color Grading with DaVinci Resolve 18',
    issuer: 'Blackmagic Design',
    year: '2023',
    image: asset('/certificates/cert-1.svg'),
  },
  {
    id: 'cert-bmd-intro',
    title: 'Introduction to DaVinci Resolve 18',
    issuer: 'Blackmagic Design',
    year: '2023',
    image: asset('/certificates/cert-2.svg'),
  },
]


// Latest stills for the home slideshow (max 5 shown). Drop your frames at
// public/stills/still-1.jpg … still-5.jpg (any aspect; they're letterboxed).
export const STILLS = [
  { id: 'still-1', image: asset('/stills/still-1.jpg'), title: 'Still 01' },
  { id: 'still-2', image: asset('/stills/still-2.jpg'), title: 'Still 02' },
  { id: 'still-3', image: asset('/stills/still-3.jpg'), title: 'Still 03' },
  { id: 'still-4', image: asset('/stills/still-4.jpg'), title: 'Still 04' },
  { id: 'still-5', image: asset('/stills/still-5.jpg'), title: 'Still 05' },
]

// Before / After grading comparisons for the home slider (max 6 pairs = 12
// images). `after` is the graded frame, `before` is the ungraded/original.
// Drop your images at public/beforeafter/ (any names) or paste URLs — and edit
// the whole set live from the developer console's "Before / After" tab.
export const COMPARISONS = [
  { id: 'ba-1', title: 'The Chawl', after: asset('/beforeafter/ba-1-after.jpg'), before: asset('/beforeafter/ba-1-before.jpg') },
  { id: 'ba-2', title: 'Night Street', after: asset('/beforeafter/ba-2-after.jpg'), before: asset('/beforeafter/ba-2-before.jpg') },
  { id: 'ba-3', title: 'The Living Room', after: asset('/beforeafter/ba-3-after.jpg'), before: asset('/beforeafter/ba-3-before.jpg') },
  { id: 'ba-4', title: 'The Gathering', after: asset('/beforeafter/ba-4-after.jpg'), before: asset('/beforeafter/ba-4-before.jpg') },
  { id: 'ba-5', title: 'The Bus', after: asset('/beforeafter/ba-5-after.jpg'), before: asset('/beforeafter/ba-5-before.jpg') },
  { id: 'ba-6', title: 'The Standoff', after: asset('/beforeafter/ba-6-after.jpg'), before: asset('/beforeafter/ba-6-before.jpg') },
]

export const EXPERIENCES = [
  {
    id: 'exp-madhupyaala',
    role: '2nd Unit DP · Editor · Colorist · Visual Designer · Post Manager — "Madhupyaala"',
    org: 'Feature Film',
    period: '2025',
    detail:
      'Second-unit cinematography, editing, colour, visual design and post-production management on the feature film "Madhupyaala".',
  },
  {
    id: 'exp-parda',
    role: 'Best Film · Best Editor — Parda Short Film Festival',
    org: 'Festival',
    period: '2025',
    detail: 'Winner of Best Film and Best Editor at the Parda Short Film Festival.',
    highlight: 'Award winner',
  },
  {
    id: 'exp-wwi',
    role: 'BSc. in Filmmaking — Whistling Woods International',
    org: 'Mumbai',
    period: '2022 — 2025',
    detail:
      'Formal training in cinematography, editing and colour grading at one of Asia’s leading film schools.',
    highlight: 'Gold Medalist',
  },
]

export const REVIEWS = [
  {
    id: 'rev-divya',
    name: 'Divya Pawar',
    role: 'Director — "Question Mark"',
    quote:
      'Saksham shot, cut and graded Question Mark with complete command of the frame. He elevated every scene and was the calmest problem-solver on set.',
  },
  {
    id: 'rev-radha',
    name: 'Radha Dua',
    role: 'Director — "For These Are Your Sins"',
    quote:
      'A wonderful collaborator with a sharp eye — every take he lined up was a good take. The film looks far bigger than its budget because of him.',
  },
  {
    id: 'rev-ranveer',
    name: 'Ranveer Dharmraj',
    role: '"Paywat"',
    quote:
      'His cinematography and DI gave Paywat its soul. Precise, fast, and deeply invested in the story we were telling.',
  },
]

export const PROFILE = {
  name: 'Saksham Goel',
  tagline: 'Post Production & Design Studio',
  intro:
    'I make films look the way stories feel — from the set to the grade to the final frame on screen.',
  // Quick proof points shown in the hero (kept in sync with your other site)
  stats: [
    { value: '50+', label: 'Projects' },
    { value: '10+', label: 'Global Brands' },
    { value: '3', label: 'Festival Honors' },
    { value: '4', label: 'Years Experience' },
  ],
  email: 'thesakshamgoel@gmail.com',
  phone: '+91 75081 81811',
  bio: 'Mumbai-trained filmmaker with a BSc. in Filmmaking from Whistling Woods International. From second-unit DP, editing, colour, visual design and post management on the feature "Madhupyaala" to shooting the short film "Supaari", I move fluidly between the set and the grade — always in service of the story.',
  instagram: 'https://www.instagram.com/thesakshamgoel/',
  instagramHandle: 'thesakshamgoel',
  // Drop your portrait at public/photo.jpg and your CV at public/cv.pdf.
  photo: asset('/photo.jpg'),
  // add your CV at public/cv.pdf and set this to asset('/cv.pdf') to show the button
  cv: '',
  // paste your full LinkedIn and YouTube channel URLs to show them in the footer
  linkedin: '',
  youtube: '',
  // Live Instagram feed (auto-updating, HTTPS-friendly). Set ONE of these:
  //  • Elfsight → paste the app id (the part after "elfsight-app-"):
  instagramElfsight: '343c9ac1-ca33-48c1-b53f-6e51556d5d15',
  //  • Behold.so → feed id:
  instagramBehold: '',
  //  • SnapWidget / any iframe widget → iframe src URL:
  instagramWidget: '',
  // (LightWidget's FREE tier blocks HTTPS, so it can't be used on a live site.)
}
