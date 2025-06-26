import React from 'react';
import Navbar from '../components/Navbar/Navbar';
import { Outlet } from 'react-router-dom';
import { CartProvider } from '../context/CartContext';

export default function HomeLayout() {
  return (
    <CartProvider>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </CartProvider>
  );
}