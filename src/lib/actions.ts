"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer, BUCKET } from "./supabase";
import { setAdmin, logoutAdmin, isAdmin } from "./auth";
import { setSetting, verifyAdminPassword } from "./settings";

// ── 학생: 글 작성 ─────────────────────────────────────────
// 암호 없이 누구나 본인 이름 박스를 눌러 바로 제출할 수 있다.
export async function createPost(formData: FormData) {
  const sb = supabaseServer();

  const session_id = String(formData.get("session_id") || "");
  const student_id = String(formData.get("student_id") || "") || null;
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const link_url = String(formData.get("link_url") || "").trim() || null;

  if (!session_id || !title) {
    throw new Error("회차와 제목은 필수입니다.");
  }

  // 한 학생당 한 회차에 하나만 제출 (중복 제출 방지)
  if (student_id) {
    const { data: existing } = await sb
      .from("posts")
      .select("id")
      .eq("session_id", session_id)
      .eq("student_id", student_id)
      .limit(1);
    if (existing && existing.length > 0) {
      revalidatePath(`/session/${session_id}/student/${student_id}`);
      redirect(`/session/${session_id}/student/${student_id}`);
    }
  }

  const { data: post, error } = await sb
    .from("posts")
    .insert({ session_id, student_id, title, content, link_url })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await uploadFiles(sb, formData, session_id, post.id);

  revalidatePath(`/session/${session_id}`);
  if (student_id) {
    redirect(`/session/${session_id}/student/${student_id}`);
  }
  redirect(`/session/${session_id}`);
}

// 첨부파일 업로드 헬퍼
async function uploadFiles(
  sb: ReturnType<typeof supabaseServer>,
  formData: FormData,
  session_id: string,
  post_id: string
) {
  const files = formData.getAll("files") as File[];
  let idx = 0;
  for (const file of files) {
    if (!file || typeof file === "string" || file.size === 0) continue;
    // 스토리지 키는 ASCII만 허용 → 확장자만 유지하고 안전한 이름 생성
    // (한글/특수문자 파일명은 "Invalid key"로 거부되므로 원본명은 DB에만 보관)
    const extMatch = file.name.match(/\.[A-Za-z0-9]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : "";
    const path = `${session_id}/${post_id}/${Date.now()}-${idx++}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const up = await sb.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (up.error) continue;
    await sb.from("attachments").insert({
      post_id,
      file_path: path,
      file_name: file.name, // 원본 파일명(한글 포함) 그대로 보관
      file_type: file.type,
    });
  }
}

// ── 학생: 본인 글 수정 ────────────────────────────────────
export async function updatePost(formData: FormData) {
  const sb = supabaseServer();

  const post_id = String(formData.get("post_id") || "");
  const session_id = String(formData.get("session_id") || "");
  const student_id = String(formData.get("student_id") || "");
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const link_url = String(formData.get("link_url") || "").trim() || null;

  if (!post_id || !title) throw new Error("제목은 필수입니다.");

  const { error } = await sb
    .from("posts")
    .update({ title, content, link_url, updated_at: new Date().toISOString() })
    .eq("id", post_id);
  if (error) throw new Error(error.message);

  // 선택한 기존 첨부파일 삭제
  const removeIds = (formData.getAll("remove_attachment") as string[]).filter(
    Boolean
  );
  if (removeIds.length > 0) {
    const { data: atts } = await sb
      .from("attachments")
      .select("*")
      .in("id", removeIds);
    const paths = (atts ?? []).map((a) => a.file_path);
    if (paths.length > 0) await sb.storage.from(BUCKET).remove(paths);
    await sb.from("attachments").delete().in("id", removeIds);
  }

  // 새 파일 추가 업로드
  await uploadFiles(sb, formData, session_id, post_id);

  revalidatePath(`/session/${session_id}/student/${student_id}`);
  redirect(`/session/${session_id}/student/${student_id}`);
}

// ── 학생: 본인 글 삭제 (스토리지 파일까지 정리) ───────────
export async function deletePost(formData: FormData) {
  const sb = supabaseServer();
  const post_id = String(formData.get("post_id") || "");
  const session_id = String(formData.get("session_id") || "");
  const student_id = String(formData.get("student_id") || "");
  if (!post_id) return;

  const { data: atts } = await sb
    .from("attachments")
    .select("file_path")
    .eq("post_id", post_id);
  const paths = (atts ?? []).map((a) => a.file_path);
  if (paths.length > 0) await sb.storage.from(BUCKET).remove(paths);

  await sb.from("posts").delete().eq("id", post_id);

  revalidatePath(`/session/${session_id}`);
  revalidatePath(`/session/${session_id}/student/${student_id}`);
  redirect(`/session/${session_id}/student/${student_id}`);
}

// ── 관리자: 로그인 / 로그아웃 ─────────────────────────────
export async function adminLoginAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (!(await verifyAdminPassword(password))) redirect("/admin?error=1");
  await setAdmin();
  redirect("/admin");
}

export async function adminLogoutAction() {
  await logoutAdmin();
  redirect("/admin");
}

async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("관리자 권한이 필요합니다.");
}

// ── 관리자: 학생 명단 저장 (텍스트 일괄 입력) ─────────────
// 입력 형식: 한 줄에 "학번, 성명"
export async function saveStudentsAction(formData: FormData) {
  await assertAdmin();
  const sb = supabaseServer();
  const raw = String(formData.get("roster") || "");

  const rows = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const parts = line.split(/[,\t]/).map((s) => s.trim());
      return {
        student_no: parts[0] || "",
        name: parts[1] || parts[0] || "",
        sort_order: i,
      };
    })
    .filter((r) => r.name);

  // 학번(student_no) 기준 병합 저장 → 기존 학생 ID를 유지해 제출물 연결을 보존
  const { data: existing } = await sb.from("students").select("id, student_no");
  const idByNo = new Map(
    (existing ?? []).map((s) => [s.student_no, s.id as string])
  );
  const inputNos = new Set(rows.map((r) => r.student_no));

  // 새 명단에서 빠진 학생만 삭제 (그 학생 제출물은 연결만 해제됨)
  const toDelete = (existing ?? [])
    .filter((s) => !inputNos.has(s.student_no))
    .map((s) => s.id as string);
  if (toDelete.length > 0) {
    await sb.from("students").delete().in("id", toDelete);
  }

  // 기존 학생은 이름/순서만 갱신(ID 유지), 새 학번만 추가
  for (const r of rows) {
    const id = idByNo.get(r.student_no);
    if (id) {
      await sb
        .from("students")
        .update({ name: r.name, sort_order: r.sort_order })
        .eq("id", id);
    } else {
      const { error } = await sb.from("students").insert(r);
      if (error) throw new Error(error.message);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

// ── 관리자: 수업 회차 추가 ────────────────────────────────
export async function addSessionAction(formData: FormData) {
  await assertAdmin();
  const sb = supabaseServer();

  const week = Number(formData.get("week")) || null;
  const title = String(formData.get("title") || "").trim();
  const lesson_date = String(formData.get("lesson_date") || "") || null;
  const description = String(formData.get("description") || "").trim() || null;
  if (!title) throw new Error("회차 제목은 필수입니다.");

  const { error } = await sb
    .from("sessions")
    .insert({ week, title, lesson_date, description });
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/");
}

// ── 관리자: 회차 삭제 ─────────────────────────────────────
export async function deleteSessionAction(formData: FormData) {
  await assertAdmin();
  const sb = supabaseServer();
  const id = String(formData.get("id") || "");
  await sb.from("sessions").delete().eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/");
}

// ── 관리자: 회차 제출 열기/마감 전환 ──────────────────────
export async function toggleSessionOpenAction(formData: FormData) {
  await assertAdmin();
  const sb = supabaseServer();
  const id = String(formData.get("id") || "");
  const is_open = String(formData.get("is_open") || "") === "true";
  await sb.from("sessions").update({ is_open }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/session/${id}`);
}

// ── 관리자: 게시글 삭제 ───────────────────────────────────
export async function deletePostAction(formData: FormData) {
  await assertAdmin();
  const sb = supabaseServer();
  const id = String(formData.get("id") || "");
  const session_id = String(formData.get("session_id") || "");
  await sb.from("posts").delete().eq("id", id);
  revalidatePath(`/session/${session_id}`);
  revalidatePath("/admin");
}

// ── 관리자: 교수 로그인 암호 저장 (2개) ────────────────────
export async function saveSettingsAction(formData: FormData) {
  await assertAdmin();
  await setSetting(
    "admin_password_1",
    String(formData.get("admin_password_1") || "").trim()
  );
  await setSetting(
    "admin_password_2",
    String(formData.get("admin_password_2") || "").trim()
  );
  revalidatePath("/admin");
}
