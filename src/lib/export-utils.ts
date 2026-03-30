import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportToPDF = (headers: string[][], body: any[][], fileName: string, title: string) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title, 15, 20);
  doc.setFontSize(10);
  doc.text(`Généré le: ${new Date().toLocaleString()}`, 15, 30);

  autoTable(doc, {
    startY: 40,
    head: headers,
    body: body,
    theme: 'grid',
    headStyles: { fillColor: [0, 48, 80] }
  });

  doc.save(`${fileName}.pdf`);
};
