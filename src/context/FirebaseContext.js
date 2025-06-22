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
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { getDatabase, set, ref } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { app } from '../firebase';

const FirebaseContext = createContext(null);
export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider = ({ children }) => {
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const database = getDatabase(app);
  const storage = getStorage(app);
  const functions = getFunctions(app, 'asia-south1');

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

          if (!snapshot.exists()) {
            const userObj = {
              uid: currentUser.uid,
              name: currentUser.displayName || '',
              email: currentUser.email || '',
              phone: currentUser.phoneNumber || '',
              photoURL: currentUser.photoURL || '',
              createdAt: new Date().toISOString(),
              isSeller: false,
              isAdmin: currentUser.uid === 'xhJlJHvOxgSysxjQl8AJfvdhGPg1',
            };
            await setDoc(userRef, userObj);
            setUserData(userObj);
          } else {
            const data = snapshot.data();
            setUserData({
              ...data,
              isAdmin: data.isAdmin ?? false,
            });
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

  const becomeSeller = async (sellerData) => {
    if (!user) throw new Error('User not signed in');
    const userRef = doc(firestore, 'users', user.uid);
    const { available } = await checkUsernameAvailability(sellerData.sellerUsername);
    if (!available) throw new Error('Username is already taken');

    const updatedData = {
      isSeller: true,
      sellerUsername: sellerData.sellerUsername,
      sellerCreatedAt: new Date().toISOString(),
    };
    await setDoc(userRef, updatedData, { merge: true });
    setUserData((prev) => ({ ...prev, ...updatedData }));
    return updatedData;
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

  const updateUserProfile = async (uid, data) => {
    if (!uid) throw new Error('No UID provided');
    const userRef = doc(firestore, 'users', uid);
    await setDoc(userRef, data, { merge: true });
  };

  const linkPhoneNumber = async (verificationId, otp) => {
    if (!auth.currentUser) throw new Error('User not signed in');
    const credential = PhoneAuthProvider.credential(verificationId, otp);
    return linkWithCredential(auth.currentUser, credential);
  };

  const linkGoogleAccount = async () => {
    if (!auth.currentUser) throw new Error('User not signed in');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return linkWithCredential(auth.currentUser, result.credential);
  };

  const deleteUserAccount = async (setUpRecaptcha) => {
    if (!auth.currentUser) throw new Error('User not signed in');
    const user = auth.currentUser;

    try {
      await deleteUser(user);
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        const providerId = user.providerData[0]?.providerId;
        try {
          if (providerId === 'google.com') {
            const provider = new GoogleAuthProvider();
            await reauthenticateWithPopup(user, provider);
          } else if (providerId === 'phone') {
            const phoneNumber = user.phoneNumber?.replace('+91', '');
            const result = await setUpRecaptcha('recaptcha-container', phoneNumber);
            const otp = prompt('Enter the OTP sent to your phone:');
            const credential = PhoneAuthProvider.credential(result.verificationId, otp);
            await reauthenticateWithCredential(user, credential);
          } else {
            throw new Error('Unsupported provider for re-authentication');
          }
          await deleteUser(user);
        } catch (reauthErr) {
          throw new Error(`Re-authentication failed: ${reauthErr.message}`);
        }
      } else {
        throw new Error(`Delete failed: ${err.message}`);
      }
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        logout,
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
        updateUserProfile,
        linkPhoneNumber,
        linkGoogleAccount,
        deleteUserAccount,
        becomeSeller,
        checkUsernameAvailability,
        error,
        app,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};