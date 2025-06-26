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
exports.createUser = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 60,
    concurrency: 80,
  },
  async ({ data, auth }) => {
    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = auth.uid;

    if (!data.name || typeof data.name !== "string") {
      throw new HttpsError("invalid-argument", "Name is required");
    }

    const userRef = db.doc(`users/${userId}`);

    try {
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        throw new HttpsError("already-exists", "User document already exists");
      }

      const userData = {
        uid: userId,
        name: data.name.trim(),
        email: auth.token.email || null,
        phone: auth.token.phone_number || null,
        photoURL: auth.token.picture || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isSeller: false,
        isAdmin: userId === 'xhJlJHvOxgSysxjQl8AJfvdhGPg1',
        isActive: true,
      };

      await userRef.set(userData);
      return { success: true, userId };
    } catch (error) {
      console.error("Failed to create user document:", error);
      throw new HttpsError("internal", `Failed to create user document: ${error.message}`);
    }
  }
);


exports.updateUserProfile = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 60,
  },
  async ({ data, auth }) => {
    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be signed in.");
    }

    const uid = auth.uid;
    const { name } = data;

    if (name && typeof name !== "string") {
      throw new HttpsError("invalid-argument", "Name must be a string.");
    }

    try {
      await admin.firestore().doc(`users/${uid}`).set(
        {
          ...(name && { name: name.trim() }),
          // Never allow client to set isAdmin, isActive, etc.
        },
        { merge: true }
      );

      return { success: true };
    } catch (error) {
      console.error("Update failed:", error);
      throw new HttpsError("internal", "Profile update failed.");
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
    let imageUrl = posterData.originalImageUrl;

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

    await db.runTransaction(async (t) => {
      const sellerRef = db.collection("sellers").doc(posterData.sellerUsername);
      const collectionRefs = (posterData.collections || []).map((col) =>
        db.collection("standaloneCollections").doc(col)
      );

      const [seller, ...collections] = await Promise.all([
        t.get(sellerRef),
        ...collectionRefs.map((ref) => t.get(ref)),
      ]);

      t.set(db.collection("posters").doc(posterId), {
        ...posterData,
        imageUrl,
        originalImageUrl: null,
        approved: "approved",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      t.delete(tempPosterRef);

      collections.forEach((col, i) => {
        if (col.exists && !col.data().posterIds?.includes(posterId)) {
          t.update(collectionRefs[i], {
            posterIds: admin.firestore.FieldValue.arrayUnion(posterId),
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
          approvedPosters: admin.firestore.FieldValue.arrayUnion(posterId),
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

    return { success: true, posterId, imageUrl };
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

    const { standardDeliveryCharge, freeDeliveryThreshold } = await fetchDeliveryConfig();
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    try {
      // Verify items and calculate subtotal (unchanged validation logic)
      let calculatedSubtotal = 0;
      for (const item of items) {
        if (item.type === 'collection') {
          if (!item.collectionId || !item.posters || !Array.isArray(item.posters)) {
            throw new HttpsError("invalid-argument", `Invalid collection item: ${JSON.stringify(item)}`);
          }
          const collectionRef = db.collection("standaloneCollections").doc(item.collectionId);
          const collectionDoc = await collectionRef.get();
          if (!collectionDoc.exists) {
            throw new HttpsError("not-found", `Collection ${item.collectionId} not found`);
          }
          const collectionData = collectionDoc.data();
          const submittedCollectionDiscount = item.collectionDiscount || 0;
          const actualCollectionDiscount = collectionData.discount || 0;
          if (submittedCollectionDiscount !== actualCollectionDiscount) {
            throw new HttpsError("invalid-argument", `Collection discount mismatch for ${item.collectionId}`);
          }
          let collectionPrice = 0;
          for (const poster of item.posters) {
            const posterRef = db.collection("posters").doc(poster.posterId);
            const posterDoc = await posterRef.get();
            if (!posterDoc.exists) {
              throw new HttpsError("not-found", `Poster ${poster.posterId} not found`);
            }
            const posterData = posterDoc.data();
            const sizeData = posterData.sizes?.find(s => s.size === poster.size);
            if (!sizeData) {
              throw new HttpsError("invalid-argument", `Invalid size ${poster.size} for poster ${poster.posterId}`);
            }
            if (poster.price !== sizeData.price || poster.finalPrice !== sizeData.finalPrice) {
              throw new HttpsError("invalid-argument", `Price mismatch for poster ${poster.posterId}`);
            }
            const expectedDiscount = posterData.discount || 0;
            if (poster.discount !== expectedDiscount) {
              throw new HttpsError("invalid-argument", `Discount mismatch for poster ${poster.posterId}`);
            }
            collectionPrice += sizeData.finalPrice;
          }
          const quantity = item.quantity || 1;
          calculatedSubtotal += collectionPrice * quantity * (1 - actualCollectionDiscount / 100);
        } else {
          if (!item.posterId || !item.size) {
            throw new HttpsError("invalid-argument", `Invalid poster item: ${JSON.stringify(item)}`);
          }
          const posterRef = db.collection("posters").doc(item.posterId);
          const posterDoc = await posterRef.get();
          if (!posterDoc.exists) {
            throw new HttpsError("not-found", `Poster ${item.posterId} not found`);
          }
          const posterData = posterDoc.data();
          const sizeData = posterData.sizes?.find(s => s.size === item.size);
          if (!sizeData) {
            throw new HttpsError("invalid-argument", `Invalid size ${item.size} for poster ${item.posterId}`);
          }
          if (item.price !== sizeData.price || item.finalPrice !== sizeData.finalPrice) {
            throw new HttpsError("invalid-argument", `Price mismatch for poster ${item.posterId}`);
          }
          const expectedDiscount = posterData.discount || 0;
          if (item.discount !== expectedDiscount) {
            throw new HttpsError("invalid-argument", `Discount mismatch for poster ${item.posterId}`);
          }
          const quantity = item.quantity || 1;
          calculatedSubtotal += sizeData.finalPrice * quantity;
        }
      }

      calculatedSubtotal = parseFloat(calculatedSubtotal.toFixed(2));
      if (Math.abs(calculatedSubtotal - subtotal) > 0.01) {
        throw new HttpsError("invalid-argument", `Subtotal mismatch: submitted ₹${subtotal}, calculated ₹${calculatedSubtotal}`);
      }

      const expectedDeliveryCharge = calculatedSubtotal >= freeDeliveryThreshold ? 0 : standardDeliveryCharge;
      if (deliveryCharge !== expectedDeliveryCharge) {
        throw new HttpsError("invalid-argument", `Delivery charge mismatch: submitted ₹${deliveryCharge}, expected ₹${expectedDeliveryCharge}`);
      }

      const calculatedTotal = parseFloat((calculatedSubtotal + expectedDeliveryCharge).toFixed(2));
      if (Math.abs(calculatedTotal - total) > 0.01) {
        throw new HttpsError("invalid-argument", `Total mismatch: submitted ₹${total}, calculated ₹${calculatedTotal}`);
      }

      const order = await razorpay.orders.create({
        amount: Math.round(total * 100),
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: { userId: auth.uid },
      });

      // Store temporary order with Pending status
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

      // Move to orders collection
      const tempOrderData = tempOrder.data();
      const orderData = {
        customerId: tempOrderData.userId,
        items: tempOrderData.items,
        subtotal: tempOrderData.subtotal,
        deliveryCharge: tempOrderData.deliveryCharge,
        totalPrice: tempOrderData.total,
        orderDate: new Date().toISOString(),
        status: "Pending",
        paymentStatus: "Completed",
        paymentMethod: "Razorpay",
        shippingAddress: tempOrderData.shippingAddress,
        sentToSupplier: false,
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
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
            // If payment ID exists, fetch payment status
            payment = await razorpay.payments.fetch(tempOrderData.razorpay_payment_id);
          } else {
            // If no payment ID, fetch order and check for payments
            const razorpayOrder = await razorpay.orders.fetch(orderId);
            if (razorpayOrder.payments && razorpayOrder.payments.items.length > 0) {
              // Use the first payment (assuming one payment per order)
              payment = await razorpay.payments.fetch(razorpayOrder.payments.items[0].id);
              // Update temporary order with payment ID for consistency
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
            status: "Pending",
            paymentStatus: payment.status === "captured" ? "Completed" : "Failed",
            paymentMethod: "Razorpay",
            shippingAddress: tempOrderData.shippingAddress,
            sentToSupplier: false,
            razorpay_payment_id: payment.id,
            razorpay_order_id: orderId,
          };

          if (payment.status === "captured" || payment.status === "failed") {
            // Move completed or failed payments to orders collection
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
              // Clear cart for completed non-Buy Now orders
              const cartItems = await db.collection(`users/${tempOrderData.userId}/cart`).get();
              const batch = db.batch();
              cartItems.forEach((doc) => batch.delete(doc.ref));
              await batch.commit();
            }

            // Delete temporary order
            await tempOrder.ref.delete();
            console.log(`Order ${orderId} moved to orders with status: ${orderData.paymentStatus}`);
            return { orderId, status: orderData.paymentStatus, orderRef: orderRef.id };
          } else {
            // Keep pending payments in temporaryOrders
            console.log(`Order ${orderId} remains Pending`);
            return { orderId, status: "Pending" };
          }
        } catch (error) {
          console.error(`Failed to check payment for order ${orderId}:`, error);
          // Log error to a dedicated collection for debugging
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

          const { standardDeliveryCharge, freeDeliveryThreshold } = await fetchDeliveryConfig();
          let calculatedSubtotal = 0;

          for (const item of tempOrderData.items) {
            if (item.type === 'collection') {
              const collectionRef = db.collection("standaloneCollections").doc(item.collectionId);
              const collectionDoc = await collectionRef.get();
              if (!collectionDoc.exists) {
                throw new Error(`Collection ${item.collectionId} not found`);
              }
              const collectionData = collectionDoc.data();
              const submittedCollectionDiscount = item.collectionDiscount || 0;
              const actualCollectionDiscount = collectionData.discount || 0;
              if (submittedCollectionDiscount !== actualCollectionDiscount) {
                throw new Error(`Collection discount mismatch for ${item.collectionId}`);
              }
              let collectionPrice = 0;
              for (const poster of item.posters) {
                const posterRef = db.collection("posters").doc(poster.posterId);
                const posterDoc = await posterRef.get();
                if (!posterDoc.exists) {
                  throw new Error(`Poster ${poster.posterId} not found`);
                }
                const posterData = posterDoc.data();
                const sizeData = posterData.sizes?.find(s => s.size === poster.size);
                if (!sizeData) {
                  throw new Error(`Invalid size ${poster.size} for poster ${poster.posterId}`);
                }
                if (poster.price !== sizeData.price || poster.finalPrice !== sizeData.finalPrice) {
                  throw new Error(`Price mismatch for poster ${poster.posterId}`);
                }
                const expectedDiscount = posterData.discount || 0;
                if (poster.discount !== expectedDiscount) {
                  throw new Error(`Discount mismatch for poster ${poster.posterId}`);
                }
                collectionPrice += sizeData.finalPrice;
              }
              const quantity = item.quantity || 1;
              calculatedSubtotal += collectionPrice * quantity * (1 - actualCollectionDiscount / 100);
            } else {
              const posterRef = db.collection("posters").doc(item.posterId);
              const posterDoc = await posterRef.get();
              if (!posterDoc.exists) {
                throw new Error(`Poster ${item.posterId} not found`);
              }
              const posterData = posterDoc.data();
              const sizeData = posterData.sizes?.find(s => s.size === item.size);
              if (!sizeData) {
                throw new Error(`Invalid size ${item.size} for poster ${item.posterId}`);
              }
              if (item.price !== sizeData.price || item.finalPrice !== sizeData.finalPrice) {
                throw new Error(`Price mismatch for poster ${item.posterId}`);
              }
              const expectedDiscount = posterData.discount || 0;
              if (item.discount !== expectedDiscount) {
                throw new Error(`Discount mismatch for poster ${item.posterId}`);
              }
              const quantity = item.quantity || 1;
              calculatedSubtotal += sizeData.finalPrice * quantity;
            }
          }

          calculatedSubtotal = parseFloat(calculatedSubtotal.toFixed(2));
          if (Math.abs(calculatedSubtotal - tempOrderData.subtotal) > 0.01) {
            throw new Error(`Subtotal mismatch: submitted ₹${tempOrderData.subtotal}, calculated ₹${calculatedSubtotal}`);
          }

          const expectedDeliveryCharge = calculatedSubtotal >= freeDeliveryThreshold ? 0 : standardDeliveryCharge;
          if (tempOrderData.deliveryCharge !== expectedDeliveryCharge) {
            throw new Error(`Delivery charge mismatch: submitted ₹${tempOrderData.deliveryCharge}, expected ₹${expectedDeliveryCharge}`);
          }

          const calculatedTotal = parseFloat((calculatedSubtotal + expectedDeliveryCharge).toFixed(2));
          if (Math.abs(calculatedTotal - tempOrderData.total) > 0.01) {
            throw new Error(`Total mismatch: submitted ₹${tempOrderData.total}, calculated ₹${calculatedTotal}`);
          }

          const razorpayAmount = amount / 100;
          if (Math.abs(razorpayAmount - calculatedTotal) > 0.01) {
            throw new Error(`Razorpay amount mismatch: submitted ₹${razorpayAmount}, expected ₹${calculatedTotal}`);
          }

          const orderData = {
            customerId: userId,
            items: tempOrderData.items,
            subtotal: tempOrderData.subtotal,
            deliveryCharge: tempOrderData.deliveryCharge,
            totalPrice: tempOrderData.total,
            orderDate: new Date().toISOString(),
            status: "Pending",
            paymentStatus: "Completed",
            paymentMethod: "Razorpay",
            shippingAddress: tempOrderData.shippingAddress,
            sentToSupplier: false,
            razorpay_payment_id: payment_id,
            razorpay_order_id: order_id,
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