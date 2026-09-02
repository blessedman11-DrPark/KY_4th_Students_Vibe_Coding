import { cookies } from "next/headers";

// 학생 게시판은 암호 없이 누구나 접근·제출할 수 있다.
// 쿠키 인증은 교수(관리자) 페이지에만 사용한다.
const ADMIN = "admin_auth";

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
