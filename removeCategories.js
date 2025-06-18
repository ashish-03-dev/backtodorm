import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

// Initialize Firebase (replace with your config)
const firebaseConfig = {
    apiKey: "AIzaSyCV3yJpGQWSV0DMbY2w0Y0CrkQWOtRWJhs",
    authDomain: "back-to-dorm.firebaseapp.com",
    databaseURL: "https://back-to-dorm-default-rtdb.firebaseio.com",
    projectId: "back-to-dorm",
    storageBucket: "back-to-dorm.firebasestorage.app",
    messagingSenderId: "536014495018",
    appId: "1:536014495018:web:a124f8ddac1548a400d253",
    measurementId: "G-5Y6B4BZJY1",
    databaseURL: "https://back-to-dorm-default-rtdb.firebaseio.com/",
};
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function removeCategoryField() {
  try {
    const postersRef = collection(firestore, "posters");
    const snapshot = await getDocs(postersRef);

    console.log(`Found ${snapshot.size} posters to process.`);

    for (const posterDoc of snapshot.docs) {
      const posterData = posterDoc.data();
      if ("category" in posterData) {
        console.log(`Removing category from poster ${posterDoc.id}`);
        await updateDoc(doc(firestore, "posters", posterDoc.id), {
          category: null, // Firestore: use null to remove field
        });
      } else {
        console.log(`No category field in poster ${posterDoc.id}`);
      }
    }

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Error during migration:", error);
  }
}

removeCategoryField();