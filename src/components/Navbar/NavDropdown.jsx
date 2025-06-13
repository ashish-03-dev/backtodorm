import {Link} from 'react-router-dom';
import '../../styles/NavbarDropdown.css';

const NavDropdown = ({ title, path, menu, activeDropdown, setActiveDropdown, handleMouseEnter, handleMouseLeave, dropdownKey }) => (
  <li
    className="nav-item position-static"
    onMouseEnter={() => handleMouseEnter(dropdownKey)}
    onMouseLeave={handleMouseLeave}
    onClick={() => setActiveDropdown(null)}
  >
    <div className="nav-link fw-medium text-dark h-100 d-flex align-items-center" style={{cursor:"pointer"}}>
      {title}
    </div>

    {activeDropdown === dropdownKey && (
      <div className="fullwidth-dropdown p-4 bg-white shadow-sm border-top rounded-bottom show slide-down">
        <div className="container d-flex flex-wrap justify-content-between gap-4">
          {/* Text Sections */}
          <div className="d-flex justify-content-around flex-wrap" style={{ flex: 2 }}>
            {menu.map((section, index) => (
              <div key={index} className="me-4 mb-3">
                <h6 className="fw-bold mb-2">{section.title}</h6>
                <ul className="list-unstyled">
                  {section.items.map((item, i) => (
                    <li key={i}>
                      <a href={item.link} className="text-decoration-none dropdown-item d-block py-1" style={{fontSize:"1rem"}}>
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Image Section */}
         {menu.images && (
  <div className="d-flex flex-row gap-3 align-items-start" style={{ flex: 1 }}>
    {menu.images.map((img, i) => (
      <a key={i} href={img.link} className="text-decoration-none text-center">
        <img
          src={img.src}
          alt={img.alt}
          className="img-fluid rounded shadow-sm"
          style={{ height: "12rem", width: "auto", objectFit: "cover" }}
        />
        <small className="d-block mt-1 text-dark">{img.label}</small>
      </a>
    ))}
  </div>
)}
        </div>
      </div>
    )}
  </li>
);

export default NavDropdown;
