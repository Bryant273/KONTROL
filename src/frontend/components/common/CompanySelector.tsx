import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Search, Loader2 } from 'lucide-react';
import { db, collection, getDocs, doc, getDoc, query, orderBy, handleFirestoreError, OperationType, auth } from '../../../api/firebase';
import { Company, UserProfile } from '../../types';
import { cn } from '../../lib/utils';

interface CompanySelectorProps {
  onSelect: (companyId: string | null) => void;
  selectedId: string | null;
}

export function CompanySelector(_props: CompanySelectorProps) {
  return null;
}
