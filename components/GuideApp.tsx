"use client";
// Design Ref: §5.1 — 입력(①)·가이드 결과(②)·엑셀 점검(③)·보고서를 묶고 화면 상태를 보관한다 (PLAN 작업 3~13)
import { useState } from "react";
import CautionList from "@/components/CautionList";
import ConditionTable from "@/components/ConditionTable";
import ExcelCheck from "@/components/ExcelCheck";
import GuideForm from "@/components/GuideForm";
import QueryBlock from "@/components/QueryBlock";
import ReportView from "@/components/ReportView";
import StatusMessage from "@/components/StatusMessage";
import TableGuide from "@/components/TableGuide";
import exampleInput from "@/samples/example-input.json";
import type { ApiError, ExcelCheckResult, GuideMode, GuideResponse, GuideResult } from "@/lib/types";

const TIMEOUT_MS = 60_000; // PLAN SC-4: 1분 이내
const GENERIC_ERROR = "가이드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.";

export default function GuideApp() {
  const [requirement, setRequirement] = useState("");
  const [tableDef, setTableDef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuideResult | null>(null);
  const [mode, setMode] = useState<GuideMode>("mock");
  const [excel, setExcel] = useState<ExcelCheckResult | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement, tableDef }),
        signal: controller.signal,
      });
      const json = (await res.json()) as GuideResponse | ApiError;
      if (!res.ok || "error" in json) {
        setError("error" in json ? json.error.message : GENERIC_ERROR);
        return;
      }
      setResult(json.data);
      setMode(json.mode);
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "응답이 늦어지고 있어요. 다시 시도해 주세요."
          : GENERIC_ERROR,
      );
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  return (
    <>
    {/* 화면용 영역 — 인쇄할 때는 숨기고 아래 ReportView만 보인다 */}
    <div className="flex flex-col gap-10 print:hidden">
      <GuideForm
        requirement={requirement}
        tableDef={tableDef}
        loading={loading}
        onRequirementChange={setRequirement}
        onTableDefChange={setTableDef}
        onFillExample={() => {
          setRequirement(exampleInput.requirement);
          setTableDef(exampleInput.tableDef);
        }}
        onSubmit={generate}
      />

      {error && <StatusMessage message={error} onRetry={generate} />}

      {result && (
        <section className="flex flex-col gap-8">
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">② 가이드 결과</h2>

          {mode === "mock" && (
            <p className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
              <strong>예시 응답 모드</strong> — 실제 AI를 부르지 않고, 입력 내용과 관계없이 미리 만든 예시
              결과(시험 요구문 req-01 기준)를 보여줍니다. 테이블 이름 대조는 입력한 정의서로 실제 수행합니다.
            </p>
          )}

          {/* OpenAI 테스트 모드 안내는 항상 표시 (PRD 7번, Design Ref: §2.4) */}
          {mode === "openai" && (
            <p className="rounded-lg border border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200">
              <strong>외부 AI(OpenAI) 테스트 모드 — 가상 데이터만</strong> — 입력한 요구사항문과 정의서가 OpenAI로
              전송되었습니다. 실제 업무 자료는 넣지 마세요.
            </p>
          )}

          {/* 요구사항문 요약 (AI 작성, 3줄 이내) */}
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">요구사항 요약</h3>
            <p className="whitespace-pre-line rounded-lg bg-zinc-50 px-4 py-3 text-sm leading-6 text-black dark:bg-zinc-900 dark:text-zinc-100">
              {result.summary}
            </p>
          </div>

          {/* "확인 필요" 항목 모음 — 있으면 결과 위쪽에 먼저 보여준다 */}
          {result.needsCheck.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              <p className="font-semibold">확인 필요 {result.needsCheck.length}건</p>
              <ul className="mt-2 list-disc pl-5 leading-6">
                {result.needsCheck.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <ConditionTable conditions={result.conditions} />
          <TableGuide tables={result.tables} />
          <CautionList cautions={result.cautions} />
          <QueryBlock title="쿼리 뼈대" query={result.skeleton} />
          <QueryBlock title="완성 쿼리 예시" query={result.exampleQuery} showVerifyBadge />
        </section>
      )}

      {/* 가이드가 나온 뒤에만 엑셀 점검과 보고서를 보여준다 (Design Ref: §5.1) */}
      {result && <ExcelCheck requirement={requirement} onResult={setExcel} />}

      {result && (
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-black px-5 py-2.5 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-black"
          >
            보고서 출력
          </button>
          <p className="text-xs text-zinc-500">인쇄 창에서 “PDF로 저장”을 고르면 결재 첨부용 PDF가 만들어져요.</p>
        </div>
      )}
    </div>

    {result && <ReportView result={result} mode={mode} excel={excel} />}
    </>
  );
}
