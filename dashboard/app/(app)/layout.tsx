import type { ReactNode } from "react";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

/**
 * Shell for the authenticated product area.
 *
 * Deliberately does *not* gate on the session: `/connect` lives in this group
 * and gating here would bounce a signed-out visitor away from the one page
 * that can sign them in. Each data page calls `requireWorkspaceKey()` instead.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header page="index" />
      <div style={{ flex: 1 }}>{children}</div>
      <Footer />
    </div>
  );
}
