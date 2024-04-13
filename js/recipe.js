import {
    collection,
    addDoc,
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
  
    async addSong(title, artist) {
      try {
        const dbCollection = collection(this.db, this.collectionName);
        const docRef = await addDoc(dbCollection, {
          title: title,
          artist: artist,
          likes: 0,
        });
        return docRef.id;
      } catch (error) {
      }
    }
  
    async getSongList() {
      try {
        const dbCollection = collection(this.db, this.collectionName);
        const querySnapshot = await getDocs(dbCollection);
        return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data(),
        }));
      } catch (error) {
      }
    }
  
    async increaseLikes(songId) {
      const songRef = doc(this.db, this.collectionName, songId);
  
      try {
        const docSnap = await getDoc(songRef);
        const currentLikes = docSnap.data().likes;
  
        await updateDoc(songRef, {
          likes: currentLikes + 1,
        });
  
        return true;
      } catch (error) {
      }
    }
  
    async removeSong(songId) {
      const songRef = doc(this.db, this.collectionName, songId);
  
      try {
        await deleteDoc(songRef);
        return true;
      } catch (error) {
      }
    }
  }