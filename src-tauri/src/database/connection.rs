use rusqlite::{Connection, Result, params, OptionalExtension};
use std::sync::{Arc, Mutex};
use crate::database::models::*;

pub struct ProductService {
    connection: Arc<Mutex<Connection>>,
}

impl ProductService {
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self { connection }
    }

    pub fn get_all_products(&self) -> Result<Vec<Product>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT p.id, p.name, p.brand, p.category, p.subcategory, p.description, 
                    p.base_price, p.cost_price, p.barcode, p.created_at, p.updated_at,
                    COUNT(pv.id) as variant_count,
                    COALESCE(SUM(pv.stock_quantity), 0) as total_stock
             FROM products p
             LEFT JOIN product_variants pv ON p.id = pv.product_id
             GROUP BY p.id, p.name, p.brand, p.category, p.subcategory, p.description, 
                      p.base_price, p.cost_price, p.barcode, p.created_at, p.updated_at
             ORDER BY p.name"
        )?;
        
        let products = stmt.query_map([], |row| {
            let mut product = Product::from_row(row)?;
            // Add variant count and total stock to the product object
            // Note: We'll need to modify the Product struct to include these fields
            Ok(product)
        })?
        .collect::<Result<Vec<_>>>()?;
        
        Ok(products)
    }

    pub fn get_product_by_id(&self, id: i32) -> Result<Option<Product>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, name, brand, category, subcategory, description, base_price, cost_price, barcode, created_at, updated_at FROM products WHERE id = ?"
        )?;
        
        let mut rows = stmt.query_map([id], |row| Product::from_row(row))?;
        
        if let Some(row) = rows.next() {
            Ok(Some(row?))
        } else {
            Ok(None)
        }
    }

    pub fn create_product(&self, product: &Product) -> Result<i32> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "INSERT INTO products (name, brand, category, subcategory, description, base_price, cost_price, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )?;
        
        let id = stmt.insert(params![
            product.name,
            product.brand,
            product.category,
            product.subcategory,
            product.description,
            product.base_price,
            product.cost_price,
            product.barcode,
        ])?;
        
        Ok(id as i32)
    }

    pub fn update_product(&self, product: &Product) -> Result<()> {
        if let Some(id) = product.id {
            let connection = self.connection.lock().unwrap();
            let mut stmt = connection.prepare(
                "UPDATE products SET name = ?, brand = ?, category = ?, subcategory = ?, description = ?, base_price = ?, cost_price = ?, barcode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            )?;
            
            stmt.execute(params![
                product.name,
                product.brand,
                product.category,
                product.subcategory,
                product.description,
                product.base_price,
                product.cost_price,
                product.barcode,
                id,
            ])?;
        }
        
        Ok(())
    }

    pub fn delete_product(&self, id: i32) -> Result<()> {
        println!("Database: Deleting product with ID: {}", id);
        let connection = self.connection.lock().unwrap();
        let rows_affected = connection.execute("DELETE FROM products WHERE id = ?", [id])?;
        println!("Database: Deleted {} rows", rows_affected);
        Ok(())
    }

    pub fn get_product_variants(&self, product_id: i32) -> Result<Vec<ProductVariant>> {
        println!("get_product_variants: Starting for product_id: {}", product_id);
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, product_id, size, color, sku, stock_quantity, price_adjustment, image_url FROM product_variants WHERE product_id = ? ORDER BY size, color"
        )?;
        
        println!("get_product_variants: Prepared statement, executing query...");
        let variants = stmt.query_map([product_id], |row| {
            println!("get_product_variants: Processing row...");
            ProductVariant::from_row(row)
        })?
        .collect::<Result<Vec<_>>>()?;
        
        println!("get_product_variants: Found {} variants", variants.len());
        Ok(variants)
    }

    pub fn create_product_variant(&self, variant: &ProductVariant) -> Result<i32> {
        println!("create_product_variant: Starting for variant: {:?}", variant);
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "INSERT INTO product_variants (product_id, size, color, sku, stock_quantity, price_adjustment, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )?;
        
        println!("create_product_variant: Prepared statement, inserting...");
        let id = stmt.insert(params![
            variant.product_id,
            variant.size,
            variant.color,
            variant.sku,
            variant.stock_quantity,
            variant.price_adjustment,
            variant.image_url,
        ])?;
        
        println!("create_product_variant: Inserted successfully with ID: {}", id);
        Ok(id as i32)
    }

    pub fn get_or_create_default_variant(&self, product_id: i32) -> Result<i32> {
        println!("get_or_create_default_variant: Starting for product_id: {}", product_id);
        let connection = self.connection.lock().unwrap();
        
        // Check if a default variant already exists for this product
        println!("get_or_create_default_variant: Checking if variant exists...");
        let variant_exists: bool = connection
            .query_row(
                "SELECT COUNT(*) FROM product_variants WHERE product_id = ?",
                [product_id],
                |row| row.get(0),
            )
            .unwrap_or(false);

        println!("get_or_create_default_variant: Variant exists: {}", variant_exists);

        if variant_exists {
            // Return existing variant ID
            println!("get_or_create_default_variant: Getting existing variant ID...");
            let variant_id: i32 = connection
                .query_row(
                    "SELECT id FROM product_variants WHERE product_id = ? LIMIT 1",
                    [product_id],
                    |row| row.get(0),
                )?;
            println!("get_or_create_default_variant: Found existing variant ID: {}", variant_id);
            return Ok(variant_id);
        }

        // Create default variant
        println!("get_or_create_default_variant: Creating default variant...");
        let default_variant = ProductVariant {
            id: None,
            product_id,
            size: "Default".to_string(),
            color: "Default".to_string(),
            sku: format!("{}-DEFAULT", product_id),
            stock_quantity: 0,
            price_adjustment: 0.0,
            image_url: None,
        };

        println!("get_or_create_default_variant: Calling create_product_variant...");
        let result = self.create_product_variant(&default_variant);
        println!("get_or_create_default_variant: create_product_variant result: {:?}", result);
        result
    }

    pub fn update_stock_quantity(&self, variant_id: i32, quantity: i32) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        connection.execute(
            "UPDATE product_variants SET stock_quantity = ? WHERE id = ?",
            [quantity, variant_id]
        )?;
        Ok(())
    }

    pub fn get_low_stock_items(&self, threshold: i32) -> Result<Vec<ProductVariant>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, product_id, size, color, sku, stock_quantity, price_adjustment, image_url FROM product_variants WHERE stock_quantity <= ? ORDER BY stock_quantity ASC"
        )?;
        
        let variants = stmt.query_map([threshold], |row| ProductVariant::from_row(row))?
            .collect::<Result<Vec<_>>>()?;
        
        Ok(variants)
    }

    pub fn get_out_of_stock_items(&self) -> Result<Vec<ProductVariant>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, product_id, size, color, sku, stock_quantity, price_adjustment, image_url FROM product_variants WHERE stock_quantity = 0 ORDER BY sku ASC"
        )?;
        
        let variants = stmt.query_map([], |row| ProductVariant::from_row(row))?
            .collect::<Result<Vec<_>>>()?;
        
        Ok(variants)
    }

    pub fn adjust_stock_quantity(&self, variant_id: i32, adjustment: i32) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        connection.execute(
            "UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?",
            [adjustment, variant_id]
        )?;
        Ok(())
    }

    // Product Variant Management
    pub fn update_product_variant(&self, variant_id: i32, variant: &ProductVariant) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        connection.execute(
            "UPDATE product_variants SET size = ?, color = ?, sku = ?, stock_quantity = ?, price_adjustment = ?, image_url = ? WHERE id = ?",
            [
                &variant.size,
                &variant.color,
                &variant.sku,
                &variant.stock_quantity.to_string(),
                &variant.price_adjustment.to_string(),
                variant.image_url.as_deref().unwrap_or(""),
                &variant_id.to_string()
            ]
        )?;
        Ok(())
    }

    pub fn delete_product_variant(&self, variant_id: i32) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        connection.execute(
            "DELETE FROM product_variants WHERE id = ?",
            [variant_id]
        )?;
        Ok(())
    }
}

pub struct CustomerService {
    connection: Arc<Mutex<Connection>>,
}

impl CustomerService {
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self { connection }
    }

    pub fn get_all_customers(&self) -> Result<Vec<Customer>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, name, email, phone, address, city, state, zip_code, notes, created_at, updated_at FROM customers ORDER BY name"
        )?;
        
        let customers = stmt.query_map([], |row| Customer::from_row(row))?
            .collect::<Result<Vec<_>>>()?;
        
        Ok(customers)
    }

    pub fn create_customer(&self, customer: &Customer) -> Result<Customer> {
        let connection = self.connection.lock().unwrap();
        let now = chrono::Utc::now().naive_utc();
        
        let id = connection.execute(
            "INSERT INTO customers (name, email, phone, address, city, state, zip_code, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                &customer.name,
                &customer.email,
                &customer.phone,
                &customer.address.as_deref().unwrap_or("").to_string(),
                &customer.city.as_deref().unwrap_or("").to_string(),
                &customer.state.as_deref().unwrap_or("").to_string(),
                &customer.zip_code.as_deref().unwrap_or("").to_string(),
                &customer.notes.as_deref().unwrap_or("").to_string(),
                &now.to_string(),
                &now.to_string(),
            ],
        )?;

        let customer = Customer {
            id: Some(id as i32),
            name: customer.name.clone(),
            email: customer.email.clone(),
            phone: customer.phone.clone(),
            address: customer.address.clone(),
            city: customer.city.clone(),
            state: customer.state.clone(),
            zip_code: customer.zip_code.clone(),
            notes: customer.notes.clone(),
            created_at: Some(now.to_string()),
            updated_at: Some(now.to_string()),
        };

        println!("Customer created successfully: {:?}", customer);
        Ok(customer)
    }

    pub fn update_customer(&self, id: i32, customer: &Customer) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        let now = chrono::Utc::now().naive_utc();
        
        connection.execute(
            "UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, zip_code = ?, notes = ?, updated_at = ? WHERE id = ?",
            [
                &customer.name,
                &customer.email,
                &customer.phone,
                &customer.address.as_deref().unwrap_or("").to_string(),
                &customer.city.as_deref().unwrap_or("").to_string(),
                &customer.state.as_deref().unwrap_or("").to_string(),
                &customer.zip_code.as_deref().unwrap_or("").to_string(),
                &customer.notes.as_deref().unwrap_or("").to_string(),
                &now.to_string(),
                &id.to_string(),
            ],
        )?;

        println!("Customer updated successfully: {}", id);
        Ok(())
    }

    pub fn delete_customer(&self, id: i32) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        connection.execute("DELETE FROM customers WHERE id = ?", [id])?;
        println!("Customer deleted successfully: {}", id);
        Ok(())
    }
}

pub struct SaleService {
    connection: Arc<Mutex<Connection>>,
}

impl SaleService {
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self { connection }
    }

    pub fn create_sale(
        &self,
        conn: &Connection,
        customer_id: Option<i32>,
        user_id: i32,
        salesperson_id: Option<i32>,
        total_amount: f64,
        tax_amount: f64,
        discount_amount: f64,
        payment_method: String,
        status: String,
    ) -> Result<Sale, rusqlite::Error> {
        println!("SaleService.create_sale: Starting...");
        println!("SaleService.create_sale: Using provided database connection");
        
        // Check if sales table exists
        let table_exists: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sales'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);
        println!("SaleService.create_sale: Sales table exists: {}", table_exists);
        
        if !table_exists {
            return Err(rusqlite::Error::InvalidParameterName("Sales table does not exist".to_string()));
        }
        
        // Build dynamic SQL based on whether customer_id and salesperson_id are provided
        let mut sql = String::from(
            "INSERT INTO sales (customer_id, user_id, salesperson_id, total_amount, tax_amount, discount_amount, payment_method, status) VALUES ("
        );
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        
        // Add customer_id
        if let Some(cid) = customer_id {
            sql.push_str("?, ");
            params.push(Box::new(cid));
        } else {
            sql.push_str("NULL, ");
        }
        
        // Add user_id
        sql.push_str("?, ");
        params.push(Box::new(user_id));
        
        // Add salesperson_id
        if let Some(sid) = salesperson_id {
            sql.push_str("?, ");
            params.push(Box::new(sid));
        } else {
            sql.push_str("NULL, ");
        }
        
        // Add remaining fields
        sql.push_str("?, ?, ?, ?, ?)");
        params.push(Box::new(total_amount));
        params.push(Box::new(tax_amount));
        params.push(Box::new(discount_amount));
        params.push(Box::new(payment_method.clone()));
        params.push(Box::new(status.clone()));
        
        println!("SaleService.create_sale: About to execute SQL: {}", sql);
        conn.execute(&sql, rusqlite::params_from_iter(params.iter().map(|p| p.as_ref())))?;
        println!("SaleService.create_sale: SQL executed successfully");
        
        let id = conn.last_insert_rowid() as i32;
        println!("SaleService.create_sale: Sale created with ID: {}", id);
        
        Ok(Sale {
            id,
            customer_id,
            user_id,
            salesperson_id,
            total_amount,
            tax_amount,
            discount_amount,
            payment_method,
            status,
            created_at: chrono::Utc::now().to_rfc3339(),
        })
    }

    pub fn create_sale_item(&self, conn: &Connection, sale_item: &SaleItem) -> Result<i32> {
        println!("SaleService.create_sale_item: Starting...");
        println!("SaleService.create_sale_item: Using provided database connection");
        
        println!("SaleService.create_sale_item: About to prepare statement...");
        let mut stmt = conn.prepare(
            "INSERT INTO sale_items (sale_id, product_variant_id, quantity, unit_price, discount, total) VALUES (?, ?, ?, ?, ?, ?)"
        )?;
        println!("SaleService.create_sale_item: Statement prepared successfully");
        
        println!("SaleService.create_sale_item: About to insert with params: sale_id={}, product_variant_id={}, quantity={}, unit_price={}, discount={}, total={}", 
                 sale_item.sale_id, sale_item.product_variant_id, sale_item.quantity, sale_item.unit_price, sale_item.discount, sale_item.total);
        
        let id = stmt.insert(params![
            sale_item.sale_id,
            sale_item.product_variant_id,
            sale_item.quantity,
            sale_item.unit_price,
            sale_item.discount,
            sale_item.total,
        ])?;
        
        println!("SaleService.create_sale_item: Insert completed, ID: {}", id);
        Ok(id as i32)
    }

    pub fn get_recent_sales(&self, limit: i32) -> Result<Vec<Sale>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, customer_id, user_id, salesperson_id, total_amount, tax_amount, discount_amount, payment_method, status, created_at FROM sales ORDER BY created_at DESC LIMIT ?"
        )?;
        
        let sales = stmt.query_map([limit], |row| Sale::from_row(row))?
            .collect::<Result<Vec<_>>>()?;
        
        Ok(sales)
    }

    pub fn get_today_sales(&self) -> Result<Vec<Sale>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, customer_id, user_id, salesperson_id, total_amount, tax_amount, discount_amount, payment_method, status, created_at FROM sales WHERE DATE(created_at) = DATE('now') ORDER BY created_at DESC"
        )?;
        
        let sales = stmt.query_map([], |row| Sale::from_row(row))?
            .collect::<Result<Vec<_>>>()?;
        
        Ok(sales)
    }

    pub fn get_sale_items(&self, sale_id: i32) -> Result<Vec<SaleItem>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, sale_id, product_variant_id, quantity, unit_price, discount, total FROM sale_items WHERE sale_id = ?"
        )?;
        
        let sale_items = stmt.query_map([sale_id], |row| SaleItem::from_row(row))?
            .collect::<Result<Vec<_>>>()?;
        
        Ok(sale_items)
    }
} 

pub struct UserService {
    connection: Arc<Mutex<Connection>>,
}

impl UserService {
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self { connection }
    }

    pub fn create_default_user(&self) -> Result<i32> {
        let connection = self.connection.lock().unwrap();
        
        // Check if default user already exists
        let user_exists: bool = connection
            .query_row(
                "SELECT COUNT(*) FROM users WHERE username = 'admin'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if user_exists {
            // Return existing user ID
            let user_id: i32 = connection
                .query_row(
                    "SELECT id FROM users WHERE username = 'admin'",
                    [],
                    |row| row.get(0),
                )?;
            return Ok(user_id);
        }

        // Create default user
        let mut stmt = connection.prepare(
            "INSERT INTO users (username, password_hash, role, name) VALUES (?, ?, ?, ?)"
        )?;
        
        let id = stmt.insert(params![
            "admin",
            "default_password_hash", // TODO: Implement proper password hashing
            "admin",
            "Administrator"
        ])?;
        
        println!("Default user created with ID: {}", id);
        Ok(id as i32)
    }

    pub fn get_user_by_id(&self, id: i32) -> Result<Option<User>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, username, password_hash, role, name, created_at, last_login FROM users WHERE id = ?"
        )?;
        
        let user = stmt.query_row([id], |row| User::from_row(row))
            .optional()?;
        
        Ok(user)
    }
} 

pub struct SalespersonService;

impl SalespersonService {
    pub fn create_salesperson(
        conn: &Connection,
        user_id: i32,
        name: String,
        email: Option<String>,
        phone: Option<String>,
        commission_rate: f64,
    ) -> Result<Salesperson, rusqlite::Error> {
        conn.execute(
            "INSERT INTO salespersons (user_id, name, email, phone, commission_rate) VALUES (?, ?, ?, ?, ?)",
            rusqlite::params![user_id, name, email, phone, commission_rate],
        )?;

        let id = conn.last_insert_rowid() as i32;
        Self::get_salesperson_by_id(conn, id)
    }

    pub fn get_salesperson_by_id(conn: &Connection, id: i32) -> Result<Salesperson, rusqlite::Error> {
        conn.query_row(
            "SELECT id, user_id, name, email, phone, commission_rate, is_active, created_at, updated_at FROM salespersons WHERE id = ?",
            rusqlite::params![id],
            |row| {
                Ok(Salesperson {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    name: row.get(2)?,
                    email: row.get(3)?,
                    phone: row.get(4)?,
                    commission_rate: row.get(5)?,
                    is_active: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
    }

    pub fn get_all_salespersons(conn: &Connection) -> Result<Vec<Salesperson>, rusqlite::Error> {
        let mut stmt = conn.prepare(
            "SELECT id, user_id, name, email, phone, commission_rate, is_active, created_at, updated_at FROM salespersons WHERE is_active = 1 ORDER BY name"
        )?;
        
        let salesperson_iter = stmt.query_map([], |row| {
            Ok(Salesperson {
                id: row.get(0)?,
                user_id: row.get(1)?,
                name: row.get(2)?,
                email: row.get(3)?,
                phone: row.get(4)?,
                commission_rate: row.get(5)?,
                is_active: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?;

        salesperson_iter.collect()
    }

    pub fn update_salesperson(
        conn: &Connection,
        id: i32,
        name: String,
        email: Option<String>,
        phone: Option<String>,
        commission_rate: f64,
    ) -> Result<Salesperson, rusqlite::Error> {
        conn.execute(
            "UPDATE salespersons SET name = ?, email = ?, phone = ?, commission_rate = ?, updated_at = datetime('now') WHERE id = ?",
            rusqlite::params![name, email, phone, commission_rate, id],
        )?;

        Self::get_salesperson_by_id(conn, id)
    }

    pub fn get_salesperson_performance(
        conn: &Connection,
        salesperson_id: i32,
        period: &str,
    ) -> Result<Vec<Sale>, rusqlite::Error> {
        let date_filter = match period {
            "today" => "AND DATE(created_at) = DATE('now')",
            "week" => "AND created_at >= datetime('now', '-7 days')",
            "month" => "AND created_at >= datetime('now', '-30 days')",
            _ => "",
        };

        let mut stmt = conn.prepare(&format!(
            "SELECT id, customer_id, user_id, salesperson_id, total_amount, tax_amount, discount_amount, payment_method, status, created_at 
             FROM sales 
                            WHERE salesperson_id = ? {} 
             ORDER BY created_at DESC",
            date_filter
        ))?;

        let sale_iter = stmt.query_map([salesperson_id], |row| {
            Ok(Sale {
                id: row.get(0)?,
                customer_id: row.get(1)?,
                user_id: row.get(2)?,
                salesperson_id: row.get(3)?,
                total_amount: row.get(4)?,
                tax_amount: row.get(5)?,
                discount_amount: row.get(6)?,
                payment_method: row.get(7)?,
                status: row.get(8)?,
                created_at: row.get(9)?,
            })
        })?;

        sale_iter.collect()
    }

    pub fn get_top_performers(
        conn: &Connection,
        period: &str,
        limit: i32,
    ) -> Result<Vec<(i32, String, f64, i32)>, rusqlite::Error> {
        let date_filter = match period {
            "today" => "AND DATE(s.created_at) = DATE('now')",
            "week" => "AND s.created_at >= datetime('now', '-7 days')",
            "month" => "AND s.created_at >= datetime('now', '-30 days')",
            _ => "",
        };

        let mut stmt = conn.prepare(&format!(
            "SELECT sp.id, sp.name, COALESCE(SUM(s.total_amount), 0) as total_sales, COUNT(s.id) as transaction_count
                            FROM salespersons sp
               LEFT JOIN sales s ON sp.id = s.salesperson_id
             WHERE sp.is_active = 1 {}
             GROUP BY sp.id, sp.name
             ORDER BY total_sales DESC
             LIMIT ?",
            date_filter
        ))?;

        let result_iter = stmt.query_map([limit], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
            ))
        })?;

        result_iter.collect()
    }
}

pub struct SettingsService {
    connection: Arc<Mutex<Connection>>,
}

impl SettingsService {
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self { connection }
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare("SELECT value FROM settings WHERE key = ?")?;
        
        let mut rows = stmt.query_map([key], |row| row.get::<_, String>(0))?;
        
        if let Some(row) = rows.next() {
            Ok(Some(row?))
        } else {
            Ok(None)
        }
    }

    pub fn set_setting(&self, key: &str, value: &str, description: Option<&str>) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        
        // Use INSERT OR REPLACE to handle both insert and update
        let mut stmt = connection.prepare(
            "INSERT OR REPLACE INTO settings (key, value, description, updated_at) VALUES (?, ?, ?, datetime('now'))"
        )?;
        
        stmt.execute(params![key, value, description])?;
        Ok(())
    }

    pub fn get_all_settings(&self) -> Result<Vec<Setting>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, key, value, description, created_at, updated_at FROM settings ORDER BY key"
        )?;
        
        let settings = stmt.query_map([], |row| Setting::from_row(row))?
            .collect::<Result<Vec<_>>>()?;
        
        Ok(settings)
    }
} 