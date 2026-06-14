export const DEFAULT_THEME = {
  era: 'archive',
  accent: '#f59e0b',
  accent2: '#38bdf8',
  motif: 'star maps and old paper',
  background:
    'radial-gradient(circle at 15% 15%, rgba(245,158,11,0.14), transparent 28%), radial-gradient(circle at 80% 10%, rgba(56,189,248,0.1), transparent 24%), #0a0e1a',
  panel: 'rgba(15, 23, 42, 0.96)',
  node: '#0f1829',
  nodeBorder: '#3b82f6',
  text: '#e2e8f0',
  muted: '#94a3b8'
}

export const ERA_THEMES = {
  antiquity: {
    ...DEFAULT_THEME,
    era: 'antiquity',
    accent: '#f59e0b',
    accent2: '#22c55e',
    motif: 'bronze maps, campfires, and royal roads',
    background:
      'radial-gradient(circle at 18% 12%, rgba(245,158,11,0.2), transparent 30%), radial-gradient(circle at 76% 18%, rgba(34,197,94,0.12), transparent 24%), linear-gradient(135deg, #080b14 0%, #10100a 55%, #130c07 100%)',
    panel: 'rgba(24, 18, 10, 0.96)',
    node: '#1c1a0d',
    nodeBorder: '#f59e0b'
  },
  industrial: {
    ...DEFAULT_THEME,
    era: 'industrial',
    accent: '#ef4444',
    accent2: '#f97316',
    motif: 'factories, pamphlets, rail smoke, and red banners',
    background:
      'radial-gradient(circle at 18% 10%, rgba(239,68,68,0.18), transparent 30%), radial-gradient(circle at 85% 16%, rgba(249,115,22,0.1), transparent 24%), linear-gradient(135deg, #090b10 0%, #171017 58%, #190b0b 100%)',
    panel: 'rgba(23, 14, 18, 0.96)',
    node: '#1a1117',
    nodeBorder: '#ef4444'
  }
}

export function resolveTheme(theme = {}) {
  const base = ERA_THEMES[theme.era] || DEFAULT_THEME
  return { ...base, ...theme }
}

export function themeVars(theme = {}) {
  const resolved = resolveTheme(theme)
  return {
    '--theme-accent': resolved.accent,
    '--theme-accent-2': resolved.accent2,
    '--theme-bg': resolved.background,
    '--theme-panel': resolved.panel,
    '--theme-node': resolved.node,
    '--theme-node-border': resolved.nodeBorder,
    '--theme-text': resolved.text,
    '--theme-muted': resolved.muted
  }
}
