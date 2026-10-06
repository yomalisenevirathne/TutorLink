import { useLocalSearchParams } from 'expo-router';

import { TutorProfileScreen } from '@/features/search';

export default function TutorRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TutorProfileScreen id={id} />;
}
