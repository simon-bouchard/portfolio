// src/content/config.ts
import { defineCollection, z } from "astro:content";

// Markdown-based project pages
const projectsCollection = defineCollection({
  // type: "content" // (optional in Astro v4)
  schema: z.object({
    title: z.string(),
    description: z.string(),
    stack: z.array(z.string()),
    featured: z.boolean().default(false),
    date: z.string().optional(),          // e.g., "2025-08"
    demo: z.string().url().optional(),    // live site / subdomain
    repo: z.string().url().optional(),    // GitHub
    link: z.string().url().optional(),    // legacy field (optional fallback)
    cover: z.string().optional(),
    highlights: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

// Markdown-based experience items
const experienceCollection = defineCollection({
  schema: z.object({
    company: z.string(),
    role: z.string(),
    start: z.string(),                    // "YYYY-MM"
    end: z.string().optional(),           // "Present" or date
    location: z.string().optional(),
    bullets: z.array(z.string()),
    skills: z.array(z.string()).optional(),
    link: z.string().url().optional(),
  }),
});

export const collections = {
  projects: projectsCollection,
  experience: experienceCollection,
};

