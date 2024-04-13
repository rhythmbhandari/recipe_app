import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import firebaseConfig from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { RecipeDatabase } from './recipe.js';


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const recipeDB = new RecipeDatabase(db);
let dbIndexedDB;


function initIndexedDB() {
  const request = window.indexedDB.open('RecipesDB', 1);

  request.onerror = function(event) {
      console.error('Database error:', event.target.error);
  };

  request.onupgradeneeded = function(event) {
      const inDb = event.target.result;
      inDb.onerror = function(event) {
          console.error('Database error:', event.target.error);
      };

      const store = inDb.createObjectStore('recipes', { keyPath: 'id', autoIncrement: true });
      store.createIndex('title', 'title', { unique: false });
  };

  request.onsuccess = function(event) {
    dbIndexedDB = event.target.result;
    console.log('Database initialized successfully');

    dbIndexedDB.onerror = function(event) {
        console.error('Database error:', event.target.error);
    };
  };

  request.onerror = function(event) {
    console.error('Database error:', event.target.error);
};
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  initIndexedDB(); 
} else {
  document.addEventListener('DOMContentLoaded', initIndexedDB); 
}

document.addEventListener("show", function (event) {
    var page = event.target;
  
    if (page.id === "splashPage") {
      checkLoginStatus();
    }
    if (page.id === "registerPage") {
  
  
      console.log("Register page is now visible");
      var registerButton = page.querySelector("#registerButton");
      var goToLoginButton = page.querySelector("#goToLoginButton");
  
      // Ensure the event isn't bound multiple times
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
    if(page.id === "homePage"){
        checkData();
        page.querySelector("#searchInput").addEventListener('input', filterRecipes);

    }
    if (page.id === 'recipeDetailsPage') {
        var recipe = page.data.recipe;
        console.log(recipe)
        page.querySelector('.title').textContent = recipe.title;
        page.querySelector('img').setAttribute('src', recipe.imageUrl);
        page.querySelectorAll('p')[0].textContent = `Servings: ${recipe.servings}`;
        page.querySelectorAll('p')[1].textContent = `Prep Time: ${recipe.prepTime}`;
        page.querySelectorAll('p')[2].textContent = `Cook Time: ${recipe.cookTime}`;
        console.log(recipe.freezeTime)
    
    
        const ingredientsList = page.querySelector('ul');
        recipe.ingredients.forEach(ingredient => {
          const li = document.createElement('li');
          li.textContent = ingredient;
          ingredientsList.appendChild(li);
        });
    
        const instructionsList = page.querySelector('ol');
        recipe.instructions.forEach(step => {
          const li = document.createElement('li');
          li.textContent = step;
          instructionsList.appendChild(li);
        });
      }    
  });

  //recipeDB.fetchRecipes().then(displayRecipes);    

  async function checkData() {
    if (!navigator.onLine) {
      fetchFromCache();
    } else {
      fetchAndCacheRecipes();
    }
  }
  async function fetchFromCache() {
    const transaction = dbIndexedDB.transaction(['recipes'], 'readonly');
    const store = transaction.objectStore('recipes');
    const request = store.getAll();
  
    request.onsuccess = function() {
      displayRecipes(request.result);
    };
  
    request.onerror = function(event) {
      console.error("IndexedDB read error:", event.target.errorCode);
    };
  }


  async function fetchAndCacheRecipes() {
    try {
        const recipes = await recipeDB.fetchRecipes();
        const transaction = dbIndexedDB.transaction(['recipes'], 'readwrite');
        const store = transaction.objectStore('recipes');
        recipes.forEach(recipe => {
          store.put(recipe);
        });
        transaction.oncomplete = function() {
          displayRecipes(recipes);
        };

    } catch (error) {
      console.error("Error fetching from Firebase, trying cache", error);
      fetchFromCache();
    }
  }

  function filterRecipes(event) {
  const searchText = event.target.value.toLowerCase().split(/\s*,\s*/); 
  const transaction = dbIndexedDB.transaction(['recipes'], 'readonly');
  const store = transaction.objectStore('recipes');
  const request = store.getAll();

  request.onsuccess = function() {
    const recipes = request.result;
    const filteredRecipes = recipes.filter(recipe =>
      recipe.title.toLowerCase().includes(searchText[0]) || 
      searchText.every(term => 
        recipe.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes(term)
        )
      )
    );
    displayRecipes(filteredRecipes);
  };
}

  function displayRecipes(recipes) {
    const list = document.getElementById('recipeList');
    list.innerHTML = ''; 

    recipes.forEach(recipe => {
        const item = document.createElement('ons-list-item');
        item.setAttribute('modifier', 'tappable');
        item.classList.add('custom-list-item');
        item.setAttribute('modifier', "chevron");

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
    console.log("Did we reach here?")
    if (!navigator.onLine) {
      const navigator = document.getElementById("myNavigator");

      navigator.resetToPage('pages/home.html', { animation: 'fade' });
    } else {
      onAuthStateChanged(auth, user => {
        const navigator = document.getElementById("myNavigator");
        console.log("User is ", user)
        if (user) {
          navigator.resetToPage('pages/home.html', { animation: 'fade' });
        } else {
          navigator.resetToPage('pages/login.html', { animation: 'fade' });
        }
      });
    }
    
  }
  
  function onRegisterBtnClicked() {
    console.log("Register button clicked!");
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
  
  function onGoToLoginBtnClicked() {
    const navigator = document.getElementById("myNavigator");
    navigator.pushPage("pages/login.html", { animation: "slide" });
  }

  function showRecipeDetails(recipe) {
    const navigator = document.getElementById("myNavigator");
    navigator.pushPage("pages/details.html", { animation: "slide" , data: { recipe: recipe }});
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
        navigator.pushPage("pages/home.html");
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