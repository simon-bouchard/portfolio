---
title: "snacc — Rust CLI for Kaggle/LLM Workflows"
description: "A cross-platform command-line tool that automates my Kaggle + LLM workflow, with project-tree exports, notebook copying, and installer builds."
stack: ["Rust","Cargo workspace","GitHub Actions","Cross-platform packaging"]
date: "2025-07"
repo: "https://github.com/simonbouchard/snacc" 
cover: "/projects/snacc/cover.png"
highlights:
  - "Automates Kaggle workflow: watches downloads folder, copies notebook code cells for LLM input"
  - "Includes `tree` command to export clean project structures in an LLM-friendly format"
  - "Originally prototyped in Python, then rebuilt in Rust to learn systems programming and memory safety"
  - "Packaged as `.msi`, `.deb`, `.pkg` installers via CI/CD"
tags: ["cli","automation","rust"]
---
This project grew out of my daily Kaggle workflow. I use Kaggle for free GPU time, often prototyping ml models and running experiments. To streamline this, I built **snacc**, a small but polished Rust CLI:

- It can watch my Downloads folder and automatically copy Kaggle notebook code cells to clipboard — useful for LLM debugging and continuation.
- It ships a `tree` command that exports a project’s directory structure in a clean, LLM-friendly format (great for context-sharing).
- The tool is split into a Cargo workspace with `snacc-lib` (core logic), `snacc-cli` (terminal interface), and `snacc-x` (planned GUI).

I could have kept iterating in Python, but I wanted an excuse to learn a low-level/systems language. Rust gave me a chance to explore what the fuss about **memory safety** and ownership really is, while also learning release engineering (cross-platform packaging, GitHub Actions workflows, MSI/DEB/PKG builds).  
