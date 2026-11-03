// Design Ref: §2.2 ③, §5.4 보고서 — 인쇄할 때만 보이는 보고서 (PLAN 작업 13, PRD must ① 규칙 10)
// 화면에서는 숨겨 두고, [보고서 출력]을 누르면 브라우저 인쇄 → "PDF로 저장"으로 만든다.
import { VERIFY_NOTICE } from "@/lib/guideResult";
import type { ExcelCheckResult, GuideMode, GuideResult } from "@/lib/types";

const MODE_NOTE: Record<GuideMode, string> = {
  mock: "예시 응답 모드 — 실제 AI를 부르지 않고 미리 만든 예시 결과로 작성됨",
  openai: "외부 AI(OpenAI) 테스트 모드 — 가상 데이터로만 작성됨",
  kobi: "공사 KOBI API로 작성됨",
};

interface Props {
  result: GuideResult;
  mode: GuideMode;
  excel: ExcelCheckResult | null;
}

const th = "border border-zinc-400 bg-zinc-100 px-2 py-1 text-left font-semibold";
const td = "border border-zinc-400 px-2 py-1 align-top";

export default function ReportView({ result, mode, excel }: Props) {
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  return (
    <article className="hidden bg-white text-[11pt] leading-relaxed text-black print:block">
      <h1 className="text-2xl font-bold">쿼리 작성 가이드 보고서</h1>
      <p className="mt-1 text-sm">
        작성일 {today} · 온비드 통계 요청 쿼리 리뷰어 · {MODE_NOTE[mode]}
      </p>
      {/* 경고 문구는 AI 답이 아니라 코드에 고정 */}
      <p className="mt-2 border border-black px-3 py-2 text-sm font-semibold">
        ⚠ 이 보고서의 쿼리는 {VERIFY_NOTICE}입니다. 가상 데이터로 작성된 실습 결과입니다.
      </p>

      <h2 className="mt-6 text-lg font-bold">1. 요구사항 요약</h2>
      <p className="whitespace-pre-line">{result.summary}</p>

      <h2 className="mt-6 text-lg font-bold">2. 조건 분해표</h2>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>항목</th>
            <th className={th}>값</th>
            <th className={th}>원문 근거</th>
          </tr>
        </thead>
        <tbody>
          {result.conditions.map((c, i) => (
            <tr key={i}>
              <td className={td}>{c.item}</td>
              <td className={td}>{c.value}</td>
              <td className={td}>“{c.source}”</td>
            </tr>
          ))}
        </tbody>
      </table>

      {result.needsCheck.length > 0 && (
        <>
          <h2 className="mt-6 text-lg font-bold">확인 필요</h2>
          <ul className="list-disc pl-5">
            {result.needsCheck.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-6 text-lg font-bold">3. 주의사항</h2>
      <ul className="list-disc pl-5">
        {result.cautions.map((c, i) => (
          <li key={i}>
            [{c.level}] {c.text}
          </li>
        ))}
      </ul>

      <h2 className="mt-6 text-lg font-bold">4. 완성 쿼리 예시</h2>
      <pre className="mt-2 whitespace-pre-wrap border border-zinc-400 p-3 font-mono text-[9pt]">{result.exampleQuery}</pre>

      <h2 className="mt-6 text-lg font-bold">5. 결과 엑셀 점검</h2>
      {excel === null ? (
        <p>점검하지 않음</p>
      ) : (
        <>
          <p>
            {excel.fileName} · 시트 “{excel.sheetName}” · {excel.rowCount.toLocaleString()}행 · 특이점 {excel.issues.length}건
          </p>
          {excel.issues.length > 0 && (
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={th}>종류</th>
                  <th className={th}>위치</th>
                  <th className={th}>기대값</th>
                  <th className={th}>실제값</th>
                  <th className={th}>설명</th>
                </tr>
              </thead>
              <tbody>
                {excel.issues.map((x, i) => (
                  <tr key={i}>
                    <td className={td}>{x.type}</td>
                    <td className={td}>
                      {x.row}행 {x.column}열 ({x.cell})
                    </td>
                    <td className={td}>{x.expected?.toLocaleString() ?? "—"}</td>
                    <td className={td}>{x.actual?.toLocaleString() ?? "—"}</td>
                    <td className={td}>{x.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </article>
  );
}
