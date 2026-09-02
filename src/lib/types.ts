export type Student = {
  id: string;
  student_no: string;
  name: string;
  password: string | null;
  sort_order: number;
  created_at: string;
};

export type Session = {
  id: string;
  week: number | null;
  title: string;
  lesson_date: string | null;
  description: string | null;
  is_open: boolean;
  require_password: boolean;
  created_at: string;
};

export type Attachment = {
  id: string;
  post_id: string;
  file_path: string;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  session_id: string;
  student_id: string | null;
  title: string;
  content: string | null;
  link_url: string | null;
  created_at: string;
  updated_at: string;
  students?: Student | null;
  attachments?: Attachment[];
};
