import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
  getAuth,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import firebaseConfig from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((_) => {});
  });
  navigator.serviceWorker.addEventListener(
    "message",
    handleNotificationMessage
  );
}


if ('wakeLock' in navigator) {
  console.log('Wake Lock API is supported!');
} else {
  console.log('Wake Lock API is not supported by this browser.');
}

function handleNotificationMessage(event) {
  const message = event.data;
  console.log(`Message is ${message}`)
}
