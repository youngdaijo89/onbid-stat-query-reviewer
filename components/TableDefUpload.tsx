"use client";
// Design Ref: §2.2 "테이블 정의서 입력 형식" — 정의서 엑셀 업로드·템플릿 내려받기·예시 엑셀 채우기
// 엑셀은 브라우저 안에서만 읽고, 읽은 내용을 글로 바꿔 입력칸에 채운다 (서버로 파일을 보내지 않음).
import { useRef, useState } from "react";
import DictionarySqlHelp from "@/components/DictionarySqlHelp";
import { DefinitionReadError, definitionFromSheet } from "@/lib/tableDefExcel";
import { readFirstSheet, XlsxReadError } from "@/lib/xlsx";

const MAX_DEF_BYTES = 10 * 1024 * 1024; // 엑셀 업로드 제한과 같은 10MB (PRD must ② 규칙 4 초기값)
const TEMPLATE_URL = "/templates/table-definition-template.xlsx";
const EXAMPLE_URL = "/samples/table-definition.xlsx";

interface Props {
  disabled: boolean;
  onLoaded: (text: string) => void;
}

export default function TableDefUpload({ disabled, onLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function load(fileName: string, size: number, read: () => Promise<ArrayBuffer>) {
    setMessage(null);
    if (!fileName.toLowerCase().endsWith(".xlsx")) {
      return setMessage({ ok: false, text: "테이블 정의서는 .xlsx 파일만 올릴 수 있어요." });
    }
    if (size > MAX_DEF_BYTES) return setMessage({ ok: false, text: "정의서 엑셀은 10MB 이하만 올릴 수 있어요." });
    setBusy(true);
    try {
      const sheet = await readFirstSheet(await read());
      const result = definitionFromSheet(sheet);
      onLoaded(result.text);
      const extra = sheet.sheetNames.length > 1 ? " (시트가 여러 개라 첫 시트만 읽었어요)" : "";
      setMessage({
        ok: true,
        text: `${fileName}에서 테이블 ${result.tables}개 · 컬럼 ${result.columns}개를 읽어 아래에 채웠어요. 확인 후 고쳐 쓸 수 있어요.${extra}`,
      });
    } catch (err) {
      const text =
        err instanceof DefinitionReadError || err instanceof XlsxReadError
          ? err.message
          : "정의서 엑셀을 열 수 없어요. 손상되었거나 .xlsx 형식이 아니에요.";
      setMessage({ ok: false, text });
    } finally {
      setBusy(false);
    }
  }

  const button =
    "rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void load(file.name, file.size, () => file.arrayBuffer());
            e.target.value = ""; // 같은 파일을 다시 골라도 읽히게
          }}
        />
        <button type="button" className={button} disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
          {busy ? "읽는 중…" : "엑셀로 불러오기"}
        </button>
        <button
          type="button"
          className={button}
          disabled={disabled || busy}
          onClick={() =>
            void load("table-definition.xlsx", 0, async () => {
              const res = await fetch(EXAMPLE_URL);
              if (!res.ok) throw new XlsxReadError("예시 정의서 엑셀을 불러오지 못했어요.");
              return res.arrayBuffer();
            })
          }
        >
          예시 엑셀로 채우기
        </button>
        <a href={TEMPLATE_URL} download className="text-xs text-zinc-500 underline">
          템플릿 내려받기
        </a>
      </div>
      {message && (
        <p role="status" className={`text-xs leading-5 ${message.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
      <DictionarySqlHelp />
    </div>
  );
}
