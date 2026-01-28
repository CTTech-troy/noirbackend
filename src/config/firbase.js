// backend/src/config/firebase.js
import admin from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT in .env");
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (err) {
  throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT. Must be valid JSON.");
}

if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
}

// Initialize Admin SDK with credential only (no RTDB initialization)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // removed databaseURL to avoid RTDB usage
});

const db = admin.firestore();
const auth = admin.auth();

export { admin, db, auth };
