// AI 호출에서 생기는 오류 (Design Ref: §2.4, §6)
// lib/ai.ts와 각 공급자 파일이 서로를 불러오지 않도록 따로 둔다.

// 선택한 AI 공급자가 아직 구현되지 않았을 때
export class AiNotReadyError extends Error {}

// 키·주소 설정이 없거나 틀렸을 때 (401·403 등) — 화면에는 자세한 내용을 보이지 않는다
export class AiConfigError extends Error {}

// 정해진 시간(60초) 안에 답이 없을 때
export class AiTimeoutError extends Error {}

// AI 서버 오류·사용량 초과 등
export class AiUpstreamError extends Error {}

// 가이드 작성과 관계없는 요청이라 AI가 거절했을 때
export class AiOffTaskError extends Error {}

// 오류 → 화면에 보일 정해진 문장 (내부 내용·키·주소는 내보내지 않는다). /api/guide·/api/excel이 함께 쓴다.
export function aiFailure(err: unknown, what: string) {
  if (err instanceof AiNotReadyError)
    return { status: 503, code: "AI_NOT_READY", message: "선택한 AI 연결은 아직 준비 중이에요. 예시 응답 모드로 사용해 주세요." } as const;
  if (err instanceof AiConfigError)
    return { status: 503, code: "AI_CONFIG", message: "AI 설정(키·모델)을 확인해 주세요. 관리자에게 문의해 주세요." } as const;
  if (err instanceof AiTimeoutError)
    return { status: 504, code: "KOBI_TIMEOUT", message: "응답이 늦어지고 있어요. 다시 시도해 주세요." } as const;
  if (err instanceof AiOffTaskError)
    return { status: 422, code: "OFF_TASK", message: "통계 쿼리 작성과 관계없는 내용이라 처리하지 않았어요. 요구사항문을 확인해 주세요." } as const;
  return { status: 502, code: "KOBI_ERROR", message: `${what}하지 못했어요. 잠시 후 다시 시도해 주세요.` } as const;
}
