import { useLocalSearchParams } from 'expo-router';

import { LeadDetail } from '../../../components/dash/LeadDetail';

export default function DashLeadDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LeadDetail leadId={id ?? ''} />;
}
