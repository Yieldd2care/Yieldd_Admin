import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '../supabase';
import type { Enums, Tables } from '../db';
import type { CustomFieldDef, CustomFieldType } from '../../stores/useEventFieldsStore';

type FieldRow = Tables<'event_custom_field_defs'>;
type DbFieldType = Enums<'custom_field_type'>;

/**
 * The screens say `Dropdown`, the column says `dropdown`. Both directions are
 * spelled out rather than lower-cased on the fly, so adding a type to one side
 * without the other is a type error instead of a runtime surprise.
 */
const TO_DB: Record<CustomFieldType, DbFieldType> = {
  Text: 'text',
  Number: 'number',
  Dropdown: 'dropdown',
  Checkbox: 'checkbox',
  Radio: 'radio',
};

const FROM_DB: Record<DbFieldType, CustomFieldType> = {
  text: 'Text',
  number: 'Number',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
  radio: 'Radio',
};

/** A field the editor created but the database has not seen yet. */
export function isUnsavedFieldId(id: string): boolean {
  return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function toDef(row: FieldRow): CustomFieldDef {
  return {
    id: row.id,
    name: row.label,
    type: FROM_DB[row.field_type],
    required: row.is_required,
    options: Array.isArray(row.options) ? (row.options as string[]) : [],
  };
}

export function describeFieldError(error: PostgrestError): string {
  if (error.code === '42501') return 'Only an admin can change the fields for an event.';
  if (__DEV__) console.warn('[eventFields]', error);
  return "Those fields didn't save. Check your connection and try again.";
}

export async function fetchEventFields(eventId: string): Promise<CustomFieldDef[]> {
  const { data, error } = await supabase
    .from('event_custom_field_defs')
    .select('*')
    .eq('event_id', eventId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data as FieldRow[]).map(toDef);
}

/**
 * Makes the event's fields match what is on screen.
 *
 * Rows are updated in place rather than wiped and re-created, because
 * `leads.custom_field_values` is keyed by field id: deleting a definition to
 * recreate it under a new id would orphan every answer already captured
 * against it. Renaming "Budget" to "Budget range" has to keep the answers.
 */
export async function saveEventFields(
  eventId: string,
  fields: CustomFieldDef[]
): Promise<CustomFieldDef[]> {
  // A field with no name was added and never filled in. Saving it would put a
  // nameless input in front of a rep at the booth.
  const named = fields.filter((f) => f.name.trim());

  const existing = await fetchEventFields(eventId);
  const keptIds = new Set(named.filter((f) => !isUnsavedFieldId(f.id)).map((f) => f.id));
  const removed = existing.filter((f) => !keptIds.has(f.id));

  if (removed.length) {
    const { error } = await supabase
      .from('event_custom_field_defs')
      .delete()
      .in('id', removed.map((f) => f.id));
    if (error) throw new Error(describeFieldError(error));
  }

  const saved: CustomFieldDef[] = [];

  for (const [index, field] of named.entries()) {
    const payload = {
      event_id: eventId,
      label: field.name.trim(),
      field_type: TO_DB[field.type],
      is_required: field.required,
      // Only the choice types carry options; storing them on a Text field would
      // render as a dropdown the moment someone changes its type back.
      options: field.type === 'Dropdown' || field.type === 'Radio' ? field.options : null,
      display_order: index,
    };

    const query = isUnsavedFieldId(field.id)
      ? supabase.from('event_custom_field_defs').insert(payload).select().single()
      : supabase
          .from('event_custom_field_defs')
          .update(payload)
          .eq('id', field.id)
          .select()
          .single();

    const { data, error } = await query;
    if (error) throw new Error(describeFieldError(error));
    saved.push(toDef(data as FieldRow));
  }

  return saved;
}
