import { getPaymentIdentity } from './paymentIdentity';

const columns = '*';
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
  if (missingTable(error) || ['42703', 'PGRST204', 'PGRST202', '42883'].includes(error?.code)) {
    const unavailable = new Error('Booking payment storage needs an update. Run supabase_booking_payments.sql in your Supabase SQL Editor.');
    unavailable.code = 'DEMO_PAYMENT_STORAGE_UNAVAILABLE';
    return unavailable;
  }
  if (error?.code === 'P0001' && error.message) return new Error(error.message);
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
  if (receipt.booking) {
    const { data, error } = await client.rpc('record_booking_payment', {
      p_reference: receipt.reference, p_card_id: receipt.cardId, p_booking: receipt.booking,
    });
    if (error) throw saveError(error);
    const saved = data?.payment;
    verifyRecord(saved, userId);
    for (const [key, value] of Object.entries(input)) {
      if ((key === 'amount' ? Number(saved[key]) : saved[key]) !== value)
        throw new Error('The saved payment does not match your booking. Please try again.');
    }
    if (!data.booking?.id || data.booking.id !== saved.booking_id
      || data.booking.student_id !== userId || data.booking.tutor_name !== saved.counterparty_name
      || data.booking.subject !== saved.subject || !saved.booker_name?.trim()
      || Number(data.booking.total_fee) !== receipt.amount || data.booking.slot !== receipt.time
      || data.booking.session_date !== receipt.sessionDate || data.booking.status !== 'Confirmed'
      || (receipt.tutorId && saved.tutor_id !== receipt.tutorId)) {
      throw new Error('Your booking and payment could not be confirmed together. Please try again.');
    }
    return { ...saved, booking: { ...data.booking, month: Number(data.booking.month) - 1 } };
  }
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
        avatarUrl: row.counterparty_avatar_url || null, reference: row.reference, subject: row.subject,
        bookerName: row.booker_name || null, tutorId: row.tutor_id || null,
        bookingId: row.booking_id || null, sessionDate: row.session_date, sessionTime: row.session_time,
        cardLast4: row.card_last4, cardBrand: row.card_brand,
      });
    }
    if (data.length < 200) return records;
  }
}
