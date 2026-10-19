import { zip } from "fflate";

type InFile = { type: "file"; path: string; file?: File; data?: ArrayBuffer };
type InFinish = { type: "finish" };
type InMsg = InFile | InFinish;

const store: Record<string, Uint8Array> = {};
let filesDone = 0;
let bytesDone = 0;
const queue: InFile[] = [];
let finishRequested = false;
let packed = false;
let running = false;

function progress(phase: "reading" | "packing") {
  self.postMessage({
    type: "progress",
    phase,
    filesDone,
    bytesDone,
  });
}

async function processQueue() {
  while (queue.length) {
    const job = queue.shift()!;
    const buf = job.data
      ? new Uint8Array(job.data)
      : new Uint8Array(await job.file!.arrayBuffer());
    store[job.path] = buf;
    filesDone += 1;
    bytesDone += buf.byteLength;
    if (filesDone % 10 === 0) progress("reading");
  }
}

function pack() {
  if (packed) return;
  packed = true;
  progress("packing");
  zip(store, { level: 0 }, (err, data) => {
    if (err) {
      self.postMessage({ type: "error", message: err.message });
      return;
    }
    self.postMessage({ type: "done", data }, { transfer: [data.buffer] });
  });
}

async function run() {
  if (running) return;
  running = true;
  try {
    await processQueue();
    if (finishRequested) pack();
  } finally {
    running = false;
    if (queue.length || (finishRequested && !packed)) void run();
  }
}

self.onmessage = (ev: MessageEvent<InMsg>) => {
  const msg = ev.data;
  if (msg.type === "file") {
    queue.push(msg);
    void run();
    return;
  }
  if (msg.type === "finish") {
    finishRequested = true;
    void run();
  }
};
