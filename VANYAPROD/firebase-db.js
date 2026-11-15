/**
 * Vanya Living - Unified Firestore & LocalStorage Data Layer
 * Handles real-time cloud sync with automatic offline fallback.
 */

window.VANYA_FIREBASE_CONFIG = {
  // Replace these with your Firebase project credentials from console.firebase.google.com
  apiKey: "YOUR_API_KEY",
  authDomain: "vanya-living.firebaseapp.com",
  projectId: "vanya-living",
  storageBucket: "vanya-living.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

(function() {
  const STORE_KEY = 'vl_products';
  let db = null;
  let isFirestoreReady = false;

  function initFirebase() {
    try {
      if (typeof firebase !== 'undefined' && window.VANYA_FIREBASE_CONFIG && window.VANYA_FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY') {
        if (!firebase.apps.length) {
          firebase.initializeApp(window.VANYA_FIREBASE_CONFIG);
        }
        db = firebase.firestore();
        isFirestoreReady = true;
        console.log('[VanyaDB] Cloud Firestore connected successfully.');
      } else {
        console.log('[VanyaDB] Running in LocalStorage mode (Cloud keys pending or offline).');
      }
    } catch (err) {
      console.warn('[VanyaDB] Firestore init fallback to LocalStorage:', err);
      isFirestoreReady = false;
    }
  }

  // Fallback LocalStorage functions
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
    } catch (e) {
      console.error('[VanyaDB] LocalStorage save failed:', e);
    }
  }

  const vanyaDB = {
    isReady: () => isFirestoreReady,

    // Fetch all products (from Firestore if connected, else LocalStorage)
    async getProducts() {
      if (isFirestoreReady && db) {
        try {
          const snapshot = await db.collection('products').get();
          if (!snapshot.empty) {
            const list = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              data.id = doc.id;
              list.push(data);
            });
            // Keep local storage warm as offline cache
            saveLocalProducts(list);
            return list;
          }
        } catch (e) {
          console.warn('[VanyaDB] Error fetching from Firestore, falling back to local cache:', e);
        }
      }
      return getLocalProducts();
    },

    // Save entire array (e.g., sample seeder or batch import)
    async setProducts(arr) {
      saveLocalProducts(arr);
      if (isFirestoreReady && db) {
        try {
          const batch = db.batch();
          arr.forEach(p => {
            const id = String(p.id || Date.now());
            p.id = id;
            batch.set(db.collection('products').doc(id), p);
          });
          await batch.commit();
          console.log('[VanyaDB] Batch products synced to Firestore.');
        } catch (e) {
          console.error('[VanyaDB] Firestore batch error:', e);
        }
      }
      return true;
    },

    // Save or update a product
    async saveProduct(prod) {
      const id = String(prod.id || Date.now());
      prod.id = id;

      // 1. Update local cache immediately
      let local = getLocalProducts();
      const existingIdx = local.findIndex(p => String(p.id) === id);
      if (existingIdx >= 0) {
        local[existingIdx] = prod;
      } else {
        local.unshift(prod);
      }
      saveLocalProducts(local);

      // 2. Sync to Cloud Firestore if connected
      if (isFirestoreReady && db) {
        try {
          await db.collection('products').doc(id).set(prod);
          console.log('[VanyaDB] Product synced to Firestore:', id);
        } catch (e) {
          console.error('[VanyaDB] Firestore save error:', e);
        }
      }
      return prod;
    },

    // Delete a product
    async deleteProduct(id) {
      id = String(id);
      // 1. Update local cache immediately
      let local = getLocalProducts().filter(p => String(p.id) !== id);
      saveLocalProducts(local);

      // 2. Delete from Cloud Firestore if connected
      if (isFirestoreReady && db) {
        try {
          await db.collection('products').doc(id).delete();
          console.log('[VanyaDB] Product deleted from Firestore:', id);
        } catch (e) {
          console.error('[VanyaDB] Firestore delete error:', e);
        }
      }
    },

    // Real-time listener for updates across tabs & customers
    subscribe(onChange) {
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
            onChange(list);
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
