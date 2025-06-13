import { useState } from 'react';
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