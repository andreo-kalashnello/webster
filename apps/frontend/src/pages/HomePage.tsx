import { LandingPage } from "./LandingPage";
import { DashboardPage } from "./DashboardPage";
import { PageSpinner } from "@/components/ui/PageSpinner";
import { useAuthStore } from "@/shared/stores/auth.store";

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-hero-gradient">
        <PageSpinner label="Loading…" />
      </div>
    );
  }

  if (user) {
    return <DashboardPage />;
  }

  return <LandingPage />;
}
