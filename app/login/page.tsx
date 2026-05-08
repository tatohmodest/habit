import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { LoginContent } from "./login-content";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface)] px-4">
          <Loader2 className="size-8 animate-spin text-[var(--accent)]" aria-label="Loading" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
