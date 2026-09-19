// astro.config.mjs
// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://simon-bouchard.com',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/experience/'),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});

