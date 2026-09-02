"use client";

import { useEffect, useRef, useState } from "react";

// 이미지 미리보기 썸네일 (자체적으로 objectURL 생성/해제)
function Thumb({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <li className="relative">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={file.name}
          className="h-20 w-20 rounded-lg border object-cover"
        />
      ) : (
        <div className="flex h-20 w-32 items-center justify-center rounded-lg border bg-slate-50 px-2 text-center text-xs text-slate-600">
          📄 {file.name}
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="삭제"
        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs leading-none text-white shadow"
      >
        ×
      </button>
    </li>
  );
}

export default function FileUploader({ name = "files" }: { name?: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const hiddenRef = useRef<HTMLInputElement>(null);

  // 선택/붙여넣은 파일을 실제 제출되는 숨은 input 에 동기화
  useEffect(() => {
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    if (hiddenRef.current) hiddenRef.current.files = dt.files;
  }, [files]);

  // 페이지 어디서든 Ctrl+V 로 이미지 붙여넣기
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      const imgs: File[] = [];
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) {
            const ext = (f.type.split("/")[1] || "png").replace("jpeg", "jpg");
            imgs.push(
              new File([f], `pasted-${Date.now()}.${ext}`, { type: f.type })
            );
          }
        }
      }
      if (imgs.length > 0) {
        e.preventDefault();
        setFiles((prev) => [...prev, ...imgs]);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const picked = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...picked]);
    }
    e.target.value = ""; // 같은 파일 다시 선택 가능하도록 초기화
  }

  return (
    <div className="space-y-2">
      <input ref={hiddenRef} type="file" name={name} multiple className="hidden" />

      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          📎 파일 추가
          <input
            type="file"
            multiple
            className="hidden"
            onChange={onSelect}
          />
        </label>
        <span className="text-xs text-slate-400">
          또는 이미지를 복사한 뒤 <b>Ctrl+V</b> 로 붙여넣기
        </span>
      </div>

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-3 pt-1">
          {files.map((f, i) => (
            <Thumb
              key={`${f.name}-${i}`}
              file={f}
              onRemove={() =>
                setFiles((prev) => prev.filter((_, idx) => idx !== i))
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
