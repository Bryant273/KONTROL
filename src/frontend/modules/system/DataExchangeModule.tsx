import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Download, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode, 
  History, 
  Search, 
  Sparkles, 
  RefreshCw, 
  Check, 
  X,
  Play,
  ArrowRight,
  Info
} from 'lucide-react';
import { db, collection, getDocs, query, where, doc, setDoc, addDoc, auth, handleFirestoreError, OperationType, limit, orderBy } from '../../../api/firebase';
import { cn, formatDate, formatCurrency } from '../../lib/utils';
import { UserProfile, Transaction, Tiers, Produit, Charge } from '../../types';

interface DataExchangeModuleProps {
  currentUserProfile: UserProfile | null;
}

interface XMLOperationLog {
  id: string;
  userId: string;
  userName: string;
  action: 'XML_EXPORT' | 'XML_IMPORT' | 'XML_IMPORT_ERROR';
  details: string;
  timestamp: number;
  companyId: string;
  fileName: string;
  recordCount: number;
  status: 'success' | 'error';
}

export function DataExchangeModule({ currentUserProfile }: DataExchangeModuleProps) {
  const companyId = currentUserProfile?.companyId || '';
  const companyName = currentUserProfile?.companyName || 'Mon Entreprise';
  const userName = currentUserProfile?.displayName || 'Utilisateur';

  // State Management
  const [activeSubTab, setActiveSubTab] = useState<'import' | 'export' | 'logs'>('import');
  const [logs, setLogs] = useState<XMLOperationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsSearch, setLogsSearch] = useState('');
  
  // Export States
  const [exporting, setExporting] = useState(false);
  const [exportStats, setExportStats] = useState({ transactions: 0, tiers: 0, produits: 0, charges: 0 });
  
  // Import States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<{
    transactions: Partial<Transaction>[];
    tiers: Partial<Tiers>[];
    produits: Partial<Produit>[];
    charges: Partial<Charge>[];
  } | null>(null);
  
  const [previewTab, setPreviewTab] = useState<'transactions' | 'tiers' | 'produits' | 'charges'>('transactions');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    transactionsInserted: number;
    tiersInserted: number;
    produitsInserted: number;
    chargesInserted: number;
  } | null>(null);

  // Drag and drop state
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchExportEstimates();
  }, [companyId]);

  // Fetch estimates of records to export
  const fetchExportEstimates = async () => {
    if (!companyId) return;
    try {
      const [transSnap, tiersSnap, prodSnap, chargesSnap] = await Promise.all([
        getDocs(query(collection(db, 'transactions'), where('ownerId', '==', companyId))),
        getDocs(query(collection(db, 'tiers'), where('ownerId', '==', companyId))),
        getDocs(query(collection(db, 'produits'), where('ownerId', '==', companyId))),
        getDocs(query(collection(db, 'charges'), where('ownerId', '==', companyId)))
      ]);
      setExportStats({
        transactions: transSnap.size,
        tiers: tiersSnap.size,
        produits: prodSnap.size,
        charges: chargesSnap.size
      });
    } catch (err) {
      console.error("Error fetching export estimates:", err);
    }
  };

  // Fetch log of XML operations from 'actions' collection
  const fetchLogs = async () => {
    if (!companyId) return;
    setLoadingLogs(true);
    try {
      const q = query(
        collection(db, 'actions'),
        where('companyId', '==', companyId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const xmlActions = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter((act: any) => act.action && act.action.startsWith('XML_'))
        .map((act: any) => ({
          id: act.id,
          userId: act.userId || '',
          userName: act.userName || 'Système',
          action: act.action,
          details: act.details || '',
          timestamp: act.timestamp || Date.now(),
          companyId: act.companyId || '',
          fileName: act.fileName || 'Fichier inconnu.xml',
          recordCount: act.recordCount || 0,
          status: act.status || (act.action === 'XML_IMPORT_ERROR' ? 'error' : 'success')
        } as XMLOperationLog));
      
      setLogs(xmlActions);
    } catch (err) {
      console.error("Error fetching XML action logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Log operation in Firestore 'actions' collection
  const logXMLOperation = async (
    action: 'XML_EXPORT' | 'XML_IMPORT' | 'XML_IMPORT_ERROR',
    details: string,
    fileName: string,
    recordCount: number,
    status: 'success' | 'error'
  ) => {
    try {
      const actionRef = doc(collection(db, 'actions'));
      await setDoc(actionRef, {
        userId: auth.currentUser?.uid || 'system',
        userName: userName,
        action,
        details,
        timestamp: Date.now(),
        companyId,
        fileName,
        recordCount,
        status
      });
      fetchLogs();
    } catch (err) {
      console.error("Error writing operation audit log:", err);
    }
  };

  // Safe DOM text parsing helpers
  const getTagValue = (parent: Element, tagName: string, defaultValue = ''): string => {
    const el = parent.getElementsByTagName(tagName)[0];
    return el ? el.textContent?.trim() || defaultValue : defaultValue;
  };

  const getTagNumber = (parent: Element, tagName: string, defaultValue = 0): number => {
    const val = getTagValue(parent, tagName);
    if (!val) return defaultValue;
    const num = parseFloat(val);
    return isNaN(num) ? defaultValue : num;
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "text/xml" || file.name.endsWith('.xml')) {
        handleFileSelection(file);
      } else {
        setImportError("Format incorrect. Seuls les fichiers .xml sont acceptés.");
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  // Parse and Validate XML File
  const handleFileSelection = (file: File) => {
    setSelectedFile(file);
    setImportError(null);
    setValidationErrors([]);
    setParsedData(null);
    setImportResult(null);
    setImportProgress(0);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        // Basic check for parser error
        const parserError = xmlDoc.getElementsByTagName("parsererror")[0];
        if (parserError) {
          throw new Error("Syntaxe XML invalide. Veuillez vérifier le fichier.");
        }

        const root = xmlDoc.documentElement;
        if (root.tagName !== 'kontrol_erp_data') {
          throw new Error("Format non reconnu. L'élément racine doit être <kontrol_erp_data>.");
        }

        const errors: string[] = [];

        // Parse Tiers
        const tiersList: Partial<Tiers>[] = [];
        const tiersElements = xmlDoc.getElementsByTagName('tier');
        for (let i = 0; i < tiersElements.length; i++) {
          const el = tiersElements[i];
          const id = getTagValue(el, 'id');
          const name = getTagValue(el, 'name') || getTagValue(el, 'nom');
          const type = getTagValue(el, 'type') as 'CLIENT' | 'FOURNISSEUR';
          const email = getTagValue(el, 'email');
          const phone = getTagValue(el, 'phone') || getTagValue(el, 'telephone');
          const address = getTagValue(el, 'address') || getTagValue(el, 'adresse');
          const status = getTagValue(el, 'status') || getTagValue(el, 'statut') || 'ACTIF';

          // Validation
          if (!id) errors.push(`Tiers #${i + 1} : L'identifiant <id> est requis.`);
          if (!name) errors.push(`Tiers #${i + 1} : Le nom <name> est requis.`);
          if (type !== 'CLIENT' && type !== 'FOURNISSEUR') {
            errors.push(`Tiers #${i + 1} ("${name || 'Inconnu'}") : Le type doit être "CLIENT" ou "FOURNISSEUR".`);
          }

          tiersList.push({
            id: id || `T_${Date.now()}_${i}`,
            name,
            type: type === 'FOURNISSEUR' ? 'FOURNISSEUR' : 'CLIENT',
            email,
            phone,
            address,
            status,
            createdAt: Date.now()
          });
        }

        // Parse Produits
        const produitsList: Partial<Produit>[] = [];
        const prodElements = xmlDoc.getElementsByTagName('produit');
        for (let i = 0; i < prodElements.length; i++) {
          const el = prodElements[i];
          const id = getTagValue(el, 'id');
          const designation = getTagValue(el, 'designation') || getTagValue(el, 'name');
          const description = getTagValue(el, 'description');
          const price = getTagNumber(el, 'price') || getTagNumber(el, 'prixVente');
          const purchasePrice = getTagNumber(el, 'purchasePrice') || getTagNumber(el, 'prixAchat');
          const stock = getTagNumber(el, 'stock', 0);
          const category = getTagValue(el, 'category');
          const reference = getTagValue(el, 'reference');

          // Validation
          if (!id) errors.push(`Produit #${i + 1} : L'identifiant <id> est requis.`);
          if (!designation) errors.push(`Produit #${i + 1} : La désignation <designation> est requise.`);
          if (stock < 0) errors.push(`Produit #${i + 1} ("${designation || 'Inconnu'}") : Le stock ne peut pas être négatif.`);
          if (price < 0) errors.push(`Produit #${i + 1} ("${designation || 'Inconnu'}") : Le prix de vente ne peut pas être négatif.`);

          produitsList.push({
            id: id || `P_${Date.now()}_${i}`,
            name: designation,
            designation,
            description,
            price,
            prixVente: price,
            purchasePrice,
            prixAchat: purchasePrice,
            stock,
            category,
            reference,
            createdAt: Date.now()
          });
        }

        // Parse Transactions
        const transactionsList: Partial<Transaction>[] = [];
        const transElements = xmlDoc.getElementsByTagName('transaction');
        for (let i = 0; i < transElements.length; i++) {
          const el = transElements[i];
          const id = getTagValue(el, 'id');
          const type = getTagValue(el, 'type') as 'VENTE' | 'ACHAT';
          const tiersId = getTagValue(el, 'tiersId');
          const tiersNom = getTagValue(el, 'tiersNom');
          const montantTotal = getTagNumber(el, 'montantTotal') || getTagNumber(el, 'montant');
          const statut = getTagValue(el, 'statut') || getTagValue(el, 'status') || 'PAYE';
          const modePaiement = getTagValue(el, 'modePaiement') || getTagValue(el, 'paymentMethod') || 'CASH';
          const reference = getTagValue(el, 'reference') || `REF-XML-${Date.now().toString().slice(-4)}`;
          const description = getTagValue(el, 'description', '');
          const date = getTagNumber(el, 'date', Date.now());

          // Validation
          if (!id) errors.push(`Transaction #${i + 1} : L'identifiant <id> est requis.`);
          if (type !== 'VENTE' && type !== 'ACHAT') {
            errors.push(`Transaction #${i + 1} ("${reference}") : Le type doit être "VENTE" ou "ACHAT".`);
          }
          if (montantTotal <= 0) {
            errors.push(`Transaction #${i + 1} ("${reference}") : Le montant total doit être supérieur à 0.`);
          }
          if (!['PAYE', 'ATTENTE', 'ANNULE', 'COMPLETED', 'PENDING', 'CANCELLED'].includes(statut.toUpperCase())) {
            errors.push(`Transaction #${i + 1} ("${reference}") : Le statut "${statut}" est invalide.`);
          }

          // Map statuses properly
          let mappedStatut: 'PAYE' | 'ATTENTE' | 'ANNULE' = 'PAYE';
          if (statut.toUpperCase() === 'PENDING' || statut.toUpperCase() === 'ATTENTE') mappedStatut = 'ATTENTE';
          if (statut.toUpperCase() === 'CANCELLED' || statut.toUpperCase() === 'ANNULE') mappedStatut = 'ANNULE';

          transactionsList.push({
            id: id || `T_FIN_${Date.now()}_${i}`,
            type: type === 'ACHAT' ? 'ACHAT' : 'VENTE',
            tiersId: tiersId || 'DIVERS',
            tiersNom: tiersNom || 'Client/Fournisseur Divers',
            montantTotal,
            montant: montantTotal,
            date,
            statut: mappedStatut,
            status: mappedStatut === 'PAYE' ? 'COMPLETED' : mappedStatut === 'ATTENTE' ? 'PENDING' : 'CANCELLED',
            modePaiement,
            paymentMethod: modePaiement,
            reference,
            description,
            articles: [],
            createdAt: Date.now()
          });
        }

        // Parse Charges
        const chargesList: Partial<Charge>[] = [];
        const chargesElements = xmlDoc.getElementsByTagName('charge');
        for (let i = 0; i < chargesElements.length; i++) {
          const el = chargesElements[i];
          const id = getTagValue(el, 'id');
          const description = getTagValue(el, 'description');
          const montant = getTagNumber(el, 'montant');
          const category = getTagValue(el, 'category') || getTagValue(el, 'categorie', 'Divers');
          const date = getTagNumber(el, 'date', Date.now());
          const modePaiement = getTagValue(el, 'modePaiement', 'CASH');

          // Validation
          if (!id) errors.push(`Charge #${i + 1} : L'identifiant <id> est requis.`);
          if (!description) errors.push(`Charge #${i + 1} : La description est requise.`);
          if (montant <= 0) errors.push(`Charge #${i + 1} ("${description}") : Le montant doit être supérieur à 0.`);

          chargesList.push({
            id: id || `C_${Date.now()}_${i}`,
            description,
            montant,
            category,
            categorie: category,
            date,
            modePaiement,
            createdAt: Date.now()
          });
        }

        if (errors.length > 0) {
          setValidationErrors(errors);
        }

        setParsedData({
          transactions: transactionsList,
          tiers: tiersList,
          produits: produitsList,
          charges: chargesList
        });

        // Set default preview tab with data
        if (transactionsList.length > 0) setPreviewTab('transactions');
        else if (tiersList.length > 0) setPreviewTab('tiers');
        else if (produitsList.length > 0) setPreviewTab('produits');
        else if (chargesList.length > 0) setPreviewTab('charges');

      } catch (err: any) {
        setImportError(err.message || "Une erreur est survenue lors de la lecture du fichier.");
        logXMLOperation('XML_IMPORT_ERROR', `Échec du parsing du fichier: ${err.message}`, file.name, 0, 'error');
      }
    };
    reader.readAsText(file);
  };

  // Run the Firestore Integration
  const runImport = async () => {
    if (!parsedData || !companyId) return;
    setImporting(true);
    setImportProgress(5);
    
    let transCount = 0;
    let tiersCount = 0;
    let prodCount = 0;
    let chargesCount = 0;

    const totalToInsert = 
      parsedData.transactions.length + 
      parsedData.tiers.length + 
      parsedData.produits.length + 
      parsedData.charges.length;

    if (totalToInsert === 0) {
      setImportError("Aucune donnée à importer.");
      setImporting(false);
      return;
    }

    try {
      let currentItem = 0;

      // 1. Insert Tiers
      for (const item of parsedData.tiers) {
        const itemRef = doc(db, 'tiers', item.id!);
        await setDoc(itemRef, {
          ...item,
          ownerId: companyId,
          companyId: companyId
        });
        tiersCount++;
        currentItem++;
        setImportProgress(Math.min(95, Math.round((currentItem / totalToInsert) * 90) + 5));
      }

      // 2. Insert Products
      for (const item of parsedData.produits) {
        const itemRef = doc(db, 'produits', item.id!);
        await setDoc(itemRef, {
          ...item,
          ownerId: companyId,
          companyId: companyId
        });
        prodCount++;
        currentItem++;
        setImportProgress(Math.min(95, Math.round((currentItem / totalToInsert) * 90) + 5));
      }

      // 3. Insert Transactions
      for (const item of parsedData.transactions) {
        const itemRef = doc(db, 'transactions', item.id!);
        await setDoc(itemRef, {
          ...item,
          ownerId: companyId,
          companyId: companyId,
          createdAt: new Date() // firestore rules expect timestamp for transactions.createdAt
        });
        transCount++;
        currentItem++;
        setImportProgress(Math.min(95, Math.round((currentItem / totalToInsert) * 90) + 5));
      }

      // 4. Insert Charges
      for (const item of parsedData.charges) {
        const itemRef = doc(db, 'charges', item.id!);
        await setDoc(itemRef, {
          ...item,
          ownerId: companyId,
          companyId: companyId
        });
        chargesCount++;
        currentItem++;
        setImportProgress(Math.min(95, Math.round((currentItem / totalToInsert) * 90) + 5));
      }

      setImportProgress(100);
      setImportResult({
        success: true,
        transactionsInserted: transCount,
        tiersInserted: tiersCount,
        produitsInserted: prodCount,
        chargesInserted: chargesCount
      });

      // Log success
      const successMessage = `Importation XML réussie depuis ${selectedFile?.name}. Total : ${totalToInsert} enregistrements (Transactions : ${transCount}, Tiers : ${tiersCount}, Produits : ${prodCount}, Charges : ${chargesCount}).`;
      await logXMLOperation('XML_IMPORT', successMessage, selectedFile?.name || 'import.xml', totalToInsert, 'success');
      
      // Reset files & estimates
      setSelectedFile(null);
      setParsedData(null);
      fetchExportEstimates();

    } catch (err: any) {
      console.error("Firestore integration error:", err);
      setImportError(`Erreur lors de l'intégration dans la base de données : ${err.message}`);
      await logXMLOperation('XML_IMPORT_ERROR', `Échec d'intégration : ${err.message}`, selectedFile?.name || 'import.xml', 0, 'error');
    } finally {
      setImporting(false);
    }
  };

  // Generate XML and trigger download
  const handleExportXML = async () => {
    if (!companyId) return;
    setExporting(true);
    try {
      // 1. Fetch live data
      const [transSnap, tiersSnap, prodSnap, chargesSnap] = await Promise.all([
        getDocs(query(collection(db, 'transactions'), where('ownerId', '==', companyId))),
        getDocs(query(collection(db, 'tiers'), where('ownerId', '==', companyId))),
        getDocs(query(collection(db, 'produits'), where('ownerId', '==', companyId))),
        getDocs(query(collection(db, 'charges'), where('ownerId', '==', companyId)))
      ]);

      const transData = transSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      const tiersData = tiersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Tiers));
      const prodData = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Produit));
      const chargesData = chargesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Charge));

      // 2. Build XML String
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<kontrol_erp_data version="1.2.0" timestamp="${Date.now()}">\n`;
      
      // Metadata
      xml += `  <company_info>\n`;
      xml += `    <id>${escapeXml(companyId)}</id>\n`;
      xml += `    <name>${escapeXml(companyName)}</name>\n`;
      xml += `    <exported_by>${escapeXml(userName)}</exported_by>\n`;
      xml += `  </company_info>\n`;

      // Tiers
      xml += `  <tiers>\n`;
      tiersData.forEach(t => {
        xml += `    <tier>\n`;
        xml += `      <id>${escapeXml(t.id)}</id>\n`;
        xml += `      <name>${escapeXml(t.name || t.nom || '')}</name>\n`;
        xml += `      <type>${escapeXml(t.type)}</type>\n`;
        xml += `      <email>${escapeXml(t.email || '')}</email>\n`;
        xml += `      <phone>${escapeXml(t.phone || t.telephone || '')}</phone>\n`;
        xml += `      <address>${escapeXml(t.address || t.adresse || '')}</address>\n`;
        xml += `      <status>${escapeXml(t.status || t.statut || 'ACTIF')}</status>\n`;
        xml += `    </tier>\n`;
      });
      xml += `  </tiers>\n`;

      // Produits
      xml += `  <produits>\n`;
      prodData.forEach(p => {
        xml += `    <produit>\n`;
        xml += `      <id>${escapeXml(p.id)}</id>\n`;
        xml += `      <designation>${escapeXml(p.designation || p.name || '')}</designation>\n`;
        xml += `      <description>${escapeXml(p.description || '')}</description>\n`;
        xml += `      <price>${p.price || p.prixVente || 0}</price>\n`;
        xml += `      <purchasePrice>${p.purchasePrice || p.prixAchat || 0}</purchasePrice>\n`;
        xml += `      <stock>${p.stock || 0}</stock>\n`;
        xml += `      <category>${escapeXml(p.category || '')}</category>\n`;
        xml += `      <reference>${escapeXml(p.reference || '')}</reference>\n`;
        xml += `    </produit>\n`;
      });
      xml += `  </produits>\n`;

      // Transactions
      xml += `  <transactions>\n`;
      transData.forEach(tr => {
        xml += `    <transaction>\n`;
        xml += `      <id>${escapeXml(tr.id)}</id>\n`;
        xml += `      <type>${escapeXml(tr.type)}</type>\n`;
        xml += `      <tiersId>${escapeXml(tr.tiersId)}</tiersId>\n`;
        xml += `      <tiersNom>${escapeXml(tr.tiersNom)}</tiersNom>\n`;
        xml += `      <montantTotal>${tr.montantTotal || tr.montant || 0}</montantTotal>\n`;
        xml += `      <date>${tr.date}</date>\n`;
        xml += `      <statut>${escapeXml(tr.statut || tr.status || 'PAYE')}</statut>\n`;
        xml += `      <modePaiement>${escapeXml(tr.modePaiement || tr.paymentMethod || 'CASH')}</modePaiement>\n`;
        xml += `      <reference>${escapeXml(tr.reference || '')}</reference>\n`;
        xml += `      <description>${escapeXml(tr.description || '')}</description>\n`;
        xml += `    </transaction>\n`;
      });
      xml += `  </transactions>\n`;

      // Charges
      xml += `  <charges>\n`;
      chargesData.forEach(ch => {
        xml += `    <charge>\n`;
        xml += `      <id>${escapeXml(ch.id)}</id>\n`;
        xml += `      <description>${escapeXml(ch.description)}</description>\n`;
        xml += `      <montant>${ch.montant}</montant>\n`;
        xml += `      <category>${escapeXml(ch.category || ch.categorie || 'Divers')}</category>\n`;
        xml += `      <date>${ch.date}</date>\n`;
        xml += `      <modePaiement>${escapeXml(ch.modePaiement || 'CASH')}</modePaiement>\n`;
        xml += `    </charge>\n`;
      });
      xml += `  </charges>\n`;

      xml += `</kontrol_erp_data>\n`;

      // 3. Trigger Download
      const blob = new Blob([xml], { type: 'text/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `KONTROL_EXPORT_${companyName.toUpperCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xml`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log export
      const totalRecords = transData.length + tiersData.length + prodData.length + chargesData.length;
      await logXMLOperation('XML_EXPORT', `Exportation de ${totalRecords} enregistrements effectuée avec succès vers ${filename}.`, filename, totalRecords, 'success');
      
      setExportStats({
        transactions: transData.length,
        tiers: tiersData.length,
        produits: prodData.length,
        charges: chargesData.length
      });

    } catch (err: any) {
      console.error("XML Export failed:", err);
      alert(`Échec de l'exportation : ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Helper to safely escape special XML characters
  const escapeXml = (unsafe: string): string => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  const filteredLogs = logs.filter(log => {
    const searchLower = logsSearch.toLowerCase();
    return (
      log.fileName.toLowerCase().includes(searchLower) ||
      log.details.toLowerCase().includes(searchLower) ||
      log.userName.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-kontrol-dark tracking-tight flex items-center gap-2">
            <Database size={22} className="text-kontrol-blue" />
            Échange de Données XML
          </h2>
          <p className="text-[12.5px] text-kontrol-ink-soft mt-1">
            Importez et exportez vos données ERP au format XML standard sécurisé KONTROL
          </p>
        </div>

        {/* Sub-tabs selection */}
        <div className="flex bg-kontrol-bg p-1 rounded-xl border border-kontrol-border self-start md:self-auto">
          {[
            { id: 'import', icon: Upload, label: 'Importation XML' },
            { id: 'export', icon: Download, label: 'Exportation XML' },
            { id: 'logs', icon: History, label: 'Journal des Opérations' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as any);
                if (tab.id === 'logs') fetchLogs();
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                activeSubTab === tab.id 
                  ? "bg-white text-kontrol-blue shadow-sm border border-kontrol-border" 
                  : "text-kontrol-ink-muted hover:text-kontrol-dark"
              )}
            >
              <tab.icon size={13} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Areas */}
      
      {/* 1. XML IMPORT TAB */}
      {activeSubTab === 'import' && (
        <div className="space-y-6">
          
          {/* File Upload Stage */}
          {!parsedData && !importResult && (
            <div className="card p-8">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer",
                  dragActive ? "border-kontrol-blue bg-kontrol-blue/5 scale-[1.01]" : "border-kontrol-border bg-kontrol-bg/10 hover:bg-kontrol-bg/30"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                
                <div className="w-12 h-12 rounded-full bg-kontrol-blue/10 flex items-center justify-center text-kontrol-blue mb-4">
                  <FileCode size={24} />
                </div>
                
                <h3 className="text-sm font-extrabold text-kontrol-dark mb-1">
                  Glissez-déposez votre fichier XML ici
                </h3>
                <p className="text-[12px] text-kontrol-ink-soft mb-4">
                  ou cliquez pour parcourir vos fichiers (.xml)
                </p>
                
                <div className="text-[10px] uppercase font-bold tracking-widest text-kontrol-ink-muted bg-kontrol-bg px-3 py-1 rounded-full">
                  Format Strict KONTROL ERP
                </div>
              </div>

              {importError && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 flex items-start gap-3 text-xs">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Erreur d'importation : </span>
                    {importError}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import Progress Bar */}
          {importing && (
            <div className="card p-6 text-center space-y-4 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-kontrol-blue/10 flex items-center justify-center text-kontrol-blue mx-auto">
                <RefreshCw size={24} className="animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-kontrol-dark">Intégration dans Firestore...</h3>
                <p className="text-[11px] text-kontrol-ink-muted font-medium uppercase tracking-wider">Traitement des données en bloc</p>
              </div>
              <div className="max-w-md mx-auto">
                <div className="w-full h-2 bg-kontrol-bg rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-kontrol-blue transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono font-bold text-kontrol-ink-soft mt-1.5">
                  <span>PROGRÈS</span>
                  <span>{importProgress}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Import Success screen */}
          {importResult && (
            <div className="card p-8 text-center space-y-6">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-100 shadow-sm animate-bounce">
                <CheckCircle2 size={32} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-kontrol-dark">Importation Terminée avec Succès</h3>
                <p className="text-[12.5px] text-kontrol-ink-soft max-w-lg mx-auto">
                  Toutes les données ont été analysées, validées et mappées vers votre espace entreprise sécurisé.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto pt-2">
                {[
                  { label: 'Transactions', count: importResult.transactionsInserted },
                  { label: 'Tiers', count: importResult.tiersInserted },
                  { label: 'Produits', count: importResult.produitsInserted },
                  { label: 'Charges', count: importResult.chargesInserted }
                ].map(r => (
                  <div key={r.label} className="bg-kontrol-bg/40 border border-kontrol-border p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{r.label}</p>
                    <p className="text-xl font-black text-kontrol-dark mt-1">+{r.count}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setImportResult(null)}
                className="btn-outline px-6 text-xs font-bold"
              >
                Importer un autre fichier
              </button>
            </div>
          )}

          {/* XML PREVIEW BEFORE INTEGRATION */}
          {parsedData && !importing && !importResult && (
            <div className="space-y-6">
              
              {/* Validation Status Summary */}
              <div className={cn(
                "p-4 border rounded-xl text-xs flex items-start gap-3",
                validationErrors.length > 0 
                  ? "bg-amber-50 border-amber-200 text-amber-800" 
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              )}>
                {validationErrors.length > 0 ? (
                  <>
                    <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                    <div className="space-y-1.5 w-full">
                      <p className="font-bold text-[13px]">
                        Schéma XML analysé avec {validationErrors.length} avertissement{validationErrors.length > 1 ? 's' : ''} de structure
                      </p>
                      <p className="text-amber-700/90 text-[11.5px]">
                        Certaines lignes contiennent des incohérences mineures mais l'importation reste possible. Veuillez vérifier la structure ci-dessous.
                      </p>
                      <div className="max-h-28 overflow-y-auto bg-white/50 border border-amber-200/50 p-2.5 rounded-lg space-y-1 font-mono text-[10px] scrollbar-thin">
                        {validationErrors.map((err, idx) => (
                          <p key={idx}>• {err}</p>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
                    <div>
                      <p className="font-bold text-[13px]">Structure XML 100% Conforme au Schéma KONTROL</p>
                      <p className="text-emerald-700/90 text-[11.5px] mt-0.5">
                        Félicitations, le fichier importé respecte scrupuleusement la structure intègre de la base de données.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Data Preview Navigation */}
              <div className="card">
                <div className="card-hd bg-kontrol-bg/25">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={16} className="text-kontrol-orange" />
                    <span className="text-[12px] font-extrabold uppercase tracking-widest text-kontrol-dark">
                      Prévisualisation des Données à Importer
                    </span>
                  </div>
                  
                  {/* Tabs within preview */}
                  <div className="flex gap-1.5">
                    {[
                      { id: 'transactions', label: 'Transactions', count: parsedData.transactions.length },
                      { id: 'tiers', label: 'Tiers', count: parsedData.tiers.length },
                      { id: 'produits', label: 'Produits', count: parsedData.produits.length },
                      { id: 'charges', label: 'Charges', count: parsedData.charges.length }
                    ].map(t => (
                      <button
                        key={t.id}
                        disabled={t.count === 0}
                        onClick={() => setPreviewTab(t.id as any)}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider transition-colors",
                          previewTab === t.id
                            ? "bg-kontrol-dark text-white"
                            : t.count === 0 
                              ? "opacity-30 cursor-not-allowed text-kontrol-ink-muted"
                              : "bg-kontrol-bg text-kontrol-ink-soft hover:bg-kontrol-border"
                        )}
                      >
                        {t.label} ({t.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview tables */}
                <div className="overflow-x-auto max-h-96 scrollbar-thin">
                  
                  {/* A. Transactions Preview */}
                  {previewTab === 'transactions' && parsedData.transactions.length > 0 && (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-kontrol-bg/40 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider border-b border-kontrol-border">
                          <th className="px-4 py-2">ID</th>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2">Tiers</th>
                          <th className="px-4 py-2">Montant</th>
                          <th className="px-4 py-2">Statut</th>
                          <th className="px-4 py-2">Mode</th>
                          <th className="px-4 py-2">Référence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-kontrol-border text-[11.5px]">
                        {parsedData.transactions.map((tr, idx) => (
                          <tr key={idx} className="hover:bg-kontrol-bg/10">
                            <td className="px-4 py-2 font-mono font-bold text-kontrol-ink-soft">{tr.id?.substring(0, 8)}...</td>
                            <td className="px-4 py-2">
                              <span className={cn(
                                "px-1.5 py-0.5 text-[9px] font-bold rounded-md",
                                tr.type === 'VENTE' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                              )}>
                                {tr.type}
                              </span>
                            </td>
                            <td className="px-4 py-2 font-medium text-kontrol-dark">{tr.tiersNom}</td>
                            <td className="px-4 py-2 font-bold font-mono">{formatCurrency(tr.montantTotal || 0)}</td>
                            <td className="px-4 py-2">
                              <span className={cn(
                                "px-1.5 py-0.5 text-[9px] font-bold rounded-md",
                                tr.statut === 'PAYE' ? "bg-emerald-50 text-emerald-600" : tr.statut === 'ATTENTE' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                              )}>
                                {tr.statut}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-kontrol-ink-soft">{tr.modePaiement}</td>
                            <td className="px-4 py-2 font-mono text-[10px]">{tr.reference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* B. Tiers Preview */}
                  {previewTab === 'tiers' && parsedData.tiers.length > 0 && (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-kontrol-bg/40 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider border-b border-kontrol-border">
                          <th className="px-4 py-2">ID</th>
                          <th className="px-4 py-2">Nom</th>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2">Email</th>
                          <th className="px-4 py-2">Téléphone</th>
                          <th className="px-4 py-2">Adresse</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-kontrol-border text-[11.5px]">
                        {parsedData.tiers.map((t, idx) => (
                          <tr key={idx} className="hover:bg-kontrol-bg/10">
                            <td className="px-4 py-2 font-mono font-bold text-kontrol-ink-soft">{t.id?.substring(0, 8)}...</td>
                            <td className="px-4 py-2 font-bold text-kontrol-dark">{t.name}</td>
                            <td className="px-4 py-2">
                              <span className="px-1.5 py-0.5 bg-kontrol-bg text-kontrol-ink-soft text-[9px] font-bold rounded">
                                {t.type}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-kontrol-ink-soft font-mono">{t.email || '-'}</td>
                            <td className="px-4 py-2 font-mono">{t.phone || '-'}</td>
                            <td className="px-4 py-2 text-kontrol-ink-muted truncate max-w-xs">{t.address || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* C. Produits Preview */}
                  {previewTab === 'produits' && parsedData.produits.length > 0 && (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-kontrol-bg/40 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider border-b border-kontrol-border">
                          <th className="px-4 py-2">ID</th>
                          <th className="px-4 py-2">Désignation</th>
                          <th className="px-4 py-2">Prix Vente</th>
                          <th className="px-4 py-2">Prix Achat</th>
                          <th className="px-4 py-2">Stock</th>
                          <th className="px-4 py-2">Catégorie</th>
                          <th className="px-4 py-2">Référence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-kontrol-border text-[11.5px]">
                        {parsedData.produits.map((p, idx) => (
                          <tr key={idx} className="hover:bg-kontrol-bg/10">
                            <td className="px-4 py-2 font-mono font-bold text-kontrol-ink-soft">{p.id?.substring(0, 8)}...</td>
                            <td className="px-4 py-2 font-bold text-kontrol-dark">{p.designation}</td>
                            <td className="px-4 py-2 font-mono font-bold">{formatCurrency(p.price || 0)}</td>
                            <td className="px-4 py-2 font-mono text-kontrol-ink-soft">{formatCurrency(p.purchasePrice || 0)}</td>
                            <td className="px-4 py-2">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-full font-extrabold text-[10px]",
                                (p.stock || 0) <= 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                              )}>
                                {p.stock}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-kontrol-ink-soft">{p.category || '-'}</td>
                            <td className="px-4 py-2 font-mono text-[10px]">{p.reference || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* D. Charges Preview */}
                  {previewTab === 'charges' && parsedData.charges.length > 0 && (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-kontrol-bg/40 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider border-b border-kontrol-border">
                          <th className="px-4 py-2">ID</th>
                          <th className="px-4 py-2">Description</th>
                          <th className="px-4 py-2">Montant</th>
                          <th className="px-4 py-2">Catégorie</th>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Paiement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-kontrol-border text-[11.5px]">
                        {parsedData.charges.map((ch, idx) => (
                          <tr key={idx} className="hover:bg-kontrol-bg/10">
                            <td className="px-4 py-2 font-mono font-bold text-kontrol-ink-soft">{ch.id?.substring(0, 8)}...</td>
                            <td className="px-4 py-2 font-bold text-kontrol-dark">{ch.description}</td>
                            <td className="px-4 py-2 font-mono font-bold text-rose-600">{formatCurrency(ch.montant || 0)}</td>
                            <td className="px-4 py-2 text-kontrol-ink-soft">{ch.category}</td>
                            <td className="px-4 py-2 font-mono">{formatDate(ch.date || Date.now())}</td>
                            <td className="px-4 py-2 text-kontrol-ink-muted">{ch.modePaiement}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Confirm Import Buttons */}
              <div className="flex gap-3 justify-end items-center">
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setParsedData(null);
                    setValidationErrors([]);
                  }}
                  className="btn-outline text-xs px-5 py-2.5"
                >
                  Annuler l'importation
                </button>
                <button
                  onClick={runImport}
                  className="btn-primary text-xs px-6 py-2.5 flex items-center gap-2"
                >
                  <Play size={13} />
                  Valider et intégrer dans KONTROL ERP
                </button>
              </div>
            </div>
          )}

          {/* Quick instructions panel */}
          <div className="bg-blue-50/50 border border-kontrol-border p-4 rounded-xl flex items-start gap-3 text-xs text-kontrol-ink-soft">
            <Info size={16} className="text-kontrol-blue mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider text-kontrol-dark text-[10.5px]">Directives d'Importation XML</span>
              <p>
                L'importation écrase ou fusionne les données basées sur l'identifiant <code className="font-bold font-mono text-kontrol-dark">&lt;id&gt;</code>. Toutes les données importées sont automatiquement rattachées de manière hermétique à votre entreprise pour préserver la sécurité de votre base Firestore.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. XML EXPORT TAB */}
      {activeSubTab === 'export' && (
        <div className="card p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-kontrol-orange/10 flex items-center justify-center text-kontrol-orange shrink-0">
              <Download size={22} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-kontrol-dark">Exporter les données de l'entreprise</h3>
              <p className="text-xs text-kontrol-ink-soft mt-1">
                Générez instantanément un rapport complet au format XML contenant l'ensemble des modules d'activité de votre entreprise. Idéal pour les sauvegardes de conformité, la comptabilité ou la migration.
              </p>
            </div>
          </div>

          <div className="border border-kontrol-border rounded-xl p-4 bg-kontrol-bg/35 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Transactions', count: exportStats.transactions },
              { label: 'Tiers / Contacts', count: exportStats.tiers },
              { label: 'Produits en stock', count: exportStats.produits },
              { label: 'Charges diverses', count: exportStats.charges }
            ].map((stat, idx) => (
              <div key={idx} className="space-y-1 text-center bg-white border border-kontrol-border p-3 rounded-lg">
                <span className="text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-wider">{stat.label}</span>
                <p className="text-lg font-black text-kontrol-dark">{stat.count}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-kontrol-border pt-4">
            <div className="text-[11px] text-kontrol-ink-muted">
              Dernière mise à jour : Aujourd'hui à {new Date().toLocaleTimeString()}
            </div>
            
            <button
              onClick={handleExportXML}
              disabled={exporting}
              className="btn-primary text-xs font-bold py-2.5 px-6 flex items-center gap-2 cursor-pointer"
            >
              {exporting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Génération du XML...
                </>
              ) : (
                <>
                  <Download size={13} />
                  Lancer l'exportation XML
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. OPERATIONS LOG TAB */}
      {activeSubTab === 'logs' && (
        <div className="card">
          <div className="card-hd bg-kontrol-bg/10 flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-kontrol-ink-muted" size={14} />
              <input
                type="text"
                placeholder="Rechercher par fichier ou détails..."
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-kontrol-border bg-white rounded-xl text-xs placeholder:text-kontrol-ink-muted text-kontrol-ink focus:outline-none focus:border-kontrol-blue font-medium"
              />
            </div>
            
            <button
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="p-2 bg-kontrol-bg text-kontrol-ink-soft rounded-xl hover:bg-kontrol-blue/5 hover:text-kontrol-blue transition-all disabled:opacity-50"
              title="Rafraîchir le journal"
            >
              <RefreshCw size={14} className={loadingLogs ? 'animate-spin' : ''} />
            </button>
          </div>

          {loadingLogs ? (
            <div className="p-12 text-center text-xs text-kontrol-ink-muted font-bold flex flex-col items-center gap-2">
              <RefreshCw size={20} className="animate-spin text-kontrol-blue" />
              CHARGEMENT DU JOURNAL...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-kontrol-ink-muted font-bold">
              AUCUN LOG D'ÉCHANGE XML TROUVÉ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-kontrol-bg/50">
                    <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Date</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Utilisateur</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Type</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Fichier</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest">Détails de l'Opération</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-kontrol-ink-muted uppercase tracking-widest text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kontrol-border text-[12px]">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-kontrol-bg/20 transition-colors">
                      <td className="px-6 py-4 text-[11px] font-mono text-kontrol-ink-muted">
                        {formatDate(log.timestamp)} {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-kontrol-dark">{log.userName}</p>
                        <p className="text-[10px] text-kontrol-ink-muted">ID: {log.userId.substring(0, 8)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider",
                          log.action === 'XML_EXPORT' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                        )}>
                          {log.action === 'XML_EXPORT' ? 'EXPORT' : 'IMPORT'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-kontrol-ink-soft max-w-xs truncate" title={log.fileName}>
                        {log.fileName}
                      </td>
                      <td className="px-6 py-4 text-kontrol-ink-soft max-w-sm truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider",
                          log.status === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {log.status === 'success' ? 'SUCCÈS' : 'ÉCHEC'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
