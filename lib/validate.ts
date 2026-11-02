// Design Ref: §2.2 ① — 입력 검사. 브라우저와 서버가 같은 함수를 써서 두 번 검사한다 (PLAN 작업 4)
import type { GuideRequest } from "@/lib/types";

// PRD must ① 규칙 9 (초기값)
export const MAX_REQUIREMENT_CHARS = 2000;
export const MAX_TABLEDEF_LINES = 500;

// 줄 수 세기 (빈 입력은 0줄)
export function countLines(text: string): number {
  if (text.trim() === "") return 0;
  return text.split(/\r\n|\r|\n/).length;
}

export type ValidationResult = { ok: true; value: GuideRequest } | { ok: false; message: string };

// 화면을 거치지 않은 요청도 있을 수 있으므로 unknown으로 받아 모양부터 확인한다
export function validateGuideInput(input: unknown): ValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, message: "요청 형식이 올바르지 않아요." };
  }
  const { requirement, tableDef } = input as Record<string, unknown>;
  if (typeof requirement !== "string" || typeof tableDef !== "string") {
    return { ok: false, message: "요구사항문과 테이블 정의서는 글자로 입력해 주세요." };
  }
  if (requirement.trim() === "" || tableDef.trim() === "") {
    return { ok: false, message: "요구사항문과 테이블 정의서를 모두 입력해 주세요." };
  }
  if (requirement.length > MAX_REQUIREMENT_CHARS) {
    return {
      ok: false,
      message: `요구사항문은 ${MAX_REQUIREMENT_CHARS.toLocaleString()}자까지 입력할 수 있어요.`,
    };
  }
  if (countLines(tableDef) > MAX_TABLEDEF_LINES) {
    return { ok: false, message: `테이블 정의서는 ${MAX_TABLEDEF_LINES}줄까지 입력할 수 있어요.` };
  }
  return { ok: true, value: { requirement, tableDef } };
}
