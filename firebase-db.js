/**
 * Vanya Living - Unified Cloud Firestore Data Layer
 * Connected Project: vanyaven-4984f
 */

window.VANYA_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAUZ3wdYhGCGHC-At2HQ7_RtWnskzz617g",
  authDomain: "vanyaliving-8a633.firebaseapp.com",
  projectId: "vanyaliving-8a633",
  storageBucket: "vanyaliving-8a633.firebasestorage.app",
  messagingSenderId: "912019339731",
  appId: "1:912019339731:web:e5246e946d4c86a1159726",
  measurementId: "G-34980T8HVM"
};

(function () {
  'use strict';

  const STORE_KEY = 'vl_products';
  let db = null;
  let isFirestoreReady = false;

  function initFirebase() {
    try {
      if (typeof firebase !== 'undefined' && window.VANYA_FIREBASE_CONFIG && window.VANYA_FIREBASE_CONFIG.apiKey) {
        if (!firebase.apps.length) {
          firebase.initializeApp(window.VANYA_FIREBASE_CONFIG);
        }
        db = firebase.firestore();
        isFirestoreReady = true;
        console.log('[VanyaDB] Cloud Firestore connected successfully to project:', window.VANYA_FIREBASE_CONFIG.projectId);
      } else {
        console.warn('[VanyaDB] Firebase SDK not loaded, operating in offline fallback mode.');
      }
    } catch (err) {
      console.error('[VanyaDB] Firestore init error:', err);
      isFirestoreReady = false;
    }
  }

  function getLocalProducts() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocalProducts(products) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(products));
      window.vl_products = products;
    } catch (e) {
      console.warn('[VanyaDB] LocalStorage save warning:', e);
    }
  }

  // Pre-populate in-memory cache
  window.vl_products = getLocalProducts();

  const vanyaDB = {
    isReady: () => isFirestoreReady,

    // Fetch all products directly from Cloud Firestore
    async getProducts() {
      if (!isFirestoreReady) initFirebase();
      if (isFirestoreReady && db) {
        try {
          const snapshot = await db.collection('products').get();
          const list = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            list.push(data);
          });
          if (list.length > 0) {
            saveLocalProducts(list);
            return list;
          }
        } catch (e) {
          console.error('[VanyaDB] Firestore fetch error:', e);
        }
      }
      return getLocalProducts();
    },

    // Save a product document to Cloud Firestore
    async saveProduct(prod) {
      const id = String(prod.id || ('VL-' + Date.now()));
      prod.id = id;

      // 1. Save to Cloud Firestore
      if (!isFirestoreReady) initFirebase();
      if (isFirestoreReady && db) {
        try {
          await db.collection('products').doc(id).set(prod, { merge: true });
          console.log('[VanyaDB] Successfully saved product to Firestore:', id);
        } catch (e) {
          console.error('[VanyaDB] Firestore save error:', e);
        }
      }

      // 2. Update local storage & memory
      let local = getLocalProducts();
      const existingIdx = local.findIndex(p => String(p.id) === id);
      if (existingIdx >= 0) {
        local[existingIdx] = prod;
      } else {
        local.unshift(prod);
      }
      saveLocalProducts(local);
      return prod;
    },

    // Batch save products (e.g. sample seeder or multiple items)
    async setProducts(arr) {
      saveLocalProducts(arr);
      if (!isFirestoreReady) initFirebase();
      if (isFirestoreReady && db) {
        try {
          const batch = db.batch();
          arr.forEach(p => {
            const id = String(p.id || Date.now());
            p.id = id;
            batch.set(db.collection('products').doc(id), p, { merge: true });
          });
          await batch.commit();
          console.log('[VanyaDB] All products batch-synced to Cloud Firestore.');
        } catch (e) {
          console.error('[VanyaDB] Firestore batch sync error:', e);
        }
      }
      return true;
    },

    // Delete a product from Cloud Firestore
    async deleteProduct(id) {
      id = String(id);
      if (!isFirestoreReady) initFirebase();
      if (isFirestoreReady && db) {
        try {
          await db.collection('products').doc(id).delete();
          console.log('[VanyaDB] Deleted product from Firestore:', id);
        } catch (e) {
          console.error('[VanyaDB] Firestore delete error:', e);
        }
      }

      let local = getLocalProducts().filter(p => String(p.id) !== id);
      saveLocalProducts(local);
    },

    // Real-time synchronization subscription
    subscribe(onChange) {
      if (!isFirestoreReady) initFirebase();
      if (isFirestoreReady && db) {
        return db.collection('products').onSnapshot(snapshot => {
          const list = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            list.push(data);
          });
          if (list.length > 0) {
            saveLocalProducts(list);
            if (typeof onChange === 'function') onChange(list);
          }
        }, err => {
          console.warn('[VanyaDB] Snapshot error:', err);
        });
      }
      return null;
    }
  };

  initFirebase();
  window.vanyaDB = vanyaDB;
})();
