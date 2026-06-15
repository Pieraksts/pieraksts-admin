import Image from "next/image";

import { LoginForm } from "@/components/admin/login-form";

export const metadata = {
  title: "Sign in · Pieraksts Admin",
};

/** Only allow in-app redirect targets (mirrors the action's own guard). */
function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <Image
            src="/brand/logo.png"
            alt=""
            width={40}
            height={40}
            priority
            className="rounded-full"
          />
          <div>
            <h1 className="display-type text-[20px] font-extrabold tracking-[-0.01em]">
              Pieraksts Admin
            </h1>
            <p className="mt-1 text-[13px] text-ink-muted">
              Internal access only. Sign in to continue.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-hairline bg-card p-6 shadow-sm">
          <LoginForm next={safeNext(next)} />
        </div>
      </div>
    </main>
  );
}
