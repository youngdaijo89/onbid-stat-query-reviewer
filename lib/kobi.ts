// Design Ref: §2.3 — KOBI 호출 (PLAN 작업 9). AI_PROVIDER=kobi일 때만 lib/ai.ts가 부른다.
// 서버 코드에서만 쓴다. KOBI_* 값은 여기서만 읽는다.
// KOBI 설명서를 받기 전이라, 사내 AI 게이트웨이가 흔히 쓰는 OpenAI 방식(/v1/chat/completions)으로 만들어 두고
// 다를 수 있는 부분(주소·인증 머리글·모델·JSON 모드·system 역할)은 .env로 바꿀 수 있게 했다 (INTRANET.md 2번).
import { AiConfigError } from "@/lib/aiErrors";
import { chatJson, type ChatTarget } from "@/lib/chatClient";
import { type ChatMessage, excelLabelMessages, guideMessages } from "@/lib/prompt";
import type { ExcelLabel, GuideRequest } from "@/lib/types";

const DEFAULT_MODEL = "gemma3-31b-it";
const DEFAULT_TIMEOUT_MS = 60_000; // PLAN SC-4: 1분 이내
const MAX_TIMEOUT_MS = 180_000;

// "on"/"off" 값 읽기 (없으면 기본값)
const flag = (value: string | undefined, fallback: boolean) =>
  value === undefined || value === "" ? fallback : value.toLowerCase() === "on";

function target(): ChatTarget {
  const url = process.env.KOBI_API_URL;
  if (!url) throw new AiConfigError("KOBI_API_URL 없음");
  const key = process.env.KOBI_API_KEY;
  // 인증 머리글 이름 — 기본은 "Authorization: Bearer 키", 설명서가 다르면 KOBI_AUTH_HEADER로 바꾼다 (예: x-api-key)
  const headerName = process.env.KOBI_AUTH_HEADER || "Authorization";
  const headers: Record<string, string> = {};
  if (key) headers[headerName] = headerName.toLowerCase() === "authorization" ? `Bearer ${key}` : key;

  const timeout = Number(process.env.KOBI_TIMEOUT_MS);
  return {
    name: "KOBI",
    url,
    model: process.env.KOBI_MODEL || DEFAULT_MODEL,
    headers,
    jsonMode: flag(process.env.KOBI_JSON_MODE, false), // Gemma는 JSON 모드를 지원하지 않는 경우가 많아 기본은 끔
    mergeSystem: flag(process.env.KOBI_MERGE_SYSTEM, true), // Gemma에는 system 역할이 없어 기본은 첫 질문에 붙임
    timeoutMs: timeout > 0 ? Math.min(timeout, MAX_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS,
  };
}

export function requestKobiGuide(request: GuideRequest): Promise<unknown> {
  return chatJson(target(), guideMessages(request));
}

// 이미 만들어 둔 지시문(예: 쿼리 자동 수정)을 그대로 보낸다
export function requestKobi(messages: ChatMessage[]): Promise<unknown> {
  return chatJson(target(), messages);
}

export function requestKobiExcelLabels(requirement: string, labels: ExcelLabel[]): Promise<unknown> {
  return chatJson(target(), excelLabelMessages(requirement, labels));
}
