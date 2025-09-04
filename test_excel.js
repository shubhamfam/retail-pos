const XLSX = require('xlsx');
const fs = require('fs');

// Create a test Excel file with known good data to test our approach
const testData = [
  ['name', 'brand', 'category', 'subcategory', 'description', 'base_price', 'cost_price', 'size', 'color', 'stock_quantity'],
  ['Cotton T-Shirt', 'Fashion Brand', 'Clothing', 'T-Shirts', 'Comfortable cotton t-shirt', 500, 300, 'S', 'Blue', 25],
  ['Cotton T-Shirt', 'Fashion Brand', 'Clothing', 'T-Shirts', 'Comfortable cotton t-shirt', 500, 300, 'M', 'Blue', 30],
  ['Premium Polo', 'Elite Wear', 'Clothing', 'Polo Shirts', 'Classic polo shirt', 800, 500, 'S', 'White', 15]
];

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(testData);
XLSX.utils.book_append_sheet(wb, ws, 'products_template');

// Write test file
XLSX.writeFile(wb, 'test_products.xlsx');

// Now test reading it back
console.log('Testing Excel reading...');

const data = fs.readFileSync('test_products.xlsx');
const workbook = XLSX.read(data);
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

// Convert directly to CSV
const csvContent = XLSX.utils.sheet_to_csv(firstSheet);

console.log('Generated CSV:');
console.log(csvContent);

console.log('\nCSV Lines:');
const lines = csvContent.split('\n').filter(line => line.trim());
lines.forEach((line, i) => {
  console.log(`Line ${i}: ${line}`);
  console.log(`Field count: ${line.split(',').length}`);
});

// Test the header standardization logic
const headerLine = lines[0];
const dataLines = lines.slice(1);
const expectedHeader = 'name,brand,category,subcategory,description,base_price,cost_price,size,color,stock_quantity';

console.log('\nHeader check:');
console.log('Original header:', headerLine);
console.log('Expected header:', expectedHeader);
console.log('Contains name?', headerLine.toLowerCase().includes('name'));
console.log('Contains brand?', headerLine.toLowerCase().includes('brand'));
console.log('Contains category?', headerLine.toLowerCase().includes('category'));

if (headerLine.toLowerCase().includes('name') && 
    headerLine.toLowerCase().includes('brand') && 
    headerLine.toLowerCase().includes('category')) {
  const finalCsvContent = expectedHeader + '\n' + dataLines.join('\n');
  console.log('\nFinal CSV after header standardization:');
  console.log(finalCsvContent);
}
