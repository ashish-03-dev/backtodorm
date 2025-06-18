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
    const parsedCart = savedCart ? JSON.parse(savedCart) : [];
    // Clean invalid items on load
    return parsedCart.filter(item => item.posterId && item.selectedSize && item.title);
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
      })).filter(item => item.posterId && item.selectedSize && item.title); // Clean invalid items
      console.log('Fetched Firestore cart:', firestoreCart);
      setCartItems(firestoreCart);
    }, (error) => {
      console.error('Error fetching Firestore cart:', error);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  const addToCart = async (poster) => {
    if (!poster?.posterId || !poster?.selectedSize || !poster?.title) {
      console.error('Invalid poster data:', "osterId:", poster.posterId, "Selected Size:", poster.selectedSize, "Poster Tite:", poster.title);
      return;
    }
    console.log('Adding to cart:', poster);
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
      try {
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
        console.log('Added to Firestore cart:', cartItemId);
      } catch (error) {
        console.error('Error adding to Firestore cart:', error);
      }
    }
  };

  const buyNow = (poster) => {
    if (!poster?.posterId || !poster?.selectedSize || !poster?.title) {
      console.error('Invalid buy now poster:', poster);
      return;
    }
    setBuyNowItem({ ...poster, quantity: 1 });
  };

  const removeFromCart = async (posterId, selectedSize) => {
    console.log('Removing from cart:', { posterId, selectedSize: selectedSize || 'none' });
    setCartItems((prev) =>
      prev.filter((item) => !(item.posterId === posterId && (item.selectedSize || '') === (selectedSize || '')))
    );

    if (user && firestore) {
      const cartItemId = `${posterId}-${selectedSize || 'none'}`;
      const cartDocRef = doc(firestore, `users/${user.uid}/cart`, cartItemId);
      try {
        await deleteDoc(cartDocRef);
        console.log('Removed from Firestore cart:', cartItemId);
      } catch (error) {
        console.error('Error removing from Firestore cart:', error);
      }
    }
  };

  const updateQuantity = async (posterId, selectedSize, newQuantity) => {
    if (newQuantity < 1) return;
    setCartItems((prev) =>
      prev.map((item) =>
        item.posterId === posterId && (item.selectedSize || '') === (selectedSize || '')
          ? { ...item, quantity: newQuantity }
          : item
      )
    );

    if (user && firestore) {
      const cartItemId = `${posterId}-${selectedSize || 'none'}`;
      const cartDocRef = doc(firestore, `users/${user.uid}/cart`, cartItemId);
      try {
        await setDoc(cartDocRef, {
          quantity: newQuantity,
        }, { merge: true });
        console.log('Updated Firestore cart quantity:', cartItemId, newQuantity);
      } catch (error) {
        console.error('Error updating Firestore cart quantity:', error);
      }
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