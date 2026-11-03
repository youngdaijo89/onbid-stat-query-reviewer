# 내부망 반입·설치 안내

> 부서 내부망 서버에 이 앱을 옮겨 KOBI API(예: `gemma3-31b-it`)로 쓰기 위한 안내서다.
> 인터넷이 되는 PC에서 **빌드·묶음**을 만들고, 내부망 서버에는 **묶음 폴더만** 옮긴다.

## 0. 반입 전에 정할 것 (앱 밖의 일)

- [ ] **PRD 범위 변경**: PRD 6번 비범위 "실제 온비드 운영 데이터 사용", 7번 "가상 데이터만" 규칙을 내부망 사용에 맞게 고칠지 결정한다.
  - 고치기 전까지 화면의 "가상 데이터만 입력하세요" 안내는 그대로 둔다.
- [ ] **반입 승인**: 소스·실행 파일 반입 절차와 보안 검토 대상인지 확인한다.
- [ ] **KOBI 설명서**: 주소, 인증 방식(머리글 이름), 요청·응답 형식, 모델 이름, 한 번에 보낼 수 있는 글자(토큰) 수, 응답 시간 제한.
- [ ] **서버**: 내부망 서버에 Node.js 20 이상이 설치돼 있는지 확인한다.

## 1. 묶음 만들기 (인터넷 되는 PC)

```bash
npm run build
npm run pack:intranet
```

- `intranet-package/` 폴더가 생긴다 (약 24MB, `node_modules` 포함 — 서버에서 `npm install` 필요 없음).
- 글꼴은 `app/fonts`에 들어 있어 빌드할 때 인터넷에서 받지 않는다.
- `.env`는 묶음에 들어가지 않는다. 대신 빈 설정 예시 `env.example.txt`가 들어간다.
- 서버 OS가 다르면(예: 빌드는 Windows, 서버는 Linux) 이미지 처리 모듈(`sharp`)이 맞지 않을 수 있다. 가능하면 서버와 같은 OS에서 빌드한다.

## 2. 서버 설정 (`intranet-package/.env`)

`env.example.txt`를 `.env`로 이름을 바꾸고 채운다. **OpenAI 키는 넣지 않는다.**

| 변수 | 기본값 | 설명 |
|---|---|---|
| `AI_PROVIDER` | `mock` | `kobi`로 둔다 |
| `KOBI_API_URL` | (필수) | chat/completions **전체 주소** (예: `http://kobi.내부주소/v1/chat/completions`) |
| `KOBI_API_KEY` | 없음 | 키가 필요 없는 게이트웨이면 비워 둔다 |
| `KOBI_MODEL` | `gemma3-31b-it` | 설명서의 정확한 모델 이름 |
| `KOBI_AUTH_HEADER` | `Authorization` | 기본은 `Authorization: Bearer 키`. 설명서가 `x-api-key` 같은 다른 머리글이면 그 이름을 적는다 (키만 그대로 보냄) |
| `KOBI_JSON_MODE` | `off` | KOBI가 `response_format`(JSON 모드)을 지원하면 `on` |
| `KOBI_MERGE_SYSTEM` | `on` | Gemma는 system 역할이 없어 지시문을 첫 질문 앞에 붙인다. system을 지원하면 `off` |
| `KOBI_TIMEOUT_MS` | `60000` | 응답 기다리는 시간 (최대 180000) |
| `PORT` / `HOSTNAME` | `3000` / `0.0.0.0` | 서버 포트·주소 |

## 3. 실행

```bash
cd intranet-package
node server.js
```

- 브라우저에서 `http://서버주소:3000`으로 연다.
- 서버를 계속 켜 두려면 Windows 작업 스케줄러나 서비스 등록 도구를 쓴다 (부서 서버 운영 방식에 맞춘다).

## 4. 처음 켠 뒤 확인

1. 가이드 결과 위에 "예시 응답 모드" 표시가 **없는지** 본다 (있으면 `AI_PROVIDER`가 `kobi`가 아님).
2. `samples/requirements/req-01~05.txt` + `samples/table-definition.txt`로 가이드를 만들어 `samples/answer-key.md`와 비교한다 (PLAN SC-1·SC-2·SC-4).
3. 오류가 나면 서버 창의 로그를 본다. 로그에는 입력 내용·키·주소 없이 이렇게만 남는다:

| 로그 | 뜻 | 해볼 것 |
|---|---|---|
| `AiConfig: KOBI_API_URL 없음` | 주소 설정 없음 | `.env` 확인 |
| `AiConfig: KOBI 401` / `403` / `404` | 키·머리글·주소·모델 이름 틀림 | `KOBI_API_KEY`, `KOBI_AUTH_HEADER`, `KOBI_API_URL`, `KOBI_MODEL` |
| `AiUpstream: KOBI 400` | 요청 형식을 KOBI가 거절 | `KOBI_JSON_MODE=off`, `KOBI_MERGE_SYSTEM=on` 확인 |
| `AiUpstream: KOBI 답이 JSON이 아님` | 모델이 JSON 대신 글로 답함 | 지시문(`lib/prompt.ts`) 보완 필요 |
| `AiUpstream: KOBI 연결 실패` | 서버에서 KOBI 주소로 접속 안 됨 | 방화벽·주소 확인 |
| `AiTimeout: KOBI 시간 초과` | 답이 늦음 | `KOBI_TIMEOUT_MS`를 늘려 보고, 오래 걸리면 담당 부서와 상의 |

## 5. 반입 전에 내 PC에서 시험한 것 (2026-11-03)

Gemma처럼 동작하는 **가짜 KOBI 서버**(system 역할·JSON 모드를 받으면 거절, 답을 ```json 으로 감싸서 줌)로 묶음을 실행해 확인했다.

- 가이드 생성 200, 엑셀 기간·단위 대조 200, 관계없는 요청 → `OFF_TASK`, KOBI 꺼짐 → "다시 시도" 안내
- KOBI로 보낸 요청: 모델 `gemma3-31b-it`, 역할은 user만, JSON 모드 없음
- 보안 머리글 적용, 화면에서 구글 글꼴 주소를 부르지 않음

**실제 KOBI로는 아직 시험하지 않았다.** 실제 응답 형식이 다르면 `lib/chatClient.ts`를 고쳐야 할 수 있다.
