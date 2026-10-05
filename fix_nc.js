const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/trip-log/page.tsx', 'utf8');
// Replace line 49: ncRate: number; -> ncRates: { id: string; qty: number; rate: number }[];
const before = c;
c = c.replace('        ncRate: number;', '        ncRates: { id: string; qty: number; rate: number }[];');
if (c === before) {
    console.log('NO MATCH FOUND - dumping lines 42-55:');
    c.split('\n').slice(41, 55).forEach((l, i) => console.log(42 + i, JSON.stringify(l)));
} else {
    fs.writeFileSync('src/app/dashboard/trip-log/page.tsx', c);
    console.log('Fixed!');
}
