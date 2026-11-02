// Design Ref: §2.4 — AI 공급자 선택. AI_PROVIDER로 하나만 정하고, 실패해도 다른 AI로 자동 전환하지 않는다.
// 서버 코드(app/api)에서만 가져다 쓴다. 화면 코드에서 import하지 않는다.
import mockGuide from "@/samples/mock-guide.json";
import { requestKobiGuide } from "@/lib/kobi";
import { requestOpenAiGuide } from "@/lib/openai";
import type { GuideMode, GuideRequest } from "@/lib/types";

// 값이 없거나 오타여도 예시 응답(mock)으로 안전하게 동작한다
export function getAiProvider(): GuideMode {
  const value = process.env.AI_PROVIDER;
  return value === "openai" || value === "kobi" ? value : "mock";
}

// 선택한 공급자가 아직 구현되지 않았을 때
export class AiNotReadyError extends Error {}

// 결과 모양 검사는 호출한 쪽(route)에서 하므로 여기서는 받은 그대로(unknown) 돌려준다
export async function requestGuide(request: GuideRequest): Promise<unknown> {
  switch (getAiProvider()) {
    case "openai":
      return requestOpenAiGuide(request);
    case "kobi":
      return requestKobiGuide(request);
    default: {
      // 설명용 _comment 칸은 빼고 돌려준다
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _comment, ...data } = mockGuide;
      return data;
    }
  }
}
