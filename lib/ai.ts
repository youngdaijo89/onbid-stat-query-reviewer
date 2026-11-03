// Design Ref: §2.4 — AI 공급자 선택. AI_PROVIDER로 하나만 정하고, 실패해도 다른 AI로 자동 전환하지 않는다.
// 서버 코드(app/api)에서만 가져다 쓴다. 화면 코드에서 import하지 않는다.
import mockExcel from "@/samples/mock-excel.json";
import mockGuide from "@/samples/mock-guide.json";
import { AiNotReadyError } from "@/lib/aiErrors";
import { requestKobiExcelLabels, requestKobiGuide } from "@/lib/kobi";
import { requestOpenAiExcelLabels, requestOpenAiGuide } from "@/lib/openai";
import type { ExcelLabel, GuideMode, GuideRequest } from "@/lib/types";

export { AiNotReadyError };

// 값이 없거나 오타여도 예시 응답(mock)으로 안전하게 동작한다
export function getAiProvider(): GuideMode {
  const value = process.env.AI_PROVIDER;
  return value === "openai" || value === "kobi" ? value : "mock";
}

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

// 엑셀 제목·단위·머리글의 기간·단위를 요구사항문과 대조 (PLAN 작업 12)
export async function requestExcelLabelCheck(requirement: string, labels: ExcelLabel[]): Promise<unknown> {
  const provider = getAiProvider();
  if (provider === "openai") return requestOpenAiExcelLabels(requirement, labels);
  if (provider === "kobi") return requestKobiExcelLabels(requirement, labels);
  // 예시는 같은 칸에 같은 글자가 있을 때만 돌려준다 (excel-01 전용 예시가 다른 엑셀에 붙지 않게)
  const issues = mockExcel.issues.filter((x) => labels.some((l) => l.cell === x.cell && l.text === x.whenText));
  return { issues };
}
