import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "No access · Pieraksts Admin",
};

/**
 * Shown to a user who authenticated but is not on the `admin_users` allowlist
 * (e.g. a salon owner who signed in). Authorization lives in `admin_users`, not
 * `profiles.roles`, so being a salon owner grants nothing here.
 */
export default function ForbiddenPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-start gap-4">
        <p className="eyebrow">403</p>
        <h1 className="display-type text-[26px] font-extrabold tracking-[-0.02em]">
          No access
        </h1>
        <p className="text-[15px] leading-6 text-ink-muted">
          You&rsquo;re signed in, but this account isn&rsquo;t authorized for the
          Pieraksts back office. If you believe this is a mistake, ask an
          administrator to grant your account access, then sign in again.
        </p>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
