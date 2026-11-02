// Design Ref: §2.4 — 테스트·검증용 OpenAI 호출 자리 (PLAN 작업 8-1). AI_PROVIDER=openai일 때만 lib/ai.ts가 부른다.
// 내 PC 테스트 전용. OPENAI_API_KEY는 여기서만 읽고, Vercel 운영 환경에는 등록하지 않는다.
import { AiNotReadyError } from "@/lib/ai";
import type { GuideRequest } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 작업 8-1에서 지시문(lib/prompt.ts)과 함께 구현한다
export async function requestOpenAiGuide(request: GuideRequest): Promise<unknown> {
  throw new AiNotReadyError("OpenAI");
}
