export const generateInvoicePDF = (transaction: any, userProfile?: any) => {
  console.log(`Generating invoice PDF for transaction: ${transaction.id}`, userProfile);
};

export const generateReceiptPDF = (transaction: any, userProfile?: any) => {
  console.log(`Generating receipt PDF for transaction: ${transaction.id}`, userProfile);
};
