import type { ReactNode } from "react";

const INLINE_PATTERN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function keyFrom(value: string, prefix: string) {
  let hash = 0;
  for (const char of value) hash = Math.trunc(Math.imul(31, hash) + (char.codePointAt(0) ?? 0));
  return `${prefix}-${hash.toString(36)}`;
}

function renderInline(value: string) {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of value.matchAll(INLINE_PATTERN)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > cursor) nodes.push(value.slice(cursor, index));

    if (token.startsWith("**")) {
      nodes.push(<strong key={keyFrom(`${index}:${token}`, "strong")}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={keyFrom(`${index}:${token}`, "code")} className="bg-white/10 px-1 py-0.5 text-[0.85em]">{token.slice(1, -1)}</code>);
    } else {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);
      if (link) {
        nodes.push(
          <a
            key={keyFrom(`${index}:${token}`, "link")}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-cyan-300 underline underline-offset-2"
          >
            {link[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }

    cursor = index + token.length;
  }

  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}

function isNumberedLine(value: string) {
  return /^\d+\.\s+/.test(value);
}

export function MessageContent({ content }: Readonly<{ content: string }>) {
  if (!content) return <span>...</span>;

  const blocks = content.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="space-y-3 text-sm leading-6">
      {blocks.map((block) => {
        const lines = block.split("\n").filter(Boolean);
        if (lines.length > 1 && lines.every(isNumberedLine)) {
          return (
            <ol key={keyFrom(block, "list")} className="list-decimal space-y-1 pl-5">
              {lines.map((line) => (
                <li key={keyFrom(line, "item")}>{renderInline(line.replace(/^\d+\.\s+/, ""))}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={keyFrom(block, "block")} className="whitespace-pre-wrap">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}
