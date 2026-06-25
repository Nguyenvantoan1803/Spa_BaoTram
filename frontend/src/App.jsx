import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { trackVisitOncePerDay, attachClickTracking } from "./track";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import ChatBot from "./components/ChatBot.jsx";
import BookingPopup from "./components/BookingPopup.jsx";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Services from "./pages/Services.jsx";
import Products from "./pages/Products.jsx";
import Training from "./pages/Training.jsx";
import News from "./pages/News.jsx";
import Contact from "./pages/Contact.jsx";

import AdminLogin from "./pages/admin/Login.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import { isLoggedIn } from "./adminApi";

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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gioi-thieu" element={<About />} />
          <Route path="/dich-vu" element={<Services />} />
          <Route path="/san-pham" element={<Products />} />
          <Route path="/dao-tao" element={<Training />} />
          <Route path="/tin-tuc" element={<News />} />
          <Route path="/lien-he" element={<Contact />} />
        </Routes>
      </main>
      <Footer />
      <ChatBot />
      <BookingPopup />
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
    </>
  );
}
