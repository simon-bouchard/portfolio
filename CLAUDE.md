# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Astro 5 + Tailwind CSS v4 (via `@tailwindcss/vite`), MDX support, deployed as a static site. See README.md for commands.

## Content model

Projects and experience entries are content-driven, not hardcoded — adding a project means adding `src/content/projects/<slug>.md` (frontmatter schema in `src/content/config.ts`) plus `public/projects/<slug>/{cover.jpg,icon.png}`.

The `experience` collection is defined in the schema but has no content files yet, and its nav link in `src/layouts/Base.astro` is commented out. Don't wire it back up without content to back it.

## Design tokens

Colors (`ink`, `paper`, `line`, `graphite`, `blueprint`) and fonts (IBM Plex Sans/Mono) are defined once in `src/styles/tailwind.css` under `@theme`. Use the Tailwind utility names, not hardcoded hex values, so theme changes stay centralized.

## Pages / nav

Nav labels don't always match filenames: the "Links" nav item routes to `/contact/` (`src/pages/contact.astro`), which lists socials and resume downloads. `src/pages/index.astro` and `about.astro` are otherwise self-explanatory.

## Reference-only docs (not wired into the build)

- `projects_readme/` — longer-form writeups used as source material when composing the shorter `src/content/projects/*.md` entries. Gitignored, local-only, not read by Astro.
- `docs/recsys_readme.md` and `docs/diagrams/*.mmd` — committed background notes/diagrams for the book-recsys project; not referenced by any page.

## Analytics

GoatCounter (`simonbouchard.goatcounter.com`) is injected in `Base.astro` only when `import.meta.env.PROD` is true, so `npm run dev` won't pollute stats — this is intentional, not a bug if the script is missing locally.

## Deploy

Deploying is a manual step, not triggered by git: `npm run build && ./deploy.sh` rsyncs `dist/` to the production VPS over SSH. A commit alone does not update the live site.
