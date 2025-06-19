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
    return parsedCart.filter(item => item.posterId && item.selectedSize && item.title);
  });
  const [buyNowItem, setBuyNowItem] = useState(null);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }
  }, [cartItems, user]);

  useEffect(() => {
    if (!user || !firestore) return;

    const cartRef = collection(firestore, `users/${user.uid}/cart`);
    const unsubscribe = onSnapshot(cartRef, (snapshot) => {
      const firestoreCart = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })).filter(item => item.posterId && item.selectedSize && item.title);
      setCartItems(firestoreCart);
    }, (error) => {
      console.error('Error fetching Firestore cart:', error);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  const addToCart = async (posters, collectionId = null, collectionDiscount = 0) => {
    if (!Array.isArray(posters)) {
      posters = [posters]; // Ensure single poster is treated as an array
    }

    const invalidPoster = posters.find(p => !p?.posterId || !p?.selectedSize || !p?.title);
    if (invalidPoster) {
      console.error('Invalid poster data:', invalidPoster);
      return;
    }

    setCartItems((prev) => {
      let updatedCart = [...prev];
      posters.forEach((poster) => {
        const cartItem = {
          posterId: poster.posterId,
          title: poster.title,
          selectedSize: poster.selectedSize,
          price: poster.price,
          quantity: 1,
          image: poster.image || 'https://via.placeholder.com/60',
          seller: poster.seller || 'Unknown',
          collectionId: collectionId || null,
          collectionDiscount: collectionId ? collectionDiscount : 0,
        };

        const existingItem = updatedCart.find(
          (item) => item.posterId === poster.posterId && item.selectedSize === poster.selectedSize
        );
        if (existingItem) {
          updatedCart = updatedCart.map((item) =>
            item.posterId === poster.posterId && item.selectedSize === poster.selectedSize
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          updatedCart = [...updatedCart, cartItem];
        }
      });
      return updatedCart;
    });

    if (user && firestore) {
      for (const poster of posters) {
        const cartItemId = `${poster.posterId}-${poster.selectedSize}`;
        const cartDocRef = doc(firestore, `users/${user.uid}/cart`, cartItemId);
        try {
          const existingItem = cartItems.find(
            (item) => item.posterId === poster.posterId && item.selectedSize === poster.selectedSize
          );
          await setDoc(cartDocRef, {
            posterId: poster.posterId,
            title: poster.title,
            selectedSize: poster.selectedSize,
            price: poster.price,
            quantity: (existingItem?.quantity || 0) + 1,
            image: poster.image || 'https://via.placeholder.com/60',
            seller: poster.seller || 'Unknown',
            collectionId: collectionId || null,
            collectionDiscount: collectionId ? collectionDiscount : 0,
            addedAt: new Date(),
          });
        } catch (error) {
          console.error('Error adding to Firestore cart:', error);
        }
      }
    }
  };

  const buyNow = (poster) => {
    if (!poster?.posterId || !poster?.selectedSize || !poster?.title) {
      console.error('Invalid buy now poster:', poster);
      return;
    }
    setBuyNowItem({ ...poster, quantity: 1, collectionId: null, collectionDiscount: 0 });
  };

  const removeFromCart = async (posterId, selectedSize) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.posterId === posterId && (item.selectedSize || '') === (selectedSize || '')))
    );

    if (user && firestore) {
      const cartItemId = `${posterId}-${selectedSize || 'none'}`;
      const cartDocRef = doc(firestore, `users/${user.uid}/cart`, cartItemId);
      try {
        await deleteDoc(cartDocRef);
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
        await setDoc(cartDocRef, { quantity: newQuantity }, { merge: true });
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