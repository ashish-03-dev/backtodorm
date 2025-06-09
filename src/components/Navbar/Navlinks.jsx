import React, { useState } from 'react'
import { Link } from 'react-router-dom';
// import "../../styles/NavbarDropdown.css";
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
        <nav className="col-md-5 d-none d-md-flex justify-content-center h-100">
            <ul className="nav h-100 justify-content-between align-items-stretch py-0 my-0" style={{ fontSize: "17px" }}>
                <li className="nav-item">
                    <a className="nav-link fw-medium text-dark h-100 d-flex align-items-center" href="/">
                        Home
                    </a>
                </li>

                <NavDropdown
                    title="Shop"
                    path="/categories"
                    menu={categoryMenu}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    handleMouseEnter={handleMouseEnter}
                    handleMouseLeave={handleMouseLeave}
                    dropdownKey="shop"
                />

                <NavDropdown
                    title="Collections"
                    path="/collections"
                    menu={collectionsMenu}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    handleMouseEnter={handleMouseEnter}
                    handleMouseLeave={handleMouseLeave}
                    dropdownKey="collections"
                />
                <NavDropdown
                    title="Custom"
                    path="/custom"
                    menu={customMenu}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    handleMouseEnter={handleMouseEnter}
                    handleMouseLeave={handleMouseLeave}
                    dropdownKey="custom"
                />
                <NavDropdown
                    title="Products"
                    path="/products"
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
