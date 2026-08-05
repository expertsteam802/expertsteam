import { supabase } from '@/lib/supabase';

/**
 * Get a setting value by key.
 */
export const getSetting = async (key: string): Promise<string | null> => {
  const { data, error } = await supabase.from('settings').select('value').eq('key', key).single();
  if (error) {
    console.error('Error fetching setting', key, error);
    return null;
  }
  return data?.value ?? null;
};

/**
 * Upsert a setting (insert or update).
 */
export const setSetting = async (key: string, value: string) => {
  const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
};
