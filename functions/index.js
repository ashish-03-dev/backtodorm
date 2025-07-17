const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const cloudinary = require("cloudinary").v2;
const Razorpay = require("razorpay");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage().bucket();

// Cloudinary secrets
const CLOUDINARY_SECRETS = [
  defineSecret("CLOUDINARY_CLOUD_NAME"),
  defineSecret("CLOUDINARY_API_KEY"),
  defineSecret("CLOUDINARY_API_SECRET"),
];

// Razorpay secrets
const RAZORPAY_SECRETS = [
  defineSecret("RAZORPAY_KEY_ID"),
  defineSecret("RAZORPAY_KEY_SECRET"),
];

// Fetch delivery settings from siteSettings/general
async function fetchDeliveryConfig() {
  try {
    const settingsDoc = await db.doc("siteSettings/general").get();
    if (!settingsDoc.exists) {
      console.warn("Site settings not found, using defaults");
      return {
        standardDeliveryCharge: 50,
        freeDeliveryThreshold: 1000,
      };
    }
    const data = settingsDoc.data();
    const config = {
      standardDeliveryCharge: data.deliveryCharge || 50,
      freeDeliveryThreshold: data.freeDeliveryThreshold || 1000,
    };
    console.log("Fetched delivery config:", config);
    return config;
  } catch (error) {
    console.error("Failed to fetch delivery config:", error.message);
    return {
      standardDeliveryCharge: 50,
      freeDeliveryThreshold: 1000,
    };
  }
}


exports.uploadFrame = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 60,
    concurrency: 80,
    secrets: CLOUDINARY_SECRETS,
  },
  async ({ data, auth }) => {
    if (!auth || !auth.uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const { imageUrl, frameId, fileName } = data;
    if (!imageUrl || !frameId || !fileName) {
      throw new HttpsError("invalid-argument", "imageUrl, frameId, and fileName are required");
    }

    try {
      cloudinary.config({
        cloud_name: CLOUDINARY_SECRETS[0].value(),
        api_key: CLOUDINARY_SECRETS[1].value(),
        api_secret: CLOUDINARY_SECRETS[2].value(),
      });

      // Upload to Cloudinary
      const response = await cloudinary.uploader.upload(imageUrl, {
        folder: "frames",
        format: "webp",
      });

      if (!response.secure_url || !response.secure_url.startsWith("https://res.cloudinary.com")) {
        throw new Error("Invalid Cloudinary URL returned");
      }

      // Delete from Firebase Storage
      try {
        const storageRef = storage.file(`frames/${fileName}`);
        await storageRef.delete();
        console.log(`Deleted image from Firebase Storage: frames/${fileName}`);
      } catch (error) {
        console.warn(`No file found in Firebase Storage or failed to delete: ${error.message}`);
      }

      return { success: true, cloudinaryUrl: response.secure_url };
    } catch (error) {
      console.error("Failed to upload to Cloudinary or delete from Storage:", error);
      throw new HttpsError("internal", `Failed to process image: ${error.message}`);
    }
  }
);

exports.updateUser = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
    concurrency: 80,
  },
  async ({ data = {}, auth }) => {
    const { name } = data;
    if (!auth || !auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = auth.uid;

    if (name && (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100)) {
      throw new HttpsError('invalid-argument', 'Name must be a string between 1 and 100 characters');
    }

    const userRef = db.doc(`users/${userId}`);

    try {
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const docData = userDoc.exists ? userDoc.data() : {};

        const userData = {
          uid: userId,
          name: name ? name.trim() : docData.name || auth.token.name || '',
          email: auth.token.email || null,
          phone: auth.token.phone_number || null,
          photoURL: auth.token.picture || '',
          createdAt: docData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          isSeller: docData.isSeller ?? false,
          isActive: docData.isActive ?? true,
        };

        // Conditionally include `isAdmin` only if it already exists
        if ('isAdmin' in docData) {
          userData.isAdmin = docData.isAdmin;
        }

        transaction.set(userRef, userData, { merge: true });
      });
      return { success: true, userId };
    } catch (error) {
      console.error('Failed to update user document:', error);
      throw new HttpsError('internal', 'Failed to update user document');
    }
  }
);

exports.setAdminStatus = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
  },
  async ({ data: { userId, isAdmin, isSeller }, auth }) => {
    if (!auth || !auth.token.isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required.');
    }

    if (!userId || typeof isAdmin !== 'boolean' || typeof isSeller !== 'boolean') {
      throw new HttpsError('invalid-argument', 'Invalid userId, isAdmin, or isSeller value.');
    }

    try {
      await admin.firestore().doc(`users/${userId}`).set(
        { isAdmin, isSeller },
        { merge: true }
      );
      return { success: true };

    } catch (error) {
      console.error('Set admin/seller status failed:', error);
      throw new HttpsError('internal', 'Failed to set admin/seller status.');
    }
  }
);

exports.approvePoster = onCall(
  {
    secrets: CLOUDINARY_SECRETS,
    region: "us-central1",
    timeoutSeconds: 120,
    concurrency: 80,
  },
  async ({ data: { posterId }, auth }) => {
    if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");

    const user = await db.collection("users").doc(auth.uid).get();
    if (!user.exists || !user.data().isAdmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    if (!posterId) throw new HttpsError("invalid-argument", "Poster ID is required");

    const [cloudName, apiKey, apiSecret] = CLOUDINARY_SECRETS.map((s) => s.value());
    if (!cloudName || !apiKey || !apiSecret) {
      throw new HttpsError("failed-precondition", "Cloudinary secrets not configured");
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

    const tempPosterRef = db.collection("tempPosters").doc(posterId);
    const tempPoster = await tempPosterRef.get();
    if (!tempPoster.exists) throw new HttpsError("not-found", "Poster not found");

    const posterData = tempPoster.data();
    let framedImageUrl = posterData.framedImageUrl;
    let originalImageUrl = posterData.originalImageUrl;

    let framedCloudinaryUrl = null;
    let originalCloudinaryUrl = null;
    const deletionPromises = [];

    // Upload framed image to Cloudinary posters/ folder
    if (framedImageUrl) {
      try {
        const file = storage.file(framedImageUrl);
        const [buffer] = await file.download();
        const result = await cloudinary.uploader.upload(
          `data:image/jpeg;base64,${buffer.toString("base64")}`,
          { folder: "posters", public_id: `${posterId}_framed_${Date.now()}`, timeout: 120000 }
        );
        if (result.secure_url) {
          framedCloudinaryUrl = result.secure_url;
          deletionPromises.push(file.delete());
        }
      } catch (error) {
        console.warn("Cloudinary framed image upload failed, using Storage URL", error.message);
        throw new HttpsError("download-failed", "invalid imageUrl");
      }
    } else {
      throw new HttpsError("invalid-argument", "Framed image URL missing");
    }

    // Upload original image to Cloudinary originalPoster/ folder and store in originalPoster collection
    if (originalImageUrl) {
      try {
        const file = storage.file(originalImageUrl);
        const [buffer] = await file.download();
        const result = await cloudinary.uploader.upload(
          `data:image/jpeg;base64,${buffer.toString("base64")}`,
          { folder: "originalPoster", public_id: `${posterData.posterId}_original_${Date.now()}`, timeout: 120000 }
        );
        if (result.secure_url) {
          originalCloudinaryUrl = result.secure_url;
          deletionPromises.push(file.delete());
        } else {
          throw new Error("No secure_url returned from Cloudinary");
        }
      } catch (error) {
        console.warn("Cloudinary original image upload failed", error.message);
        if (framedCloudinaryUrl) {
          try {
            await cloudinary.uploader.destroy(`posters/${posterId}_framed_${Date.now()}`);
          } catch (cleanupError) {
            console.warn("Failed to clean up framed image from Cloudinary:", cleanupError.message);
          }
        }
        throw new HttpsError("internal", "Failed to upload original image to Cloudinary");
      }
    } else {
      throw new HttpsError("invalid-argument", "Original image URL missing");
    }

    await db.runTransaction(async (t) => {
      const sellerRef = db.collection("sellers").doc(posterData.sellerUsername);
      const collectionRefs = (posterData.collections || []).map((col) =>
        db.collection("standaloneCollections").doc(col)
      );

      const [seller, ...collections] = await Promise.all([
        t.get(sellerRef),
        ...collectionRefs.map((ref) => t.get(ref)),
      ]);

      t.set(db.collection("posters").doc(posterData.posterId), {
        ...posterData,
        imageUrl: framedCloudinaryUrl,
        framedImageUrl: null,
        originalImageUrl: null,
        approved: "approved",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      t.set(db.collection("originalPoster").doc(posterData.posterId), {
        imageUrl: originalCloudinaryUrl,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      t.delete(tempPosterRef);

      collections.forEach((col, i) => {
        if (col.exists && !col.data().posterIds?.includes(posterData.posterId)) {
          t.update(collectionRefs[i], {
            posterIds: admin.firestore.FieldValue.arrayUnion(posterData.posterId),
          });
        }
      });

      if (seller.exists) {
        const sellerData = seller.data();
        const updatedTempPosters = (sellerData.tempPosters || []).filter(
          (entry) => entry.id !== posterId
        );
        t.update(sellerRef, {
          tempPosters: updatedTempPosters,
          approvedPosters: admin.firestore.FieldValue.arrayUnion(posterData.posterId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        t.set(sellerRef, {
          sellerUsername: posterData.sellerUsername,
          uid: auth.uid,
          tempPosters: [],
          approvedPosters: [posterId],
          rejectedPosters: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    try {
      await Promise.all(deletionPromises);
    } catch (error) {
      console.error("Failed to delete files from Firebase Storage:", error.message);
      // Log for manual cleanup but don't fail the function
    }

    return { success: true };
  }
);

exports.deletePoster = onCall(
  {
    secrets: CLOUDINARY_SECRETS,
    region: "us-central1",
    timeoutSeconds: 120,
    concurrency: 80,
  },
  async ({ data: { posterId }, auth }) => {
    if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");

    const user = await db.collection("users").doc(auth.uid).get();
    if (!user.exists || !user.data().isAdmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    if (!posterId) throw new HttpsError("invalid-argument", "Poster ID is required");

    const [cloudName, apiKey, apiSecret] = CLOUDINARY_SECRETS.map((s) => s.value());
    if (!cloudName || !apiKey || !apiSecret) {
      throw new HttpsError("failed-precondition", "Cloudinary secrets not configured");
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

    const posterRef = db.collection("posters").doc(posterId);
    const originalPosterRef = db.collection("originalPoster").doc(posterId);
    const poster = await posterRef.get();

    if (!poster.exists) throw new HttpsError("not-found", "Poster not found");

    const posterData = poster.data();
    const deletionPromises = [];

    // Delete framed image from Cloudinary using imageUrl
    if (posterData.imageUrl) {
      const framedPublicId = posterData.imageUrl.split("/image/upload/")[1]?.split(".")[0];
      if (framedPublicId) {
        deletionPromises.push(cloudinary.uploader.destroy(framedPublicId));
      }
    }

    // Delete original image from Cloudinary using imageUrl
    const originalPoster = await originalPosterRef.get();
    if (originalPoster.exists && originalPoster.data().imageUrl) {
      const originalPublicId = originalPoster.data().imageUrl.split("/image/upload/")[1]?.split(".")[0];
      if (originalPublicId) {
        deletionPromises.push(cloudinary.uploader.destroy(originalPublicId));
      }
    }

    // Firestore transaction to delete from collections
    await db.runTransaction(async (t) => {
      const sellerRef = db.collection("sellers").doc(posterData.sellerUsername);
      const collectionRefs = (posterData.collections || []).map((col) =>
        db.collection("standaloneCollections").doc(col)
      );

      const [seller, ...collections] = await Promise.all([
        t.get(sellerRef),
        ...collectionRefs.map((ref) => t.get(ref)),
      ]);

      // Delete from posters and originalPoster collections
      t.delete(posterRef);
      t.delete(originalPosterRef);

      // Remove from seller's approvedPosters
      if (seller.exists) {
        t.update(sellerRef, {
          approvedPosters: admin.firestore.FieldValue.arrayRemove(posterId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Remove from collections
      collections.forEach((col, i) => {
        if (col.exists && col.data().posterIds?.includes(posterId)) {
          t.update(collectionRefs[i], {
            posterIds: admin.firestore.FieldValue.arrayRemove(posterId),
          });
        }
      });
    });

    try {
      await Promise.all(deletionPromises);
    } catch (error) {
      throw new HttpsError("internal", `Failed to delete images from Cloudinary: ${error.message}`);
    }

    return { success: true };
  }
);

exports.createRazorpayOrder = onCall(
  {
    secrets: RAZORPAY_SECRETS,
    region: "us-central1",
    timeoutSeconds: 60,
    concurrency: 80,
  },
  async ({ data: { subtotal, deliveryCharge, total, items, shippingAddress, isBuyNow }, auth }) => {
    console.log('createRazorpayOrder called with:', {
      subtotal,
      deliveryCharge,
      total,
      itemsCount: items?.length,
      isBuyNow,
    });

    if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");

    // Validate input
    if (!subtotal || typeof subtotal !== "number" || subtotal <= 0) {
      throw new HttpsError("invalid-argument", "Valid subtotal is required");
    }
    if (typeof deliveryCharge !== "number" || deliveryCharge < 0) {
      throw new HttpsError("invalid-argument", "Valid delivery charge is required");
    }
    if (!total || typeof total !== "number" || total <= 0) {
      throw new HttpsError("invalid-argument", "Valid total is required");
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new HttpsError("invalid-argument", "Items are required");
    }
    if (!shippingAddress || typeof shippingAddress !== "object") {
      throw new HttpsError("invalid-argument", "Shipping address is required");
    }
    const requiredAddressFields = ['name', 'phone', 'address', 'locality', 'city', 'state', 'pincode'];
    const missingFields = requiredAddressFields.filter(field => !shippingAddress[field]);
    if (missingFields.length > 0) {
      throw new HttpsError("invalid-argument", `Missing shipping address fields: ${missingFields.join(', ')}`);
    }

    const [keyId, keySecret] = RAZORPAY_SECRETS.map((s) => s.value());
    if (!keyId || !keySecret) {
      throw new HttpsError("failed-precondition", "Razorpay secrets not configured");
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    try {
      const order = await razorpay.orders.create({
        amount: Math.round(total * 100),
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: { userId: auth.uid },
      });

      // Store temporary order with Pending status and verified: false
      await db.collection("temporaryOrders").doc(order.id).set({
        orderId: order.id,
        userId: auth.uid,
        items,
        shippingAddress,
        subtotal,
        deliveryCharge,
        total,
        isBuyNow: !!isBuyNow,
        paymentStatus: "Pending",
        verified: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('Razorpay order created:', { orderId: order.id, amount: order.amount, currency: order.currency });
      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      };
    } catch (error) {
      console.error("Razorpay order creation failed:", error);
      throw new HttpsError("internal", `Failed to create Razorpay order: ${error.message}`);
    }
  }
);

exports.verifyRazorpayPayment = onCall(
  {
    secrets: RAZORPAY_SECRETS,
    region: "us-central1",
    timeoutSeconds: 60,
    concurrency: 80,
  },
  async ({ data: { orderId, paymentId, signature }, auth }) => {
    console.log('verifyRazorpayPayment called with:', { orderId, paymentId });
    if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");

    if (!orderId || !paymentId || !signature) {
      throw new HttpsError("invalid-argument", "Order ID, Payment ID, and Signature are required");
    }

    const [_, keySecret] = RAZORPAY_SECRETS.map((s) => s.value());
    if (!keySecret) {
      throw new HttpsError("failed-precondition", "Razorpay secret not configured");
    }

    try {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (generatedSignature !== signature) {
        throw new HttpsError("invalid-argument", "Invalid payment signature");
      }

      // Update temporary order to Completed
      const tempOrderRef = db.collection("temporaryOrders").doc(orderId);
      const tempOrder = await tempOrderRef.get();
      if (!tempOrder.exists) {
        throw new HttpsError("not-found", "Temporary order not found");
      }

      await tempOrderRef.update({
        paymentStatus: "Completed",
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Move to orders collection with verified: false
      const tempOrderData = tempOrder.data();
      const orderData = {
        customerId: tempOrderData.userId,
        items: tempOrderData.items,
        subtotal: tempOrderData.subtotal,
        deliveryCharge: tempOrderData.deliveryCharge,
        totalPrice: tempOrderData.total,
        orderDate: new Date().toISOString(),
        status: "Order Placed",
        paymentStatus: "Completed",
        paymentMethod: "Razorpay",
        shippingAddress: tempOrderData.shippingAddress,
        sentToSupplier: false,
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
        verified: false,
        issues: [],
      };

      const orderRef = await db.collection("orders").add(orderData);
      await db.collection("userOrders").doc(tempOrderData.userId).collection("orders").add({
        orderId: orderRef.id,
        orderDate: orderData.orderDate,
        status: orderData.status,
        subtotal: orderData.subtotal,
        deliveryCharge: orderData.deliveryCharge,
        totalPrice: orderData.totalPrice,
      });

      // Clear cart if not Buy Now
      if (!tempOrderData.isBuyNow) {
        const cartItems = await db.collection(`users/${tempOrderData.userId}/cart`).get();
        const batch = db.batch();
        cartItems.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }

      // Delete temporary order
      await tempOrderRef.delete();

      console.log('Payment verified and order created:', orderRef.id);
      return { success: true, message: "Payment verified successfully", orderId: orderRef.id };
    } catch (error) {
      console.error("Razorpay payment verification failed:", error);
      throw new HttpsError("internal", `Failed to verify payment: ${error.message}`);
    }
  }
);

exports.verifyOrderPricing = onCall(
  {
    secrets: RAZORPAY_SECRETS,
    region: "us-central1",
    timeoutSeconds: 60,
    concurrency: 80,
  },
  async ({ data: { orderId }, auth }) => {
    console.log('verifyOrderPricing called with:', { orderId });
    if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");

    const user = await db.collection("users").doc(auth.uid).get();
    if (!user.exists || !user.data().isAdmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const orderRef = db.collection("orders").doc(orderId);
    const order = await orderRef.get();
    if (!order.exists) {
      throw new HttpsError("not-found", `Order ${orderId} not found`);
    }

    const orderData = order.data();
    if (orderData.paymentStatus !== "Completed") {
      throw new HttpsError("invalid-argument", "Order must have Completed payment status");
    }

    try {
      const { standardDeliveryCharge, freeDeliveryThreshold } = await fetchDeliveryConfig();
      let calculatedSubtotal = 0;
      const issues = [];

      for (const item of orderData.items) {
        if (item.type === 'collection') {
          if (!item.collectionId || !item.posters || !Array.isArray(item.posters)) {
            issues.push(`Invalid collection item: ${JSON.stringify(item)}`);
            continue;
          }
          const collectionRef = db.collection("standaloneCollections").doc(item.collectionId);
          const collectionDoc = await collectionRef.get();
          if (!collectionDoc.exists) {
            issues.push(`Collection ${item.collectionId} not found`);
            continue;
          }
          const collectionData = collectionDoc.data();
          const submittedCollectionDiscount = item.collectionDiscount || 0;
          const actualCollectionDiscount = collectionData.discount || 0;
          if (submittedCollectionDiscount !== actualCollectionDiscount) {
            issues.push(`Collection discount mismatch for ${item.collectionId}: submitted ${submittedCollectionDiscount}%, expected ${actualCollectionDiscount}%`);
          }
          let collectionPrice = 0;
          for (const poster of item.posters) {
            const posterRef = db.collection("posters").doc(poster.posterId);
            const posterDoc = await posterRef.get();
            if (!posterDoc.exists) {
              issues.push(`Poster ${poster.posterId} not found`);
              continue;
            }
            const posterData = posterDoc.data();
            const sizeData = posterData.sizes?.find(s => s.size === poster.size);
            if (!sizeData) {
              issues.push(`Invalid size ${poster.size} for poster ${poster.posterId}`);
              continue;
            }
            if (poster.price !== sizeData.price) {
              issues.push(`Price mismatch for poster ${poster.posterId}: submitted ₹${poster.price}, expected ₹${sizeData.price}`);
            }
            if (poster.finalPrice !== sizeData.finalPrice) {
              issues.push(`Final price mismatch for poster ${poster.posterId}: submitted ₹${poster.finalPrice}, expected ₹${sizeData.finalPrice}`);
            }
            const expectedDiscount = posterData.discount || 0;
            if (poster.discount !== expectedDiscount) {
              issues.push(`Discount mismatch for poster ${poster.posterId}: submitted ${poster.discount}%, expected ${expectedDiscount}%`);
            }
            collectionPrice += sizeData.finalPrice;
          }
          const quantity = item.quantity || 1;
          calculatedSubtotal += collectionPrice * quantity * (1 - actualCollectionDiscount / 100);
        } else {
          if (!item.posterId || !item.size) {
            issues.push(`Invalid poster item: ${JSON.stringify(item)}`);
            continue;
          }
          const posterRef = db.collection("posters").doc(item.posterId);
          const posterDoc = await posterRef.get();
          if (!posterDoc.exists) {
            issues.push(`Poster ${item.posterId} not found`);
            continue;
          }
          const posterData = posterDoc.data();
          const sizeData = posterData.sizes?.find(s => s.size === item.size);
          if (!sizeData) {
            issues.push(`Invalid size ${item.size} for poster ${item.posterId}`);
            continue;
          }
          if (item.price !== sizeData.price) {
            issues.push(`Price mismatch for poster ${item.posterId}: submitted ₹${item.price}, expected ₹${sizeData.price}`);
          }
          if (item.finalPrice !== sizeData.finalPrice) {
            issues.push(`Final price mismatch for poster ${item.posterId}: submitted ₹${item.finalPrice}, expected ₹${sizeData.finalPrice}`);
          }
          const expectedDiscount = posterData.discount || 0;
          if (item.discount !== expectedDiscount) {
            issues.push(`Discount mismatch for poster ${item.posterId}: submitted ${item.discount}%, expected ${expectedDiscount}%`);
          }
          const quantity = item.quantity || 1;
          calculatedSubtotal += sizeData.finalPrice * quantity;
        }
      }

      calculatedSubtotal = parseFloat(calculatedSubtotal.toFixed(2));
      if (Math.abs(calculatedSubtotal - orderData.subtotal) > 0.01) {
        issues.push(`Subtotal mismatch: submitted ₹${orderData.subtotal}, calculated ₹${calculatedSubtotal}`);
      }

      const expectedDeliveryCharge = calculatedSubtotal >= freeDeliveryThreshold ? 0 : standardDeliveryCharge;
      if (orderData.deliveryCharge !== expectedDeliveryCharge) {
        issues.push(`Delivery charge mismatch: submitted ₹${orderData.deliveryCharge}, expected ₹${expectedDeliveryCharge}`);
      }

      const calculatedTotal = parseFloat((calculatedSubtotal + expectedDeliveryCharge).toFixed(2));
      if (Math.abs(calculatedTotal - orderData.totalPrice) > 0.01) {
        issues.push(`Total mismatch: submitted ₹${orderData.totalPrice}, calculated ₹${calculatedTotal}`);
      }

      const razorpayAmount = orderData.razorpay_payment_id ? (await new Razorpay({ key_id: RAZORPAY_SECRETS[0].value(), key_secret: RAZORPAY_SECRETS[1].value() }).payments.fetch(orderData.razorpay_payment_id)).amount / 100 : orderData.totalPrice;
      if (Math.abs(razorpayAmount - calculatedTotal) > 0.01) {
        issues.push(`Razorpay amount mismatch: submitted ₹${razorpayAmount}, expected ₹${calculatedTotal}`);
      }

      await orderRef.update({
        verified: issues.length === 0,
        issues,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Order ${orderId} verification completed:`, { verified: issues.length === 0, issues });
      return { success: true, verified: issues.length === 0, issues };
    } catch (error) {
      console.error(`Failed to verify order ${orderId}:`, error);
      await db.collection("errorLogs").add({
        function: "verifyOrderPricing",
        orderId,
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      throw new HttpsError("internal", `Failed to verify order: ${error.message}`);
    }
  }
);

exports.checkPendingPayments = onCall(
  {
    secrets: RAZORPAY_SECRETS,
    region: "us-central1",
    timeoutSeconds: 60,
    concurrency: 80,
  },
  async ({ auth }) => {
    if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");
    const user = await db.collection("users").doc(auth.uid).get();
    if (!user.exists || !user.data().isAdmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const [keyId, keySecret] = RAZORPAY_SECRETS.map((s) => s.value());
    if (!keyId || !keySecret) {
      throw new HttpsError("failed-precondition", "Razorpay secrets not configured");
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const tempOrders = await db.collection("temporaryOrders").where("paymentStatus", "==", "Pending").get();

    const results = await Promise.all(
      tempOrders.docs.map(async (tempOrder) => {
        const tempOrderData = tempOrder.data();
        const orderId = tempOrderData.orderId;

        try {
          let payment = null;
          if (tempOrderData.razorpay_payment_id) {
            payment = await razorpay.payments.fetch(tempOrderData.razorpay_payment_id);
          } else {
            const razorpayOrder = await razorpay.orders.fetch(orderId);
            if (razorpayOrder.payments && razorpayOrder.payments.items.length > 0) {
              payment = await razorpay.payments.fetch(razorpayOrder.payments.items[0].id);
              await tempOrder.ref.update({
                razorpay_payment_id: payment.id,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            } else {
              console.log(`No payment found for order ${orderId}, keeping as Pending`);
              return { orderId, status: "Pending" };
            }
          }

          const orderData = {
            customerId: tempOrderData.userId,
            items: tempOrderData.items,
            subtotal: tempOrderData.subtotal,
            deliveryCharge: tempOrderData.deliveryCharge,
            totalPrice: tempOrderData.total,
            orderDate: new Date().toISOString(),
            status: payment.status === "captured" ? "Order Placed" : "Pending",
            paymentStatus: payment.status === "captured" ? "Completed" : payment.status === "failed" ? "Failed" : "Pending",
            paymentMethod: "Razorpay",
            shippingAddress: tempOrderData.shippingAddress,
            sentToSupplier: false,
            razorpay_payment_id: payment.id,
            razorpay_order_id: orderId,
            verified: false,
            issues: [],
          };

          if (payment.status === "captured" || payment.status === "failed") {
            const orderRef = await db.collection("orders").add(orderData);
            await db.collection("userOrders").doc(tempOrderData.userId).collection("orders").add({
              orderId: orderRef.id,
              orderDate: orderData.orderDate,
              status: orderData.status,
              subtotal: orderData.subtotal,
              deliveryCharge: orderData.deliveryCharge,
              totalPrice: orderData.totalPrice,
            });

            if (payment.status === "captured" && !tempOrderData.isBuyNow) {
              const cartItems = await db.collection(`users/${tempOrderData.userId}/cart`).get();
              const batch = db.batch();
              cartItems.forEach((doc) => batch.delete(doc.ref));
              await batch.commit();
            }

            await tempOrder.ref.delete();
            console.log(`Order ${orderId} moved to orders with status: ${orderData.paymentStatus}`);
            return { orderId, status: orderData.paymentStatus, orderRef: orderRef.id };
          } else {
            console.log(`Order ${orderId} remains Pending`);
            return { orderId, status: "Pending" };
          }
        } catch (error) {
          console.error(`Failed to check payment for order ${orderId}:`, error);
          await db.collection("errorLogs").add({
            function: "checkPendingPayments",
            orderId,
            error: error.message,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          return { orderId, status: "Error", error: error.message };
        }
      })
    );

    console.log('checkPendingPayments results:', results);
    return { success: true, results };
  }
);

exports.razorpayWebhook = onRequest(
  {
    secrets: RAZORPAY_SECRETS,
    region: "us-central1",
  },
  async (req, res) => {
    console.log('Razorpay webhook received:', { event: req.body.event });
    const [_, keySecret] = RAZORPAY_SECRETS.map((s) => s.value());
    if (!keySecret) {
      console.error('Razorpay secret not configured');
      return res.status(500).json({ error: "Razorpay secret not configured" });
    }

    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);

    try {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(body)
        .digest("hex");

      if (generatedSignature !== signature) {
        console.error('Invalid webhook signature');
        return res.status(400).json({ error: "Invalid webhook signature" });
      }

      const { event } = req.body;
      if (event === "payment.captured" || event === "payment.pending") {
        const { order_id, payment_id, amount, currency, notes } = req.body.payload.payment.entity;
        const userId = notes?.userId;

        if (!userId) {
          console.error('User ID not found in payment notes');
          return res.status(400).json({ error: "User ID not found in payment notes" });
        }

        const tempOrderRef = await db
          .collection("temporaryOrders")
          .where("orderId", "==", order_id)
          .limit(1)
          .get();

        if (tempOrderRef.empty) {
          console.error('Temporary order not found for:', order_id);
          return res.status(400).json({ error: "Temporary order not found" });
        }

        const tempOrder = tempOrderRef.docs[0];
        const tempOrderData = tempOrder.data();

        if (event === "payment.pending") {
          await tempOrder.ref.update({
            paymentStatus: "Pending",
            razorpay_payment_id: payment_id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log('Updated temporary order to Pending:', order_id);
          return res.status(200).json({ success: true, message: "Pending payment recorded" });
        }

        if (event === "payment.captured") {
          const existingOrder = await db
            .collection("orders")
            .where("razorpay_order_id", "==", order_id)
            .limit(1)
            .get();

          if (!existingOrder.empty) {
            console.log('Order already processed:', order_id);
            return res.status(200).json({ success: true, message: "Order already processed" });
          }

          const orderData = {
            customerId: userId,
            items: tempOrderData.items,
            subtotal: tempOrderData.subtotal,
            deliveryCharge: tempOrderData.deliveryCharge,
            totalPrice: tempOrderData.total,
            orderDate: new Date().toISOString(),
            status: "Order Placed",
            paymentStatus: "Completed",
            paymentMethod: "Razorpay",
            shippingAddress: tempOrderData.shippingAddress,
            sentToSupplier: false,
            razorpay_payment_id: payment_id,
            razorpay_order_id: order_id,
            verified: false,
            issues: [],
          };

          const orderRef = await db.collection("orders").add(orderData);
          await db.collection("userOrders").doc(userId).collection("orders").add({
            orderId: orderRef.id,
            orderDate: orderData.orderDate,
            status: orderData.status,
            subtotal: orderData.subtotal,
            deliveryCharge: orderData.deliveryCharge,
            totalPrice: orderData.totalPrice,
          });

          await tempOrder.ref.delete();

          if (!tempOrderData.isBuyNow) {
            const cartItems = await db.collection(`users/${userId}/cart`).get();
            const batch = db.batch();
            cartItems.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
          }

          console.log('Order processed successfully:', orderRef.id);
          return res.status(200).json({ success: true, orderId: orderRef.id });
        }
      }

      return res.status(200).json({ success: true, message: "Event handled" });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return res.status(500).json({ error: "Failed to process webhook" });
    }
  }
);

exports.becomeSeller = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 60,
    concurrency: 80,
  },
  async ({ data: { sellerUsername }, auth }) => {
    if (!auth) throw new HttpsError("unauthenticated", "User not signed in");
    const uid = auth.uid;

    const userRef = db.doc(`users/${uid}`);
    const sellerRef = db.doc(`sellers/${sellerUsername}`);

    const usernameSnapshot = await db
      .collection("sellers")
      .where("sellerUsername", "==", sellerUsername)
      .get();
    if (!usernameSnapshot.empty) {
      throw new HttpsError("already-exists", "Username is already taken");
    }

    try {
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          throw new HttpsError("not-found", "User document does not exist");
        }

        const userData = userDoc.data();
        const sellerName = userData.name && typeof userData.name === 'string' && userData.name.trim()
          ? userData.name.trim()
          : sellerUsername;

        const userUpdatedData = {
          isSeller: true,
          sellerUsername,
          sellerCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const sellerData = {
          uid,
          sellerUsername,
          sellerName,
          createdAt: new Date().toISOString(),
          approvedPosters: [],
          rejectedPosters: [],
          tempPosters: [],
        };

        transaction.set(userRef, userUpdatedData, { merge: true });
        transaction.set(sellerRef, sellerData);
      });

      return { success: true, sellerUsername };
    } catch (error) {
      throw new HttpsError("internal", error.message || "Failed to create seller account");
    }
  }
);