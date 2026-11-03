"use client";
// Design Ref: §5.3 ExcelCheck — 엑셀 선택, 합계·소계 재계산, 기간·단위 대조 결과 표 (PLAN 작업 10~12)
// 엑셀 파일은 브라우저에서만 읽고, 서버에는 제목·단위·머리글 글자만 보낸다.
import { useState } from "react";
import { checkCells, checkExcelFile, checkSheetShape, checkTotals, extractLabels } from "@/lib/excel";
import { readFirstSheet, XlsxReadError } from "@/lib/xlsx";
import type { ApiError, ExcelCheckResult, ExcelIssue, ExcelLabelResponse, GuideMode } from "@/lib/types";

// 실습용 예시 엑셀 (public/samples, 가상 데이터) — 짝이 되는 요구사항문을 함께 표시
const EXAMPLES = [
  { file: "excel-01.xlsx", label: "excel-01 — 월별 낙찰 현황 (req-01과 짝)" },
  { file: "excel-02.xlsx", label: "excel-02 — 유형별 유찰 현황 (req-02와 짝)" },
  { file: "excel-03.xlsx", label: "excel-03 — 기관 유형별 공고 현황 (req-03과 짝)" },
  { file: "excel-04.xlsx", label: "excel-04 — 분기별 단독 입찰 비율 (req-04와 짝)" },
  { file: "excel-05.xlsx", label: "excel-05 — 진행 중 공고 상위 10개 (req-05와 짝)" },
  { file: "excel-06.xlsx", label: "excel-06 — 가로 합계·빈칸·중복·글자 섞임" },
];

const TYPE_STYLE: Record<ExcelIssue["type"], string> = {
  "합계 불일치": "bg-red-600 text-white",
  "소계 불일치": "bg-red-600 text-white",
  "가로 합계 불일치": "bg-red-600 text-white",
  "숫자 아님": "bg-red-600 text-white",
  "중복 행": "bg-amber-400 text-black",
  "빈칸": "bg-amber-400 text-black",
  "기간 불일치": "bg-amber-400 text-black",
  "단위 불일치": "bg-amber-400 text-black",
};

interface Props {
  requirement: string;
  onResult: (result: ExcelCheckResult | null) => void;
}

export default function ExcelCheck({ requirement, onResult }: Props) {
  const [example, setExample] = useState(EXAMPLES[0].file);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExcelCheckResult | null>(null);
  const [checkedCells, setCheckedCells] = useState(0);
  const [notice, setNotice] = useState<string | null>(null); // 합계 행을 못 찾음 등
  const [labelError, setLabelError] = useState<string | null>(null);
  const [labelMode, setLabelMode] = useState<GuideMode | null>(null);

  async function run(fileName: string, size: number, load: () => Promise<ArrayBuffer>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    setLabelError(null);
    setLabelMode(null);
    setResult(null);
    onResult(null);
    try {
      const fileProblem = checkExcelFile(fileName, size);
      if (fileProblem) return setError(fileProblem);

      const sheet = await readFirstSheet(await load());
      const shapeProblem = checkSheetShape(sheet);
      if (shapeProblem) return setError(shapeProblem);

      // ① 합계·소계 — 코드로 다시 계산
      const totals = checkTotals(sheet);
      setCheckedCells(totals.checkedCells);
      setNotice(totals.message);
      // ①-1 가로 합계·빈칸·숫자 아님·중복 행 — 코드로 점검
      const cellIssues = checkCells(sheet);

      // ② 기간·단위 — 글자 칸만 서버로 보내 대조 (실패해도 ①의 결과는 그대로 보여준다)
      let labelIssues: ExcelIssue[] = [];
      const labels = extractLabels(sheet);
      if (labels.length > 0) {
        try {
          const res = await fetch("/api/excel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requirement, labels }),
          });
          const json = (await res.json()) as ExcelLabelResponse | ApiError;
          if (!res.ok || "error" in json) {
            setLabelError("error" in json ? json.error.message : "기간·단위 대조를 하지 못했어요.");
          } else {
            labelIssues = json.data.issues;
            setLabelMode(json.mode);
          }
        } catch {
          setLabelError("기간·단위 대조를 하지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
      }

      const combined: ExcelCheckResult = {
        fileName,
        sheetName: sheet.name,
        rowCount: sheet.maxRow,
        issues: [...totals.issues, ...cellIssues, ...labelIssues],
      };
      setResult(combined);
      onResult(combined);
    } catch (err) {
      setError(err instanceof XlsxReadError ? err.message : "엑셀 파일을 열 수 없어요. 손상되었거나 .xlsx 형식이 아니에요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-black dark:text-zinc-50">③ 결과 엑셀 점검 (선택)</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        시트 1개 · .xlsx · 10MB · 1만 행 이하. 엑셀 파일은 이 브라우저 안에서만 읽고 서버로 보내지 않아요.
      </p>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-black dark:text-zinc-50">내 엑셀 파일 선택</span>
          <input
            type="file"
            accept=".xlsx"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void run(file.name, file.size, () => file.arrayBuffer());
              e.target.value = ""; // 같은 파일을 다시 골라도 점검되게
            }}
            className="text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3 file:py-1.5 file:text-white dark:text-zinc-300 dark:file:bg-zinc-50 dark:file:text-black"
          />
        </label>

        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
          <span className="font-medium text-black dark:text-zinc-50">또는 예시 엑셀</span>
          <select
            value={example}
            onChange={(e) => setExample(e.target.value)}
            disabled={busy}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            {EXAMPLES.map((x) => (
              <option key={x.file} value={x.file}>
                {x.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(example, 0, async () => {
                const res = await fetch(`/samples/${example}`);
                if (!res.ok) throw new XlsxReadError("예시 엑셀을 불러오지 못했어요.");
                return res.arrayBuffer();
              })
            }
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {busy ? "점검 중…" : "예시 엑셀로 점검"}
          </button>
          <a href={`/samples/${example}`} download className="text-sm text-zinc-500 underline">
            내려받기
          </a>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <strong className="text-black dark:text-zinc-50">{result.fileName}</strong> · 시트 “{result.sheetName}” ·{" "}
            {result.rowCount.toLocaleString()}행 · 합계·소계 {checkedCells}칸을 코드로 다시 계산했어요.
          </p>

          {notice && <p className="text-sm text-amber-700 dark:text-amber-300">{notice}</p>}
          {labelError && <p className="text-sm text-amber-700 dark:text-amber-300">{labelError}</p>}
          {labelMode === "mock" && (
            <p className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
              <strong>예시 응답 모드</strong> — 기간·단위 대조는 실제로 비교하지 않고 예시 결과(excel-01의 C3)만 보여줍니다.
              합계·소계는 코드로 실제 계산한 결과입니다.
            </p>
          )}

          {result.issues.length === 0 ? (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              찾은 특이점이 없어요.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">종류</th>
                    <th className="px-4 py-2 font-medium">위치</th>
                    <th className="px-4 py-2 font-medium">기대값</th>
                    <th className="px-4 py-2 font-medium">실제값</th>
                    <th className="px-4 py-2 font-medium">설명</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {result.issues.map((x, i) => (
                    <tr key={i} className="align-top">
                      <td className="whitespace-nowrap px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_STYLE[x.type]}`}>{x.type}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-black dark:text-zinc-100">
                        {x.row}행 {x.column}열 ({x.cell})
                      </td>
                      <td className="px-4 py-2 text-black dark:text-zinc-100">{x.expected?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-2 text-black dark:text-zinc-100">{x.actual?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{x.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
