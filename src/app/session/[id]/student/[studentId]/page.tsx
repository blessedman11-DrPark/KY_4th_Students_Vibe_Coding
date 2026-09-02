import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer, publicFileUrl } from "@/lib/supabase";
import { isStudentUnlocked } from "@/lib/auth";
import {
  createPost,
  updatePost,
  deletePost,
  studentUnlockAction,
} from "@/lib/actions";
import FileUploader from "@/components/FileUploader";
import type { Post, Session, Student } from "@/lib/types";

export const dynamic = "force-dynamic";

function Attachments({ post }: { post: Post }) {
  if (!post.attachments || post.attachments.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {post.attachments.map((a) => {
        const url = publicFileUrl(a.file_path);
        const isImage = a.file_type?.startsWith("image/");
        return isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <a key={a.id} href={url} target="_blank" rel="noreferrer">
            <img
              src={url}
              alt={a.file_name ?? ""}
              className="h-32 w-32 rounded-lg border object-cover"
            />
          </a>
        ) : (
          <a
            key={a.id}
            href={`${url}?download=${encodeURIComponent(a.file_name ?? "")}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            📎 {a.file_name}
          </a>
        );
      })}
    </div>
  );
}

export default async function StudentSubmitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; studentId: string }>;
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const { id, studentId } = await params;
  const { edit, error } = await searchParams;
  const sb = supabaseServer();

  const [{ data: session }, { data: student }, { data: posts }] =
    await Promise.all([
      sb.from("sessions").select("*").eq("id", id).single(),
      sb.from("students").select("*").eq("id", studentId).single(),
      sb
        .from("posts")
        .select("*, attachments(*)")
        .eq("session_id", id)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
    ]);

  if (!session || !student) notFound();
  const s = session as Session;
  const st = student as Student;
  const list = (posts ?? []) as Post[];
  const hasPost = list.length > 0;

  const editingPost = edit ? list.find((p) => p.id === edit) : undefined;

  // 접근 권한: 암호불필요 회차 / 본인·마스터 암호 인증
  // (교수 로그인 상태여도 학생 게시판은 암호를 요구 — 마스터 암호로 통과 가능)
  const authorized = !s.require_password || (await isStudentUnlocked(st.id));

  const homeButton = (
    <Link
      href="/"
      className="inline-flex w-fit items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
    >
      📋 주차 목록으로 돌아가기
    </Link>
  );

  // ── 암호 확인 화면 (암호 필요 회차 & 미인증) ──────────────
  if (!authorized) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div>
          {homeButton}
          <h1 className="mt-3 text-2xl font-bold">{st.name}</h1>
          <p className="text-sm text-slate-400">{st.student_no}</p>
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            암호가 올바르지 않습니다.
          </p>
        )}
        <form
          action={studentUnlockAction}
          className="space-y-3 rounded-xl border bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="session_id" value={s.id} />
          <input type="hidden" name="student_id" value={st.id} />
          <label className="block text-sm font-medium">
            🔒 암호를 입력하세요
          </label>
          <input
            name="password"
            type="text"
            required
            autoFocus
            autoComplete="off"
            placeholder="본인 암호 또는 마스터 암호"
            className="w-full rounded-lg border px-3 py-2"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="freepass" />
            이 기기에서 12시간 동안 다시 묻지 않기 (프리패스)
          </label>
          <button className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700">
            확인
          </button>
        </form>
        <Link
          href={`/session/${s.id}`}
          className="block text-center text-sm text-slate-500 hover:underline"
        >
          ← 명단으로
        </Link>
      </div>
    );
  }

  const backLink = (
    <Link
      href={`/session/${s.id}`}
      className="text-sm text-slate-500 hover:underline"
    >
      ← {s.week != null ? `${s.week}주차 ` : ""}
      {s.title} · 명단으로
    </Link>
  );

  // ── 편집 모드 ───────────────────────────────────────────
  if (editingPost && s.is_open) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {backLink}
        <div>
          <h1 className="text-2xl font-bold">{st.name} · 결과물 수정</h1>
          <p className="text-sm text-slate-400">{st.student_no}</p>
        </div>

        <form
          action={updatePost}
          className="space-y-4 rounded-xl border bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="post_id" value={editingPost.id} />
          <input type="hidden" name="session_id" value={s.id} />
          <input type="hidden" name="student_id" value={st.id} />

          <div>
            <label className="mb-1 block text-sm font-medium">제목 *</label>
            <input
              name="title"
              required
              defaultValue={editingPost.title}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">설명</label>
            <textarea
              name="content"
              rows={3}
              defaultValue={editingPost.content ?? ""}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              외부 링크 (선택)
            </label>
            <input
              name="link_url"
              type="url"
              defaultValue={editingPost.link_url ?? ""}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          {editingPost.attachments && editingPost.attachments.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                기존 첨부파일 (지울 항목 체크)
              </label>
              <ul className="space-y-1">
                {editingPost.attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="remove_attachment"
                      value={a.id}
                      id={`rm-${a.id}`}
                    />
                    <label htmlFor={`rm-${a.id}`}>📎 {a.file_name}</label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">
              파일 추가 (선택)
            </label>
            <FileUploader />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
            >
              수정 저장
            </button>
            <Link
              href={`/session/${s.id}/student/${st.id}`}
              className="rounded-lg border px-4 py-2.5 text-center font-semibold text-slate-600 hover:bg-slate-50"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    );
  }

  // ── 기본(뷰) 모드 ───────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          📋 주차 목록으로 돌아가기
        </Link>
        <h1 className="mt-3 text-2xl font-bold">{st.name}</h1>
        <p className="text-sm text-slate-400">{st.student_no}</p>
      </div>

      {hasPost ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500">
            내가 올린 결과물
          </h2>
          {list.map((p) => (
            <div key={p.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {new Date(p.created_at).toLocaleString("ko-KR")}
                </span>
                {s.is_open && (
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/session/${s.id}/student/${st.id}?edit=${p.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      수정
                    </Link>
                    <form action={deletePost}>
                      <input type="hidden" name="post_id" value={p.id} />
                      <input type="hidden" name="session_id" value={s.id} />
                      <input type="hidden" name="student_id" value={st.id} />
                      <button className="text-xs text-red-500 hover:underline">
                        삭제
                      </button>
                    </form>
                  </div>
                )}
              </div>
              <h3 className="mt-1 text-lg font-semibold">{p.title}</h3>
              {p.content && (
                <p className="mt-1 whitespace-pre-line text-slate-700">
                  {p.content}
                </p>
              )}
              {p.link_url && (
                <a
                  href={p.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block break-all text-sm text-blue-600 underline"
                >
                  🔗 {p.link_url}
                </a>
              )}
              <Attachments post={p} />
            </div>
          ))}
          {!s.is_open && (
            <p className="text-center text-sm text-slate-400">
              이 회차는 제출이 마감되어 수정·삭제할 수 없습니다.
            </p>
          )}
        </section>
      ) : s.is_open ? (
        <form
          action={createPost}
          className="space-y-4 rounded-xl border bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="session_id" value={s.id} />
          <input type="hidden" name="student_id" value={st.id} />
          <h2 className="font-semibold">결과물 제출</h2>

          <div>
            <label className="mb-1 block text-sm font-medium">제목 *</label>
            <input
              name="title"
              required
              placeholder="예: HTML 실습 결과"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">설명</label>
            <textarea
              name="content"
              rows={3}
              placeholder="결과물에 대한 설명을 적어주세요."
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              외부 링크 (선택)
            </label>
            <input
              name="link_url"
              type="url"
              placeholder="https://github.com/... 등"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              파일 첨부 (이미지·문서, 여러 개 가능)
            </label>
            <FileUploader />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
          >
            제출하기
          </button>
        </form>
      ) : (
        <div className="rounded-xl border bg-slate-50 p-6 text-center text-sm text-slate-500">
          이 회차는 제출이 마감되었습니다.
        </div>
      )}
    </div>
  );
}
