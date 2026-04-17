// Design tokens for the login page — derived from ui-ux-pro-max-skill research
// Patterns: premium dark hero + split-screen editorial + glassmorphism warm accent
export const LOGIN_TOKENS = {
  hero: {
    bg: 'linear-gradient(135deg, hsl(20 35% 5%) 0%, hsl(22 30% 9%) 40%, hsl(18 28% 7%) 100%)',
    orbCopper: 'hsl(22 72% 48% / 0.15)',
    orbAmber: 'hsl(36 88% 52% / 0.10)',
    orbForest: 'hsl(152 38% 38% / 0.08)',
    textPrimary: 'white',
    textSecondary: 'hsl(28 20% 65%)',
    separator: 'rgba(255,255,255,0.08)',
  },
  form: {
    bg: 'hsl(30 20% 97%)',
    cardBg: 'white',
    cardRadius: 24,
    cardShadow: '0 4px 24px hsl(20 15% 15% / 0.08), 0 1px 4px hsl(20 15% 15% / 0.04)',
    textPrimary: 'hsl(20 25% 12%)',
    textSecondary: 'hsl(20 15% 45%)',
    inputHeight: 54,
    inputRadius: 14,
    inputBorder: 'hsl(var(--border))',
    inputFocusBorder: 'hsl(22 72% 48%)',
    inputFocusShadow: '0 0 0 3.5px hsl(22 72% 48% / 0.12)',
  },
  brand: {
    copper: 'hsl(22 72% 48%)',
    amber: 'hsl(36 88% 52%)',
    forest: 'hsl(152 38% 38%)',
    gradient: 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))',
    titleGradient: 'linear-gradient(135deg, #fff 0%, hsl(36 88% 72%) 60%, hsl(22 72% 60%) 100%)',
  },
  animation: {
    entranceDuration: '600ms',
    entranceEasing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    orbDuration: '10s',
    staggerBase: 80,
  },
} as const;
