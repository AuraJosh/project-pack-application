import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getVertexAI } from "@firebase/vertexai-preview";

// Placeholder config - User should replace with their own firebaseConfig
const firebaseConfig = {
  apiKey: "AIzaSyB50BdF2VhSj8R1edpG_ZVBEp3F70pdd1o",
  authDomain: "project-pack-app.firebaseapp.com",
  projectId: "project-pack-app",
  storageBucket: "project-pack-app.firebasestorage.app",
  messagingSenderId: "1095873311581",
  appId: "1:1095873311581:web:cf5c9b1926eb1018d4eeb4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const vertexAI = getVertexAI(app);

export default app;
