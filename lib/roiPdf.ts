import { formatPaise } from './db';
import { formatPercent, type PipelineRow } from './roi';
import { eventDayPosition, formatDateRange } from './dates';
import type { Event } from '../types/event';
import type { EventStats } from './api/eventStats';

/**
 * The printable ROI sheet, as an HTML string.
 *
 * Lifted out of `app/(app)/events/[id]/roi.tsx` unchanged. It had to move: the
 * web dashboard wants the same sheet, but that screen imports
 * react-native-view-shot, expo-media-library, expo-print and expo-sharing at
 * the top level, and importing the function from there would drag all four
 * into the browser bundle. Nothing in this file touches React or React Native,
 * so both platforms can use it.
 *
 * The phone turns this into a PDF with expo-print; the browser writes it into
 * a hidden iframe and prints. The flexbox here is ignored by expo-print's
 * renderer and honoured by a browser, so the web output is the better of the
 * two.
 */

export const PIPELINE_STATUS_COLORS: Record<PipelineRow['status'], string> = {
  New: '#8A98B0',
  Contacted: '#1D3F8A',
  Qualified: '#F4B000',
  Won: '#4ED17F',
  Lost: '#C23B3B',
};

/** `Day 3 of 4 · Bengaluru`, or just the dates when the show is not running. */
export function eventSubtitle(event: Event | null | undefined): string {
  if (!event) return '';
  const position = eventDayPosition(event.startDate, event.endDate);
  const day = position?.isCurrent
    ? `Day ${position.dayNumber} of ${position.totalDays}`
    : formatDateRange(event.startDate, event.endDate);
  return [day, event.city].filter(Boolean).join(' · ');
}

/**
 * The sheet an exhibitor takes to their finance team.
 *
 * Built from exactly the same `stats` object the screen renders, so the two can
 * never disagree — an older version held its own copy of every figure as a
 * module constant.
 */
export function buildRoiPdfHtml(event: Event, stats: EventStats): string {
  const title = [event.name, event.stallNumber].filter(Boolean).join(' · ');
  const rows = stats.pipeline
    .map(
      (p) => `
      <tr>
        <td style="padding:8px 0;color:#0B132B;font-weight:600;">${p.status}</td>
        <td style="padding:8px 0;">
          <div style="background:#EEF1F7;border-radius:6px;height:8px;width:100%;overflow:hidden;">
            <div style="background:${PIPELINE_STATUS_COLORS[p.status]};height:8px;width:${p.barWidth}%;"></div>
          </div>
        </td>
        <td style="padding:8px 0 8px 14px;color:#0B132B;font-weight:700;text-align:right;">${p.count}</td>
      </tr>`
    )
    .join('');

  const roi = formatPercent(stats.roiPercent, 'Not enough data');
  const spend = formatPaise(stats.spendPaise, { fallback: 'Not recorded' });
  const wonValue = formatPaise(stats.wonValuePaise, { fallback: '—' });
  const costPerLead = formatPaise(stats.costPerLeadPaise, { fallback: '—' });

  return `
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: -apple-system, Helvetica, Arial, sans-serif; margin:0; padding:32px; color:#0B132B;">
        <div style="font-size:20px; font-weight:800;">${title}</div>
        <div style="font-size:13px; color:#5A6B87; margin-top:2px;">${eventSubtitle(event)}</div>

        <div style="background:#0B132B; border-radius:16px; padding:24px; margin-top:20px; color:#fff;">
          <div style="font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.6);">Return on investment</div>
          <div style="font-size:40px; font-weight:800; margin-top:6px;">${roi}</div>
          <div style="font-size:12px; color:rgba(255,255,255,0.55); margin-top:6px;">${wonValue} won against ${spend} spent</div>
          <div style="height:1px; background:rgba(255,255,255,0.12); margin:16px 0;"></div>
          <div style="display:flex; justify-content:space-between; font-size:13px;">
            <span style="color:rgba(255,255,255,0.55);">Cost per lead</span>
            <span style="font-weight:700;">${costPerLead}</span>
          </div>
        </div>

        <div style="display:flex; gap:12px; margin-top:16px;">
          <div style="flex:1; border:1px solid #E3E7EF; border-radius:16px; padding:14px;">
            <div style="font-size:22px; font-weight:800;">${stats.totalLeads}</div>
            <div style="font-size:12px; color:#5A6B87; margin-top:2px;">Total leads</div>
          </div>
          <div style="flex:1; border:1px solid #E3E7EF; border-radius:16px; padding:14px;">
            <div style="font-size:22px; font-weight:800;">${stats.dealsWon}</div>
            <div style="font-size:12px; color:#5A6B87; margin-top:2px;">Deals won</div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid #E3E7EF; border-radius:8px; padding:14px 16px; margin-top:12px;">
          <span style="font-size:13px; color:#5A6B87;">Event cost</span>
          <span style="font-size:15px; font-weight:700;">${spend}</span>
        </div>

        <div style="font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#5A6B87; margin-top:24px; margin-bottom:10px;">
          Pipeline by status
        </div>
        <table style="width:100%; border:1px solid #E3E7EF; border-radius:16px; padding:16px; border-collapse:collapse;">
          ${rows}
        </table>

        <div style="font-size:10px; color:#97A3B8; margin-top:24px;">
          ROI is (value won − event cost) ÷ event cost. Only deals marked Won count towards it.
        </div>
      </body>
    </html>`;
}
