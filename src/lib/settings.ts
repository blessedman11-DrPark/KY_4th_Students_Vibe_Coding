import { supabaseServer } from "./supabase";

// app_settings 테이블 (key/value)에서 앱 전역 설정을 읽고 쓴다.
export async function getSettings(): Promise<Record<string, string>> {
  const sb = supabaseServer();
  const { data } = await sb.from("app_settings").select("key, value");
  const out: Record<string, string> = {};
  for (const r of data ?? []) {
    if (r.value != null) out[r.key as string] = r.value as string;
  }
  return out;
}

export async function setSetting(key: string, value: string) {
  const sb = supabaseServer();
  await sb.from("app_settings").upsert({ key, value }, { onConflict: "key" });
}

// 교수 관리 로그인 암호 확인: .env 백업키 또는 DB에 저장된 2개 중 하나
export async function verifyAdminPassword(pw: string): Promise<boolean> {
  if (!pw) return false;
  const envPw = process.env.ADMIN_PASSWORD;
  if (envPw && pw === envPw) return true;
  const s = await getSettings();
  return (
    (!!s.admin_password_1 && pw === s.admin_password_1) ||
    (!!s.admin_password_2 && pw === s.admin_password_2)
  );
}
