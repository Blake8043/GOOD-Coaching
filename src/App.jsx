// FILE: src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import FloatingQuickQuote from "./components/FloatingQuickQuote";
import NotificationBell from "./components/NotificationBell";

import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";

import { PrivateRoute, PortalRedirect, RoleRoute } from "./components/RouteGuards";

// Core pages
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import FAQ from "./pages/FAQ";
import Testimonials from "./pages/Testimonials";
import Contact from "./pages/Contact";
import Payments from "./pages/Payments";
import Messages from "./pages/Messages";
import Marketplace from "./pages/Marketplace";
import CoachProfile from "./pages/CoachProfile";
import CoachSignup from "./pages/CoachSignup";
import PlayerSubmissions from "./pages/PlayerSubmissions";
import SubmissionDetail from "./pages/SubmissionDetail";
import CoachDashboard from "./pages/CoachDashboard";
import CoachReview from "./pages/CoachReview";
import AdminCoaching from "./pages/AdminCoaching";
import Cart from "./pages/Cart";

// Auth
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";

// Existing dashboards
import DashboardUser from "./pages/DashboardUser";
import DashboardEmployee from "./pages/DashboardEmployee";
import DashboardAdmin from "./pages/DashboardAdmin";

// Admin screens
import AdminUsers from "./pages/AdminUsers";
import AdminDatabase from "./pages/AdminDatabase";

// Dashboard with nested tabs
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import DashboardAccount from "./pages/dashboard/Account";
import DashboardOrders from "./pages/dashboard/Orders";
import AdminOrders from "./pages/AdminOrders";
import AdminQuotes from "./pages/AdminQuotes";
import AdminBlog from "./pages/AdminBlog";
import AdminBlogEditor from "./pages/AdminBlogEditor";
import AdminTestimonials from "./pages/AdminTestimonials";
import AdminTickets from "./pages/AdminTickets";
import ScrollToTop from "./components/ScrollToTop";
import RoleError from "./pages/RoleError";

function NavigateToCoachProfile() {
  const { id } = useParams();
  return <Navigate to={`/coaches/${id}`} replace />;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <ToastProvider>
        <AuthProvider>
          <div className="flex min-h-screen flex-col bg-[#fff8e7] text-[#12372a]">
            <Header />

            <main className="flex-grow">
              <Routes>
                {/* Public */}
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/services" element={<Services />} />
                <Route path="/training-options" element={<Navigate to="/services" replace />} />
                <Route path="/training" element={<Navigate to="/services" replace />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/testimonials" element={<Testimonials />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/coaches" element={<Marketplace />} />
                <Route path="/coaches/:id" element={<CoachProfile />} />
                <Route path="/coach/:id" element={<NavigateToCoachProfile />} />

                {/* Coach signup aliases */}
                <Route path="/coach-signup" element={<CoachSignup />} />
                <Route path="/coach-applications" element={<CoachSignup />} />
                <Route path="/coach-applications/apply" element={<CoachSignup />} />
                <Route path="/coaches/apply" element={<CoachSignup />} />
                <Route path="/coaches/signup" element={<CoachSignup />} />
                <Route path="/cart" element={<Cart />} />

                {/* Employee/Admin operational pages */}
                <Route
                  path="/admin/orders"
                  element={
                    <RoleRoute allow={["employee", "admin"]}>
                      <AdminOrders />
                    </RoleRoute>
                  }
                />

                <Route
                  path="/admin/quotes"
                  element={
                    <RoleRoute allow={["employee", "admin"]}>
                      <AdminQuotes />
                    </RoleRoute>
                  }
                />

                <Route
                  path="/admin/requests"
                  element={
                    <RoleRoute allow={["employee", "admin"]}>
                      <AdminTickets />
                    </RoleRoute>
                  }
                />

                {/* Admin */}
                <Route
                  path="/admin/users"
                  element={
                    <RoleRoute allow={["admin"]}>
                      <AdminUsers />
                    </RoleRoute>
                  }
                />

                <Route
                  path="/admin/database"
                  element={
                    <RoleRoute allow={["admin"]}>
                      <AdminDatabase />
                    </RoleRoute>
                  }
                />

                <Route
                  path="/admin/coaching"
                  element={
                    <RoleRoute allow={["admin"]}>
                      <AdminCoaching />
                    </RoleRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <RoleRoute allow={["admin"]}>
                      <DashboardAdmin />
                    </RoleRoute>
                  }
                />

                <Route
                  path="/admin/blog/new"
                  element={
                    <RoleRoute allow={["employee", "admin"]}>
                      <AdminBlogEditor />
                    </RoleRoute>
                  }
                />

                <Route
                  path="/admin/blog/:id"
                  element={
                    <RoleRoute allow={["employee", "admin"]}>
                      <AdminBlogEditor />
                    </RoleRoute>
                  }
                />

                <Route
                  path="/admin/blog"
                  element={
                    <RoleRoute allow={["employee", "admin"]}>
                      <AdminBlog />
                    </RoleRoute>
                  }
                />

                <Route
                  path="/admin/testimonials"
                  element={
                    <RoleRoute allow={["employee", "admin"]}>
                      <AdminTestimonials />
                    </RoleRoute>
                  }
                />

                {/* Employee */}
                <Route
                  path="/employee"
                  element={
                    <RoleRoute allow={["employee", "admin"]}>
                      <DashboardEmployee />
                    </RoleRoute>
                  }
                />

                {/* Coach private dashboard */}
                <Route
                  path="/coach/dashboard"
                  element={
                    <RoleRoute allow={["coach"]}>
                      <CoachDashboard />
                    </RoleRoute>
                  }
                />

                <Route
                  path="/coach/submissions/:id/review"
                  element={
                    <RoleRoute allow={["coach"]}>
                      <CoachReview />
                    </RoleRoute>
                  }
                />

                {/* Auth */}
                <Route path="/signin" element={<SignIn />} />
                <Route path="/portal" element={<PortalRedirect />} />
                <Route path="/role-error" element={<PrivateRoute><RoleError /></PrivateRoute>} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/sign-up" element={<Navigate to="/signup" replace />} />
                <Route path="/create-account" element={<Navigate to="/signup" replace />} />
                <Route path="/player-signup" element={<Navigate to="/signup" replace />} />
                <Route path="/create-player-account" element={<Navigate to="/signup" replace />} />

                {/* User Dashboard with nested tabs */}
                <Route
                  path="/dashboard"
                  element={
                    <RoleRoute allow={["user"]}>
                      <DashboardLayout />
                    </RoleRoute>
                  }
                >
                  <Route index element={<Navigate to="account" replace />} />
                  <Route path="account" element={<DashboardAccount />} />
                  <Route path="orders" element={<DashboardOrders />} />
                  <Route path="requests" element={<Messages embedded />} />
                  <Route path="quotes" element={<Navigate to="/dashboard/requests" replace />} />
                  <Route path="submissions" element={<PlayerSubmissions />} />
                  <Route path="submissions/:id" element={<SubmissionDetail />} />
                </Route>

                {/* Legacy user dashboard */}
                <Route
                  path="/dashboard-legacy"
                  element={
                    <RoleRoute allow={["user"]}>
                      <DashboardUser />
                    </RoleRoute>
                  }
                />

                {/* Safe fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            <FloatingQuickQuote />
            <NotificationBell />
            <Footer />
          </div>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
}
