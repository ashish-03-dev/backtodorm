import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showContentOnMobile, setShowContentOnMobile] = useState(false);

  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (!isMobile) return;
    setShowContentOnMobile(location.pathname !== "/admin");
  }, [location.pathname, isMobile]);

  const handleSectionClick = (path) => {
    navigate(path);
    if (isMobile) {
      setShowContentOnMobile(true);
    }
  };

  // Highlight Dashboard on /admin only when not mobile
  const isActive = (path) => {
    if (path === "/admin") {
      return !isMobile && location.pathname === "/admin";
    }
    return location.pathname === path;
  };

  const navItems = [
    { path: "/", label: "Home", icon: "bi-house-door" },
    { path: "/admin", label: "Dashboard", icon: "bi-house" },
    { path: "/admin/orders", label: "Orders", icon: "bi-cart-check" },
    { path: "/admin/home-content", label: "Home Content", icon: "bi-file-text" },
    { path: "/admin/posters", label: "Posters", icon: "bi-image" },
    { path: "/admin/poster-approvals", label: "Poster Approvals", icon: "bi-check-circle" },
    { path: "/admin/sellers", label: "Sellers", icon: "bi-person-badge" },
    { path: "/admin/users", label: "Users", icon: "bi-people" },
    { path: "/admin/settings", label: "Site Settings", icon: "bi-gear" },
    { path: "/admin/admin-users", label: "Admin Users", icon: "bi-person-gear" },
    { path: "/admin/support", label: "Support", icon: "bi-question-circle" }
  ];

  return (
    <div className="bg-light p-3">
      <div className="d-flex gap-3" style={{ minHeight: "calc(100svh - 2rem)" }}>
        {!showContentOnMobile && (
          <div className="bg-light d-flex flex-column gap-3" style={{ minWidth: "300px", flexShrink: 0 }}>
            <div className="text-center p-4 bg-white shadow-sm">
              <h5 className="mb-0">🛠️ Admin Dashboard</h5>
            </div>

            <div className="p-4 bg-white d-flex flex-column justify-content-between flex-grow-1 shadow-sm">
              <ul className="nav flex-column gap-2">
                {navItems.map((item) => (
                  <li key={item.path} className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded sidebar-item ${
                        isActive(item.path)
                          ? "text-primary bg-light"
                          : "text-dark"
                      }`}
                      onClick={() => handleSectionClick(item.path)}
                    >
                      <span>
                        <i className={`bi ${item.icon} me-2`}></i>
                        {item.label}
                      </span>
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div
          className={`bg-white shadow-sm p-4 p-md-5 flex-grow-1 ${
            showContentOnMobile ? "d-block d-md-block" : "d-none d-md-block"
          }`}
          style={{ maxWidth: "100%", overflow: "auto" }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}
