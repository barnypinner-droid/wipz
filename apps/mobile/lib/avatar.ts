import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

// Lets the user pick a photo and uploads it to their own folder in the
// avatars bucket (storage policies only allow writing under your own
// user id), then points their profile at the new file. Returns the
// public URL, or null if they cancelled the picker.
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission was not granted.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
  });

  const asset = result.assets?.[0];
  if (result.canceled || !asset?.base64) return null;
  const base64 = asset.base64;

  const ext = asset.uri.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, decode(base64), { contentType, upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-bust so the new photo shows immediately instead of a stale one
  // the device already cached at the same URL.
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', userId);
  if (updateError) throw updateError;

  return publicUrl;
}
