import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { supabase } from '../utils/supabase';

export async function uploadQualificationDocument(userId, document) {
  const bucket = process.env.EXPO_PUBLIC_QUALIFICATION_BUCKET?.trim();
  if (!bucket) throw new Error('Qualification upload storage has not been configured. Use the existing bucket supplied by the profile feature owner.');
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!userId || data?.user?.id !== userId) throw new Error('Sign in to upload your qualification document.');
  if (!document?.uri || !document.name) throw new Error('Choose a qualification document first.');
  const content = Platform.OS === 'web'
    ? await (await fetch(document.uri)).arrayBuffer()
    : await new File(document.uri).arrayBuffer();
  if (!content.byteLength || content.byteLength > 10 * 1024 * 1024) throw new Error('Choose a document smaller than 10 MB.');
  const name = document.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`;
  const result = await supabase.storage.from(bucket).upload(path, content, {
    contentType: document.mimeType || 'application/octet-stream', upsert: false,
  });
  if (result.error) throw new Error(`Document upload failed: ${result.error.message}`);
  return { path, bucket };
}
