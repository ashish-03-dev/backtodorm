import React, { useState, useEffect } from 'react';
import Footer from '../components/Footer/Footer';
import Navbar from '../components/Navbar/Navbar';
import { Outlet } from "react-router-dom";
import { useFirebase } from '../context/FirebaseContext';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';

export default function HomeLayout() {
  const { user, firestore } = useFirebase();
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('cartItems');
    const parsedCart = savedCart ? JSON.parse(savedCart) : [];
    return parsedCart.filter(item => 
      (item.type === 'poster' && item.posterId && item.size && item.title) ||
      (item.type === 'collection' && item.collectionId && item.posters?.length > 0)
    );
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
        id: doc.id,
        ...doc.data(),
      })).filter(item => 
        (item.type === 'poster' && item.posterId && item.size && item.title) ||
        (item.type === 'collection' && item.collectionId && item.posters?.length > 0)
      );
      setCartItems(firestoreCart);
    }, (error) => {
      console.error('Error fetching Firestore cart:', error);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  const addToCart = async (item, isCollection = false, collectionId = null, collectionDiscount = 0) => {
    if (isCollection) {
      // Validate collection
      if (!item.collectionId || !Array.isArray(item.posters) || item.posters.length === 0) {
        console.error('Invalid collection data:', item);
        return;
      }
      for (const poster of item.posters) {
        if (!poster.posterId || !poster.size || !poster.title) {
          console.error('Invalid poster in collection:', poster);
          return;
        }
      }
    } else {
      // Validate single poster
      if (!item?.posterId || !item?.size || !item?.title) {
        console.error('Invalid poster data:', item);
        return;
      }
    }

    setCartItems((prev) => {
      let updatedCart = [...prev];
      const cartItemId = isCollection ? `collection-${item.collectionId}` : `poster-${item.posterId}-${item.size}`;
      if (isCollection) {
        const cartItem = {
          id: cartItemId,
          type: 'collection',
          collectionId: item.collectionId,
          quantity: 1,
          collectionDiscount,
          posters: item.posters.map(poster => ({
            posterId: poster.posterId,
            size: poster.size,
            price: poster.price,
            title: poster.title,
            image: poster.image || 'https://via.placeholder.com/60',
            seller: poster.seller || 'Unknown',
          })),
        };
        const existingItem = updatedCart.find(
          (cartItem) => cartItem.id === cartItemId
        );
        if (existingItem) {
          updatedCart = updatedCart.map((cartItem) =>
            cartItem.id === cartItemId
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          );
        } else {
          updatedCart = [...updatedCart, cartItem];
        }
      } else {
        const cartItem = {
          id: cartItemId,
          type: 'poster',
          posterId: item.posterId,
          title: item.title,
          size: item.size,
          price: item.price,
          quantity: 1,
          image: item.image || 'https://via.placeholder.com/60',
          seller: item.seller || 'Unknown',
        };
        const existingItem = updatedCart.find(
          (cartItem) => cartItem.id === cartItemId
        );
        if (existingItem) {
          updatedCart = updatedCart.map((cartItem) =>
            cartItem.id === cartItemId
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          );
        } else {
          updatedCart = [...updatedCart, cartItem];
        }
      }
      localStorage.setItem('cartItems', JSON.stringify(updatedCart));
      return updatedCart;
    });

    if (user && firestore) {
      const cartItemId = isCollection ? `collection-${item.collectionId}` : `poster-${item.posterId}-${item.size}`;
      const cartDocRef = doc(firestore, `users/${user.uid}/cart`, cartItemId);
      try {
        const existingItem = cartItems.find(
          (cartItem) => cartItem.id === cartItemId
        );
        await setDoc(cartDocRef, {
          type: isCollection ? 'collection' : 'poster',
          ...(isCollection
            ? {
                collectionId: item.collectionId,
                quantity: (existingItem?.quantity || 0) + 1,
                collectionDiscount,
                posters: item.posters.map(poster => ({
                  posterId: poster.posterId,
                  size: poster.size,
                  price: poster.price,
                  title: poster.title,
                  image: poster.image || 'https://via.placeholder.com/60',
                  seller: poster.seller || 'Unknown',
                })),
              }
            : {
                posterId: item.posterId,
                title: item.title,
                size: item.size,
                price: item.price,
                quantity: (existingItem?.quantity || 0) + 1,
                image: item.image || 'https://via.placeholder.com/60',
                seller: item.seller || 'Unknown',
              }),
          addedAt: new Date(),
        });
      } catch (error) {
        console.error('Error adding to Firestore cart:', error);
      }
    }
  };

  const buyNow = async (item, isCollection = false, collectionId = null, collectionDiscount = 0) => {
    if (isCollection) {
      if (!item.collectionId || !Array.isArray(item.posters) || item.posters.length === 0) {
        console.error('Invalid buy now collection:', item);
        return;
      }
      for (const poster of item.posters) {
        if (!poster.posterId || !poster.size || !poster.title) {
          console.error('Invalid poster in collection:', poster);
          return;
        }
      }
      setBuyNowItem({
        type: 'collection',
        collectionId: item.collectionId,
        quantity: 1,
        collectionDiscount,
        posters: item.posters.map(poster => ({
          posterId: poster.posterId,
          size: poster.size,
          price: poster.price,
          title: poster.title,
          image: poster.image || 'https://via.placeholder.com/60',
          seller: poster.seller || 'Unknown',
        })),
      });
    } else {
      if (!item?.posterId || !item?.size || !item?.title) {
        console.error('Invalid buy now poster:', item);
        return;
      }
      setBuyNowItem({
        type: 'poster',
        posterId: item.posterId,
        title: item.title,
        size: item.size,
        price: item.price,
        quantity: 1,
        image: item.image || 'https://via.placeholder.com/60',
        seller: item.seller || 'Unknown',
      });
    }
  };

  const removeFromCart = async (itemId, size, isCollection = false) => {
    const cartItemId = isCollection ? `collection-${itemId}` : `poster-${itemId}-${size}`;
    setCartItems((prev) => {
      const updatedCart = prev.filter((item) => item.id !== cartItemId);
      localStorage.setItem('cartItems', JSON.stringify(updatedCart));
      return updatedCart;
    });

    if (user && firestore) {
      const cartDocRef = doc(firestore, `users/${user.uid}/cart`, cartItemId);
      try {
        await deleteDoc(cartDocRef);
      } catch (error) {
        console.error('Error removing from Firestore cart:', error);
      }
    }
  };

  const updateQuantity = async (itemId, size, newQuantity, isCollection = false) => {
    if (newQuantity < 1) return;
    const cartItemId = isCollection ? `collection-${itemId}` : `poster-${itemId}-${size}`;
    setCartItems((prev) => {
      const updatedCart = prev.map((item) =>
        item.id === cartItemId
          ? { ...item, quantity: newQuantity }
          : item
      );
      localStorage.setItem('cartItems', JSON.stringify(updatedCart));
      return updatedCart;
    });

    if (user && firestore) {
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