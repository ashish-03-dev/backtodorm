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

exports.createRazorpayOrder = onCall(
  {
    secrets: RAZORPAY_SECRETS,
    region: "asia-south1",
    timeoutSeconds: 60,
    concurrency: 80,
  },
  async ({ data: { amount, currency = "INR", items, shippingAddress, isBuyNow }, auth }) => {
    console.log('createRazorpayOrder called with:', { amount, currency, itemsCount: items?.length, shippingAddressKeys: Object.keys(shippingAddress || {}), isBuyNow });
    if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");

    // Validate input
    if (!amount || typeof amount !== "number" || amount <= 0) {
      throw new HttpsError("invalid-argument", "Valid amount is required");
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

    // Validate secrets
    const [keyId, keySecret] = RAZORPAY_SECRETS.map((s) => s.value());
    if (!keyId || !keySecret) {
      throw new HttpsError("failed-precondition", "Razorpay secrets not configured");
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    try {
      // Create Razorpay order
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt: `receipt_${Date.now()}`,
        notes: {
          userId: auth.uid,
        },
      });

      // Store temporary order in Firestore
      await db.collection("temporaryOrders").doc(order.id).set({
        orderId: order.id,
        userId: auth.uid,
        items,
        shippingAddress,
        amount,
        isBuyNow: !!isBuyNow,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('Razorpay order created:', { orderId: order.id, amount: order.amount });
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
    region: "asia-south1",
    timeoutSeconds: 60,
    concurrency: 80,
  },
  async ({ data: { orderId, paymentId, signature }, auth }) => {
    console.log('verifyRazorpayPayment called with:', { orderId, paymentId });
    if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");

    // Validate input
    if (!orderId || !paymentId || !signature) {
      throw new HttpsError("invalid-argument", "Order ID, Payment ID, and Signature are required");
    }

    // Validate secrets
    const [_, keySecret] = RAZORPAY_SECRETS.map((s) => s.value());
    if (!keySecret) {
      throw new HttpsError("failed-precondition", "Razorpay secret not configured");
    }

    try {
      // Generate expected signature
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (generatedSignature === signature) {
        console.log('Payment verified successfully for order:', orderId);
        return { success: true, message: "Payment verified successfully" };
      } else {
        throw new HttpsError("invalid-argument", "Invalid payment signature");
      }
    } catch (error) {
      console.error("Razorpay payment verification failed:", error);
      throw new HttpsError("internal", `Failed to verify payment: ${error.message}`);
    }
  }
);

exports.razorpayWebhook = onRequest(
  {
    secrets: RAZORPAY_SECRETS,
    region: "asia-south1",
  },
  async (req, res) => {
    console.log('Razorpay webhook received:', req.body.event);
    const [_, keySecret] = RAZORPAY_SECRETS.map((s) => s.value());
    if (!keySecret) {
      console.error('Razorpay secret not configured');
      return res.status(500).json({ error: "Razorpay secret not configured" });
    }

    const webhookSecret = keySecret;
    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);

    try {
      // Verify webhook signature
      const generatedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");

      if (generatedSignature !== signature) {
        console.error('Invalid webhook signature');
        return res.status(400).json({ error: "Invalid webhook signature" });
      }

      // Process payment.captured event
      if (req.body.event === "payment.captured") {
        const { order_id, payment_id, amount, currency, notes } = req.body.payload.payment.entity;
        const userId = notes?.userId;

        if (!userId) {
          console.error('User ID not found in payment notes');
          return res.status(400).json({ error: "User ID not found in payment notes" });
        }

        // Check for duplicate order
        const existingOrder = await db
          .collection("orders")
          .where("razorpay_order_id", "==", order_id)
          .limit(1)
          .get();

        if (!existingOrder.empty) {
          console.log('Order already processed:', order_id);
          return res.status(200).json({ success: true, message: "Order already processed" });
        }

        // Fetch temporary order
        const tempOrderRef = await db
          .collection("temporaryOrders")
          .where("orderId", "==", order_id)
          .limit(1)
          .get();

        if (tempOrderRef.empty) {
          console.error('Temporary order not found for:', order_id);
          return res.status(400).json({ error: "Temporary order not found" });
        }

        const tempOrderData = tempOrderRef.docs[0].data();

        // Save order to Firestore
        const orderData = {
          customerId: userId,
          items: tempOrderData.items,
          totalPrice: amount / 100,
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
          totalPrice: orderData.totalPrice,
        });

        // Clean up temporary order
        await tempOrderRef.docs[0].ref.delete();

        // Clear user's cart if not Buy Now
        if (!tempOrderData.isBuyNow) {
          const cartItems = await db.collection(`users/${userId}/cart`).get();
          const batch = db.batch();
          cartItems.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
        }

        console.log('Order processed successfully:', orderRef.id);
        return res.status(200).json({ success: true, orderId: orderRef.id });
      }

      return res.status(200).json({ success: true, message: "Event handled" });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return res.status(500).json({ error: "Failed to process webhook" });
    }
  }
);