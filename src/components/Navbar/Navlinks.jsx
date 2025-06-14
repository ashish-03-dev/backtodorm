import { useState } from 'react'
import NavDropdown from "./NavDropdown";

import categoryMenu from '../../data/categoryMenu';
import collectionsMenu from '../../data/collectionsMenu';
import customMenu from '../../data/customMenu';
import productsMenu from '../../data/productsMenu';

export default function NavLinks() {
    const [activeDropdown, setActiveDropdown] = useState(null);

    const handleMouseEnter = (type) => setActiveDropdown(type);
    const handleMouseLeave = () => setActiveDropdown(null);

    return (
        <nav className="col-md-5 d-none d-lg-flex justify-content-center h-100">
            <ul className="nav h-100 justify-content-between align-items-stretch py-0 my-0" style={{ fontSize: "17px" }}>
                <li className="nav-item">
                    <a className="nav-link text-dark h-100 d-flex align-items-center" href="/">
                        Home
                    </a>
                </li>

                <NavDropdown
                    title="Shop"
                    menu={categoryMenu}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    handleMouseEnter={handleMouseEnter}
                    handleMouseLeave={handleMouseLeave}
                    dropdownKey="shop"
                />

                <NavDropdown
                    title="Collections"
                    menu={collectionsMenu}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    handleMouseEnter={handleMouseEnter}
                    handleMouseLeave={handleMouseLeave}
                    dropdownKey="collections"
                />
                <NavDropdown
                    title="Custom"
                    menu={customMenu}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    handleMouseEnter={handleMouseEnter}
                    handleMouseLeave={handleMouseLeave}
                    dropdownKey="custom"
                />
                <NavDropdown
                    title="Products"
                    menu={productsMenu}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    handleMouseEnter={handleMouseEnter}
                    handleMouseLeave={handleMouseLeave}
                    dropdownKey="products"
                />
            </ul>
        </nav>
    )
}
