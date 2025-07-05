import React from 'react';
import Navbar from '../components/Navbar/Navbar';
import { Outlet } from 'react-router-dom';
import { CartProvider } from '../context/CartContext';
import { SectionProvider } from '../context/SectionScrollContext'

export default function HomeLayout() {
  return (
    <CartProvider>
      <SectionProvider>
        <Navbar />
        <main>
          <Outlet />
        </main>
      </SectionProvider>
    </CartProvider>
  );
}