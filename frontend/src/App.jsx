import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { trackVisitOncePerDay, attachClickTracking } from "./track";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import ChatBot from "./components/ChatBot.jsx";
import BookingPopup from "./components/BookingPopup.jsx";
import CookieConsent from "./components/CookieConsent.jsx";

// Lazy load cac page de giam bundle size + tang LCP
const Home = lazy(() => import("./pages/Home.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Services = lazy(() => import("./pages/Services.jsx"));
const Products = lazy(() => import("./pages/Products.jsx"));
const Training = lazy(() => import("./pages/Training.jsx"));
const News = lazy(() => import("./pages/News.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const Privacy = lazy(() => import("./pages/Privacy.jsx"));
const Terms = lazy(() => import("./pages/Terms.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

const AdminLogin = lazy(() => import("./pages/admin/Login.jsx"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
import { isLoggedIn } from "./adminApi";

// Loading fallback khi lazy load
function PageLoader() {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "60vh",
      fontSize: 16,
      color: "#B06B6E"
    }}>
      <div>Đang tải...</div>
    </div>
  );
}

// Layout website công khai (có Navbar + Footer)
function PublicLayout() {
  // Ghi nhận lượt truy cập + theo dõi click nút liên hệ (chỉ trên web công khai)
  useEffect(() => {
    trackVisitOncePerDay();
    return attachClickTracking();
  }, []);

  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gioi-thieu" element={<About />} />
            <Route path="/dich-vu" element={<Services />} />
            <Route path="/san-pham" element={<Products />} />
            <Route path="/dao-tao" element={<Training />} />
            <Route path="/tin-tuc" element={<News />} />
            <Route path="/lien-he" element={<Contact />} />
            <Route path="/chinh-sach-bao-mat" element={<Privacy />} />
            <Route path="/dieu-khoan" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <ChatBot />
      <BookingPopup />
      <CookieConsent />
    </>
  );
}

// Bảo vệ route admin: chưa đăng nhập -> chuyển tới trang login
function RequireAuth({ children }) {
  return isLoggedIn() ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/*"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          />
          <Route path="/*" element={<PublicLayout />} />
        </Routes>
      </Suspense>
    </>
  );
}
