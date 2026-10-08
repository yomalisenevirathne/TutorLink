import { getPaymentIdentity } from './paymentIdentity';
import { getCardUpdateMetadata } from '../data/cardForm';

function checkCancelled(signal) {
  if (signal?.aborted) {
    const error = new Error('Saved card request cancelled.');
    error.name = 'AbortError';
    throw error;
  }
}

export async function getSavedPaymentMethods(userId, { signal, isDemo = false } = {}) {
  checkCancelled(signal);
  const identity = await getPaymentIdentity(userId, { isDemo });
  checkCancelled(signal);
  if (!identity) return [];
  const { client, userId: ownerId } = identity;

  // These masked details are display metadata, not a chargeable payment token.
  let query = client.from('payment_methods')
    .select('id, user_id, brand, last4, exp_month, exp_year, is_default')
    .eq('user_id', ownerId)
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
    if (card.user_id !== ownerId || !card.id || !card.brand?.trim()
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

export async function savePaymentMethod(userId, metadata, { isDemo = false } = {}) {
  const name = String(metadata.cardholder_name || '').trim();
  const month = Number(metadata.exp_month);
  const year = Number(metadata.exp_year);
  if (!['Visa', 'Mastercard', 'American Express'].includes(metadata.brand)
    || typeof metadata.last4 !== 'string' || !/^\d{4}$/.test(metadata.last4)
    || !Number.isInteger(month) || month < 1 || month > 12
    || !Number.isInteger(year) || year < 2000 || year > 9999
    || name.length < 2 || name.length > 80) throw new Error('Check the card details and try again.');

  const { client, userId: ownerId } = await getPaymentIdentity(userId, { isDemo, create: true });

  // Explicit whitelist: never submit a full number, CVV, client-selected owner or token.
  const { data, error } = await client.from('payment_methods').insert({
    user_id: ownerId,
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
  if (!data?.id || data.user_id !== ownerId || data.last4 !== metadata.last4)
    throw new Error('Your card could not be confirmed as saved. Please try again.');
  return { id: data.id, brand: data.brand, last4: data.last4,
    expiry: `${String(data.exp_month).padStart(2, '0')}/${String(data.exp_year).slice(-2)}` };
}

export function savedCardsErrorMessage(error) {
  if (error.code === 'DEMO_AUTH_DISABLED' || error.code === 'DEMO_AUTH_UNAVAILABLE') return error.message;
  if (error.code === 'AUTH_REQUIRED' || error.status === 401 || error.name === 'AuthSessionMissingError')
    return 'Please sign in again to view your saved cards.';
  return "We couldn't load your saved cards. Please try again.";
}

const detailsColumns = 'id, user_id, brand, last4, exp_month, exp_year, cardholder_name';

async function cardIdentity(userId, cardId, isDemo) {
  if (!cardId || typeof cardId !== 'string') throw new Error('Choose a saved card first.');
  const identity = await getPaymentIdentity(userId, { isDemo });
  if (!identity) {
    const required = new Error('Please sign in again to manage your saved cards.');
    required.code = 'AUTH_REQUIRED';
    throw required;
  }
  return identity;
}

function cardManagementError(error) {
  if (['42501', 'PGRST205', '42P01', '42703', 'PGRST204'].includes(error?.code)) {
    const unavailable = new Error('Card editing or removal is not enabled yet. Please complete the card-management setup.');
    unavailable.code = 'CARD_MANAGEMENT_UNAVAILABLE';
    return unavailable;
  }
  return new Error('Your card could not be changed. Please refresh and try again.');
}

function cardDetails(record, ownerId, cardId) {
  if (!record || record.id !== cardId || record.user_id !== ownerId
    || !['Visa', 'Mastercard', 'American Express'].includes(record.brand) || !/^\d{4}$/.test(record.last4)
    || !Number.isInteger(record.exp_month) || record.exp_month < 1 || record.exp_month > 12
    || !Number.isInteger(record.exp_year) || record.exp_year < 2000 || record.exp_year > 9999) {
    throw new Error('Your saved card could not be verified. Please refresh and try again.');
  }
  return { id: record.id, brand: record.brand, last4: record.last4,
    expiry: `${String(record.exp_month).padStart(2, '0')}/${String(record.exp_year).slice(-2)}`,
    cardholderName: record.cardholder_name || '' };
}

export async function getPaymentMethodDetails(userId, cardId, { isDemo = false, signal } = {}) {
  checkCancelled(signal);
  const { client, userId: ownerId } = await cardIdentity(userId, cardId, isDemo);
  checkCancelled(signal);
  let query = client.from('payment_methods').select(detailsColumns).eq('id', cardId).eq('user_id', ownerId);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.single();
  checkCancelled(signal);
  if (error) throw cardManagementError(error);
  return cardDetails(data, ownerId, cardId);
}

export async function updatePaymentMethod(userId, cardId, metadata, { isDemo = false } = {}) {
  const changes = getCardUpdateMetadata({
    name: metadata.cardholder_name,
    expiry: `${String(metadata.exp_month).padStart(2, '0')}/${metadata.exp_year}`,
  });
  const { client, userId: ownerId } = await cardIdentity(userId, cardId, isDemo);
  // The original card number/brand/owner are immutable; edit only name and expiry.
  const { data, error } = await client.from('payment_methods').update(changes)
    .eq('id', cardId).eq('user_id', ownerId).select(detailsColumns).single();
  if (error) throw cardManagementError(error);
  const saved = cardDetails(data, ownerId, cardId);
  if (data.cardholder_name !== changes.cardholder_name || data.exp_month !== changes.exp_month || data.exp_year !== changes.exp_year)
    throw new Error('Your card changes could not be confirmed as saved. Please try again.');
  return saved;
}

export async function deletePaymentMethod(userId, cardId, { isDemo = false } = {}) {
  const { client, userId: ownerId } = await cardIdentity(userId, cardId, isDemo);
  const { data, error } = await client.from('payment_methods').delete()
    .eq('id', cardId).eq('user_id', ownerId).select('id, user_id');
  if (error) throw cardManagementError(error);
  if (!Array.isArray(data) || data.length !== 1 || data[0].id !== cardId || data[0].user_id !== ownerId)
    throw new Error('Your card could not be confirmed as removed. Please refresh and try again.');
  return { id: cardId };
}
