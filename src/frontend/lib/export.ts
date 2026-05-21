import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToPDF = (title: string, headers: string[], data: any[][], filename: string, options?: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Decide what to do with options
  let companyInfo = { name: 'KONTROL' };
  let clientInfo = null;
  let footer = 'Merci de votre confiance. Document généré par KONTROL ERP.';
  
  if (typeof options === 'object' && options !== null) {
    if (options.companyInfo) companyInfo = { ...companyInfo, ...options.companyInfo };
    if (options.clientInfo) clientInfo = options.clientInfo;
    if (options.footer) footer = options.footer;
  }
  
  // Header background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  const sanitize = (str: string) => str.replace(/\u00A0/g, ' ');

  // App Title / Company Logo Area (Top Left)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(sanitize(companyInfo.name), 15, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('ERP de Gestion Intelligente', 15, 32);
  
  // Client Info (Header Bottom Right)
  if (clientInfo) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const clientText = `CLIENT: ${sanitize((clientInfo as any).name || '')}`;
    
    doc.text(clientText, pageWidth - 15, 25, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    if ((clientInfo as any).email) {
      doc.text(sanitize((clientInfo as any).email), pageWidth - 15, 30, { align: 'right' });
    }
    if ((clientInfo as any).company) {
      doc.text(sanitize((clientInfo as any).company), pageWidth - 15, 35, { align: 'right' });
    }
  }
  
  // Invoice Metadata
  doc.setTextColor(51, 51, 51);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(sanitize(title), 15, 55);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\u00A0/g, ' ');
  doc.text(`Émis le: ${dateStr}`, 15, 62);
  
  // Table
  autoTable(doc, {
    startY: 75,
    head: [headers.map(h => sanitize(h))],
    body: data.map(row => row.map(cell => typeof cell === 'string' ? sanitize(cell) : cell)),
    theme: 'grid',
    headStyles: { 
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: { 
      fontSize: 9,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 'auto' }
    }
  });
  
  // Footer
  const finalY = Math.max((doc as any).lastAutoTable.finalY + 20, 250);
  doc.setDrawColor(229, 231, 235);
  doc.line(15, finalY, pageWidth - 15, finalY);
  
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(footer, pageWidth / 2, finalY + 10, { align: 'center' });
  
  doc.save(`${filename}.pdf`);
};

export const exportToCSV = (data: any[], filename: string, options?: any) => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(fieldName => {
        const val = row[fieldName];
        const str = val === null || val === undefined ? '' : String(val);
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ];
  const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = (data: any[], filename: string, options?: any) => {
  // Semi-colon separation is ideal for French MS Excel compatibility
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(';'),
    ...data.map(row => 
      headers.map(fieldName => {
        const val = row[fieldName];
        const str = val === null || val === undefined ? '' : String(val);
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(';')
    )
  ];
  const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.xlsx`); // Give it excel extension
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
