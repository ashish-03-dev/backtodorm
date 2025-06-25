import { useState } from 'react';
import HeroBanner from './HeroBanner';
import CategoryScroll from './CategoryScroll';
import TrendingPosters from './TrendingPosters';
import PopularPicks from './PopularPicks';
import CollectionScroll from './CollectionScroll';
import NewArrivals from './NewArrivals';
import Optional from './Optional';
import CustomerReviews from './CustomerReviews';
import AboutSection from './AboutSection';
import '../../styles/MainLanding.css';
import PromoPanel from './PromoPanel';
import { useCartContext } from '../../context/CartContext';

export default function MainLanding() {
  const { addToCart, buyNow } = useCartContext();
  const [cartItems, setCartItems] = useState([]);

  return (
    <>
      <HeroBanner />
      <CategoryScroll title="Shop by Category" />
      <TrendingPosters />
      <PopularPicks />
      <CollectionScroll title="Collections" />
      <NewArrivals />
      <Optional addToCart={addToCart} buyNow={buyNow} />
      <CustomerReviews />
      <AboutSection />
      <PromoPanel />
    </>
  );
}