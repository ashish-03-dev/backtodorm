import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import '../../styles/CategoryScroll.css';

// Static data defined within the component
const collectionsData = [
  {
    id: 'collection3',
    title: 'Custom Poster',
    link: '/custom-poster',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1750098721/image3_qntdnn.webp',
  },
  {
    id: 'collection1',
    title: 'Summer Collection',
    link: '/collections/collection1',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1750098725/image1_a4ytcc.webp',
  },
  {
    id: 'collection2',
    title: 'Winter Collection',
    link: '/collections/collection2',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1750973995/A33width_550_qxr5tr.webp',
  },  {
    id: 'collection3',
    title: 'Movies',
    link: '/collections/collection3',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1750098632/image1_pcjx4w.webp',
  },
  {
    id: 'collection1',
    title: 'TV Series',
    link: '/collections/collection1',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1750098647/image2_bfoaha.webp',
  },
  {
    id: 'collection2',
    title: 'Music',
    link: '/collections/collection2',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1749984208/image2_b6xais.webp',
  },  {
    id: 'collection3',
    title: 'Video Game',
    link: '/collections/collection3',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1750098624/image1_oshqc7.webp',
  },
  {
    id: 'collection1',
    title: 'Motivate',
    link: '/collections/collection1',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1750098690/image2_thw566.webp',
  },
  {
    id: 'collection2',
    title: 'Cricket',
    link: '/collections/collection2',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1750098675/image4_pegth2.webp',
  },  {
    id: 'collection3',
    title: 'Football',
    link: '/collections/collection3',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1750098682/image2_yf8k0x.webp',
  },
  {
    id: 'collection1',
    title: 'Nature',
    link: '/collections/collection1',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1750973995/A33width_550_qxr5tr.webp',
  },
  {
    id: 'collection2',
    title: 'Quotes',
    link: '/collections/collection2',
    image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1750098710/image1_gqnujf.webp',
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
            <i className="bi bi-chevron-left fs-5" />
          </button>
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
            className="btn btn-light rounded-circle position-absolute top-50 end-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
            style={{ width: '40px', height: '40px', zIndex: 10 }}
            aria-label="Scroll right"
          >
            <i className="bi bi-chevron-right fs-5" />
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
          alt={`${title} image`}
          style={{
            height: '17rem',
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