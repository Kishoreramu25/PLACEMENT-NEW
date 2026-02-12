import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ThemeInit } from "@/components/ThemeInit";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Dashboard Pages
import TPOOverview from "./pages/Dashboard/PlacementOfficer/Overview";
import Companies from "./pages/Dashboard/PlacementOfficer/Companies";
import Drives from "./pages/Dashboard/PlacementOfficer/Drives";
import Statistics from "./pages/Dashboard/PlacementOfficer/Statistics";
import Reports from "./pages/Dashboard/PlacementOfficer/Reports";
import CoordinatorOverview from "./pages/Dashboard/DepartmentCoordinator/Overview";
import DepartmentDrives from "./pages/Dashboard/DepartmentCoordinator/DepartmentDrives";
import ManagementOverview from "./pages/Dashboard/Management/Overview";
import Placements from "./pages/Placements";
import AddPlacement from "./pages/Dashboard/PlacementOfficer/AddPlacement";
import MasterData from "./pages/Dashboard/PlacementOfficer/MasterData";
import StudentRecords from "./pages/Dashboard/PlacementOfficer/StudentRecords";
import Settings from "./pages/Dashboard/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeInit />
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* TPO Routes */}
            <Route
              path="/dashboard/tpo"
              element={
                <ProtectedRoute allowedRoles={["placement_officer"]}>
                  <TPOOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/tpo/companies"
              element={
                <ProtectedRoute allowedRoles={["placement_officer"]}>
                  <Companies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/tpo/drives"
              element={
                <ProtectedRoute allowedRoles={["placement_officer"]}>
                  <Drives />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/tpo/statistics"
              element={
                <ProtectedRoute allowedRoles={["placement_officer"]}>
                  <Statistics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/tpo/reports"
              element={
                <ProtectedRoute allowedRoles={["placement_officer"]}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/tpo/add-placement"
              element={
                <ProtectedRoute allowedRoles={["placement_officer"]}>
                  <AddPlacement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/tpo/master-data"
              element={
                <ProtectedRoute allowedRoles={["placement_officer"]}>
                  <MasterData />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/tpo/student-placements"
              element={
                <ProtectedRoute allowedRoles={["placement_officer"]}>
                  <StudentRecords />
                </ProtectedRoute>
              }
            />

            {/* HOD Routes */}
            <Route
              path="/dashboard/coordinator"
              element={
                <ProtectedRoute allowedRoles={["department_coordinator"]}>
                  <CoordinatorOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/coordinator/drives"
              element={
                <ProtectedRoute allowedRoles={["department_coordinator"]}>
                  <DepartmentDrives />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/coordinator/student-placements"
              element={
                <ProtectedRoute allowedRoles={["department_coordinator"]}>
                  <StudentRecords />
                </ProtectedRoute>
              }
            />

            {/* Management Routes */}
            <Route
              path="/dashboard/management"
              element={
                <ProtectedRoute allowedRoles={["management"]}>
                  <ManagementOverview />
                </ProtectedRoute>
              }
            />

            {/* Common Settings */}
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute allowedRoles={["placement_officer", "department_coordinator", "management"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Public Placement Repository */}
            <Route path="/placements" element={<Placements />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;