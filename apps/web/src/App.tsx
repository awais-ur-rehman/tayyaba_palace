import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/routes/protected-route";
import { LoginPage } from "@/routes/login";
import { BookingsListPage } from "@/routes/bookings/list";
import { BookingCreatePage } from "@/routes/bookings/create";
import { InventoryPage } from "@/routes/inventory/index";
import { SystemPage } from "@/routes/system/index";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/bookings" replace />} />
          <Route path="/bookings" element={<BookingsListPage />} />
          <Route path="/bookings/new" element={<BookingCreatePage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/system" element={<SystemPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
