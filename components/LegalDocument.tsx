// components/LegalDocument.tsx
//
// Renders one of the solicitor's documents (lib/legal/*.json) as a page.
//
// The JSON is converted mechanically from the .docx he sent, with Word's
// automatic numbering reproduced, because the documents cross-reference their
// own sections ("Section 10", "SECTIONS 19 TO 24"). Nothing is rewritten:
// these words are the contract. To change a document, regenerate the JSON from
// a new .docx rather than editing text here or in the JSON.
//
// Server component — the text never ships as client JavaScript.

import { Fragment, type ReactNode } from 'react';
import { LegalPageHeader } from '@/components/LegalPageHeader';

export type LegalRun = { t: string; b?: 1; i?: 1; u?: 1 };
export type LegalBlock = {
  /** 0 = document title, 1 = numbered section heading, 2 = sub-heading. */
  h?: 0 | 1 | 2;
  /** Word's computed number for this paragraph: "4.", "xiii.", "•". */
  n?: string;
  /** List nesting level. */
  l?: number;
  r: LegalRun[];
};

// Emails and the site address become links; everything else stays text.
const LINKABLE = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|https?:\/\/[^\s,;)]+[^\s,;).]|\bjibly\.io\b)/g;

function linkify(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINKABLE)) {
    const s = m[0];
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const href = s.includes('@') ? `mailto:${s}` : s.startsWith('http') ? s : `https://${s}`;
    out.push(
      <a key={`${key}-${at}`} href={href} className="underline underline-offset-2 hover:text-ink-600">
        {s}
      </a>
    );
    last = at + s.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Runs({ runs, id }: { runs: LegalRun[]; id: string }) {
  return (
    <>
      {runs.map((r, i) => {
        let node: ReactNode = linkify(r.t, `${id}-${i}`);
        if (r.u) node = <span className="underline">{node}</span>;
        if (r.i) node = <em>{node}</em>;
        if (r.b) node = <strong className="font-semibold text-ink-600">{node}</strong>;
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}

export function LegalDocument({ blocks }: { blocks: LegalBlock[] }) {
  const [title, ...body] = blocks;
  return (
    <main className="min-h-screen bg-cream-50">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
        <LegalPageHeader title={title.r.map((r) => r.t).join('')} />

        <article lang="en" className="text-[15px] leading-relaxed text-ink-500">
          {body.map((b, i) => {
            const id = `b${i}`;
            if (b.h === 1) {
              const num = b.n?.replace(/\.$/, '');
              return (
                <h2
                  key={id}
                  id={num ? `section-${num}` : undefined}
                  className="mt-10 mb-4 text-[17px] font-extrabold text-ink-600 tracking-[-0.01em] scroll-mt-24"
                >
                  {b.n && <span className="mr-2">{b.n}</span>}
                  <Runs runs={b.r} id={id} />
                </h2>
              );
            }
            if (b.h === 2) {
              return (
                <h3 key={id} className="mt-6 mb-2 text-[15px] font-bold text-ink-600">
                  <Runs runs={b.r} id={id} />
                </h3>
              );
            }
            if (b.n) {
              return (
                <div key={id} className="flex gap-3 mb-3" style={{ paddingLeft: `${(b.l ?? 0) * 1.25}rem` }}>
                  <span className="flex-shrink-0 min-w-[2.25rem] text-ink-400 tabular-nums">{b.n}</span>
                  <p className="flex-1 min-w-0">
                    <Runs runs={b.r} id={id} />
                  </p>
                </div>
              );
            }
            return (
              <p key={id} className="mb-4 whitespace-pre-line">
                <Runs runs={b.r} id={id} />
              </p>
            );
          })}
        </article>
      </div>
    </main>
  );
}
