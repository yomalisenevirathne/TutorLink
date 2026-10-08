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

  // These masked details are display metadata, not a chargeable payment token.
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

export async function savePaymentMethod(userId, metadata) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!userId || authData?.user?.id !== userId) {
    const error = new Error('Sign in with a registered account to save cards.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }
  const name = String(metadata.cardholder_name || '').trim();
  const month = Number(metadata.exp_month);
  const year = Number(metadata.exp_year);
  if (!['Visa', 'Mastercard', 'American Express'].includes(metadata.brand)
    || typeof metadata.last4 !== 'string' || !/^\d{4}$/.test(metadata.last4)
    || !Number.isInteger(month) || month < 1 || month > 12
    || !Number.isInteger(year) || year < 2000 || year > 9999
    || name.length < 2 || name.length > 80) throw new Error('Check the card details and try again.');

  // Explicit whitelist: never submit a full number, CVV, client-selected owner or token.
  const { data, error } = await supabase.from('payment_methods').insert({
    user_id: authData.user.id,
    brand: metadata.brand,
    last4: metadata.last4,
    exp_month: month,
    exp_year: year,
    cardholder_name: name,
  }).select('id, user_id, brand, last4, exp_month, exp_year, is_default').single();
  if (error) {
    if (['PGRST205', '42P01', '42703', 'PGRST204'].includes(error.code)) {
      const unavailable = new Error('Card saving is not available yet. Please contact support.');
      unavailable.code = 'CARD_STORAGE_UNAVAILABLE';
      throw unavailable;
    }
    throw new Error("We couldn't save your card. Please try again.");
  }
  if (!data?.id || data.user_id !== userId || data.last4 !== metadata.last4)
    throw new Error('Your card could not be confirmed as saved. Please try again.');
  return { id: data.id, brand: data.brand, last4: data.last4,
    expiry: `${String(data.exp_month).padStart(2, '0')}/${String(data.exp_year).slice(-2)}` };
}

export function savedCardsErrorMessage(error) {
  if (error.code === 'AUTH_REQUIRED' || error.status === 401 || error.name === 'AuthSessionMissingError')
    return 'Please sign in again to view your saved cards.';
  return "We couldn't load your saved cards. Please try again.";
}
