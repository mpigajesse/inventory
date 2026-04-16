import { Outlet, Navigate } from "react-router-dom";
import { VendeurSidebar } from "./VendeurSidebar";
import { useState } from "react";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

export function VendeurLayout() {
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (currentUser?.role === "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
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
      <div className="flex-1 flex h-screen overflow-hidden">
        {/* Spacer — only rendered on md+ to reserve sidebar space */}
        <div
          className={[
            "hidden md:block shrink-0 transition-all duration-200",
            collapsed ? "w-[60px]" : "w-[240px]",
          ].join(" ")}
        />
        <main className="flex flex-col flex-1 h-screen overflow-y-auto min-w-0">
          <Outlet
            context={
              {
                onMenuClick: () => setMobileOpen(true),
                onSearchClick: () => {},
              } satisfies AppLayoutContext
            }
          />
        </main>
      </div>
    </div>
  );
}
