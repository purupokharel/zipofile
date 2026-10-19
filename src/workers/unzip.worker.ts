import { unzip } from "fflate";

self.onmessage = (ev: MessageEvent<{ type: "unzip"; data: Uint8Array }>) => {
  unzip(ev.data.data, (err, files) => {
    if (err) {
      self.postMessage({ type: "error", message: err.message });
      return;
    }
    self.postMessage({ type: "done", files });
  });
};
