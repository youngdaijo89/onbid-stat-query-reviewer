# 글꼴 파일

인터넷이 없는 내부망에서도 빌드되도록 글꼴을 프로젝트 안에 넣어 두었다 (`app/layout.tsx`에서 `next/font/local`로 읽음).

| 파일 | 글꼴 | 범위 | 라이선스 |
|---|---|---|---|
| `geist-latin.woff2` | Geist (가변 100–900) | 기본 라틴 글자 | SIL Open Font License 1.1 |
| `geist-mono-latin.woff2` | Geist Mono (가변 100–900) | 기본 라틴 글자 | SIL Open Font License 1.1 |
| `urbanist-latin.woff2` | Urbanist (600–700) | 기본 라틴 글자 | SIL Open Font License 1.1 |

- 한글은 이 글꼴에 없으므로 사용자 PC의 기본 한글 글꼴로 보인다 (전과 같음).
- 이전에 `next/font/google`이 빌드 때 내려받던 파일과 같은 파일이다.
