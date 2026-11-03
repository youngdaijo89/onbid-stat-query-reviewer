// 다른 사이트가 사용자 브라우저를 시켜 이 API를 부르는 것(CSRF)을 막는다 (보안 점검 2026-11-03)
// 내부망에서는 외부 악성 페이지가 팀원 브라우저를 거쳐 KOBI를 몰래 반복 호출하게 만들 수 있어 꼭 필요하다.
import type { ApiErrorCode } from "@/lib/types";

export type GuardFailure = { status: number; code: ApiErrorCode; message: string };

// 문제가 없으면 null, 막아야 하면 응답에 쓸 값을 돌려준다
export function rejectUnsafeRequest(request: Request): GuardFailure | null {
  // 1) 형식: ";" 앞이 정확히 application/json 일 때만 받는다.
  //    "text/plain; x=application/json"처럼 글자만 끼워 넣은 형식은 브라우저가 사전 확인 없이 보낼 수 있어 막는다.
  const mediaType = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    return { status: 415, code: "UNSUPPORTED_MEDIA_TYPE", message: "요청 형식이 올바르지 않아요." };
  }

  // 2) 출처: 브라우저가 붙여 주는 값으로, 같은 사이트 화면에서 온 요청만 받는다.
  //    두 값이 모두 없는 요청(서버·명령줄 도구)은 다른 사람의 브라우저를 빌린 공격이 아니므로 그대로 둔다.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return crossSite();

  const origin = request.headers.get("origin");
  if (origin) {
    // 내부망에서 프록시 뒤에 두면 host가 바뀔 수 있어 x-forwarded-host를 먼저 본다 (INTRANET.md 3번)
    const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      return crossSite();
    }
    if (!host || originHost !== host) return crossSite();
  }
  return null;
}

function crossSite(): GuardFailure {
  return { status: 403, code: "CROSS_SITE", message: "이 화면에서 보낸 요청만 처리할 수 있어요." };
}
