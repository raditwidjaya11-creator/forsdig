import { Transaction, StoreSettings, PurchaseOrder, Supplier, Product, Client } from '../types';
import { format } from 'date-fns';
import { formatCurrency } from './utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportPurchaseOrderToPDF(po: PurchaseOrder, supplier: Supplier | undefined, products: Product[], settings: StoreSettings) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.name, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.address, 14, 26);
  doc.text(`Telp: ${settings.phone} | Email: ${settings.email}`, 14, 31);
  
  doc.setDrawColor(230, 230, 230);
  doc.line(14, 36, 196, 36);
  
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE ORDER', 14, 48);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`PO Number: ${po.id}`, 14, 54);
  doc.text(`Tanggal: ${format(new Date(po.timestamp), 'dd MMMM yyyy')}`, 14, 59);
  
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('SUPPLIER:', 140, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(supplier?.name || 'Unknown Supplier', 140, 54);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(supplier?.address || 'No Address', 140, 59);
  doc.text(`Telepon: ${supplier?.phone || '-'}`, 140, 64);

  const tableColumn = ["ID", "Produk", "Jumlah", "Harga Satuan", "Total Harga"];
  const tableRows = po.items.map(item => {
    const product = products.find(p => p.id === item.productId);
    return [
      item.productId.substring(0, 6),
      product?.name || 'Unknown Product',
      item.quantity.toString(),
      formatCurrency(item.costPrice),
      formatCurrency(item.quantity * item.costPrice)
    ];
  });

  autoTable(doc, {
    startY: 75,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 25 },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`GRAND TOTAL: ${formatCurrency(po.total)}`, 140, finalY + 10, { align: 'left' });

  const signatureY = Math.max(finalY + 30, 240);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Otorisasi Pesanan:', 14, signatureY);
  
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(14, signatureY + 4, 60, 25);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Digital Signature ID:', 16, signatureY + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(po.id, 16, signatureY + 15);
  
  for(let i=0; i<50; i+=2) {
    const width = Math.random() > 0.5 ? 0.7 : 0.3;
    doc.setLineWidth(width);
    doc.line(18 + i, signatureY + 18, 18 + i, signatureY + 26);
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Petugas Logistik', 14, signatureY + 35);
  doc.text(`(${settings.name})`, 14, signatureY + 40);

  const fileName = `PO_${po.id}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
}

export function exportTransactionsToCSV(transactions: Transaction[]) {
  const headers = ['ID Transaksi', 'Tanggal', 'Item', 'Subtotal', 'Pajak', 'Total', 'Metode Bayar', 'Bayar', 'Kembali'];
  
  const rows = transactions.map(tx => [
    tx.id,
    format(new Date(tx.timestamp), 'yyyy-MM-dd HH:mm:ss'),
    tx.items.map(i => `${i.name} (${i.quantity}x)`).join('; '),
    tx.subtotal,
    tx.tax,
    tx.total,
    tx.paymentMethod,
    tx.amountPaid,
    tx.change
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(value => 
      typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
    ).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Laporan_Transaksi_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportTransactionsToPDF(transactions: Transaction[], settings: StoreSettings) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text(settings.name, 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(settings.address, 14, 28);
  doc.text(`Telp: ${settings.phone}`, 14, 33);
  
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('LAPORAN TRANSAKSI', 14, 45);
  doc.setFontSize(10);
  doc.text(`Dicetak pada: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 50);

  const tableColumn = ["ID", "Tanggal", "Metode", "Subtotal", "Pajak", "Total"];
  const tableRows = transactions.map(tx => [
    tx.id.substring(0, 8),
    format(new Date(tx.timestamp), 'dd/MM/yy HH:mm'),
    tx.paymentMethod,
    formatCurrency(tx.subtotal),
    formatCurrency(tx.tax),
    formatCurrency(tx.total)
  ]);

  autoTable(doc, {
    startY: 55,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38] }, // tailwind red-600
    styles: { fontSize: 8 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const totalRevenue = transactions.reduce((sum, tx) => sum + tx.total, 0);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL PENDAPATAN: ${formatCurrency(totalRevenue)}`, 14, finalY);

  doc.save(`Laporan_Transaksi_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
}


export function exportClientsToCSV(clients: Client[], crmNotes: Record<string, { id: string; text: string; timestamp: string; type: string }[]>, transactions: Transaction[]) {
  const headers = ['ID Pelanggan', 'Nama', 'Telepon', 'Email', 'Alamat', 'Total Belanja (LTV)', 'Jumlah Kunjungan', 'Catatan Interaksi (CRM)'];
  
  const rows = clients.map(client => {
    const clientTxs = transactions.filter(t => 
      t.paymentDetails?.customerId === client.id || 
      (t.paymentDetails?.customerName && t.paymentDetails.customerName.toLowerCase() === client.name.toLowerCase()) ||
      t.paymentDetails?.customerPhone === client.phone
    );
    const ltv = clientTxs.reduce((sum, t) => sum + t.total, 0);
    const count = clientTxs.length;

    const notes = crmNotes[client.id] || [];
    const notesStr = notes.map(n => {
      let dateStr = '';
      try {
        dateStr = format(new Date(n.timestamp), 'yyyy-MM-dd HH:mm');
      } catch (e) {
        dateStr = n.timestamp;
      }
      return `[${n.type} ${dateStr}]: ${n.text}`;
    }).join('; ');

    return [
      client.id,
      client.name,
      client.phone || '-',
      client.email || '-',
      client.address || '-',
      ltv,
      count,
      notesStr || '-'
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(value => 
      typeof value === 'string' ? `"${value.replace(/"/g, '""').replace(/\n/g, ' ')}"` : value
    ).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Laporan_Pelanggan_CRM_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportClientsToPDF(clients: Client[], crmNotes: Record<string, { id: string; text: string; timestamp: string; type: string }[]>, transactions: Transaction[], settings: StoreSettings) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.name, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.address, 14, 28);
  doc.text(`Telp: ${settings.phone} | Email: ${settings.email}`, 14, 33);
  
  doc.setDrawColor(230, 230, 230);
  doc.line(14, 38, 196, 38);
  
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN PELANGGAN & RIWAYAT INTERAKSI CRM', 14, 48);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm')}`, 14, 54);

  // Statistics summaries
  const totalClients = clients.length;
  let goldCount = 0;
  let silverCount = 0;
  let totalNotes = 0;

  clients.forEach(client => {
    const clientTxs = transactions.filter(t => 
      t.paymentDetails?.customerId === client.id || 
      (t.paymentDetails?.customerName && t.paymentDetails.customerName.toLowerCase() === client.name.toLowerCase()) ||
      t.paymentDetails?.customerPhone === client.phone
    );
    const ltv = clientTxs.reduce((sum, t) => sum + t.total, 0);
    if (ltv >= 1000000) goldCount++;
    else if (ltv >= 250000) silverCount++;
    
    totalNotes += (crmNotes[client.id] || []).length;
  });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('RINGKASAN DATABASE PELANGGAN:', 14, 64);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`• Total Pelanggan Terdaftar: ${totalClients}`, 14, 70);
  doc.text(`• Pelanggan Gold: ${goldCount}`, 14, 75);
  doc.text(`• Pelanggan Silver: ${silverCount}`, 80, 70);
  doc.text(`• Total Catatan Interaksi CRM: ${totalNotes}`, 80, 75);

  const tableColumn = ["ID / Nama", "Kontak", "LTV & Kunjungan", "Catatan CRM"];
  const tableRows = clients.map(client => {
    const clientTxs = transactions.filter(t => 
      t.paymentDetails?.customerId === client.id || 
      (t.paymentDetails?.customerName && t.paymentDetails.customerName.toLowerCase() === client.name.toLowerCase()) ||
      t.paymentDetails?.customerPhone === client.phone
    );
    const ltv = clientTxs.reduce((sum, t) => sum + t.total, 0);
    const count = clientTxs.length;
    
    const notes = crmNotes[client.id] || [];
    const notesFormatted = notes.map(n => {
      let dStr = '';
      try {
        dStr = format(new Date(n.timestamp), 'dd/MM/yy');
      } catch (e) {
        dStr = '';
      }
      return `• [${n.type} ${dStr}] ${n.text}`;
    }).join('\n');

    return [
      `${client.name}\nID: #${client.id.substring(0, 8)}`,
      `${client.phone || '-'}\n${client.email || '-'}`,
      `${formatCurrency(ltv)}\n(${count}x Transaksi)`,
      notesFormatted || 'Tidak ada catatan CRM'
    ];
  });

  autoTable(doc, {
    startY: 83,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 40 },
      2: { cellWidth: 35 },
      3: { cellWidth: 70 }
    }
  });

  doc.save(`Laporan_Pelanggan_CRM_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
}
