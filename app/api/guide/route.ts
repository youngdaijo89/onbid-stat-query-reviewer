// Design Ref: §4.2 — POST /api/guide: 쿼리 작성 가이드 생성 (PLAN 작업 5·8·8-1)
import { checkNamesAgainstDef } from "@/lib/tableDef";
import { isGuideResult, notOracleHints, unsafeSqlReason, withinLimits, withVerifyHeader } from "@/lib/guideResult";
import { getAiProvider, requestGuide } from "@/lib/ai";
import { aiErrorLabel, aiFailure } from "@/lib/aiErrors";
import { validateGuideInput } from "@/lib/validate";
import type { ApiError, ApiErrorCode, GuideResponse } from "@/lib/types";

// 사용자에게는 정해진 문장만 보여준다 (내부 오류 내용은 내보내지 않음)
function fail(status: number, code: ApiErrorCode, message: string) {
  return Response.json({ error: { code, message } } satisfies ApiError, { status });
}

export async function POST(request: Request) {
  // JSON 요청만 받는다 (다른 사이트가 폼으로 보내는 요청 차단)
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return fail(415, "UNSUPPORTED_MEDIA_TYPE", "요청 형식이 올바르지 않아요.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "VALIDATION_ERROR", "요청 형식이 올바르지 않아요.");
  }

  // 화면에서 검사했더라도 서버에서 한 번 더 검사한다
  const input = validateGuideInput(body);
  if (!input.ok) return fail(400, "VALIDATION_ERROR", input.message);

  let raw: unknown;
  try {
    raw = await requestGuide(input.value);
  } catch (err) {
    // 실패해도 다른 AI로 자동 전환하지 않는다 (Design Ref: §2.4)
    console.error("guide: AI 호출 실패", aiErrorLabel(err));
    const f = aiFailure(err, "가이드를 만들지");
    return fail(f.status, f.code, f.message);
  }

  if (!isGuideResult(raw) || !withinLimits(raw)) {
    console.error("guide: AI 답 모양이 맞지 않음");
    return fail(502, "KOBI_ERROR", "가이드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  // 코드가 지킬 규칙: 정의서 이름 대조, SQL 안전 검사, 완성 쿼리 첫 줄 검증 필요 표시
  const checked = checkNamesAgainstDef(raw, input.value.tableDef);
  const needsCheck = checked.needsCheck.filter((s) => s.trim() !== ""); // AI가 빈 문자열을 넣는 일이 있음
  const guard = (label: string, sql: string) => {
    const reason = unsafeSqlReason(sql);
    if (!reason) {
      needsCheck.push(...notOracleHints(label, sql));
      return sql;
    }
    needsCheck.push(`${label}를 숨겼어요 — ${reason}. 직접 작성해 주세요.`);
    return `-- (안전을 위해 숨김: ${reason})`;
  };
  const skeleton = guard("쿼리 뼈대", checked.skeleton);
  const exampleQuery = withVerifyHeader(guard("완성 쿼리 예시", checked.exampleQuery));
  const data = { ...checked, skeleton, exampleQuery, needsCheck };

  return Response.json({ data, mode: getAiProvider() } satisfies GuideResponse);
}
