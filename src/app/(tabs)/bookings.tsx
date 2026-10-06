import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Placeholder } from '@/components/Placeholder';
import { colors } from '@/constants/colors';
import { supabase } from '../../../supabase';

export default function BookingsScreen() {
  const { tutorId } = useLocalSearchParams<{ tutorId?: string }>();
  const [tutorName, setTutorName] = useState<string>();

  useEffect(() => {
    if (!tutorId) {
      return;
    }

    let active = true;
    supabase
      .from('tutors')
      .select('name')
      .eq('id', tutorId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching booking tutor:', error);
          return;
        }
        if (active) setTutorName(data?.name);
      });

    return () => {
      active = false;
    };
  }, [tutorId]);

  return (
    <Placeholder
      icon="calendar-outline"
      title="Bookings"
      message="The Bookings module will be built here.">
      {tutorName && (
        <Text style={{ color: colors.primary, fontWeight: '700', textAlign: 'center' }}>
          Booking request started for {tutorName}
        </Text>
      )}
    </Placeholder>
  );
}
