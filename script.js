/**
 * OS Algorithm Visualizer – Banking & ATM Transaction Processing System
 * script.js  |  Authors: Tejas Vilas Adhal (UID 24003010) & Pawan Rathod (UID 24003119)
 * Single-file dependency-free implementation.
 *
 * Modules:
 *   1. CPU Scheduling (FCFS, SJF, SRTF, Priority, Preemptive Priority, RR)
 *   2. Producer-Consumer (bounded buffer + semaphores, animated)
 *   3. Banker's Algorithm (animated safety check, resource requests)
 *   4. Memory Management (fixed + dynamic, First/Best/Worst/Next Fit, compaction)
 *   5. Integrated Pipeline (end-to-end animated run)
 */

'use strict';

/* ============================================================
   UTILITIES
   ============================================================ */

/** Get element by id */
const $ = id => document.getElementById(id);

/** 7 distinct palette colors mapped to T1..T7 */
const PALETTE = ['#3b82f6','#f59e0b','#10b981','#8b5cf6','#ef4444','#06b6d4','#ec4899'];
const txColor = i => i < 0 ? '#94a3b8' : PALETTE[i % PALETTE.length];

/** Transaction names for banking context */
const TX_NAMES = ['ATM Withdrawal','Deposit','Fund Transfer','Balance Inquiry','Tx Logging'];

/** Parse integer matrix from textarea (rows by newline, cols by space/comma) */
function parseMatrix(str) {
  return str.trim().split('\n').map(r =>
    r.trim().split(/[\s,]+/).map(Number)
  );
}

/** Parse single row of numbers */
function parseRow(str) {
  return str.trim().split(/[\s,]+/).map(Number);
}

/** Build an HTML table string */
function buildTable(headers, rows, colClasses = []) {
  const hdr = headers.map(h => `<th>${h}</th>`).join('');
  const bdy = rows.map(r =>
    `<tr>${r.map((c, j) => `<td class="${colClasses[j] || ''}">${c}</td>`).join('')}</tr>`
  ).join('');
  return `<div class="table-wrap"><table><tr>${hdr}</tr>${bdy}</table></div>`;
}

/** Show/hide section and highlight nav button */
function switchTab(id) {
  document.querySelectorAll('section[data-tab]').forEach(s =>
    s.classList.toggle('active', s.dataset.tab === id)
  );
  document.querySelectorAll('#main-nav button').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === id)
  );
}

/** Theme toggle */
function initTheme() {
  const btn = $('theme-toggle');
  const apply = dark => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    btn.textContent = dark ? '☀ Light' : '🌙 Dark';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  };
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  apply(saved ? saved === 'dark' : prefersDark);
  btn.addEventListener('click', () => {
    apply(document.documentElement.getAttribute('data-theme') !== 'dark');
  });
}

/** Export results as a text file */
function exportResults(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ============================================================
   MODULE 1: CPU SCHEDULING
   ============================================================ */

/**
 * Parse the CPU textarea into an array of process objects.
 * Format: ID,arrival,burst,priority (one per line)
 */
function parseCPUInput() {
  return $('cpuIn').value.trim().split('\n').map((line, idx) => {
    const parts = line.split(',').map(s => s.trim());
    return {
      id: parts[0] || `P${idx+1}`,
      at: parseInt(parts[1]) || 0,
      bt: parseInt(parts[2]) || 1,
      pr: parseInt(parts[3]) || 0,
      idx           // original index for color
    };
  });
}

/**
 * Core scheduling simulation.
 * Returns { gantt, processes, avgWait, avgTAT }
 * Supported algos: FCFS, SJF, SRTF, PRIORITY, PRIORITY_PRE, RR
 */
function schedule(procs0, algo, quantum) {
  // Deep copy with working fields
  const P = procs0.map(p => ({ ...p, rem: p.bt, ct: null, wt: 0, tat: 0 }));
  const gantt = [];   // { id, s, e, idx }
  let t = 0, done = 0;

  /** Append/merge a gantt block */
  const push = (id, s, e, idx) => {
    const last = gantt[gantt.length - 1];
    if (last && last.id === id && last.e === s) { last.e = e; return; }
    gantt.push({ id, s, e, idx });
  };

  if (algo === 'RR') {
    const sorted = [...P].sort((a, b) => a.at - b.at || a.idx - b.idx);
    const queue = [];
    let k = 0;
    const enqueueArrivals = () => {
      while (k < sorted.length && sorted[k].at <= t) queue.push(sorted[k++]);
    };
    enqueueArrivals();
    while (done < P.length) {
      if (!queue.length) {
        // Idle
        const nextAt = sorted[k].at;
        push('Idle', t, nextAt, -1);
        t = nextAt;
        enqueueArrivals();
        continue;
      }
      const p = queue.shift();
      const slice = Math.min(quantum, p.rem);
      push(p.id, t, t + slice, p.idx);
      t += slice;
      p.rem -= slice;
      enqueueArrivals();
      if (p.rem > 0) queue.push(p);
      else { p.ct = t; done++; }
    }
  } else if (algo === 'SRTF') {
    // Preemptive SJF: at each unit pick shortest remaining
    while (done < P.length) {
      const avail = P.filter(p => p.ct === null && p.at <= t);
      if (!avail.length) {
        const nextAt = Math.min(...P.filter(p => p.ct === null).map(p => p.at));
        push('Idle', t, nextAt, -1);
        t = nextAt;
        continue;
      }
      avail.sort((a, b) => a.rem - b.rem || a.at - b.at || a.idx - b.idx);
      const p = avail[0];
      // Find next event time (arrival of any unstarted process or completion)
      const nextArrivals = P.filter(q => q.ct === null && q.at > t).map(q => q.at);
      const nextEvent = nextArrivals.length ? Math.min(...nextArrivals) : Infinity;
      const runUntil = Math.min(t + p.rem, nextEvent);
      push(p.id, t, runUntil, p.idx);
      p.rem -= (runUntil - t);
      t = runUntil;
      if (p.rem === 0) { p.ct = t; done++; }
    }
  } else if (algo === 'PRIORITY_PRE') {
    // Preemptive Priority (lower number = higher priority)
    while (done < P.length) {
      const avail = P.filter(p => p.ct === null && p.at <= t);
      if (!avail.length) {
        const nextAt = Math.min(...P.filter(p => p.ct === null).map(p => p.at));
        push('Idle', t, nextAt, -1);
        t = nextAt;
        continue;
      }
      avail.sort((a, b) => a.pr - b.pr || a.at - b.at || a.idx - b.idx);
      const p = avail[0];
      const nextArrivals = P.filter(q => q.ct === null && q.at > t && q.pr < p.pr).map(q => q.at);
      const nextEvent = nextArrivals.length ? Math.min(...nextArrivals) : Infinity;
      const runUntil = Math.min(t + p.rem, nextEvent);
      push(p.id, t, runUntil, p.idx);
      p.rem -= (runUntil - t);
      t = runUntil;
      if (p.rem === 0) { p.ct = t; done++; }
    }
  } else {
    // Non-preemptive: FCFS, SJF, PRIORITY
    while (done < P.length) {
      const avail = P.filter(p => p.ct === null && p.at <= t);
      if (!avail.length) {
        const nextAt = Math.min(...P.filter(p => p.ct === null).map(p => p.at));
        push('Idle', t, nextAt, -1);
        t = nextAt;
        continue;
      }
      avail.sort((a, b) => {
        if (algo === 'SJF')      return a.bt - b.bt || a.at - b.at || a.idx - b.idx;
        if (algo === 'PRIORITY') return a.pr - b.pr || a.at - b.at || a.idx - b.idx;
        return a.at - b.at || a.idx - b.idx; // FCFS
      });
      const p = avail[0];
      push(p.id, t, t + p.bt, p.idx);
      t += p.bt;
      p.ct = t;
      done++;
    }
  }

  // Compute wait time and turnaround
  P.forEach(p => {
    p.tat = p.ct - p.at;
    p.wt  = p.tat - p.bt;
  });
  const n = P.length;
  return {
    gantt, P,
    avgWait: P.reduce((s, p) => s + p.wt,  0) / n,
    avgTAT:  P.reduce((s, p) => s + p.tat, 0) / n
  };
}

/* --- Gantt animation state --- */
let ganttAnim = null;  // { gantt, stepIdx, intervalId, speed }

/** Render a static Gantt chart (all blocks visible) */
function renderGantt(gantt, highlightIdx = -1) {
  const total = gantt[gantt.length - 1].e - gantt[0].s;
  const blocks = gantt.map((b, i) => {
    const w = ((b.e - b.s) / total * 100).toFixed(2);
    const isHighlight = i === highlightIdx;
    return `<div class="gantt-block ${isHighlight ? 'gantt-highlight' : ''}"
      style="flex:0 0 ${w}%;background:${txColor(b.idx)}"
      aria-label="${b.id} (${b.s}–${b.e})">
      <span class="tick-start">${b.s}</span>
      <span style="font-weight:700;font-size:.75rem;pointer-events:none">${b.id}</span>
      ${i === gantt.length - 1 ? `<span class="tick-end">${b.e}</span>` : ''}
    </div>`;
  }).join('');
  return `<div class="gantt" role="img" aria-label="Gantt chart">${blocks}</div>`;
}

/** Render ready queue for a given time */
function renderReadyQueue(gantt, P, t, algo) {
  const ready = P.filter(p => p.at <= t && p.ct == null);
  if (!ready.length) return '<span class="muted">empty</span>';
  return ready.map(p =>
    `<span class="rq-item" style="background:${txColor(p.idx)}">${p.id} (rem:${p.rem})</span>`
  ).join('');
}

/** Render the full CPU scheduling output */
function renderCPUOutput(result, algo, quantum) {
  const { gantt, P, avgWait, avgTAT } = result;

  // Table rows
  const rows = P.map(p => [
    `<b>${p.id}</b>`,
    p.at, p.bt, p.pr,
    p.ct, p.tat, p.wt
  ]);

  const algoLabel = {
    FCFS: 'First-Come First-Served',
    SJF: 'Shortest Job First (non-preemptive)',
    SRTF: 'Shortest Remaining Time First (preemptive SJF)',
    PRIORITY: 'Priority Scheduling (non-preemptive)',
    PRIORITY_PRE: 'Priority Scheduling (preemptive)',
    RR: `Round Robin (quantum = ${quantum})`
  }[algo] || algo;

  return `
    <h3>${algoLabel}</h3>
    <div id="gantt-container" class="gantt-wrap">
      ${renderGantt(gantt)}
    </div>
    <div class="gantt-controls">
      <button class="btn small" id="gc-play" onclick="gcPlay()">▶ Play</button>
      <button class="btn small secondary" id="gc-pause" onclick="gcPause()">⏸ Pause</button>
      <button class="btn small secondary" id="gc-step" onclick="gcStep()">⏭ Step</button>
      <button class="btn small secondary" onclick="gcReset()">⏹ Reset</button>
      <label>Speed:</label>
      <input type="range" class="speed-slider" id="gc-speed" min="1" max="10" value="5"
        aria-label="Animation speed" oninput="gcSpeedUpdate(this.value)">
      <span id="gc-speed-label" class="muted">5x</span>
    </div>
    <div class="ready-queue-wrap">
      <div class="muted" style="font-size:.78rem;margin-bottom:4px">Ready Queue at t=<b id="gc-t">0</b>:</div>
      <div class="ready-queue" id="gc-queue">–</div>
    </div>
    ${buildTable(
      ['Process','Arrival','Burst','Priority','Completion','Turnaround','Waiting'],
      rows
    )}
    <div class="result-bar">
      <span>Avg Waiting Time: <strong>${avgWait.toFixed(2)}</strong></span>
      <span>Avg Turnaround Time: <strong>${avgTAT.toFixed(2)}</strong></span>
      <button class="btn small secondary" onclick="exportCPU()">⬇ Export</button>
    </div>
  `;
}

/** Initialize gantt animation state */
function gcInitAnim(gantt, P, algo) {
  if (ganttAnim && ganttAnim.intervalId) clearInterval(ganttAnim.intervalId);
  ganttAnim = { gantt, P, algo, stepIdx: -1, intervalId: null, speed: 5 };
}

function gcPlay() {
  if (!ganttAnim) return;
  if (ganttAnim.intervalId) return; // already playing
  const delay = () => Math.max(100, 1100 - ganttAnim.speed * 100);
  ganttAnim.intervalId = setInterval(() => {
    if (!gcStep()) {
      clearInterval(ganttAnim.intervalId);
      ganttAnim.intervalId = null;
      $('gc-play').disabled = true;
    }
  }, delay());
}

function gcPause() {
  if (!ganttAnim) return;
  clearInterval(ganttAnim.intervalId);
  ganttAnim.intervalId = null;
}

function gcStep() {
  if (!ganttAnim) return false;
  ganttAnim.stepIdx++;
  if (ganttAnim.stepIdx >= ganttAnim.gantt.length) {
    ganttAnim.stepIdx = ganttAnim.gantt.length - 1;
    return false;
  }
  const b = ganttAnim.gantt[ganttAnim.stepIdx];
  const gc = $('gantt-container');
  if (gc) gc.innerHTML = renderGantt(ganttAnim.gantt, ganttAnim.stepIdx);
  const gt = $('gc-t');
  if (gt) gt.textContent = b.e;
  // Ready queue: mark processes that haven't finished yet and have arrived
  const qEl = $('gc-queue');
  if (qEl) {
    const t = b.e;
    const finished = new Set(ganttAnim.gantt.slice(0, ganttAnim.stepIdx + 1)
      .filter(x => x.idx >= 0)
      .map(x => x.id));
    // Build ready items: arrived by t, not the current one, not finished
    const readyItems = ganttAnim.P.filter(p =>
      p.at <= t && p.id !== b.id && !finished.has(p.id)
    );
    qEl.innerHTML = readyItems.length
      ? readyItems.map(p => `<span class="rq-item" style="background:${txColor(p.idx)}">${p.id}</span>`).join('')
      : '<span class="muted">empty</span>';
  }
  return true;
}

function gcReset() {
  if (!ganttAnim) return;
  gcPause();
  ganttAnim.stepIdx = -1;
  const gc = $('gantt-container');
  if (gc) gc.innerHTML = renderGantt(ganttAnim.gantt);
  const gt = $('gc-t'); if (gt) gt.textContent = '0';
  const qEl = $('gc-queue'); if (qEl) qEl.innerHTML = '–';
  const playBtn = $('gc-play'); if (playBtn) playBtn.disabled = false;
}

function gcSpeedUpdate(val) {
  const lbl = $('gc-speed-label'); if (lbl) lbl.textContent = val + 'x';
  if (ganttAnim) {
    ganttAnim.speed = +val;
    if (ganttAnim.intervalId) {
      gcPause(); gcPlay();
    }
  }
}

/** Run the selected CPU algorithm */
function runCPU() {
  const procs = parseCPUInput();
  const algo = $('cpuAlgo').value;
  const q = parseInt($('cpuQ').value) || 2;
  let result;
  try {
    result = schedule(procs, algo, q);
  } catch(e) {
    $('cpuOut').innerHTML = `<p class="no-text">Error: ${e.message}</p>`;
    return;
  }
  $('cpuOut').innerHTML = renderCPUOutput(result, algo, q);
  gcInitAnim(result.gantt, result.P, algo);
}

/** Compare all algorithms */
function compareCPU() {
  const procs = parseCPUInput();
  const q = parseInt($('cpuQ').value) || 2;
  const algos = [
    ['FCFS',         'FCFS'],
    ['SJF',          'SJF (non-preemptive)'],
    ['SRTF',         'SRTF (preemptive SJF)'],
    ['PRIORITY',     'Priority (non-preemptive)'],
    ['PRIORITY_PRE', 'Priority (preemptive)'],
    ['RR',           `Round Robin (q=${q})`]
  ];
  const rows = algos.map(([a, label]) => {
    const r = schedule(procs, a, q);
    return [label, r.avgWait.toFixed(2), r.avgTAT.toFixed(2)];
  });
  $('cpuOut').innerHTML = `<h3>Algorithm Comparison</h3>` +
    buildTable(['Algorithm', 'Avg Waiting Time', 'Avg Turnaround Time'], rows) +
    `<div class="result-bar"><button class="btn small secondary" onclick="exportCompareCPU()">⬇ Export Comparison</button></div>`;
}

function exportCPU() {
  const procs = parseCPUInput();
  const algo = $('cpuAlgo').value;
  const q = parseInt($('cpuQ').value) || 2;
  const r = schedule(procs, algo, q);
  let txt = `OS Algorithm Visualizer – CPU Scheduling Results\nAlgorithm: ${algo}\n\n`;
  txt += 'ID\tArrival\tBurst\tPriority\tCompletion\tTurnaround\tWaiting\n';
  r.P.forEach(p => {
    txt += `${p.id}\t${p.at}\t${p.bt}\t${p.pr}\t${p.ct}\t${p.tat}\t${p.wt}\n`;
  });
  txt += `\nAvg Waiting: ${r.avgWait.toFixed(2)}\nAvg Turnaround: ${r.avgTAT.toFixed(2)}\n`;
  exportResults('cpu_scheduling_results.txt', txt);
}

function exportCompareCPU() {
  const procs = parseCPUInput();
  const q = parseInt($('cpuQ').value) || 2;
  let txt = 'OS Algorithm Visualizer – CPU Scheduling Comparison\n\nAlgorithm\tAvg Waiting\tAvg Turnaround\n';
  [['FCFS','FCFS'],['SJF','SJF'],['SRTF','SRTF'],['PRIORITY','Priority'],['PRIORITY_PRE','Priority Pre'],['RR','RR']].forEach(([a, lbl]) => {
    const r = schedule(procs, a, q);
    txt += `${lbl}\t${r.avgWait.toFixed(2)}\t${r.avgTAT.toFixed(2)}\n`;
  });
  exportResults('cpu_comparison.txt', txt);
}

/* ============================================================
   MODULE 2: PRODUCER-CONSUMER (Bounded Buffer)
   ============================================================ */

let PC = null;   // shared state
let pcAutoTimer = null;

const PC_TX = ['Withdraw#', 'Deposit#', 'Transfer#', 'Balance#', 'Log#'];

function pcReset() {
  clearInterval(pcAutoTimer);
  pcAutoTimer = null;
  $('pcAutoBtn').textContent = '▶ Auto';
  const N = Math.max(1, Math.min(10, parseInt($('pcBufSize').value) || 4));
  const numProd = Math.max(1, Math.min(4, parseInt($('pcNumProd').value) || 2));
  const numCons = Math.max(1, Math.min(4, parseInt($('pcNumCons').value) || 2));
  PC = {
    N,
    buf: [],           // current items in buffer (array of strings)
    seq: 0,            // item counter
    log: [],           // event log lines
    producers: Array.from({ length: numProd }, (_, i) => ({ id: i, state: 'idle', name: `ATM-${i + 1}` })),
    consumers: Array.from({ length: numCons }, (_, i) => ({ id: i, state: 'idle', name: `Processor-${i + 1}` })),
  };
  pcRender();
}

/** Compute semaphore values */
function pcSems() {
  return {
    empty: PC.N - PC.buf.length,
    full:  PC.buf.length,
    mutex: 1   // always 1 in our step model (no concurrent threads)
  };
}

/** Append a log entry and re-render */
function pcLog(html) {
  const ts = new Date().toLocaleTimeString('en-IN', { hour12: false });
  PC.log.push(`<span class="muted">[${ts}]</span> ${html}`);
  if (PC.log.length > 60) PC.log.shift();
}

/** Render Producer-Consumer UI */
function pcRender() {
  const { empty, full } = pcSems();
  const N = PC.N;

  // Buffer slots
  let slotsHtml = '';
  for (let i = 0; i < N; i++) {
    const item = PC.buf[i];
    const cls = item ? 'pc-slot filled' : 'pc-slot';
    const txIdx = item ? PC_TX.findIndex(t => item.startsWith(t.replace('#',''))) : -1;
    const bg = item ? `background:${txColor(txIdx)};border-color:${txColor(txIdx)}` : '';
    slotsHtml += `<div class="${cls}" style="${bg}" aria-label="${item || 'empty'}">${item || 'empty'}</div>`;
  }

  // Producers
  let prodHtml = PC.producers.map(p =>
    `<div class="pc-actor ${p.state}" aria-label="${p.name} (${p.state})">
      <div class="dot"></div>
      <div>
        <div style="font-weight:700">${p.name}</div>
        <div style="font-size:.72rem;color:var(--text-muted)">${p.state}</div>
      </div>
    </div>`
  ).join('');

  // Consumers
  let consHtml = PC.consumers.map(c =>
    `<div class="pc-actor ${c.state}" aria-label="${c.name} (${c.state})">
      <div class="dot"></div>
      <div>
        <div style="font-weight:700">${c.name}</div>
        <div style="font-size:.72rem;color:var(--text-muted)">${c.state}</div>
      </div>
    </div>`
  ).join('');

  // Semaphores
  const semHtml = `
    <div class="semaphore-display" aria-live="polite">
      <div class="sem-badge ${empty === 0 ? 'zero' : empty > 0 ? 'active' : ''}">
        <div class="sem-name">empty</div>
        <div class="sem-val">${empty}</div>
      </div>
      <div class="sem-badge ${full === 0 ? 'zero' : full > 0 ? 'active' : ''}">
        <div class="sem-name">full</div>
        <div class="sem-val">${full}</div>
      </div>
      <div class="sem-badge active">
        <div class="sem-name">mutex</div>
        <div class="sem-val">1</div>
      </div>
    </div>`;

  $('pcLayout').innerHTML = `
    <div class="pc-layout">
      <div>
        <div class="muted" style="font-size:.78rem;text-align:center;margin-bottom:6px">
          PRODUCERS<br><span style="font-size:.7rem">(ATMs / Branches)</span>
        </div>
        <div class="pc-actors">${prodHtml}</div>
      </div>
      <div class="pc-buffer-area">
        <div class="pc-buffer-label">Buffer (${PC.buf.length}/${N})</div>
        <div class="pc-slots">${slotsHtml}</div>
        ${semHtml}
      </div>
      <div>
        <div class="muted" style="font-size:.78rem;text-align:center;margin-bottom:6px">
          CONSUMERS<br><span style="font-size:.7rem">(Processing Threads)</span>
        </div>
        <div class="pc-actors">${consHtml}</div>
      </div>
    </div>`;

  $('pcLog').innerHTML = PC.log.map(x => `<div class="event-log-entry">${x}</div>`).join('');
  $('pcLog').scrollTop = 1e9;
}

/** Pick a random producer index */
function pcPickProd() { return Math.floor(Math.random() * PC.producers.length); }
function pcPickCons() { return Math.floor(Math.random() * PC.consumers.length); }

/** Produce one item (called manually or from auto) */
function pcProduce(prodIdx = 0) {
  const p = PC.producers[prodIdx % PC.producers.length];
  if (PC.buf.length >= PC.N) {
    p.state = 'blocked';
    pcLog(`<span class="no-text">${p.name} BLOCKED</span> – wait(empty)=0; buffer full. T${PC.seq % 5 + 1} request queued.`);
    pcRender();
    setTimeout(() => { p.state = 'idle'; pcRender(); }, 600);
    return;
  }
  p.state = 'running';
  const txType = PC_TX[PC.seq % 5].replace('#','');
  const item = txType + '#' + (++PC.seq);
  PC.buf.push(item);
  pcLog(`<span class="ok-text">${p.name}</span>: wait(empty)→wait(mutex)→<b>insert ${item}</b>→signal(mutex)→signal(full)`);
  pcRender();
  setTimeout(() => { p.state = 'idle'; pcRender(); }, 400);
}

/** Consume one item */
function pcConsume(consIdx = 0) {
  const c = PC.consumers[consIdx % PC.consumers.length];
  if (PC.buf.length === 0) {
    c.state = 'blocked';
    pcLog(`<span class="no-text">${c.name} BLOCKED</span> – wait(full)=0; buffer empty.`);
    pcRender();
    setTimeout(() => { c.state = 'idle'; pcRender(); }, 600);
    return;
  }
  c.state = 'running';
  const item = PC.buf.shift();
  pcLog(`<span class="ok-text">${c.name}</span>: wait(full)→wait(mutex)→<b>remove ${item}</b>→signal(mutex)→signal(empty)→process`);
  pcRender();
  setTimeout(() => { c.state = 'idle'; pcRender(); }, 400);
}

/** Toggle auto mode */
function pcToggleAuto() {
  if (pcAutoTimer) {
    clearInterval(pcAutoTimer);
    pcAutoTimer = null;
    $('pcAutoBtn').textContent = '▶ Auto';
  } else {
    $('pcAutoBtn').textContent = '⏸ Pause';
    const speed = parseInt($('pcSpeed').value) || 700;
    pcAutoTimer = setInterval(() => {
      const r = Math.random();
      if (r < 0.5)      pcProduce(pcPickProd());
      else              pcConsume(pcPickCons());
    }, speed);
  }
}

function exportPC() {
  let txt = 'OS Algorithm Visualizer – Producer-Consumer Event Log\n\n';
  PC.log.forEach(l => { txt += l.replace(/<[^>]+>/g, '') + '\n'; });
  exportResults('producer_consumer_log.txt', txt);
}

/* ============================================================
   MODULE 3: BANKER'S ALGORITHM
   ============================================================ */

let bankerAnimSteps = [];
let bankerAnimIdx   = 0;
let bankerAnimTimer = null;

/**
 * Run Banker's safety algorithm.
 * Returns { N (need), safe, seq, steps }
 * steps = array of { proc, work_before, work_after, ok }
 */
function runBanker(A, M, V) {
  const n = A.length;
  // Need = Max - Alloc
  const N = A.map((row, i) => row.map((x, j) => M[i][j] - x));
  const fin = Array(n).fill(false);
  const seq = [];
  const steps = [];
  let W = [...V];
  let changed = true;

  while (seq.length < n && changed) {
    changed = false;
    for (let i = 0; i < n; i++) {
      if (fin[i]) continue;
      if (N[i].every((x, j) => x <= W[j])) {
        const wBefore = [...W];
        W = W.map((w, j) => w + A[i][j]);
        steps.push({
          proc: i,
          need: [...N[i]],
          work_before: wBefore,
          work_after: [...W],
          ok: true
        });
        fin[i] = true;
        seq.push(i);
        changed = true;
      }
    }
  }
  // Report any processes that couldn't finish
  for (let i = 0; i < n; i++) {
    if (!fin[i]) {
      steps.push({ proc: i, need: [...N[i]], work_before: [...W], work_after: [...W], ok: false });
    }
  }

  return { N, safe: seq.length === n, seq, steps };
}

/** Build the Banker state tables HTML */
function renderBankerTables(A, M, V) {
  const r = runBanker(A, M, V);
  const tableRows = A.map((row, i) => [
    `<b>T${i+1}</b>`,
    row.join(' '),
    M[i].join(' '),
    r.N[i].join(' ')
  ]);
  return buildTable(
    ['Process', 'Allocation', 'Maximum', 'Need (Max−Alloc)'],
    tableRows
  );
}

/** Render a single Banker step as HTML */
function renderBankerStep(step, idx, total, prevWork) {
  const cls = step.ok ? 'ok' : 'no';
  const wVec = step.work_before.map((v, j) => {
    const changed = step.work_after[j] !== v;
    return `<span${changed ? ' class="changed"' : ''}>${step.work_after[j]}</span>`;
  }).join('');
  return `<div class="banker-step ${cls}" style="animation-delay:${idx * 0.1}s">
    <b>Step ${idx+1}/${total}</b> – T${step.proc+1}:
    Need [${step.need}] ${step.ok ? '≤' : '>'} Work [${step.work_before}]
    → ${step.ok
      ? `<span class="ok-text">✓ Finishes</span>, Work = <span class="work-vector">${wVec}</span>`
      : `<span class="no-text">✗ Cannot proceed (insufficient resources)</span>`}
  </div>`;
}

/** Run and display Banker's check */
function doBankerCheck() {
  let A, M, V;
  try {
    A = parseMatrix($('bAlloc').value);
    M = parseMatrix($('bMax').value);
    V = parseRow($('bAvail').value);
  } catch(e) {
    $('bOut').innerHTML = `<p class="no-text">Parse error: ${e.message}</p>`;
    return;
  }
  // Validate
  const n = A.length;
  if (M.length !== n) { $('bOut').innerHTML = `<p class="no-text">Allocation and Maximum must have same number of rows.</p>`; return; }
  for (let i = 0; i < n; i++) {
    if (A[i].some((x, j) => x > M[i][j])) {
      $('bOut').innerHTML = `<p class="no-text">Error: Allocation[${i+1}] exceeds Maximum[${i+1}].</p>`;
      return;
    }
  }

  const r = runBanker(A, M, V);
  bankerAnimSteps = r.steps;
  bankerAnimIdx = 0;
  clearTimeout(bankerAnimTimer);

  $('bOut').innerHTML = `
    ${renderBankerTables(A, M, V)}
    <h3>Safety Algorithm Trace</h3>
    <div class="banker-controls">
      <button class="btn small" id="bk-play" onclick="bkPlay()">▶ Play</button>
      <button class="btn small secondary" id="bk-step" onclick="bkStep()">⏭ Step</button>
      <button class="btn small secondary" onclick="bkReset()">⏹ Reset</button>
      <button class="btn small secondary" onclick="exportBanker()">⬇ Export</button>
    </div>
    <div id="bk-steps"></div>
    <div id="bk-result"></div>
  `;

  // Store for animation
  window._bkResult = r;
  window._bkA = A; window._bkM = M; window._bkV = V;
}

function bkPlay() {
  if (!bankerAnimSteps.length) return;
  const tick = () => {
    if (bankerAnimIdx >= bankerAnimSteps.length) {
      bkShowFinal();
      return;
    }
    bkStep();
    bankerAnimTimer = setTimeout(tick, 700);
  };
  tick();
}

function bkStep() {
  if (bankerAnimIdx >= bankerAnimSteps.length) { bkShowFinal(); return; }
  const el = $('bk-steps');
  const step = bankerAnimSteps[bankerAnimIdx];
  el.innerHTML += renderBankerStep(step, bankerAnimIdx, bankerAnimSteps.length, null);
  el.scrollTop = 1e9;
  bankerAnimIdx++;
  if (bankerAnimIdx >= bankerAnimSteps.length) bkShowFinal();
}

function bkReset() {
  clearTimeout(bankerAnimTimer);
  bankerAnimIdx = 0;
  const el = $('bk-steps'); if (el) el.innerHTML = '';
  const res = $('bk-result'); if (res) res.innerHTML = '';
}

function bkShowFinal() {
  const r = window._bkResult;
  if (!r) return;
  const el = $('bk-result');
  if (!el) return;
  if (r.safe) {
    el.innerHTML = `<div class="result-bar"><span class="badge ok">✓ SAFE STATE</span>
      Safe sequence: <strong>${r.seq.map(i => 'T'+(i+1)).join(' → ')}</strong></div>`;
  } else {
    el.innerHTML = `<div class="result-bar"><span class="badge no">✗ UNSAFE STATE</span>
      Only ${r.seq.length} of ${bankerAnimSteps.filter(s => s.ok).length + r.seq.length} can finish — deadlock possible.</div>`;
  }
}

/** Handle resource request */
function doResourceRequest() {
  let A, M, V;
  try {
    A = parseMatrix($('bAlloc').value);
    M = parseMatrix($('bMax').value);
    V = parseRow($('bAvail').value);
  } catch(e) {
    $('bRequestOut').innerHTML = `<p class="no-text">Parse error: ${e.message}</p>`;
    return;
  }
  const pIdx = (parseInt($('rProcIdx').value) || 1) - 1;
  let R;
  try { R = parseRow($('rRequest').value); } catch(e) {
    $('bRequestOut').innerHTML = `<p class="no-text">Invalid request vector.</p>`;
    return;
  }
  if (pIdx < 0 || pIdx >= A.length) {
    $('bRequestOut').innerHTML = `<p class="no-text">Process index out of range.</p>`;
    return;
  }

  const rBanker = runBanker(A, M, V);
  const need = rBanker.N[pIdx];
  let html = `<h3>Resource Request: T${pIdx+1} requests [${R}]</h3>`;

  if (R.some((x, j) => x > need[j])) {
    html += `<p class="no-text">✗ DENIED – Request [${R}] exceeds Need [${need}]. Process declared max exceeded.</p>`;
  } else if (R.some((x, j) => x > V[j])) {
    html += `<p class="warn-text">⏳ WAIT – Request [${R}] exceeds Available [${V}]. T${pIdx+1} must wait.</p>`;
  } else {
    // Pretend-allocate
    const A2 = A.map(r => [...r]);
    const V2 = V.map((v, j) => v - R[j]);
    A2[pIdx] = A2[pIdx].map((x, j) => x + R[j]);
    const r2 = runBanker(A2, M, V2);
    html += `<p class="muted">Pretend-allocate → Available = [${V2}], T${pIdx+1} Allocation = [${A2[pIdx]}]</p>`;
    if (r2.safe) {
      html += `<div class="result-bar"><span class="badge ok">✓ GRANTED</span>
        Resulting state is safe: <strong>${r2.seq.map(i => 'T'+(i+1)).join(' → ')}</strong></div>`;
    } else {
      html += `<div class="result-bar"><span class="badge no">✗ DENIED</span>
        Granting would lead to an unsafe state. Request rolled back.</div>`;
    }
  }
  $('bRequestOut').innerHTML = html;
}

function exportBanker() {
  const r = window._bkResult;
  if (!r) return;
  let txt = 'OS Algorithm Visualizer – Banker\'s Algorithm Results\n\n';
  txt += r.safe ? `SAFE STATE\nSafe Sequence: ${r.seq.map(i => 'T'+(i+1)).join(' -> ')}\n` : 'UNSAFE STATE\n';
  txt += '\nTrace:\n';
  r.steps.forEach((s, i) => {
    txt += `Step ${i+1}: T${s.proc+1} Need=[${s.need}] Work_before=[${s.work_before}] -> ${s.ok ? 'Finishes Work_after=['+s.work_after+']' : 'CANNOT PROCEED'}\n`;
  });
  exportResults('bankers_algorithm_results.txt', txt);
}

/* ============================================================
   MODULE 4: MEMORY MANAGEMENT
   ============================================================ */

/**
 * Run memory allocation.
 * algo: 'first' | 'best' | 'worst' | 'next' | 'dynamic'
 * Returns { assignments, partitions, fragmentation, utilization, unallocated }
 */
function allocateMemory(partitions0, requests, algo) {
  const parts = partitions0.map((size, i) => ({
    size,
    freeSize: size,
    occupant: -1,    // request index or -1
    id: i
  }));

  const assignments = Array(requests.length).fill(-1); // partition index for each request
  let lastFit = 0; // for Next Fit

  if (algo === 'dynamic') {
    // Variable-size partitioning: each process gets exactly what it needs
    // Memory is one contiguous block; we split on demand
    let freeStart = 0;
    const totalMem = partitions0.reduce((a, b) => a + b, 0);
    // Represent as list of segments
    const segs = [{ start: 0, size: totalMem, occupant: -1 }];
    const dynAssign = [];

    requests.forEach((req, ri) => {
      // Find first free segment large enough
      let found = false;
      for (let si = 0; si < segs.length; si++) {
        const seg = segs[si];
        if (seg.occupant < 0 && seg.size >= req) {
          dynAssign.push({ partIdx: si, partSize: req });
          assignments[ri] = si;
          if (seg.size > req) {
            // Split
            segs.splice(si, 1,
              { start: seg.start, size: req, occupant: ri },
              { start: seg.start + req, size: seg.size - req, occupant: -1 }
            );
          } else {
            seg.occupant = ri;
          }
          found = true;
          break;
        }
      }
      if (!found) dynAssign.push(null);
    });

    // Return special structure for dynamic
    const totalUsed = requests.filter((_, i) => assignments[i] >= 0).reduce((s, r) => s + r, 0);
    return {
      algo: 'dynamic',
      segs,
      assignments,
      totalMem,
      totalUsed,
      utilization: totalUsed / totalMem,
      unallocated: requests.map((_, i) => i).filter(i => assignments[i] < 0),
      internalFrag: 0,
      externalFrag: segs.filter(s => s.occupant < 0).reduce((a, s) => a + s.size, 0)
    };
  }

  // Fixed-partition algorithms
  requests.forEach((req, ri) => {
    let best = -1;
    let startIdx = (algo === 'next') ? lastFit : 0;

    for (let iter = 0; iter < parts.length; iter++) {
      const j = (startIdx + iter) % parts.length;
      const p = parts[j];
      if (p.occupant >= 0 || p.size < req) continue;
      if (algo === 'first' || algo === 'next') {
        best = j; lastFit = (j + 1) % parts.length; break;
      }
      if (algo === 'best') {
        if (best < 0 || p.size < parts[best].size) best = j;
      } else { // worst
        if (best < 0 || p.size > parts[best].size) best = j;
      }
    }
    if (best >= 0) {
      assignments[ri] = best;
      parts[best].occupant = ri;
    }
  });

  const totalMem   = parts.reduce((s, p) => s + p.size, 0);
  const totalUsed  = requests.filter((_, i) => assignments[i] >= 0).reduce((s, r) => s + r, 0);
  const internalFrag = assignments.reduce((s, pi, ri) =>
    pi >= 0 ? s + parts[pi].size - requests[ri] : s, 0);
  const unallocated = requests.map((_, i) => i).filter(i => assignments[i] < 0);

  // External fragmentation check
  const freeParts = parts.filter(p => p.occupant < 0);
  const freeTotal = freeParts.reduce((s, p) => s + p.size, 0);
  const externalFrag = unallocated.some(i => requests[i] <= freeTotal) ? freeTotal : 0;

  return {
    algo,
    parts,
    assignments,
    totalMem,
    totalUsed,
    utilization: totalMem > 0 ? totalUsed / totalMem : 0,
    internalFrag,
    externalFrag,
    unallocated
  };
}

/** Render the memory map (proportional bar) */
function renderMemoryMap(result, partSizes, requests) {
  if (result.algo === 'dynamic') {
    const { segs, totalMem } = result;
    const blocks = segs.map((seg, i) => {
      const w = (seg.size / totalMem * 100).toFixed(2);
      const ri = seg.occupant;
      const bg = ri >= 0 ? txColor(ri) : '';
      const isExtFrag = ri < 0 && seg.size > 0;
      return `<div class="mem-partition" style="flex:0 0 ${w}%">
        ${ri >= 0
          ? `<div class="mem-used" style="height:100%;background:${bg}">T${ri+1}<br>${seg.size}KB</div>`
          : `<div class="mem-free ${isExtFrag ? 'mem-external' : ''}" style="height:100%">
              free<br>${seg.size}KB
             </div>`}
        <div class="mem-label">@${seg.start}</div>
      </div>`;
    }).join('');
    return `<div class="memory-map" role="img" aria-label="Dynamic memory map">${blocks}</div>`;
  }

  const { parts, totalMem } = result;
  const blocks = parts.map((p) => {
    const w = (p.size / totalMem * 100).toFixed(2);
    const ri = p.occupant;
    const bg = ri >= 0 ? txColor(ri) : '';
    const reqSize = ri >= 0 ? requests[ri] : 0;
    const usedPct = ri >= 0 ? (reqSize / p.size * 100).toFixed(1) : 0;
    const fragKB = ri >= 0 ? (p.size - reqSize) : 0;
    return `<div class="mem-partition" style="flex:0 0 ${w}%">
      ${ri >= 0
        ? `<div class="mem-used" style="height:${usedPct}%;background:${bg}">T${ri+1}</div>
           <div class="mem-free">${fragKB > 0 ? fragKB+'KB frag' : ''}</div>`
        : `<div class="mem-free" style="height:100%">free<br>${p.size}KB</div>`}
      <div class="mem-label">${p.size}KB</div>
    </div>`;
  }).join('');
  return `<div class="memory-map" role="img" aria-label="Memory map">${blocks}</div>`;
}

/** Render full memory management output */
function renderMemOutput(result, partSizes, requests, algo) {
  const map = renderMemoryMap(result, partSizes, requests);

  if (result.algo === 'dynamic') {
    const segRows = result.segs.map((seg, i) => [
      `@${seg.start}`,
      `${seg.size} KB`,
      seg.occupant >= 0 ? `T${seg.occupant+1}` : '–',
      seg.occupant >= 0 ? `${requests[seg.occupant]} KB` : '–',
      seg.occupant < 0 ? `<span class="no-text">free</span>` : '0 KB (exact)'
    ]);
    return map +
      buildTable(['Start Addr','Size','Occupant','Request','Internal Frag'], segRows) +
      `<div class="result-bar">
        <span>Used: <strong>${result.totalUsed}/${result.totalMem} KB</strong></span>
        <span>Utilization: <strong>${(result.utilization*100).toFixed(1)}%</strong></span>
        <span>External Fragmentation: <strong>${result.externalFrag} KB</strong></span>
        ${result.unallocated.length ? `<span class="no-text">Unallocated: ${result.unallocated.map(i=>'T'+(i+1)).join(', ')}</span>` : ''}
        <button class="btn small secondary" onclick="compactDynamic()">⟲ Compact</button>
        <button class="btn small secondary" onclick="exportMem()">⬇ Export</button>
      </div>`;
  }

  const tableRows = requests.map((req, i) => {
    const pi = result.assignments[i];
    const alloc = pi >= 0 ? result.parts[pi] : null;
    return [
      `<b>T${i+1}</b>`,
      `${TX_NAMES[i] || ''}`,
      `${req} KB`,
      alloc ? `P${pi+1} (${alloc.size} KB)` : `<span class="no-text">Not allocated</span>`,
      alloc ? `${alloc.size - req} KB` : '–'
    ];
  });

  return map +
    buildTable(['Tx','Type','Request','Partition','Internal Frag'], tableRows) +
    `<div class="result-bar">
      <span>Utilization: <strong>${(result.utilization*100).toFixed(1)}%</strong></span>
      <span>Used: <strong>${result.totalUsed}/${result.totalMem} KB</strong></span>
      <span>Internal Frag: <strong>${result.internalFrag} KB</strong></span>
      ${result.externalFrag > 0 ? `<span class="warn-text">External Frag: ${result.externalFrag} KB (free but fragmented)</span>` : ''}
      ${result.unallocated.length ? `<span class="no-text">Unallocated: ${result.unallocated.map(i=>'T'+(i+1)).join(', ')}</span>` : ''}
      <button class="btn small secondary" onclick="exportMem()">⬇ Export</button>
    </div>`;
}

function runMemory() {
  const partSizes = $('mPartitions').value.split(',').map(Number).filter(x => x > 0);
  const requests  = $('mRequests').value.split(',').map(Number).filter(x => x > 0);
  const algo = $('mAlgo').value;
  if (!partSizes.length || !requests.length) {
    $('mOut').innerHTML = `<p class="no-text">Please enter valid partition sizes and requests.</p>`;
    return;
  }
  const result = allocateMemory(partSizes, requests, algo);
  window._lastMemResult = { result, partSizes, requests, algo };
  $('mOut').innerHTML = renderMemOutput(result, partSizes, requests, algo);
}

function compareMemory() {
  const partSizes = $('mPartitions').value.split(',').map(Number).filter(x => x > 0);
  const requests  = $('mRequests').value.split(',').map(Number).filter(x => x > 0);
  const algos = [
    ['first', 'First Fit'],
    ['best',  'Best Fit'],
    ['worst', 'Worst Fit'],
    ['next',  'Next Fit']
  ];
  const rows = algos.map(([a, label]) => {
    const r = allocateMemory(partSizes, requests, a);
    const alloc = requests.length - r.unallocated.length;
    return [
      label,
      `${alloc}/${requests.length}`,
      `${(r.utilization*100).toFixed(1)}%`,
      `${r.internalFrag} KB`,
      r.unallocated.length ? r.unallocated.map(i => 'T'+(i+1)).join(', ') : 'none'
    ];
  });
  $('mOut').innerHTML = `<h3>Algorithm Comparison (Fixed Partitions)</h3>` +
    buildTable(['Algorithm','Allocated','Utilization','Internal Frag','Not Allocated'], rows) +
    `<div class="result-bar"><button class="btn small secondary" onclick="exportMemCompare()">⬇ Export</button></div>`;
}

/** Free a specific process from memory */
function freeProcess() {
  const procNum = parseInt($('mFreeProc').value) || 1;
  const lmr = window._lastMemResult;
  if (!lmr) { alert('Run allocation first.'); return; }
  const { result, partSizes, requests, algo } = lmr;
  const ri = procNum - 1;
  if (ri < 0 || ri >= requests.length) { alert('Invalid process number.'); return; }
  if (result.assignments[ri] < 0) { alert(`T${procNum} was not allocated.`); return; }
  const pi = result.assignments[ri];
  result.parts[pi].occupant = -1;
  result.assignments[ri] = -1;
  result.totalUsed -= requests[ri];
  result.utilization = result.totalUsed / result.totalMem;
  result.internalFrag -= (result.parts[pi].size - requests[ri]);
  result.unallocated.push(ri);
  window._lastMemResult = { result, partSizes, requests, algo };
  $('mOut').innerHTML = renderMemOutput(result, partSizes, requests, algo);
}

/** Compact dynamic memory */
function compactDynamic() {
  const lmr = window._lastMemResult;
  if (!lmr || lmr.result.algo !== 'dynamic') return;
  const { result, partSizes, requests } = lmr;
  // Re-run from scratch with compacted layout
  const remaining = result.segs.filter(s => s.occupant >= 0).map(s => ({ ...s }));
  let addr = 0;
  const newSegs = remaining.map(s => {
    const ns = { ...s, start: addr };
    addr += s.size;
    return ns;
  });
  const totalMem = result.totalMem;
  if (addr < totalMem) newSegs.push({ start: addr, size: totalMem - addr, occupant: -1 });
  result.segs = newSegs;
  result.externalFrag = totalMem - addr >= 0 ? totalMem - addr : 0;
  $('mOut').innerHTML = renderMemOutput(result, partSizes, requests, 'dynamic');
}

function exportMem() {
  const lmr = window._lastMemResult;
  if (!lmr) return;
  const { result, partSizes, requests, algo } = lmr;
  let txt = `OS Algorithm Visualizer – Memory Management Results\nAlgorithm: ${algo}\n\n`;
  txt += `Total Memory: ${result.totalMem} KB\n`;
  txt += `Used: ${result.totalUsed} KB (${(result.utilization*100).toFixed(1)}%)\n`;
  txt += `Internal Fragmentation: ${result.internalFrag} KB\n`;
  if (result.unallocated.length) txt += `Unallocated: ${result.unallocated.map(i=>'T'+(i+1)).join(', ')}\n`;
  exportResults('memory_results.txt', txt);
}

function exportMemCompare() {
  const partSizes = $('mPartitions').value.split(',').map(Number).filter(x => x > 0);
  const requests  = $('mRequests').value.split(',').map(Number).filter(x => x > 0);
  let txt = 'OS Algorithm Visualizer – Memory Comparison\n\nAlgorithm\tAllocated\tUtilization\tInternal Frag\tUnallocated\n';
  [['first','First Fit'],['best','Best Fit'],['worst','Worst Fit'],['next','Next Fit']].forEach(([a, lbl]) => {
    const r = allocateMemory(partSizes, requests, a);
    txt += `${lbl}\t${requests.length - r.unallocated.length}/${requests.length}\t${(r.utilization*100).toFixed(1)}%\t${r.internalFrag} KB\t${r.unallocated.map(i=>'T'+(i+1)).join(', ')||'none'}\n`;
  });
  exportResults('memory_comparison.txt', txt);
}

/* ============================================================
   MODULE 5: INTEGRATED PIPELINE
   ============================================================ */

let pipelineTimer = null;

const PIPELINE_STEPS = [
  {
    id: 'p1',
    title: '① Producer–Consumer: Transaction Admission',
    icon: '📥'
  },
  {
    id: 'p2',
    title: '② CPU Scheduling: Dispatch Order',
    icon: '⚙️'
  },
  {
    id: 'p3',
    title: '③ Banker\'s Algorithm: Resource Safety Check',
    icon: '🔐'
  },
  {
    id: 'p4',
    title: '④ Memory Management: Partition Allocation',
    icon: '🗂️'
  }
];

function runIntegrated() {
  clearTimeout(pipelineTimer);

  // Parse default data
  const procs = parseCPUInput();
  const algo  = 'PRIORITY';
  const cpuResult = schedule(procs, algo, 2);

  let A, M, V;
  try {
    A = parseMatrix($('bAlloc').value);
    M = parseMatrix($('bMax').value);
    V = parseRow($('bAvail').value);
  } catch(e) { A = null; }
  const bankResult = A ? runBanker(A, M, V) : null;

  const partSizes = $('mPartitions').value.split(',').map(Number).filter(x => x > 0);
  const requests  = $('mRequests').value.split(',').map(Number).filter(x => x > 0);
  const memResult = allocateMemory(partSizes, requests, 'best');

  const eventLog = [];
  const logEvent = (phase, msg) => {
    const ts = `t=${eventLog.length * 2}s`;
    eventLog.push({ ts, phase, msg });
    renderEventLog(eventLog);
  };

  // Build step containers
  $('intOut').innerHTML = `
    <div id="pipeline-steps">
      ${PIPELINE_STEPS.map(s => `
        <div class="pipeline-step" id="${s.id}" role="region" aria-label="${s.title}">
          <div class="pipeline-num">${s.id.replace('p','')}</div>
          <div class="pipeline-content">
            <h3>${s.title}</h3>
            <div id="${s.id}-body" class="muted">Waiting…</div>
          </div>
        </div>`).join('')}
    </div>
    <div class="event-log-wrap">
      <h3>🔴 Live Event Log</h3>
      <div class="event-log" id="intEventLog"></div>
    </div>
    <div class="result-bar mt8">
      <button class="btn small secondary" onclick="exportIntegrated()">⬇ Export Pipeline Log</button>
    </div>`;

  // Animate steps
  const stepDelay = 1200;
  let delay = 200;

  const animateStep = (stepId, html, logMsg, phase) => {
    pipelineTimer = setTimeout(() => {
      const el = $(stepId);
      if (el) {
        el.classList.add('visible', 'active');
        const prev = el.previousElementSibling;
        if (prev && prev.classList.contains('pipeline-step')) {
          prev.classList.remove('active');
          prev.classList.add('done');
        }
      }
      const body = $(`${stepId}-body`);
      if (body) body.innerHTML = html;
      logEvent(phase, logMsg);
    }, delay);
    delay += stepDelay;
  };

  // Step 1: Producer-Consumer
  const txList = procs.map(p => p.id).join(' → ');
  animateStep('p1',
    `<p>ATM/Branch producers enqueue T1–T5 into the bounded buffer (N=${$('pcBufSize').value}) in arrival order.</p>
     <p>Buffer semaphores guard access: <code>empty=${$('pcBufSize').value}</code>, <code>full=0</code>, <code>mutex=1</code>.</p>
     <p>Admission order: <strong>${txList}</strong></p>
     <p class="muted">Each transaction is produced (inserted) and then dequeued by a consumer thread for scheduling.</p>`,
    `Transactions admitted to buffer: ${txList}`,
    '①'
  );

  // Step 2: CPU Scheduling
  animateStep('p2',
    `<p>Scheduler picks transactions using <strong>Priority scheduling</strong> (lower number = higher priority).</p>
     ${renderCPUOutput(cpuResult, algo, 2)}`,
    `CPU: Priority scheduling. Avg Wait=${cpuResult.avgWait.toFixed(2)}, Dispatch order: ${cpuResult.gantt.filter(b => b.idx >= 0).map(b => b.id).join('→')}`,
    '②'
  );

  // Step 3: Banker's
  if (bankResult) {
    const seqStr = bankResult.safe
      ? bankResult.seq.map(i => 'T'+(i+1)).join(' → ')
      : 'UNSAFE';
    animateStep('p3',
      `<p>Banker's Algorithm checks that granting resources keeps the system in a <strong>safe state</strong>.</p>
       ${renderBankerTables(A, M, V)}
       ${bankResult.safe
         ? `<div class="result-bar"><span class="badge ok">✓ SAFE</span> Safe sequence: <strong>${seqStr}</strong></div>`
         : `<div class="result-bar"><span class="badge no">✗ UNSAFE</span> Deadlock possible. Requests held.</div>`}`,
      `Banker's: ${bankResult.safe ? 'SAFE – ' + seqStr : 'UNSAFE'}`,
      '③'
    );
  }

  // Step 4: Memory
  animateStep('p4',
    `<p>Memory partitions assigned using <strong>Best Fit</strong> to minimize fragmentation.</p>
     ${renderMemOutput(memResult, partSizes, requests, 'best')}`,
    `Memory: Best Fit. Utilization=${(memResult.utilization*100).toFixed(1)}%, Internal Frag=${memResult.internalFrag} KB`,
    '④'
  );

  // Final: mark last step done
  setTimeout(() => {
    document.querySelectorAll('.pipeline-step').forEach(el => {
      el.classList.remove('active');
      el.classList.add('done', 'visible');
    });
    logEvent('✓', 'Pipeline complete. All transactions processed, resources released.');
  }, delay);

  window._intEventLog = eventLog;
  window._intCPU = cpuResult;
  window._intBank = bankResult;
  window._intMem = memResult;
}

function renderEventLog(log) {
  const el = $('intEventLog');
  if (!el) return;
  el.innerHTML = log.map(e =>
    `<div class="event-log-entry">
      <span class="muted">[${e.ts}]</span>
      <span class="info">[${e.phase}]</span>
      ${e.msg}
    </div>`
  ).join('');
  el.scrollTop = 1e9;
}

function exportIntegrated() {
  const log = window._intEventLog || [];
  let txt = 'OS Algorithm Visualizer – Integrated Pipeline Results\n\n';
  log.forEach(e => { txt += `[${e.ts}] [${e.phase}] ${e.msg}\n`; });
  exportResults('integrated_pipeline_results.txt', txt);
}

/* ============================================================
   INITIALIZATION
   ============================================================ */

function init() {
  initTheme();

  // Build nav tabs
  const tabs = [
    { id: 'home', label: '🏠 Home' },
    { id: 'cpu',  label: '⚙️ CPU Scheduling' },
    { id: 'pc',   label: '📦 Producer–Consumer' },
    { id: 'bank', label: '🔐 Banker\'s Algorithm' },
    { id: 'mem',  label: '🗂️ Memory Management' },
    { id: 'all',  label: '🔗 Integrated Run' }
  ];
  const nav = $('main-nav');
  nav.innerHTML = tabs.map(t =>
    `<button data-tab="${t.id}" onclick="switchTab('${t.id}')" aria-selected="false">${t.label}</button>`
  ).join('');

  // Module card click handlers on home
  document.querySelectorAll('.module-card').forEach(card => {
    card.addEventListener('click', () => switchTab(card.dataset.goto));
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') switchTab(card.dataset.goto);
    });
  });

  // Keyboard navigation for nav
  nav.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const btns = [...nav.querySelectorAll('button')];
      const cur = btns.findIndex(b => b === document.activeElement);
      if (cur >= 0) {
        const next = (cur + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length;
        btns[next].focus();
      }
    }
  });

  // Initialize Producer-Consumer
  pcReset();

  // Switch to home
  switchTab('home');
}

// Boot
document.addEventListener('DOMContentLoaded', init);
