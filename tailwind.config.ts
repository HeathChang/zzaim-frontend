import type { Config } from 'tailwindcss'

// zz-0 D4 — 하드코딩 hex 금지. Tailwind 는 tokens.css 의 CSS 변수를 참조만 한다.
// 실값의 출처는 design/_ds/classical-*/styles.css (DS:10–42) 하나뿐이다.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        text: 'var(--color-text)',
        divider: 'var(--color-divider)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          100: 'var(--color-accent-100)',
          700: 'var(--color-accent-700)',
        },
        neutral: {
          100: 'var(--color-neutral-100)',
          300: 'var(--color-neutral-300)',
          700: 'var(--color-neutral-700)',
          900: 'var(--color-neutral-900)',
        },
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
        paper: 'var(--font-paper)',
      },
      height: { header: '40px', statusbar: '32px' },
      width: { panel: '320px', 'panel-narrow': '280px', dialog: '480px', help: '640px' },
    },
  },
  plugins: [],
} satisfies Config
