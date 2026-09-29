import { createClient } from '@supabase/supabase-js';

function getValidSupabaseUrl(url?: string): string {
  if (!url || typeof url !== 'string') {
    return 'https://placeholder-wcs.supabase.co';
  }

  // Strip accidental brackets, quotes, or whitespace often copied from docs/web interfaces
  let sanitized = url.trim().replace(/^[<"'\s]+|[>"'\s]+$/g, '');

  // If user enters "xyz.supabase.co" without https://
  if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
    sanitized = `https://${sanitized}`;
  }

  try {
    const parsed = new URL(sanitized);
    // Ensure it has a valid hostname (not placeholder brackets)
    if (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.hostname &&
      !parsed.hostname.includes('<') &&
      !parsed.hostname.includes('>')
    ) {
      // Always return origin (e.g. 'https://xyz.supabase.co') to strip trailing '/rest/v1' or extra paths
      return parsed.origin;
    }
  } catch {
    // In case of invalid URL string, return safe placeholder
  }

  return 'https://placeholder-wcs.supabase.co';
}

function getValidSupabaseKey(key?: string): string {
  if (!key || typeof key !== 'string') {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder-anon-key';
  }

  const sanitized = key.trim().replace(/^[<"'\s]+|[>"'\s]+$/g, '');
  return sanitized.length > 20 ? sanitized : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder-anon-key';
}

const supabaseUrl = getValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = getValidSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
