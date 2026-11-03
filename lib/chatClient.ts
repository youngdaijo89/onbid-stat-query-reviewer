// Design Ref: §2.4 — OpenAI 방식(/v1/chat/completions) AI 호출 공통 부분. OpenAI·KOBI가 함께 쓴다.
// 서버 코드에서만 쓴다. 실패해도 다른 AI로 넘어가지 않는다.
import { AiConfigError, AiOffTaskError, AiTimeoutError, AiUpstreamError } from "@/lib/aiErrors";
import type { ChatMessage } from "@/lib/prompt";

export interface ChatTarget {
  name: string; // 오류 기록용 이름 (예: "OpenAI", "KOBI")
  url: string; // chat/completions 전체 주소
  model: string;
  headers: Record<string, string>; // 인증 머리글
  jsonMode: boolean; // response_format(JSON 모드)을 보낼지 — 지원하지 않는 모델이 있음
  mergeSystem: boolean; // system 역할이 없는 모델(Gemma 등)이면 지시문을 첫 질문 앞에 붙인다
  timeoutMs: number;
}

// system 지시문을 user 글 앞에 붙여 한 덩어리로 만든다
function mergeSystemIntoUser(messages: ChatMessage[]): ChatMessage[] {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");
  if (!system || rest.length === 0) return messages;
  const [first, ...others] = rest;
  return [{ role: "user", content: `${system}\n\n${first.content}` }, ...others];
}

// 답이 ```json … ``` 으로 감싸져 있거나 앞뒤에 설명이 붙어 있어도 JSON 객체 부분만 꺼낸다
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const body = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(body);
  } catch {
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("JSON 없음");
    return JSON.parse(body.slice(start, end + 1));
  }
}

export async function chatJson(target: ChatTarget, messages: ChatMessage[]): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), target.timeoutMs);
  let res: Response;
  try {
    res = await fetch(target.url, {
      method: "POST",
      headers: { ...target.headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: target.model,
        messages: target.mergeSystem ? mergeSystemIntoUser(messages) : messages,
        temperature: 0, // 같은 입력이면 최대한 같은 답이 나오게
        ...(target.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new AiTimeoutError(`${target.name} 시간 초과`);
    throw new AiUpstreamError(`${target.name} 연결 실패`);
  } finally {
    clearTimeout(timer);
  }

  // 오류 내용(키·주소 등)은 화면으로 내보내지 않고 상태 코드로만 구분한다
  if (res.status === 401 || res.status === 403 || res.status === 404) throw new AiConfigError(`${target.name} ${res.status}`);
  if (!res.ok) throw new AiUpstreamError(`${target.name} ${res.status}`);

  let content: string | undefined;
  try {
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    content = body.choices?.[0]?.message?.content;
  } catch {
    throw new AiUpstreamError(`${target.name} 답 형식이 다름`);
  }
  if (!content) throw new AiUpstreamError(`${target.name} 빈 답`);
  let parsed: unknown;
  try {
    parsed = extractJson(content);
  } catch {
    throw new AiUpstreamError(`${target.name} 답이 JSON이 아님`);
  }
  if (typeof parsed === "object" && parsed !== null && (parsed as { error?: unknown }).error === "OFF_TASK") {
    throw new AiOffTaskError("OFF_TASK");
  }
  return parsed;
}
