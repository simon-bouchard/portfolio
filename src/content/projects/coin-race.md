---
title: "Multiplayer Coin Race — Real‑Time Web Game"
description: "A very simple but technically rich multiplayer browser game: players race to collect coins on a 2D board, with live leaderboards updating in real time."
stack: ["Node.js","Express","Socket.IO","Vanilla JS","Canvas","Helmet","CORS","Nginx","Ubuntu","systemd"]
featured: false
date: "2025-02"
demo: "https://game.simonbouchard.space"
repo: "https://github.com/simon-bouchard/freecodecamp-project-secure-real-time-multiplayer-game"
cover: "/projects/coin-race/cover.png"
highlights:
  - "Real-time multiplayer with Socket.IO over WebSockets"
  - "Server-authoritative collision, scoring, and coin respawns"
  - "Frame‑rate independent, time‑based movement"
  - "Dynamic leaderboard syncing across all clients"
  - "Hardened Express backend (Helmet, CORS)"
  - "Deployed behind Nginx with systemd + HTTPS routing"
tags: ["websockets","realtime","game","backend","deployment"]
---

## Overview
I built a small, production‑ready multiplayer web game where players collect coins on a 2D board. The hard part isn’t graphics—it’s synchronizing state across clients *in real time* while keeping the server authoritative. I used Socket.IO for low‑latency messaging, implemented time‑based movement so speed is consistent across frame rates, and built a live leaderboard that updates for everyone instantly.

## What it demonstrates
- **Networked game loops:** update → broadcast → reconcile on the client.
- **State synchronization:** server as the source of truth; clients render snapshots + minor local interpolation.
- **Concurrency & events in Node.js:** handling many players without cross‑talk.
- **Secure web ops:** Helmet (CSP, noSniff, hidePoweredBy), CORS, reverse proxying, SSL.
- **Real deployment:** Node service (systemd) behind Nginx with an HTTPS subdomain.

## Architecture (high level)
- **Frontend (Vanilla JS + Canvas):**
  - Renders players/coins, sends input (intent) at a steady cadence.
  - Uses `deltaTime` to keep motion consistent.
  - Receives authoritative state packets and reconciles prediction.
- **Backend (Node + Express + Socket.IO):**
  - Tracks players, coin positions, collisions, and scoring.
  - Validates moves, resolves coin pickups, respawns coins.
  - Broadcasts world snapshots and leaderboard updates.
- **Security & Deployment:**
  - Helmet for CSP / header hardening; CORS restricted to the game origin.
  - Nginx reverse proxy → Node service managed via systemd (auto‑restart on crash).
  - DNS + SSL for a clean `https://…` subdomain.

## Key details
- **Authoritative server:** prevents client‑side cheating (e.g., fake hits/scoring).
- **Frame‑rate independent movement:** positions update based on elapsed time, not frames.
- **Dynamic leaderboard:** sorted by score and broadcast on each coin collection.
- **Resilience:** systemd restarts on failure; Nginx health checks and access logs for debugging.

## Ops notes
- **Nginx** handles TLS and forwards `ws`/`wss` upgrades to the Node app.
- **systemd** keeps the service alive (`Restart=always`) and logs to `journalctl`.
- **CSP** blocks inline scripts and restricts origins to the game’s assets and socket endpoint.

## Lessons learned
- Keep the **server authoritative** even for tiny games; it massively simplifies trust and fairness.
- **Delta-time movement** avoids “fast PCs move faster” bugs.
- Socket message **shape stability** matters—small, consistent payloads beat ad‑hoc fields.

