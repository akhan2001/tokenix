import { LABEL_SM } from "@/components/primitives";

/**
 * `STEP 01 / 03` — the onboarding progress marker.
 *
 * Deliberately not a progress bar. The landing page already marks sequence
 * with a mono ordinal (the numbered steps in the methodology section, the
 * `01`–`04` column on /connect), so a third pattern would have been a new
 * visual idea for something the page already knows how to say.
 *
 * The current step is amber, the total is faint: same figure/ground split the
 * section kickers use.
 */
export function StepTag({ step, total = 3 }: { step: number; total?: number }) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div style={{ ...LABEL_SM, color: "var(--ink-faint)", marginBottom: 18 }}>
      <span style={{ color: "var(--amber)" }}>STEP {pad(step)}</span>
      <span style={{ margin: "0 6px" }}>/</span>
      <span>{pad(total)}</span>
    </div>
  );
}
