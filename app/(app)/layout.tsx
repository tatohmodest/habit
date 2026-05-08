import { AppBottomNav } from "@/components/AppBottomNav";
import { NativePushBootstrap } from "@/components/NativePushBootstrap";
import { requireProfile } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProfile();

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <NativePushBootstrap />
      {children}
      <AppBottomNav />
    </div>
  );
}
