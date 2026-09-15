import { View } from 'react-native';

import { Typography } from '../ui/Typography';
import { AlertCircleIcon } from '../ui/icons';
import { MERGE_FIELDS, unknownMergeTokens } from '../../lib/messaging';

/**
 * A template's text, with its variables marked.
 *
 * **Gold** is a token `renderTemplate` will replace. **Red** is a `{{…}}` this
 * app has never heard of — the renderer leaves those exactly as typed, so they
 * travel into WhatsApp and are read by a customer as literal
 * `{{Interest/Requirement}}`. Both are highlighted, because on screen they look
 * identical and only one of them works.
 *
 * One copy, used by the template editor, the wizard step and the per-event
 * picker. There were three, which is three chances for the highlighting to
 * disagree with what the renderer actually does.
 */
export function MergeFieldText({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split(/(\{\{[^}]*\}\})/g);
  const known = new Set<string>(MERGE_FIELDS.map((f) => f.token));

  return (
    <Typography className={className}>
      {parts.map((part, i) => {
        if (!part.startsWith('{{')) return part;
        return known.has(part) ? (
          <Typography key={i} className="font-bold text-navy bg-gold/[0.16] px-[5px] rounded">
            {part}
          </Typography>
        ) : (
          <Typography key={i} className="font-bold text-[#C23B3B] bg-[#C23B3B]/[0.12] px-[5px] rounded">
            {part}
          </Typography>
        );
      })}
    </Typography>
  );
}

/**
 * Says plainly what happens to a `{{…}}` the app does not recognise.
 *
 * Nothing deletes these. Silently removing something a person deliberately
 * typed is worse than sending it — so they are surfaced here, while there is
 * still someone in front of the screen who can fix them.
 */
export function UnknownTokenWarning({ text }: { text: string }) {
  const unknown = unknownMergeTokens(text);
  if (!unknown.length) return null;

  return (
    <View className="flex-row items-start gap-2 bg-[#C23B3B]/[0.08] border border-[#C23B3B]/[0.30] rounded-md px-[12px] py-[10px] mt-[10px]">
      <AlertCircleIcon size={13} color="#C23B3B" strokeWidth={2} />
      <Typography className="flex-1 text-[11.5px] text-navy leading-[1.5]">
        <Typography className="font-bold">{unknown.join(', ')}</Typography>
        {unknown.length > 1 ? ' are not variables' : ' is not a variable'}. It will be sent
        exactly as written. Use one from the list of variables, or take it out and type the words
        yourself.
      </Typography>
    </View>
  );
}
