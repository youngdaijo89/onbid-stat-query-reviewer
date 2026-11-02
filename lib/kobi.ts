// Design Ref: §2.3 — KOBI 호출 자리 (PLAN 작업 9). AI_PROVIDER=kobi일 때만 lib/ai.ts가 부른다.
// 서버 코드에서만 쓴다. KOBI_API_URL·KOBI_API_KEY는 여기서만 읽는다.
import { AiNotReadyError } from "@/lib/aiErrors";
import type { GuideRequest } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 실제 KOBI 연결(작업 9) 때 request를 쓴다
export async function requestKobiGuide(request: GuideRequest): Promise<unknown> {
  // PLAN 작업 9: KOBI 설명서를 받은 뒤 여기서 KOBI_API_URL·KOBI_API_KEY로 호출한다
  throw new AiNotReadyError("KOBI");
}
