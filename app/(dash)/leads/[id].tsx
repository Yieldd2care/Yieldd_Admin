import { useState } from 'react';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

import { LeadDetail } from '../../../components/dash/LeadDetail';
import { LeadOverlay } from '../../../components/dash/LeadOverlay';

/**
 * One lead, in whichever of its two presentations this visit calls for.
 *
 * The overlay IS this route rather than a second copy of it, so the URL still
 * changes when a lead is opened from the list: the link is copyable and
 * browser back closes the lead instead of leaving the dashboard. Which
 * presentation to use is decided by whether there is anywhere to go back to —
 * arrive from the list (or from the global search) and the lead opens over the
 * screen you were on; open or refresh `/leads/<id>` in a fresh tab and there is
 * nothing underneath, so it renders as a full page with the sidebar and
 * breadcrumb, exactly as it did before.
 *
 * Read once, into state, on purpose. `canGoBack()` is not reactive and the
 * answer changing under a mounted screen would swap a modal for a page
 * mid-life, which is both jarring and the kind of conditional structure change
 * NativeWind handles badly.
 */
export default function DashLeadDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const [asOverlay] = useState(() => navigation.canGoBack());

  if (asOverlay) {
    return <LeadOverlay leadId={id ?? ''} onClose={() => router.back()} />;
  }
  return <LeadDetail leadId={id ?? ''} />;
}
