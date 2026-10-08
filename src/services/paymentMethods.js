import { supabase } from '../utils/supabase';

function checkCancelled(signal) {
  if (signal?.aborted) {
    const error = new Error('Saved card request cancelled.');
    error.name = 'AbortError';
    throw error;
  }
}

export async function getSavedPaymentMethods(userId, { signal } = {}) {
  checkCancelled(signal);
  const { data: authData, error: authError } = await supabase.auth.getUser();
  checkCancelled(signal);
  if (authError) throw authError;
  if (!userId || authData?.user?.id !== userId) {
    const error = new Error('Please sign in again to view your saved cards.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  // Only display metadata saved by the card provider's trusted backend.
  let query = supabase.from('payment_methods')
    .select('id, user_id, brand, last4, exp_month, exp_year, is_default')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  checkCancelled(signal);
  // An installation without a saved-card table cannot have saved cards.
  if (error?.code === 'PGRST205' || error?.code === '42P01') return [];
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Invalid saved card response.');

  return data.map((card) => {
    if (card.user_id !== userId || !card.id || !card.brand?.trim()
      || !/^\d{4}$/.test(card.last4)
      || !Number.isInteger(card.exp_month) || card.exp_month < 1 || card.exp_month > 12
      || !Number.isInteger(card.exp_year) || card.exp_year < 2000 || card.exp_year > 9999) {
      throw new Error('Invalid saved card record.');
    }
    return {
      id: card.id, brand: card.brand.trim(), last4: card.last4,
      expiry: `${String(card.exp_month).padStart(2, '0')}/${String(card.exp_year).slice(-2)}`,
    };
  });
}

export function savedCardsErrorMessage(error) {
  if (error.code === 'AUTH_REQUIRED' || error.status === 401 || error.name === 'AuthSessionMissingError')
    return 'Please sign in again to view your saved cards.';
  return "We couldn't load your saved cards. Please try again.";
}
