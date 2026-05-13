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
  console.log(`Deleting company account: ${companyId}`);
  // Implementation would involve deleting all documents associated with this companyId
}

export async function resetAllDatabases() {
  return resetDatabase();
}

export async function totalSystemReset() {
  return resetDatabase();
}
