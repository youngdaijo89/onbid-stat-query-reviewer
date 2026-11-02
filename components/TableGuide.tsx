// Design Ref: §5.3 TableGuide — ② 테이블 안내 (테이블, 컬럼, JOIN, 상태 4열, "확인 필요" 강조)
import type { GuideResult } from "@/lib/types";

export default function TableGuide({ tables }: { tables: GuideResult["tables"] }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-black dark:text-zinc-50">테이블 안내</h3>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">테이블</th>
              <th className="px-4 py-2 font-medium">컬럼</th>
              <th className="px-4 py-2 font-medium">JOIN·쓰임</th>
              <th className="px-4 py-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {tables.map((t, i) => {
              const needsCheck = t.status === "확인 필요";
              return (
                <tr key={i} className={`align-top ${needsCheck ? "bg-red-50 dark:bg-red-950/40" : ""}`}>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs font-semibold text-black dark:text-zinc-100">
                    {t.table}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-black dark:text-zinc-100">{t.columns.join(", ")}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{t.joinNote}</td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        needsCheck
                          ? "bg-red-600 text-white"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
