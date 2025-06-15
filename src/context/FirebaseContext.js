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
    deleteUser,
    reauthenticateWithCredential,
    reauthenticateWithPopup,
} from 'firebase/auth';

import { getFirestore, doc, getDoc, setDoc,deleteDoc } from 'firebase/firestore';
import { getDatabase, set, ref } from 'firebase/database';
import { app } from '../firebase';

const FirebaseContext = createContext(null);
export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider = (props) => {
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const db = getDatabase(app);
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loadingUserData, setLoadingUserData] = useState(true);
    const [confirmationResult, setConfirmationResult] = useState(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (currentUser) => {
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
                    }
                    await setDoc(userRef, userObj);
                    setUserData(userObj);
                } else {
                    setUserData(snapshot.data());
                }

                setLoadingUserData(false);
            } else {
                setUser(null);
                setUserData(null);
                setLoadingUserData(false);
            }
        });
        return () => unsub();
    }, [auth, firestore]);

    const putData = (key, data) => { set(ref(db, key), data) };

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
                        console.log("reCAPTCHA solved");
                    },
                });
                await window.recaptchaVerifier.render();
            }

            const appVerifier = window.recaptchaVerifier;
            const result = await signInWithPhoneNumber(auth, `+91${phoneNumber}`, appVerifier);
            setConfirmationResult(result);
            return result;
        } catch (error) {
            console.error("Error in setUpRecaptcha:", error);
            throw error;
        }
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
            userData,
            loadingUserData,
            firestore,
            db,
            putData,
            setUpRecaptcha,
            verifyOtp,
            googleLogin,
            getUserProfile,
            updateUserProfile,
            linkPhoneNumber,
            linkGoogleAccount,
            deleteUserAccount,
        }}>
            {props.children}
        </FirebaseContext.Provider>
    )
}