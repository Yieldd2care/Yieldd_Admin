import { Pressable, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { FloatingLabelInput } from '../ui/FloatingLabelInput';
import { PlusIcon, TrashIcon } from '../ui/icons';

/**
 * One contact detail that a person can legitimately have several of.
 *
 * A card prints two numbers, or a mobile and a direct line, or an personal
 * address and a desk one. Until now the second of each was lost - there was a
 * single box, and whoever typed had to choose. These are the rows behind that:
 * a list of values where the FIRST is the primary one, and the rest are extras.
 *
 * That the first is special is invisible here on purpose. The caller hands over
 * one list and gets one list back; the split into `phone` + `extra_phones`
 * happens once, at the patch boundary in `lib/leadEdit.ts`. If this component
 * knew about the split, "delete the first row" would become a special case that
 * every screen using it had to reimplement.
 *
 * Two rules that look like styling and are not:
 *
 * - The controls' class lists are IDENTICAL in every state and only a plain
 *   `opacity` style varies. A row that mounts after the first render and brings
 *   the first `shadow-*`/`scale-*`/pseudo-class into the tree is what makes
 *   NativeWind try to upgrade a live component and throw the red screen about a
 *   missing navigation context - see AGENTS.md. A growing list is exactly that
 *   shape, so nothing here may gain a class it did not start with.
 *
 * - Blank rows are left alone while typing. They are dropped on save, in
 *   `leadEditPatch`. Filtering here would delete the row out from under the
 *   person the instant they cleared it to retype.
 */

interface Props {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  /** An upper bound so a stuck finger cannot grow the row unboundedly. */
  max?: number;
  hint?: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  /** The surface colour behind the rows, passed straight through so the
   *  floated labels notch the border instead of smearing over it. */
  notchColor?: string;
}

export function RepeatableField({
  label,
  values,
  onChange,
  max = 5,
  hint,
  keyboardType,
  autoCapitalize,
  notchColor,
}: Props) {
  // A caller that has not loaded yet hands over []; one empty row is what an
  // empty field looks like, and it keeps `rows[0]` from being undefined
  // everywhere below.
  const rows = values.length > 0 ? values : [''];
  const last = rows[rows.length - 1] ?? '';
  const canAdd = rows.length < max && last.trim().length > 0;

  const setAt = (index: number, text: string) => {
    onChange(rows.map((v, i) => (i === index ? text : v)));
  };

  const removeAt = (index: number) => {
    // The first row is cleared, never removed. The list is the field: with no
    // rows there is no box, and the primary value would have nowhere to go
    // back into.
    if (index === 0) {
      onChange(rows.length === 1 ? [''] : ['', ...rows.slice(1)]);
      return;
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <View className="gap-[22px]">
      {rows.map((value, index) => (
        <FloatingLabelInput
          // Index, deliberately. The value is not unique - two blank rows are
          // identical - and a row's identity here IS its position.
          key={index}
          label={index === 0 ? label : `${label} ${index + 1}`}
          value={value}
          onChangeText={(text) => setAt(index, text)}
          hint={index === 0 ? hint : undefined}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          notchColor={notchColor}
          trailing={
            <>
              <Pressable
                onPress={() => removeAt(index)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  index === 0 ? `Clear ${label}` : `Remove ${label} ${index + 1}`
                }
                className="w-[32px] h-[32px] items-center justify-center active:opacity-60"
              >
                <TrashIcon size={17} strokeWidth={1.9} />
              </Pressable>
              <Pressable
                onPress={() => canAdd && onChange([...rows, ''])}
                disabled={!canAdd}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Add another ${label.toLowerCase()}`}
                className="w-[32px] h-[32px] items-center justify-center active:opacity-60"
                // A plain style, not a swapped class: the disabled look must not
                // change which utilities are in the class list. See the note at
                // the top of this file.
                style={{ opacity: canAdd ? 1 : 0.3 }}
              >
                <PlusIcon size={18} color="#1D3F8A" strokeWidth={2.2} />
              </Pressable>
            </>
          }
        />
      ))}
    </View>
  );
}
