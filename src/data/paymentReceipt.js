import { formatPaymentAmount } from './paymentHistory';

export function createDemoPaymentReceipt(booking, card, ownerId, now = new Date()) {
  if (!ownerId || !booking || !Number.isFinite(booking.total) || booking.total <= 0
    || !card?.id || !card.brand?.trim() || !/^\d{4}$/.test(card.last4)) {
    throw new Error('Choose a booking and a saved card before continuing.');
  }
  const date = new Date(booking.year, booking.month, booking.date);
  if (!Number.isInteger(booking.year) || !Number.isInteger(booking.month) || !Number.isInteger(booking.date)
    || date.getFullYear() !== booking.year || date.getMonth() !== booking.month || date.getDate() !== booking.date
    || !booking.slot?.trim() || !booking.tutorName?.trim() || !booking.subject?.trim()) {
    throw new Error('Check your booking details before continuing.');
  }
  // Snapshot the reservation and masked method before saving the confirmation.
  // Card charging is separate from this prototype confirmation.
  return {
    isDemo: true,
    ownerId,
    reference: `DEMO-${now.getTime().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    amount: booking.total,
    currency: 'LKR',
    tutorName: booking.tutorName.trim(),
    subject: booking.subject.trim(),
    sessionDate: `${booking.year}-${String(booking.month + 1).padStart(2, '0')}-${String(booking.date).padStart(2, '0')}`,
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: booking.slot.trim(),
    brand: card.brand.trim(),
    last4: card.last4,
    ...(booking.bookerName ? {
      cardId: card.id,
      bookerName: booking.bookerName.trim(),
      tutorId: booking.tutorId || null,
      tutorPhotoUrl: booking.tutorPhotoUrl || null,
      booking: {
        year: booking.year, month: booking.month, date: booking.date, slot: booking.slot.trim(),
        tutorName: booking.tutorName.trim(), subject: booking.subject.trim(),
        tutorId: booking.tutorId || null, bookerName: booking.bookerName.trim(),
        mode: booking.mode || 'physical', groupSize: booking.groupSize || 'small',
        sessionFee: booking.sessionFee, platformFee: booking.platformFee,
        total: booking.total, rescheduleId: booking.rescheduleId || null,
      },
    } : {}),
  };
}

export function receiptRows(receipt) {
  return [
    ['Transaction ID', receipt.reference],
    ...(receipt.bookerName ? [['Booked by', receipt.bookerName]] : []),
    ...(receipt.bookingId ? [['Booking ID', receipt.bookingId]] : []),
    ['Date', receipt.date],
    ['Time', receipt.time],
    ['Subject', receipt.subject],
    ['Method', `${receipt.brand} ••• ${receipt.last4}`],
  ];
}

export function receiptShareText(receipt) {
  return [
    'TutorLink — Demo Payment Confirmed',
    formatPaymentAmount(receipt),
    `Tutor: ${receipt.tutorName}`,
    ...receiptRows(receipt).map(([label, value]) => `${label}: ${value}`),
    receipt.bookingId ? 'No money was charged. The session booking was recorded.'
      : 'Demo only. No money was charged and no booking was created.',
  ].join('\n');
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

export function receiptHtml(receipt) {
  return `<!doctype html><html><head><meta charset="utf-8" />
    <title>TutorLink ${escapeHtml(receipt.reference)}</title>
    <style>
      @page { size: A4; margin: 25mm; }
      body { font-family: Arial, sans-serif; color: #111; max-width: 560px; margin: 30px auto; }
      h1 { color: #6A1B9A; } h2 { text-align: center; }
      .success { color: #19c763; text-align: center; font-weight: bold; }
      .note { background: #f6f0ff; padding: 14px; color: #572883; line-height: 1.6; }
      table { width: 100%; border-collapse: collapse; margin: 28px 0; }
      th, td { padding: 14px 0; border-bottom: 1px dashed #ddd; text-align: left; vertical-align: top; }
      td { text-align: right; padding-left: 20px; }
    </style></head><body>
    <h1>TutorLink</h1><h2>${escapeHtml(formatPaymentAmount(receipt))}</h2>
    <p class="success">Demo Payment Confirmed</p>
    <p>Tutor: ${escapeHtml(receipt.tutorName)}</p>
    <table>${receiptRows(receipt).map(([label, value]) =>
      `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('')}</table>
    <p class="note">${receipt.bookingId ? 'No money was charged. The session booking was recorded.'
      : 'Demo only. No money was charged and no booking was created.'}
      This receipt is a preview, not proof of payment.</p>
    </body></html>`;
}
