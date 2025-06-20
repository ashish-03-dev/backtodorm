import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '../../context/FirebaseContext';
import { doc, getDoc } from 'firebase/firestore';

export default function AccountDropdown({ isLoggedIn, logout }) {
  const { user, firestore, userData } = useFirebase();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
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

    fetchUserData();
  }, [user, firestore]);

  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setShowDropdown(false);
  };

  return (
    <div className="">
      <button
        className="btn d-flex align-items-center justify-content-center px-2 mx-1 mx-md-2"
        onClick={toggleDropdown}
        style={{ height: '35px', lineHeight: '1' }}
        aria-label="Account Menu"
      >
        <i className="bi bi-person fs-4"></i>
      </button>

      {showDropdown && (
        <div className="dropdown-overlay" onClick={toggleDropdown}></div>
      )}

      <div
        className={`fullwidth-dropdown p-4 bg-white border-top shadow rounded-bottom ${
          showDropdown ? 'show slide-down d-block' : 'd-none'
        }`}
      >
        <div className="mb-2 fw-semibold text-secondary small">My Account</div>

        {!isLoggedIn ? (
          <div
            className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
            onClick={() => handleNavigation('/login')}
            style={{ cursor: 'pointer' }}
          >
            <i className="bi bi-box-arrow-in-right me-2"></i> Login
          </div>
        ) : (
          <>
            <div
              className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
              onClick={() => handleNavigation('/account')}
              style={{ cursor: 'pointer' }}
            >
              <i className="bi bi-person-circle me-2"></i> Account
            </div>
            <div
              className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
              onClick={() => handleNavigation('/account/orders')}
              style={{ cursor: 'pointer' }}
            >
              <i className="bi bi-box-seam me-2"></i> Orders
            </div>
            {isAdmin && (
              <div
                className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
                onClick={() => handleNavigation('/admin')}
                style={{ cursor: 'pointer' }}
              >
                <i className="bi bi-shield-lock me-2"></i> Admin Dashboard
              </div>
            )}
            {userData?.isSeller ? (
              <div
                className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
                onClick={() => handleNavigation('/seller')}
                style={{ cursor: 'pointer' }}
              >
                <i className="bi bi-shop me-2"></i> Seller Dashboard
              </div>
            ) : (
              <div
                className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
                onClick={() => handleNavigation('/account/become-seller')}
                style={{ cursor: 'pointer' }}
              >
                <i className="bi bi-briefcase me-2"></i> Sell Your Design
              </div>
            )}
            <div
              className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
              onClick={() => handleNavigation('/account/help-centre')}
              style={{ cursor: 'pointer' }}
            >
              <i className="bi bi-question-circle me-2"></i> Help Centre
            </div>
            <div
              style={{
                height: '1px',
                backgroundColor: '#dee2e6',
                margin: '0.5rem 0',
              }}
            ></div>
            <button
              className="dropdown-item py-2 text-danger d-flex align-items-center"
              onClick={() => {
                logout();
                setShowDropdown(false);
              }}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                width: '100%',
                textAlign: 'left',
              }}
            >
              <i className="bi bi-box-arrow-right me-2"></i> Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}