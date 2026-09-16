import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { CopyMessageButton, LeadDetailBody } from './LeadDetail';
import { Icon, ICON } from './controls';
import { Typography } from '../ui/Typography';
import { useLeadsStore } from '../../stores/useLeadsStore';

/**
 * A lead, shown over the list rather than instead of it.
 *
 * Built on `Modal` for the same reason `ConfirmDialog` is: react-native-web
 * ships `Alert` as an empty function, so nothing copied from a phone screen
 * would show at all, and `Modal` is the one overlay react-native-web really
 * implements. It also gives us Escape for free — that is what `onRequestClose`
 * is wired to below — and a focus trap.
 *
 * The lead itself is far taller than a confirm dialog, so the card caps its own
 * height and scrolls inside, and carries a close button of its own. A backdrop
 * click is not enough when the card covers most of the screen.
 *
 * What keeps the list underneath alive is not this file. It is
 * `presentation: 'transparentModal'` on the `leads/[id]` screen in
 * `app/(dash)/_layout.tsx`: without it the web stack sets `display: none` on
 * the screen below, which throws away the list's scroll position even though
 * React keeps the component mounted.
 */
export function LeadOverlay({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const leads = useLeadsStore((s) => s.leads);
  const lead = useMemo(() => leads.find((l) => l.id === leadId), [leads, leadId]);

  const subtitle = lead
    ? [lead.designation, lead.company].filter(Boolean).join(' at ') || 'No company captured'
    : 'It may not have synced to this browser yet.';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 items-center justify-center px-5 py-6"
        style={{ backgroundColor: 'rgba(11,19,43,0.45)' }}
      >
        {/* Stops a click inside the card reaching the backdrop above. */}
        <Pressable
          onPress={() => {}}
          className="w-full bg-section border border-hairline rounded-lg overflow-hidden"
          style={{ maxWidth: 1080, maxHeight: '100%' }}
        >
          <View className="flex-row items-center gap-3 bg-white border-b border-hairline px-[22px] py-[14px]">
            <View className="flex-1 min-w-0">
              <Typography className="text-[19px] font-extrabold text-navy tracking-tight" numberOfLines={1}>
                {lead ? lead.name || 'Unnamed lead' : 'Lead not found'}
              </Typography>
              <Typography className="text-[12.5px] text-slate mt-[2px]" numberOfLines={1}>
                {subtitle}
              </Typography>
            </View>
            {lead ? <CopyMessageButton lead={lead} /> : null}
            <Pressable
              onPress={onClose}
              accessibilityLabel="Close"
              className="w-[34px] h-[34px] rounded-md border border-hairline bg-white items-center justify-center"
            >
              <Icon d={ICON.close} size={14} color="#5A6B87" width={2.2} />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="px-[22px] py-5">
            <LeadDetailBody leadId={leadId} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
