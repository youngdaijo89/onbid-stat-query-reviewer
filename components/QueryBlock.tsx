"use client";
// Design Ref: §5.3 QueryBlock — ④ 쿼리 뼈대 / ⑤ 완성 쿼리 예시 코드 상자 + 복사 버튼 + 검증 필요 배지
import { useState } from "react";
import { VERIFY_NOTICE } from "@/lib/guideResult";

interface Props {
  title: string;
  query: string;
  showVerifyBadge?: boolean; // 완성 쿼리 예시에만 배지를 붙인다
}

export default function QueryBlock({ title, query, showVerifyBadge = false }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(query);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드를 쓸 수 없는 환경이면 조용히 넘어간다 (직접 선택해 복사 가능)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-black dark:text-zinc-50">{title}</h3>
        {/* 배지 문구는 AI 답이 아니라 코드에 고정 (PRD must ① 규칙 5) */}
        {showVerifyBadge && (
          <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
            {VERIFY_NOTICE}
          </span>
        )}
        <button
          type="button"
          onClick={copy}
          className="ml-auto rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs leading-5 text-zinc-100">
        <code>{query}</code>
      </pre>
    </section>
  );
}
