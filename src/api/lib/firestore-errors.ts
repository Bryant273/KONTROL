export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, authUser?: any, shouldThrow: boolean = true) {
  let errorMessage = 'An unidentified database error occurred';
  if (error instanceof Error) {
    errorMessage = error.message || error.name || 'Error object with no description';
  } else if (typeof error === 'string' && error.trim().length > 0) {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    try {
      errorMessage = JSON.stringify(error);
    } catch {
      errorMessage = 'Non-stringifiable error object';
    }
  }

  const errInfo: FirestoreErrorInfo = {
    error: `[FIRESTORE ${operationType.toUpperCase()}] ${errorMessage}`,
    authInfo: {
      userId: authUser?.uid,
      email: authUser?.email,
      emailVerified: authUser?.emailVerified,
      isAnonymous: authUser?.isAnonymous,
      tenantId: authUser?.tenantId,
      providerInfo: authUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  const errorJson = JSON.stringify(errInfo, null, 2) || '{"error":"Catastrophic Firestore Failure"}';
  console.error(`[FIRESTORE ERROR] ${operationType.toUpperCase()} on ${path}:`, errInfo);
  
  if (shouldThrow) {
    const customError = new Error(errInfo.error || 'Firestore Operation failed with no further details');
    (customError as any).firestoreInfo = errInfo;
    (customError as any).rawError = error;
    (customError as any).errorJson = errorJson;
    (customError as any).name = 'FirestoreError';
    throw customError;
  }
  
  return errInfo;
}
