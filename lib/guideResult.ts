// Design Ref: §2.2 ① — AI 답이 정해진 모양(GuideResult)인지 검사하고, 화면에 보이기 전에 코드가 지킬 규칙을 적용한다
import type { GuideResult } from "@/lib/types";

const isString = (v: unknown): v is string => typeof v === "string";
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function isGuideResult(v: unknown): v is GuideResult {
  if (!isObject(v)) return false;
  return (
    isString(v.summary) &&
    isString(v.skeleton) &&
    isString(v.exampleQuery) &&
    isStringArray(v.needsCheck) &&
    Array.isArray(v.conditions) &&
    v.conditions.every((c) => isObject(c) && isString(c.item) && isString(c.value) && isString(c.source)) &&
    Array.isArray(v.tables) &&
    v.tables.every(
      (t) =>
        isObject(t) &&
        isString(t.table) &&
        isStringArray(t.columns) &&
        isString(t.joinNote) &&
        (t.status === "확인됨" || t.status === "확인 필요"),
    ) &&
    Array.isArray(v.cautions) &&
    v.cautions.every(
      (c) => isObject(c) && isString(c.text) && (c.level === "높음" || c.level === "중간" || c.level === "낮음"),
    )
  );
}

// PRD must ① 규칙 5 — 완성 쿼리 예시 첫 줄의 검증 필요 표시는 AI 답에 기대지 않고 코드가 항상 붙인다
export const VERIFY_NOTICE = "예시 — 실행 전 작성자 검증 필요";

export function withVerifyHeader(query: string): string {
  const lines = query.split(/\r\n|\r|\n/);
  const body = lines[0]?.includes(VERIFY_NOTICE) ? lines.slice(1) : lines;
  return [`-- ${VERIFY_NOTICE}`, ...body].join("\n");
}
