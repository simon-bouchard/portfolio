#!/usr/bin/env node
// Renders docs/diagrams/*.mmd into themed light/dark SVG pairs under public/.
// Run via `npm run diagrams` whenever a .mmd source changes.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const diagramsDir = path.join(root, "docs/diagrams");
const mmdc = path.join(root, "node_modules/.bin/mmdc");

const DIAGRAMS = [
  { src: "arch.mmd", outDir: "public/projects/book-recsys", name: "arch" },
  { src: "chatbot-agents.mmd", outDir: "public/projects/book-recsys", name: "chatbot-agents" },
  { src: "inference-pipeline.mmd", outDir: "public/projects/book-recsys", name: "inference-pipeline" },
  { src: "training-pipeline.mmd", outDir: "public/projects/book-recsys", name: "training-pipeline" },
  { src: "pipeline.mmd", outDir: "public/projects/cpp-async-logger", name: "pipeline" },
];

const MODES = [
  { config: "theme-light.json", suffix: "" },
  { config: "theme-dark.json", suffix: "-dark" },
];

// mmdc emits width="100%" with no height, so the SVG has no absolute
// intrinsic size — only a valid <img> in a container with a definite width
// (fine on the page, but not in an auto-sized lightbox <dialog>). Bake the
// viewBox dimensions in as the real width/height so the SVG has an intrinsic
// size everywhere it's used; CSS max-width/width rules still scale it down.
function bakeIntrinsicSize(filePath) {
  const svg = readFileSync(filePath, "utf8");
  const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!viewBox) return;
  const [, w, h] = viewBox;
  const patched = svg.replace(/(<svg\b[^>]*?)\swidth="100%"/, `$1 width="${w}" height="${h}"`);
  writeFileSync(filePath, patched);
}

for (const diagram of DIAGRAMS) {
  const input = path.join(diagramsDir, diagram.src);
  for (const mode of MODES) {
    const output = path.join(root, diagram.outDir, `${diagram.name}${mode.suffix}.svg`);
    const config = path.join(diagramsDir, mode.config);
    execFileSync(
      mmdc,
      ["-i", input, "-o", output, "-c", config, "-b", "transparent"],
      { stdio: "inherit" }
    );
    bakeIntrinsicSize(output);
    console.log(`rendered ${path.relative(root, output)}`);
  }
}
