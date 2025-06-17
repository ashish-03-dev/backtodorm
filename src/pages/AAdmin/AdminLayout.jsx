import { Link, Outlet, useLocation } from "react-router-dom";
import '../../styles/AdminLayout.css'; // Custom styles for admin panel

export default function AdminLayout() {
  const { pathname } = useLocation();

  const navItems = [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/orders", label: "Orders" },
    { path: "/admin/home-content", label: "Home Content" },
    { path: "/admin/category-manager", label: "Category Manager" },
    { path: "/admin/posters", label: "Posters" },
    { path: "/admin/sellers", label: "Sellers" },
    { path: "/admin/customers", label: "Customers" },
    { path: "/admin/support", label: "Support" },
    { path: "/admin/settings", label: "Site Settings" },
    { path: "/admin/users", label: "Admin Users" },
  ];

  return (
    <div className="admin-panel d-flex">
      <aside className="admin-sidebar p-3 border-end">
        <h5 className="mb-4">🛠️ Admin Panel</h5>
        <ul className="nav flex-column">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item mb-2">
              <Link
                to={item.path}
                className={`nav-link ${
                  pathname === item.path ? "active fw-bold" : ""
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <main className="admin-content flex-grow-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
