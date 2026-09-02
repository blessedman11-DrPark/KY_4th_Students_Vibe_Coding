import { createClient } from "@supabase/supabase-js";

// 서버 전용 Supabase 클라이언트 (service_role 키 사용).
// 절대 클라이언트 컴포넌트에서 import 하지 마세요.
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase 환경변수가 없습니다. .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 설정하세요."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const BUCKET = "submissions";

// 공개 파일 URL 만들기
export function publicFileUrl(path: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
}
