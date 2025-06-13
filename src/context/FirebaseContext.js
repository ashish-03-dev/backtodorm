import { createContext, useContext, useState, useEffect } from "react";
import {
    getAuth,
    signOut,
    onAuthStateChanged,
    signInWithPhoneNumber,
    RecaptchaVerifier,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
    PhoneAuthProvider,
    linkWithCredential,
} from 'firebase/auth';

import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getDatabase, set, ref } from 'firebase/database';
import { app } from '../firebase';

const FirebaseContext = createContext(null);
export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider = (props) => {
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const database = getDatabase(app);
    const [user, setUser] = useState(null);
    const [confirmationResult, setConfirmationResult] = useState(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                const userRef = doc(firestore, 'users', currentUser.uid);
                const snapshot = await getDoc(userRef);

                if (!snapshot.exists()) {
                    await setDoc(userRef, {
                        uid: currentUser.uid,
                        name: currentUser.displayName || "",
                        email: currentUser.email || "",
                        phone: currentUser.phoneNumber || "",
                        photoURL: currentUser.photoURL || "",
                        createdAt: new Date().toISOString(),
                    });
                }
            } else {
                setUser(null);
            }
        });
        return () => unsub();
    }, [auth, firestore]);

    const putData = (key, data) => { set(ref(database, key), data) };

    const logout = () => signOut(auth);

    const setUpRecaptcha = async (containerId, phoneNumber) => {
        const verifier = new RecaptchaVerifier(containerId, { size: "invisible" }, auth);
        await verifier.render();
        const res = await signInWithPhoneNumber(auth, `+91${phoneNumber}`, verifier);
        setConfirmationResult(res);
        return res;
    };

    const verifyOtp = (otp) => {
        if (!confirmationResult) throw new Error("OTP not sent");
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
    }

    const updateUserProfile = async (uid, data) => {
        if (!uid) throw new Error("No UID provided");
        const userRef = doc(firestore, "users", uid);
        return await setDoc(userRef, data, { merge: true });
    }
    const linkPhoneNumber = async (verificationId, otp) => {
        if (!auth.currentUser) throw new Error("User not signed in");
        const credential = PhoneAuthProvider.credential(verificationId, otp);
        return await linkWithCredential(auth.currentUser, credential);
    }

    const linkGoogleAccount = async () => {
        const provider = new GoogleAuthProvider();
        if (!auth.currentUser) throw new Error("User not signed in");
        return await linkWithCredential(auth.currentUser, await signInWithPopup(auth, provider).then(res => res.credential));
    };

    return (
        <FirebaseContext.Provider value={{
            logout,
            user,
            putData,
            setUpRecaptcha,
            verifyOtp,
            googleLogin,
            getUserProfile,
            updateUserProfile,
            linkPhoneNumber,
            linkGoogleAccount,
        }}>
            {props.children}
        </FirebaseContext.Provider>
    )
}