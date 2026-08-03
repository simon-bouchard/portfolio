---
title: "CV Inference Serving with Triton"
description: "Deploying computer vision models with NVIDIA Triton Inference Server on a home GPU rig, following a deliberate experimental arc — each experiment finds a bottleneck, fixes it, and reveals the next one — backed by real benchmark numbers."
stack: ["PyTorch", "ONNX", "TensorRT", "Triton Inference Server", "C++", "Python", "Docker"]
featured: false
date: "2026-05"
repo: "https://github.com/simon-bouchard/cv-inference-triton"
cover: "/projects/cv-inference-triton/cover.png"
icon: "/projects/cv-inference-triton/icon.png"
highlights:
  - "YOLOv8s served via Triton ensembles: preprocess → model → postprocess, with ONNX and TensorRT FP16 variants"
  - "Custom C++ Triton backend for preprocessing removes the Python GIL bottleneck: -42% latency, +31% peak throughput in isolation"
  - "Full experimental arc backed by real perf_analyzer and custom load-test numbers at every stage"
  - "Diagnosed dynamic batching's lack of benefit on a compute-saturated GTX 1060, correctly attributing it to zero spare CUDA parallelism rather than misconfiguration"
  - "End-to-end: +34% throughput and -30% latency from first pipeline to final — the GPU became the limiting factor instead of software overhead"
  - "Generalization test on a second model (geoclassifier) showed TRT isn't automatically better — single-request latency regressed due to conversion overhead, despite higher throughput under load"
tags: ["Computer Vision", "MLOps", "Inference", "Benchmarking"]
---

## Overview

A portfolio project focused on deploying computer vision models with NVIDIA Triton Inference Server. The goal was to build practical experience with on-premise GPU inference serving — model optimisation, ensemble pipelines, C++ backends, and bottleneck analysis — emulating the kind of stack used in industrial CV deployments (e.g. mining, manufacturing).

The project follows a deliberate experimental arc: each experiment identifies a bottleneck, addresses it, and reveals the next one. The full progression is documented with real benchmark numbers.

## Hardware & stack

- **Development:** laptop on WSL2, for writing code and running clients
- **Inference:** desktop with a GTX 1060 3GB running Ubuntu, accessed via SSH
- **Serving:** Docker + nvidia-container-toolkit, Triton 23.08
- PyTorch → ONNX → TensorRT FP16 (model path), C++ custom backend (preprocess), Python `tritonclient` HTTP/gRPC (clients), `perf_analyzer` + a custom load tester (benchmarking)

## Pipeline

Requests arrive as raw JPEG bytes and flow through a Triton ensemble: **JPEG bytes → preprocess → yolov8s_trt → postprocess → boxes / scores / class_ids.**

Preprocess decodes the JPEG, letterboxes to 640×640 (preserving aspect ratio, padding with grey 114/255 as YOLOv8 expects), normalises to [0,1], and converts HWC→CHW. Postprocess applies NMS to the raw YOLOv8 output and returns bounding boxes, confidence scores, and class IDs. The input format (JPEG over HTTP) reflects a realistic industrial camera scenario: IP cameras on a mining site typically stream MJPEG or H.264, with a capture service forwarding individual frames to the inference server.

| Model | Backend | Description |
|-------|---------|-------------|
| `yolov8s` | ONNX Runtime | YOLOv8s object detection |
| `yolov8s_trt` | TensorRT FP16 | TRT-optimised version |
| `yolov8s_dynamic` | ONNX Runtime | Dynamic batch support (exp 03) |
| `preprocess` | Python | JPEG → letterbox → normalised CHW tensor |
| `preprocess_cpp` | C++ | Same pipeline, no Python overhead |
| `postprocess` | Python | Raw output → boxes/scores/class_ids with NMS |
| `yolov8s_pipeline` | Ensemble | preprocess → yolov8s → postprocess |
| `yolov8s_trt_pipeline` | Ensemble | preprocess → yolov8s_trt → postprocess |
| `yolov8s_trt_pipeline_cpp` | Ensemble | preprocess_cpp → yolov8s_trt → postprocess |
| `geoclassifier` | ONNX Runtime FP32 | EfficientNet-V2-M, 17 Quebec regions |
| `geoclassifier_trt` | TensorRT FP16 | TRT-optimised version |
| `geoclassifier_preprocess_cpp` | C++ | JPEG bytes → resize 512 → crop 480 → ImageNet norm |
| `geoclassifier_postprocess` | Python | Logits → label + confidence |
| `geoclassifier_pipeline` | Ensemble | geoclassifier_preprocess_cpp → geoclassifier → geoclassifier_postprocess |
| `geoclassifier_trt_pipeline` | Ensemble | geoclassifier_preprocess_cpp → geoclassifier_trt → geoclassifier_postprocess |

The `geoclassifier` model is the same one trained end-to-end in [geo-classifier-quebec](/projects/geo-classifier-quebec/) — this project reuses it as a second, unrelated model to test whether the serving optimisations found for YOLOv8s generalise, and to exercise multi-model deployment on the same Triton instance.

## Experiments

### Exp 01 — ONNX vs TensorRT FP16

Converted the YOLOv8s ONNX model to TensorRT FP16 using `trtexec` and compared GPU compute time and end-to-end pipeline throughput.

**Model-only** (GPU compute isolated, synthetic input):

| Model | p50 latency | GPU compute | Peak throughput |
|-------|-------------|-------------|-----------------|
| yolov8s (ONNX) | 26ms | 16.0ms | 58 inf/s |
| yolov8s_trt (TRT FP16) | 22ms | 10.7ms | 88 inf/s |

TRT FP16 reduces GPU compute time by 33% and raises isolated throughput by 50%.

**Pipeline** (1280×720 JPEG input, 2 preprocess/postprocess instances):

| Pipeline | p50 @c=1 | Peak throughput |
|----------|----------|-----------------|
| ONNX + Python preprocess | 35.6ms | 59 inf/s |
| TRT + Python preprocess | 36.2ms | 75 inf/s |

The TRT advantage is visible in the pipeline (75 vs 59 inf/s), but the GPU isn't reaching its full 88 inf/s capacity. Profiling showed Python preprocess saturates at ~87 inf/s — the partial bottleneck preventing the TRT model from running at its ceiling.

### Exp 02 — C++ preprocess backend

Replaced the Python preprocess model with a custom C++ Triton backend (a compiled shared library with no Python interpreter), performing the full JPEG decode → letterbox → normalize → HWC→CHW pipeline via libjpeg-turbo.

| Backend | p50 @c=1 | Peak throughput |
|---------|----------|-----------------|
| Python | 22ms | 87 inf/s |
| C++ | 12.7ms | 114 inf/s |

C++ is 42% faster in latency and 31% higher in peak throughput — the key reason is the Python GIL, which serialises interpreter operations even with multiple instances. Postprocess was also measured in isolation at 332 inf/s peak, 4× above the pipeline ceiling, so no C++ replacement was needed there.

**Full pipeline:**

| Pipeline | p50 @c=1 | Peak throughput | Saturates at |
|----------|----------|-----------------|--------------|
| TRT + Python preprocess | 36.2ms | 75 inf/s | c=5 |
| TRT + C++ preprocess | 25.0ms | 79 inf/s | c=3 |

At high concurrency both pipelines converge to the same ceiling because preprocess is no longer the bottleneck — the TRT model (GPU) is. The C++ pipeline reaches that ceiling at c=3 instead of c=5, saturating more efficiently with less queuing.

### Exp 03 — Dynamic batching

Re-exported the ONNX model with a dynamic batch axis and enabled Triton's dynamic batcher (preferred batch sizes 4 and 8, 1ms queue delay).

| Model | p50 @c=1 | Peak throughput |
|-------|----------|-----------------|
| yolov8s (no batching) | 26.6ms | 58 inf/s |
| yolov8s_dynamic (batching) | 28.0ms | 60 inf/s |

No meaningful gain. Dynamic batching helps when a single inference leaves CUDA cores idle — i.e. the GPU has spare parallelism a larger batch can exploit. On the GTX 1060 (1152 CUDA cores), one YOLOv8s inference already saturates available compute, and GPU compute time scales roughly linearly with concurrency rather than staying flat — the signature of a GPU with no headroom. On a larger GPU (A100, V100), the same experiment would likely show a 4–8× throughput increase.

### Exp 04 — Geoclassifier: ONNX vs TensorRT FP16

Repeated the ONNX vs TensorRT comparison on a second, unrelated model — `geoclassifier`, the EfficientNet-V2-M classifier from [geo-classifier-quebec](/projects/geo-classifier-quebec/) that identifies Quebec's 17 administrative regions from street-level photos. Pipeline: C++ preprocess (resize 512 → center-crop 480 → ImageNet normalize) → model → Python postprocess (softmax → argmax, no NMS).

**Model-only** (GPU compute isolated):

| Model | p50 @c=1 | p99 @c=1 | GPU infer time | Peak throughput |
|-------|----------|----------|----------------|-----------------|
| geoclassifier (ONNX FP32) | 42ms | 43ms | 37ms | 26 inf/s |
| geoclassifier_trt (TRT FP16) | 46ms | 49ms | 28ms | 35 inf/s |

TRT's GPU compute time is 25% faster (28ms vs 37ms), but total latency at c=1 is 9% *slower* (46ms vs 42ms) — TRT carries more fixed per-request overhead (CUDA context, server I/O) that only amortises under load. Peak throughput is 35% higher with TRT.

**Pipeline:**

| Pipeline | p50 @c=1 | p99 @c=1 | Peak throughput | Saturates at |
|----------|----------|----------|-----------------|--------------|
| geoclassifier_pipeline (ONNX) | 46ms | 47ms | 26 inf/s | c=2 |
| geoclassifier_trt_pipeline (TRT FP16) | 58ms | 62ms | 31 inf/s | c=3 |

The TRT advantage carries through end-to-end (31 vs 26 inf/s peak) even though it's slower for single requests. Pre/postprocess adds almost no overhead — only 4ms on top of the ONNX model-only latency.

**Why the single-request regression matters:** unlike YOLOv8s, converting this model to TRT required three separate compatibility fixes (IR version downgrade, `onnxsim`, re-export at opset 12) — EfficientNet-V2's squeeze-excitation blocks aren't cleanly supported by TRT 8.6's ONNX importer. Combined with Pascal's (compute 6.1) more modest FP16 gains, TRT is the right choice under load, but ONNX Runtime is better for latency-sensitive single-request serving of this model.

## Bottleneck progression

From first pipeline to final: **+34% throughput** (59 → 79 inf/s) and **-30% latency** (35.6 → 25.0ms).

1. TRT helps, but the Python GIL in preprocess prevents the GPU from reaching capacity (59 → 75 inf/s, GPU alone at 88 inf/s).
2. Removing the GIL (C++ preprocess) cuts latency by 31% and closes the gap to the GPU ceiling — preprocess is no longer the bottleneck, the GPU is (79 inf/s).
3. Dynamic batching shows no gain, confirming the GPU is genuinely saturated at batch=1, not just appearing to be.

The most expensive hardware resource (GPU) ends up the limiting factor, not CPU software overhead. Tested in exp 01, gRPC vs HTTP showed no measurable difference — protocol overhead is negligible next to preprocess and GPU compute time.

*This progression tracks the `yolov8s` detection pipeline through exp 01–03. `geoclassifier` (exp 04) is a separate model/track and isn't part of the same optimisation arc — it exists to test whether the same TRT-conversion approach generalises to a different architecture.*

## Benchmark summary

| Exp | Scope | Configuration | p50 @c=1 | Peak throughput | Saturates at |
|-----|-------|---------------|----------|-----------------|--------------|
| 01 | model | ONNX | 26ms | 58 inf/s | c=2 |
| 01 | model | TRT FP16 | 22ms | 88 inf/s | c=4 |
| 01 | pipeline | ONNX + Python preprocess ×2 | 35.6ms | 59 inf/s | c=3 |
| 01 | pipeline | TRT + Python preprocess ×2 | 36.2ms | 75 inf/s | c=5 |
| 02 | preprocess | Python (isolated) | 22ms | 87 inf/s | c=3 |
| 02 | preprocess | C++ (isolated) | 12.7ms | 114 inf/s | c=3 |
| 02 | pipeline | TRT + C++ preprocess | 25.0ms | 79 inf/s | c=3 |
| 02 | postprocess | Python (isolated) | 6.6ms | 332 inf/s | c=5 |
| 03 | model | ONNX, no batching | 26.6ms | 58 inf/s | c=2 |
| 03 | model | ONNX, dynamic batching | 28.0ms | 60 inf/s | c=6 |
| 04 | model | Geoclassifier ONNX FP32 | 42ms | 26 inf/s | c=2 |
| 04 | model | Geoclassifier TRT FP16 | 46ms | 35 inf/s | c=2 |
| 04 | pipeline | Geoclassifier ONNX FP32 | 46ms | 26 inf/s | c=2 |
| 04 | pipeline | Geoclassifier TRT FP16 | 58ms | 31 inf/s | c=3 |

Exp 01–03 input: 1280×720 JPEG, letterboxed to 640×640 (`yolov8s`). Exp 04 input: JPEG resized to 512×512 and center-cropped to 480×480 (`geoclassifier`).

## Benchmarking

Model-only tests use `perf_analyzer` from the Triton SDK container; pipeline tests use a custom load tester (`benchmarks/load_test.py`) handling binary JPEG input over HTTP or gRPC. Full methodology, raw numbers, and analysis live in each experiment's `notes.md` in the repo.
