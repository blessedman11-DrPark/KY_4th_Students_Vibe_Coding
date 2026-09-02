import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "디지털기술입문 제출 게시판",
  description: "수업 결과물 제출 게시판",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold">
              📋 디지털기술입문 제출 게시판
            </Link>
            <Link
              href="/admin"
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              교수 관리
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-5xl px-4 py-8 text-center text-xs text-slate-400">
          건양대학교 · 디지털기술입문 · made by Prof. Park
        </footer>
      </body>
    </html>
  );
}
