// Design Ref: §4.3 — POST /api/excel: 엑셀 제목·단위·머리글의 기간·단위를 요구사항문과 대조 (PLAN 작업 12)
// 엑셀 파일 자체는 받지 않는다. 브라우저가 골라낸 글자 칸(셀 주소 + 종류 + 글자)만 받는다.
import { getAiProvider, requestExcelLabelCheck } from "@/lib/ai";
import { aiErrorLabel, aiFailure } from "@/lib/aiErrors";
import { validateExcelLabelInput } from "@/lib/validate";
import { rejectUnsafeRequest } from "@/lib/requestGuard";
import { parseCellRef } from "@/lib/xlsx";
import type { ApiError, ApiErrorCode, ExcelIssue, ExcelLabelResponse } from "@/lib/types";

function fail(status: number, code: ApiErrorCode, message: string) {
  return Response.json({ error: { code, message } } satisfies ApiError, { status });
}

const LABEL_ISSUE_TYPES: ExcelIssue["type"][] = ["기간 불일치", "단위 불일치"];

export async function POST(request: Request) {
  // JSON 형식이고 같은 사이트 화면에서 온 요청만 받는다 (CSRF 방어 — lib/requestGuard.ts)
  const blocked = rejectUnsafeRequest(request);
  if (blocked) return fail(blocked.status, blocked.code, blocked.message);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "VALIDATION_ERROR", "요청 형식이 올바르지 않아요.");
  }

  const input = validateExcelLabelInput(body);
  if (!input.ok) return fail(400, "VALIDATION_ERROR", input.message);

  let raw: unknown;
  try {
    raw = await requestExcelLabelCheck(input.value.requirement, input.value.labels);
  } catch (err) {
    // 실패해도 다른 AI로 자동 전환하지 않는다 (Design Ref: §2.4). 합계·소계 점검 결과는 화면에 그대로 남는다.
    console.error("excel: AI 호출 실패", aiErrorLabel(err));
    const f = aiFailure(err, "기간·단위 대조를 하지");
    return fail(f.status, f.code, f.message);
  }

  // AI는 보낸 셀 주소 중 하나만 쓸 수 있다 — 받지 않은 주소나 모양이 틀린 항목은 버린다 (Design Ref: §4.3)
  const sent = new Set(input.value.labels.map((l) => l.cell));
  const list = typeof raw === "object" && raw !== null ? (raw as { issues?: unknown }).issues : null;
  const issues: ExcelIssue[] = [];
  for (const item of Array.isArray(list) ? list : []) {
    if (typeof item !== "object" || item === null) continue;
    const { type, cell, message } = item as Record<string, unknown>;
    if (typeof cell !== "string" || !sent.has(cell)) continue;
    if (typeof message !== "string" || !LABEL_ISSUE_TYPES.includes(type as ExcelIssue["type"])) continue;
    const pos = parseCellRef(cell);
    if (!pos) continue;
    issues.push({
      type: type as ExcelIssue["type"],
      cell,
      row: pos.row,
      column: cell.replace(/\d+$/, ""),
      message,
    });
  }

  return Response.json({ data: { issues }, mode: getAiProvider() } satisfies ExcelLabelResponse);
}
