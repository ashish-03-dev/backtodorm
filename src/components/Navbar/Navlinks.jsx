import React, { useState } from 'react';
import NavDropdown from './NavDropdown';
import menuList from '../../menu';

export default function NavLinks() {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [menus, setMenus] = useState([]);
  const [posterImages, setPosterImages] = useState({});

  const handleMouseEnter = (type) => setActiveDropdown(type);
  const handleMouseLeave = () => setActiveDropdown(null);

  React.useEffect(() => {

    if (!Array.isArray(menuList)) {
      console.error('menuList is not an array:', menuList);
      setMenus([]);
      return;
    }

    const sanitizedMenus = menuList.map((menu) => ({
      id: menu.id || '',
      sections: Array.isArray(menu.sections) ? menu.sections : [],
      images: Array.isArray(menu.images) ? menu.images : [],
    }));

    setMenus(sanitizedMenus);

    // Map image URLs directly from the static data
    const imageResults = sanitizedMenus
      .flatMap((menu) => menu.images.map((img) => [img.src, img.src]))
      .filter(([id]) => id && typeof id === 'string');

    setPosterImages(Object.fromEntries(imageResults));
  }, []);

  return (
    <nav className="col-md-5 d-none d-lg-flex flex-grow-1 justify-content-center h-100">
      <ul className="nav h-100 justify-content-between align-items-stretch py-0 my-0" style={{ fontSize: '17px' }}>
        <li className="nav-item">
          <a className="nav-link text-dark h-100 d-flex align-items-center" href="/">
            Home
          </a>
        </li>
        {menus.map((menu) => {
          const menuProp = {
            sections: menu.sections || [],
            images: (menu.images || []).map((img) => ({
              ...img,
              src: posterImages[img.src] || img.src || '',
            })),
          };
          return (
            <NavDropdown
              key={menu.id}
              title={menu.id.charAt(0).toUpperCase() + menu.id.slice(1)}
              menu={menuProp}
              activeDropdown={activeDropdown}
              setActiveDropdown={setActiveDropdown}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              dropdownKey={menu.id}
            />
          );
        })}
        <li className="nav-item">
          <a className="nav-link text-dark h-100 d-flex align-items-center" href="/#contact">
            Contact
          </a>
        </li>
      </ul>
    </nav>
  );
}