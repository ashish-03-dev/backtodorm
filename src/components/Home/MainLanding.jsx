import { useState } from 'react';
import HeroBanner from './HeroBanner';
import CategoryScroll from './CategoryScroll';
import TrendingPosters from './TrendingPosters';
import PopularPicks from './PopularPicks';
import CollectionScroll from './CollectionScroll';
import NewArrivals from './NewArrivals';
import Optional from './Optional';
import AboutSection from './AboutSection';
import '../../styles/MainLanding.css';
import PromoPanel from './PromoPanel';
import { useCartContext } from '../../context/CartContext';
import Footer from './Footer';

export default function MainLanding() {
  const { addToCart, buyNow } = useCartContext();

  return (
    <>
      <HeroBanner />
      <CategoryScroll />
      <TrendingPosters />
      <PopularPicks />
      <CollectionScroll />
      <NewArrivals />
      <Optional addToCart={addToCart} buyNow={buyNow} />
      <AboutSection />
      <PromoPanel />
      <Footer/>
    </>
  );
}