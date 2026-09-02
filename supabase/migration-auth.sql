-- ============================================================
-- 암호 기능 추가 마이그레이션
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- ============================================================

-- 학생별 암호
alter table public.students
  add column if not exists password text;

-- 회차별 접근 방식 (true=암호 필요, false=누구나 가능)
alter table public.sessions
  add column if not exists require_password boolean default true;

-- 앱 전역 설정 (마스터 암호, 교수 암호 2개 등)
create table if not exists public.app_settings (
  key   text primary key,
  value text
);
alter table public.app_settings enable row level security;
-- (정책 없음 → service_role 키로만 접근)
