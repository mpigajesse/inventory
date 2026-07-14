import { Outlet, Navigate, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { PageTransition } from "./PageTransition";
import { AdminActivityToast } from "./AdminActivityToast";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export interface AppLayoutContext {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

function AppLayoutInner() {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();
  const { collapsed, setCollapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // Global Ctrl+K listener — must be before any early return (Rules of Hooks)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (currentUser.role === "vendeur") {
    return <Navigate to="/vendeur/dashboard" replace />;
  }

  return (
    <div
      className="flex h-dvh w-screen max-w-full overflow-hidden"
      style={{ background: "hsl(30 20% 97%)" }}
    >
      <AppSidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />
      {/*
        The sidebar is fixed-positioned.
        On desktop (md+): push content right with a spacer div matching sidebar width.
        On mobile: sidebar overlays content — no spacer, content uses full width.
      */}
      <div className="flex-1 flex h-dvh min-w-0 max-w-full overflow-hidden">
        {/* Spacer — only rendered on md+ to reserve sidebar space */}
        <div
          className={[
            "hidden md:block shrink-0",
            collapsed ? "w-[64px]" : "w-[256px]",
          ].join(" ")}
          style={{ transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
        <main
          className="flex flex-col flex-1 h-dvh min-w-0 max-w-full overflow-x-hidden overflow-y-auto"
          style={{ background: "hsl(30 20% 97%)", scrollBehavior: "smooth" }}
        >
          <PageTransition>
            <Outlet
              context={
                {
                  onMenuClick: () => setMobileOpen(true),
                  onSearchClick: () => setCommandOpen(true),
                } satisfies AppLayoutContext
              }
            />
          </PageTransition>
        </main>
      </div>

      {currentUser?.role === "admin" && <AdminActivityToast />}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutInner />
    </SidebarProvider>
  );
}
