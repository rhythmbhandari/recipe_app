import {
  collection,
  addDoc,
  setDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

export class RecipeDatabase {
  constructor(db) {
    this.db = db;
    this.collectionName = "recipes";
  }

  async setActiveRecipe(newRecipeData, userId) {
    const docRef = doc(this.db, "activeRecipes", userId);
    try {
      await setDoc(docRef, newRecipeData);
      return true;
    } catch (error) {
      console.error("Error setting active recipe:", error);
      return false;
    }
  }

  async fetchRecipes() {
    const querySnapshot = await getDocs(collection(this.db, "recipes"));
    const recipes = [];
    querySnapshot.forEach((doc) => {
      recipes.push({ id: doc.id, ...doc.data() });
    });
    return recipes;
  }

  async  getActiveRecipe(db, userId) {
    const docRef = doc(db, "activeRecipes", userId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log("Active recipe data:", docSnap.data());
            return docSnap.data();
        } else {
            console.log("No active recipe found.");
            return null;
        }
    } catch (error) {
        console.error("Error fetching active recipe:", error);
        return null;
    }
}

  async removeSong(songId) {
    const songRef = doc(this.db, this.collectionName, songId);

    try {
      await deleteDoc(songRef);
      return true;
    } catch (error) {}
  }
}
