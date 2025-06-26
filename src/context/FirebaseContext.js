import { createContext, useContext, useState, useEffect } from 'react';
import {
  getAuth,
  signOut,
  onAuthStateChanged,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  GoogleAuthProvider,
  signInWithPopup,
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
            const data = snapshot.data();
            setUserData({
              ...data,
              isAdmin: data.isAdmin ?? false,
              isActive: data.isActive ?? true,
            });
          } else {
            setUserData(null); // Wait for Cloud Function to create user document
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
  }, [auth, firestore]);

  const createUser = async (data) => {
    const createUserFunction = httpsCallable(functions, 'createUser');
    return createUserFunction(data);
  };

  const updateUserProfile = async (data) => {
    const fn = httpsCallable(functions, "updateUserProfile");
    return fn(data);
  };

  const checkUsernameAvailability = async (username) => {
    if (!username.startsWith('@') || username.length < 2) {
      return { available: false, message: 'Username must start with @ and contain at least one character' };
    }
    const q = query(collection(firestore, 'users'), where('sellerUsername', '==', username));
    const querySnapshot = await getDocs(q);
    return {
      available: querySnapshot.empty,
      message: querySnapshot.empty ? 'Username is available' : 'Username is already taken',
    };
  };

  const putData = (key, data) => set(ref(database, key), data);

  const logout = () => signOut(auth);

  const setUpRecaptcha = async (containerId, phoneNumber) => {
    try {
      if (window.location.hostname === 'localhost') {
        auth.settings.appVerificationDisabledForTesting = true;
      }
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
          size: 'invisible',
        });
        await window.recaptchaVerifier.render();
      }
      const result = await signInWithPhoneNumber(auth, `+91${phoneNumber}`, window.recaptchaVerifier);
      setConfirmationResult(result);
      return result;
    } catch (err) {
      throw new Error(`Recaptcha setup failed: ${err.message}`);
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

  const getUserProfile = async (uid) => {
    if (!uid) return null;
    const userRef = doc(firestore, 'users', uid);
    const snapshot = await getDoc(userRef);
    return snapshot.exists() ? snapshot.data() : null;
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
    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(auth, provider);
    try {
      return await linkWithCredential(auth.currentUser, result.credential);
    } catch (err) {
      if (err.code === 'auth/credential-already-in-use') {
        throw new Error("This Google account is already linked with another user.");
      }
      throw err;
    }
  };


  const deactivateUserAccount = async () => {
    if (!auth.currentUser) throw new Error('User not signed in');
    const user = auth.currentUser;

    try {
      const userRef = doc(firestore, 'users', user.uid);
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
        createUser,
        updateUserProfile,
        user,
        auth,
        userData,
        loadingUserData,
        firestore,
        database,
        storage,
        functions,
        putData,
        setUpRecaptcha,
        verifyOtp,
        googleLogin,
        getUserProfile,
        linkPhoneNumber,
        linkGoogleAccount,
        deactivateUserAccount,
        checkUsernameAvailability,
        error,
        app,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};