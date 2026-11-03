// Design Ref: §2.4 — 테스트·검증용 OpenAI 호출 (PLAN 작업 8-1). AI_PROVIDER=openai일 때만 lib/ai.ts가 부른다.
// 내 PC 테스트 전용. OPENAI_API_KEY는 여기서만 읽고, Vercel 운영 환경·내부망 서버에는 등록하지 않는다. 실패해도 다른 AI로 넘어가지 않는다.
import { AiConfigError } from "@/lib/aiErrors";
import { chatJson, type ChatTarget } from "@/lib/chatClient";
import { excelLabelMessages, guideMessages } from "@/lib/prompt";
import type { ExcelLabel, GuideRequest } from "@/lib/types";

// 모델은 .env의 OPENAI_MODEL로 바꿀 수 있다 (없으면 기본값)
const DEFAULT_MODEL = "gpt-4o-mini";

function target(): ChatTarget {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new AiConfigError("OPENAI_API_KEY 없음");
  return {
    name: "OpenAI",
    url: "https://api.openai.com/v1/chat/completions",
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    headers: { Authorization: `Bearer ${key}` },
    jsonMode: true,
    mergeSystem: false,
    timeoutMs: 60_000, // PLAN SC-4: 1분 이내
  };
}

export function requestOpenAiGuide(request: GuideRequest): Promise<unknown> {
  return chatJson(target(), guideMessages(request));
}

export function requestOpenAiExcelLabels(requirement: string, labels: ExcelLabel[]): Promise<unknown> {
  return chatJson(target(), excelLabelMessages(requirement, labels));
}
