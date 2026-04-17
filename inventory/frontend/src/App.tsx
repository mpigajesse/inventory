import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { VendeurLayout } from "@/components/layout/VendeurLayout";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { lazy, Suspense } from "react";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const StockPage = lazy(() => import("./pages/StockPage"));
const PosPage = lazy(() => import("./pages/PosPage"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const BarcodesPage = lazy(() => import("./pages/BarcodesPage"));
const SuppliersPage = lazy(() => import("./pages/SuppliersPage"));
const ProductFormPage = lazy(() => import("./pages/products/ProductFormPage"));
const ClientFormPage = lazy(() => import("./pages/clients/ClientFormPage"));
const SupplierFormPage = lazy(() => import("./pages/suppliers/SupplierFormPage"));
const VendeurDashboardPage = lazy(() => import("./pages/vendeur/VendeurDashboardPage"));
const VendeurPosPage = lazy(() => import("./pages/vendeur/VendeurPosPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const AdminOverviewPage = lazy(() => import("./pages/admin/AdminOverviewPage"));
const ActivityLogPage = lazy(() => import("./pages/admin/ActivityLogPage"));
const PermissionsPage = lazy(() => import("./pages/admin/PermissionsPage"));
const UserDetailPage = lazy(() => import("./pages/admin/UserDetailPage"));
const VendeurMonitorPage = lazy(() => import("./pages/admin/VendeurMonitorPage"));
const StatisticsPage = lazy(() => import("./pages/StatisticsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const App = () => (
  <AuthProvider>
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors position="top-right" />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/auth/login" replace />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />

            <Route element={<AppLayout />}>
              {/* Routes accessibles à tous les rôles authentifiés */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/pos" element={<PosPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/new" element={<ClientFormPage />} />
              <Route path="/clients/:id/edit" element={<ClientFormPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Routes admin-only */}
              <Route
                path="/products"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <ProductsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/products/new"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <ProductFormPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/products/:id/edit"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <ProductFormPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/categories"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <CategoriesPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/stock"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <StockPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/users"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <UsersPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/users/:id"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <UserDetailPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/reports"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <ReportsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/settings"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <SettingsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/suppliers"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <SuppliersPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/suppliers/new"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <SupplierFormPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/suppliers/:id/edit"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <SupplierFormPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/barcodes"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <BarcodesPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/statistics"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <StatisticsPage />
                  </RoleGuard>
                }
              />
            </Route>

            {/* Espace vendeur */}
            <Route element={<VendeurLayout />}>
              <Route path="/vendeur" element={<Navigate to="/vendeur/dashboard" replace />} />
              <Route path="/vendeur/dashboard" element={<VendeurDashboardPage />} />
              <Route path="/vendeur/pos"       element={<VendeurPosPage />} />
              <Route path="/vendeur/invoices"  element={<InvoicesPage />} />
              <Route path="/vendeur/clients"   element={<ClientsPage />} />
              <Route path="/vendeur/clients/new"       element={<ClientFormPage />} />
              <Route path="/vendeur/clients/:id/edit"  element={<ClientFormPage />} />
              <Route path="/vendeur/settings"  element={<SettingsPage />} />
              <Route path="/vendeur/profile"   element={<ProfilePage />} />
            </Route>

            {/* Admin — routes /admin/* */}
            <Route element={<AppLayout />}>
              <Route
                path="/admin/overview"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <AdminOverviewPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/activity"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <ActivityLogPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/permissions"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <PermissionsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/admin/vendeurs"
                element={
                  <RoleGuard allowedRoles={["admin"]}>
                    <VendeurMonitorPage />
                  </RoleGuard>
                }
              />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </AuthProvider>
);

export default App;
