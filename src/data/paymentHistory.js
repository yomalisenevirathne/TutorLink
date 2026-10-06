const timeZone = 'Asia/Colombo';

export function mapPaymentRecord(record) {
  const amount = Number(record.amount);
  if (!record.id || !record.counterparty_name?.trim()
    || !['Sent', 'Received'].includes(record.direction)
    || !['Paid', 'Pending', 'Refunded'].includes(record.status)
    || !Number.isFinite(amount) || amount <= 0
    || !/^[A-Z]{3}$/.test(record.currency)
    || !Number.isFinite(Date.parse(record.occurred_at))) {
    throw new Error('The payment history contains an invalid record.');
  }

  return {
    id: record.id,
    name: record.counterparty_name.trim(),
    occurredAt: record.occurred_at,
    amount,
    currency: record.currency,
    direction: record.direction,
    status: record.status,
    avatarUrl: record.counterparty_avatar_url || null,
  };
}

export function formatPaymentAmount(payment) {
  return `${payment.currency} ${payment.amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPaymentDate(occurredAt) {
  const date = new Date(occurredAt);
  const day = date.toLocaleDateString('en-GB', { timeZone }).replace(/\//g, '.');
  const time = date.toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day}  ${time}`;
}

export function paymentMonth(occurredAt) {
  const date = new Date(occurredAt);
  const month = date.toLocaleDateString('en-GB', { timeZone, month: 'long' });
  const year = date.toLocaleDateString('en-GB', { timeZone, year: 'numeric' });
  return `${month} - ${year}`;
}

export function getPaymentSections(payments, search = '', status = 'All') {
  const query = search.trim().toLowerCase();
  const groups = new Map();

  [...payments]
    .filter((payment) => {
      const matchesSearch = `${payment.name} ${formatPaymentAmount(payment)} ${formatPaymentDate(payment.occurredAt)} ${payment.status}`.toLowerCase().includes(query);
      return matchesSearch && (status === 'All' || payment.status === status);
    })
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .forEach((payment) => {
      const title = paymentMonth(payment.occurredAt);
      const group = groups.get(title) || [];
      group.push(payment);
      groups.set(title, group);
    });

  return Array.from(groups, ([title, data]) => ({ key: title, title, data }));
}
