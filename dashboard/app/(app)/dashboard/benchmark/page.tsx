import { redirect } from "next/navigation";

/**
 * Benchmark folded into Insights as a `?view=benchmark` sub-view — the
 * sidebar's five nav items come from the approved design and don't include
 * a standalone Benchmark item. This route is kept only so an old bookmark or
 * external link doesn't 404.
 */
export default function BenchmarkRedirect() {
  redirect("/dashboard/insights?view=benchmark");
}
