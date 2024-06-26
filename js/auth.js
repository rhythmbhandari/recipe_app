import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import firebaseConfig from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { RecipeDatabase } from "./recipe.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const recipeDB = new RecipeDatabase(db);
let dbIndexedDB;
let timeouts = [];
let wakeLock = null;

function initIndexedDB() {
  const request = window.indexedDB.open("RecipesDB", 3); // Make sure to update the version if schema changes

  request.onerror = function (event) {
    console.error("Database error:", event.target.error);
  };

  request.onupgradeneeded = function (event) {
    const db = event.target.result;

    if (!db.objectStoreNames.contains("recipes")) {
      const recipesStore = db.createObjectStore("recipes", {
        keyPath: "id",
        autoIncrement: true,
      });
      recipesStore.createIndex("title", "title", { unique: false });
    }

    if (!db.objectStoreNames.contains("completed")) {
      db.createObjectStore("completed", { keyPath: "userId" });
    }

    if (!db.objectStoreNames.contains("activeRecipe")) {
      db.createObjectStore("activeRecipe", { keyPath: "userId" });
    }

    db.onerror = function (event) {
      console.error("Database error:", event.target.error);
    };
  };

  request.onsuccess = function (event) {
    dbIndexedDB = event.target.result;
    console.log("Database initialized successfully");

    dbIndexedDB.onerror = function (event) {
      console.error("Database error:", event.target.error);
    };
  };

  request.onerror = function (event) {
    console.error("Database error:", event.target.error);
  };
}

if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  initIndexedDB();
} else {
  document.addEventListener("DOMContentLoaded", initIndexedDB);
}

navigator.serviceWorker.ready.then(function (registration) {
  if (registration.sync) {
    registration.sync
      .register("active-recipe-sync")
      .then(() => updateRecipesInFirestore())
      .catch((error) => console.error("Failed to register sync:", error));
  }
});

async function updateRecipesInFirestore() {
  try {
    const db = await openIndexedDB();
    const recipes = await getRecipesFromIndexedDB(db);
    for (const recipe of recipes) {
      await updateRecipeInFirestore(recipe);
    }
  } catch (error) {
    console.error("Error during Firestore update process:", error);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("RecipesDB", 3);
    request.onerror = () => reject("Failed to open IndexedDB");
    request.onsuccess = (event) => resolve(event.target.result);
  });
}

function getRecipesFromIndexedDB(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["activeRecipe"], "readwrite");
    const store = transaction.objectStore("activeRecipe");
    const request = store.getAll();

    request.onerror = () => reject("Failed to fetch recipes from IndexedDB");
    request.onsuccess = () => resolve(request.result || []);
  });
}

async function updateRecipeInFirestore(recipe) {
  try {
    console.log(recipe.sync);
    if (recipe.location != undefined || recipe.location != null) {
      const isSuccess = await recipeDB.completeAndDeleteActiveRecipe(
        recipe.userId,
        recipe.location
      );
      if (isSuccess) {
        console.log("Recipe successfully updated in Firestore:", recipe.recipe);
        setActiveRecipeInIndexedDB(recipe.recipe, recipe.userId, true, false);
      } else {
        throw new Error("Failed to update recipe in Firestore");
      }
    }
    if (recipe.sync != undefined && recipe.sync == false) {
      const isSuccess = await recipeDB.setActiveRecipe(
        recipe.recipe,
        recipe.userId
      );
      if (isSuccess) {
        console.log("Recipe successfully updated in Firestore:", recipe.recipe);
        setActiveRecipeInIndexedDB(recipe.recipe, recipe.userId, true, false);
      } else {
        throw new Error("Failed to update recipe in Firestore");
      }
    }
  } catch (error) {
    console.error("Error updating recipe in Firestore:", error);
  }
}

document.addEventListener("init", function (event) {
  var page = event.target;
  var navigator = document.getElementById("myNavigator");

  navigator.addEventListener("postpop", function (event) {
    if (event.detail.leavePage.id === "recipeDetailsPage") {
      if (!event.detail.onsBackButton) {
        var tabbar = document.querySelector("#tabbar");
        console.log(`Tabbar: ${tabbar}`);
        if (tabbar) {
          tabbar.setActiveTab(1);
        }
      }
    }
  });
});

document.addEventListener("show", function (event) {
  var page = event.target;

  if (page.id === "mainPage") {
    console.log("Main page is now visible");
  }

  if (page.id === "splashPage") {
    checkLoginStatus();
  }
  if (page.id === "registerPage") {
    console.log("Register page is now visible");
    var registerButton = page.querySelector("#registerButton");
    var goToLoginButton = page.querySelector("#goToLoginButton");

    registerButton.removeEventListener("click", onRegisterBtnClicked);
    registerButton.addEventListener("click", onRegisterBtnClicked);

    goToLoginButton.removeEventListener("click", onGoToLoginBtnClicked);
    goToLoginButton.addEventListener("click", onGoToLoginBtnClicked);
  }
  if (page.id === "loginPage") {
    console.log("Login page is now visible");
    var loginButton = page.querySelector("#loginButton");
    var goToRegisterButton = page.querySelector("#goToRegisterButton");

    loginButton.removeEventListener("click", onLoginBtnClicked);
    loginButton.addEventListener("click", onLoginBtnClicked);

    goToRegisterButton.removeEventListener("click", onGoToRegisterBtnClicked);
    goToRegisterButton.addEventListener("click", onGoToRegisterBtnClicked);
  }

  if (page.id === "homePage") {
    checkData();
    page.querySelector("#searchInput").addEventListener("input", filterRecipes);
  }

  if (page.id === "recipeDetailsPage") {
    var recipe = page.data.recipe;
    var startCooking = page.querySelector("#start-cooking");

    console.log(recipe);
    page.querySelector(".title").textContent = recipe.title;
    page.querySelector("img").setAttribute("src", recipe.imageUrl);
    page.querySelectorAll("p")[0].textContent = `Servings: ${recipe.servings}`;
    page.querySelectorAll("p")[1].textContent = `Prep Time: ${recipe.prepTime}`;
    page.querySelectorAll("p")[2].textContent = `Cook Time: ${recipe.cookTime}`;

    startCooking.removeEventListener("click", () =>
      startRecipeBtnClicked(recipe.title, recipe.prepTime, recipe)
    );

    startCooking.addEventListener("click", () =>
      startRecipeBtnClicked(recipe.title, recipe.prepTime, recipe)
    );

    if (recipe.freezeTime == null) {
      page.querySelectorAll("p")[3].textContent = `Freeze Time: 0`;
    } else {
      page.querySelectorAll(
        "p"
      )[3].textContent = `Freeze Time: ${recipe.cookTime}`;
    }

    const ingredientsList = page.querySelector("ul");
    recipe.ingredients.forEach((ingredient) => {
      const li = document.createElement("li");
      li.textContent = ingredient;
      ingredientsList.appendChild(li);
    });

    const instructionsList = page.querySelector("ol");
    recipe.instructions.forEach((step) => {
      const li = document.createElement("li");
      li.textContent = step;
      instructionsList.appendChild(li);
    });
  }

  if (page.id === "activeRecipe") {
    var stopRecipe = page.querySelector("#end-cooking");
    loadActiveRecipe(stopRecipe);
  }
});

function stopRecipeBtnClicked(recipe) {
  try{
    const mod = document.querySelector("ons-modal");
    mod.show();

  if ("Notification" in window && "serviceWorker" in navigator) {
    if ("wakeLock" in navigator) {
      releaseWakeLock();
    }

    const userId = auth.currentUser.uid;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          if (!navigator.onLine) {
            setActiveRecipeInIndexedDB(recipe, userId, true, false, location);
          } else {
            markRecipeAsCompletedInFirestore(userId, location);
          }

        mod.hide();
          
        var tabbar = document.querySelector("#tabbar");
        console.log(`Tabbar: ${tabbar}`);
        if (tabbar) {
          tabbar.setActiveTab(0);
        }
        ons.notification.toast("Thank you for trying our recipe", {
          timeout: 3000,
          animation: "fall",
        });
        },
        (error) => {
          console.error("Error getting location:", error.message);
        }
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
    }
    
  } else {
    console.log("Browser does not support notifications or service workers.");
  }
  }catch(e){
    const mod = document.querySelector("ons-modal");
    mod.hide();
  }
}

function assignButtonEventsForStop(stopRecipeBtn) {
  stopRecipeBtn.removeEventListener("click", () => stopRecipeBtnClicked());
  stopRecipeBtn.addEventListener("click", () => stopRecipeBtnClicked());
}

async function loadActiveRecipe(stopRecipeBtn) {
  const userId = auth.currentUser.uid;
  let recipe;
  const contentElement = document.getElementById("activeRecipeContent");

  const isOnline = navigator.onLine;
  console.log("isOnline: ", isOnline);
  if (isOnline) {
    console.log("Online: Fetching from Firestore");
    recipe = await recipeDB.getActiveRecipe(db, userId);
    assignButtonEventsForStop(stopRecipeBtn);
  } else {
    console.log("Offline: Fetching from IndexedDB");
    recipe = await fetchActiveReceipeFromCache(userId);
    assignButtonEventsForStop(stopRecipeBtn);
  }

  if (recipe) {
    contentElement.innerHTML = `
          <ons-card>
              <img src="${
                recipe.imageUrl
              }" alt="Recipe Image" class="recipe-image">
              <div class="title">${recipe.title}</div>
              <div class="content">
                  <p><strong>Servings:</strong> ${recipe.servings}</p>
                  <p><strong>Prep Time:</strong> ${recipe.prepTime} minutes</p>
                  <p><strong>Cook Time:</strong> ${recipe.cookTime} minutes</p>
                  <p><strong>Instructions:</strong> ${recipe.instructions.join(
                    "<br/>"
                  )}</p>
              </div>
          </ons-card>
      `;
    stopRecipeBtn.style.display = "block";
  } else {
    contentElement.innerHTML =
      "<p>No active recipe. Start cooking to see something here!</p>";
    stopRecipeBtn.style.display = "none";
  }
}

async function fetchActiveReceipeFromCache(userId) {
  const transaction = dbIndexedDB.transaction(["activeRecipe"], "readwrite");
  const store = transaction.objectStore("activeRecipe");

  const request = store.get(userId);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.recipe);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => {
      reject("Failed to retrieve from IndexedDB.");
    };
  });
  // request.onsuccess = function () {
  //   displayRecipes(request.result);
  // };

  // request.onerror = function (event) {
  //   console.error("IndexedDB read error:", event.target.errorCode);
  // };
}

//recipeDB.fetchRecipes().then(displayRecipes);

async function checkData() {
  if (!navigator.onLine) {
    fetchFromCache();
  } else {
    fetchAndCacheRecipes();
  }
}
async function fetchFromCache() {
  const transaction = dbIndexedDB.transaction(["recipes"], "readonly");
  const store = transaction.objectStore("recipes");
  const request = store.getAll();

  request.onsuccess = function () {
    displayRecipes(request.result);
  };

  request.onerror = function (event) {
    console.error("IndexedDB read error:", event.target.errorCode);
  };
}

async function fetchAndCacheRecipes() {
  try {
    const recipes = await recipeDB.fetchRecipes();
    const transaction = dbIndexedDB.transaction(["recipes"], "readwrite");
    const store = transaction.objectStore("recipes");
    recipes.forEach((recipe) => {
      store.put(recipe);
    });
    transaction.oncomplete = function () {
      displayRecipes(recipes);
    };
  } catch (error) {
    console.error("Error fetching from Firebase, trying cache", error);
    fetchFromCache();
  }
}

function filterRecipes(event) {
  const searchText = event.target.value.toLowerCase().split(/\s*,\s*/);
  const transaction = dbIndexedDB.transaction(["recipes"], "readonly");
  const store = transaction.objectStore("recipes");
  const request = store.getAll();

  request.onsuccess = function () {
    const recipes = request.result;
    const filteredRecipes = recipes.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(searchText[0]) ||
        searchText.every((term) =>
          recipe.ingredients.some((ingredient) =>
            ingredient.toLowerCase().includes(term)
          )
        )
    );
    displayRecipes(filteredRecipes);
  };
}

function displayRecipes(recipes) {
  const list = document.getElementById("recipeList");
  list.innerHTML = "";

  recipes.forEach((recipe) => {
    const item = document.createElement("ons-list-item");
    item.setAttribute("modifier", "tappable");
    item.classList.add("custom-list-item");
    item.setAttribute("modifier", "chevron");

    item.onclick = () => showRecipeDetails(recipe);

    item.innerHTML = `
            <div class="left">
                <img class="thumbnail" src="${recipe.imageUrl}" alt="${recipe.title}" style="width: 80px; height: 80px;">
            </div>
            <div class="center">
                <span class="list-item__title">${recipe.title}</span>
                <span class="list-item__subtitle">Servings: ${recipe.servings}</span>
                <span class="list-item__subtitle">Category: ${recipe.category}</span>
            </div>
        `;

    list.appendChild(item);
  });
}

function checkLoginStatus() {
  onAuthStateChanged(auth, (user) => {
    const navigator = document.getElementById("myNavigator");
    console.log("User is ", user);
    if (user) {
      navigator.resetToPage("pages/main.html", { animation: "fade" });
    } else {
      navigator.resetToPage("pages/login.html", { animation: "fade" });
    }
  });
}

function onRegisterBtnClicked() {
  console.log("Register button clicked!");
  const email = document.getElementById("new-email").value;
  const password = document.getElementById("new-password").value;
  var mod = document.querySelector("ons-modal");

  mod.show();
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log(user);
      const navigator = document.getElementById("myNavigator");
      navigator.pushPage("pages/main.html");
      mod.hide();
    })
    .catch((error) => {
      const errorMessage = error.message;
      mod.hide();
      console.log(errorMessage);
      displayError(error.code);
    });
}

function onGoToLoginBtnClicked() {
  const navigator = document.getElementById("myNavigator");
  navigator.pushPage("pages/login.html", { animation: "slide" });
}

function showRecipeDetails(recipe) {
  const navigator = document.getElementById("myNavigator");
  navigator.pushPage("pages/details.html", {
    animation: "slide",
    data: { recipe: recipe },
  });
}

function scheduleNotification(timeoutId) {
  timeouts.push(timeoutId);
}

function cancelAllNotifications() {
  timeouts.forEach(clearTimeout);
  timeouts = [];
}

function startRecipeBtnClicked(prepTime, recipeTitle, recipe) {
  if ("Notification" in window && "serviceWorker" in navigator) {
    if ("wakeLock" in navigator) {
      requestWakeLock();
    }
    if (Notification.permission !== "granted") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          startRecipeBtnClicked(prepTime, recipeTitle);
        } else {
          console.log("Notification permission denied.");
        }
      });
    } else {
      console.log(`Start cooking ${recipeTitle} in ${prepTime} minutes.`);

      cancelAllNotifications();

      if (!navigator.onLine) {
        setActiveRecipeInIndexedDB(recipe, auth.currentUser.uid, false, false);
        const timeoutId = setTimeout(() => {
          const options = {
            body: `Your prep timer for ${recipeTitle} has started.`,
            icon: "icons/manifest-icon-192.maskable.png",
            image: "images/logo.png",
          };
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification("Prep Time Reminder", options);
          });
          const nah = document.getElementById("myNavigator");
          nah.popPage();
          scheduleNotification(timeoutId);
        }, 1000);
      } else {
        setActiveRecipeInFirestore(recipe);
      }
    }
  } else {
    console.log("Browser does not support notifications or service workers.");
  }
}

async function setActiveRecipeInFirestore(newRecipeData) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      recipeDB
        .setActiveRecipe(newRecipeData, user.uid)
        .then((isSuccess) => {
          if (isSuccess) {
            const timeoutId = setTimeout(() => {
              const options = {
                body: `Your prep timer for ${newRecipeData.title} has started.`,
                icon: "icons/manifest-icon-192.maskable.png",
                image: "images/logo.png",
              };
              navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification("Prep Time Reminder", options);
              });
              const nah = document.getElementById("myNavigator");
              nah.popPage();
            }, 1000);

            scheduleNotification(timeoutId);
          }
        })
        .catch((error) => {
          console.error("Error setting active recipe:", error);
        });
    } else {
      console.log("User is signed out");
    }
  });
}

async function markRecipeAsCompletedInFirestore(userId, location) {
      recipeDB
        .completeAndDeleteActiveRecipe(db, userId, location)
        .then((isSuccess) => {
          console.log("Successfully marked as completed:", isSuccess);
        })
        .catch((error) => {
          console.error("Error marking recipe as completed:", error);
        });
    
}


async function setActiveRecipeInIndexedDB(newRecipeData, userId, sync, iscompleted, location) {
  const transaction = dbIndexedDB.transaction(["activeRecipe"], "readwrite");
  const store = transaction.objectStore("activeRecipe");
  let dd = { userId: userId, recipe: newRecipeData, sync: sync , iscompleted: iscompleted, location: location};
  store.put(dd);
}

function onGoToRegisterBtnClicked() {
  const navigator = document.getElementById("myNavigator");
  navigator.pushPage("pages/register.html", { animation: "slide" });
}

function onLoginBtnClicked() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const mod = document.querySelector("ons-modal");
  mod.show();
  const auth = getAuth();

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log("Logged in as:", user.email);
      const navigator = document.getElementById("myNavigator");
      navigator.pushPage("pages/main.html");
      mod.hide();
    })
    .catch((error) => {
      console.log("Error signing in:", error.code, error.message);
      displayError(error.code);
      mod.hide();
    });
}

function displayError(errorCode) {
  let userFriendlyMessage;

  switch (errorCode) {
    case "auth/email-already-in-use":
      userFriendlyMessage =
        "The email address is already in use by another account.";
      break;
    case "auth/invalid-email":
      userFriendlyMessage = "The email address is not valid.";
      break;
    case "auth/operation-not-allowed":
      userFriendlyMessage =
        "Email/password accounts are not enabled. Enable email/password authentication in the Firebase Console.";
      break;
    case "auth/weak-password":
      userFriendlyMessage =
        "The password is too weak. Please enter a stronger password.";
      break;
    case "auth/user-disabled":
      userFriendlyMessage =
        "This user account has been disabled. Please contact support.";
      break;
    case "auth/user-not-found":
      userFriendlyMessage =
        "No user found with this email address. Please check and try again.";
      break;
    case "auth/invalid-credential":
      userFriendlyMessage =
        "The email/password you entered is incorrect. Please try again.";
      break;
    case "auth/missing-password":
      userFriendlyMessage = "Please enter a password.";
      break;
    default:
      userFriendlyMessage = "An unknown error occurred. Please try again.";
      break;
  }

  ons.notification.toast(userFriendlyMessage, {
    timeout: 3000,
    animation: "fall",
  });
}

async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    console.log("Screen wake lock is active.");

    wakeLock.addEventListener("release", () => {
      console.log("Screen wake lock was released");
    });
  } catch (err) {
    console.error(`Failed to activate wake lock: ${err.name}, ${err.message}`);
  }
}

function releaseWakeLock() {
  if (wakeLock !== null) {
    wakeLock.release().then(() => {
      wakeLock = null;
      console.log("Screen wake lock has been released");
    });
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    releaseWakeLock();
  }
});
