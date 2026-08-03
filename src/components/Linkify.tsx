import { Fragment, type ReactNode } from 'react';
import { C } from '../tokens';

/**
 * Renders free text with any URLs in it turned into tappable links (v7 §1).
 *
 * No schema change and no new field: this is purely a rendering concern, so the
 * same note body that's stored as plain text picks up links everywhere it's
 * shown.
 *
 * Links are truncated on display only — the href is always the full URL — so a
 * pasted tracking-laden link can't blow out the layout of a card.
 */

/** Deliberately no library: one regex, no dependency, no bundle cost. */
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;

/** Trailing punctuation is nearly always sentence punctuation, not the URL. */
const TRAILING = /[.,;:!?\]}>'"…]/;

const MAX_LABEL = 34;

/**
 * Peel sentence punctuation off the end of a match, one character at a time.
 *
 * Closing brackets need care: a Wikipedia-style link genuinely contains one
 * (`.../Pangolin_(mammal)`), so a `)` is only sentence punctuation when the URL
 * has no unmatched `(` left to close. Stripping greedily would hand back a
 * broken href.
 */
function splitTrailingPunctuation(match: string): [string, string] {
  let url = match;
  let tail = '';
  for (;;) {
    const last = url.slice(-1);
    if (!last) break;
    if (last === ')') {
      const opens = (url.match(/\(/g) ?? []).length;
      const closes = (url.match(/\)/g) ?? []).length;
      if (closes <= opens) break; // this one belongs to the URL
    } else if (!TRAILING.test(last)) {
      break;
    }
    url = url.slice(0, -1);
    tail = last + tail;
  }
  return [url, tail];
}

function hrefFor(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function labelFor(url: string): string {
  if (url.length <= MAX_LABEL) return url;
  return `${url.slice(0, MAX_LABEL - 1)}…`;
}

export function Linkify({ text }: { text: string }): ReactNode {
  if (!text) return null;
  // Fast path: most text has no URL, so don't build an array for nothing.
  URL_RE.lastIndex = 0;
  if (!URL_RE.test(text)) return text;

  const out: ReactNode[] = [];
  let cursor = 0;
  let i = 0;
  URL_RE.lastIndex = 0;

  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    const [url, tail] = splitTrailingPunctuation(match[0]);
    if (start > cursor) out.push(text.slice(cursor, start));
    out.push(
      <a
        key={`l${i++}`}
        href={hrefFor(url)}
        target="_blank"
        rel="noopener noreferrer"
        title={url}
        // Cards are often tappable themselves (opening an edit sheet) — without
        // this, following a link would also open the sheet behind it.
        onClick={(e) => e.stopPropagation()}
        style={{
          color: C.clay,
          textDecoration: 'underline',
          textUnderlineOffset: 2,
          // Long unbroken URLs must never widen a card, even truncated.
          wordBreak: 'break-word',
        }}
      >
        {labelFor(url)}
      </a>,
    );
    if (tail) out.push(tail);
    cursor = start + match[0].length;
  }
  if (cursor < text.length) out.push(text.slice(cursor));

  return (
    <>
      {out.map((node, n) => (
        <Fragment key={n}>{node}</Fragment>
      ))}
    </>
  );
}
