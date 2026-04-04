import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const exportToPDF = (title: string, headers: string[], data: any[][], fileName: string, logo?: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const dateStr = format(new Date(), 'dd MMMM yyyy HH:mm', { locale: fr });
  
  // --- Header Design (Innovative & Unique) ---
  // Main background bar
  doc.setFillColor(10, 25, 47); // KONTROL Dark
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Decorative accent bar (Blue)
  doc.setFillColor(52, 152, 219); 
  doc.rect(0, 40, pageWidth, 2, 'F');

  // Decorative corner element
  doc.setFillColor(52, 152, 219);
  doc.triangle(pageWidth, 0, pageWidth, 20, pageWidth - 20, 0, 'F');

  if (logo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, 8, 24, 24, 4, 4, 'F');
      doc.addImage(logo, 'PNG', 17, 10, 20, 20);
    } catch (e) {
      console.error("Error adding logo to report PDF", e);
    }
  }

  // App Name / Branding
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('KONTROL', logo ? 45 : 15, 22);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text('SYSTÈME DE GESTION INTELLIGENT', logo ? 45 : 15, 29);

  // Document Title (Right side)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), pageWidth - 15, 22, { align: 'right' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(`GÉNÉRÉ LE: ${dateStr.toUpperCase()}`, pageWidth - 15, 29, { align: 'right' });

  // --- Table Configuration ---
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 50,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      font: 'helvetica',
      textColor: [44, 62, 80],
      lineColor: [230, 230, 230],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [10, 25, 47], 
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    margin: { top: 50, left: 15, right: 15, bottom: 25 },
    didDrawPage: (data: any) => {
      // Footer Design
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      
      // Left side footer
      doc.text('KONTROL • SOLUTION DE GESTION PROFESSIONNELLE', 15, pageHeight - 12);
      doc.text('DOCUMENT OFFICIEL GÉNÉRÉ PAR LE SYSTÈME', 15, pageHeight - 8);

      // Right side footer
      const str = `PAGE ${data.pageNumber} SUR ${doc.getNumberOfPages()}`;
      doc.text(str, pageWidth - 15, pageHeight - 12, { align: 'right' });
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
