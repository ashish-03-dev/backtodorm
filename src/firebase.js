import { initializeApp } from 'firebase/app';

const firebaseConfig = {
    apiKey: "AIzaSyCV3yJpGQWSV0DMbY2w0Y0CrkQWOtRWJhs",
    authDomain: "back-to-dorm.firebaseapp.com",
    databaseURL: "https://back-to-dorm-default-rtdb.firebaseio.com",
    projectId: "back-to-dorm",
    storageBucket: "back-to-dorm.firebasestorage.app",
    messagingSenderId: "536014495018",
    appId: "1:536014495018:web:a124f8ddac1548a400d253",
    measurementId: "G-5Y6B4BZJY1",
};

export const app = initializeApp(firebaseConfig);

