# 군사실무VIII 바이브코딩 제출 게시판

건양대학교 **군사실무VIII(군사학세미나) 바이브코딩** 수업의 학생들이 매 수업(주차)마다
실습·과제 결과물을 올릴 수 있는 온라인 제출 게시판입니다.

## 목적
- 수업 회차(주차)별로 학생들이 결과물(설명·이미지·파일·링크)을 제출
- **암호 없이** 학번순 명단에서 본인 이름 박스를 클릭하면 바로 제출 가능
- 학생은 본인이 올린 결과물을 언제든 수정·삭제 가능
- 교수는 학생 명단과 수업 회차를 관리하고 제출 현황을 한눈에 확인

## 접근 방식
| 대상 | 접근 |
|------|------|
| 학생 게시판 (`/`, `/session/...`) | 🔓 누구나, 암호 없음 |
| 교수 관리 (`/admin`) | 🔒 교수 암호 필요 |

## 기술 스택
Next.js (App Router) · React · Tailwind CSS · Supabase (DB + Storage) · Vercel

## 설치
1. `.env.local.example` 을 `.env.local` 로 복사하고 값을 채웁니다.
2. Supabase SQL Editor 에서 `supabase/schema.sql` 을 실행합니다.
   (기존 암호 방식 DB에서 전환하는 경우엔 `supabase/migration-open-access.sql`)
3. `npm install && npm run dev`
