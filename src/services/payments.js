import { supabase } from '../utils/supabase';
import { mapPaymentRecord } from '../data/paymentHistory';
import { getDemoPaymentHistory } from './demoPayments';

const PAGE_SIZE = 200;

function checkCancelled(signal) {
  if (signal?.aborted) {
    const error = new Error('Payment history request cancelled.');
    error.name = 'AbortError';
    throw error;
  }
}

export async function getPaymentHistory(userId, { signal } = {}) {
  checkCancelled(signal);
  const { data: authData, error: authError } = await supabase.auth.getUser();
  checkCancelled(signal);
  const user = authData?.user;

  if (authError) throw authError;
  if (!user || !userId || user.id !== userId) {
    const error = new Error('Please sign in again to view your payment history.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  const payments = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = supabase.from('payments')
      .select('id, user_id, counterparty_name, counterparty_avatar_url, amount, currency, direction, status, occurred_at')
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (signal) query = query.abortSignal(signal);

    const { data, error } = await query;
    checkCancelled(signal);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Invalid payment history response.');

    for (const record of data) {
      if (record.user_id !== user.id) throw new Error('Invalid payment history owner.');
      payments.push(mapPaymentRecord(record));
    }
    if (data.length < PAGE_SIZE) return payments;
  }
}

export async function getCombinedPaymentHistory(userId, { signal, isDemo = false } = {}) {
  if (isDemo) return getDemoPaymentHistory(userId, { signal, isDemo });
  const [payments, demos] = await Promise.all([
    getPaymentHistory(userId, { signal }), getDemoPaymentHistory(userId, { signal }),
  ]);
  return [...payments, ...demos].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}

export function paymentHistoryErrorMessage(error) {
  if (error.code === 'AUTH_REQUIRED' || error.status === 401
    || error.name === 'AuthSessionMissingError' || error.code === 'refresh_token_not_found') {
    return 'Please sign in again to view your payment history.';
  }
  return "We couldn't load your payment history. Please try again.";
}
