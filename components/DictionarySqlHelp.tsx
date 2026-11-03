"use client";
// Design Ref: §2.2 "테이블 정의서 입력 형식" — 정의서 추출 SQL 안내 (복사·내려받기). 앱은 SQL을 실행하지 않는다.
import { useState } from "react";
import { DICTIONARY_SQL } from "@/lib/dictionarySql";

const STEPS = [
  "아래 SQL에서 스키마명과 테이블 이름을 이번 통계에 필요한 것으로 바꿔요.",
  "SQL Developer 등에서 실행해요. 데이터 사전만 읽는 조회라 데이터는 바뀌지 않아요.",
  "결과 표를 엑셀(.xlsx)로 내보내요. (SQL Developer: 결과 표에서 오른쪽 클릭 → 익스포트 → 형식 excel 2003+ (xlsx))",
  "[엑셀로 불러오기]로 올리면 정의서 입력칸이 채워져요.",
];

export default function DictionarySqlHelp() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(DICTIONARY_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드를 쓸 수 없으면 아래 상자에서 직접 선택해 복사할 수 있다
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([DICTIONARY_SQL], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "table-definition-extract.sql";
    a.click();
    URL.revokeObjectURL(url);
  }

  const button =
    "rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900";

  return (
    <details className="rounded-md border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800">
      <summary className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
        DB에서 정의서 뽑는 SQL (Oracle)
      </summary>
      <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 leading-5 text-zinc-600 dark:text-zinc-400">
        {STEPS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="mt-2 leading-5 text-amber-700 dark:text-amber-400">
        ⚠ 실습용 공개 사이트에는 실제 테이블 정의서를 올리지 마세요. 실제 업무 자료는 내부망 환경에서만 씁니다.
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" className={button} onClick={copy}>
          {copied ? "복사됨" : "SQL 복사"}
        </button>
        <button type="button" className={button} onClick={download}>
          .sql로 내려받기
        </button>
      </div>
      <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-zinc-950 p-3 font-mono text-[11px] leading-4 text-zinc-100">
        <code>{DICTIONARY_SQL}</code>
      </pre>
    </details>
  );
}
