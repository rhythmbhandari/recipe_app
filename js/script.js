import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import firebaseConfig from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((_) => {});
  });
}

document.addEventListener("init", function(event) {
  var page = event.target;
  console.log(page.id)
  if (page.id === "registerPage") { 
    document.querySelector("#registerButton").onclick = onRegisterBtnClicked;
  }
});

function onRegisterBtnClicked() {
  console.log("Register button clicked!")
  const email = document.getElementById("new-email").value;
  const password = document.getElementById("new-password").value;
  // var role = document.querySelector('input[name="role"]:checked').id;
  var mod = document.querySelector("ons-modal");

  mod.show();
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log(user);
      const navigator = document.getElementById("myNavigator");
      navigator.pushPage("pages/home.html");
      mod.hide();
    })
    .catch((error) => {
      const errorMessage = error.message;
      mod.hide();
      console.log(errorMessage);
      displayError(error.code);
    });
}

function displayError(errorCode) {
  let userFriendlyMessage;
  
  switch (errorCode) {
    case 'auth/email-already-in-use':
      userFriendlyMessage = "The email address is already in use by another account.";
      break;
    case 'auth/invalid-email':
      userFriendlyMessage = "The email address is not valid.";
      break;
    case 'auth/operation-not-allowed':
      userFriendlyMessage = "Email/password accounts are not enabled. Enable email/password authentication in the Firebase Console.";
      break;
    case 'auth/weak-password':
      userFriendlyMessage = "The password is too weak. Please enter a stronger password.";
      break;
    case 'auth/missing-password':
      userFriendlyMessage = "Please enter a password.";
      break;
    default:
      userFriendlyMessage = "An unknown error occurred. Please try again.";
      break;
  }
  
  ons.notification.toast(userFriendlyMessage, {
    timeout: 3000,
    animation: 'fall'
  });
}

function onHomeBtnClicked() {
  const navigator = document.getElementById("myNavigator");
  navigator.pushPage("pages/detail.html");
}
