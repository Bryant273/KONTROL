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
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
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
  getDoc,
  getDocs,
  setDoc,
  runTransaction,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  UserProfile, 
  StockMovement, 
  UserRole 
} from './types/index';
import { 
  OperationType, 
  handleFirestoreError 
} from './lib/firestore-errors';
import { hashPassword } from './lib/crypto';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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
  setDoc,
  runTransaction,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  limit,
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
    await ensureUserProfile(result.user, undefined, hashedPass);
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
    await ensureUserProfile(result.user, companyName, hashedPass);
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

export async function ensureUserProfile(user: User, companyName?: string, hashedPassword?: string) {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  
  const isAdminEmail = user.email === 'Innov.korp@gmail.com' || user.email === 'acherie812@gmail.com';
  const targetRole = isAdminEmail ? 'ADMINISTRATEUR_ERP' : 'ADMINISTRATEUR_ENTREPRISE';

  if (!userDoc.exists()) {
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      role: targetRole,
      companyId: user.uid,
      companyName: companyName || (isAdminEmail ? 'KONTROL ERP' : ''),
      isProfileComplete: isAdminEmail,
      createdAt: Date.now(),
      subscriptionStatus: 'TRIAL',
      subscriptionEndDate: Date.now() + (14 * 24 * 60 * 60 * 1000) // 14 days trial
    };
    if (hashedPassword) {
      profile.password = hashedPassword;
    }
    await setDoc(userRef, profile);
  } else {
    const data = userDoc.data();
    const updates: any = {};
    
    // Force role update for admin emails if they were misconfigured
    if (isAdminEmail && data.role !== 'ADMINISTRATEUR_ERP') {
      updates.role = 'ADMINISTRATEUR_ERP';
      updates.isProfileComplete = true;
    }

    if (!data.companyId && (data.role === 'ADMINISTRATEUR_ENTREPRISE' || data.role === 'GESTIONNAIRE_ENTREPRISE')) {
      updates.companyId = user.uid;
    }
    if (hashedPassword && !data.password) {
      updates.password = hashedPassword;
    }
    if (Object.keys(updates).length > 0) {
      await updateDoc(userRef, updates);
    }
  }
}

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  await updateDoc(doc(db, 'users', uid), data);
};

// Action Logger Helper
export const logAction = async (companyId: string, userId: string, userName: string, action: string, details?: string) => {
  try {
    await addDoc(collection(db, 'actions'), {
      companyId,
      userId,
      userName,
      action,
      details: details || '',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error logging action:", error);
  }
};
export const recordStockMovement = async (movement: Omit<StockMovement, 'id'>) => {
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
};

