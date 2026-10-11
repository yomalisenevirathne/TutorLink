import { Platform, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { receiptHtml, receiptShareText } from '../data/paymentReceipt';

export async function sharePaymentReceipt(receipt) {
  const message = receiptShareText(receipt);
  if (Platform.OS !== 'web') {
    await Share.share({ title: 'TutorLink demo receipt', message });
    return 'shared';
  }
  if (typeof navigator.share === 'function') {
    await navigator.share({ title: 'TutorLink demo receipt', text: message });
    return 'shared';
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(message);
    return 'copied';
  }
  throw new Error('Sharing is unavailable in this browser. Download the receipt instead.');
}

export async function downloadPaymentReceipt(receipt) {
  const html = receiptHtml(receipt);
  if (Platform.OS === 'web') {
    // Print only this receipt; hidden Expo routes must not appear in the PDF.
    const printWindow = window.open('', '_blank', 'width=700,height=850');
    if (!printWindow) throw new Error('Allow pop-ups to download your receipt.');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    return 'print';
  }
  if (!await Sharing.isAvailableAsync()) throw new Error('Saving PDFs is unavailable on this device.');
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Save demo payment receipt' });
  return 'file';
}
