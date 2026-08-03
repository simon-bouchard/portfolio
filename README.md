# simonbouchard.space

Source for my personal portfolio site, built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com).

Live at **[simonbouchard.space](https://simonbouchard.space)**.

## Structure

Projects and experience entries are content-driven, not hardcoded — adding a new project is just a new Markdown file:

```text
/
├── public/
│   └── projects/<slug>/        # cover.jpg, icon.png/svg per project
├── src/
│   ├── content/
│   │   ├── projects/*.md       # one file per project (frontmatter: title, stack, cover, icon, ...)
│   │   └── experience/*.md
│   ├── components/
│   ├── layouts/Base.astro      # shared shell: nav, header, footer
│   └── pages/                  # routes (projects/[slug].astro renders each project page)
└── astro.config.mjs
```

Schemas for the `projects` and `experience` collections live in `src/content/config.ts`.

## Commands

All commands run from the project root:

| Command             | Action                                       |
| :------------------ | :-------------------------------------------- |
| `npm install`        | Install dependencies                          |
| `npm run dev`         | Start local dev server at `localhost:4321`   |
| `npm run build`       | Build production site to `./dist/`           |
| `npm run preview`     | Preview the production build locally          |

## Deploy

```sh
npm run build && ./deploy.sh
```

`deploy.sh` rsyncs `dist/` over SSH to the production VPS.
