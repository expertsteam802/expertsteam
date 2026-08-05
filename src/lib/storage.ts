import { supabase } from '@/lib/supabase';
import { FileObject, StorageError } from '@supabase/supabase-js';

/**
 * Upload a file to Supabase storage.
 * Shows upload progress via a callback.
 */
export const uploadFile = async (
  file: File,
  bucket = 'uploads',
  onProgress?: (percent: number) => void
): Promise<{ publicUrl: string; error?: StorageError }> => {
  // Validate size (200 MiB limit)
  const MAX_SIZE = 200 * 1024 * 1024; // 200 MB
  if (file.size > MAX_SIZE) {
    return { publicUrl: '', error: new Error('File exceeds 200 MiB limit') as any };
  }

  const filePath = `${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      upsert: false,
      cacheControl: '3600',
      // @ts-ignore – onUploadProgress not typed yet in supabase-js
      onUploadProgress: (event: { loaded: number; total: number }) => {
        if (onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      },
    });

  if (error) return { publicUrl: '', error };

  const { publicUrl } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { publicUrl };
};
