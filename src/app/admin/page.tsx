import { supabaseServer } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import {
  adminLoginAction,
  adminLogoutAction,
  saveStudentsAction,
  saveSettingsAction,
  addSessionAction,
  deleteSessionAction,
  toggleSessionOpenAction,
} from "@/lib/actions";
import type { Session, Student } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const admin = await isAdmin();

  if (!admin) {
    return (
      <div className="mx-auto max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">교수 관리 로그인</h1>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            비밀번호가 올바르지 않습니다.
          </p>
        )}
        <form
          action={adminLoginAction}
          className="space-y-3 rounded-xl border bg-white p-6 shadow-sm"
        >
          <input
            name="password"
            type="password"
            required
            placeholder="관리자 비밀번호"
            className="w-full rounded-lg border px-3 py-2"
          />
          <button className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700">
            로그인
          </button>
        </form>
      </div>
    );
  }

  const sb = supabaseServer();
  const [{ data: students }, { data: sessions }, settings] = await Promise.all([
    sb.from("students").select("*").order("sort_order", { ascending: true }),
    sb.from("sessions").select("*").order("week", { ascending: true }),
    getSettings(),
  ]);
  const roster = (students ?? []) as Student[];
  const sessionList = (sessions ?? []) as Session[];
  const rosterText = roster
    .map((s) => `${s.student_no}, ${s.name}`)
    .join("\n");

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">교수 관리</h1>
        <form action={adminLogoutAction}>
          <button className="text-sm text-slate-500 hover:underline">
            로그아웃
          </button>
        </form>
      </div>

      <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        🔓 학생 게시판은 <b>암호 없이 누구나</b> 접근할 수 있습니다. 학생은 회차
        화면에서 본인 이름 박스를 누르면 바로 결과물을 올리고, 수정·삭제할 수
        있습니다. 암호는 이 <b>교수 관리 페이지</b>에만 적용됩니다.
      </p>

      {/* 교수 로그인 암호 */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">교수 로그인 암호</h2>
        <p className="mb-3 text-sm text-slate-500">
          2개까지 지정할 수 있고 둘 중 아무거나 로그인에 사용됩니다.
        </p>
        <form action={saveSettingsAction} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">교수 암호 1</label>
            <input
              name="admin_password_1"
              type="text"
              defaultValue={settings.admin_password_1 ?? ""}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">교수 암호 2</label>
            <input
              name="admin_password_2"
              type="text"
              defaultValue={settings.admin_password_2 ?? ""}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 sm:col-span-2 sm:w-fit">
            암호 저장
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          ※ 교수 암호를 모두 비워도, .env 의 비상용 백업 암호로는 로그인할 수
          있습니다.
        </p>
      </section>

      {/* 학생 명단 */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">
          학생 명단 ({roster.length}명)
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          한 줄에 한 명씩{" "}
          <code className="rounded bg-slate-100 px-1">학번, 성명</code> 형식으로
          입력하세요. (엑셀에서 2열로 복사·붙여넣기 가능)
        </p>
        <form action={saveStudentsAction} className="space-y-3">
          <textarea
            name="roster"
            rows={12}
            defaultValue={rosterText}
            placeholder={"20250001, 홍길동\n20250002, 김철수"}
            className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
          />
          <button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
            명단 저장
          </button>
        </form>
      </section>

      {/* 수업 회차 */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">수업 회차</h2>

        <form action={addSessionAction} className="mb-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[80px_1fr_140px_auto]">
            <input
              name="week"
              type="number"
              placeholder="주차"
              className="rounded-lg border px-3 py-2"
            />
            <input
              name="title"
              required
              placeholder="제목 (예: 바이브코딩 실습)"
              className="rounded-lg border px-3 py-2"
            />
            <input
              name="lesson_date"
              type="date"
              className="rounded-lg border px-3 py-2"
            />
            <button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
              회차 추가
            </button>
          </div>
          <textarea
            name="description"
            rows={2}
            placeholder="과제 설명 (선택)"
            className="w-full rounded-lg border px-3 py-2"
          />
        </form>

        {sessionList.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 회차가 없습니다.</p>
        ) : (
          <ul className="divide-y">
            {sessionList.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span className="text-sm">
                  {s.week != null && (
                    <b className="text-blue-600">{s.week}주차 </b>
                  )}
                  {s.title}
                  {s.lesson_date && (
                    <span className="text-slate-400"> · {s.lesson_date}</span>
                  )}
                  {!s.is_open && (
                    <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                      마감
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <form action={toggleSessionOpenAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      type="hidden"
                      name="is_open"
                      value={s.is_open ? "false" : "true"}
                    />
                    <button className="text-xs text-slate-500 hover:underline">
                      {s.is_open ? "마감하기" : "다시 열기"}
                    </button>
                  </form>
                  <form action={deleteSessionAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="text-xs text-red-500 hover:underline">
                      삭제
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
