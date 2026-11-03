// Design Ref: §2.4 — 테스트·검증용 OpenAI 호출 (PLAN 작업 8-1). AI_PROVIDER=openai일 때만 lib/ai.ts가 부른다.
// 내 PC 테스트 전용. OPENAI_API_KEY는 여기서만 읽고, Vercel 운영 환경에는 등록하지 않는다. 실패해도 다른 AI로 넘어가지 않는다.
import { AiConfigError, AiOffTaskError, AiTimeoutError, AiUpstreamError } from "@/lib/aiErrors";
import { excelLabelMessages, guideMessages, type ChatMessage } from "@/lib/prompt";
import type { ExcelLabel, GuideRequest } from "@/lib/types";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 60_000; // PLAN SC-4: 1분 이내
// 모델은 .env의 OPENAI_MODEL로 바꿀 수 있다 (없으면 기본값)
const DEFAULT_MODEL = "gpt-4o-mini";

async function chatJson(messages: ChatMessage[]): Promise<unknown> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new AiConfigError("OPENAI_API_KEY 없음");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        messages,
        temperature: 0, // 같은 입력이면 최대한 같은 답이 나오게
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new AiTimeoutError("OpenAI 60초 초과");
    throw new AiUpstreamError("OpenAI 연결 실패");
  } finally {
    clearTimeout(timer);
  }

  // 오류 내용(키·주소 등)은 화면으로 내보내지 않고 상태 코드로만 구분한다
  if (res.status === 401 || res.status === 403 || res.status === 404) throw new AiConfigError(`OpenAI ${res.status}`);
  if (!res.ok) throw new AiUpstreamError(`OpenAI ${res.status}`);

  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new AiUpstreamError("OpenAI 빈 답");
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AiUpstreamError("OpenAI 답이 JSON이 아님");
  }
  if (typeof parsed === "object" && parsed !== null && (parsed as { error?: unknown }).error === "OFF_TASK") {
    throw new AiOffTaskError("OFF_TASK");
  }
  return parsed;
}

export function requestOpenAiGuide(request: GuideRequest): Promise<unknown> {
  return chatJson(guideMessages(request));
}

export function requestOpenAiExcelLabels(requirement: string, labels: ExcelLabel[]): Promise<unknown> {
  return chatJson(excelLabelMessages(requirement, labels));
}
