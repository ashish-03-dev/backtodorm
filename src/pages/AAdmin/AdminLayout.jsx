import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BsHouse,
  BsCartCheck,
  BsFileText,
  BsImage,
  BsCheckCircle,
  BsCollection,
  BsBoxes,
  BsPersonBadge,
  BsPeople,
  BsGear,
  BsPersonGear,
  BsQuestionCircle,
  BsHouseDoor,
  BsChevronRight
} from "react-icons/bs";

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
      return !isMobile && location.pathname === "/admin" || location.pathname === "./admin/dashboard";
    }
    return location.pathname === path;
  };



const navItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: BsHouse },
  { path: "/admin/orders", label: "Orders", icon: BsCartCheck },
  { path: "/admin/home-content", label: "Home Content", icon: BsFileText },
  { path: "/admin/posters", label: "Posters", icon: BsImage },
  { path: "/admin/poster-approvals", label: "Poster Approvals", icon: BsCheckCircle },
  { path: "/admin/frames", label: "Frames", icon: BsCollection },
  { path: "/admin/collections-packs", label: "Collections-Packs", icon: BsBoxes },
  { path: "/admin/sellers", label: "Sellers", icon: BsPersonBadge },
  { path: "/admin/users", label: "Users", icon: BsPeople },
  { path: "/admin/settings", label: "Site Settings", icon: BsGear },
  { path: "/admin/admin-users", label: "Admin Users", icon: BsPersonGear },
  { path: "/admin/support", label: "Support", icon: BsQuestionCircle },
  { path: "/", label: "Home", icon: BsHouseDoor },
];


  return (
    <div className="bg-light p-3">
      <div className="d-flex gap-3" style={{ minHeight: "calc(100svh - 2rem)" }}>
        {!showContentOnMobile && (
          <div className={`bg-light d-flex flex-column gap-3 ${isMobile ? "flex-grow-1" : ""}`} style={{
            position: "sticky",
            top: "1rem",
            minWidth: "300px",
            flexShrink: 0,
            maxHeight: "calc(100svh - 2rem)"
          }}>
            <div className="text-center p-4 bg-white shadow-sm">
              <h5 className="mb-0">🛠️ Admin Dashboard</h5>
            </div>

            <div className="p-4 bg-white d-flex flex-column justify-content-between flex-grow-1 shadow-sm">
              <ul className="nav flex-column gap-2">
                {navItems.map((item) => (
                  <li key={item.path} className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded sidebar-item ${isActive(item.path) ? "text-primary bg-light" : "text-dark"
                        }`}
                      onClick={() => handleSectionClick(item.path)}
                    >
                      <span className="d-flex align-items-center">
                        <item.icon className="me-2" />
                        {item.label}
                      </span>
                      <BsChevronRight className="d-md-none" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div
          className={`bg-white shadow-sm flex-grow-1 ${showContentOnMobile ? "d-block d-md-block" : "d-none d-md-block"
            }`}
          style={{ maxWidth: "100%", overflow: "auto" }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}