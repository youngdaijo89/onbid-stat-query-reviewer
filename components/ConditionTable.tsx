// Design Ref: §5.3 ConditionTable — ① 조건 분해표 (항목, 값, 원문 근거 3열)
import type { GuideResult } from "@/lib/types";

export default function ConditionTable({ conditions }: { conditions: GuideResult["conditions"] }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-black dark:text-zinc-50">조건 분해표</h3>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">항목</th>
              <th className="px-4 py-2 font-medium">값</th>
              <th className="px-4 py-2 font-medium">원문 근거</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {conditions.map((c, i) => (
              <tr key={i} className="align-top">
                <td className="whitespace-nowrap px-4 py-2 font-medium text-black dark:text-zinc-100">{c.item}</td>
                <td className="px-4 py-2 text-black dark:text-zinc-100">{c.value}</td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">“{c.source}”</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
