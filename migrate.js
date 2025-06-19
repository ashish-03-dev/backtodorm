import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";

// Firebase configuration (replace with your project's config)
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

const standaloneCollections = [
  {
    id: "nature-landscapes",
    title: "Nature Landscapes",
    image: "https://via.placeholder.com/300x375?text=Nature+Landscapes",
    description: "Serene and beautiful views of nature to bring peace to your space.",
    posters: Array.from({ length: 10 }, (_, i) => ({
      id: `nature-${i + 1}`,
      title: `Nature Poster ${i + 1}`,
      img: `https://via.placeholder.com/300x375?text=Nature+Poster+${i + 1}`,
      price: 99,
    })),
  },
  {
    id: "inspirational-quotes-pack",
    title: "Inspirational Quotes Pack",
    image: "https://via.placeholder.com/300x375?text=Inspirational+Quotes",
    description: "Motivational and thoughtful quotes for daily positivity.",
    posters: Array.from({ length: 10 }, (_, i) => ({
      id: `quote-${i + 1}`,
      title: `Quote Poster ${i + 1}`,
      img: `https://via.placeholder.com/300x375?text=Quote+${i + 1}`,
      price: 79,
    })),
  },
  {
    id: "anime-classics-collection",
    title: "Anime Classics Collection",
    image: "https://via.placeholder.com/300x375?text=Anime+Classics",
    description: "Iconic scenes from legendary anime like Naruto, DBZ, and One Piece.",
    posters: Array.from({ length: 15 }, (_, i) => ({
      id: `anime-${i + 1}`,
      title: `Anime Poster ${i + 1}`,
      img: `https://via.placeholder.com/300x375?text=Anime+Poster+${i + 1}`,
      price: 89,
    })),
  },
  {
    id: "poster-packs",
    title: "50 Poster Mega Pack",
    image: "https://via.placeholder.com/300x375?text=Poster+Pack",
    description: "A giant pack of 50 assorted posters at a value price.",
    posters: Array.from({ length: 50 }, (_, i) => ({
      id: `mega-${i + 1}`,
      title: `Poster ${i + 1}`,
      img: `https://via.placeholder.com/300x375?text=Poster+${i + 1}`,
      price: 49,
    })),
  },
  {
    id: "ultimate-anime-pack",
    title: "Ultimate Anime Pack",
    image: "https://via.placeholder.com/300x375?text=Ultimate+Anime",
    description: "Top trending anime posters in one exclusive bundle.",
    posters: Array.from({ length: 20 }, (_, i) => ({
      id: `ultimate-anime-${i + 1}`,
      title: `Ultimate Anime Poster ${i + 1}`,
      img: `https://via.placeholder.com/300x375?text=Anime+Poster+${i + 1}`,
      price: 99,
    })),
  },
  {
    id: "aesthetic-wall-collection",
    title: "Aesthetic Wall Collection",
    image: "https://via.placeholder.com/300x375?text=Aesthetic+Wall",
    description: "Pastel tones and soft visuals for a clean aesthetic vibe.",
    posters: Array.from({ length: 12 }, (_, i) => ({
      id: `aesthetic-${i + 1}`,
      title: `Aesthetic Poster ${i + 1}`,
      img: `https://via.placeholder.com/300x375?text=Aesthetic+Poster+${i + 1}`,
      price: 69,
    })),
  },
];

async function migrateCollections() {
  try {
    for (const col of standaloneCollections) {
      await setDoc(doc(firestore, "standaloneCollections", col.id), {
        title: col.title,
        image: col.image,
        description: col.description,
        posters: col.posters,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`Migrated collection: ${col.title}`);
    }
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

migrateCollections();