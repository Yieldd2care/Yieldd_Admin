import { Text, View } from 'react-native';

/**
 * A three-column comparison where one column is a solid highlighted band.
 *
 * Laid out row-major — each row is a flex row of three cells — so rows keep
 * their natural height. The column-major alternative (three sibling columns)
 * would need a hard height on every row, because React Native has no way to
 * synchronise row heights across independent flex columns.
 *
 * The band is painted first, absolutely, so it sits behind every row. All
 * three columns are flex-1 precisely so a `w-1/3` band lines up with the third
 * cell exactly; with uneven flex ratios the band and the text would drift
 * apart.
 *
 * Row separators are drawn per cell, not across the row, because a hairline in
 * the light border colour would otherwise run straight over the band.
 *
 * Padding and the header's letter-spacing both tighten below `md`. At 390px
 * each column is about 116px wide, and the desktop values pushed the last
 * letter of "SPREADSHEET" onto a line of its own.
 */

export interface ComparisonRow {
  label: string;
  before: string;
  after: string;
}

interface Props {
  columns: [string, string, string];
  rows: ComparisonRow[];
  className?: string;
}

const CELL = 'flex-1 px-3 md:px-6 py-[14px] md:py-[18px] justify-center';
const BODY =
  '[font-family:Figtree,system-ui,sans-serif] text-[13px] md:text-[14px] leading-[1.5]';

export function ComparisonTable({ columns, rows, className = '' }: Props) {
  return (
    <View
      className={`relative rounded-[20px] overflow-hidden border border-hairline bg-white ${className}`}
    >
      {/* Painted first so it lies behind the rows. */}
      <View pointerEvents="none" className="absolute right-0 top-0 bottom-0 w-1/3 bg-navy" />

      {/* Header */}
      <View className="flex-row items-stretch">
        <View className={CELL} />
        <View className={CELL}>
          <Text
            className={`[font-family:Figtree,system-ui,sans-serif] [font-weight:700] text-[10px] md:text-[11px] tracking-[0.04em] md:tracking-[0.12em] uppercase text-label`}
          >
            {columns[1]}
          </Text>
        </View>
        <View className={CELL}>
          <Text
            className={`[font-family:Figtree,system-ui,sans-serif] [font-weight:700] text-[10px] md:text-[11px] tracking-[0.04em] md:tracking-[0.12em] uppercase text-gold`}
          >
            {columns[2]}
          </Text>
        </View>
      </View>

      {rows.map((row) => (
        <View key={row.label} className="flex-row items-stretch">
          <View className={`${CELL} border-t border-hairline`}>
            <Text className={`${BODY} [font-weight:600] text-navy`}>{row.label}</Text>
          </View>
          <View className={`${CELL} border-t border-hairline`}>
            <Text className={`${BODY} text-slate`}>{row.before}</Text>
          </View>
          <View className={`${CELL} border-t border-white/[0.12]`}>
            <Text className={`${BODY} [font-weight:600] text-white`}>{row.after}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
