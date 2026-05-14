import { Transaction, StoreSettings, Product } from '../types';
import { formatCurrency } from './utils';
import { format } from 'date-fns';

export class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async connect(settings: StoreSettings) {
    try {
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

  async printBarcodes(products: Product[], quantity: number, settings: StoreSettings, paperSize: '48' | '58' | '80' = '58') {
    if (!this.characteristic) {
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
        data += center + product.name.toUpperCase().substring(0, maxChars) + feed;
        data += barcodeHeight + barcodeWidth + barcodeTextPos;
        // ESC/POS GS k m n d1...dn (m=73 is CODE128)
        // For CODE128, data must start with {code set select string}
        // Simplified version: use type 4 for CODE39 or similar if 128 is complex
        // Most thermal printers support type 2 (CODE39) readily
        data += `\x1D\x6B\x04${sku}\x00`; 
        data += feed + `RP ${product.price.toLocaleString('id-ID')}` + feed + feed;
        data += '-'.repeat(maxChars) + feed + feed;
      }
    }

    data += feed + feed + feed + cut;

    const encodedData = encoder.encode(data);
    const chunkSize = 100;
    for (let i = 0; i < encodedData.length; i += chunkSize) {
      const chunk = encodedData.slice(i, i + chunkSize);
      try {
        await this.characteristic!.writeValue(chunk);
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        console.error('Print barcode chunk error:', err);
        throw new Error('Gagal mengirim data ke printer');
      }
    }
  }

  async printReceipt(transaction: Transaction, settings: StoreSettings, paperSize: '48' | '58' | '80' = '58') {
    if (!this.characteristic) {
      const connected = await this.connect(settings);
      if (!connected) throw new Error('Could not connect to printer');
    }

    const encoder = new TextEncoder();
    
    // Config based on paper size
    const widthMap = {
      '48': 24,
      '58': 32,
      '80': 48
    };
    const maxChars = widthMap[paperSize];
    const itemWidth = Math.floor(maxChars * 0.6);
    const priceWidth = maxChars - itemWidth;

    // ESC/POS Commands
    const init = '\x1B\x40';
    const center = '\x1B\x61\x01';
    const left = '\x1B\x61\x00';
    const boldOn = '\x1B\x45\x01';
    const boldOff = '\x1B\x45\x00';
    const feed = '\x0A';
    const cut = '\x1D\x56\x00';

    let data = '';
    data += init;
    data += center + boldOn + settings.name.toUpperCase() + feed + boldOff;
    data += settings.address + feed;
    data += 'Tlp: ' + settings.phone + feed;
    data += '-'.repeat(maxChars) + feed;
    data += left;
    data += 'No  : ' + transaction.id.slice(-8) + feed;
    data += 'Tgl : ' + format(transaction.timestamp, 'dd/MM/yy HH:mm') + feed;
    data += 'Kasir: ' + (transaction.paymentDetails?.cashierName || 'Admin') + feed;
    data += '-'.repeat(maxChars) + feed;

    transaction.items.forEach(item => {
      // Split name if too long
      const name = item.name.toUpperCase();
      if (name.length > maxChars) {
        data += name.substring(0, maxChars) + feed;
        data += `  ${item.quantity} x ${formatCurrency(item.price)}`.padEnd(itemWidth) + 
                formatCurrency(item.price * item.quantity).padStart(priceWidth) + feed;
      } else {
        data += name.padEnd(maxChars) + feed;
        data += `  ${item.quantity} x ${formatCurrency(item.price)}`.padEnd(itemWidth) + 
                formatCurrency(item.price * item.quantity).padStart(priceWidth) + feed;
      }
    });

    data += '-'.repeat(maxChars) + feed;
    data += `SUBTOTAL:`.padEnd(itemWidth) + formatCurrency(transaction.subtotal).padStart(priceWidth) + feed;
    data += `PAJAK (${settings.taxRate}%):`.padEnd(itemWidth) + formatCurrency(transaction.tax).padStart(priceWidth) + feed;
    data += boldOn + `TOTAL:`.padEnd(itemWidth) + formatCurrency(transaction.total).padStart(priceWidth) + boldOff + feed;
    data += '-'.repeat(maxChars) + feed;
    data += `BAYARvia${transaction.paymentMethod}:`.padEnd(itemWidth) + formatCurrency(transaction.amountPaid).padStart(priceWidth) + feed;
    data += `KEMBALI:`.padEnd(itemWidth) + formatCurrency(transaction.change).padStart(priceWidth) + feed;
    data += feed + center + settings.footerMessage + feed + feed + feed + cut;

    // Send data in chunks (some printers have small buffers)
    const encodedData = encoder.encode(data);
    const chunkSize = 100; // Increased chunk size for efficiency
    for (let i = 0; i < encodedData.length; i += chunkSize) {
      const chunk = encodedData.slice(i, i + chunkSize);
      try {
        await this.characteristic!.writeValue(chunk);
        // Small delay to prevent overwhelming the printer buffer
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        console.error('Print chunk error:', err);
        throw new Error('Gagal mengirim data ke printer');
      }
    }
  }
}

export const printerService = new BluetoothPrinterService();
