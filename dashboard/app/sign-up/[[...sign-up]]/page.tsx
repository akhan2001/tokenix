import { redirect } from "next/navigation";

/**
 * Clerk's sign-up URL, pointed at the real one.
 *
 * `NEXT_PUBLIC_CLERK_SIGN_UP_URL` is /sign-up, so this is where Clerk's own
 * components send anyone who clicks "sign up" from the sign-in card. Rendering
 * a second <SignUp /> here would mean two doors with different behaviour: the
 * stock card cannot mint a workspace key, so people entering through it would
 * land on /connect and be asked to create one by hand — the exact friction
 * /signup exists to remove.
 *
 * A catch-all still, because Clerk owns sub-routes beneath this path.
 */
export default function SignUpRedirect() {
  redirect("/signup");
}
