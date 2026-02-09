import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StockImport from "./pages/StockImport";
import SalesImport from "./pages/SalesImport";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stock-import"
          element={
            <ProtectedRoute allow={["admin"]}>
              <StockImport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales-import"
          element={
            <ProtectedRoute allow={["admin"]}>
              <SalesImport />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
