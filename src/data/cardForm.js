export function getCardMetadata(form, now = new Date()) {
  const number = String(form.number || '').replace(/[\s-]/g, '');
  let brand;
  if (/^4\d{12}(\d{3})?(\d{3})?$/.test(number)) brand = 'Visa';
  else if (/^3[47]\d{13}$/.test(number)) brand = 'American Express';
  else if (/^\d{16}$/.test(number) && (/^5[1-5]/.test(number)
    || (Number(number.slice(0, 4)) >= 2221 && Number(number.slice(0, 4)) <= 2720))) brand = 'Mastercard';
  else throw new Error('Enter a valid Visa, Mastercard or American Express card number.');

  let checksum = 0;
  for (let index = number.length - 1, double = false; index >= 0; index--, double = !double) {
    let digit = Number(number[index]);
    if (double) { digit *= 2; if (digit > 9) digit -= 9; }
    checksum += digit;
  }
  if (checksum % 10 !== 0) throw new Error('Check your card number and try again.');

  const expiry = String(form.expiry || '').match(/^\s*(0[1-9]|1[0-2])\s*\/\s*(\d{2}|\d{4})\s*$/);
  if (!expiry) throw new Error('Enter the expiry date as MM / YY.');
  const month = Number(expiry[1]);
  const year = expiry[2].length === 2 ? 2000 + Number(expiry[2]) : Number(expiry[2]);
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1))
    throw new Error('This card has expired. Please use another card.');
  if (year > now.getFullYear() + 25) throw new Error('Check the expiry year.');
  const cvvLength = brand === 'American Express' ? 4 : 3;
  if (!new RegExp(`^\\d{${cvvLength}}$`).test(String(form.cvv || '')))
    throw new Error(`Enter the ${cvvLength}-digit security code.`);
  const name = String(form.name || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) throw new Error('Enter the cardholder name (2–80 characters).');
  if (!form.saveForFuture) throw new Error('Select “Save this card for future payments” to save it.');

  // PAN and CVV never leave the form. These are display details, not a chargeable token.
  return { brand, last4: number.slice(-4), exp_month: month, exp_year: year, cardholder_name: name };
}

export function formatCardNumber(value) {
  return value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}

export function formatCardExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
}
