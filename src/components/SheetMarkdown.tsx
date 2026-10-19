import { externalLinkRel, safeExternalHref } from "../lib/safeUrl";

type Props = { body: string };

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={m.index}>{token.slice(2, -2)}</strong>);
    } else {
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(token)!;
      const href = safeExternalHref(link[2]);
      nodes.push(
        href ? (
          <a key={m.index} href={href} target="_blank" rel={externalLinkRel}>
            {link[1]}
          </a>
        ) : (
          <span key={m.index}>{link[1]}</span>
        ),
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function SheetMarkdown({ body }: Props) {
  const blocks = body.trim().split(/\n\n+/);
  return (
    <div className="sheet-md">
      {blocks.map((block, i) => {
        const line = block.trim();
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="sheet-md-h">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith("- ")) {
          const items = line.split("\n").map((l) => l.replace(/^- /, ""));
          return (
            <ul key={i} className="sheet-md-ul">
              {items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (line.startsWith("`") && line.endsWith("`")) {
          return (
            <pre key={i} className="sheet-md-code">
              <code>{line.slice(1, -1)}</code>
            </pre>
          );
        }
        return (
          <p key={i} className="sheet-md-p">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}
