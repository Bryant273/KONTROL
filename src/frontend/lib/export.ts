import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const drawKontrolLogo = (doc: jsPDF, x: number, y: number, size: number) => {
  const ctrX = x + size / 2;
  const ctrY = y + size / 2;
  
  // Outer sky blue ring
  doc.setDrawColor(2, 132, 199); // #0284C7
  doc.setLineWidth(size * 0.08);
  doc.circle(ctrX, ctrY, size * 0.42, 'S');
  
  // Orange ring representing swirl path
  doc.setDrawColor(249, 115, 22); // #F97316
  doc.setLineWidth(size * 0.06);
  doc.circle(ctrX, ctrY, size * 0.32, 'S');
  
  // Blue Arrow in the center
  const scale = size / 100;
  doc.setFillColor(37, 99, 235); // #2563EB (vibrant indigo-blue)
  
  // Arrow Head triangle
  const ax1 = x + 50 * scale;
  const ay1 = y + 18 * scale;
  const ax2 = x + 78 * scale;
  const ay2 = y + 52 * scale;
  const ax3 = x + 22 * scale;
  const ay3 = y + 52 * scale;
  doc.triangle(ax1, ay1, ax2, ay2, ax3, ay3, 'F');
  
  // Arrow Base stem rectangle
  const rWidth = 22 * scale;
  const rHeight = 28 * scale;
  const rx = x + 39 * scale;
  const ry = y + 52 * scale;
  doc.rect(rx, ry, rWidth, rHeight, 'F');
};

export const exportToPDF = (title: string, headers: string[], data: any[][], filename: string, options?: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Decide what to do with options
  let companyInfo = { name: 'KONTROL' };
  let clientInfo = null;
  let footer = 'Merci de votre confiance. Document généré par KONTROL.';
  
  if (typeof options === 'object' && options !== null) {
    if (options.companyInfo) companyInfo = { ...companyInfo, ...options.companyInfo };
    if (options.clientInfo) clientInfo = options.clientInfo;
    if (options.footer) footer = options.footer;
  }
  
  // Elegant Light Header background
  doc.setFillColor(253, 254, 255); // pure clean light card
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Subtle divider border
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(0, 40, pageWidth, 40);
  
  const sanitize = (str: string) => str.replace(/\u00A0/g, ' ');

  // Draw vector KONTROL Logo - fully visible with bright contrast
  drawKontrolLogo(doc, 15, 11, 18);

  // App Title / Company Logo Area (Top Left) - dark elegant text
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(sanitize(companyInfo.name), 38, 23);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('ERP de Gestion Intelligente', 38, 31);
  
  // Client Info (Header Bottom Right) - beautifully colored
  if (clientInfo) {
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const clientText = `CLIENT: ${sanitize((clientInfo as any).name || '')}`;
    
    doc.text(clientText, pageWidth - 15, 23, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // slate-600
    if ((clientInfo as any).email) {
      doc.text(sanitize((clientInfo as any).email), pageWidth - 15, 29, { align: 'right' });
    }
    if ((clientInfo as any).company) {
      doc.text(sanitize((clientInfo as any).company), pageWidth - 15, 34, { align: 'right' });
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
  if (!data || data.length === 0) return;
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (err) {
    console.error("Failed to export to Excel:", err);
    // Fallback to CSV if somehow binary write fails
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
    link.setAttribute("download", `${filename}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
