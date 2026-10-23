import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AUTO_APP_VERSION } from "../content/downloads";
import { BottomSheet } from "./BottomSheet";
import { CaseStudyMarkdown } from "./CaseStudyMarkdown";

const TITLE = "Technical Case Study";

type Props = { open: boolean; onClose: () => void };

export function CaseStudySheet({ open, onClose }: Props) {
  const [body, setBody] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr(false);
    setBody(null);
    void fetch(`/casestudy.md?v=${encodeURIComponent(AUTO_APP_VERSION)}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then(setBody)
      .catch(() => setErr(true));
  }, [open]);

  return createPortal(
    <BottomSheet open={open} title={TITLE} wide onClose={onClose}>
      {err ? <p className="sheet-md-p">Could not load the case study. Try again later.</p> : null}
      {!err && body === null ? <p className="sheet-md-p">Loading…</p> : null}
      {body ? <CaseStudyMarkdown body={body} /> : null}
    </BottomSheet>,
    document.body,
  );
}
