// Design Ref: §4.2 — POST /api/guide: 쿼리 작성 가이드 생성 (PLAN 작업 5·8·8-1·8-2)
import { checkNamesAgainstDef } from "@/lib/tableDef";
import { isGuideResult, isSqlFix, notOracleHints, sqlProblems, unsafeSqlReason, withinLimits, withVerifyHeader } from "@/lib/guideResult";
import { getAiProvider, requestGuide, requestSqlFix } from "@/lib/ai";
import { aiErrorLabel, aiFailure } from "@/lib/aiErrors";
import { validateGuideInput } from "@/lib/validate";
import { rejectUnsafeRequest } from "@/lib/requestGuard";
import type { ApiError, ApiErrorCode, GuideResponse } from "@/lib/types";

// 사용자에게는 정해진 문장만 보여준다 (내부 오류 내용은 내보내지 않음)
function fail(status: number, code: ApiErrorCode, message: string) {
  return Response.json({ error: { code, message } } satisfies ApiError, { status });
}

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
    console.error("guide: AI 답 모양이 맞지 않음", isGuideResult(raw) ? "(길이 상한 넘음)" : "(칸·형식 다름)");
    return fail(502, "KOBI_ERROR", "가이드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  // 코드가 지킬 규칙: 정의서 이름 대조, SQL 안전 검사, 완성 쿼리 첫 줄 검증 필요 표시
  const checked = checkNamesAgainstDef(raw, input.value.tableDef);
  const needsCheck = checked.needsCheck.filter((s) => s.trim() !== ""); // AI가 빈 문자열을 넣는 일이 있음

  // 자동 수정 1회 (PLAN 작업 8-2): 코드 검사에 걸리면 고칠 점을 AI에게 돌려보내 한 번만 다시 고치게 한다.
  // 고친 답이 더 나을 때(걸린 곳이 줄었을 때)만 쓰고, 실패하거나 나아지지 않으면 처음 답으로 아래 검사를 그대로 한다.
  let { skeleton: draftSkeleton, exampleQuery: draftQuery } = checked;
  const problemsOf = (sk: string, q: string) => [...sqlProblems("쿼리 뼈대", sk), ...sqlProblems("완성 쿼리 예시", q)];
  const problems = problemsOf(draftSkeleton, draftQuery);
  if (problems.length > 0) {
    try {
      const fix = await requestSqlFix(input.value, draftSkeleton, draftQuery, problems);
      if (isSqlFix(fix) && problemsOf(fix.skeleton, fix.exampleQuery).length < problems.length) {
        draftSkeleton = fix.skeleton;
        draftQuery = fix.exampleQuery;
        needsCheck.push(`코드 검사에서 걸린 ${problems.length}곳을 AI가 한 번 자동으로 고쳤어요. 고친 쿼리도 다시 검사했어요.`);
      }
    } catch (err) {
      console.error("guide: 자동 수정 실패", aiErrorLabel(err));
    }
  }

  const guard = (label: string, sql: string) => {
    const reason = unsafeSqlReason(sql);
    if (!reason) {
      needsCheck.push(...notOracleHints(label, sql));
      return sql;
    }
    needsCheck.push(`${label}를 숨겼어요 — ${reason}. 직접 작성해 주세요.`);
    return `-- (안전을 위해 숨김: ${reason})`;
  };
  const skeleton = guard("쿼리 뼈대", draftSkeleton);
  const exampleQuery = withVerifyHeader(guard("완성 쿼리 예시", draftQuery));
  const data = { ...checked, skeleton, exampleQuery, needsCheck };

  return Response.json({ data, mode: getAiProvider() } satisfies GuideResponse);
}
