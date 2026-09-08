import { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { DashShell } from '../../../../components/dash/DashShell';
import { EventForm, type EventFormValues } from '../../../../components/dash/EventForm';
import { Empty, Panel } from '../../../../components/dash/primitives';
import { useEvent, useUpdateEvent } from '../../../../hooks/useEvents';
import { useSessionStore } from '../../../../stores/useSessionStore';
import { EMPTY_COSTS } from '../../../../types/event';

export default function EditEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? '';
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');
  const { data: event, isLoading } = useEvent(eventId || undefined);
  const updateEvent = useUpdateEvent();
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) return <Redirect href="/(dash)/events" />;

  async function submit(values: EventFormValues) {
    if (updateEvent.isPending || !eventId) return;
    setError(null);
    try {
      await updateEvent.mutateAsync({
        id: eventId,
        name: values.name,
        city: values.city,
        // Empty means "not known", which is a null column rather than an empty
        // string — {{stall}} then drops out of a message instead of rendering
        // as nothing between two spaces.
        stallNumber: values.stallNumber.trim() || null,
        startDate: values.startDate as Date,
        endDate: values.endDate as Date,
        costs: values.costs,
      });
      router.replace('/(dash)/events');
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save. Try again.");
    }
  }

  if (!event) {
    return (
      <DashShell title="Edit event">
        <Panel>
          <Empty
            title={isLoading ? 'Loading' : 'Event not found'}
            body={isLoading ? 'One moment.' : 'It may have been deleted, or you are not on it.'}
          />
        </Panel>
      </DashShell>
    );
  }

  return (
    <DashShell title="Edit event" subtitle={event.name}>
      <View>
        <EventForm
          // Keyed on the id so the form seeds once the event lands and is not
          // re-seeded by a refetch — that would wipe what is half typed.
          key={event.id}
          initial={{
            name: event.name,
            city: event.city ?? '',
            stallNumber: event.stallNumber ?? '',
            startDate: event.startDate ? new Date(event.startDate) : null,
            endDate: event.endDate ? new Date(event.endDate) : null,
            costs: { ...EMPTY_COSTS, ...event.costs },
          }}
          submitLabel="Save changes"
          busy={updateEvent.isPending}
          error={error}
          onSubmit={submit}
          onCancel={() => router.back()}
        />
      </View>
    </DashShell>
  );
}
