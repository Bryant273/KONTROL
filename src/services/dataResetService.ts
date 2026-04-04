import { 
  db, 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  query, 
  where,
  limit,
  deleteDoc,
  updateDoc
} from '../firebase';

const SUPER_ADMIN_EMAILS = ['Innov.korp@gmail.com', 'acherie812@gmail.com'];

/**
 * Resets the entire database except for the super admin accounts.
 * Clears all collections: users (except super admins), tiers, produits, transactions, 
 * charges, wallets, payments, stock_movements, tickets, actions, notifications.
 */
export const resetAllDatabases = async () => {
  const collectionsToClear = [
    'tiers', 
    'produits', 
    'transactions', 
    'charges', 
    'wallets', 
    'payments', 
    'stock_movements', 
    'tickets', 
    'actions', 
    'notifications',
    'companies',
    'logs',
    'audit_logs',
    'system_logs',
    'messages',
    'chat_rooms',
    'tasks',
    'events',
    'files',
    'backups',
    'activity_logs',
    'user_actions',
    'support_tickets',
    'invoices',
    'quotes',
    'purchase_orders',
    'sales_orders',
    'inventory_logs',
    'ledger',
    'bank_statements',
    'tax_reports',
    'subscriptions',
    'settings',
    'company_settings'
  ];

  console.log("Starting full system reset...");

  // 1. Clear all business data collections
  for (const collectionName of collectionsToClear) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      if (snapshot.empty) continue;

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      console.log(`Cleared collection: ${collectionName}`);
    } catch (e) {
      console.warn(`Error clearing collection ${collectionName}:`, e);
    }
  }

  // 2. Clear users except super admins
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const usersBatch = writeBatch(db);
    let deletedCount = 0;
    
    usersSnapshot.docs.forEach((d) => {
      const userData = d.data();
      if (!SUPER_ADMIN_EMAILS.includes(userData.email)) {
        usersBatch.delete(d.ref);
        deletedCount++;
      }
    });
    
    if (deletedCount > 0) {
      await usersBatch.commit();
    }
    console.log(`Cleared ${deletedCount} users. Super admins preserved.`);
  } catch (e) {
    console.error("Error clearing users:", e);
  }

  console.log("Database reset complete.");
};

/**
 * Performs a total system reset, deleting EVERY document in EVERY collection.
 * This includes all users, companies, and super admins.
 * After this, the next login will trigger a fresh profile creation.
 */
export const totalSystemReset = async () => {
  const collectionsToClear = [
    'users',
    'companies',
    'tiers', 
    'produits', 
    'transactions', 
    'charges', 
    'wallets', 
    'payments', 
    'stock_movements', 
    'tickets', 
    'actions', 
    'notifications',
    'logs',
    'audit_logs',
    'system_logs',
    'messages',
    'chat_rooms',
    'tasks',
    'events',
    'files',
    'backups',
    'activity_logs',
    'user_actions',
    'support_tickets',
    'invoices',
    'quotes',
    'purchase_orders',
    'sales_orders',
    'inventory_logs',
    'ledger',
    'bank_statements',
    'tax_reports',
    'subscriptions',
    'settings',
    'company_settings'
  ];

  console.log("Starting TOTAL system reset...");

  for (const collectionName of collectionsToClear) {
    try {
      let deletedInCollection = 0;
      while (true) {
        const q = query(collection(db, collectionName), limit(400));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) break;

        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => {
          batch.delete(d.ref);
        });
        
        await batch.commit();
        deletedInCollection += snapshot.size;
        console.log(`Batch deleted ${snapshot.size} docs from ${collectionName}`);
        
        // Safety break to avoid infinite loops if something goes wrong
        if (snapshot.size < 400) break;
      }
      if (deletedInCollection > 0) {
        console.log(`Successfully cleared ${deletedInCollection} docs from ${collectionName}`);
      }
    } catch (e) {
      console.warn(`Error clearing collection ${collectionName}:`, e);
    }
  }

  console.log("TOTAL system reset complete.");
};

/**
 * Deletes a company and all its associated data.
 * This deletes all users of the company and all data scoped by companyId/ownerId.
 */
export const deleteCompanyAccount = async (companyId: string) => {
  console.log(`Starting deletion for company: ${companyId}`);

  // 1. Delete all users of this company
  try {
    const usersQuery = query(collection(db, 'users'), where('companyId', '==', companyId));
    const usersSnapshot = await getDocs(usersQuery);
    const usersBatch = writeBatch(db);
    usersSnapshot.docs.forEach((d) => {
      const userData = d.data();
      // Never delete super admins even if they are linked to a company (safety check)
      if (!SUPER_ADMIN_EMAILS.includes(userData.email)) {
        usersBatch.delete(d.ref);
      }
    });
    await usersBatch.commit();
    console.log(`Deleted ${usersSnapshot.size} users for company ${companyId}`);
  } catch (e) {
    console.error("Error deleting company users:", e);
  }

  // 2. Delete all related data
  const collectionsToDelete = [
    'tiers', 
    'produits', 
    'transactions', 
    'charges', 
    'wallets', 
    'payments', 
    'stock_movements', 
    'actions', 
    'notifications',
    'tickets',
    'invoices',
    'quotes',
    'purchase_orders',
    'sales_orders',
    'inventory_logs',
    'ledger',
    'bank_statements',
    'tax_reports',
    'subscriptions',
    'settings',
    'company_settings',
    'tasks',
    'events',
    'files',
    'messages',
    'chat_rooms'
  ];

  for (const collectionName of collectionsToDelete) {
    try {
      // Note: Some collections use 'ownerId', others 'companyId'
      const field = (collectionName === 'actions' || collectionName === 'notifications' || collectionName === 'tasks' || collectionName === 'events' || collectionName === 'files' || collectionName === 'messages' || collectionName === 'chat_rooms') ? 'companyId' : 'ownerId';
      const q = query(collection(db, collectionName), where(field, '==', companyId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) continue;

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      console.log(`Cleared ${snapshot.size} docs from ${collectionName}`);
    } catch (e) {
      console.warn(`Error clearing collection ${collectionName} for company ${companyId}:`, e);
    }
  }

  // 3. Delete the company document itself
  try {
    const compDoc = doc(db, 'companies', companyId);
    await deleteDoc(compDoc);
    console.log(`Company document ${companyId} deleted.`);
  } catch (e) {
    console.warn("Company doc already deleted or not found", e);
  }

  console.log(`Full deletion complete for company ${companyId}.`);
};
