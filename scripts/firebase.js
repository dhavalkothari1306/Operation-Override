import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBabu8yhy5RAImMSR6jvJHzFVhEyFJmmLg",
  authDomain: "operation-override.firebaseapp.com",
  projectId: "operation-override",
  storageBucket: "operation-override.firebasestorage.app",
  messagingSenderId: "761012081085",
  appId: "1:761012081085:web:54f58670e57e4fe0f5c2d4",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
