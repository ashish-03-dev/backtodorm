import { createContext, useContext, useState, useEffect } from "react";
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
import { getFirestore, doc, getDoc, setDoc, deleteDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { getDatabase, set, ref } from 'firebase/database';
import { getStorage } from 'firebase/storage'; // Add this import
import { app } from '../firebase';
import { getFunctions} from "firebase/functions";

const FirebaseContext = createContext(null);
export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider = (props) => {
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const db = getDatabase(app);
  const storage = getStorage(app); // Initialize Storage
const functions = getFunctions(app, "us-central1");
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          const userRef = doc(firestore, 'users', currentUser.uid);
          const snapshot = await getDoc(userRef);

          if (!snapshot.exists()) {
            const userObj = {
              uid: currentUser.uid,
              name: currentUser.displayName || "",
              email: currentUser.email || "",
              phone: currentUser.phoneNumber || "",
              photoURL: currentUser.photoURL || "",
              createdAt: new Date().toISOString(),
              isSeller: false,
              isAdmin: currentUser.uid === 'xhJlJHvOxgSysxjQl8AJfvdhGPg1' ? true : false,
            };
            try {
              await setDoc(userRef, userObj);
              setUserData(userObj);
            } catch (setError) {
              setError("Failed to initialize user data");
              setUserData(userObj);
            }
          } else {
            const data = snapshot.data();
            const userDataWithFallback = {
              ...data,
              isAdmin: data.isAdmin ?? false,
            };
            setUserData(userDataWithFallback);
          }
        } else {
          setUser(null);
          setUserData(null);
        }
      } catch (err) {
        setError("Authentication error: " + err.message);
        setUser(null);
        setUserData(null);
      } finally {
        setLoadingUserData(false);
      }
    });
    return () => unsub();
  }, [auth, firestore]);

  const checkUsernameAvailability = async (username) => {
    if (!username.startsWith('@') || username.length < 2) {
      return { available: false, message: "Username must start with @ and contain at least one character" };
    }
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('sellerUsername', '==', username));
    const querySnapshot = await getDocs(q);
    return {
      available: querySnapshot.empty,
      message: querySnapshot.empty ? "Username is available" : "Username is already taken",
    };
  };

  const becomeSeller = async (sellerData) => {
    if (!user) throw new Error("User not signed in");
    const userRef = doc(firestore, 'users', user.uid);
    const { available } = await checkUsernameAvailability(sellerData.sellerUsername);
    if (!available) throw new Error("Username is already taken");

    const updatedData = {
      isSeller: true,
      sellerUsername: sellerData.sellerUsername,
      sellerCreatedAt: new Date().toISOString(),
    };
    await setDoc(userRef, updatedData, { merge: true });
    setUserData((prev) => ({ ...prev, ...updatedData }));
    return updatedData;
  };

  const putData = (key, data) => set(ref(db, key), data);

  const logout = () => signOut(auth);

  const setUpRecaptcha = async (containerId, phoneNumber) => {
    try {
      if (window.location.hostname === "localhost") {
        auth.settings.appVerificationDisabledForTesting = true;
      }
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
          size: "invisible",
          callback: () => {
          },
        });
        await window.recaptchaVerifier.render();
      }
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, `+91${phoneNumber}`, appVerifier);
      setConfirmationResult(result);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const verifyOtp = (otp) => {
    if (!confirmationResult) throw new Error("OTP not provided");
    return confirmationResult.confirm(otp);
  };

  const googleLogin = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const getUserProfile = async (uid) => {
    if (!uid) return null;
    const userRef = doc(firestore, 'users', uid);
    const usersnap = await getDoc(userRef);
    return usersnap.exists() ? usersnap.data() : null;
  };

  const updateUserProfile = async (uid, data) => {
    if (!uid) throw new Error("No UID provided");
    const userRef = doc(firestore, "users", uid);
    return await setDoc(userRef, data, { merge: true });
  };

  const linkPhoneNumber = async (verificationId, otp) => {
    if (!auth.currentUser) throw new Error("User not signed in");
    const credential = PhoneAuthProvider.credential(verificationId, otp);
    return await linkWithCredential(auth.currentUser, credential);
  };

  const linkGoogleAccount = async () => {
    const provider = new GoogleAuthProvider();
    if (!auth.currentUser) throw new Error("User not signed in");
    return await linkWithCredential(auth.currentUser, await signInWithPopup(auth, provider).then(res => res.credential));
  };

  const deleteUserAccount = async (setUpRecaptcha) => {
    if (!auth.currentUser) return alert("User not signed in");
    const user = auth.currentUser;

    try {
      await deleteUser(user);
      alert("Account deleted successfully");
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        alert("Please re-authenticate to delete your account.");
        const providerId = user.providerData[0]?.providerId;

        try {
          if (providerId === "google.com") {
            const provider = new GoogleAuthProvider();
            await reauthenticateWithPopup(user, provider);
          } else if (providerId === "phone") {
            const phoneNumber = user.phoneNumber?.replace("+91", "");
            const result = await setUpRecaptcha("recaptcha-container", phoneNumber);
            const otp = prompt("Enter the OTP sent to your phone:");
            const credential = PhoneAuthProvider.credential(result.verificationId, otp);
            await reauthenticateWithCredential(user, credential);
          } else {
            throw new Error("Unsupported provider for re-authentication.");
          }

          await deleteUser(user);
          alert("Account deleted successfully after re-authentication.");
        } catch (reauthErr) {
          console.error("Re-authentication failed:", reauthErr);
          alert("Re-authentication failed: " + reauthErr.message);
        }
      } else {
        console.error("Delete failed:", err);
        alert("Delete failed: " + err.message);
      }
    }
  };

  return (
    <FirebaseContext.Provider value={{
      logout,
      user,
      auth,
      userData,
      loadingUserData,
      firestore,
      db,
      storage,
      functions, // Add storage to context
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
    }}>
      {props.children}
    </FirebaseContext.Provider>
  );
};