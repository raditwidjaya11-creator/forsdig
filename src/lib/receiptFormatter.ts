/**
 * Thermal Receipt Formatter Utility (ESC/POS style)
 * Generates monospace text for 32 (58mm) or 48 (80mm) character width printers.
 */

interface ReceiptData {
  storeName: string;
  address: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  payment: number;
  change: number;
  date: string;
  transactionId: string;
}

export function formatReceipt(data: ReceiptData, width: number = 32): string {
  const line = "-".repeat(width);
  const center = (text: string) => {
    const spaces = Math.max(0, Math.floor((width - text.length) / 2));
    return " ".repeat(spaces) + text;
  };

  const justify = (left: string, right: string) => {
    const spaces = Math.max(1, width - (left.length + right.length));
    return left + " ".repeat(spaces) + right;
  };

  const formatCurrency = (val: number) => {
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
    }).format(val);
    return `Rp ${formatted}`;
  };

  let receipt = "";

  // Header
  receipt += center(data.storeName.toUpperCase()) + "\n";
  receipt += center(data.address) + "\n";
  receipt += line + "\n";
  receipt += center(`NO: ${data.transactionId}`) + "\n";
  receipt += line + "\n";

  // Items
  data.items.forEach(item => {
    receipt += item.name + "\n";
    receipt += justify(`${item.qty} x ${formatCurrency(item.price)}`, formatCurrency(item.subtotal)) + "\n";
  });

  receipt += line + "\n";

  // Calculations
  receipt += justify("SUBTOTAL", formatCurrency(data.subtotal)) + "\n";
  if (data.discount > 0) {
    receipt += justify("DISKON", `-${formatCurrency(data.discount)}`) + "\n";
  }
  receipt += line + "\n";
  receipt += justify("TOTAL", formatCurrency(data.total)) + "\n";
  receipt += line + "\n";
  receipt += justify("BAYAR", formatCurrency(data.payment)) + "\n";
  receipt += justify("KEMBALI", formatCurrency(data.change)) + "\n";
  receipt += line + "\n";

  // Footer
  receipt += center(data.date) + "\n";
  receipt += center("TERIMA KASIH") + "\n";
  receipt += center("SILAHKAN DATANG KEMBALI") + "\n";

  return receipt;
}
