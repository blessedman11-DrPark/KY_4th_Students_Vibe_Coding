import { cookies } from "next/headers";

const ADMIN = "admin_auth";
// v2 접미사: 예전 쿠키(무한 프리패스)를 무효화하기 위해 이름 변경
const UNLOCK = "su_v2"; // 콤마로 구분된 인증된 학생 ID 목록
const MASTER = "mu_v2"; // 마스터 암호 인증
const FREEPASS = "fp_v2"; // 12시간 프리패스 표시

const TWELVE_H = 60 * 60 * 12;
const SHORT = 60 * 5; // 프리패스 미사용 시 유지 시간(5분)

const opts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

// ── 교수(관리자) ──────────────────────────────────────────
export async function setAdmin() {
  (await cookies()).set(ADMIN, "ok", { ...opts, maxAge: 60 * 60 * 8 });
}
export async function logoutAdmin() {
  (await cookies()).delete(ADMIN);
}
export async function isAdmin(): Promise<boolean> {
  return (await cookies()).get(ADMIN)?.value === "ok";
}

// ── 학생 암호 인증 상태(쿠키) ─────────────────────────────
// persist=true → 12시간 프리패스, false → 5분 후 만료(그리고 작업하면 소진)
export async function unlockStudentCookie(id: string, persist: boolean) {
  const store = await cookies();
  const cur = (store.get(UNLOCK)?.value ?? "").split(",").filter(Boolean);
  if (!cur.includes(id)) cur.push(id);
  store.set(UNLOCK, cur.join(","), {
    ...opts,
    maxAge: persist ? TWELVE_H : SHORT,
  });
  if (persist) store.set(FREEPASS, "ok", { ...opts, maxAge: TWELVE_H });
}
export async function setMasterUnlock(persist: boolean) {
  const store = await cookies();
  store.set(MASTER, "ok", { ...opts, maxAge: persist ? TWELVE_H : SHORT });
  if (persist) store.set(FREEPASS, "ok", { ...opts, maxAge: TWELVE_H });
}
export async function isStudentUnlocked(id: string): Promise<boolean> {
  const store = await cookies();
  if (store.get(MASTER)?.value === "ok") return true;
  const cur = (store.get(UNLOCK)?.value ?? "").split(",").filter(Boolean);
  return cur.includes(id);
}
export async function isFreepass(): Promise<boolean> {
  return (await cookies()).get(FREEPASS)?.value === "ok";
}
// 프리패스가 아닐 때 작업 후 인증 상태를 소진(다음엔 다시 암호 요구)
export async function clearStudentUnlock() {
  const store = await cookies();
  store.delete(UNLOCK);
  store.delete(MASTER);
}

// 해당 학생으로 제출/수정/삭제할 권한이 있는가
// (암호불필요 회차 / 마스터 또는 본인 암호 인증)
// ※ 교수 로그인 상태여도 학생 게시판은 암호를 요구함(마스터 암호로 통과 가능)
export async function authorizedForStudent(
  requirePassword: boolean,
  studentId: string | null
): Promise<boolean> {
  if (!requirePassword) return true;
  if (!studentId) return false;
  return isStudentUnlocked(studentId);
}
