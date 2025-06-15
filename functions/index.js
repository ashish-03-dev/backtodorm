const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.submitPoster = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Please log in");
    }

    const { title, imageUrl, price, category, tags, stock } = data;

    if (!title || !imageUrl || price == null || !category || !Array.isArray(tags) || stock == null) {
        throw new functions.https.HttpsError("invalid-argument", "Missing poster data.");
    }

    const sellerId = context.auth.uid;
    const sellerRef = db.collection("sellers").doc(sellerId);

    const posterData = {
        title,
        imageUrl,
        price,
        category,
        tags,
        stock,
        sellerId: sellerRef,
        isPublished: false,
        status: "pending", // admin will review
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("posters").add(posterData);
    return { success: true, posterId: docRef.id };
})

exports.reviewPosterStatus = functions.https.onCall(async (data, context) => {
    const { posterId, status } = data;

    // ⚠️ You must check admin role using custom claims (optional for now)
    if (!context.auth || context.auth.token.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Admins only.");
    }

    if (!["approved", "rejected"].includes(status)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid status.");
    }

    const posterRef = db.collection("posters").doc(posterId);

    const updateData = {
        status,
    };

    if (status === "approved") {
        updateData.isPublished = true;
    }

    await posterRef.update(updateData);

    return { success: true };
});