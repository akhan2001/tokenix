import { SignIn } from "@clerk/nextjs";

/**
 * Catch-all so Clerk can own its own sub-routes (factor-two, reset, and so on)
 * without each needing a file here.
 */
export default function SignInPage() {
  return (
    <main
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-section-md) 20px",
      }}
    >
      <SignIn />
    </main>
  );
}
