/**
 * Writing CSV that Excel opens correctly and safely.
 *
 * CSV rather than .xlsx deliberately. The only `xlsx` package on npm is 0.18.5
 * from 2022, which carries known prototype-pollution and ReDoS advisories —
 * SheetJS moved newer releases off the registry — and a spreadsheet of
 * customers' names and phone numbers is not the place to accept that. Excel and
 * Google Sheets both open CSV natively, so the file still lands where it needs
 * to; the export screen says CSV rather than implying a format it does not
 * produce.
 *
 * Two details matter more than the comma-joining:
 *
 *   1. A UTF-8 BOM. Without it Excel on Windows reads the file as the system
 *      codepage, and a Devanagari name or a ₹ sign becomes mojibake — which for
 *      an India-first product is most of the point of exporting at all.
 *   2. Formula injection. A cell beginning `=`, `+`, `-` or `@` is executed by
 *      Excel when the sheet opens. Lead names come from photographs of business
 *      cards and from typing at a stall, so they are untrusted input, and a
 *      contact called `=HYPERLINK("http://…","Click")` is a real attack. Those
 *      cells are prefixed so they display as text.
 */

const BOM = '﻿';

/**
 * `=` and `@` begin a formula and nothing else, so they are always neutralised.
 *
 * `+` and `-` are deliberately not here. The single most common cell in this
 * export is a phone number beginning `+91`, and Excel's apostrophe marker —
 * invisible in Excel — shows as a literal `'` in Google Sheets and in Tally.
 * Blanket-prefixing would put `'+91 98204 41720` in front of every customer in
 * the file. Those two are handled by EXECUTABLE instead.
 */
const ALWAYS_RISKY = /^[=@\t\r]/;

/**
 * A `+` or `-` cell that could actually do something: a function call
 * (`+HYPERLINK(`), a DDE payload (`|`), or a sheet reference (`!`).
 *
 * `+91 98204 41720` contains none of those and stays readable everywhere.
 */
const EXECUTABLE = /^[+\-].*[|!]|^[+\-][^(]*\(/;

export function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';

  let text = String(value);

  // Neutralise a formula while keeping the text readable. A leading apostrophe
  // is Excel's own "treat this as text" marker and does not show in the cell.
  if (ALWAYS_RISKY.test(text) || EXECUTABLE.test(text)) text = `'${text}`;

  // Quote whenever the value could otherwise break the row apart. A quote
  // inside a quoted field is escaped by doubling it — that is the RFC 4180
  // rule, and the one every spreadsheet actually implements.
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];
  // CRLF, because that is what Excel expects and what every other reader
  // tolerates.
  return BOM + lines.join('\r\n') + '\r\n';
}

/** `IMTEX 2026 leads 2026-08-29.csv` — safe on every filesystem. */
export function csvFilename(base: string, date = new Date()): string {
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
  const safe = base
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 60);
  return `${safe || 'Leads'} ${day}.csv`;
}
