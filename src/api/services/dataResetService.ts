import { 
  db, 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where,
  writeBatch,
  handleFirestoreError,
  OperationType,
  auth
} from '../firebase';

export const dataResetService = {
  resetDatabase,
  deleteCompanyAccount,
  resetAllDatabases,
  totalSystemReset
};

export async function resetDatabase() {
  const collectionsToReset = [
    'users',
    'companies',
    'transactions',
    'produits',
    'tiers',
    'charges',
    'payments',
    'wallets',
    'stock_movements',
    'actions',
    'tickets'
  ];

  try {
    for (const colName of collectionsToReset) {
      const snapshot = await getDocs(collection(db, colName));
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((document) => {
        const data = document.data();
        const email = data.email?.toLowerCase();
        
        // Don't delete the main admin accounts
        if (colName === 'users' && (email === 'innov.korp@gmail.com' || email === 'acherie812@gmail.com')) {
          return;
        }
        
        batch.delete(document.ref);
      });
      
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'mass_reset', auth.currentUser, false);
    throw error;
  }
}

export async function deleteCompanyAccount(companyId: string) {
  if (!companyId) return;
  console.log(`Deleting company account: ${companyId}`);
  
  const collectionsWithCompanyId = [
    { name: 'users', field: 'companyId' },
    { name: 'companies', field: 'id' },
    { name: 'transactions', field: 'ownerId' },
    { name: 'produits', field: 'ownerId' },
    { name: 'tiers', field: 'ownerId' },
    { name: 'charges', field: 'ownerId' },
    { name: 'payments', field: 'ownerId' },
    { name: 'wallets', field: 'companyId' },
    { name: 'stock_movements', field: 'ownerId' },
    { name: 'actions', field: 'companyId' },
    { name: 'notifications', field: 'companyId' },
    { name: 'tickets', field: 'companyId' },
    { name: 'treasury_certificates', field: 'companyId' },
    { name: 'payment_requests', field: 'companyId' }
  ];

  try {
    for (const col of collectionsWithCompanyId) {
      const q = query(collection(db, col.name), where(col.field, '==', companyId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) continue;
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((document) => {
        // Protect super admin users from cascade deletion
        if (col.name === 'users') {
          const email = document.data().email?.toLowerCase();
          if (email === 'innov.korp@gmail.com' || email === 'acherie812@gmail.com') {
            return;
          }
        }
        batch.delete(document.ref);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `cascade_delete_${companyId}`, auth.currentUser, false);
    throw error;
  }
}

export async function resetAllDatabases() {
  return resetDatabase();
}

export async function totalSystemReset() {
  return resetDatabase();
}
