use rusqlite::{Connection, Result, OptionalExtension};
use serde::{Deserialize, Serialize};
use csv::{Reader, Writer};
use std::sync::{Arc, Mutex};

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductImportRow {
    pub name: String,
    pub brand: String,
    pub category: String,
    pub subcategory: String,
    pub description: Option<String>,
    pub base_price: f64,
    pub cost_price: f64,
    pub barcode: Option<String>,
    pub size: String,
    pub color: String,
    pub sku: String,
    pub stock_quantity: i32,
    pub price_adjustment: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerImportRow {
    pub name: String,
    pub email: String,
    pub phone: String,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalespersonImportRow {
    pub name: String,
    pub email: String,
    pub phone: String,
    pub commission_rate: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductExportRow {
    pub id: i32,
    pub name: String,
    pub brand: String,
    pub category: String,
    pub subcategory: String,
    pub description: Option<String>,
    pub base_price: f64,
    pub cost_price: f64,
    pub size: String,
    pub color: String,
    pub sku: String,
    pub stock_quantity: i32,
    pub price_adjustment: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerExportRow {
    pub id: i32,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalespersonExportRow {
    pub id: i32,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub commission_rate: f64,
    pub is_active: bool,
    pub created_at: String,
}

pub struct ImportExportService {
    connection: Arc<Mutex<Connection>>,
}

impl ImportExportService {
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self { connection }
    }

        // Export functions
    pub fn export_products_to_csv(&self, file_path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut wtr = Writer::from_path(file_path)?;
        
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT p.id, p.name, p.brand, p.category, p.subcategory, p.description, 
                    p.base_price, p.cost_price, p.created_at,
                    pv.size, pv.color, pv.sku, pv.stock_quantity, pv.price_adjustment
             FROM products p
             LEFT JOIN product_variants pv ON p.id = pv.product_id
             ORDER BY p.id, pv.id"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(ProductExportRow {
                id: row.get(0)?,
                name: row.get(1)?,
                brand: row.get(2)?,
                category: row.get(3)?,
                subcategory: row.get(4)?,
                description: row.get(5)?,
                base_price: row.get(6)?,
                cost_price: row.get(7)?,

                created_at: row.get(8)?,
                size: row.get(9)?,
                color: row.get(10)?,
                sku: row.get(11)?,
                stock_quantity: row.get(12)?,
                price_adjustment: row.get(13)?,
            })
        })?;

        for row in rows {
            wtr.serialize(row?).map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
        }

        wtr.flush()?;
        Ok(())
    }

    pub fn export_customers_to_csv(&self, file_path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut wtr = Writer::from_path(file_path)?;
        
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, name, email, phone, address, city, state, zip_code, notes, created_at 
             FROM customers ORDER BY id"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(CustomerExportRow {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                phone: row.get(3)?,
                address: row.get(4)?,
                city: row.get(5)?,
                state: row.get(6)?,
                zip_code: row.get(7)?,
                notes: row.get(8)?,
                created_at: row.get(9)?,
            })
        })?;

        for row in rows {
            wtr.serialize(row?).map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
        }

        wtr.flush()?;
        Ok(())
    }

    pub fn export_salespersons_to_csv(&self, file_path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut wtr = Writer::from_path(file_path)?;
        
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, name, email, phone, commission_rate, is_active, created_at
             FROM salespersons
             ORDER BY id"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(SalespersonExportRow {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                phone: row.get(3)?,
                commission_rate: row.get(4)?,
                is_active: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?;

        for row in rows {
            let salesperson = row?;
            wtr.serialize(salesperson).map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
        }

        wtr.flush()?;
        Ok(())
    }

    // Import functions
    pub fn import_products_from_csv(&mut self, file_path: &str) -> Result<ImportResult, Box<dyn std::error::Error>> {
        let mut rdr = Reader::from_path(file_path).map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
        let mut success_count = 0;
        let mut error_count = 0;
        let mut errors = Vec::new();

        for (row_num, result) in rdr.deserialize().enumerate() {
            match result {
                Ok(row) => {
                    match self.import_product_row(&row) {
                        Ok(_) => success_count += 1,
                        Err(e) => {
                            error_count += 1;
                            errors.push(format!("Row {}: {}", row_num + 2, e));
                        }
                    }
                }
                Err(e) => {
                    error_count += 1;
                    errors.push(format!("Row {}: Invalid CSV format - {}", row_num + 2, e));
                }
            }
        }

        Ok(ImportResult {
            success_count,
            error_count,
            errors,
        })
    }

    pub fn import_customers_from_csv(&mut self, file_path: &str) -> Result<ImportResult, Box<dyn std::error::Error>> {
        let mut rdr = Reader::from_path(file_path).map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
        let mut success_count = 0;
        let mut error_count = 0;
        let mut errors = Vec::new();

        for (row_num, result) in rdr.deserialize().enumerate() {
            match result {
                Ok(row) => {
                    match self.import_customer_row(&row) {
                        Ok(_) => success_count += 1,
                        Err(e) => {
                            error_count += 1;
                            errors.push(format!("Row {}: {}", row_num + 2, e));
                        }
                    }
                }
                Err(e) => {
                    error_count += 1;
                    errors.push(format!("Row {}: Invalid CSV format - {}", row_num + 2, e));
                }
            }
        }

        Ok(ImportResult {
            success_count,
            error_count,
            errors,
        })
    }

    pub fn import_products_from_csv_content(&mut self, content: &str) -> Result<ImportResult, Box<dyn std::error::Error>> {
        // Debug logging for CSV content received
        println!("=== BACKEND: CSV CONTENT RECEIVED ===");
        println!("Content length: {}", content.len());
        println!("First 500 characters:");
        println!("{}", &content[..content.len().min(500)]);
        
        // Show line-by-line breakdown
        let lines: Vec<&str> = content.lines().collect();
        println!("Total lines: {}", lines.len());
        println!("First 5 lines:");
        for (i, line) in lines.iter().enumerate().take(5) {
            println!("Line {}: (len={}) '{}'", i, line.len(), line);
        }
        println!("=== END BACKEND DEBUG ===");

        let mut rdr = Reader::from_reader(content.as_bytes());
        let mut success_count = 0;
        let mut error_count = 0;
        let mut errors = Vec::new();

        // Debug: Show headers that the CSV parser detected
        let headers = rdr.headers();
        match headers {
            Ok(headers) => {
                println!("CSV headers detected: {:?}", headers);
                println!("Header count: {}", headers.len());
            }
            Err(e) => {
                println!("Error reading CSV headers: {:?}", e);
            }
        }

        for (row_num, result) in rdr.deserialize().enumerate() {
            // Debug: Show what we're trying to deserialize
            if row_num < 3 {
                println!("Attempting to deserialize row {}: {:?}", row_num + 1, result);
            }
            
            match result {
                Ok(row) => {
                    if row_num < 3 {
                        println!("Successfully deserialized row {}: {:?}", row_num + 1, row);
                    }
                    match self.import_product_row(&row) {
                        Ok(_) => success_count += 1,
                        Err(e) => {
                            error_count += 1;
                            errors.push(format!("Row {}: {}", row_num + 2, e));
                        }
                    }
                }
                Err(e) => {
                    error_count += 1;
                    let error_msg = format!("Row {}: Invalid CSV format - {}", row_num + 2, e);
                    println!("CSV parsing error: {}", error_msg);
                    errors.push(error_msg);
                }
            }
        }

        Ok(ImportResult {
            success_count,
            error_count,
            errors,
        })
    }

    pub fn import_customers_from_csv_content(&mut self, content: &str) -> Result<ImportResult, Box<dyn std::error::Error>> {
        let mut rdr = Reader::from_reader(content.as_bytes());
        let mut success_count = 0;
        let mut error_count = 0;
        let mut errors = Vec::new();

        for (row_num, result) in rdr.deserialize().enumerate() {
            match result {
                Ok(row) => {
                    match self.import_customer_row(&row) {
                        Ok(_) => success_count += 1,
                        Err(e) => {
                            error_count += 1;
                            errors.push(format!("Row {}: {}", row_num + 2, e));
                        }
                    }
                }
                Err(e) => {
                    error_count += 1;
                    errors.push(format!("Row {}: Invalid CSV format - {}", row_num + 2, e));
                }
            }
        }

        Ok(ImportResult {
            success_count,
            error_count,
            errors,
        })
    }

    pub fn import_salespersons_from_csv(&mut self, file_path: &str) -> Result<ImportResult, Box<dyn std::error::Error>> {
        let mut rdr = Reader::from_path(file_path).map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;
        let mut success_count = 0;
        let mut error_count = 0;
        let mut errors = Vec::new();

        for (row_num, result) in rdr.deserialize().enumerate() {
            match result {
                Ok(row) => {
                    match self.import_salesperson_row(&row) {
                        Ok(_) => success_count += 1,
                        Err(e) => {
                            error_count += 1;
                            errors.push(format!("Row {}: {}", row_num + 2, e));
                        }
                    }
                }
                Err(e) => {
                    error_count += 1;
                    errors.push(format!("Row {}: Invalid CSV format - {}", row_num + 2, e));
                }
            }
        }

        Ok(ImportResult {
            success_count,
            error_count,
            errors,
        })
    }

    pub fn import_salespersons_from_csv_content(&mut self, content: &str) -> Result<ImportResult, Box<dyn std::error::Error>> {
        let mut rdr = Reader::from_reader(content.as_bytes());
        let mut success_count = 0;
        let mut error_count = 0;
        let mut errors = Vec::new();

        for (row_num, result) in rdr.deserialize().enumerate() {
            match result {
                Ok(row) => {
                    match self.import_salesperson_row(&row) {
                        Ok(_) => success_count += 1,
                        Err(e) => {
                            error_count += 1;
                            errors.push(format!("Row {}: {}", row_num + 2, e));
                        }
                    }
                }
                Err(e) => {
                    error_count += 1;
                    errors.push(format!("Row {}: Invalid CSV format - {}", row_num + 2, e));
                }
            }
        }

        Ok(ImportResult {
            success_count,
            error_count,
            errors,
        })
    }

    // Helper functions
    fn import_product_row(&mut self, row: &ProductImportRow) -> Result<()> {
        let mut connection = self.connection.lock().unwrap();
        let tx = connection.transaction()?;

        // Check if product already exists (by name, brand, category, subcategory)
        let existing_product: Option<i32> = tx.query_row(
            "SELECT id FROM products WHERE name = ? AND brand = ? AND category = ? AND subcategory = ?",
            rusqlite::params![row.name, row.brand, row.category, row.subcategory],
            |row| row.get(0)
        ).optional()?;

        let product_id = if let Some(id) = existing_product {
            id
        } else {
            // Insert new product
            tx.execute(
                "INSERT INTO products (name, brand, category, subcategory, description, base_price, cost_price) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                rusqlite::params![
                    row.name,
                    row.brand,
                    row.category,
                    row.subcategory,
                    row.description,
                    row.base_price,
                    row.cost_price,
                ],
            )?;
            tx.last_insert_rowid() as i32
        };

        // Use provided SKU or generate one automatically
        let sku = if !row.sku.is_empty() {
            row.sku.clone()
        } else {
            format!("{}-{}-{}", 
                row.name.replace(" ", "").to_uppercase(),
                row.size.to_uppercase(),
                row.color.to_uppercase()
            )
        };

        // Check if variant already exists (by product_id, size, color)
        let existing_variant: Option<i32> = tx.query_row(
            "SELECT id FROM product_variants WHERE product_id = ? AND size = ? AND color = ?",
            rusqlite::params![product_id, row.size, row.color],
            |row| row.get(0)
        ).optional()?;

        if existing_variant.is_none() {
            // Insert product variant
            tx.execute(
                "INSERT INTO product_variants (product_id, size, color, sku, stock_quantity, price_adjustment) 
                 VALUES (?, ?, ?, ?, ?, ?)",
                rusqlite::params![
                    product_id,
                    row.size,
                    row.color,
                    sku,
                    row.stock_quantity,
                    row.price_adjustment,
                ],
            )?;
        } else {
            // Update existing variant's stock and price adjustment
            tx.execute(
                "UPDATE product_variants SET stock_quantity = ?, price_adjustment = ? WHERE product_id = ? AND size = ? AND color = ?",
                rusqlite::params![
                    row.stock_quantity,
                    row.price_adjustment,
                    product_id,
                    row.size,
                    row.color,
                ],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    fn import_customer_row(&self, row: &CustomerImportRow) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        connection.execute(
            "INSERT INTO customers (name, email, phone, address, city, state, zip_code, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![
                row.name,
                row.email,
                row.phone,
                row.address,
                row.city,
                row.state,
                row.zip_code,
                row.notes,
            ],
        )?;
        Ok(())
    }

    fn import_salesperson_row(&self, row: &SalespersonImportRow) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        
        // First create a default user for the salesperson
        let _user_id = connection.execute(
            "INSERT INTO users (username, password_hash, role, name) 
             VALUES (?, ?, ?, ?)",
            rusqlite::params![
                format!("salesperson_{}", row.name.to_lowercase().replace(" ", "_")),
                "default_password_hash", // This should be changed by the user later
                "cashier",
                row.name,
            ],
        )?;
        
        let user_id = connection.last_insert_rowid() as i32;
        
        // Then create the salesperson
        connection.execute(
            "INSERT INTO salespersons (user_id, name, email, phone, commission_rate) 
             VALUES (?, ?, ?, ?, ?)",
            rusqlite::params![
                user_id,
                row.name,
                row.email,
                row.phone,
                row.commission_rate,
            ],
        )?;
        Ok(())
    }

    // Template generation
    pub fn generate_product_template(&self, file_path: &str) -> Result<(), Box<dyn std::error::Error>> {
        println!("🔧 Starting template generation for path: {}", file_path);
        
        // Check if parent directory exists
        if let Some(parent) = std::path::Path::new(file_path).parent() {
            println!("📂 Parent directory: {}", parent.display());
            if !parent.exists() {
                println!("❌ Parent directory does not exist!");
                return Err("Parent directory does not exist".into());
            } else {
                println!("✅ Parent directory exists");
            }
        }
        
        println!("📝 Creating CSV writer...");
        let mut wtr = Writer::from_path(file_path)
            .map_err(|e| {
                println!("❌ Failed to create CSV writer: {}", e);
                e
            })?;
        println!("✅ CSV writer created successfully");
        
        // Write header row (each row represents a product variant)
        wtr.serialize(ProductImportRow {
            name: "Product Name".to_string(),
            brand: "Brand".to_string(),
            category: "Category".to_string(),
            subcategory: "Subcategory".to_string(),
            description: Some("Description (optional)".to_string()),
            base_price: 0.0,
            cost_price: 0.0,
            barcode: Some("Barcode (optional)".to_string()),
            size: "Size".to_string(),
            color: "Color".to_string(),
            sku: "SKU".to_string(),
            stock_quantity: 0,
            price_adjustment: 0.0,
        })?;

        // Write example rows showing multiple variants for the same product
        // Note: Multiple rows with the same product name will create variants of that product
        let examples = vec![
            ProductImportRow {
                name: "Cotton T-Shirt".to_string(),
                brand: "Fashion Brand".to_string(),
                category: "Clothing".to_string(),
                subcategory: "T-Shirts".to_string(),
                description: Some("Comfortable cotton t-shirt".to_string()),
                base_price: 500.0,
                cost_price: 300.0,
                barcode: Some("1234567890123".to_string()),
                size: "S".to_string(),
                color: "Blue".to_string(),
                sku: "TSHIRT-S-BLUE".to_string(),
                stock_quantity: 25,
                price_adjustment: 0.0,
            },
            ProductImportRow {
                name: "Cotton T-Shirt".to_string(),
                brand: "Fashion Brand".to_string(),
                category: "Clothing".to_string(),
                subcategory: "T-Shirts".to_string(),
                description: Some("Comfortable cotton t-shirt".to_string()),
                base_price: 500.0,
                cost_price: 300.0,
                barcode: Some("1234567890124".to_string()),
                size: "M".to_string(),
                color: "Blue".to_string(),
                sku: "TSHIRT-M-BLUE".to_string(),
                stock_quantity: 30,
                price_adjustment: 0.0,
            },
            ProductImportRow {
                name: "Cotton T-Shirt".to_string(),
                brand: "Fashion Brand".to_string(),
                category: "Clothing".to_string(),
                subcategory: "T-Shirts".to_string(),
                description: Some("Comfortable cotton t-shirt".to_string()),
                base_price: 500.0,
                cost_price: 300.0,
                barcode: Some("1234567890125".to_string()),
                size: "L".to_string(),
                color: "Red".to_string(),
                sku: "TSHIRT-L-RED".to_string(),
                stock_quantity: 20,
                price_adjustment: 50.0,
            },
        ];

        println!("📊 Writing {} example rows...", examples.len());
        for (i, example) in examples.iter().enumerate() {
            println!("✏️ Writing example row {}", i + 1);
            wtr.serialize(example)?;
        }

        println!("💾 Flushing CSV writer...");
        wtr.flush()?;
        println!("✅ Template generation completed successfully!");
        Ok(())
    }

    pub fn generate_customer_template(&self, file_path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut wtr = Writer::from_path(file_path)?;
        
        // Write header row
        wtr.serialize(CustomerImportRow {
            name: "Customer Name".to_string(),
            email: "email@example.com".to_string(),
            phone: "+91 98765 43210".to_string(),
            address: Some("Address (optional)".to_string()),
            city: Some("City (optional)".to_string()),
            state: Some("State (optional)".to_string()),
            zip_code: Some("123456 (optional)".to_string()),
            notes: Some("Notes (optional)".to_string()),
        }).map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;

        // Write example row
        wtr.serialize(CustomerImportRow {
            name: "John Doe".to_string(),
            email: "john.doe@example.com".to_string(),
            phone: "+91 98765 43210".to_string(),
            address: Some("123 Main Street".to_string()),
            city: Some("Mumbai".to_string()),
            state: Some("Maharashtra".to_string()),
            zip_code: Some("400001".to_string()),
            notes: Some("VIP Customer".to_string()),
        }).map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;

        wtr.flush()?;
        Ok(())
    }

    pub fn generate_salesperson_template(&self, file_path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut wtr = Writer::from_path(file_path)?;
        
        // Write header row
        wtr.serialize(SalespersonImportRow {
            name: "Salesperson Name".to_string(),
            email: "email@example.com".to_string(),
            phone: "+91 98765 43210".to_string(),
            commission_rate: 5.0,
        }).map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?;

        // Write example rows
        let examples = vec![
            SalespersonImportRow {
                name: "John Smith".to_string(),
                email: "john.smith@store.com".to_string(),
                phone: "+91 98765 43210".to_string(),
                commission_rate: 5.0,
            },
            SalespersonImportRow {
                name: "Sarah Johnson".to_string(),
                email: "sarah.johnson@store.com".to_string(),
                phone: "+91 98765 43211".to_string(),
                commission_rate: 7.5,
            },
            SalespersonImportRow {
                name: "Mike Wilson".to_string(),
                email: "mike.wilson@store.com".to_string(),
                phone: "+91 98765 43212".to_string(),
                commission_rate: 6.0,
            },
        ];

        for example in examples {
            wtr.serialize(example)?;
        }

        wtr.flush()?;
        Ok(())
    }
}

#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub success_count: usize,
    pub error_count: usize,
    pub errors: Vec<String>,
} 