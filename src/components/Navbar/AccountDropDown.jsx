import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '../../context/FirebaseContext';
import { doc, getDoc } from 'firebase/firestore';
import { BsPerson, BsBoxArrowInRight, BsPersonCircle, BsBoxSeam, BsShieldLock, BsShop, BsBriefcase, BsQuestionCircle, BsBoxArrowRight } from 'react-icons/bs';

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
        <BsPerson className="fs-4" />
      </button>

      {showDropdown && (
        <div className="dropdown-overlay" onClick={toggleDropdown}></div>
      )}

      <div
        className={`fullwidth-dropdown p-4 bg-white border-top shadow rounded-bottom ${showDropdown ? 'show slide-down d-block' : 'd-none'
          }`}
      >
        <div className="mb-2 fw-semibold text-secondary small">My Account</div>

        {!isLoggedIn ? (
          <div
            className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
            onClick={() => handleNavigation('/login')}
            style={{ cursor: 'pointer' }}
          >
            <BsBoxArrowInRight className="me-2" /> Login
          </div>
        ) : (
          <>
            <div
              className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
              onClick={() => handleNavigation('/account')}
              style={{ cursor: 'pointer' }}
            >
              <BsPersonCircle className="me-2" /> Account
            </div>
            <div
              className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
              onClick={() => handleNavigation('/account/orders')}
              style={{ cursor: 'pointer' }}
            >
              <BsBoxSeam className="me-2" /> Orders
            </div>
            {isAdmin && (
              <div
                className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
                onClick={() => handleNavigation('/admin')}
                style={{ cursor: 'pointer' }}
              >
                <BsShieldLock className="me-2" /> Admin Dashboard
              </div>
            )}
            {userData?.isSeller ? (
              <div
                className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
                onClick={() => handleNavigation('/seller')}
                style={{ cursor: 'pointer' }}
              >
                <BsShop className="me-2" /> Seller Dashboard
              </div>
            ) : (
              <div
                className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
                onClick={() => handleNavigation('/account/become-seller')}
                style={{ cursor: 'pointer' }}
              >
                <BsBriefcase className="me-2" /> Sell Your Design
              </div>
            )}
            <div
              className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
              onClick={() => handleNavigation('/account/help-centre')}
              style={{ cursor: 'pointer' }}
            >
              <BsQuestionCircle className="me-2" /> Help Centre
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
              <BsBoxArrowRight className="me-2" /> Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}