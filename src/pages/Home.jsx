import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Footer from '../components/Home/Footer';
import Navbar from '../components/Navbar/Navbar';
import MainLanding from './MainLanding';
import PosterDetail from '../components/PosterDetail';
import ProductDetail from '../components/ProductDetail';
import Categories from '../components/Categories';
import CollectionDetail from '../components/CollectionsDetail';
// import CategoryPage from '../components/CategoryPage';
import CollectionPage from '../components/CollectionPage';
import CategoryCollectionsPage from '../components/CategoryCollectionPage';

export default function Home() {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (poster) => {
    setCartItems([...cartItems, poster]);
  };

  return (
    <>
      <Navbar cartItems={cartItems} />
      <Routes>
        <Route path="/" element={<MainLanding />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/collections/:categoryType/:collectionId" element={<CollectionDetail addToCart={addToCart} />} />
        <Route path="/collections/:categoryType" element={<CategoryCollectionsPage />} />
        <Route path="/collection/:collectionId" element={<CollectionPage />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        {/* <Route path="/poster/:id" element={<PosterDetail posters={posters} addToCart={addToCart} />} /> */}
        {/* <Route path="/about" element={<About />} /> */}
        {/* <Route path="/products" element={<Products />} /> */}
        {/* <Route path="/contact" element={<Contact />} /> */}
        {/* Add more sub-routes here */}
      </Routes>
      <Footer />
    </>
  );
}
