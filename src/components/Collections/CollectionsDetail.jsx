import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFirebase } from '../../context/FirebaseContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function CollectionDetail({ addToCart }) {
  const { firestore } = useFirebase();
  const { collectionId } = useParams();
  const [posters, setPosters] = useState([]);
  const [filteredPosters, setFilteredPosters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collectionName, setCollectionName] = useState(null);
  const [sizeFilter, setSizeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const postersPerPage = 12;

  useEffect(() => {
    const fetchCollectionAndPosters = async () => {
      if (!firestore) {
        setError('Failed to connect to database.');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch collection document
        const collectionRef = doc(firestore, 'collections', collectionId);
        const collectionDoc = await getDoc(collectionRef);
        let collectionLabel = collectionId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        if (collectionDoc.exists()) {
          collectionLabel = collectionDoc.data().name || collectionLabel;
        }
        setCollectionName(collectionLabel);

        // Fetch posters
        const postersRef = collection(firestore, 'posters');
        const q = query(postersRef, where('collections', 'array-contains', collectionLabel));
        const querySnapshot = await getDocs(q);

        const fetchedPosters = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled Poster',
            img: data.imageUrl || '/placeholder-image.jpg',
            sizes: data.sizes || [],
            price: data.sizes?.[0]?.price || 0,
            discount: data.discount || 0,
            finalPrice: data.sizes?.[0]?.finalPrice || data.sizes?.[0]?.price || 0,
          };
        });

        setPosters(fetchedPosters);
        setFilteredPosters(fetchedPosters);
      } catch (err) {
        console.error('Failed to fetch posters:', err);
        setError('Failed to load posters. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollectionAndPosters();
  }, [firestore, collectionId]);

  // Handle filtering and sorting
  useEffect(() => {
    let updatedPosters = [...posters];

    // Filter by size
    if (sizeFilter !== 'all') {
      updatedPosters = updatedPosters.filter(poster =>
        poster.sizes.some(size => size.size === sizeFilter)
      );
    }

    // Sort by price
    updatedPosters.sort((a, b) => {
      const priceA = a.finalPrice || a.price;
      const priceB = b.finalPrice || b.price;
      return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
    });

    setFilteredPosters(updatedPosters);
    setCurrentPage(1); // Reset to first page when filters change
  }, [sizeFilter, sortOrder, posters]);

  // Pagination logic
  const indexOfLastPoster = currentPage * postersPerPage;
  const indexOfFirstPoster = indexOfLastPoster - postersPerPage;
  const currentPosters = filteredPosters.slice(indexOfFirstPoster, indexOfLastPoster);
  const totalPages = Math.ceil(filteredPosters.length / postersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (isLoading) {
    return (
      <div className="container py-5">
        <h2 className="mb-4 text-capitalize">{collectionName || collectionId?.replace('-', ' ') || 'Collection'}</h2>
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <h2 className="mb-4 text-capitalize">{collectionName || collectionId?.replace('-', ' ') || 'Collection'}</h2>
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4 text-capitalize">{collectionName || collectionId?.replace('-', ' ') || 'Collection'}</h2>

      {/* Filters and Sorting */}
      <div className="mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div className="d-flex gap-2">
          <select
            className="form-select"
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
          >
            <option value="all">All Sizes</option>
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="A3x3">A3 x 3</option>
            <option value="A4x5">A4 x 5</option>
          </select>
          <select
            className="form-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="asc">Price: Low to High</option>
            <option value="desc">Price: High to Low</option>
          </select>
        </div>
        <p className="text-muted mb-0">{filteredPosters.length} posters found</p>
      </div>

      {/* Posters Grid */}
      <div className="row row-cols-2 row-cols-sm-3 row-cols-lg-4 g-4">
        {currentPosters.length === 0 ? (
          <p className="col-12">No posters found for selected filters.</p>
        ) : (
          currentPosters.map((poster) => (
            <div key={poster.id} className="col">
              <Link to={`/poster/${poster.id}`} className="text-decoration-none text-dark">
                <div className="card h-100 shadow-sm border-0">
                  <img
                    src={poster.img}
                    alt={poster.title}
                    className="card-img-top"
                    style={{ aspectRatio: '20/23', objectFit: 'cover' }}
                  />
                  <div className="card-body text-center">
                    <h6 className="card-title fw-semibold text-truncate mb-2">{poster.title}</h6>
                    <p className="card-text text-muted fw-semibold mb-0">₹{poster.finalPrice || poster.price}</p>
                  </div>
                </div>
              </Link>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Page navigation" className="mt-4">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => paginate(currentPage - 1)}>
                Previous
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                <button className="page-link" onClick={() => paginate(page)}>
                  {page}
                </button>
              </li>
            ))}
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => paginate(currentPage + 1)}>
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}