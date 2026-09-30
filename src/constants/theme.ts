/**
 * Smart Parking – Light Theme
 * All colours are designed for a bright, airy light-mode app.
 */
export const COLORS = {
  // ── Brand ──────────────────────────────────────────
  primary:       '#2563EB',   // Blue-600
  primaryLight:  '#EFF6FF',   // Blue-50  (tinted backgrounds)
  primaryMid:    '#BFDBFE',   // Blue-200 (borders, chips)
  primaryDark:   '#1D4ED8',   // Blue-700 (pressed state)

  // ── Accent ─────────────────────────────────────────
  accent:        '#7C3AED',   // Violet-600
  accentLight:   '#F5F3FF',   // Violet-50
  accentMid:     '#DDD6FE',   // Violet-200

  // ── Semantic ───────────────────────────────────────
  success:       '#16A34A',   // Green-600
  successLight:  '#F0FDF4',   // Green-50
  successMid:    '#BBF7D0',   // Green-200

  warning:       '#D97706',   // Amber-600
  warningLight:  '#FFFBEB',   // Amber-50
  warningMid:    '#FDE68A',   // Amber-200

  error:         '#DC2626',   // Red-600
  errorLight:    '#FEF2F2',   // Red-50
  errorMid:      '#FECACA',   // Red-200

  info:          '#0284C7',   // Sky-600
  infoLight:     '#F0F9FF',   // Sky-50
  infoMid:       '#BAE6FD',   // Sky-200

  // ── Neutrals (all light) ───────────────────────────
  background:    '#F8FAFC',   // Slate-50  — page background
  surface:       '#FFFFFF',   // White     — cards, modals, inputs
  surfaceHover:  '#F1F5F9',   // Slate-100 — pressed / hover state
  surfaceAlt:    '#F8FAFC',   // Slate-50  — alternate row

  // ── Text ───────────────────────────────────────────
  text:          '#0F172A',   // Slate-900 — primary text
  textSecondary: '#334155',   // Slate-700 — secondary text
  textMuted:     '#64748B',   // Slate-500 — labels, captions
  textDisabled:  '#94A3B8',   // Slate-400 — disabled / placeholder

  // ── Borders ────────────────────────────────────────
  border:        '#E2E8F0',   // Slate-200 — default dividers
  borderMid:     '#CBD5E1',   // Slate-300 — stronger dividers
  borderStrong:  '#94A3B8',   // Slate-400 — focus rings

  // ── Misc ───────────────────────────────────────────
  overlay:       'rgba(15,23,42,0.4)',
  white:         '#FFFFFF',
  black:         '#000000',
};

export const SIZES = {
  xs:        4,
  sm:        8,
  md:        16,
  lg:        24,
  xl:        32,
  xxl:       48,
  radius:    10,
  radiusSm:  8,
  radiusMd:  14,
  radiusLg:  18,
  radiusXl:  24,
  radiusXxl: 32,
};

export const FONTS = {
  regular:   { fontWeight: '400' as const },
  medium:    { fontWeight: '500' as const },
  semibold:  { fontWeight: '600' as const },
  bold:      { fontWeight: '700' as const },
  extrabold: { fontWeight: '800' as const },
  black:     { fontWeight: '900' as const },
};
