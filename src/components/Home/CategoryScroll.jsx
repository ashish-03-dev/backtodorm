import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import '../../styles/CategoryScroll.css';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';

// Static data defined within the component
const collectionsData = [
  {
    id: 'collection2',
    title: 'Movies',
    link: '/collections/movies',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1751624069/American_Psycho_-_Flore_Maquin_xhxylf.jpg',
  },
  {
    id: 'collection3',
    title: 'TV Series',
    link: '/collections/tv-series',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1751624029/Breaking_bad_ytmes0.jpg',
  },
  {
    id: 'collection4',
    title: 'Music',
    link: '/collections/music',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1751623849/starboy_erlifz.jpg',
  },
  {
    id: 'collection5',
    title: 'Disney',
    link: '/collections/disney',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1751624114/UP_Poster_AllChar_aea7ag.jpg',
  },  {
    id: 'collection6',
    title: 'Marvel',
    link: '/collections/marvel',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1751798218/posters/iron-man-2008-film-poster-by-leoarts-1751795952584_framed_1751798217844.webp',
  }, {
    id: 'collection7',
    title: 'Cars',
    link: '/collections/cars',
    image: 'http://res.cloudinary.com/dqu3mzqfj/image/upload/v1751811662/posters/porsche-911-gt3-rs-the-motorsport-athlete-1751810428457_framed_1751811661899.webp',
  },{
    id: 'collection8',
    title: 'Video Game',
    link: '/collections/video-games',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1751624924/39312bc6-4794-4af6-87ae-99bafa67fed6_bmpuws.jpg',
  },
  {
    id: 'collection9',
    title: 'Motivate',
    link: '/collections/motivational',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1751624222/download_1_re61fr.jpg',
  },
  {
    id: 'collection10',
    title: 'Cricket',
    link: '/collections/cricket',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1751624542/MS_Dhoni_Poster_j3gny0.jpg',
  }, {
    id: 'collection11',
    title: 'Football',
    link: '/collections/football',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1751624547/The_Iconic_Poster_Design_ujnxmw.jpg',
  },
  {
    id: 'collection12',
    title: 'Nature',
    link: '/collections/nature',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1751624610/Yosemite_National_Park_Poster_ggpoj3.jpg',
  },
  {
    id: 'collection13',
    title: 'Quotes',
    link: '/collections/quotes',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1751624916/Motivational_wall_decor_wall_art_prints_quote_prints_minimalist_black_and_white_typography_p____wytxie.jpg',
  },
];

export default function ShopByCollection() {
  const [isHovered, setIsHovered] = useState(false);
  const scrollRef = useRef();

  return (
    <section
      className="pt-5 pb-4 py-md-5 px-3 position-relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="fs-2 fw-bold mb-4 text-center">Shop by Collection</h2>

      {isHovered && collectionsData.length > 0 && (
        <>
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
            className="btn btn-light rounded-circle position-absolute top-50 start-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
            style={{ width: '40px', height: '40px', zIndex: 10 }}
            aria-label="Scroll left"
          >
            <BsChevronLeft className="fs-5" />
          </button>
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
            className="btn btn-light rounded-circle position-absolute top-50 end-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
            style={{ width: '40px', height: '40px', zIndex: 10 }}
            aria-label="Scroll right"
          >
            <BsChevronRight className="fs-5" />
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        className="d-flex overflow-auto pb-2 gap-2 gap-md-3"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {collectionsData.length === 0 ? (
          <div className="text-center py-5 w-100">
            <p className="text-muted">No collections available.</p>
          </div>
        ) : (
          collectionsData.map((col) => (
            <CollectionCard
              key={col.id}
              title={col.title}
              link={col.link}
              image={col.image}
            />
          ))
        )}
        <div style={{ width: '1rem', flexShrink: 0 }} />
      </div>
    </section>
  );
}

function CollectionCard({ title, link, image }) {
  return (
    <Link
      to={link}
      className="text-decoration-none text-dark"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div
        className="card shadow-sm flex-shrink-0 border-0 rounded-1 d-flex flex-column category-card"
        style={{ overflow: 'hidden' }}
      >
        <img
          src={image}
          alt={title}
          style={{
            aspectRatio:"1/1.414",
            objectFit: 'cover',
            width: '100%',
          }}
        />
        <div
          className="card-body d-flex justify-content-center align-items-center"
          style={{ flexGrow: 1, minHeight: 0 }}
        >
          <h6 className="mb-0 fw-semibold fs-6 text-center">{title}</h6>
        </div>
      </div>
    </Link>
  );
}

ShopByCollection.propTypes = {};

CollectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
  image: PropTypes.string.isRequired,
};