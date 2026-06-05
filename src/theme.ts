import type { NovaShop } from './types'

export function applyTheme(shop: NovaShop) {
  const root = document.documentElement
  const primary = normalizeHexColor(shop.primaryColor) || '#6366F1'
  const primaryLight = mixHex(primary, '#FFFFFF', 0.28)
  const primaryDark = mixHex(primary, '#000000', 0.24)
  const accent = mixHex(primary, '#FFFFFF', 0.16)
  const accentLight = mixHex(accent, '#FFFFFF', 0.22)
  const accentDark = mixHex(accent, '#000000', 0.2)

  setThemeVar(root, '--nova-primary', primary)
  setThemeVar(root, '--nova-primary-light', primaryLight)
  setThemeVar(root, '--nova-primary-dark', primaryDark)
  setThemeVar(root, '--nova-accent', accent)
  setThemeVar(root, '--nova-accent-light', accentLight)
  setThemeVar(root, '--nova-accent-dark', accentDark)

  // Backward-compatible aliases used by older templates.
  setThemeVar(root, '--primary', primary)
  setThemeVar(root, '--primary-light', primaryLight)
  setThemeVar(root, '--primary-dark', primaryDark)
  setThemeVar(root, '--accent', accent)
  setThemeVar(root, '--accent-light', accentLight)
  setThemeVar(root, '--accent-dark', accentDark)

  setRgbVars(root, 'primary', primary)
  setRgbVars(root, 'accent', accent)

  const title = shop.seoTitle || shop.name
  if (title) document.title = title

  if (shop.seoDescription) {
    upsertMeta({ name: 'description' }, shop.seoDescription)
  }

  if (title) {
    upsertMeta({ property: 'og:title' }, title)
    upsertMeta({ name: 'twitter:title' }, title)
  }
  if (shop.seoDescription) {
    upsertMeta({ property: 'og:description' }, shop.seoDescription)
    upsertMeta({ name: 'twitter:description' }, shop.seoDescription)
  }
  if (shop.name) upsertMeta({ property: 'og:site_name' }, shop.name)
  upsertMeta({ property: 'og:type' }, 'website')
  upsertMeta({ name: 'twitter:card' }, 'summary')
  upsertMeta({ name: 'theme-color' }, primary)
  if (typeof window !== 'undefined' && window.location?.href) {
    upsertMeta({ property: 'og:url' }, window.location.href)
  }

  if (shop.favicon) {
    upsertFavicon(shop.favicon)
  } else if (shop.name) {
    upsertFavicon(buildLetterFavicon(shop.name, primary))
  }
  if (shop.ogImage) {
    upsertMeta({ property: 'og:image' }, shop.ogImage)
    upsertMeta({ name: 'twitter:image' }, shop.ogImage)
  }
}

function setThemeVar(root: HTMLElement, name: string, value: string) {
  root.style.setProperty(name, value)
}

function setRgbVars(root: HTMLElement, name: 'primary' | 'accent', hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) return

  const value = `${rgb.r}, ${rgb.g}, ${rgb.b}`
  setThemeVar(root, `--nova-${name}-rgb`, value)
  setThemeVar(root, `--${name}-rgb`, value)

  for (const [suffix, alpha] of [
    ['04', '0.04'],
    ['06', '0.06'],
    ['08', '0.08'],
    ['10', '0.10'],
    ['12', '0.12'],
    ['14', '0.14'],
    ['18', '0.18'],
    ['20', '0.20'],
    ['25', '0.25'],
    ['30', '0.30'],
    ['35', '0.35'],
    ['40', '0.40'],
    ['50', '0.50'],
  ] as const) {
    setThemeVar(root, `--nova-${name}-${suffix}`, `rgba(${value}, ${alpha})`)
    setThemeVar(root, `--${name}-${suffix}`, `rgba(${value}, ${alpha})`)
  }
}

function upsertMeta(attrs: Record<string, string>, content: string) {
  if (typeof document === 'undefined') return
  const selector = Object.entries(attrs).map(([k, v]) => `[${k}="${v}"]`).join('')
  let el = document.head.querySelector<HTMLMetaElement>(`meta${selector}`)
  if (!el) {
    el = document.createElement('meta')
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertFavicon(href: string) {
  if (typeof document === 'undefined') return
  const oldLinks = document.head.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]')
  oldLinks.forEach((el) => el.parentNode?.removeChild(el))

  const link = document.createElement('link')
  link.rel = 'icon'
  link.href = href
  const lower = href.toLowerCase()
  if (lower.startsWith('data:image/svg')) link.type = 'image/svg+xml'
  else if (lower.includes('.svg')) link.type = 'image/svg+xml'
  else if (lower.includes('.png')) link.type = 'image/png'
  else if (lower.includes('.jpg') || lower.includes('.jpeg')) link.type = 'image/jpeg'
  else if (lower.startsWith('data:image/png')) link.type = 'image/png'
  else link.type = 'image/x-icon'
  document.head.appendChild(link)
}

function buildLetterFavicon(name: string, color: string): string {
  const letter = (name.trim().charAt(0) || '?').toUpperCase()
  const safeColor = normalizeHexColor(color) || '#6366F1'
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${safeColor}"/>` +
    `<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" ` +
    `font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#fff">${escapeXml(letter)}</text>` +
    `</svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeHexColor(color: string | null | undefined): string | null {
  const value = String(color || '').trim()
  const short = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(value)
  if (short) {
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toUpperCase()
  }

  const full = /^#?([a-f\d]{6})$/i.exec(value)
  if (!full) return null
  return `#${full[1]}`.toUpperCase()
}

function mixHex(from: string, to: string, weight: number): string {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  if (!a || !b) return from

  const w = Math.min(1, Math.max(0, weight))
  const r = Math.round(a.r + (b.r - a.r) * w)
  const g = Math.round(a.g + (b.g - a.g) * w)
  const bl = Math.round(a.b + (b.b - a.b) * w)
  return '#' + [r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function hexToRgb(hex: string) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!match) return null
  return {
    r: parseInt(match[1]!, 16),
    g: parseInt(match[2]!, 16),
    b: parseInt(match[3]!, 16),
  }
}
