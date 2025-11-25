import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 빌드 타임에는 에러를 던지지 않음 (런타임에서 체크)
// Railway/Vercel 등에서 빌드 시 환경 변수가 로드되지 않을 수 있음
function getSupabaseConfig() {
  const url = supabaseUrl || '';
  const anonKey = supabaseAnonKey || '';
  
  // 런타임에서만 에러 체크 (실제 요청 시점)
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
    // 서버 사이드 런타임에서만 체크
    if (!url || !anonKey) {
      console.error('⚠️ Missing Supabase environment variables');
    }
  }
  
  return {
    url: url || 'https://placeholder.supabase.co',
    anonKey: anonKey || 'placeholder-key',
    serviceRoleKey: serviceRoleKey || anonKey || 'placeholder-key',
  };
}

const config = getSupabaseConfig();

export const supabase = createClient(config.url, config.anonKey);

// Server-side Supabase client (uses service role key for admin operations)
export const supabaseAdmin = createClient(config.url, config.serviceRoleKey);

