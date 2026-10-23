import { useEffect, useState } from "react";
import { fetchPublishedDmgSha256, shortDmgSha256 } from "../lib/macDownloadUrl";

export function DmgChecksum() {
  const [sha, setSha] = useState<string | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    void fetchPublishedDmgSha256(ac.signal).then((s) => {
      if (!ac.signal.aborted && s) setSha(s);
    });
    return () => ac.abort();
  }, []);
  if (!sha) return null;
  return (
    <p className="dmg-sha" title={sha}>
      SHA-256 {shortDmgSha256(sha)}
    </p>
  );
}
