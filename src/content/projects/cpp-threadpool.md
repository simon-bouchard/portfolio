---
title: "C++ Thread Pool"
description: "A thread pool with work-stealing and dependency-graph task scheduling in C++23, built to internalize concurrency-safety habits — ASan/UBSan/TSan, deliberate lock scoping — rather than just getting multithreaded code to pass once."
stack: ["C++23", "CMake", "GoogleTest", "ASan/UBSan/TSan", "GitHub Actions"]
featured: false
date: "2026-07"
repo: "https://github.com/simon-bouchard/cpp-threadpool"
cover: "/projects/cpp-threadpool/cover.jpg"
icon: "/projects/cpp-threadpool/icon.png"
highlights:
  - "Dependency-graph scheduling: tasks wait on others via a per-task waiter_list, become runnable when their dependency count hits zero"
  - "Failure propagation across transitive and diamond-shaped dependency chains — a thrown dependency skips everything downstream"
  - "Work-stealing deques: a worker pushes newly-ready dependents to its own queue for cache locality, idle workers steal from busy neighbors"
  - "std::jthread + std::stop_token for cooperative shutdown instead of a hand-rolled atomic flag"
  - "PIMPL on ThreadPool and Worker keeps mutex/condition_variable/deque/thread out of public headers"
tags: ["C++", "Systems", "Concurrency"]
---

## Overview

A thread pool with work-stealing and dependency-graph scheduling, written in C++23. A personal project to consolidate concurrency fundamentals — mutexes, condition variables, futures/promises — and the concurrency-safety habits that come with writing multithreaded code correctly rather than just getting it to pass once.

## Features

- **Arbitrary task submission** — `submit(fn, args...)` accepts any callable and argument list, returning a `TaskHandle<T>` (a thin wrapper over `std::shared_future<T>`) via `std::invoke_result_t` and variadic templates. Return type and exceptions both propagate through to `.get()`.
- **Dependency graph scheduling** — `submit_with_deps(deps, fn, args...)` lets a task wait on the completion of others before it becomes eligible to run. Dependents are tracked via a `waiter_list` on each task rather than a central registry; a task becomes runnable the moment its dependency count reaches zero.
- **Failure propagation** — if a dependency throws, everything downstream of it (including transitively, through multi-level chains and diamond-shaped graphs) is skipped rather than run, and the original exception surfaces at `.get()` on any dependent, not just the task that actually failed.
- **Work-stealing** — each worker owns its own deque. Newly-ready dependent tasks are pushed onto the worker that just completed their dependency (for cache locality), and idle workers steal from each other's deques when their own is empty rather than blocking on a single shared queue.
- **Clean shutdown** — the pool signals every worker to stop and joins all of them before any worker's internal state is torn down, avoiding a use-after-free between still-running workers and the ones already being destroyed.

## Architecture

Fresh submissions are spread round-robin across a fixed set of workers, each holding its own deque. When a worker finishes a task, any dependent tasks that just became ready are pushed onto that same worker's own queue rather than round-robined, which is also why a worker can end up with more queued work than its neighbors. Idle workers correct that imbalance by stealing from a busy neighbor's queue instead of blocking on a shared structure.

## Design notes

- **PIMPL** on both `ThreadPool` and `Worker`, keeping `<mutex>`, `<condition_variable>`, `<deque>`, and `<thread>` out of the public headers.
- **Type erasure** via `std::function` wraps each task's `std::packaged_task<R()>` so the pool's internal queues can hold tasks of any return type uniformly.
- **`std::jthread` + `std::stop_token`** for worker lifecycle — cooperative shutdown without a hand-rolled atomic flag.
- Each `Worker` owns its own deque and its own mutex — deliberately fine-grained, since this is the point of the per-worker-queue design: one worker's queue operations never serialize against another's.
- Dependency-graph bookkeeping (`waiter_list`, `dep_count`, `completed`/`failed`) is protected by one mutex shared across the whole pool, not per-task. A `submit_with_deps` for task A and a `complete_task` for an unrelated task B will serialize against each other under this scheme, even though they touch disjoint data — a per-task mutex would remove that, at the cost of real complexity. Chosen as the simpler default on the assumption that task granularity (loops, sleeps, string formatting) dwarfs the time spent holding this lock — a named contention/simplicity tradeoff, not an oversight.

## Known limitations

- **No cycle detection.** A cyclic dependency graph will deadlock rather than fail fast at submission time.
- **No central pending-task registry.** Tasks blocked on a dependency are reachable only via their dependency's `waiter_list`; there's no O(1) view of everything currently pending, and tasks still pending at pool destruction are silently dropped rather than erroring.

Both are accepted scope boundaries for a learning project, not oversights — a production scheduler would need at least the first.

## Build & test

```bash
cmake -S . -B build
cmake --build build -j$(nproc)
ctest --test-dir build --output-on-failure
```

Sanitizer builds use separate build directories, since ASan/UBSan and TSan can't coexist in one binary. CI runs three jobs on every push and pull request: `actionlint` (lints the workflow file itself), then the ASan+UBSan and TSan builds/test suites in parallel.

## Requirements

- C++23 compiler (developed against GCC 14)
- CMake ≥ 3.20
