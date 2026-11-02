// Design Ref: §2.1·§2.3 — KOBI 호출 자리. 지금은 예시 응답 모드만 동작한다 (PLAN 작업 5)
// 서버 코드(app/api)에서만 가져다 쓴다. 화면 코드에서 import하지 않는다.
import mockGuide from "@/samples/mock-guide.json";
import type { GuideMode, GuideRequest } from "@/lib/types";

// USE_MOCK_AI가 정확히 "false"일 때만 실제 호출한다. 값이 없거나 오타여도 예시 응답 모드로 안전하게 동작한다.
export function getGuideMode(): GuideMode {
  return process.env.USE_MOCK_AI === "false" ? "kobi" : "mock";
}

export class KobiNotReadyError extends Error {}

// 결과 모양 검사는 호출한 쪽(route)에서 하므로 여기서는 받은 그대로(unknown) 돌려준다
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 실제 KOBI 연결(작업 9) 때 request를 쓴다
export async function requestGuide(request: GuideRequest): Promise<unknown> {
  if (getGuideMode() === "mock") {
    // 설명용 _comment 칸은 빼고 돌려준다
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _comment, ...data } = mockGuide;
    return data;
  }
  // PLAN 작업 9: KOBI 설명서를 받은 뒤 여기서 KOBI_API_URL·KOBI_API_KEY로 호출한다
  throw new KobiNotReadyError();
}
