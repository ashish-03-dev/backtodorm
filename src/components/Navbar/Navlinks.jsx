import React, { useState } from 'react'
import { Link } from 'react-router-dom';
import "../../styles/NavbarDropdown.css";

import categoryMenu from '../../data/categoryMenu';

export default function NavLinks() {
    const [activeDropdown, setActiveDropdown] = useState(null);

    const handleMouseEnter = (type) => setActiveDropdown(type);
    const handleMouseLeave = () => setActiveDropdown(null);

    return (
        <nav className="col-md-5 d-none d-lg-flex h-100">
            <ul className="nav h-100 justify-content-center align-items-stretch py-0 my-0 gap-3 custom-font">
                
                <li className="nav-item h-100">
                    <a className="nav-link fw-medium text-dark h-100 d-flex align-items-center" href="/">
                        Home
                    </a>
                </li>

                <li
                    className="nav-item position-static"
                    onMouseEnter={() => handleMouseEnter("shop")}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => setActiveDropdown(null)}
                >

                    <Link className="nav-link fw-medium text-dark h-100 d-flex align-items-center" to="/categories">
                        Shop
                    </Link>

                    {activeDropdown === "shop" && (
                        <div className={"fullwidth-dropdown p-4 bg-white shadow-sm border-top rounded-bottom show slide-down"}>
                            <div className="container d-flex justify-content-around flex-wrap">
                                {categoryMenu.map((section, index) => (
                                    <div key={index} className="mb-4">
                                        <h6 className="fw-bold mb-3">{section.title}</h6>
                                        <ul className="list-unstyled">
                                            {section.items.map((item, i) => (
                                                <li key={i}>
                                                    <a href={item.link} className="text-decoration-none dropdown-item d-block py-1">
                                                        {item.name}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </li>

                <li
                    className="nav-item position-static"
                    onMouseEnter={() => handleMouseEnter("collections")}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => setActiveDropdown(null)}
                >
                    <Link className="nav-link fw-medium text-dark h-100 d-flex align-items-center" to="/collections">
                        Collections
                    </Link>

                    {activeDropdown === "collections" && (
                        <div className="fullwidth-dropdown p-4 bg-white shadow-sm border-top rounded-bottom show slide-down">
                            <div className="container d-flex flex-column">
                                <a href="/collection/minimal-vibes" className="dropdown-item py-1">Minimal Vibes</a>
                                <a href="/collection/motivational-pack" className="dropdown-item py-1">Motivational Pack</a>
                                <a href="/collection/anime-essentials" className="dropdown-item py-1">Anime Essentials</a>
                            </div>
                        </div>
                    )}
                </li>

                <li className="nav-item h-100">
                    <a className="nav-link fw-medium text-dark h-100 d-flex align-items-center" href="/custom">
                        Custom
                    </a>
                </li>
                <li className="nav h-100">
                    <a className="nav-link fw-medium text-dark h-100 d-flex align-items-center" href="/products">
                        Products
                    </a>
                </li>
            </ul>
        </nav>
    )
}
