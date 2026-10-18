/**
 * Performance tier, decided once at startup.
 *
 * LITE is on for phones and tablets (touch), small screens, machines with
 * 4 or fewer cores or 4 GB or less of memory, data-saver, and reduced motion.
 * Lite drops the 3D background, thins the star tunnels and the reel wall,
 * and turns off full-screen ambient layers. Capable desktops keep it all.
 */
const w = typeof window !== 'undefined' ? window : null
const mq = (q) => !!w?.matchMedia?.(q).matches
const nav = typeof navigator !== 'undefined' ? navigator : {}

export const SMALL = mq('(max-width: 720px)')
export const COARSE = mq('(hover: none), (pointer: coarse)')
const weakCpu = (nav.hardwareConcurrency || 8) <= 4
const weakMem = (nav.deviceMemory || 8) <= 4
const saveData = !!nav.connection?.saveData
const reduced = mq('(prefers-reduced-motion: reduce)')

export const LITE = SMALL || COARSE || weakCpu || weakMem || saveData || reduced

if (w && LITE) document.documentElement.classList.add('lite')
