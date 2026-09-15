import type { CustomFieldValue } from '../data/leads';

/**
 * Turning a filled-in edit form back into the smallest possible patch.
 *
 * Out here rather than inside the screen because this is the part that can be
 * wrong in a way nobody notices. `editLead` merges into a pending patch and
 * the outbox writes every key it finds there, so sending a field the rep
 * never touched will overwrite whatever anyone else did to that field in the
 * meantime — from the dashboard, or from this same lead open on a second
 * phone. "Only what actually moved" is a correctness rule, not a saving.
 */

/** The subset of a lead this form can change. Status, deal value, follow-up
 *  date and assignment are all absent on purpose: they are paid features with
 *  their own sheets, and editing them here would route around the locks. */
export type EditableLeadFields = {
  name?: string;
  phone?: string;
  company?: string;
  email?: string;
  designation?: string;
  companyLandline?: string;
  companyWebsite?: string;
  companyAddress?: string;
  branchAddress?: string;
  note?: string;
  customFieldValues?: Record<string, CustomFieldValue>;
};

/** What the form holds: every text field present, never undefined. */
export type LeadEditForm = {
  name: string;
  phone: string;
  company: string;
  email: string;
  designation: string;
  companyLandline: string;
  companyWebsite: string;
  companyAddress: string;
  branchAddress: string;
  note: string;
  customFieldValues: Record<string, CustomFieldValue>;
};

const TEXT_KEYS = [
  'name',
  'phone',
  'company',
  'email',
  'designation',
  'companyLandline',
  'companyWebsite',
  'companyAddress',
  'branchAddress',
  'note',
] as const;

/**
 * Two values are "the same" when they trim to the same string.
 *
 * A field the lead never had reads as undefined and the form shows it as '',
 * so without the trim every untouched empty field would look like a change
 * and every save would write ten nulls over the whole row.
 */
function changed(next: string | undefined, before: string | undefined): boolean {
  // `next` is typed as present on LeadEditForm, so an undefined here means a
  // caller built a form before a field was added to TEXT_KEYS. Coalescing
  // rather than trusting the type: this runs inside a save, and a throw would
  // lose the rep's edits outright. An absent field reads as '' — unchanged —
  // which is the safe direction, since the alternative is writing a null over
  // a value the form never showed.
  return (next ?? '').trim() !== (before ?? '').trim();
}

/**
 * Custom answers are compared as a whole rather than key by key.
 *
 * The patch column is written whole — there is no per-key merge on the server
 * — so a partial comparison would be answering a question the write cannot
 * act on. Key order is normalised first so that two objects holding the same
 * answers never look different because of the order they were typed in.
 */
function sameCustomValues(
  a: Record<string, CustomFieldValue> | undefined,
  b: Record<string, CustomFieldValue> | undefined
): boolean {
  const left = a ?? {};
  const right = b ?? {};
  const keys = Object.keys(left).sort();
  const otherKeys = Object.keys(right).sort();
  if (keys.length !== otherKeys.length) return false;
  if (keys.some((k, i) => k !== otherKeys[i])) return false;
  return keys.every((k) => JSON.stringify(left[k]) === JSON.stringify(right[k]));
}

export function leadEditPatch(
  before: EditableLeadFields,
  form: LeadEditForm
): EditableLeadFields {
  const patch: EditableLeadFields = {};

  for (const key of TEXT_KEYS) {
    if (changed(form[key], before[key])) patch[key] = form[key];
  }

  if (!sameCustomValues(form.customFieldValues, before.customFieldValues)) {
    patch.customFieldValues = form.customFieldValues;
  }

  return patch;
}

/**
 * A lead with no name cannot be found again: the list sorts by it, searches
 * it, and shows it as the row's only heading. It is the one field the form
 * refuses to empty. Everything else may legitimately be cleared — a wrongly
 * read phone number is better absent than wrong.
 */
export function canSaveLeadEdits(patch: EditableLeadFields, form: LeadEditForm): boolean {
  if (Object.keys(patch).length === 0) return false;
  return form.name.trim().length > 0;
}
