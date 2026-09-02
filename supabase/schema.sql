-- ============================================================
-- 디지털기술입문 학생 제출 게시판 - Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- ============================================================

-- 확장 (UUID 생성용)
create extension if not exists "pgcrypto";

-- 학생 명단 -------------------------------------------------
create table if not exists public.students (
  id          uuid primary key default gen_random_uuid(),
  student_no  text not null,                 -- 학번
  name        text not null,                 -- 이름
  sort_order  int  default 0,                -- 명단 정렬용
  created_at  timestamptz default now()
);

-- 수업 회차(주차) ------------------------------------------
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  week        int,                           -- 주차/차시
  title       text not null,                 -- 예: "3주차 - HTML 실습"
  lesson_date date,                          -- 수업 일자
  description text,                          -- 과제 설명
  is_open     boolean default true,          -- 제출 가능 여부
  created_at  timestamptz default now()
);

-- 게시글(제출물) -------------------------------------------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.sessions(id) on delete cascade,
  student_id  uuid references public.students(id) on delete set null,
  title       text not null,
  content     text,
  link_url    text,                          -- 외부 링크(GitHub 등)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 첨부파일 (Supabase Storage 파일 참조) --------------------
create table if not exists public.attachments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references public.posts(id) on delete cascade,
  file_path   text not null,                 -- storage 내부 경로
  file_name   text,
  file_type   text,
  created_at  timestamptz default now()
);

create index if not exists idx_posts_session on public.posts(session_id);
create index if not exists idx_attachments_post on public.attachments(post_id);

-- RLS: 모든 접근은 서버(서비스 키)에서만 → 테이블 잠금 --------
alter table public.students    enable row level security;
alter table public.sessions    enable row level security;
alter table public.posts       enable row level security;
alter table public.attachments enable row level security;
-- (정책을 만들지 않음 → anon/public 키로는 접근 불가, service_role 키만 통과)

-- Storage 버킷 (공개 읽기) ---------------------------------
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', true)
on conflict (id) do nothing;
