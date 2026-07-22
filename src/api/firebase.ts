import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager,
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  limit,
  limitToLast,
  getDoc,
  getDocs,
  getDocFromServer,
  setDoc,
  runTransaction,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  UserProfile, 
  StockMovement, 
  UserRole,
  Produit
} from '../frontend/types';
import { 
  OperationType, 
  handleFirestoreError 
} from './lib/firestore-errors';
import { hashPassword } from './lib/crypto';
import { checkAndNotifyLowStock } from './services/notificationService';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Export Firestore functions
export type { User };
export { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  getDoc,
  getDocs,
  getDocFromServer,
  setDoc,
  runTransaction,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInAnonymously,
  limit,
  limitToLast,
  writeBatch,
  serverTimestamp,
  handleFirestoreError,
  OperationType
};

// Auth Helpers
export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(result.user);
  return result.user;
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    const hashedPass = await hashPassword(pass);
    await ensureUserProfile(result.user, undefined, hashedPass, false);
    return result.user;
  } catch (error: any) {
    // If Firebase Auth fails, try custom Firestore auth
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data() as UserProfile;
        const hashedPass = await hashPassword(pass);
        // Check both hashed and plain (for transition)
        if (userData.password === hashedPass || userData.password === pass) {
          // Return a mock user object that matches Firebase User interface enough for the app
          return {
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName,
            isAnonymous: false,
            emailVerified: true,
          } as any as User;
        }
      }
    }
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string, name: string, companyName: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(result.user, { displayName: name });
    const hashedPass = await hashPassword(pass);
    await ensureUserProfile(result.user, companyName, hashedPass, true);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      // If user exists in Auth, try to sign in and then ensure profile
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const hashedPass = await hashPassword(pass);
      await ensureUserProfile(result.user, companyName, hashedPass);
      return result.user;
    }
    throw error;
  }
};

export const logout = async (userProfile?: UserProfile | null) => {
  if (userProfile) {
    await logAction(
      userProfile.companyId, 
      userProfile.uid, 
      userProfile.displayName, 
      'DÉCONNEXION', 
      'L\'utilisateur s\'est déconnecté de la plateforme'
    );
  }
  localStorage.removeItem('customUser');
  return signOut(auth);
};

export async function ensureUserProfile(user: User, companyName?: string, hashedPassword?: string, isRegistration: boolean = false) {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  
  const targetRole = 'ADMINISTRATEUR_ENTREPRISE';

    if (!userDoc.exists()) {
      // If user exists in Auth but not in Firestore, auto-create a profile
      // instead of throwing error, to ensure smooth login.
      const profile: any = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
        role: targetRole,
        companyId: user.uid,
        companyName: companyName || '',
        isProfileComplete: false,
        active: true,
        createdAt: serverTimestamp(),
        subscriptionStatus: 'TRIAL',
        subscriptionEndDate: Date.now() + (14 * 24 * 60 * 60 * 1000) // 14 days trial
      };
      if (hashedPassword) {
        profile.password = hashedPassword;
      }
      try {
        await setDoc(userRef, profile);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`, user, false);
      }
    } else {
    const data = userDoc.data();
    const updates: any = {};

    if (!data.companyId && (data.role === 'ADMINISTRATEUR_ENTREPRISE' || data.role === 'GESTIONNAIRE_ENTREPRISE')) {
      updates.companyId = user.uid;
    }
    if (hashedPassword && !data.password) {
      updates.password = hashedPassword;
    }
    if (Object.keys(updates).length > 0) {
      try {
        await updateDoc(userRef, updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`, user, false);
      }
    }
  }
}

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  try {
    await setDoc(doc(db, 'users', uid), data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`, auth.currentUser, false);
  }
};

// Action Logger Helper
export const logAction = async (companyId: string, userId: string, userName: string, action: string, details?: string) => {
  try {
    const activeUserId = userId || auth.currentUser?.uid || 'system';
    await addDoc(collection(db, 'actions'), {
      companyId: companyId || '',
      userId: activeUserId,
      userName: userName || auth.currentUser?.displayName || 'Utilisateur',
      action: action || 'ACTION',
      details: details || '',
      timestamp: Date.now()
    });
  } catch (error) {
    console.warn("Could not log action:", error);
  }
};
export const recordStockMovement = async (movement: Omit<StockMovement, 'id'>) => {
  try {
    await runTransaction(db, async (transaction) => {
    const productRef = doc(db, 'produits', movement.produitId);
    const productDoc = await transaction.get(productRef);
    
    if (!productDoc.exists()) throw new Error("Produit non trouvé");
    
    const productData = productDoc.data();
    const currentStock = productData.stock || 0;
    const currentCump = productData.cump || productData.prixAchat || 0;
    
    let newStock = currentStock;
    let newCump = currentCump;
    
    if (movement.type === 'ENTREE') {
      newStock += movement.quantite;
      if (newStock > 0) {
        newCump = ((currentStock * currentCump) + (movement.quantite * movement.prixUnitaire)) / newStock;
      }
    } else {
      newStock -= movement.quantite;
    }

    transaction.update(productRef, { 
      stock: newStock,
      cump: newCump
    });
    
    const movementRef = doc(collection(db, 'stock_movements'));
    const movementData: any = {
      ...movement,
      date: Date.now()
    };
    
    // Remove undefined fields to prevent Firestore errors
    Object.keys(movementData).forEach(key => {
      if (movementData[key] === undefined) {
        delete movementData[key];
      }
    });

    transaction.set(movementRef, movementData);
    });

    // 2. Trigger alarms IF it was a sortie
    if (movement.type === 'SORTIE') {
      try {
        const productSnap = await getDoc(doc(db, 'produits', movement.produitId));
        if (productSnap.exists()) {
          const p = productSnap.data() as Produit;
          await checkAndNotifyLowStock(
            movement.produitId,
            p.designation || p.name || "Inconnu",
            p.stock,
            p.alertStock,
            movement.companyId || p.companyId || p.ownerId || "",
            auth.currentUser?.uid || 'system'
          );
        }
      } catch (e) {
        console.error("Delayed stock alert failed:", e);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'stock_movements', auth.currentUser, false);
  }
};

