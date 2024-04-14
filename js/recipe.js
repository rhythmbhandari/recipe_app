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


  async fetchCompleted() {
    const querySnapshot = await getDocs(collection(this.db, "completed"));
    const completed = [];
    querySnapshot.forEach((doc) => {
      completed.push({ id: doc.id, ...doc.data() });
    });
    return completed;
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


async completeAndDeleteActiveRecipe(userId, location) {
  console.log(userId, location)
  const docRef = doc(this.db, "activeRecipes", userId);
  try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
          const { instructions, ingredients, likes, ...restOfData } = docSnap.data();

          const completedDocRef = collection(this.db, "completed") 

          await addDoc(completedDocRef, {
              ...restOfData,
              completedAt: new Date(),
              coordinates: location
          });
          console.log("Recipe added to completed recipes.");

          await deleteDoc(docRef);
          console.log("Active recipe deleted successfully.");
          return true;
      } else {
          console.log("No active recipe found to complete or delete.");
          return false;
      }
  } catch (error) {
      console.error("Error in completing and deleting active recipe:", error);
      return false;
  }
}

}
