import { useState } from 'react';
import { Image, View } from 'react-native';

import { Typography } from '../ui/Typography';

/**
 * The captured business card, where a lead's initial used to be.
 *
 * Falls back to the initial rather than to an empty box, because most leads
 * will not have a photo: manual entry has none by definition, and a grey
 * square would read as a failed image rather than as a lead typed in by hand.
 *
 * The card is wide and this frame is square, so `cover` crops the sides. That
 * is the right trade here — the middle of a card carries the logo and the
 * name, which is what makes a rep recognise it in a list — and the whole
 * photo is on the lead's own screen for anyone who needs to read it.
 */
export function CardThumb({
  uri,
  initial,
  size = 36,
  radius = 10,
}: {
  uri: string | null;
  initial: string;
  size?: number;
  radius?: number;
}) {
  /**
   * A signed URL can be stale, a local file can have been cleared out of the
   * cache, and either way `Image` reports it after the frame has been drawn.
   * Without this the row keeps a blank square forever; with it, it quietly
   * becomes the initial again.
   */
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(uri) && !failed;

  return (
    <View
      className="bg-surface items-center justify-center overflow-hidden"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {showPhoto ? (
        <Image
          // Keyed on the URL so a re-signed link or a replaced photo resets
          // the failure above instead of inheriting it.
          key={uri}
          source={{ uri: uri as string }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Typography
          className="font-extrabold text-navy"
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {initial}
        </Typography>
      )}
    </View>
  );
}
