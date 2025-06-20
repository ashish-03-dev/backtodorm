import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFirebase } from '../../context/FirebaseContext';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import '../../styles/MobileSidebar.css';

const fetchImages = async (ids, firestore) => {
  const uniqueIds = [...new Set(ids.filter(id => id))];
  const chunks = [];
  for (let i = 0; i < uniqueIds.length; i += 10) {
    chunks.push(uniqueIds.slice(i, i + 10));
  }

  const imageResults = [];
  for (const chunk of chunks) {
    const q = query(collection(firestore, 'posters'), where('__name__', 'in', chunk));
    const querySnap = await getDocs(q);
    querySnap.forEach(doc => imageResults.push([doc.id, doc.data().imageUrl || '']));
  }
  return imageResults;
};

export default function MobileSidebar({ show, onClose }) {
  const { firestore, user, userData } = useFirebase();
  const [openCategory, setOpenCategory] = useState(null);
  const [menus, setMenus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const toggleCategory = (index) => {
    setOpenCategory(openCategory === index ? null : index);
  };

  useEffect(() => {
    const fetchMenus = async () => {
      if (!firestore) {
        console.error('Firestore instance is not available');
        setIsLoading(false);
        return;
      }
      try {
        const menusDoc = await getDocs(collection(firestore, 'homeSections'));
        const menusData = menusDoc.docs.find((d) => d.id === 'menus')?.data();
        const menuList = menusData?.menuList || [];

        if (!Array.isArray(menuList)) {
          console.error('menuList is not an array:', menuList);
          setMenus({});
          setIsLoading(false);
          return;
        }

        const sanitizedMenus = menuList.reduce((acc, menu) => {
          const sanitized = {
            id: menu.id || '',
            sections: Array.isArray(menu.sections) ? menu.sections : [],
            images: Array.isArray(menu.images) ? menu.images : [],
          };
          acc[menu.id] = sanitized;
          return acc;
        }, {});

        setMenus(sanitizedMenus);

        const imageIds = menuList.flatMap((menu) =>
          (menu.images || []).map((img) => img.src).filter((id) => id && typeof id === 'string')
        );

        if (imageIds.length) {
          const imageResults = await fetchImages(imageIds, firestore);
        }
      } catch (err) {
        console.error('Failed to fetch menus:', err);
        setMenus({});
      } finally {
        setIsLoading(false);
      }
    };

    const fetchUserData = async () => {
      if (user && firestore) {
        try {
          const userDoc = await getDoc(doc(firestore, 'users', user.uid));
          if (userDoc.exists()) {
            setIsAdmin(userDoc.data().isAdmin || false);
          }
        } catch (err) {
          console.error('Failed to fetch user data:', err);
        }
      }
    };

    fetchMenus();
    fetchUserData();
  }, [firestore, user]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <div
        className={`sidebar-overlay ${show ? 'show' : ''}`}
        onClick={onClose}
      ></div>

      <div className={`mobile-sidebar ${show ? 'open' : ''}`}>
        <div className="bg-secondary text-white d-flex align-items-center justify-content-between px-3" style={{ height: '65px' }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-person-circle fs-4 me-2"></i>
            <span className="fw-semibold">{userData?.name || 'Guest'}</span>
          </div>
          <button className="btn btn-close btn-sm btn-close-white" onClick={onClose}></button>
        </div>

        <ul className="list-unstyled m-0 p-0">
          <li className="px-3 py-3 border-bottom">
            <Link to="/" onClick={onClose} className="d-flex align-items-center text-decoration-none text-dark">
              <i className="bi bi-house-door me-3"></i> <span>Home</span>
            </Link>
          </li>

          <li className="border-bottom">
            <button
              className="btn w-100 px-3 py-3 d-flex align-items-center justify-content-between text-start bg-light fw-semibold"
              onClick={() => toggleCategory('shop')}
            >
              <span><i className="bi bi-grid me-3"></i> Shop Categories</span>
              <i className={`bi ${openCategory === 'shop' ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
            </button>
            {openCategory === 'shop' && (
              <div className="px-5 mt-3">
                {Array.isArray(menus.shop?.sections) && menus.shop?.sections.length > 0 ? (
                  menus.shop.sections.map((section, index) => (
                    <div key={index} className="mb-3">
                      <div className="fw-bold text-dark small mb-1">{section.title || 'Untitled Section'}</div>
                      <ul className="list-unstyled m-0">
                        {Array.isArray(section.items) && section.items.length > 0 ? (
                          section.items.map((item, i) => (
                            <li key={i}>
                              <Link
                                to={item.link || '#'}
                                onClick={onClose}
                                className="d-block py-1 ps-1 text-decoration-none text-dark small"
                              >
                                {item.name || 'Unnamed Item'}
                              </Link>
                            </li>
                          ))
                        ) : (
                          <li className="text-muted small">No items available</li>
                        )}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div className="px-1 text-muted small">No sections available</div>
                )}
              </div>
            )}
          </li>

          <li className="border-bottom">
            <button
              className="btn w-100 px-3 py-3 d-flex align-items-center justify-content-between text-start bg-light fw-semibold"
              onClick={() => toggleCategory('collections')}
            >
              <span><i className="bi bi-collection me-3"></i> Collections</span>
              <i className={`bi ${openCategory === 'collections' ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
            </button>
            {openCategory === 'collections' && (
              <div className="px-5 mt-3">
                {Array.isArray(menus.collections?.sections) && menus.collections?.sections.length > 0 ? (
                  menus.collections.sections.map((section, index) => (
                    <div key={index} className="mb-3">
                      <div className="fw-bold text-dark small mb-1">{section.title || 'Untitled Section'}</div>
                      <ul className="list-unstyled m-0">
                        {Array.isArray(section.items) && section.items.length > 0 ? (
                          section.items.map((item, i) => (
                            <li key={i}>
                              <Link
                                to={item.link || '#'}
                                onClick={onClose}
                                className="d-block py-1 ps-1 text-decoration-none text-dark small"
                              >
                                {item.name || 'Unnamed Item'}
                              </Link>
                            </li>
                          ))
                        ) : (
                          <li className="text-muted small">No items available</li>
                        )}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div className="px-1 text-muted small">No sections available</div>
                )}
              </div>
            )}
          </li>

          <li className="px-3 py-3 border-bottom">
            <Link
              to="/custom"
              onClick={onClose}
              className="d-flex align-items-center text-decoration-none text-dark"
            >
              <i className="bi bi-pencil-square me-3"></i> <span>Custom Poster</span>
            </Link>
          </li>

          <li className="px-3 py-2 border-bottom">
            <Link
              to="/account"
              onClick={onClose}
              className="d-flex align-items-center text-decoration-none text-dark py-3"
            >
              <i className="bi bi-person-badge me-3"></i>
              <span>My Account</span>
            </Link>
            <Link
              to="/account/orders"
              onClick={onClose}
              className="d-flex align-items-center text-decoration-none text-dark py-3"
            >
              <i className="bi bi-bag-check me-3"></i>
              <span>My Orders</span>
            </Link>
            <Link
              to="/checkout"
              onClick={onClose}
              className="d-flex align-items-center text-decoration-none text-dark py-3"
            >
              <i className="bi bi-cart3 me-3"></i>
              <span>My Cart</span>
            </Link>
            <Link
              to="/account/help-centre"
              onClick={onClose}
              className="d-flex align-items-center text-decoration-none text-dark py-3"
            >
              <i className="bi bi-question-circle me-3"></i>
              <span>Help Centre</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={onClose}
                className="d-flex align-items-center text-decoration-none text-dark py-3"
              >
                <i className="bi bi-shield-lock me-3"></i>
                <span>Admin Dashboard</span>
              </Link>
            )}
            {userData?.isSeller ? (
              <Link
                to="/seller"
                onClick={onClose}
                className="d-flex align-items-center text-decoration-none text-dark py-3"
              >
                <i className="bi bi-shop me-3"></i>
                <span>Seller Dashboard</span>
              </Link>
            ) : (
              <Link
                to="/account/become-seller"
                onClick={onClose}
                className="d-flex align-items-center text-decoration-none text-dark py-3"
              >
                <i className="bi bi-briefcase me-3"></i>
                <span>Sell Your Design</span>
              </Link>
            )}
          </li>
        </ul>
      </div>
    </>
  );
}