import { useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import CategoryScroll from '../components/CategoryScroll';
import TrendingPosters from '../components/TrendingPosters';
import PopularPicks from '../components/PopularPicks';
import CollectionScroll from '../components/CollectionScroll';
import NewArrivals from '../components/NewArrivals';
import Optional from '../components/Optional';
import CustomerReviews from '../components/Home/CustomerReviews';
import WhyChooseUs from '../components/Home/WhyChooseUs';
import AboutSection from '../components/Home/AboutSection';
import '../styles/MainLanding.css';

export default function MainLanding() {
     const [cartItems, setCartItems] = useState([]);
    
      const addToCart = (poster) => {
        setCartItems([...cartItems, poster]);
      };
    return (
        <>
            <HeroBanner />
            <CategoryScroll title="Shop by Category"/>
            <TrendingPosters />
            <PopularPicks />
            <CollectionScroll title="Collections"/>
            <NewArrivals />
            <Optional addToCart={addToCart} />
            <CustomerReviews />
            <WhyChooseUs />
            <AboutSection />
        </>
    );
}