import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { AuthGateError, requireSignedIn } from "@/components/auth/AuthGate";

export const Route = createFileRoute("/_authed")({
  ssr: false,
  beforeLoad: requireSignedIn,
  errorComponent: AuthGateError,
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}