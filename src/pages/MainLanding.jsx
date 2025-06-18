import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import HeroBanner from '../components/Home/HeroBanner';
import CategoryScroll from '../components/Home/CategoryScroll';
import TrendingPosters from '../components/Home/TrendingPosters';
import PopularPicks from '../components/Home/PopularPicks';
import CollectionScroll from '../components/Home/CollectionScroll';
import NewArrivals from '../components/Home/NewArrivals';
import Optional from '../components/Home/Optional';
import CustomerReviews from '../components/Home/CustomerReviews';
import WhyChooseUs from '../components/Home/WhyChooseUs';
import AboutSection from '../components/Home/AboutSection';
import '../styles/MainLanding.css';

export default function MainLanding() {
  const { addToCart, buyNow } = useOutletContext();
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
      <WhyChooseUs />
      <AboutSection />
    </>
  );
}