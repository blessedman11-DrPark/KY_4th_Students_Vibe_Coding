import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import type { Session, Student } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = supabaseServer();

  const [{ data: session }, { data: students }, { data: posts }] =
    await Promise.all([
      sb.from("sessions").select("*").eq("id", id).single(),
      sb
        .from("students")
        .select("*")
        .order("student_no", { ascending: true }),
      sb.from("posts").select("student_id").eq("session_id", id),
    ]);

  if (!session) notFound();
  const s = session as Session;
  const roster = (students ?? []) as Student[];

  // 학생별 제출 개수
  const countByStudent = new Map<string, number>();
  for (const p of posts ?? []) {
    if (!p.student_id) continue;
    countByStudent.set(p.student_id, (countByStudent.get(p.student_id) ?? 0) + 1);
  }
  const submittedCount = roster.filter((st) => countByStudent.get(st.id)).length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← 회차 목록
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {s.week != null && (
                <span className="mr-2 text-blue-600">{s.week}주차</span>
              )}
              {s.title}
            </h1>
            {s.description && (
              <p className="mt-1 whitespace-pre-line text-slate-600">
                {s.description}
              </p>
            )}
            <p className="mt-2 text-sm text-slate-500">
              제출 {submittedCount}/{roster.length}명 · 암호 없이 본인 이름
              박스를 누르면 바로 올릴 수 있습니다.
            </p>
          </div>
          {!s.is_open && (
            <span className="shrink-0 rounded-lg bg-slate-200 px-4 py-2 text-sm text-slate-500">
              제출 마감
            </span>
          )}
        </div>
      </div>

      {roster.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
          아직 등록된 학생 명단이 없습니다.
          <br />
          <Link href="/admin" className="text-blue-600 underline">
            교수 관리
          </Link>{" "}
          에서 명단을 저장하세요.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {roster.map((st) => {
            const count = countByStudent.get(st.id) ?? 0;
            const done = count > 0;
            return (
              <li key={st.id}>
                <Link
                  href={`/session/${s.id}/student/${st.id}`}
                  className={`block rounded-xl border p-4 shadow-sm transition hover:shadow-md ${
                    done
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{st.name}</span>
                    {done ? (
                      <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white">
                        제출 {count > 1 ? `${count}` : "완료"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-500">
                        미제출
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{st.student_no}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
