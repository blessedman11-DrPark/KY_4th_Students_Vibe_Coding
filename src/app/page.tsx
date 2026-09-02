import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import type { Session } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getData() {
  const sb = supabaseServer();
  const [{ data: sessions }, { count: studentCount }, { data: posts }] =
    await Promise.all([
      sb.from("sessions").select("*").order("week", { ascending: true }),
      sb.from("students").select("*", { count: "exact", head: true }),
      sb.from("posts").select("session_id, student_id"),
    ]);

  // 회차별 제출한 학생 수 계산 (중복 제거)
  const submittedBySession = new Map<string, Set<string>>();
  for (const p of posts ?? []) {
    if (!p.session_id) continue;
    const set = submittedBySession.get(p.session_id) ?? new Set<string>();
    if (p.student_id) set.add(p.student_id);
    submittedBySession.set(p.session_id, set);
  }

  return {
    sessions: (sessions ?? []) as Session[],
    studentCount: studentCount ?? 0,
    submittedBySession,
  };
}

function SetupNotice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
      <p className="mb-2 font-semibold">⚙️ 아직 설정이 필요합니다</p>
      <p className="whitespace-pre-line">{message}</p>
      <p className="mt-3">
        <code className="rounded bg-amber-100 px-1">.env.local</code> 에 Supabase
        정보를 입력하고,{" "}
        <code className="rounded bg-amber-100 px-1">supabase/schema.sql</code> 을
        실행한 뒤 새로고침하세요.
      </p>
    </div>
  );
}

export default async function Home() {
  let data;
  try {
    data = await getData();
  } catch (e) {
    return <SetupNotice message={(e as Error).message} />;
  }

  const { sessions, studentCount, submittedBySession } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">수업 회차</h1>
          <p className="text-sm text-slate-500">
            수강생 {studentCount}명 · 회차를 눌러 결과물을 제출하세요.
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
          아직 등록된 수업 회차가 없습니다.
          <br />
          <Link href="/admin" className="text-blue-600 underline">
            교수 관리
          </Link>{" "}
          에서 회차를 추가하세요.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {sessions.map((s) => {
            const submitted = submittedBySession.get(s.id)?.size ?? 0;
            return (
              <li key={s.id}>
                <Link
                  href={`/session/${s.id}`}
                  className="block rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-1 flex items-center gap-2">
                    {s.week != null && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {s.week}주차
                      </span>
                    )}
                    {!s.is_open && (
                      <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                        마감
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold">{s.title}</h2>
                  {s.lesson_date && (
                    <p className="text-xs text-slate-400">{s.lesson_date}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: studentCount
                            ? `${Math.round((submitted / studentCount) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">
                      제출 {submitted}/{studentCount}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
