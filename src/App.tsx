/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import FarmerDashboard from "./pages/FarmerDashboard";
import IndustryDashboard from "./pages/IndustryDashboard";
import Marketplace from "./pages/Marketplace";
import Training from "./pages/Training";
import Funding from "./pages/Funding";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import Logout from "./pages/Logout";

/* 🔐 PROTECTED ROUTE (WORKING VERSION) */
function ProtectedRoute(props: { children: JSX.Element }) {
  const { children } = props;
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser();

      if (!data?.user) {
        navigate("/login");
      } else {
        setChecking(false);
      }
    }

    checkAuth();
  }, [navigate]);

  if (checking) return <div style={{ padding: "20px" }}>Checking authentication...</div>;

  return children;
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />

          {/* 🔒 PROTECTED ROUTES */}
          <Route
            path="/farmer"
            element={
              <ProtectedRoute>
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/industry"
            element={
              <ProtectedRoute>
                <IndustryDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/marketplace"
            element={
              <ProtectedRoute>
                <Marketplace />
              </ProtectedRoute>
            }
          />

          <Route
            path="/training"
            element={
              <ProtectedRoute>
                <Training />
              </ProtectedRoute>
            }
          />

          <Route
            path="/funding"
            element={
              <ProtectedRoute>
                <Funding />
              </ProtectedRoute>
            }
          />

          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />

          <Route
            path="/confirmation"
            element={
              <ProtectedRoute>
                <Confirmation />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}
