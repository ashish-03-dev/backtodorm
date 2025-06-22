const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const cloudinary = require("cloudinary").v2;

admin.initializeApp();
const firestore = admin.firestore();
const storage = admin.storage().bucket();

const CLOUDINARY_CLOUD_NAME = defineSecret("CLOUDINARY_CLOUD_NAME");
const CLOUDINARY_API_KEY = defineSecret("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = defineSecret("CLOUDINARY_API_SECRET");

exports.approvePoster = onCall(
  {
    secrets: [CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET],
    region: "us-central1",
    timeoutSeconds: 120,
    concurrency: 80,
    cors: ["http://localhost:3000", "https://back-to-dorm.web.app"], // Adjust production URL
  },
  async (request) => {
    const { posterId } = request.data;
    const { auth } = request.context;
    const logMeta = {
      posterId,
      userId: auth?.uid,
      timestamp: new Date().toISOString(),
    };
    console.log("approvePoster invoked", logMeta);

    if (!auth) {
      console.error("Unauthenticated request", logMeta);
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const userDoc = await firestore.collection("users").doc(auth.uid).get();
    if (!userDoc.exists || !userDoc.data().isAdmin) {
      console.error("Non-admin access attempt", { ...logMeta, isAdmin: userDoc.data()?.isAdmin });
      throw new HttpsError("permission-denied", "Admin access required");
    }

    if (!posterId) {
      console.error("Missing posterId", logMeta);
      throw new HttpsError("invalid-argument", "Poster ID is required");
    }

    const tempPosterRef = firestore.collection("tempPosters").doc(posterId);
    const tempPosterDoc = await tempPosterRef.get();
    if (!tempPosterDoc.exists) {
      console.error("Poster not found", logMeta);
      throw new HttpsError("not-found", "Poster not found");
    }

    const posterData = tempPosterDoc.data();
    let imageUrl = posterData.originalImageUrl || "";
    if (posterData.originalImageUrl) {
      try {
        const file = storage.file(posterData.originalImageUrl);
        const [buffer] = await file.download();
        const cloudinaryResult = await cloudinary.uploader.upload(
          `data:image/jpeg;base64,${buffer.toString("base64")}`,
          { folder: "posters", public_id: `${posterId}_${Date.now()}` }
        );
        imageUrl = cloudinaryResult.secure_url;
        await file.delete();
      } catch (error) {
        console.warn("Image processing failed", { ...logMeta, error: error.message });
      }
    }

    await firestore.runTransaction(async (transaction) => {
      const finalPosterRef = firestore.collection("posters").doc(posterId);
      transaction.set(finalPosterRef, {
        ...posterData,
        imageUrl,
        originalImageUrl: null,
        approved: "approved",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.delete(tempPosterRef);
    });

    console.log("Poster approved", logMeta);
    return { success: true, posterId, imageUrl };
  }
);

// const { onRequest } = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");

// const functions = require("firebase-functions");
// const admin = require("firebase-admin");

// admin.initializeApp();
// const db = admin.firestore();

// exports.submitPoster = functions.https.onCall(async (data, context) => {
//     if (!context.auth) {
//         throw new functions.https.HttpsError("unauthenticated", "Please log in");
//     }

//     const { title, imageUrl, price, category, tags, stock } = data;

//     if (!title || !imageUrl || price == null || !category || !Array.isArray(tags) || stock == null) {
//         throw new functions.https.HttpsError("invalid-argument", "Missing poster data.");
//     }

//     const sellerId = context.auth.uid;
//     const sellerRef = db.collection("sellers").doc(sellerId);

//     const posterData = {
//         title,
//         imageUrl,
//         price,
//         category,
//         tags,
//         stock,
//         sellerId: sellerRef,
//         isPublished: false,
//         status: "pending", // admin will review
//         createdAt: admin.firestore.FieldValue.serverTimestamp(),
//     };

//     const docRef = await db.collection("posters").add(posterData);
//     return { success: true, posterId: docRef.id };
// })

// exports.reviewPosterStatus = functions.https.onCall(async (data, context) => {
//     const { posterId, status } = data;

//     // ⚠️ You must check admin role using custom claims (optional for now)
//     if (!context.auth || context.auth.token.role !== "admin") {
//         throw new functions.https.HttpsError("permission-denied", "Admins only.");
//     }

//     if (!["approved", "rejected"].includes(status)) {
//         throw new functions.https.HttpsError("invalid-argument", "Invalid status.");
//     }

//     const posterRef = db.collection("posters").doc(posterId);

//     const updateData = {
//         status,
//     };

//     if (status === "approved") {
//         updateData.isPublished = true;
//     }

//     await posterRef.update(updateData);

//     return { success: true };
// });