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
    .map((s) => `${s.student_no}, ${s.name}, ${s.password ?? ""}`)
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

      {/* 암호 설정 */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">암호 설정</h2>
        <p className="mb-3 text-sm text-slate-500">
          <b>마스터 암호</b>는 모든 게시판(어느 학생 이름이든)에 접근할 수 있는
          암호입니다. <b>교수 로그인 암호</b>는 2개까지 지정할 수 있고 둘 중
          아무거나 로그인에 사용됩니다.
        </p>
        <form action={saveSettingsAction} className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">마스터 암호</label>
            <input
              name="master_password"
              type="text"
              defaultValue={settings.master_password ?? ""}
              placeholder="예: prof-master"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
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
          <button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 sm:col-span-3 sm:w-fit">
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
          <code className="rounded bg-slate-100 px-1">학번, 성명, 암호</code>{" "}
          형식으로 입력하세요. 암호는 학생이 이름을 눌러 글을 올릴 때 사용됩니다.
          (엑셀에서 3열로 복사·붙여넣기 가능)
        </p>
        <form action={saveStudentsAction} className="space-y-3">
          <textarea
            name="roster"
            rows={12}
            defaultValue={rosterText}
            placeholder={"20250001, 홍길동, hong123\n20250002, 김철수, kim456"}
            className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
          />
          <button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
            명단 저장
          </button>
        </form>

        {roster.length > 0 && (
          <details className="mt-5">
            <summary className="cursor-pointer select-none rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              🔑 암호 확인용 목록 (클릭하여 펼치기 / 접기)
            </summary>
            <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-1 pr-4">학번</th>
                  <th className="py-1 pr-4">이름</th>
                  <th className="py-1">암호</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-1 pr-4 text-slate-500">{s.student_no}</td>
                    <td className="py-1 pr-4">{s.name}</td>
                    <td className="py-1 font-mono">
                      {s.password ? (
                        s.password
                      ) : (
                        <span className="text-red-500">미설정</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </details>
        )}
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
              placeholder="제목 (예: HTML 실습)"
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
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium">접근 방식:</span>
            <label className="flex items-center gap-1">
              <input type="radio" name="require_password" value="yes" defaultChecked />
              🔒 암호 필요 (학생 암호 입력)
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="require_password" value="no" />
              🔓 누구나 가능 (암호 없이)
            </label>
          </div>
        </form>

        {sessionList.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 회차가 없습니다.</p>
        ) : (
          <ul className="divide-y">
            {sessionList.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span className="text-sm">
                  <span className="mr-1">{s.require_password ? "🔒" : "🔓"}</span>
                  {s.week != null && <b className="text-blue-600">{s.week}주차 </b>}
                  {s.title}
                  {s.lesson_date && (
                    <span className="text-slate-400"> · {s.lesson_date}</span>
                  )}
                </span>
                <form action={deleteSessionAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="text-xs text-red-500 hover:underline">
                    삭제
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
