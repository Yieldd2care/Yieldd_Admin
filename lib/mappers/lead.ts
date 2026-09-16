import type { Enums, Tables } from '../db';
import { paiseToRupees } from '../db';
import type { CustomFieldValue, Lead, LeadStatus, LeadTemperature } from '../../data/leads';

export type LeadRow = Tables<'leads'>;
type DbLeadStatus = Enums<'lead_status'>;

/**
 * Which event, organisation and person a lead belongs to.
 *
 * Kept apart from `Lead` because `Lead` is the shape screens render and none of
 * these are ever shown — but they are not optional either. `eventId` in
 * particular is what a follow-up reads the event name and stall number from,
 * and it used to be dropped on the floor: the mapper never carried it, so every
 * lead loaded from the server got an empty string and `{{event}}` and
 * `{{stall}}` came out blank in the message a customer received.
 */
export type LeadOwnership = {
  eventId: string;
  capturedBy: string;
  organizationId: string;
};

export function toOwnership(row: LeadRow): LeadOwnership {
  return {
    eventId: row.event_id,
    capturedBy: row.captured_by,
    organizationId: row.organization_id,
  };
}

/**
 * The screens say `Qualified`, the column says `qualified`.
 *
 * Both directions are written out rather than lower-cased on the fly: adding a
 * status to one side without the other is then a type error, not a lead that
 * silently renders with no pill.
 */
const STATUS_TO_DB: Record<LeadStatus, DbLeadStatus> = {
  New: 'new',
  Contacted: 'contacted',
  Qualified: 'qualified',
  Won: 'won',
  Lost: 'lost',
};

const STATUS_FROM_DB: Record<DbLeadStatus, LeadStatus> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  won: 'Won',
  lost: 'Lost',
};

export function statusToDb(status: LeadStatus): DbLeadStatus {
  return STATUS_TO_DB[status];
}

export function statusFromDb(status: DbLeadStatus): LeadStatus {
  return STATUS_FROM_DB[status];
}

type DbTemperature = Enums<'lead_temperature'>;

const TEMPERATURE_TO_DB: Record<LeadTemperature, DbTemperature> = {
  Hot: 'hot',
  Warm: 'warm',
  Cold: 'cold',
};

const TEMPERATURE_FROM_DB: Record<DbTemperature, LeadTemperature> = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
};

export function temperatureToDb(value: LeadTemperature): DbTemperature {
  return TEMPERATURE_TO_DB[value];
}

/** `4:12 PM` — how the lead list labels when someone was captured. */
export function captureTimeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function initialOf(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?';
}

type RowWithVoice = LeadRow & { voice_notes?: { count: number }[] | null };

/**
 * "Needs a note" means nobody recorded what the conversation was about, by
 * either means.
 *
 * A rep who held the phone up and talked has noted the lead just as much as one
 * who typed, so a voice note clears it (PENDING 40, decided 2026-09-15). The
 * filter keeps the label "Needs a note" by the same decision — the alternative,
 * narrowing the flag to a TYPED note and renaming the filter, was considered
 * and not chosen.
 *
 * Written here rather than inline because five places derive this — this mapper
 * and four in the leads store — and a rule copied five times is a rule that
 * drifts. `null` is accepted alongside `undefined` because the database column
 * is `string | null` while every in-app caller holds `string | undefined`.
 */
export function needsNoteFor(note: string | null | undefined, hasVoice: boolean): boolean {
  return !note?.trim() && !hasVoice;
}

export function toLead(row: RowWithVoice): Lead {
  const hasVoice = (row.voice_notes?.[0]?.count ?? 0) > 0;

  return {
    id: row.id,
    initial: initialOf(row.full_name),
    name: row.full_name,
    company: row.company ?? '',
    time: captureTimeLabel(row.created_at),
    status: statusFromDb(row.status),
    hasVoice,
    needsNote: needsNoteFor(row.note, hasVoice),
    consentGiven: row.consent_given,
    source: row.source,
    capturedAt: row.created_at,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    designation: row.designation ?? undefined,
    note: row.note ?? undefined,
    companyLandline: row.company_landline ?? undefined,
    companyWebsite: row.company_website ?? undefined,
    companyAddress: row.company_address ?? undefined,
    branchAddress: row.branch_address ?? undefined,
    companySummary: row.company_summary ?? undefined,
    customFieldValues: (row.custom_field_values ?? undefined) as
      | Record<string, CustomFieldValue>
      | undefined,
    // Private buckets hand back signed URLs that expire, so the row stores the
    // object key and the URL is built when it is needed.
    imageUri: row.card_image_path ?? undefined,
    extraPhotoUri: row.extra_photo_path ?? undefined,
    extractionStatus: row.extraction_status ?? undefined,
    duplicateOfLeadId: row.duplicate_of_lead_id ?? undefined,
    followUpDate: row.follow_up_date ?? undefined,
    dealValue: row.deal_value_paisa == null ? undefined : paiseToRupees(row.deal_value_paisa),
    dealClosedAt: row.deal_closed_at ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    temperature: row.temperature ? TEMPERATURE_FROM_DB[row.temperature] : undefined,
    assignedToId: row.assigned_to ?? undefined,
    savedToContacts: row.saved_to_contacts ?? undefined,
    // Independently optional, all four. See the comment on `Lead`.
    captureLatitude: row.capture_latitude ?? undefined,
    captureLongitude: row.capture_longitude ?? undefined,
    captureAccuracyMetres: row.capture_accuracy_m ?? undefined,
    captureAddress: row.capture_address ?? undefined,
  };
}
