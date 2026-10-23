import { externalLinkRel, safeExternalHref } from "../lib/safeUrl";

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    const k = m.index;
    if (token.startsWith("**")) nodes.push(<strong key={k}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) nodes.push(<code key={k}>{token.slice(1, -1)}</code>);
    else if (token.startsWith("*")) nodes.push(<em key={k}>{token.slice(1, -1)}</em>);
    else {
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(token)!;
      const href = safeExternalHref(link[2]);
      nodes.push(
        href ? (
          <a key={k} href={href} target="_blank" rel={externalLinkRel}>
            {link[1]}
          </a>
        ) : (
          <span key={k}>{link[1]}</span>
        ),
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function cells(row: string) {
  return row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

function formula(s: string) {
  let t = s.replace(/\\\[/g, "").replace(/\\\]/g, "");
  t = t.replace(/\\text\{([^}]+)\}/g, "$1").replace(/\\mathrm\{([^}]+)\}/g, "$1");
  t = t.replace(/\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, "($1) / ($2)");
  return t
    .replace(/\\approx/g, " ≈ ")
    .replace(/\\propto/g, " ∝ ")
    .replace(/\\ll/g, " ≪ ")
    .replace(/\\times/g, "×")
    .replace(/\\,/g, " ")
    .replace(/\\_/g, "_")
    .replace(/[{}$]/g, "")
    .replace(/\^/g, "")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function withMath(text: string) {
  return text.replace(/\\\((.+?)\\\)/g, (_, m) => formula(m)).replace(/\\\[(.+?)\\\]/g, (_, m) => formula(m));
}

export function CaseStudyMarkdown({ body }: { body: string }) {
  const parts = body.trim().split(/```/);
  const blocks: React.ReactNode[] = [];
  let n = 0;
  const push = (node: React.ReactNode) => {
    blocks.push(node);
    n++;
  };

  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      const nl = part.indexOf("\n");
      const lang = (nl >= 0 ? part.slice(0, nl) : part).trim();
      const code = (nl >= 0 ? part.slice(nl + 1) : "").trimEnd();
      const mermaid = lang === "mermaid";
      push(
        <pre key={n} className={`case-study-code${mermaid ? " case-study-diagram" : ""}`}>
          {mermaid ? <span className="case-study-diagram-label">Diagram</span> : null}
          <code>{code}</code>
        </pre>,
      );
      return;
    }

    const lines = part.replace(/\r/g, "").split("\n");
    let list: { ol: boolean; items: string[] } | null = null;
    let table: string[] | null = null;
    let math: string[] | null = null;

    const flushList = () => {
      if (!list) return;
      const Tag = list.ol ? "ol" : "ul";
      push(
        <Tag key={n} className="sheet-md-ul">
          {list.items.map((item, k) => (
            <li key={k}>{renderInline(withMath(item))}</li>
          ))}
        </Tag>,
      );
      list = null;
    };
    const flushTable = () => {
      if (!table) return;
      const rows = table.filter((r) => !/^\|?\s*:?-+:?(\s*\|?\s*:?-+:?)*\s*\|?$/.test(r));
      const head = rows[0] ? cells(rows[0]) : [];
      const bodyRows = rows.slice(1);
      push(
        <div key={n} className="case-study-table-wrap">
          <table className="case-study-table">
            {head.length ? (
              <thead>
                <tr>
                  {head.map((c, k) => (
                    <th key={k}>{renderInline(withMath(c))}</th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {bodyRows.map((r, ri) => (
                <tr key={ri}>
                  {cells(r).map((c, k) => (
                    <td key={k}>{renderInline(withMath(c))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      table = null;
    };
    const flushMath = () => {
      if (!math) return;
      push(
        <p key={n} className="case-study-math">
          {formula(math.join(" "))}
        </p>,
      );
      math = null;
    };
    const flush = () => {
      flushList();
      flushTable();
      flushMath();
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        flush();
        continue;
      }
      if (line.startsWith("# ") && !line.startsWith("## ")) continue;
      if (math) {
        math.push(line);
        if (line.includes("\\]")) flushMath();
        continue;
      }
      if (line.startsWith("\\[") || line === "\\[") {
        flushList();
        flushTable();
        math = [line];
        if (line.includes("\\]")) flushMath();
        continue;
      }
      if (line.startsWith("|")) {
        flushList();
        flushMath();
        (table ??= []).push(line);
        continue;
      }
      if (/^---+$/.test(line)) {
        flush();
        push(<hr key={n} className="case-study-hr" />);
        continue;
      }
      const ol = line.match(/^\d+\.\s+(.*)$/);
      const ul = line.match(/^-\s+(.*)$/);
      if (ol || ul) {
        flushTable();
        flushMath();
        const item = (ol ?? ul)![1]!;
        const isOl = !!ol;
        if (!list || list.ol !== isOl) {
          flushList();
          list = { ol: isOl, items: [item] };
        } else list.items.push(item);
        continue;
      }
      flush();
      if (line.startsWith("## ")) push(<h3 key={n} className="sheet-md-h">{line.replace(/^#+\s+/, "")}</h3>);
      else if (line.startsWith("### ") || line.startsWith("#### "))
        push(
          <h4 key={n} className="case-study-h4">
            {line.replace(/^#+\s+/, "")}
          </h4>,
        );
      else
        push(
          <p key={n} className="sheet-md-p">
            {renderInline(withMath(line))}
          </p>,
        );
    }
    flush();
  });

  return <article className="case-study-md">{blocks}</article>;
}
