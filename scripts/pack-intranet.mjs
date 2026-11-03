// 내부망 반입 묶음 만들기 — `npm run build` 뒤에 실행한다 (INTRANET.md 1번)
// .next/standalone + .next/static + public 을 intranet-package/ 한 폴더로 모은다. .env·글꼴 원본·소스는 넣지 않는다.
import { cpSync, existsSync, rmSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");
const out = join(root, "intranet-package");

if (!existsSync(join(standalone, "server.js"))) {
  console.error("먼저 npm run build 를 실행하세요 (.next/standalone/server.js 가 없음).");
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
cpSync(standalone, out, { recursive: true, dereference: true });
cpSync(join(root, ".next", "static"), join(out, ".next", "static"), { recursive: true });
cpSync(join(root, "public"), join(out, "public"), { recursive: true });

// 비밀 값 파일이 섞여 들어가지 않았는지 한 번 더 지운다
for (const name of readdirSync(out)) {
  if (name.startsWith(".env")) rmSync(join(out, name), { force: true });
}

// 내부망 서버에서 채울 설정 예시 (값은 비워 둠)
writeFileSync(
  join(out, "env.example.txt"),
  [
    "# 이 파일을 .env 로 이름을 바꾸고 값을 채운다. OpenAI 키는 넣지 않는다.",
    "AI_PROVIDER=kobi",
    "KOBI_API_URL=",
    "KOBI_API_KEY=",
    "KOBI_MODEL=gemma3-31b-it",
    "# KOBI_AUTH_HEADER=Authorization",
    "# KOBI_JSON_MODE=off",
    "# KOBI_MERGE_SYSTEM=on",
    "# KOBI_TIMEOUT_MS=60000",
    "PORT=3000",
    "HOSTNAME=0.0.0.0",
    "",
  ].join("\r\n"),
);

console.log(`완료: ${out}`);
console.log("실행: cd intranet-package && node server.js");
