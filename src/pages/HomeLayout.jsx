import React, { useState, useEffect } from 'react';
import Footer from '../components/Footer/Footer';
import Navbar from '../components/Navbar/Navbar';
import { Outlet } from "react-router-dom";
import { useFirebase } from '../context/FirebaseContext';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export default function HomeLayout() {
  const { user, firestore } = useFirebase();
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('cartItems');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [buyNowItem, setBuyNowItem] = useState(null);

  // Sync local storage for guests
  useEffect(() => {
    if (!user) {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }
  }, [cartItems, user]);

  // Sync Firestore for logged-in users
  useEffect(() => {
    if (!user || !firestore) return;

    const cartRef = collection(firestore, `users/${user.uid}/cart`);
    const unsubscribe = onSnapshot(cartRef, (snapshot) => {
      const firestoreCart = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setCartItems(firestoreCart);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  const addToCart = async (poster) => {
    const cartItem = { ...poster, quantity: 1 };
    setCartItems((prev) => {
      const existingItem = prev.find(
        (item) => item.posterId === poster.posterId && item.selectedSize === poster.selectedSize
      );
      if (existingItem) {
        return prev.map((item) =>
          item.posterId === poster.posterId && item.selectedSize === poster.selectedSize
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, cartItem];
    });

    if (user && firestore) {
      const cartItemId = `${poster.posterId}-${poster.selectedSize}`;
      const cartDocRef = doc(firestore, `users/${user.uid}/cart`, cartItemId);
      await setDoc(cartDocRef, {
        posterId: poster.posterId,
        title: poster.title,
        selectedSize: poster.selectedSize,
        price: poster.price,
        quantity: (cartItems.find((item) => item.posterId === poster.posterId && item.selectedSize === poster.selectedSize)?.quantity || 0) + 1,
        image: poster.image || null,
        seller: poster.seller,
        addedAt: new Date(),
      });
    }
  };

  const buyNow = (poster) => {
    setBuyNowItem({ ...poster, quantity: 1 });
  };

  const removeFromCart = async (posterId, selectedSize) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.posterId === posterId && item.selectedSize === selectedSize))
    );

    if (user && firestore) {
      const cartItemId = `${posterId}-${selectedSize}`;
      const cartDocRef = doc(firestore, `users/${user.uid}/cart`, cartItemId);
      await deleteDoc(cartDocRef);
    }
  };

  const updateQuantity = async (posterId, selectedSize, newQuantity) => {
    if (newQuantity < 1) return;
    setCartItems((prev) =>
      prev.map((item) =>
        item.posterId === posterId && item.selectedSize === selectedSize
          ? { ...item, quantity: newQuantity }
          : item
      )
    );

    if (user && firestore) {
      const cartItemId = `${posterId}-${selectedSize}`;
      const cartDocRef = doc(firestore, `users/${user.uid}/cart`, cartItemId);
      await setDoc(cartDocRef, {
        quantity: newQuantity,
      }, { merge: true });
    }
  };

  return (
    <>
      <Navbar
        cartItems={cartItems}
        removeFromCart={removeFromCart}
        updateQuantity={updateQuantity}
      />
      <main>
        <Outlet context={{ addToCart, buyNow, cartItems, removeFromCart, updateQuantity, buyNowItem, setCartItems, setBuyNowItem }} />
      </main>
      <Footer />
    </>
  );
}