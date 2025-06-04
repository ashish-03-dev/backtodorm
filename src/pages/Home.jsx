import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import CategoryGrid from '../components/CategoryGrid';
import PosterGrid from '../components/PosterGrid';
import AboutSection from '../components/AboutSection';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div>
      <Navbar />
      <Hero />
      <CategoryGrid />
      <PosterGrid />
      <AboutSection />
      <Footer />
    </div>
  );
}
