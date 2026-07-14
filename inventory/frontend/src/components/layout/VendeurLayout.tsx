import { Outlet, Navigate, useLocation } from "react-router-dom";
import { VendeurSidebar } from "./VendeurSidebar";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

function VendeurLayoutInner() {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();
  const { collapsed, setCollapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  if (currentUser.role === "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-dvh w-screen max-w-full overflow-hidden">
      <VendeurSidebar
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
            "hidden md:block shrink-0 transition-all duration-200",
            collapsed ? "w-[60px]" : "w-[240px]",
          ].join(" ")}
        />
        <main
          className="flex flex-col flex-1 h-dvh min-w-0 max-w-full overflow-x-hidden overflow-y-auto"
          style={{ scrollBehavior: "smooth" }}
        >
          {/* Réserve la hauteur RÉELLE de la bottom nav mobile = 64px (h-16)
              + la safe-area (barre home iPhone), sinon la nav recouvre le bas
              (bouton Encaisser de la caisse). md:pb-0 car la nav est md:hidden. */}
          <div className="flex flex-col flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            <Outlet
              context={
                {
                  onMenuClick: () => setMobileOpen(true),
                  onSearchClick: () => {},
                } satisfies AppLayoutContext
              }
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export function VendeurLayout() {
  return (
    <SidebarProvider>
      <VendeurLayoutInner />
    </SidebarProvider>
  );
}
