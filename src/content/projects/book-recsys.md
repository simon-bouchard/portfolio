---
title: "Book Recommendation System"
description: "Production-grade hybrid recommender with warm/cold support, real-time similarity search, and daily retraining with hot reloads."
stack: ["FastAPI","PyTorch","LightGBM","FAISS","Implicit (ALS)","SQL (MySQL)","Nginx","Azure"]
featured: true
date: "2025-08"
demo: "https://recsys.simonbouchard.space"
repo: "https://github.com/simon-bouchard/Book_Recommendation_UI_with_FastAPI"
cover: "/projects/book-recsys/cover.png"
highlights:
  - "Warm users: ALS retrieval" 
  - "Cold users: attention-pooled subject embeddings + Bayesian popularity prior"
  - "Similarity search (FAISS): ALS, subject, or hybrid with adjustable weights"
  - "Daily retraining and zero-downtime hot reload of models/artifacts"
  - "Normalized SQL schema, reproducible exports, and automated deploys"
tags: ["Machine Learning", "Recommender-Systems","Backend","MLOps"]
---

## Overview

A production-grade recommendation engine that supports both **warm users** (with prior ratings) and **cold users** (no history). It serves **personalized recommendations** and **item similarity search** with low latency, and runs on a fully automated pipeline with daily retraining and hot-reload of new artifacts.

**Capabilities**
- Serve warm users via collaborative filtering (**ALS-only**)  
- Serve cold users via subject embeddings and a Bayesian popularity prior  
- Provide item similarity (ALS, subject, or hybrid) with adjustable weights  
- Automate data export, training, and deployment with safe, zero-downtime reloads

**Why this dataset (and why messy on purpose)**  
I intentionally built on the classic **Book-Crossing** dataset, which is older and deliberately rough around the edges: it was crawled in 2004, ships with minimal metadata (no tags/subjects), many missing demographics (age/location often null), and historically inconsistent ISBNs that require validation/cleanup. That made the project harder—but closer to real life, where companies struggle to operationalize AI on top of **noisy, inconsistent databases**. Working through enrichment (Open Library subjects), ID normalization (ISBN → work_id), and strict split-safe aggregates prepared me for those production realities.

---

## Architecture

### Warm users
**Pipeline**
1. **ALS (Implicit)** retrieves top candidates from collaborative signals.  

> Current warm-path is **ALS-only** (no warm reranker).

### Cold users
**Pipeline**
1. **Attention-pooled subject embeddings** compute similarity between a user’s favorite subjects and books.  
2. **Bayesian popularity prior** balances exploration and robustness (user-adjustable slider).

This handles users with zero ratings reliably while still surfacing relevant items.

### Item similarity modes (FAISS)
- **ALS (behavioral):** great for same author/series; weaker on sparse/niche items.  
- **Subject similarity (content):** more coverage; slightly noisier on books with many subjects.  
- **Hybrid:** convex combination of both with a weight control.

---

## Subject Embeddings

**Training objectives**
- **Regression (RMSE)** on ratings to align embeddings with observed preferences.  
- **Contrastive loss** on subject co-occurrence to improve neighborhood quality.

**Attention pooling**
- Weights the most informative subjects per book or user.  
- Multiple strategies supported (scalar, per-dimension, transformer/self-attention).

---

## Automation & Deployment

- **Data pipeline:** normalized SQL schema (users, books, subjects, interactions).  
- **Training server:** scheduled daily jobs (ALS, aggregates, exports).  
- **Inference server:** **hot-reloads** models/artifacts with **zero downtime**.  
- **FastAPI backend:** paginated endpoints, caching, and auth; served via **uvicorn + Nginx**.  
- **Web frontend:** browse/search/rate and receive real-time recommendations.  
- **(Planned) Vector job:** periodic LLM-agent enrichment → embeddings → index refresh, versioned for atomic hot-reloads.

---

## Semantic Search & Information Enrichment

The system supports **semantic vector search** for catalog-grounded recommendations and chatbot queries.  
Before embedding, a dedicated **Enrichment Agent** runs as an offline job to refine and filter catalog metadata.  
It restructures each book entry into a concise, schema-locked format optimized for LLM embeddings—combining **title, author, subjects, tone, genre,** and **vibe** into a unified description.

The enrichment process operates through a **Kafka-based pipeline** with tiered data quality handling.  
Two **Spark jobs** process the results: one ingests enriched data into SQL for serving, while another archives raw objects in a data lake for versioned storage. An **incremental embedding job** encodes newly enriched books continuously, keeping the vector index up to date without full reprocessing.

These embeddings power **semantic vector retrieval**, which the chatbot uses to interpret natural language book queries, understand tone or theme-based descriptions, and return catalog-grounded results aligned with user intent.

---

## Chatbot

The integrated chatbot acts as a **virtual librarian** — a multi-turn assistant built with **LangGraph**.  
It leverages the same internal tools as the recommendation engine and adds conversational reasoning and retrieval capabilities.

**Current architecture**
- Built as a **multi-agent system** orchestrated through LangGraph.  
- A central **Router Agent** interprets the query and dispatches it to one of four branches:
  - **Conversational** — direct LLM dialogue and reasoning.  
  - **Docs** — retrieves and reasons over site documentation (ReAct loop).  
  - **Web Search** — external lookups for recent or out-of-catalog books (ReAct loop).  
  - **Recsys** — produces catalog-grounded recommendations and explanations.  
- The **Recsys branch** itself includes two cooperating agents:
  - **Candidate Generator** — retrieves books using ALS, FAISS, and vector-based retrieval.  
  - **Curator/Explainer** — filters, ranks, and explains selected results.  
- Maintains **multi-turn memory** for context-aware, natural conversations.

**Roadmap**
- Introduce a **Planner Agent** to manage multi-step reasoning and tool planning.  
- Expand the Recsys branch into a full four-stage structure:
  <br>_planner → candidate generation → curation → explanation_.  
- Add a lightweight **Dialogue Manager** for long-session coordination.  
- Improve **context summarization** for more sustained memory across sessions.

---

## Data & Processing

The original Book-Crossing data is noisy (ISBN variants, duplicates, missing metadata, no subjects). The pipeline cleans and enriches it using Open Library and internal rules.

1. **ID normalization & edition merging**  
   - Normalize ISBNs → map to Open Library **work_id**.  
   - Merge editions under a single **work_id** to consolidate interactions.  
   - Assign a stable integer **item_idx** for modeling and serving.

2. **Subject enrichment & reduction**  
   - Pull subjects from Open Library per work.  
   - Reduce ~130,000 raw strings to ~1,000 usable categories via cleaning, deduplication, and frequency filtering.  
   - Maintain a vocabulary mapping `subject_idx → subject`.

3. **User data cleaning**  
   - Clean ages (remove extremes, bucket into age groups).  
   - Normalize locations (extract country).  
   - Derive **favorite subjects** (top-k) for cold-start embeddings.

4. **Ratings cleaning**  
   - Enforce valid rating ranges.  
   - Drop duplicates.  
   - Filter users/books with too few interactions to stabilize training.

5. **Subject & metadata normalization**  
   - Store `subjects_idxs` as fixed-length padded lists.  
   - Exclude generic categories (“Fiction”, “General”) from **main_subject**.  
   - Canonicalize authors/years/pages (e.g., “Unknown Author”, year buckets, imputed pages).

6. **Aggregate features**  
   - Precompute book/user aggregates (count, average, std).  
   - Export together with embeddings to keep training/inference consistent.

7. **LLM-agent enrichment**  
   - For each book, an **LLM agent** constructs a structured dictionary describing the work (themes, tone, style, audience, etc.).  
   - Inputs: normalized DB info (title, author, year, subjects, aggregates) + optional external lookups (agent can call a capped set of web tools if metadata is sparse).  
   - Outputs: validated, schema-locked dictionary fields.  
   - These dictionaries are stored alongside SQL metadata and form the basis for **LLM-based book embeddings** and vector search.  

Result: a clean, normalized SQL schema with stable IDs, consistent metadata, and a compact subject vocabulary that powers both collaborative and content-based models.

---

## Research & Experiments

Explorations to balance **accuracy, latency, and complexity**:
- Residual MLPs over dot-product and LGBM predictions  
- Two-tower and three-tower architectures  
- Clustering and regression methods for user embeddings  
- Gated-fusion mechanisms  
- Alternative attention pooling (scalar, per-dimension, transformer/self-attention)

Findings informed the production choices and simplified serving paths.

---

## Biggest mistakes & what I learned

### 1) No fixed validation early on → aggregates caused leakage (and weeks of wasted experiments)
**What I did:** I didn’t lock a validation set at the start. I computed aggregates like user/book **avg/count/std** on the full data and then split, which bled information from val into train-time features.

**Symptoms I saw:** Validation RMSE looked great; when I finally evaluated on a **leakage-free test set**, performance **collapsed** (RMSE drifted back near the ratings’ std dev). Many “wins” were artifacts of leakage.

**Impact:** I spent a lot of time comparing models on a **false signal**. Tuning decisions and exploratory work were based on numbers that wouldn’t hold up.

**Fix:** I rebuilt the dataset pipeline:
- **Predefine** train/val/test (time-aware and/or user-stratified where relevant).
- Compute aggregates **within split** (or with time cutoffs so no look-ahead).
- Version artifacts by split and timestamp; store `split_id` with every export.
- Add an **early, single sanity run on test** with a simple baseline (e.g., popularity/ALS) to catch pipeline bugs without gaming the test set.

**Lesson:** A good validation split is not optional. Build features in a way that **cannot** see beyond the split boundary. And while you must avoid overfitting to test, one **early, baseline test check** is worth it to verify the pipeline isn’t lying.

---

### 2) Optimizing RMSE for a ranking problem (and judging components instead of the pipeline)
**What I did:** I tracked retrieval metrics (Precision/Recall/MAP/NDCG) for **ALS** early on, but I didn’t hold the **entire pipeline** (ALS → reranker) to the same standard. For **subject embeddings**, I initially evaluated by **RMSE** rather than by neighborhood quality for similarity/retrieval.

**Impact:** Objective/metric mismatch. Embeddings that looked fine under RMSE didn’t produce clean neighborhoods for FAISS, and pipeline decisions weren’t aligned with the real serving goal (**top-K ranking**).

**Fix:** I aligned **training** and **evaluation** with how the system serves results:
- Trained embeddings with a **dual objective**: rating regression (RMSE) **plus** a **contrastive loss** over batch co-occurrence to encourage useful geometry.
- Evaluated **end-to-end** (candidate generation + reranking) with ranking metrics like Recall@K / NDCG@K, not just component-level RMSE.

**Lesson:** Optimize for what you ship. When the product is a **ranked list**, rank-aware objectives and metrics should lead. After the change, FAISS neighborhoods were much cleaner and ranking quality improved. In hindsight, many of the earlier “fancy” notebook ideas would likely have had a better chance **with the improved embeddings and geometry-focused training**—the groundwork matters.

---

### 3) Indexing before splitting (development-time) → untrained embeddings to filter
**What I did (during development):** Early on I precomputed indices (subjects/categories, items) on the **entire dataset**, and only then created train/val/test splits. That meant my vocabularies contained entries that never appeared in the training fold.

**Impact:** I was aware of the issue, but it still cost time. Some embedding rows existed (initialized) but were **never trained** because their items/subjects appeared only in val/test. I had to make absolutely sure the pipeline **filtered out untrained vectors everywhere**—otherwise they would introduce noise and **worsen metrics**.

**Fix:** I rebuilt the dataset with a “**split-first**” approach:
- Define and freeze splits **up front**.
- Build vocabularies/indices **per split** (or with strict time/split cutoffs).
- Materialize embeddings only for IDs present in that split.

**Lesson:** Derive vocabularies **after** you define splits. Even if you notice the problem, the time sink of downstream filtering is real—and unfiltered rows quietly hurt retrieval quality.

---

### 4) Delaying LLM-agent enrichment → missed leverage
**What I did:** Performed enrichment (e.g., subjects, metadata cleanup) but didn’t bring in **LLM agents** early enough to structure and enrich book data.  
**Impact:** Without agent-based enrichment, inputs stayed thin and uneven. Downstream models (ALS explanations, subject similarity, early retrieval trials) were bounded by this.  
**Fix:** Use **carefully prompted LLM agents** earlier in the pipeline to normalize and expand metadata (tone, themes, target audience, etc.), combining local DB fields with limited external lookups.  
**Lesson:** **Agent-led enrichment/cleaning is now part of data engineering.** Starting earlier means stronger, more consistent inputs that lift every downstream stage (ALS, subject embeddings, vector search, RAG answers).

---

### Meta-lessons I’m taking forward
- **Split first, then feature.** Leakage prevention by construction beats detection after the fact.  
- **Baseline early, once.** A single early test pass with a simple model can save weeks.  
- **Evaluate what you serve.** Measure **candidate gen + reranking** with ranking metrics; use RMSE (or MAE) only where it truly reflects the objective.  
- **Make it cheap to rebuild.** When fixes require re-exports, fast, reproducible pipelines keep momentum.

---

## Tech Stack

**Python**, **FastAPI**, **PyTorch**, **LightGBM**, **FAISS**, **Implicit (ALS)**,  
**SQL (MySQL)**, **Nginx + uvicorn**, **Azure**, **Systemd**, **LangChain**, **Redis**.
