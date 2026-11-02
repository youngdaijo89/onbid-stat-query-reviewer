// Design Ref: §5.1 — 첫 화면 위쪽(제목·설명·가상 데이터 경고)을 먼저 만든다.
// 입력칸과 결과 영역은 PLAN 작업 3 이후에 이 아래에 붙인다.

// 사용 순서 안내 (PRD 4번 이용 흐름 요약)
const STEPS = [
  {
    title: "요구사항문과 테이블 정의서 붙여넣기",
    detail: "요청처가 보낸 원문과, 쓸 테이블의 정의서를 그대로 넣어요.",
  },
  {
    title: "쿼리 작성 가이드 확인",
    detail: "조건 분해표, 테이블 안내, 주의사항, Oracle 쿼리 예시를 보고 직접 쿼리를 완성해요.",
  },
  {
    title: "결과 엑셀 점검과 보고서 출력",
    detail: "뽑은 엑셀의 합계·소계를 점검하고, 결재에 첨부할 보고서를 PDF로 저장해요.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-10 bg-white px-6 py-16 sm:px-16 dark:bg-black">
        {/* 앱 이름과 한 줄 설명 */}
        <header className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
            온비드 쿼리 리뷰어
          </h1>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            감사·자료 제출용 통계 쿼리를 어떤 방향으로 작성할지 안내하고, 결과 엑셀의 합계 오류를
            점검해 주는 도구입니다.
          </p>
        </header>

        {/* 가상 데이터 경고 (PRD 7번, DESIGN §7 "항상 표시") */}
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
        >
          <p className="font-semibold">⚠ 가상 데이터만 입력하세요</p>
          <p className="mt-1 text-sm leading-6">
            입력한 내용은 AI(KOBI)로 전송됩니다. 실제 업무 자료, 실제 테이블 이름, 개인정보는 넣지
            마세요.
          </p>
        </div>

        {/* 사용 순서 */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">이렇게 사용해요</h2>
          <ol className="flex flex-col gap-3">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-lg border border-zinc-200 px-5 py-4 dark:border-zinc-800"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white dark:bg-zinc-50 dark:text-black">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-black dark:text-zinc-50">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 아직 만들지 않은 입력 화면 안내 */}
        <p className="text-sm text-zinc-500">입력 화면은 준비 중입니다.</p>
      </main>
    </div>
  );
}
