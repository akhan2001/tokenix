"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { DATA } from "@/components/primitives";

/**
 * A real code block: highlighted, and copyable.
 *
 * The pages were rendering snippets as flat `--ink-dim` text inside a styled
 * <div>, which left the only way out of the box manual selection — a poor joke
 * on a page whose entire promise is "copy this and you are connected".
 *
 * Highlighting is hand-rolled for the same reason the charts are: it is one
 * regex and a colour map against three languages we control the source of,
 * where Shiki or Prism would be a build-time dependency and a theme to
 * maintain. If the snippets ever become user-supplied, that trade flips.
 *
 * `plain` deliberately sits at full `--ink`. Code was previously two tiers
 * down, which is most of why these panels read as murky.
 */

export type Lang = "python" | "typescript" | "bash";

export type Snippet = {
  id: string;
  label: string;
  lang: Lang;
  code: string;
};

type TokenKind = "comment" | "string" | "number" | "keyword" | "fn" | "plain";

const COLOR: Record<TokenKind, string> = {
  comment: "var(--ink-faint)",
  string: "var(--green)",
  number: "var(--series-2)",
  keyword: "var(--amber)",
  fn: "var(--amber-hot)",
  plain: "var(--ink)",
};

const KEYWORDS: Record<Lang, Set<string>> = {
  python: new Set([
    "from", "import", "class", "def", "return", "if", "elif", "else", "for", "while",
    "in", "with", "as", "not", "and", "or", "None", "True", "False", "async", "await",
    "try", "except", "raise", "lambda", "pass",
  ]),
  typescript: new Set([
    "import", "from", "export", "default", "const", "let", "var", "function", "return",
    "if", "else", "for", "while", "new", "async", "await", "class", "interface", "type",
    "extends", "implements", "try", "catch", "throw", "typeof", "as", "null", "undefined",
    "true", "false",
  ]),
  bash: new Set(["curl", "export", "cd", "echo", "then", "fi", "do", "done"]),
};

/**
 * `//` opens a comment in TypeScript only. Honouring it in bash would grey out
 * the rest of `curl https://host/openai/v1/...` from the first slash onward,
 * which is exactly the line people need to read.
 */
function commentPattern(lang: Lang): string {
  return lang === "typescript" ? "#[^\\n]*|//[^\\n]*" : "#[^\\n]*";
}

function tokenize(code: string, lang: Lang): { text: string; kind: TokenKind }[] {
  const pattern = new RegExp(
    `(${commentPattern(lang)})` +
      `|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')` +
      `|(\\b\\d[\\w.]*)` +
      `|([A-Za-z_$][\\w$]*)`,
    "g",
  );

  const out: { text: string; kind: TokenKind }[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(code)) !== null) {
    if (match.index > last) {
      out.push({ text: code.slice(last, match.index), kind: "plain" });
    }

    let kind: TokenKind = "plain";
    if (match[1]) kind = "comment";
    else if (match[2]) kind = "string";
    else if (match[3]) kind = "number";
    else if (match[4]) {
      if (KEYWORDS[lang].has(match[4])) kind = "keyword";
      // An identifier immediately followed by "(" is being called.
      else if (code[pattern.lastIndex] === "(") kind = "fn";
    }

    out.push({ text: match[0], kind });
    last = pattern.lastIndex;
  }

  if (last < code.length) out.push({ text: code.slice(last), kind: "plain" });
  return out;
}

function Highlighted({ code, lang }: { code: string; lang: Lang }) {
  const tokens = useMemo(() => tokenize(code, lang), [code, lang]);
  return (
    <>
      {tokens.map((token, i) => (
        <span key={i} style={{ color: COLOR[token.kind] }}>
          {token.text}
        </span>
      ))}
    </>
  );
}

export function CodeBlock({
  snippets,
  label,
}: {
  snippets: Snippet[];
  /** Accessible name for the language switcher, when there is more than one. */
  label?: string;
}) {
  const [activeId, setActiveId] = useState(snippets[0]?.id);
  const [copied, setCopied] = useState(false);

  const active = snippets.find((s) => s.id === activeId) ?? snippets[0];

  const copy = useCallback(async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }, [active]);

  if (!active) return null;

  return (
    <div>
      {snippets.length > 1 && (
        <div
          role="tablist"
          aria-label={label ?? "Language"}
          style={{ display: "flex", gap: 6, marginBottom: 12 }}
        >
          {snippets.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === active.id}
              onClick={() => setActiveId(s.id)}
              className={`range-tab${s.id === active.id ? " on" : ""}`}
              style={{ borderRadius: "var(--radius-control)" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          position: "relative",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius-panel)",
          background: "var(--bg)",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : `Copy ${active.label} snippet`}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: copied ? "var(--green)" : "var(--ink-dim)",
            background: "var(--panel)",
            border: `1px solid ${copied ? "var(--green)" : "var(--line-strong)"}`,
            borderRadius: "var(--radius-control)",
            padding: "6px 10px",
            cursor: "pointer",
            transition: "color 0.15s ease, border-color 0.15s ease",
          }}
        >
          {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>

        <pre
          style={{
            ...DATA,
            fontSize: 12.5,
            lineHeight: 1.85,
            // Right padding clears the copy button on the first line.
            padding: "18px 92px 18px 20px",
            margin: 0,
            overflowX: "auto",
          }}
        >
          <code style={{ fontFamily: "inherit" }}>
            <Highlighted code={active.code} lang={active.lang} />
          </code>
        </pre>
      </div>
    </div>
  );
}
