-- ============================================================
-- 암호 없는 공개 접근으로 전환하는 마이그레이션
-- (기존 '디지털기술입문' 게시판 DB를 그대로 쓰면서 전환할 때 실행)
--
-- Supabase 대시보드 > SQL Editor 에 아래 전체를 붙여넣고 [Run] 하세요.
-- 학생 제출물(posts/attachments)은 그대로 보존됩니다.
-- ============================================================

-- 1) 학생 암호 컬럼 제거 (더 이상 사용하지 않음)
alter table public.students
  drop column if exists password;

-- 2) 회차별 "암호 필요" 설정 제거 → 모든 회차가 누구나 접근 가능
alter table public.sessions
  drop column if exists require_password;

-- 3) 마스터 암호 설정값 제거 (교수 로그인 암호 2개는 그대로 유지)
delete from public.app_settings where key = 'master_password';

-- 4) app_settings 테이블이 아직 없다면 생성 (교수 로그인 암호 저장용)
create table if not exists public.app_settings (
  key   text primary key,
  value text
);
alter table public.app_settings enable row level security;
-- (정책 없음 → service_role 키로만 접근)
