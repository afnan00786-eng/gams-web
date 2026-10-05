import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Generate WhatsApp Share Link
export const generateWhatsAppLink = (text: string) => {
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/?text=${encodedText}`;
};

// Report Generators
export const generateStockReport = (stock: any[]) => {
  let report = "*⛽ Given Agency - Stock Report*\n";
  report += `Date: ${new Date().toLocaleDateString()}\n\n`;

  stock.forEach(item => {
    report += `*${item.type} (${item.weight})*\n`;
    report += `Full: ${item.full} | Empty: ${item.empty} | Defective: ${item.defective}\n`;
    report += "----------------\n";
  });

  return report;
};

export const generateTripReport = (trip: any) => {
  let report = "*🚚 Trip Status Report*\n";
  report += `Vehicle: ${trip.vehicleNo}\n`;
  report += `Driver: ${trip.driverName}\n`;
  report += `Status: ${trip.status}\n`;

  let parsedItems: any[] = [];
  try {
    parsedItems = JSON.parse(trip.stockItems || "[]");
  } catch (e) {
    console.error("Failed to parse trip stock items for report", e);
  }

  if (parsedItems.length > 0) {
    report += `\n*Out:*\n`;
    parsedItems.forEach((item: any) => {
      // Force label to "14.2KG", "19KG", "SURAKSHA", "F.T.L" etc based on type/weight
      let label = item.type;
      if (item.type === 'Domestic') label = '14.2KG';
      if (item.type === 'Commercial') label = '19KG';

      report += `  • ${label} -- ${item.quantity}\n`;
    });
  } else {
    report += `Out: 0 Cylinders\n`;
  }

  if (trip.status === 'COMPLETED' && parsedItems.length > 0) {
    report += `\n*Returns:*\n`;
    parsedItems.forEach((item: any) => {
      let label = item.type;
      if (item.type === 'Domestic') label = '14.2KG';
      if (item.type === 'Commercial') label = '19KG';

      const sold = Math.max(0, (item.quantity || 0) - (item.inFull || 0));
      const nc = item.inNc || 0;
      const refills = Math.max(0, sold - nc);
      const expectedEmpties = refills;
      const actualEmpties = (item.inEmpty || 0) + (item.inDefective || 0);
      const emptyDiff = actualEmpties - expectedEmpties;

      report += `*${label}* (Out: ${item.quantity})\n`;
      report += `  Full Back: ${item.inFull || 0} | Empty: ${item.inEmpty || 0} | Defect: ${item.inDefective || 0} | NC: ${nc}\n`;
      report += `  Refills: ${refills}\n`;
      if (emptyDiff > 0) report += `  ✅ Extra Empty: ${emptyDiff}\n`;
      else if (emptyDiff < 0) report += `  ⚠️ Empty Balance Due: ${Math.abs(emptyDiff)}\n`;
      else report += `  ✅ Empties Settled\n`;

      // Split rates
      if (item.inRefillRates && item.inRefillRates.length > 0) {
        let billingTotal = 0;
        report += `  Billing:\n`;
        item.inRefillRates.forEach((rr: any) => {
          const amt = (rr.qty || 0) * (rr.rate || 0);
          billingTotal += amt;
          report += `    ${rr.qty} x ₹${rr.rate} = ₹${amt.toFixed(2)}\n`;
        });
        if (nc > 0 && item.inNcRate) {
          const ncAmt = nc * (item.inNcRate || 0);
          billingTotal += ncAmt;
          report += `    NC: ${nc} x ₹${item.inNcRate} = ₹${ncAmt.toFixed(2)}\n`;
        }
        report += `  Total Due: ₹${billingTotal.toFixed(2)}\n`;
      }
      report += `----------------\n`;
    });
  }

  report += `\nTime: ${new Date(trip.timeOut).toLocaleTimeString()}`;
  return report;
};

export const generateAccountReport = (name: string, balance: number, type: string) => {
  const status = balance >= 0 ? "Agency owes you" : "You owe Agency";
  return `*💰 Account Statement - ${name}*\n\nType: ${type}\nNet Balance: ${formatCurrency(Math.abs(balance))}\nStatus: ${status}\n\nDate: ${new Date().toLocaleDateString()}`;
};
