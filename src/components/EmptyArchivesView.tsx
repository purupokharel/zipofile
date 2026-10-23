import { useState } from "react";
import { IconDoc, IconPlus, IconZip } from "./icons";
import { CaseStudySheet } from "./CaseStudySheet";

type Props = {
  zipping: boolean;
  onNewArchive: () => void;
};

export function EmptyArchivesView({ zipping, onNewArchive }: Props) {
  const [caseStudyOpen, setCaseStudyOpen] = useState(false);

  return (
    <div className="empty-archives-wrap">
      <div className="empty">
        <span className="empty-icon"><IconZip /></span>
        <h2>No Archives</h2>
        <p className="empty-lead">
          Zip a project folder faster without node_modules, .git,
          <br />
          build output, or caches. Keep the app yours forever.
        </p>
        <button type="button" className="btn primary" disabled={zipping} onClick={onNewArchive}>
          <IconPlus /> New Archive
        </button>
      </div>
      <section className="case-study-promo card" aria-labelledby="case-study-promo-title">
        <div className="case-study-promo-head">
          <h3 id="case-study-promo-title" className="case-study-promo-title">Technical Case Study</h3>
          <button type="button" className="btn case-study-promo-btn" onClick={() => setCaseStudyOpen(true)}>
            <IconDoc /> Read Case Study
          </button>
        </div>
        <p className="case-study-promo-lead">
          How ZipoFile uses store-mode ZIP, parallel I/O, and stack-aware excludes — with measured benchmarks,
          limits, and honest scope (public release 2.1).
        </p>
      </section>
      <CaseStudySheet open={caseStudyOpen} onClose={() => setCaseStudyOpen(false)} />
    </div>
  );
}
