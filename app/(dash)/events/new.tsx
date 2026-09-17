import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';

import { DashShell } from '../../../components/dash/DashShell';
import { EventForm, emptyEventForm, type EventFormValues } from '../../../components/dash/EventForm';
import { useCreateEvent, useUpdateEvent } from '../../../hooks/useEvents';
import { useSessionStore } from '../../../stores/useSessionStore';
import { COST_KEYS } from '../../../types/event';

export default function NewEventScreen() {
  const router = useRouter();
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const [error, setError] = useState<string | null>(null);

  // A rep cannot create an event. The database refuses it anyway; this stops
  // them filling in a form that was never going to save.
  if (!isAdmin) return <Redirect href="/(dash)/events" />;

  const busy = createEvent.isPending || updateEvent.isPending;

  async function submit(values: EventFormValues) {
    if (busy) return;
    setError(null);
    try {
      const event = await createEvent.mutateAsync({
        name: values.name,
        city: values.city,
        startDate: values.startDate as Date,
        endDate: values.endDate as Date,
        stallNumber: values.stallNumber.trim() || null,
      });

      // createEvent takes no costs — the columns are a separate write, the same
      // way the wizard's cost step is. Skipped entirely when nothing was typed,
      // so a blank cost panel does not cost a round trip.
      //
      // "Was anything typed", not "is anything above zero". The old `> 0` test
      // threw away an event costed entirely at zero, leaving it indistinguishable
      // from one nobody had costed at all — which is the distinction this form
      // now exists to record.
      const hasCosts = COST_KEYS.some((k) => values.costs[k] != null);
      if (hasCosts) {
        await updateEvent.mutateAsync({ id: event.id, costs: values.costs });
      }

      router.replace('/(dash)/events');
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save. Try again.");
    }
  }

  return (
    <DashShell title="New event" subtitle="Everything captured at it collects against these details">
      <EventForm
        initial={emptyEventForm()}
        submitLabel="Create event"
        busy={busy}
        error={error}
        onSubmit={submit}
        onCancel={() => router.back()}
      />
    </DashShell>
  );
}
