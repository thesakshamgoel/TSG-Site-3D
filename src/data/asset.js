/**
 * Public files (images, logo, certificates) live at the site root locally and
 * under the repository path on GitHub Pages. Every public path goes through
 * here so both work from the same code.
 */
export const asset = (p) => import.meta.env.BASE_URL + String(p).replace(/^\//, '')
