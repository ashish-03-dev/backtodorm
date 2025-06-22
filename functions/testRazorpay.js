import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCV3yJpGQWSV0DMbY2w0Y0CrkQWOtRWJhs",
  authDomain: "back-to-dorm.firebaseapp.com",
  databaseURL: "https://back-to-dorm-default-rtdb.firebaseio.com/",
  projectId: "back-to-dorm",
  storageBucket: "back-to-dorm.firebasestorage.app",
  messagingSenderId: "536014495018",
  appId: "1:536014495018:web:a124f8ddac1548a400d253",
  measurementId: "G-5Y6B4BZJY1"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Functions with emulator
const functions = getFunctions(app, 'asia-south1');
connectFunctionsEmulator(functions, 'localhost', 5001);

// Initialize Auth
const auth = getAuth(app);

const createRazorpayOrder = httpsCallable(functions, 'createRazorpayOrder');

async function test() {
  try {
    // Sign in with test user
    await signInWithEmailAndPassword(auth, 'testuser@example.com', 'testpassword');
    console.log('Authenticated successfully');

    const result = await createRazorpayOrder({
      amount: 134,
      items: [
        {
          type: 'poster',
          posterId: 'test',
          price: 134,
          quantity: 1,
          title: 'Test Poster',
          image: 'https://via.placeholder.com/50'
        }
      ],
      shippingAddress: {
        name: 'Ashish Kumar',
        phone: '9205106255',
        address: 'Sociery Wali Gali',
        locality: 'Saifpur Firojpur Ramraj',
        city: 'Meerut',
        state: 'Uttar Pradesh',
        pincode: '250404'
      },
      isBuyNow: false
    });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();