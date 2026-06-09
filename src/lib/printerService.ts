import { Transaction, StoreSettings, Product } from '../types';
import { format } from 'date-fns';

const cleanASCII = (text: string): string => {
  if (!text) return '';
  return text
    .normalize('NFD') // decompose accents
    .replace(/[\u0300-\u036f]/g, '') // remove accent marks
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes
    .replace(/[\u2013\u2014]/g, '-') // em/en dashes
    .replace(/[\u00A0\u202F\u200F\u200E]/g, ' ') // non-breaking spaces & bidi marks to simple spaces
    .replace(/[^\x20-\x7E\x0A\x0D]/g, ' ') // fallback: any remaining non-ASCII printable chars to spaces
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .trim();
};

export class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  isConnected(): boolean {
    return !!(this.device && this.device.gatt && this.device.gatt.connected && this.characteristic);
  }

  async connect(settings: StoreSettings): Promise<boolean> {
    try {
      if (this.isConnected()) {
        return true;
      }

      // Common Thermal Printer Service UUIDs
      const commonServices = [
        '000018f0-0000-1000-8000-00805f9b34fb', // Generic POS
        '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (Very Common)
        '49535053-fe7d-4ae5-8fa9-9fafd205e455', // Common Chinese printers
        'e7810640-3359-4660-9dd8-e54c02b5fbd4', // Some inner printers
      ];

      if (settings.printerServiceUuid) {
        commonServices.unshift(settings.printerServiceUuid);
      }

      // First attempt with filters (better UX as it avoids listing non-printers)
      try {
        this.device = await navigator.bluetooth.requestDevice({
          filters: [
            { services: commonServices },
            { namePrefix: 'InnerPrinter' },
            { namePrefix: 'BT Printer' },
            { namePrefix: 'MTP' },
            { namePrefix: 'RPP' },
            { namePrefix: 'POS' },
            { namePrefix: 'Printer' }
          ],
          optionalServices: commonServices
        });
      } catch (e) {
        // Fallback to searching all devices if filtered search fails or is cancelled
        console.warn("Filtered search failed, trying all devices...");
        this.device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: commonServices
        });
      }

      if (!this.device || !this.device.gatt) return false;

      // Handle disconnection
      this.device.addEventListener('gattserverdisconnected', () => {
        this.characteristic = null;
        this.device = null;
      });

      const server = await this.device.gatt.connect();
      
      // Try to find the service from our list of common services
      let service: BluetoothRemoteGATTService | null = null;
      
      for (const serviceUuid of commonServices) {
        try {
          service = await server.getPrimaryService(serviceUuid);
          if (service) break;
        } catch (e) {
          continue;
        }
      }
      
      if (!service) {
        // Final fallback: try to find any service that likely contains a printer characteristic
        const availableServices = await server.getPrimaryServices();
        for (const s of availableServices) {
          const chars = await s.getCharacteristics();
          const writeChar = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
          if (writeChar) {
            service = s;
            this.characteristic = writeChar;
            break;
          }
        }
      } else {
        const characteristics = await service.getCharacteristics();
        this.characteristic = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse) || null;
      }

      return !!this.characteristic;
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      return false;
    }
  }

  private async writeToCharacteristic(chunk: Uint8Array) {
    if (!this.characteristic) return;
    try {
      if ('writeValueWithoutResponse' in this.characteristic && this.characteristic.properties.writeWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else if ('writeValueWithResponse' in this.characteristic && this.characteristic.properties.write) {
        await this.characteristic.writeValueWithResponse(chunk);
      } else {
        await this.characteristic.writeValue(chunk);
      }
    } catch (e) {
      // Fallback if specific methods are unsupported or fail
      await this.characteristic.writeValue(chunk);
    }
  }

  async printBarcodes(products: Product[], quantity: number, settings: StoreSettings, paperSize: '48' | '58' | '80' = '58') {
    if (!this.isConnected()) {
      const connected = await this.connect(settings);
      if (!connected) throw new Error('Could not connect to printer');
    }

    const encoder = new TextEncoder();
    const widthMap = { '48': 24, '58': 32, '80': 48 };
    const maxChars = widthMap[paperSize];

    // ESC/POS Commands
    const init = '\x1B\x40';
    const center = '\x1B\x61\x01';
    const feed = '\x0A';
    const cut = '\x1D\x56\x41\x00'; // Full cut
    
    // Barcode settings (GS k)
    const barcodeHeight = '\x1D\x68\x50'; // 80 dots height
    const barcodeWidth = '\x1D\x77\x03';  // 3 dots width multiplier
    const barcodeTextPos = '\x1D\x48\x02'; // Text below barcode

    let data = init + center;

    for (const product of products) {
      for (let i = 0; i < quantity; i++) {
        const sku = product.sku || product.id.slice(-8);
        const formattedPrice = `Rp ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(product.price).replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, "")}`;
        data += center + cleanASCII(product.name).toUpperCase().substring(0, maxChars) + feed;
        data += barcodeHeight + barcodeWidth + barcodeTextPos;
        data += `\x1D\x6B\x04${sku}\x00`; 
        data += feed + formattedPrice + feed + feed;
        data += '-'.repeat(maxChars) + feed + feed;
      }
    }

    data += feed + feed + feed + feed + cut;

    const encodedData = encoder.encode(data);
    const chunkSize = 100;
    for (let i = 0; i < encodedData.length; i += chunkSize) {
      const chunk = encodedData.slice(i, i + chunkSize);
      try {
        await this.writeToCharacteristic(chunk);
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        console.error('Print barcode chunk error:', err);
        throw new Error('Gagal mengirim data ke printer');
      }
    }
  }

  async printReceipt(transaction: Transaction, settings: StoreSettings, paperSize: '48' | '58' | '80' = '58') {
    if (!this.isConnected()) {
      const connected = await this.connect(settings);
      if (!connected) throw new Error('Could not connect to printer');
    }

    const maxChars = {
      '48': 24,
      '58': 32,
      '80': 48
    }[paperSize] || 32;

    const safeFormat = (val: number) => {
      const num = Math.round(val);
      const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0
      }).format(num);
      const cleanFormatted = formatted.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, "");
      return `Rp ${cleanFormatted}`;
    };

    const feed = '\x0A';
    const init = '\x1B\x40';
    const boldOn = '\x1B\x45\x01';
    const boldOff = '\x1B\x45\x00';
    const centerAlign = '\x1B\x61\x01';
    const leftAlign = '\x1B\x61\x00';

    const justifyText = (leftText: string, rightText: string) => {
      const cleanLeft = cleanASCII(leftText);
      const cleanRight = cleanASCII(rightText);
      const spacesNeeded = maxChars - (cleanLeft.length + cleanRight.length);
      if (spacesNeeded > 0) {
        return cleanLeft + ' '.repeat(spacesNeeded) + cleanRight;
      }
      return cleanLeft + feed + ' '.repeat(Math.max(0, maxChars - cleanRight.length)) + cleanRight;
    };

    const centerText = (text: string) => {
      const clean = cleanASCII(text);
      const spaces = Math.max(0, Math.floor((maxChars - clean.length) / 2));
      return ' '.repeat(spaces) + clean;
    };

    let data = init;

    // Header section
    data += centerAlign + boldOn + cleanASCII(settings.name).toUpperCase().substring(0, maxChars) + feed + boldOff;
    if (settings.address) {
      data += centerText(settings.address) + feed;
    }
    if (settings.phone) {
      data += centerText('Tlp: ' + settings.phone) + feed;
    }
    data += leftAlign + '-'.repeat(maxChars) + feed;

    // Metadata section
    data += justifyText('No   :', (transaction.id || '').slice(-8).toUpperCase()) + feed;
    data += justifyText('Tgl  :', format(new Date(transaction.timestamp), 'dd/MM/yy HH:mm')) + feed;
    data += justifyText('Kasir:', (transaction.paymentDetails?.cashierName || 'Admin').substring(0, 15)) + feed;
    
    if (transaction.paymentDetails?.customerName) {
      data += justifyText('Plg  :', transaction.paymentDetails.customerName.substring(0, 15)) + feed;
    }
    data += '-'.repeat(maxChars) + feed;

    // Items list
    transaction.items.forEach(item => {
      data += cleanASCII(item.name).toUpperCase().substring(0, maxChars) + feed;
      const qtyPrice = `${item.quantity} x ${safeFormat(item.price)}`;
      const sub = safeFormat(item.price * item.quantity);
      data += justifyText('  ' + qtyPrice, sub) + feed;
    });
    data += '-'.repeat(maxChars) + feed;

    // Financial calculations
    data += justifyText('SUBTOTAL', safeFormat(transaction.subtotal)) + feed;
    
    if (transaction.tax > 0) {
      const taxRate = settings.taxRate || 0;
      data += justifyText(`PAJAK (${taxRate}%)`, safeFormat(transaction.tax)) + feed;
    }
    
    if (transaction.discount && transaction.discount > 0) {
      data += justifyText('DISKON', '-' + safeFormat(transaction.discount)) + feed;
    }

    if (transaction.adminFee && transaction.adminFee > 0) {
      data += justifyText('ADMIN FEE', safeFormat(transaction.adminFee)) + feed;
    }

    data += boldOn + justifyText('TOTAL', safeFormat(transaction.total)) + boldOff + feed;
    data += '-'.repeat(maxChars) + feed;

    // Payment & Change details
    const methodStr = `BAYAR (${transaction.paymentMethod})`;
    data += justifyText(methodStr, safeFormat(transaction.amountPaid)) + feed;
    data += justifyText('KEMBALI', safeFormat(transaction.change)) + feed;
    data += '-'.repeat(maxChars) + feed;

    // Loyalty Points information
    if (transaction.paymentDetails?.pointsRedeemed || transaction.paymentDetails?.pointsEarned) {
      data += centerText('LOYALTY POINTS') + feed;
      if (transaction.paymentDetails.pointsRedeemed) {
        data += justifyText('  POIN DITUKAR', `${transaction.paymentDetails.pointsRedeemed} P`) + feed;
        data += justifyText('  NILAI DISKON', safeFormat(transaction.paymentDetails.pointsRedeemedValue || 0)) + feed;
      }
      if (transaction.paymentDetails.pointsEarned) {
        data += justifyText('  POIN DIDAPAT', `+${transaction.paymentDetails.pointsEarned} P`) + feed;
      }
      data += '-'.repeat(maxChars) + feed;
    }

    // Footer section
    data += centerAlign;
    if (settings.footerMessage) {
      settings.footerMessage.split('\n').forEach(line => {
        data += centerText(line) + feed;
      });
    } else {
      data += centerText('TERIMA KASIH') + feed;
      data += centerText('SILAHKAN DATANG KEMBALI') + feed;
    }

    // Crucial: Feed paper before cutting so that cheap printers don't slash the text!
    data += feed + feed + feed + feed + feed;
    
    // ESC/POS select cut (GS V B 00)
    data += '\x1D\x56\x42\x00';

    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    const chunkSize = 128; // Optimized chunk sizes for thermal printer bluetooth chips

    for (let i = 0; i < encodedData.length; i += chunkSize) {
      const chunk = encodedData.slice(i, i + chunkSize);
      try {
        await this.writeToCharacteristic(chunk);
        // Small delay to allow slow serial bluetooth buffers to keep pace
        await new Promise(resolve => setTimeout(resolve, 60));
      } catch (err) {
        console.error('Print chunk error:', err);
        throw new Error('Gagal mengirim data ke printer');
      }
    }
  }
}

export const printerService = new BluetoothPrinterService();
