# OS Algorithm Visualizer – Banking & ATM Transaction Processing System

**Operating Systems · Assignment 3 / Practical 9 · Problem 5 · 5th Semester**  
**Authors:** Tejas Vilas Adhal (UID 24003010) &amp; Pawan Rathod (UID 24003119)  
**College:** St. Vincent Pallotti College of Engineering & Technology  
**Guide:** Dr. Pallavi Wankhede

---

## Overview

A fully interactive, dependency-free web visualizer that demonstrates four core OS concepts on a **unified banking/ATM scenario** — ATM withdrawals, deposits, fund transfers, balance inquiries, and transaction logging running concurrently on a shared system.

**Pipeline:** Requests → Producer–Consumer Buffer → CPU Scheduler → Banker's Safety Check → Memory Allocation → Release

---

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell & HTML structure |
| `style.css` | All styles (light/dark theme, animations, components) |
| `script.js` | All algorithms, animation logic, UI rendering |
| `tests.html` | Automated test assertions (21 tests, runs in-browser) |
| `README.md` | This documentation |
| `OS_Assignment3_Case_Study_Report.docx` | Case study report |

---

## Run

```bash
# Just open index.html in any browser — no server, no install needed.
# Windows: double-click index.html
# macOS/Linux: open index.html
```

For a live demo, deploy to GitHub Pages:
- Settings → Pages → Source: `main` branch, root `/`

---

## Features by Module

### ⚙️ CPU Scheduling
- **Algorithms:** FCFS, SJF (non-preemptive), SRTF (preemptive SJF), Priority (non-preemptive), Priority (preemptive), Round Robin
- **Animated Gantt chart** with ▶ Play, ⏸ Pause, ⏭ Step and Speed controls
- **Live ready-queue display** showing which transactions are waiting at each time unit
- Comparison table across all algorithms
- Export results as `.txt`

### 📦 Producer–Consumer (Bounded Buffer)
- Multiple producers (ATM/Branch) and consumers (processing threads)
- Visual semaphore dashboard: `empty`, `full`, `mutex` with live values
- Producer/consumer state display: idle, running, blocked
- Manual produce/consume and Auto mode with adjustable speed
- Full event log (timestamps, semaphore operations)
- Export event log

### 🔐 Banker's Algorithm
- Step-by-step animated safety trace (Work vector updates highlighted)
- Colour-coded steps: ✓ process finishes, ✗ cannot proceed
- Resource request check: Need ≤ Available → pretend-allocate → safety re-check → GRANTED or DENIED with rollback
- Input validation with clear error messages
- Export trace

### 🗂️ Memory Management
- **Fixed partition algorithms:** First Fit, Best Fit, Worst Fit, Next Fit
- **Dynamic (variable) partitioning** with exact-size allocation and **Compaction**
- Proportional memory map — hatched = internal fragmentation, red-hatched = external fragmentation
- Free a specific process from memory
- Compare all fixed algorithms in one table
- Export results

### 🔗 Integrated Pipeline
- Animated end-to-end run: Buffer → Scheduler → Banker's → Memory
- Live event log with timestamps showing how the four modules interact
- Step-by-step reveal with active/done state indicators
- Export pipeline log

---

## Verified Test Data & Expected Results

### Transactions (default)

| ID | Type | Arrival | Burst | Priority (1=highest) |
|---|---|---|---|---|
| T1 | ATM Withdrawal | 0 | 5 | 2 |
| T2 | Deposit | 1 | 3 | 3 |
| T3 | Fund Transfer | 2 | 8 | 1 |
| T4 | Balance Inquiry | 3 | 2 | 4 |
| T5 | Transaction Logging | 4 | 4 | 5 |

### CPU Scheduling Results

| Algorithm | Avg Waiting Time | Avg Turnaround |
|---|---|---|
| FCFS | **7.40** | 10.60 |
| SJF (non-preemptive) | **5.20** | 8.60 |
| Priority (non-preemptive) | **8.40** | 11.60 |
| Round Robin (q=2) | **9.40** | 12.80 |

### Banker's Algorithm

- **Allocation:** `[[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]]`
- **Maximum:** `[[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]]`
- **Available:** `[3,3,2]`
- **Safe sequence:** `T2 → T4 → T5 → T1 → T3`
- **T5 requesting [3,3,0]:** DENIED (leads to unsafe state)
- **T2 requesting [1,0,2]:** GRANTED (state remains safe)

### Memory Management

- **Partitions:** 100, 500, 200, 300, 600 KB (total = 1700 KB)
- **Requests:** 212 (T1), 417 (T2), 112 (T3), 426 (T4), 80 (T5) KB

| Algorithm | Allocated | Utilization | Internal Frag | Unallocated |
|---|---|---|---|---|
| Best Fit | 5/5 | **73.4%** | **453 KB** | none |
| First Fit | 4/5 | **48.3%** | 0 KB | T4 |
| Worst Fit | 4/5 | **48.3%** | 0 KB | T4 |

---

## Accessibility

- Keyboard navigation: Tab through nav buttons, Arrow Left/Right to switch tabs
- All interactive elements have `aria-label` and `role` attributes
- `aria-live` regions for dynamic output (screen reader friendly)
- High-contrast color palette with 4.5:1+ contrast ratios
- Dark/light theme toggle with system preference detection

---

## Architecture

```
index.html          ← App shell, semantic HTML
style.css           ← CSS custom properties (theming), layout, animations
script.js           ← Algorithms + rendering + animation engine
tests.html          ← Self-contained test suite (21 assertions)
```

All files are **plain HTML/CSS/JS** — no frameworks, no build step, no CDN dependencies.

---

## Screenshots Section

> _Open `index.html` in a browser and use browser screenshot tools, or use the DevTools "Capture screenshot" feature._

---

## Changelog (v2.0)

- Split monolithic `index.html` into `index.html` + `style.css` + `script.js`
- Added light/dark theme toggle with system preference detection
- Added SRTF (preemptive SJF) and Preemptive Priority algorithms
- Added animated Gantt chart with Play/Pause/Step/Speed controls
- Added live ready-queue display
- Added multiple producers/consumers in Producer–Consumer module
- Added semaphore dashboard with blocked state visualization
- Added step-by-step animated Banker's safety trace
- Added dynamic (variable) partitioning with compaction
- Added Next Fit algorithm
- Added proportional memory map with external fragmentation highlight
- Added "Free process" button in Memory Management
- Made Integrated Run an animated step-by-step pipeline with live event log
- Added Export buttons for all modules (text/CSV download)
- Added `tests.html` with 21 automated assertions
- Improved accessibility: keyboard navigation, ARIA labels, roles, `aria-live`
- Updated README

---

*Verified results are locked and tested in `tests.html`. Open it in a browser to run all 21 assertions.*
