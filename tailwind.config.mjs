import typography from '@tailwindcss/typography'

export default {
  // Optional in v4, but safe to include:
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: { extend: {} },
  plugins: [typography],
}
