import React, { useState } from 'react';
import Footer from '../components/Footer/Footer';
import Navbar from '../components/Navbar/Navbar';
import { Outlet } from "react-router-dom";

export default function HomeLayout() {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (poster) => {
    setCartItems([...cartItems, poster]);
  };

  return (
    <>
      <Navbar cartItems={cartItems} />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
