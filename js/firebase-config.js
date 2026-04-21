// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBwPovKwvCD49C-49hAlp1_TBzRIWkLLk8",
  authDomain: "teaching-app-3959a.firebaseapp.com",
  projectId: "teaching-app-3959a",
  storageBucket: "teaching-app-3959a.firebasestorage.app",
  messagingSenderId: "1055636163241",
  appId: "1:1055636163241:web:d5454d87d7e57dc06d37b8",
  measurementId: "G-0Q61EHF9HE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
