// Design Ref: §4.2 — POST /api/guide: 쿼리 작성 가이드 생성 (PLAN 작업 5)
import { checkNamesAgainstDef } from "@/lib/tableDef";
import { isGuideResult, withVerifyHeader } from "@/lib/guideResult";
import { AiNotReadyError, getAiProvider, requestGuide } from "@/lib/ai";
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
    if (err instanceof AiNotReadyError) {
      return fail(503, "AI_NOT_READY", "선택한 AI 연결은 아직 준비 중이에요. 예시 응답 모드로 사용해 주세요.");
    }
    console.error("guide: AI 호출 실패", err instanceof Error ? err.name : "unknown");
    return fail(502, "KOBI_ERROR", "가이드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  if (!isGuideResult(raw)) {
    console.error("guide: AI 답 모양이 맞지 않음");
    return fail(502, "KOBI_ERROR", "가이드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  // 코드가 지킬 규칙: 정의서 이름 대조, 완성 쿼리 첫 줄 검증 필요 표시
  const checked = checkNamesAgainstDef(raw, input.value.tableDef);
  const data = { ...checked, exampleQuery: withVerifyHeader(checked.exampleQuery) };

  return Response.json({ data, mode: getAiProvider() } satisfies GuideResponse);
}
