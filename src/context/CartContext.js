import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFirebase } from './FirebaseContext';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';

const CartContext = createContext();

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user, firestore } = useFirebase();
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem('cartItems');
      const parsedCart = savedCart ? JSON.parse(savedCart) : [];
      return parsedCart.filter(item =>
        (item.type === 'poster' && item.posterId && item.size && item.title && item.price !== null && item.finalPrice !== null && item.finish) ||
        (item.type === 'collection' && item.collectionId && item.finish && item.posters?.length > 0 && item.posters.every(p => p.posterId && p.size && p.title && p.price !== null && p.finalPrice !== null))
      );
    } catch (error) {
      console.error('Error parsing cartItems from localStorage:', error);
      return [];
    }
  });
  const [buyNowItem, setBuyNowItem] = useState(null);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeCartAndSettings = async () => {
      setLoading(true);
      try {
        const savedCart = localStorage.getItem('cartItems');
        let parsedCart = [];
        if (savedCart) {
          parsedCart = JSON.parse(savedCart);
        }
        const filteredCart = parsedCart.filter(item =>
          (item.type === 'poster' && item.posterId && item.size && item.title && item.price !== null && item.finalPrice !== null && item.finish) ||
          (item.type === 'collection' && item.collectionId && item.finish && item.posters?.length > 0 && item.posters.every(p => p.posterId && p.size && p.title && p.price !== null && p.finalPrice !== null))
        );
        setCartItems(filteredCart);

        if (firestore) {
          const settingsDocRef = doc(firestore, 'siteSettings', 'general');
          const settingsDoc = await getDoc(settingsDocRef);
          if (settingsDoc.exists()) {
            const settingsData = settingsDoc.data();
            setDeliveryCharge(settingsData.deliveryCharge || 0);
            setFreeDeliveryThreshold(settingsData.freeDeliveryThreshold || 0);
          } else {
            console.error('Site settings document does not exist');
          }
        }
      } catch (error) {
        console.error('Error initializing cart or settings:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeCartAndSettings();
  }, [firestore]);

  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
      } catch (error) {
        console.error('Error saving cartItems to localStorage:', error);
      }
    }
  }, [cartItems, user]);

  useEffect(() => {
    if (!user || !firestore) return;

    setLoading(true);
    const cartRef = collection(firestore, `users/${user.uid}/cart`);
    const unsubscribe = onSnapshot(cartRef, (snapshot) => {
      const firestoreCart = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })).filter(item =>
        (item.type === 'poster' && item.posterId && item.size && item.title && item.price !== null && item.finalPrice !== null && item.finish) ||
        (item.type === 'collection' && item.collectionId && item.finish && item.posters?.length > 0 && item.posters.every(p => p.posterId && p.size && p.title && p.price !== null && p.finalPrice !== null))
      );
      setCartItems(firestoreCart);
      try {
        localStorage.setItem('cartItems', JSON.stringify(firestoreCart));
      } catch (error) {
        console.error('Error saving Firestore cart to localStorage:', error);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching Firestore cart:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  const addToCart = async (item, isCollection = false, collectionId = null, collectionDiscount = 0) => {
    console.log('addToCart called with:', {
      itemType: item.type,
      id: isCollection ? item.collectionId : item.posterId,
      discount: isCollection ? item.posters.map(p => p.discount) : item.discount,
      finish: isCollection ? item.finish : item.finish,
    });

    if (isCollection) {
      if (!item.collectionId || !item.finish || !Array.isArray(item.posters) || item.posters.length === 0) {
        console.error('Invalid collection data:', item);
        return false;
      }
      for (const poster of item.posters) {
        if (!poster.posterId || !poster.size || !poster.title || poster.price === null || poster.finalPrice === null) {
          console.error('Invalid poster in collection:', poster);
          return false;
        }
      }
    } else {
      if (!item?.posterId || !item?.size || !item?.title || item.price === null || item.finalPrice === null || !item.finish) {
        console.error('Invalid poster data:', item);
        return false;
      }
    }

    setCartItems((prev) => {
      let updatedCart = [...prev];
      const cartItemId = isCollection
        ? `collection-${item.collectionId}-${item.finish || 'Gloss'}`
        : `poster-${item.posterId}-${item.size}-${item.finish || 'Gloss'}`;

      if (isCollection) {
        const cartItem = {
          id: cartItemId,
          type: 'collection',
          collectionId: item.collectionId,
          finish: item.finish || 'Gloss',
          quantity: 1,
          collectionDiscount,
          posters: item.posters.map(poster => ({
            posterId: poster.posterId,
            size: poster.size,
            price: poster.price,
            finalPrice: poster.finalPrice,
            discount: poster.discount || 0,
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
          finish: item.finish || 'Gloss',
          price: item.price,
          finalPrice: item.finalPrice,
          discount: item.discount || 0,
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
      try {
        localStorage.setItem('cartItems', JSON.stringify(updatedCart));
      } catch (error) {
        console.error('Error saving updated cart to localStorage:', error);
      }
      return updatedCart;
    });

    if (user && firestore) {
      const cartItemId = isCollection
        ? `collection-${item.collectionId}-${item.finish || 'Gloss'}`
        : `poster-${item.posterId}-${item.size}-${item.finish || 'Gloss'}`;

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
                finish: item.finish || 'Gloss',
                quantity: (existingItem?.quantity || 0) + 1,
                collectionDiscount,
                posters: item.posters.map(poster => ({
                  posterId: poster.posterId,
                  size: poster.size,
                  price: poster.price,
                  finalPrice: poster.finalPrice,
                  discount: poster.discount || 0,
                  title: poster.title,
                  image: poster.image || 'https://via.placeholder.com/60',
                  seller: poster.seller || 'Unknown',
                })),
              }
            : {
                posterId: item.posterId,
                title: item.title,
                size: item.size,
                finish: item.finish || 'Gloss',
                price: item.price,
                finalPrice: item.finalPrice,
                discount: item.discount || 0,
                quantity: (existingItem?.quantity || 0) + 1,
                image: item.image || 'https://via.placeholder.com/60',
                seller: item.seller || 'Unknown',
              }),
          addedAt: new Date(),
        });
      } catch (error) {
        console.error('Error adding to Firestore cart:', error);
        return false;
      }
    }
    return true;
  };

  const buyNow = async (item, isCollection = false, collectionId = null, collectionDiscount = 0) => {
    console.log('buyNow called with:', {
      itemType: item.type,
      id: isCollection ? item.collectionId : item.posterId,
      discount: isCollection ? item.posters.map(p => p.discount) : item.discount,
      finish: isCollection ? item.finish : item.finish,
    });

    if (isCollection) {
      if (!item.collectionId || !item.finish || !Array.isArray(item.posters) || item.posters.length === 0) {
        console.error('Invalid buy now collection:', item);
        return false;
      }
      for (const poster of item.posters) {
        if (!poster.posterId || !poster.size || !poster.title || poster.price === null || poster.finalPrice === null) {
          console.error('Invalid poster in collection:', poster);
          return false;
        }
      }
      setBuyNowItem({
        type: 'collection',
        collectionId: item.collectionId,
        finish: item.finish || 'Gloss',
        quantity: 1,
        collectionDiscount,
        posters: item.posters.map(poster => ({
          posterId: poster.posterId,
          size: poster.size,
          price: poster.price,
          finalPrice: poster.finalPrice,
          discount: poster.discount || 0,
          title: poster.title,
          image: poster.image || 'https://via.placeholder.com/60',
          seller: poster.seller || 'Unknown',
        })),
      });
    } else {
      if (!item?.posterId || !item?.size || !item?.title || item.price === null || item.finalPrice === null || !item.finish) {
        console.error('Invalid buy now poster:', item);
        return false;
      }
      setBuyNowItem({
        type: 'poster',
        posterId: item.posterId,
        title: item.title,
        size: item.size,
        finish: item.finish || 'Gloss',
        price: item.price,
        finalPrice: item.finalPrice,
        discount: item.discount || 0,
        quantity: 1,
        image: item.image || 'https://via.placeholder.com/60',
        seller: item.seller || 'Unknown',
      });
    }
    return true;
  };

  const removeFromCart = async (itemId, size, finish = "Gloss", isCollection = false) => {
    const cartItemId = isCollection
      ? `collection-${itemId}-${finish}`
      : `poster-${itemId}-${size}-${finish}`;

    setCartItems((prev) => {
      const updatedCart = prev.filter((item) => item.id !== cartItemId);
      try {
        localStorage.setItem('cartItems', JSON.stringify(updatedCart));
      } catch (error) {
        console.error('Error saving updated cart to localStorage:', error);
      }
      return updatedCart;
    });

    if (user && firestore) {
      const cartDocRef = doc(firestore, `users/${user.uid}/cart`, cartItemId);
      try {
        await deleteDoc(cartDocRef);
      } catch (error) {
        console.error('Error removing from Firestore cart:', error);
        return false;
      }
    }
    return true;
  };

  const updateQuantity = async (itemId, size, finish = "Gloss", newQuantity, isCollection = false) => {
    if (newQuantity < 1) return false;
    const cartItemId = isCollection
      ? `collection-${itemId}-${finish}`
      : `poster-${itemId}-${size}-${finish}`;

    setCartItems((prev) => {
      const updatedCart = prev.map((item) =>
        item.id === cartItemId
          ? { ...item, quantity: newQuantity }
          : item
      );
      try {
        localStorage.setItem('cartItems', JSON.stringify(updatedCart));
      } catch (error) {
        console.error('Error saving updated cart to localStorage:', error);
      }
      return updatedCart;
    });

    if (user && firestore) {
      const cartDocRef = doc(firestore, `users/${user.uid}/cart`, cartItemId);
      try {
        await setDoc(cartDocRef, { quantity: newQuantity }, { merge: true });
      } catch (error) {
        console.error('Error updating Firestore cart quantity:', error);
        return false;
      }
    }
    return true;
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        setCartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        buyNow,
        buyNowItem,
        setBuyNowItem,
        deliveryCharge,
        freeDeliveryThreshold,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};