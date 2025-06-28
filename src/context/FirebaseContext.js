import { createContext, useContext, useState, useEffect } from 'react';
import {
  getAuth,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  GoogleAuthProvider,
  linkWithPopup,
  PhoneAuthProvider,
  linkWithCredential,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { getDatabase, set, ref } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

const FirebaseContext = createContext(null);
export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider = ({ children }) => {
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const database = getDatabase(app);
  const storage = getStorage(app);
  const functions = getFunctions(app, 'us-central1');

  if (window.location.hostname === 'localhost') {
    auth.settings.appVerificationDisabledForTesting = true;
  }

  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoadingUserData(true);
      try {
        if (currentUser) {
          setUser(currentUser);
          const userRef = doc(firestore, 'users', currentUser.uid);
          const snapshot = await getDoc(userRef);
          if (snapshot.exists()) {
            setUserData(snapshot.data());
          } else {
            const nameToUse = currentUser.displayName || '';
            console.log(currentUser);
            await httpsCallable(functions, 'updateUser')({ name: nameToUse });
            const newSnapshot = await getDoc(userRef);
            if (newSnapshot.exists()) {
              setUserData(newSnapshot.data());
            }
          }
        } else {
          setUser(null);
          setUserData(null);
        }
      } catch (err) {
        setError(`Authentication error: ${err.message}`);
        console.error('Auth state change error:', err);
      } finally {
        setLoadingUserData(false);
      }
    });

    return () => unsubscribe();
  }, [auth, firestore, functions]);

  const updateUser = async (data) => {
    const fn = httpsCallable(functions, 'updateUser');
    return fn(data);
  };

  const checkUsernameAvailability = async (username) => {
    if (!username.startsWith('@') || username.length < 2) {
      return { available: false, message: 'Username must start with @ and contain at least one character', };
    }

    const docRef = doc(firestore, 'sellers', username);
    const docSnap = await getDoc(docRef);

    return {
      available: !docSnap.exists(),
      message: docSnap.exists()
        ? 'Username is already taken'
        : 'Username is available',
    };
  };

  const logout = () => signOut(auth);

  const setUpRecaptcha = async (containerId, phoneNumber) => {
    try {
      const auth = getAuth();
      if (!auth) throw new Error("Firebase Auth not initialized");

      const container = document.getElementById(containerId);
      if (!container) throw new Error(`Container ${containerId} not found`);

      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
        container.innerHTML = '';
      }

      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: "invisible",
        callback: (response) => console.log("reCAPTCHA solved:", response),
        "expired-callback": () => { throw new Error("reCAPTCHA expired"); }
      });

      await window.recaptchaVerifier.render();

      const phone = `+91${phoneNumber}`;
      if (!phone.match(/^\+\d{11,12}$/)) throw new Error("Invalid phone number");

      const result = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirmationResult(result);
      return result;
    } catch (err) {
      throw new Error(`Recaptcha failed: ${err.message}`);
    }
  };

  const verifyOtp = (otp) => {
    if (!confirmationResult) throw new Error('No OTP confirmation available');
    return confirmationResult.confirm(otp);
  };

  const googleLogin = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const linkPhoneNumber = async (verificationId, otp) => {
    if (!auth.currentUser) throw new Error('User not signed in');
    const credential = PhoneAuthProvider.credential(verificationId, otp);
    try {
      return await linkWithCredential(auth.currentUser, credential);
    } catch (err) {
      if (err.code === 'auth/credential-already-in-use') {
        throw new Error("This phone number is already linked with another account.");
      }
      throw err;
    }
  };

  const linkGoogleAccount = async () => {
    if (!auth.currentUser) throw new Error('User not signed in');
    try {
      const result = await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
      return result.user.providerData.find(p => p.providerId === "google.com");
    } catch (err) {
      const msg = {
        'auth/credential-already-in-use': "This Google account is already linked with another user.",
        'auth/provider-already-linked': "Google account is already linked to this user.",
      }[err.code] || `Failed to link Google account: ${err.message}`;
      throw new Error(msg);
    }
  };

  const deactivateUserAccount = async () => {
    if (!auth.currentUser) throw new Error('User not signed in');
    try {
      const userRef = doc(firestore, 'users', auth.currentUser.uid);
      await setDoc(userRef, { isActive: false, deactivatedAt: new Date().toISOString() }, { merge: true });
      await signOut(auth);
    } catch (err) {
      throw new Error(`Deactivation failed: ${err.message}`);
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        logout,
        updateUser,
        user,
        auth,
        userData,
        setUserData,
        loadingUserData,
        firestore,
        database,
        storage,
        functions,
        setUpRecaptcha,
        verifyOtp,
        googleLogin,
        linkPhoneNumber,
        linkGoogleAccount,
        deactivateUserAccount,
        checkUsernameAvailability,
        error,
        app,
        confirmationResult,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};