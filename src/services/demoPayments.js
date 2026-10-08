import { getPaymentIdentity } from './paymentIdentity';

const columns = 'id, user_id, reference, counterparty_name, amount, currency, status, subject, session_date, session_time, card_brand, card_last4, occurred_at';
const missingTable = (error) => ['PGRST205', '42P01'].includes(error?.code);

function checkCancelled(signal) {
  if (signal?.aborted) {
    const error = new Error('Demo payment history request cancelled.');
    error.name = 'AbortError';
    throw error;
  }
}

function verifyRecord(record, ownerId) {
  if (!record?.id || record.user_id !== ownerId || record.status !== 'Demo'
    || !/^DEMO-[A-Z0-9]+-[A-Z0-9]+$/.test(record.reference)
    || !record.counterparty_name?.trim() || !record.subject?.trim() || !record.session_time?.trim()
    || !/^\d{4}-\d{2}-\d{2}$/.test(record.session_date)
    || !Number.isFinite(Number(record.amount)) || Number(record.amount) <= 0 || record.currency !== 'LKR'
    || !['Visa', 'Mastercard', 'American Express'].includes(record.card_brand)
    || !/^\d{4}$/.test(record.card_last4) || !Number.isFinite(Date.parse(record.occurred_at))) {
    throw new Error('The demo payment record could not be verified.');
  }
  return record;
}

function saveError(error) {
  if (missingTable(error) || ['42703', 'PGRST204'].includes(error?.code)) {
    const unavailable = new Error('Demo payment history storage is not set up yet. Please run the demo payment SQL setup.');
    unavailable.code = 'DEMO_PAYMENT_STORAGE_UNAVAILABLE';
    return unavailable;
  }
  return new Error('Your payment history could not be saved. Please try again.');
}

export async function saveDemoPayment(receipt, { isDemo = false } = {}) {
  if (receipt?.isDemo !== true || !receipt.ownerId
    || !/^DEMO-[A-Z0-9]+-[A-Z0-9]+$/.test(receipt.reference)
    || !Number.isFinite(receipt.amount) || receipt.amount <= 0 || receipt.currency !== 'LKR'
    || !receipt.tutorName?.trim() || !receipt.subject?.trim() || !receipt.time?.trim()
    || !/^\d{4}-\d{2}-\d{2}$/.test(receipt.sessionDate)
    || !['Visa', 'Mastercard', 'American Express'].includes(receipt.brand)
    || !/^\d{4}$/.test(receipt.last4)) throw new Error('Check your booking and saved card before continuing.');

  const { client, userId } = await getPaymentIdentity(receipt.ownerId, { isDemo, create: true });
  // Only demo display fields. Never accept Paid status, PAN, CVV, or an arbitrary owner.
  const input = {
    user_id: userId, reference: receipt.reference, counterparty_name: receipt.tutorName,
    amount: receipt.amount, currency: receipt.currency, subject: receipt.subject,
    session_date: receipt.sessionDate, session_time: receipt.time,
    card_brand: receipt.brand, card_last4: receipt.last4,
  };
  let { data, error } = await client.from('demo_payments').insert(input).select(columns).single();
  if (error?.code === '23505') {
    // A response may be lost after committing. Reuse that exact owner's reference.
    const existing = await client.from('demo_payments').select(columns)
      .eq('user_id', userId).eq('reference', receipt.reference).single();
    data = existing.data;
    error = existing.error;
  }
  if (error) throw saveError(error);
  verifyRecord(data, userId);
  for (const [key, value] of Object.entries(input)) {
    if ((key === 'amount' ? Number(data[key]) : data[key]) !== value)
      throw new Error('Your payment history could not be confirmed as saved. Please try again.');
  }
  return data;
}

export async function getDemoPaymentHistory(userId, { isDemo = false, signal } = {}) {
  checkCancelled(signal);
  const identity = await getPaymentIdentity(userId, { isDemo });
  checkCancelled(signal);
  if (!identity) return [];
  const records = [];
  for (let offset = 0; ; offset += 200) {
    let query = identity.client.from('demo_payments').select(columns)
      .eq('user_id', identity.userId).order('occurred_at', { ascending: false })
      .order('id', { ascending: false }).range(offset, offset + 199);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    checkCancelled(signal);
    // Older installations still display real payment history before this migration.
    if (missingTable(error)) return [];
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Invalid demo payment history response.');
    for (const row of data) {
      verifyRecord(row, identity.userId);
      records.push({
        id: `demo:${row.id}`, name: row.counterparty_name, amount: Number(row.amount),
        currency: row.currency, occurredAt: row.occurred_at, direction: 'Sent', status: 'Demo',
        avatarUrl: null, reference: row.reference, subject: row.subject,
        cardLast4: row.card_last4, cardBrand: row.card_brand,
      });
    }
    if (data.length < 200) return records;
  }
}
