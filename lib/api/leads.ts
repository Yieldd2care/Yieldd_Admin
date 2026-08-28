import type { PostgrestError } from '@supabase/supabase-js';
import { randomUUID } from 'expo-crypto';

import { supabase } from '../supabase';
import { rupeesToPaise, type Inserts, type Updates } from '../db';
import { statusToDb, toLead, type LeadRow } from '../mappers/lead';
import type { CustomFieldValue, Lead, LeadStatus } from '../../data/leads';

/**
 * `voice_notes(count)` rather than the rows: the list only needs to know
 * whether a lead has a voice note, and pulling transcripts down exhibition-hall
 * mobile data to render a 14px microphone icon would be absurd.
 */
const SELECT = '*, voice_notes(count)';

/**
 * Lead ids are generated on the device, not by the database.
 *
 * This is what makes an offline capture safe to replay. The queue can send the
 * same insert twice — a flaky connection, an app killed mid-request, a retry
 * after a timeout that actually succeeded — and the second one collides with
 * the primary key instead of creating a duplicate lead. A server-generated id
 * would produce two rows for one handshake, which is the one failure a rep
 * cannot be asked to clean up afterwards.
 */
export function newLeadId(): string {
  return randomUUID();
}

const DUPLICATE_KEY = '23505';
const RLS_VIOLATION = '42501';

export function describeLeadError(error: PostgrestError): string {
  if (error.code === RLS_VIOLATION) {
    return 'You are not on this event any more, so this lead could not be saved to it.';
  }
  if (error.code === '23503') return 'That event no longer exists.';
  if (__DEV__) console.warn('[leads]', error);
  return "That didn't save. It is kept on this device and will sync when you're back online.";
}

/** A refusal no amount of retrying will fix — the queue must stop, not spin. */
export function isPermanentFailure(error: PostgrestError): boolean {
  return error.code === RLS_VIOLATION || error.code === '23503' || error.code === '23514';
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function fetchLeads(opts: { eventId?: string } = {}): Promise<Lead[]> {
  let query = supabase.from('leads').select(SELECT).order('created_at', { ascending: false });
  if (opts.eventId) query = query.eq('event_id', opts.eventId);

  const { data, error } = await query;
  if (error) throw error;
  return (data as LeadRow[]).map(toLead);
}

export type DuplicateMatch = {
  leadId: string;
  capturedByName: string;
  capturedAt: string;
  note: string | null;
  voiceSummary: string | null;
};

/**
 * The one sanctioned way a rep sees something of another rep's lead.
 *
 * Deliberately narrow — it returns who captured the contact, when, and their
 * note, and nothing else about that person's other leads. Everything else
 * about cross-rep visibility stays closed.
 */
export async function findDuplicateLead(
  eventId: string,
  phone: string
): Promise<DuplicateMatch | null> {
  if (!phone.trim()) return null;

  const { data, error } = await supabase.rpc('find_duplicate_lead', {
    p_event_id: eventId,
    p_phone: phone,
  });

  if (error) {
    if (__DEV__) console.warn('[leads] duplicate check', error);
    return null; // Never block a capture on this.
  }

  const row = data?.[0];
  if (!row) return null;
  return {
    leadId: row.lead_id,
    capturedByName: row.captured_by_name,
    capturedAt: row.captured_at,
    note: row.note,
    voiceSummary: row.voice_summary,
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type LeadCaptureInput = {
  id: string;
  organizationId: string;
  eventId: string;
  capturedBy: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  designation?: string;
  note?: string;
  companyLandline?: string;
  companyWebsite?: string;
  companyAddress?: string;
  companySummary?: string;
  customFieldValues?: Record<string, CustomFieldValue>;
  /**
   * The object key the photo WILL live at, written with the row rather than
   * after the upload. The bucket policy joins back to this column, so the row
   * has to carry the key before storage will accept the file.
   */
  cardImagePath?: string;
  consentGiven?: boolean;
  source?: 'card_scan' | 'manual';
  capturedAt?: string;
};

function toInsert(input: LeadCaptureInput): Inserts<'leads'> {
  return {
    id: input.id,
    organization_id: input.organizationId,
    event_id: input.eventId,
    captured_by: input.capturedBy,
    full_name: input.name.trim(),
    company: input.company?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    designation: input.designation?.trim() || null,
    note: input.note?.trim() || null,
    company_landline: input.companyLandline?.trim() || null,
    company_website: input.companyWebsite?.trim() || null,
    company_address: input.companyAddress?.trim() || null,
    company_summary: input.companySummary?.trim() || null,
    custom_field_values: (input.customFieldValues ?? {}) as Inserts<'leads'>['custom_field_values'],
    card_image_path: input.cardImagePath ?? null,
    consent_given: input.consentGiven ?? false,
    consent_at: input.consentGiven ? (input.capturedAt ?? new Date().toISOString()) : null,
    source: input.source ?? 'manual',
    // The device's clock, not the server's: a lead captured offline at 3pm and
    // synced at 7pm belongs at 3pm in the day's timeline.
    created_at: input.capturedAt ?? new Date().toISOString(),
  };
}

export type InsertOutcome =
  | { ok: true; lead: Lead }
  | { ok: true; alreadyExists: true }
  | { ok: false; message: string; permanent: boolean };

export async function insertLead(input: LeadCaptureInput): Promise<InsertOutcome> {
  const { data, error } = await supabase.from('leads').insert(toInsert(input)).select(SELECT).single();

  if (error) {
    // The id is ours, so a primary-key collision means this exact lead is
    // already on the server — a replay, not a failure.
    if (error.code === DUPLICATE_KEY) return { ok: true, alreadyExists: true };
    return { ok: false, message: describeLeadError(error), permanent: isPermanentFailure(error) };
  }
  return { ok: true, lead: toLead(data as LeadRow) };
}

export type LeadPatch = {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  designation?: string;
  note?: string;
  companyLandline?: string;
  companyWebsite?: string;
  companyAddress?: string;
  companySummary?: string;
  customFieldValues?: Record<string, CustomFieldValue>;
  status?: LeadStatus;
  assignedToId?: string | null;
  followUpDate?: string | null;
  /** Rupees in, paise out — the conversion lives in lib/db and nowhere else. */
  dealValue?: number | null;
  dealClosedAt?: string | null;
  reviewedAt?: string | null;
  savedToContacts?: boolean;
};

export function toUpdate(patch: LeadPatch): Updates<'leads'> {
  const row: Updates<'leads'> = {};
  if (patch.name !== undefined) row.full_name = patch.name.trim();
  if (patch.company !== undefined) row.company = patch.company.trim() || null;
  if (patch.phone !== undefined) row.phone = patch.phone.trim() || null;
  if (patch.email !== undefined) row.email = patch.email.trim().toLowerCase() || null;
  if (patch.designation !== undefined) row.designation = patch.designation.trim() || null;
  if (patch.note !== undefined) row.note = patch.note.trim() || null;
  if (patch.companyLandline !== undefined) row.company_landline = patch.companyLandline.trim() || null;
  if (patch.companyWebsite !== undefined) row.company_website = patch.companyWebsite.trim() || null;
  if (patch.companyAddress !== undefined) row.company_address = patch.companyAddress.trim() || null;
  if (patch.companySummary !== undefined) row.company_summary = patch.companySummary.trim() || null;
  if (patch.customFieldValues !== undefined) {
    row.custom_field_values = patch.customFieldValues as Updates<'leads'>['custom_field_values'];
  }
  if (patch.status !== undefined) row.status = statusToDb(patch.status);
  if (patch.assignedToId !== undefined) row.assigned_to = patch.assignedToId;
  if (patch.followUpDate !== undefined) row.follow_up_date = patch.followUpDate;
  if (patch.dealValue !== undefined) {
    row.deal_value_paisa = patch.dealValue == null ? null : rupeesToPaise(patch.dealValue);
  }
  if (patch.dealClosedAt !== undefined) row.deal_closed_at = patch.dealClosedAt;
  if (patch.reviewedAt !== undefined) row.reviewed_at = patch.reviewedAt;
  if (patch.savedToContacts !== undefined) row.saved_to_contacts = patch.savedToContacts;
  return row;
}

export type UpdateOutcome =
  | { ok: true; lead: Lead }
  | { ok: false; message: string; permanent: boolean };

export async function updateLead(id: string, patch: LeadPatch): Promise<UpdateOutcome> {
  const { data, error } = await supabase
    .from('leads')
    .update(toUpdate(patch))
    .eq('id', id)
    .select(SELECT)
    .single();

  if (error) {
    return { ok: false, message: describeLeadError(error), permanent: isPermanentFailure(error) };
  }
  return { ok: true, lead: toLead(data as LeadRow) };
}
