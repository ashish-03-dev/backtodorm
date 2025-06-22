const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const cloudinary = require("cloudinary").v2;

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage().bucket();

// Cloudinary secrets
const CLOUDINARY_SECRETS = [
  defineSecret("CLOUDINARY_CLOUD_NAME"),
  defineSecret("CLOUDINARY_API_KEY"),
  defineSecret("CLOUDINARY_API_SECRET"),
];

exports.approvePoster = onCall(
  {
    secrets: CLOUDINARY_SECRETS,
    region: "asia-south1",
    timeoutSeconds: 120,
    concurrency: 80,
  },
  async ({ data: { posterId }, auth }) => {
    if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");

    // Validate admin access
    const user = await db.collection("users").doc(auth.uid).get();
    if (!user.exists || !user.data().isAdmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    // Validate input
    if (!posterId) throw new HttpsError("invalid-argument", "Poster ID is required");

    // Validate secrets
    const [cloudName, apiKey, apiSecret] = CLOUDINARY_SECRETS.map((s) => s.value());
    if (!cloudName || !apiKey || !apiSecret) {
      throw new HttpsError("failed-precondition", "Cloudinary secrets not configured");
    }

    // Configure Cloudinary
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

    // Get temp poster
    const tempPosterRef = db.collection("tempPosters").doc(posterId);
    const tempPoster = await tempPosterRef.get();
    if (!tempPoster.exists) throw new HttpsError("not-found", "Poster not found");

    const posterData = tempPoster.data();
    let imageUrl = posterData.originalImageUrl;

    // Process image
    if (imageUrl) {
      try {
        const file = storage.file(imageUrl);
        const [buffer] = await file.download();
        const result = await cloudinary.uploader.upload(
          `data:image/jpeg;base64,${buffer.toString("base64")}`,
          { folder: "posters", public_id: `${posterId}_${Date.now()}`, timeout: 120000 }
        );
        if (result.secure_url) {
          imageUrl = result.secure_url;
          await file.delete();
        }
      } catch (error) {
        console.warn("Cloudinary upload failed, using Storage URL", error.message);
      }
    } else {
      throw new HttpsError("invalid-argument", "Image URL missing");
    }

    // Update Firestore in transaction
    await db.runTransaction(async (t) => {
      const sellerRef = db.collection("sellers").doc(posterData.sellerUsername);
      const collectionRefs = (posterData.collections || []).map((col) =>
        db.collection("collections").doc(col)
      );

      const [seller, ...collections] = await Promise.all([
        t.get(sellerRef),
        ...collectionRefs.map((ref) => t.get(ref)),
      ]);

      // Update poster
      t.set(db.collection("posters").doc(posterId), {
        ...posterData,
        imageUrl,
        originalImageUrl: null,
        approved: "approved",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      t.delete(tempPosterRef);

      // Update collections
      collections.forEach((col, i) => {
        if (col.exists && !col.data().posterIds?.includes(posterId)) {
          t.update(collectionRefs[i], {
            posterIds: admin.firestore.FieldValue.arrayUnion(posterId),
          });
        }
      });

      // Update seller
      const approvedPoster = {
        posterId,
        createdAt: posterData.createdAt || new Date().toISOString(),
      };
      if (seller.exists) {
        t.update(sellerRef, {
          tempPosters: admin.firestore.FieldValue.arrayRemove({ posterId }),
          approvedPosters: admin.firestore.FieldValue.arrayUnion(approvedPoster),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        t.set(sellerRef, {
          sellerUsername: posterData.sellerUsername,
          tempPosters: [],
          approvedPosters: [approvedPoster],
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

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