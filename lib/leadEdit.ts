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
  /**
   * The second and later values of each family.
   *
   * Absent means "not touched" and [] means "cleared" - the distinction the
   * whole patch is built on, and the reason nothing below may test these for
   * truthiness. An empty array is truthy.
   */
  extraPhones?: string[];
  extraEmails?: string[];
  extraDesignations?: string[];
  companyLandline?: string;
  companyWebsite?: string;
  companyAddress?: string;
  branchAddress?: string;
  note?: string;
  customFieldValues?: Record<string, CustomFieldValue>;
};

/**
 * What the form holds: every text field present, never undefined.
 *
 * The three families are ONE list each, where [0] is the primary value. The
 * screen never sees the phone/extraPhones split - that happens here, in
 * leadEditPatch, and nowhere else. If the form held them separately, "delete
 * the first row" would become a special case every screen had to reimplement.
 */
export type LeadEditForm = {
  name: string;
  phones: string[];
  company: string;
  emails: string[];
  designations: string[];
  companyLandline: string;
  companyWebsite: string;
  companyAddress: string;
  branchAddress: string;
  note: string;
  customFieldValues: Record<string, CustomFieldValue>;
};

// The three families are absent on purpose: a list cannot be compared by the
// trim rule below, and they are handled by splitFamily instead.
const TEXT_KEYS = [
  'name',
  'company',
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

/**
 * The array form of the trim rule above, plus one thing it does not need.
 *
 * Blank rows are dropped: the form shows an empty row for a value that is not
 * there yet, and without this every untouched empty row would look like a
 * change and every save would write a blank extra.
 *
 * Repeats are dropped too, and that is not tidiness. The same number typed into
 * the first row and a later one would otherwise be stored in both 'phone' and
 * 'extra_phones'; the wire layer drops it on the way out (toColumnList), so
 * without dropping it here as well the device would hold a value the server
 * does not until the next refresh.
 */
function cleanList(values: readonly (string | undefined)[] | undefined): string[] {
  const out: string[] = [];
  for (const raw of values ?? []) {
    const value = (raw ?? '').trim();
    if (!value || out.includes(value)) continue;
    out.push(value);
  }
  return out;
}

/**
 * Compared IN ORDER, deliberately unlike sameCustomValues, which sorts.
 *
 * Custom answers live in a jsonb object, which has no order. A text[] has one:
 * Postgres preserves it, PostgREST preserves it, and row 2 of the extras is
 * visibly above row 3. Reordering two numbers IS an edit, and nothing anywhere
 * may sort these.
 */
function listChanged(next: readonly string[], before: readonly string[]): boolean {
  return next.length !== before.length || next.some((value, i) => value !== before[i]);
}

/**
 * One family of values - the form's single list - split back into the primary
 * column and the extras column, with each half emitted only if it moved.
 *
 * A list key that is undefined is SKIPPED rather than treated as empty. That is
 * the safe direction: a caller that built a form before this family existed
 * writes nothing, where the alternative writes [] over extras the form never
 * showed.
 *
 * Two consequences worth knowing, both correct:
 *   - deleting the primary while a second value exists moves BOTH halves, so
 *     the patch carries two keys;
 *   - adding an extra moves only the extras, so the primary is not resent -
 *     which is the whole point of the minimal patch.
 */
function splitFamily(
  list: readonly string[] | undefined,
  beforePrimary: string | undefined,
  beforeExtras: readonly string[] | undefined
): { primary?: string; extras?: string[] } {
  if (list === undefined) return {};

  const cleaned = cleanList(list);
  const nextPrimary = cleaned[0] ?? '';
  const nextExtras = cleaned.slice(1);

  const moved: { primary?: string; extras?: string[] } = {};
  if (changed(nextPrimary, beforePrimary)) moved.primary = nextPrimary;
  // The cleaned copy, never the form's own array: this severs the alias with
  // the screen's useState, so a later setPhones([...prev, '']) cannot reach
  // into a patch already sitting in the offline outbox.
  if (listChanged(nextExtras, cleanList(beforeExtras))) moved.extras = nextExtras;
  return moved;
}

/**
 * The same split, for a screen that has no "before" to diff against.
 *
 * Manual capture inserts rather than patches, so nothing there is comparing
 * against a stored lead - but it needs exactly the same cleaning, and a second
 * copy of these rules is a second thing to get wrong. Exported from here
 * rather than hoisted somewhere shared because scripts/verify-lead-edit.mjs
 * compiles THIS FILE standalone, and it can only do that while the file has no
 * runtime imports.
 */
export function splitLeadList(values: readonly string[] | undefined): {
  primary: string;
  extras: string[];
} {
  const cleaned = cleanList(values);
  return { primary: cleaned[0] ?? '', extras: cleaned.slice(1) };
}

export function leadEditPatch(
  before: EditableLeadFields,
  form: LeadEditForm
): EditableLeadFields {
  const patch: EditableLeadFields = {};

  for (const key of TEXT_KEYS) {
    if (changed(form[key], before[key])) patch[key] = form[key];
  }

  // Written out per family rather than looped: a loop over a union of key names
  // cannot be assigned through without a cast, and this is the file where a
  // cast would be hiding exactly the mistake it is worth catching.
  const phones = splitFamily(form.phones, before.phone, before.extraPhones);
  if (phones.primary !== undefined) patch.phone = phones.primary;
  if (phones.extras !== undefined) patch.extraPhones = phones.extras;

  const emails = splitFamily(form.emails, before.email, before.extraEmails);
  if (emails.primary !== undefined) patch.email = emails.primary;
  if (emails.extras !== undefined) patch.extraEmails = emails.extras;

  const designations = splitFamily(
    form.designations,
    before.designation,
    before.extraDesignations
  );
  if (designations.primary !== undefined) patch.designation = designations.primary;
  if (designations.extras !== undefined) patch.extraDesignations = designations.extras;

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
