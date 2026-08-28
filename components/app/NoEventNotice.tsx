import { View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { AlertCircleIcon } from '../ui/icons';
import { useSessionStore } from '../../stores/useSessionStore';

/**
 * Shown on the capture screens when there is no event to capture into.
 *
 * Every lead belongs to an event — `leads.event_id` is NOT NULL and row-level
 * security additionally requires the rep to be an active member of it. Without
 * this the Save button would simply do nothing, which reads as a broken app
 * rather than a missing setup step.
 */
export function NoEventNotice() {
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');

  return (
    <View className="flex-row gap-3 bg-gold/[0.10] border border-gold/[0.35] rounded-lg p-4 mb-4">
      <AlertCircleIcon size={17} color="#8A6100" />
      <View className="flex-1">
        <Typography className="text-[13.5px] font-bold text-navy">No event to save this to</Typography>
        <Typography className="text-[12.5px] text-slate mt-[3px] leading-[1.5]">
          {isAdmin
            ? 'Create an event first — every lead belongs to one, so the ROI and reports add up.'
            : 'Ask your admin to add you to the event before you start capturing.'}
        </Typography>
        {isAdmin ? (
          <Button
            label="Create an event"
            onPress={() => router.push('/(app)/events/new')}
            className="mt-3 self-start"
          />
        ) : null}
      </View>
    </View>
  );
}
