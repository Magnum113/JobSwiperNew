"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { LegalFooter } from "@/components/layout/legal-footer";
import { useAppStore } from "@/lib/store/use-app-store";
import { cn } from "@/lib/utils";

/**
 * Responsive app shell. Below `lg` it reproduces the original mobile layout
 * exactly: a single centered `max-w-2xl` column with the floating BottomNav.
 *
 * At `lg` it becomes a desktop shell — a left Sidebar rail + a content column —
 * so the page no longer floats as a narrow strip with empty edges. Two width
 * regimes share one root: app screens (feed/liked/profile) stay in a centered
 * reading column, while the public landing (`/` without a session) opts out of
 * the cap and renders full-width so it can lay out as a wide marketing page.
 *
 * Width is owned here (not in the root layout) precisely so the landing can be
 * wide while the app screens stay narrow — see ARCHITECTURE.md §13.1.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const authUser = useAppStore((s) => s.authUser);
  const authChecked = useAppStore((s) => s.authChecked);

  const isHome = pathname === "/";
  // `/` renders the guest landing until a verified session resolves (mirrors
  // home-client). Until then we treat it as landing: no sidebar, full width.
  const showingLanding = isHome && !(authChecked && authUser);
  const isAppRoute =
    (isHome && !showingLanding) ||
    pathname === "/liked" ||
    pathname.startsWith("/profile");

  return (
    <>
      <div className="app-aurora relative flex min-h-dvh w-full flex-col lg:flex-row">
        {isAppRoute && <Sidebar />}
        <div className="flex min-h-dvh w-full flex-1 flex-col">
          <main
            className={cn(
              "flex flex-1 flex-col pb-24 lg:pb-12",
              // Landing: full width (lays out its own wide marketing page).
              // App routes: narrow on mobile, full width on desktop so the page
              // owns its own desktop max-width (feed stays narrow, liked/profile
              // go wide). Other routes (legal/vakansii): always the reading column.
              showingLanding
                ? null
                : isAppRoute
                  ? "mx-auto w-full max-w-2xl lg:max-w-none"
                  : "mx-auto w-full max-w-2xl",
            )}
          >
            {children}
          </main>
          <LegalFooter />
        </div>
      </div>
      <BottomNav />
    </>
  );
}
