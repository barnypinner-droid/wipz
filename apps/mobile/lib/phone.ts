// Rough phone-number normalization to E.164, defaulting to a UK country
// code. Contacts store numbers in all sorts of formats ("07123 456789",
// "(0712) 345-6789"); the rest of the app (whatsapp_phone matching, SMS
// deep links) expects a consistent "+447123456789"-style value.
export function normalizePhone(raw: string, defaultCountryCode = '44'): string {
  const digitsAndPlus = raw.replace(/[^\d+]/g, '');

  if (digitsAndPlus.startsWith('+')) {
    return digitsAndPlus;
  }
  if (digitsAndPlus.startsWith('00')) {
    return `+${digitsAndPlus.slice(2)}`;
  }
  if (digitsAndPlus.startsWith('0')) {
    return `+${defaultCountryCode}${digitsAndPlus.slice(1)}`;
  }
  return `+${digitsAndPlus}`;
}
