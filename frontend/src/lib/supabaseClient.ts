import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase chưa được cấu hình — thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY trong .env.local. ' +
    'Xem backend/README.md để lấy giá trị từ dashboard Supabase.'
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '');
