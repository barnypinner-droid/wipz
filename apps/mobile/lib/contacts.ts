import { Contact, requestPermissionsAsync } from 'expo-contacts';
import { normalizePhone } from './phone';

export type PickedContact = { name: string; phone: string };

// Opens the OS's own native contact picker (with search built in) rather
// than us building and maintaining a custom searchable list.
export async function pickContactPhone(): Promise<PickedContact | null> {
  const permission = await requestPermissionsAsync();
  if (permission.accessPrivileges === 'none') {
    throw new Error('Contacts permission was not granted.');
  }

  const contact = await Contact.presentPicker();
  if (!contact) return null;

  const [fullName, phones] = await Promise.all([contact.getFullName(), contact.getPhones()]);
  const rawPhone = phones[0]?.number;
  if (!rawPhone) {
    throw new Error(`${fullName || 'That contact'} has no phone number saved.`);
  }

  return { name: fullName || rawPhone, phone: normalizePhone(rawPhone) };
}
