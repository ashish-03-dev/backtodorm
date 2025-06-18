import { Link } from 'react-router-dom';
import '../../styles/NavbarDropdown.css';

const NavDropdown = ({ title, menu, activeDropdown, setActiveDropdown, handleMouseEnter, handleMouseLeave, dropdownKey }) => {
  if (!menu) {
    return null;
  }

  return (
    <li
      className="nav-item position-static"
      onMouseEnter={() => handleMouseEnter(dropdownKey)}
      onMouseLeave={handleMouseLeave}
      onClick={() => setActiveDropdown(null)}
    >
      <div className="nav-link fw-medium text-dark h-100 d-flex align-items-center" style={{ cursor: "pointer" }}>
        {title}
      </div>

      {activeDropdown === dropdownKey && (
        <div className="fullwidth-dropdown p-4 bg-white shadow-sm border-top rounded-bottom show slide-down">
          <div className="container d-flex flex-wrap justify-content-between" style={{ flex: 1 }}>
            {/* Text Sections */}
            <div className="d-flex justify-content-around flex-wrap" style={{ flex: 2 }}>
              {Array.isArray(menu.sections) && menu.sections.length > 0 ? (
                menu.sections.map((section, index) => (
                  <div key={index} className="me-4 mb-3">
                    <h6 className="fw-bold mb-2">{section.title || 'Untitled Section'}</h6>
                    <ul className="list-unstyled">
                      {Array.isArray(section.items) && section.items.length > 0 ? (
                        section.items.map((item, i) => (
                          <li key={i}>
                            <Link
                              to={item.link || '#'}
                              className="text-decoration-none dropdown-item d-block py-1"
                              style={{ fontSize: "1rem" }}
                            >
                              {item.name || 'Unnamed Item'}
                            </Link>
                          </li>
                        ))
                      ) : (
                        <li className="text-muted">No items available</li>
                      )}
                    </ul>
                  </div>
                ))
              ) : (
                <div className="text-muted">No sections available</div>
              )}
            </div>

            {/* Image Section */}
            {Array.isArray(menu.images) && menu.images.length > 0 && (
              <div className="d-flex flex-row gap-3 align-items-start" style={{ flex: 1 }}>
                {menu.images.map((img, i) => (
                  <Link
                    key={i}
                    to={img.link || '#'}
                    className="text-decoration-none text-center"
                  >
                    <img
                      src={img.src || '/placeholder-image.jpg'}
                      alt={img.alt || 'Image'}
                      className="img-fluid rounded shadow-sm"
                      style={{ height: "12rem", width: "auto", objectFit: "cover" }}
                    />
                    <small className="d-block mt-1 text-dark">{img.label || 'No label'}</small>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
};

export default NavDropdown;