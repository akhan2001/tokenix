import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { SignupPanel } from "@/components/onboarding/signup-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get your reference rate · Tokenix",
  description: "Create a Tokenix workspace and get your gateway key in one click.",
};

/**
 * The public front door. A server shell so an existing session never has to
 * watch the OAuth buttons paint before being sent on.
 */
export default async function SignupPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return <SignupPanel />;
}
