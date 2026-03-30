import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const exportToPDF = (title: string, headers: string[], data: any[][], fileName: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const dateStr = format(new Date(), 'dd MMMM yyyy HH:mm', { locale: fr });
  
  // --- Header Design ---
  // Background for header
  doc.setFillColor(10, 25, 47); // KONTROL Dark
  doc.rect(0, 0, pageWidth, 45, 'F');

  // App Name / Logo Simulation
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('KONTROL', 15, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('ERP INTELLIGENT • GESTION GLOBALE', 15, 28);

  // Document Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 15, 40);

  // Metadata (Right side)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Généré le: ${dateStr}`, pageWidth - 15, 20, { align: 'right' });
  doc.text(`Document ID: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`, pageWidth - 15, 26, { align: 'right' });

  // --- Table Configuration ---
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 55,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      font: 'helvetica',
      textColor: [44, 62, 80],
      lineColor: [236, 240, 241],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [52, 152, 219], // Blue
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
    margin: { top: 55, left: 15, right: 15, bottom: 20 },
    didDrawPage: (data: any) => {
      // Footer
      const str = `Page ${data.pageNumber}`;
      doc.setFontSize(8);
      doc.setTextColor(149, 165, 166);
      doc.text(str, pageWidth - 15, 285, { align: 'right' });
      doc.text('© 2026 KONTROL ERP - Confidentialité Garantie', 15, 285);
      
      // Decorative line at bottom
      doc.setDrawColor(52, 152, 219);
      doc.setLineWidth(0.5);
      doc.line(15, 280, pageWidth - 15, 280);
    },
  });

  doc.save(`${fileName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');
  XLSX.writeFile(workbook, `${fileName}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
};
