---
title: "AI Framework Tracker"
description: "An agentic pipeline that continuously scrapes emerging AI agent frameworks and compiles them into a queryable, interlinked knowledge base — built so coding agents past their training cutoff can stay aware of what exists."
stack: ["Claude Agent SDK", "Python", "Airflow", "Hermes", "llm-wiki-compiler"]
featured: false
date: "2026-06"
repo: "https://github.com/simon-bouchard/ai-researcher"
cover: "/projects/ai-researcher/cover.jpg"
icon: "/projects/ai-researcher/icon.svg"
highlights:
  - "Two-script architecture keeps README content out of the agent's context: Python handles search/filtering, the LLM only makes semantic in/out-of-scope judgments"
  - "Change-detection and a persistent rejection cache mean a repo is never re-fetched or re-judged twice"
  - "Strict separation of concerns: scraping never summarizes — a downstream compiler owns structuring, dedup, and interlinking"
  - "Two Airflow DAGs (daily emerging / weekly popular) run the full pipeline unattended on a schedule"
  - "37 topic articles + 6 concept articles compiled and kept current via hash-based incremental recompilation"
tags: ["Agentic AI", "LLM", "Data Pipelines", "Automation"]
---

## Overview

A continuously-updated awareness index of AI agent frameworks, designed to be queried by LLMs and coding agents whose training data has a knowledge cutoff.

**The problem it solves:** AI moves fast, and LLMs are generally unaware of frameworks and approaches that emerged after their training cutoff. This pipeline builds a knowledge base that gives an agent *awareness that something exists, what it does, and how it broadly works* — plus a citation to the primary source so it can verify current details on demand.

It's built as an internal tool rather than a customer-facing product, which is deliberate: a lot of real agentic AI work in industry looks exactly like this — a scheduled pipeline feeding a knowledge base that other systems (or engineers) query, with no UI of its own.

## Pipeline

```
Hermes (scrape/extract, scheduled)
    → sources/  (flat markdown + YAML frontmatter)
        → llm-wiki-compiler (structure, dedupe, interlink)
            → llmwiki query / context / MCP  (query interface for coding agents)
```

**Core design principle — separation of concerns:** the scraping agent only searches, extracts, and formats. It never summarizes or paraphrases source content. Summarization and synthesis happen downstream in the compiler, so `sources/` always contains untouched source material with clear provenance.

## GitHub framework discovery

Two cadences, both using the same two-script architecture:

- **Popular (weekly):** established frameworks with >10k stars
- **Emerging (daily):** repos created in the last 30 days with >500 stars

The agent's role is limited to semantic judgment only — all mechanical work is handled by Python scripts so that README content never passes through the agent's context window:

1. A filter script queries the GitHub Search API (one call per topic, paginated), filters out repos already ingested with an unchanged `pushed_at` (change-detection) and repos previously judged out-of-scope, then fetches a short README preview for each candidate.
2. The agent judges each candidate from its description, topics, and README preview.
3. A write script fetches the full README for in-scope repos and writes one source file per repo; out-of-scope repos are recorded to a persistent rejection list so they're never re-evaluated.

For the initial backlog, a bootstrap script loops the ingestion until the filter returns empty results.

## Compilation

The compiler ingests `sources/` and builds a structured, interlinked wiki:

- Schema-driven extraction — a schema file defines entity types, article sections, and cross-reference rules, read by the compiler on every run
- Hash-based incremental compilation — only topics whose source files changed get recompiled
- Topic slugs use an `owner_repo` format for guaranteed uniqueness
- A query interface exposes the compiled wiki to coding agents

Status: running — 37 topic articles and 6 concept articles compiled, updated on every pipeline run.

## Orchestration

Two Airflow DAGs run the full pipeline on schedule: ingest → sync topic hints → compile. One runs weekly for the popular-frameworks track, the other daily for emerging frameworks.

## Repo structure

```
sources/      flat markdown files, one per scraped repo (YAML frontmatter + verbatim README)
prompts/      scraping prompts for the popular and emerging runs
scripts/      GitHub API fetch, change-detection/rejection filtering, source file writer
dags/         Airflow DAGs — popular (weekly) + emerging (daily)
wiki/         compiled knowledge base — schema, topic articles, concept articles
docs/         background, architecture decisions, open questions
```
