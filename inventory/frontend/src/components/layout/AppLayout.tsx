import { Outlet, Navigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { PageTransition } from "./PageTransition";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface AppLayoutContext {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export function AppLayout() {
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  if (currentUser?.role === "vendeur") {
    return <Navigate to="/vendeur/dashboard" replace />;
  }

  // Global Ctrl+K listener — opens the command palette from anywhere
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

  return (
    <div className="flex h-screen overflow-hidden">
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
      <div className="flex-1 flex h-screen overflow-hidden">
        {/* Spacer — only rendered on md+ to reserve sidebar space */}
        <div
          className={[
            "hidden md:block shrink-0 transition-all duration-200",
            collapsed ? "w-[60px]" : "w-[240px]",
          ].join(" ")}
        />
        <main className="flex flex-col flex-1 h-screen overflow-y-auto min-w-0">
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

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
