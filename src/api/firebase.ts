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

// Sanitize any legacy wrapped localStorage entries created by previous Storage.prototype wrappers
(() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      const keysToFix: { key: string; val: string }[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const raw = localStorage.getItem(key);
          if (raw && (raw.includes('"_w":true') || raw.includes('{"_v":'))) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed && parsed._w && parsed._v !== undefined) {
                if (key.includes('firestore') || key.includes('firebase') || key.includes('SharedClientState')) {
                  keysToRemove.push(key);
                } else {
                  keysToFix.push({
                    key,
                    val: typeof parsed._v === 'string' ? parsed._v : JSON.stringify(parsed._v)
                  });
                }
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }

      keysToRemove.forEach(k => localStorage.removeItem(k));
      keysToFix.forEach(item => localStorage.setItem(item.key, item.val));
    }
  } catch (err) {
    console.warn("[Firebase] LocalStorage sanitization warning:", err);
  }
})();

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firebase Storage with safe fallback
let storageInstance: any = null;
try {
  const { getStorage } = require('firebase/storage');
  storageInstance = getStorage(app);
} catch (e) {
  console.warn("[Firebase] Storage initialization notice:", e);
}
export const storage = storageInstance;

export const uploadCompanyFile = async (file: File, path: string): Promise<string> => {
  try {
    if (storage) {
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    }
  } catch (error) {
    console.warn("Firebase Storage upload fallback to DataURL:", error);
  }
  
  // Safe fallback to base64 DataURL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
};

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

// Local JSON/NoSQL User DB helper for offline/test account fallback
const LOCAL_USERS_KEY = 'kontrol_local_users_db_v1';

export function getLocalUsersDb(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUserToLocalDb(user: any) {
  if (typeof window === 'undefined') return;
  try {
    const dbList = getLocalUsersDb();
    const existingIdx = dbList.findIndex(u => u.email === user.email);
    if (existingIdx >= 0) {
      dbList[existingIdx] = { ...dbList[existingIdx], ...user };
    } else {
      dbList.push(user);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(dbList));
  } catch (e) {
    console.warn("Could not save to local DB:", e);
  }
}

export function findUserInLocalDb(email: string, hashedPass: string, rawPass: string) {
  const dbList = getLocalUsersDb();
  return dbList.find(u => u.email.toLowerCase() === email.toLowerCase() && (u.password === hashedPass || u.password === rawPass));
}

// Auth Helpers
export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(result.user);
  return result.user;
};

export const loginWithEmail = async (email: string, pass: string) => {
  const cleanEmail = email.trim().toLowerCase();
  const hashedPass = await hashPassword(pass);

  try {
    const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    await ensureUserProfile(result.user, undefined, hashedPass, false);
    return result.user;
  } catch (error: any) {
    // Check custom Firestore user auth
    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data() as UserProfile;
        if (userData.password === hashedPass || userData.password === pass) {
          const customUser = {
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName,
            isAnonymous: false,
            emailVerified: true,
          } as any as User;
          localStorage.setItem('customUser', JSON.stringify(customUser));
          return customUser;
        }
      }
    } catch (fsErr) {
      console.warn("Firestore lookup failed during login, checking local DB:", fsErr);
    }

    // Check Local JSON DB
    const localUser = findUserInLocalDb(cleanEmail, hashedPass, pass);
    if (localUser) {
      const customUser = {
        uid: localUser.uid,
        email: localUser.email,
        displayName: localUser.displayName || localUser.email.split('@')[0],
        isAnonymous: false,
        emailVerified: true,
      } as any as User;
      localStorage.setItem('customUser', JSON.stringify(customUser));
      return customUser;
    }

    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      throw new Error("Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.");
    }
    if (error.code === 'auth/too-many-requests') {
      throw new Error("Accès temporairement bloqué en raison de trop nombreuses tentatives de connexion. Veuillez réessayer plus tard.");
    }
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string, name: string, companyName: string) => {
  const cleanEmail = email.trim().toLowerCase();

  // Pre-validate password criteria
  const minLength = pass.length >= 8;
  const hasDigit = /\d/.test(pass);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pass);
  const hasUpper = /[A-Z]/.test(pass);

  if (!minLength || !hasDigit || !hasSpecial || !hasUpper) {
    const missing = [];
    if (!minLength) missing.push("au moins 8 caractères");
    if (!hasUpper) missing.push("au moins 1 majuscule (A-Z)");
    if (!hasDigit) missing.push("au moins 1 chiffre (0-9)");
    if (!hasSpecial) missing.push("au moins 1 symbole spécial (ex: @, #, !, $)");
    throw new Error(`Exigences de mot de passe : veuillez inclure ${missing.join(', ')}.`);
  }

  const hashedPass = await hashPassword(pass);

  // 1. Attempt standard Firebase Auth registration
  try {
    const result = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    await updateProfile(result.user, { displayName: name });
    await ensureUserProfile(result.user, companyName, hashedPass, true);
    saveUserToLocalDb({
      uid: result.user.uid,
      email: cleanEmail,
      displayName: name || cleanEmail.split('@')[0],
      password: hashedPass,
      companyName: companyName || 'Mon Entreprise',
      createdAt: Date.now()
    });
    return result.user;
  } catch (error: any) {
    const errCode = error?.code || '';

    if (errCode === 'auth/email-already-in-use') {
      try {
        const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        await ensureUserProfile(result.user, companyName, hashedPass);
        return result.user;
      } catch (loginErr: any) {
        throw new Error("Un compte existe déjà avec cet email. Veuillez utiliser l'onglet 'Connexion'.");
      }
    }

    if (errCode === 'auth/invalid-email') {
      throw new Error("Adresse email invalide. Veuillez vérifier le format de votre email.");
    }

    // 2. Seamless Fallback: Create account directly in Firestore & Local JSON DB
    console.warn("[Firebase Auth] Falling back to Firestore and Local JSON Database account creation due to:", error);

    const customUid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const customUserObj = {
      uid: customUid,
      email: cleanEmail,
      displayName: name || cleanEmail.split('@')[0] || 'Utilisateur',
      isAnonymous: false,
      emailVerified: true
    } as any as User;

    const profile: any = {
      uid: customUid,
      email: cleanEmail,
      displayName: name || cleanEmail.split('@')[0] || 'Utilisateur',
      role: 'ADMINISTRATEUR_ENTREPRISE',
      companyId: customUid,
      companyName: companyName || 'Mon Entreprise',
      isProfileComplete: false,
      active: true,
      createdAt: Date.now(),
      subscriptionStatus: 'TRIAL',
      subscriptionEndDate: Date.now() + (14 * 24 * 60 * 60 * 1000),
      password: hashedPass
    };

    // Store profile in Firestore
    try {
      await setDoc(doc(db, 'users', customUid), profile);
    } catch (fsErr) {
      console.warn("[Firestore] Could not write profile document to cloud Firestore, keeping local DB copy:", fsErr);
    }

    // Save user in Local JSON DB
    saveUserToLocalDb({
      uid: customUid,
      email: cleanEmail,
      displayName: name || cleanEmail.split('@')[0],
      password: hashedPass,
      companyName: companyName || 'Mon Entreprise',
      createdAt: Date.now()
    });

    // Set current active custom user session
    localStorage.setItem('customUser', JSON.stringify(customUserObj));

    return customUserObj;
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
    
    // Auto-save persistence to the Firestore company document
    const targetCompanyId = data.companyId || uid;
    if (targetCompanyId) {
      const compRef = doc(db, 'companies', targetCompanyId);
      const companyData: Record<string, any> = {
        id: targetCompanyId,
        ownerId: uid,
        updatedAt: Date.now()
      };

      if (data.companyName !== undefined) companyData.name = data.companyName;
      if (data.companyName !== undefined) companyData.companyName = data.companyName;
      if (data.companyAbbreviation !== undefined) companyData.abbreviation = data.companyAbbreviation;
      if (data.companyLogo !== undefined) companyData.logo = data.companyLogo;
      if (data.companyLogo !== undefined) companyData.companyLogo = data.companyLogo;
      if (data.companySignature !== undefined) companyData.companySignature = data.companySignature;
      if (data.signatureUrl !== undefined || data.companySignature !== undefined) {
        companyData.signatureUrl = data.signatureUrl || data.companySignature;
      }
      if (data.phone !== undefined) companyData.phone = data.phone;
      if (data.country !== undefined) companyData.country = data.country;
      if (data.city !== undefined) companyData.city = data.city;
      if (data.address !== undefined) companyData.address = data.address;
      if (data.currency !== undefined) companyData.currency = data.currency;
      if (data.language !== undefined) companyData.language = data.language;
      if (data.isProfileComplete !== undefined) companyData.isProfileComplete = data.isProfileComplete;
      if (data.contractSignedAt !== undefined) companyData.contractSignedAt = data.contractSignedAt;
      if (data.contractSignedBy !== undefined) companyData.contractSignedBy = data.contractSignedBy;
      if (data.subscriptionNextDueDate !== undefined) companyData.subscriptionNextDueDate = data.subscriptionNextDueDate;

      await setDoc(compRef, companyData, { merge: true }).catch(err => {
        console.warn("Notice: Firestore company auto-save info:", err);
      });
    }
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

