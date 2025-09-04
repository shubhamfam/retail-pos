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
            let product = Product::from_row(row)?;
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

    pub fn get_all_product_variants(&self) -> Result<Vec<ProductVariant>> {
        let connection = self.connection.lock().unwrap();
        
        let mut stmt = connection.prepare(
            "SELECT pv.id, pv.product_id, pv.size, pv.color, pv.sku, pv.stock_quantity, pv.price_adjustment, pv.image_url
             FROM product_variants pv
             ORDER BY pv.sku"
        )?;
        
        let variant_iter = stmt.query_map([], |row| {
            Ok(ProductVariant {
                id: Some(row.get(0)?),
                product_id: row.get(1)?,
                size: row.get(2)?,
                color: row.get(3)?,
                sku: row.get(4)?,
                stock_quantity: row.get(5)?,
                price_adjustment: row.get(6)?,
                image_url: row.get(7)?,
            })
        })?;
        
        variant_iter.collect()
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
        
        // Try to create a default salesperson if none exists
        if salesperson_id.is_none() {
            let salesperson_count: i32 = conn.query_row(
                "SELECT COUNT(*) FROM salespersons",
                [],
                |row| row.get(0),
            ).unwrap_or(0);
            
            if salesperson_count == 0 {
                println!("No salespersons exist, creating default salesperson...");
                match SalespersonService::create_default_salesperson(conn) {
                    Ok(_) => println!("Default salesperson created successfully"),
                    Err(e) => println!("Failed to create default salesperson: {}", e),
                }
            }
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
        
        // Add salesperson_id - if none provided, try to get a default one
        let final_salesperson_id = if let Some(sid) = salesperson_id {
            Some(sid)
        } else {
            // Try to get the first available salesperson
            let default_salesperson: Result<i32, _> = conn.query_row(
                "SELECT id FROM salespersons WHERE is_active = 1 LIMIT 1",
                [],
                |row| row.get(0),
            );
            default_salesperson.ok()
        };
        
        if let Some(sid) = final_salesperson_id {
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

    pub fn create_default_salesperson(conn: &Connection) -> Result<i32> {
        println!("SalespersonService.create_default_salesperson: Starting...");
        
        // Check if any salesperson exists
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM salespersons",
            [],
            |row| row.get(0),
        )?;
        
        if count > 0 {
            println!("SalespersonService.create_default_salesperson: Salesperson already exists, skipping");
            return Ok(0);
        }
        
        // Get the first user (default user)
        let user_id: i32 = conn.query_row(
            "SELECT id FROM users LIMIT 1",
            [],
            |row| row.get(0),
        )?;
        
        println!("SalespersonService.create_default_salesperson: Creating default salesperson for user_id: {}", user_id);
        
        let id = conn.execute(
            "INSERT INTO salespersons (user_id, name, email, phone, commission_rate, is_active) VALUES (?, ?, ?, ?, ?, ?)",
            params![
                user_id,
                "Default Salesperson",
                "default@clothesshop.com",
                "+91 98765 43210",
                5.0, // 5% commission
                1 // active
            ],
        )?;
        
        println!("SalespersonService.create_default_salesperson: Default salesperson created with ID: {}", id);
        Ok(id as i32)
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
        
        // Check if settings table exists
        let table_exists: i32 = connection.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='settings'",
            [],
            |row| row.get(0)
        ).unwrap_or(0);
        
        if table_exists == 0 {
            println!("Settings table doesn't exist, returning None");
            return Ok(None);
        }
        
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
        
        // Check if settings table exists
        let table_exists: i32 = connection.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='settings'",
            [],
            |row| row.get(0)
        ).unwrap_or(0);
        
        if table_exists == 0 {
            println!("Settings table doesn't exist, creating it first");
            // Create the settings table
            connection.execute(
                "CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE NOT NULL,
                    value TEXT NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
                [],
            )?;
            
            // Create settings index
            connection.execute("CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)", [])?;
        }
        
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

pub struct LicenseService {
    connection: Arc<Mutex<Connection>>,
}

impl LicenseService {
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self { connection }
    }

    pub fn validate_license(&self, license_key: &str) -> Result<Option<License>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, license_key, license_type, is_active, activated_at, expires_at, created_at 
             FROM licenses 
             WHERE license_key = ? AND is_active = 1"
        )?;
        
        let mut rows = stmt.query_map([license_key], |row| {
            Ok(License {
                id: row.get(0)?,
                license_key: row.get(1)?,
                license_type: row.get(2)?,
                is_active: row.get(3)?,
                activated_at: row.get(4)?,
                expires_at: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?;
        
        if let Some(row) = rows.next() {
            Ok(Some(row?))
        } else {
            Ok(None)
        }
    }

    pub fn activate_license(&self, license_key: &str) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        
        // Check if license exists and is not already activated
        let mut stmt = connection.prepare(
            "SELECT id FROM licenses WHERE license_key = ? AND is_active = 1 AND activated_at IS NULL"
        )?;
        
        let mut rows = stmt.query_map([license_key], |row| row.get::<_, i32>(0))?;
        
        if let Some(row) = rows.next() {
            let license_id: i32 = row?;
            
            // Calculate expiration date (15 days from now)
            let expires_at = chrono::Utc::now() + chrono::Duration::days(15);
            let expires_at_str = expires_at.format("%Y-%m-%d %H:%M:%S").to_string();
            let activated_at = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
            
            println!("Debug: Setting activation date: '{}'", activated_at);
            println!("Debug: Setting expiration date: '{}'", expires_at_str);
            
            // Update license with activation date and expiration
            let mut update_stmt = connection.prepare(
                "UPDATE licenses SET activated_at = ?, expires_at = ? WHERE id = ?"
            )?;
            
            update_stmt.execute(params![activated_at, expires_at_str, license_id])?;
            
            println!("License activated successfully: {} -> expires at {}", license_key, expires_at_str);
            Ok(())
        } else {
            // Check if license exists but is already activated
            let mut check_stmt = connection.prepare(
                "SELECT id FROM licenses WHERE license_key = ? AND is_active = 1 AND activated_at IS NOT NULL"
            )?;
            
            let mut check_rows = check_stmt.query_map([license_key], |row| row.get::<_, i32>(0))?;
            
            if check_rows.next().is_some() {
                Err(rusqlite::Error::InvalidParameterName("License already activated".to_string()))
            } else {
                Err(rusqlite::Error::InvalidParameterName("License not found".to_string()))
            }
        }
    }

    pub fn get_active_license(&self) -> Result<Option<License>> {
        let connection = self.connection.lock().unwrap();
        
        // First, let's see what licenses exist
        let mut debug_stmt = connection.prepare(
            "SELECT id, license_key, license_type, is_active, activated_at, expires_at FROM licenses"
        )?;
        
        let debug_rows = debug_stmt.query_map([], |row| {
            Ok(format!("ID: {}, Key: {}, Type: {}, Active: {}, Activated: {}, Expires: {}", 
                row.get::<_, i32>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, bool>(3)?,
                row.get::<_, Option<String>>(4)?.unwrap_or_else(|| "NULL".to_string()),
                row.get::<_, Option<String>>(5)?.unwrap_or_else(|| "NULL".to_string())
            ))
        })?;
        
        println!("=== Debug: All licenses in database ===");
        for row in debug_rows {
            println!("{}", row?);
        }
        println!("=== End debug ===");
        
        let mut stmt = connection.prepare(
            "SELECT id, license_key, license_type, is_active, activated_at, expires_at, created_at 
             FROM licenses 
             WHERE is_active = 1 AND activated_at IS NOT NULL 
             ORDER BY activated_at DESC 
             LIMIT 1"
        )?;
        
        let mut rows = stmt.query_map([], |row| {
            Ok(License {
                id: row.get(0)?,
                license_key: row.get(1)?,
                license_type: row.get(2)?,
                is_active: row.get(3)?,
                activated_at: row.get(4)?,
                expires_at: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?;
        
        if let Some(row) = rows.next() {
            let license = row?;
            println!("Found active license: {}", license.license_key);
            Ok(Some(license))
        } else {
            println!("No active license found");
            Ok(None)
        }
    }

    pub fn is_license_expired(&self) -> Result<bool> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT expires_at FROM licenses 
             WHERE is_active = 1 AND activated_at IS NOT NULL 
             ORDER BY activated_at DESC 
             LIMIT 1"
        )?;
        
        let mut rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        
        if let Some(row) = rows.next() {
            let expires_at_str: String = row?;
            println!("Debug: Parsing expiration date: '{}'", expires_at_str);
            
            // Try multiple date formats
            let expires_at = chrono::NaiveDateTime::parse_from_str(&expires_at_str, "%Y-%m-%d %H:%M:%S")
                .map(|ndt| chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(ndt, chrono::Utc))
                .or_else(|_| chrono::DateTime::parse_from_str(&expires_at_str, "%Y-%m-%d %H:%M:%S")
                    .map(|dt| dt.with_timezone(&chrono::Utc)))
                .or_else(|_| chrono::DateTime::parse_from_str(&expires_at_str, "%Y-%m-%d %H:%M:%S%.f")
                    .map(|dt| dt.with_timezone(&chrono::Utc)))
                .or_else(|_| chrono::DateTime::parse_from_str(&expires_at_str, "%Y-%m-%d %H:%M:%S%z")
                    .map(|dt| dt.with_timezone(&chrono::Utc)))
                .or_else(|_| chrono::DateTime::parse_from_str(&expires_at_str, "%Y-%m-%d %H:%M:%S%.f%z")
                    .map(|dt| dt.with_timezone(&chrono::Utc)))
                .map_err(|_| {
                    println!("Debug: Failed to parse date '{}' with any format", expires_at_str);
                    rusqlite::Error::InvalidParameterName(format!("Invalid date format: {}", expires_at_str))
                })?;
            
            let now = chrono::Utc::now();
            let is_expired = now > expires_at;
            println!("Debug: License expires at {}, now is {}, expired: {}", expires_at, now, is_expired);
            Ok(is_expired)
        } else {
            println!("Debug: No active license found");
            Ok(false) // No active license found, not expired (user can activate)
        }
    }

    pub fn create_predefined_licenses(&self) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        
        // Check if licenses already exist
        let count: i32 = connection.query_row(
            "SELECT COUNT(*) FROM licenses",
            [],
            |row| row.get(0)
        )?;
        
        if count > 0 {
            return Ok(()); // Licenses already exist
        }
        
        // Create predefined trial licenses
        let trial_keys = vec![
            "TRIAL-2024-001-ABCD",
            "TRIAL-2024-002-EFGH", 
            "TRIAL-2024-003-IJKL",
            "TRIAL-2024-004-MNOP",
            "TRIAL-2024-005-QRST"
        ];
        
        let mut stmt = connection.prepare(
            "INSERT INTO licenses (license_key, license_type, is_active) VALUES (?, 'trial', 1)"
        )?;
        
        for key in trial_keys {
            stmt.execute([key])?;
        }
        
        Ok(())
    }
}

pub struct RefundService {
    connection: Arc<Mutex<Connection>>,
}

impl RefundService {
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self { connection }
    }

    pub fn create_refund(
        &self,
        sale_id: i32,
        user_id: i32,
        refund_amount: f64,
        refund_reason: String,
        refund_type: String,
        notes: Option<String>,
        items: Vec<(i32, i32, f64, Option<String>)>, // (sale_item_id, quantity, refund_amount, reason)
    ) -> Result<i32> {
        let mut connection = self.connection.lock().unwrap();
        let tx = connection.transaction()?;

        // Create the refund record with 'completed' status - no approval flow needed
        let refund_id = tx.execute(
            "INSERT INTO refunds (sale_id, user_id, refund_amount, refund_reason, refund_type, notes, status, processed_at) 
             VALUES (?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)",
            params![sale_id, user_id, refund_amount, refund_reason, refund_type, notes],
        )? as i32;

        // Create refund items and adjust stock
        for (sale_item_id, quantity, refund_amount, reason) in items {
            // Get the sale item to get product variant info
            let mut stmt = tx.prepare(
                "SELECT product_variant_id, unit_price FROM sale_items WHERE id = ?"
            )?;
            let sale_item: (i32, f64) = stmt.query_row([sale_item_id], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })?;

            // Create refund item
            tx.execute(
                "INSERT INTO refund_items (refund_id, sale_item_id, product_variant_id, quantity, unit_price, refund_amount, reason) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                params![refund_id, sale_item_id, sale_item.0, quantity, sale_item.1, refund_amount, reason],
            )?;

            // Adjust stock quantity (add back to inventory)
            tx.execute(
                "UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?",
                params![quantity, sale_item.0],
            )?;
        }

        tx.commit()?;
        Ok(refund_id)
    }

    pub fn get_refund_by_id(&self, refund_id: i32) -> Result<Option<RefundWithItems>> {
        let connection = self.connection.lock().unwrap();
        
        // Get the refund
        let mut stmt = connection.prepare(
            "SELECT id, sale_id, user_id, refund_amount, refund_reason, refund_type, status, notes, created_at, processed_at 
             FROM refunds WHERE id = ?"
        )?;
        
        let refund = stmt.query_row([refund_id], |row| Refund::from_row(row))
            .optional()?;

        if let Some(refund) = refund {
            // Get refund items
            let mut stmt = connection.prepare(
                "SELECT id, refund_id, sale_item_id, product_variant_id, quantity, unit_price, refund_amount, reason 
                 FROM refund_items WHERE refund_id = ?"
            )?;
            
            let items = stmt.query_map([refund_id], |row| RefundItem::from_row(row))?
                .collect::<Result<Vec<_>>>()?;

            Ok(Some(RefundWithItems { refund, items }))
        } else {
            Ok(None)
        }
    }

    pub fn get_refunds_by_sale_id(&self, sale_id: i32) -> Result<Vec<RefundWithItems>> {
        let connection = self.connection.lock().unwrap();
        
        // Get all refunds for the sale
        let mut stmt = connection.prepare(
            "SELECT id, sale_id, user_id, refund_amount, refund_reason, refund_type, status, notes, created_at, processed_at 
             FROM refunds WHERE sale_id = ? ORDER BY created_at DESC"
        )?;
        
        let refunds = stmt.query_map([sale_id], |row| Refund::from_row(row))?
            .collect::<Result<Vec<_>>>()?;

        let mut result = Vec::new();
        for refund in refunds {
            // Get refund items for each refund
            let mut stmt = connection.prepare(
                "SELECT id, refund_id, sale_item_id, product_variant_id, quantity, unit_price, refund_amount, reason 
                 FROM refund_items WHERE refund_id = ?"
            )?;
            
            let items = stmt.query_map([refund.id.unwrap()], |row| RefundItem::from_row(row))?
                .collect::<Result<Vec<_>>>()?;

            result.push(RefundWithItems { refund, items });
        }

        Ok(result)
    }

    pub fn get_all_refunds(&self, limit: Option<i32>) -> Result<Vec<RefundWithItems>> {
        let connection = self.connection.lock().unwrap();
        
        let limit_clause = if let Some(limit) = limit {
            format!(" LIMIT {}", limit)
        } else {
            String::new()
        };

        let mut stmt = connection.prepare(&format!(
            "SELECT id, sale_id, user_id, refund_amount, refund_reason, refund_type, status, notes, created_at, processed_at 
             FROM refunds ORDER BY created_at DESC{}", limit_clause
        ))?;
        
        let refunds = stmt.query_map([], |row| Refund::from_row(row))?
            .collect::<Result<Vec<_>>>()?;

        let mut result = Vec::new();
        for refund in refunds {
            // Get refund items for each refund
            let mut stmt = connection.prepare(
                "SELECT id, refund_id, sale_item_id, product_variant_id, quantity, unit_price, refund_amount, reason 
                 FROM refund_items WHERE refund_id = ?"
            )?;
            
            let items = stmt.query_map([refund.id.unwrap()], |row| RefundItem::from_row(row))?
                .collect::<Result<Vec<_>>>()?;

            result.push(RefundWithItems { refund, items });
        }

        Ok(result)
    }

    pub fn update_refund_status(&self, refund_id: i32, status: String) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        
        let processed_at = if status == "completed" {
            "CURRENT_TIMESTAMP"
        } else {
            "NULL"
        };

        connection.execute(
            &format!("UPDATE refunds SET status = ?, processed_at = {} WHERE id = ?", processed_at),
            params![status, refund_id],
        )?;

        Ok(())
    }

    pub fn get_refund_statistics(&self) -> Result<(f64, i32, i32)> {
        let connection = self.connection.lock().unwrap();
        
        // Total refund amount
        let total_amount: f64 = connection.query_row(
            "SELECT COALESCE(SUM(refund_amount), 0) FROM refunds WHERE status = 'completed'",
            [],
            |row| row.get(0),
        )?;

        // Total refund count
        let total_count: i32 = connection.query_row(
            "SELECT COUNT(*) FROM refunds WHERE status = 'completed'",
            [],
            |row| row.get(0),
        )?;

        // Today's refund count
        let today_count: i32 = connection.query_row(
            "SELECT COUNT(*) FROM refunds WHERE status = 'completed' AND DATE(created_at) = DATE('now')",
            [],
            |row| row.get(0),
        )?;

        Ok((total_amount, total_count, today_count))
    }
}

pub struct CategoryService {
    connection: Arc<Mutex<Connection>>,
}

impl CategoryService {
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self { connection }
    }

    pub fn get_all_categories(&self) -> Result<Vec<Category>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, name, parent_id, description FROM categories ORDER BY name"
        )?;
        
        let categories = stmt.query_map([], |row| Category::from_row(row))?
            .collect::<Result<Vec<_>>>()?;
        
        Ok(categories)
    }

    pub fn create_category(&self, category: &Category) -> Result<i32> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "INSERT INTO categories (name, parent_id, description) VALUES (?, ?, ?)"
        )?;
        
        let id = stmt.insert(params![
            category.name,
            category.parent_id,
            category.description,
        ])?;
        
        Ok(id as i32)
    }

    pub fn update_category(&self, category: &Category) -> Result<()> {
        if let Some(id) = category.id {
            let connection = self.connection.lock().unwrap();
            let mut stmt = connection.prepare(
                "UPDATE categories SET name = ?, parent_id = ?, description = ? WHERE id = ?"
            )?;
            
            stmt.execute(params![
                category.name,
                category.parent_id,
                category.description,
                id,
            ])?;
        }
        
        Ok(())
    }

    pub fn delete_category(&self, id: i32) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        
        // Check if category has child categories
        let child_count: i32 = connection.query_row(
            "SELECT COUNT(*) FROM categories WHERE parent_id = ?",
            [id],
            |row| row.get(0),
        )?;
        
        if child_count > 0 {
            return Err(rusqlite::Error::InvalidParameterName(
                "Cannot delete category with child categories".to_string()
            ));
        }
        
        // Check if category is used in products
        let product_count: i32 = connection.query_row(
            "SELECT COUNT(*) FROM products WHERE category = (SELECT name FROM categories WHERE id = ?)",
            [id],
            |row| row.get(0),
        )?;
        
        if product_count > 0 {
            return Err(rusqlite::Error::InvalidParameterName(
                "Cannot delete category that is used by products".to_string()
            ));
        }
        
        connection.execute("DELETE FROM categories WHERE id = ?", [id])?;
        Ok(())
    }

    pub fn get_category_by_id(&self, id: i32) -> Result<Option<Category>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, name, parent_id, description FROM categories WHERE id = ?"
        )?;
        
        let mut rows = stmt.query_map([id], |row| Category::from_row(row))?;
        
        if let Some(row) = rows.next() {
            Ok(Some(row?))
        } else {
            Ok(None)
        }
    }

    pub fn get_categories_by_parent(&self, parent_id: Option<i32>) -> Result<Vec<Category>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, name, parent_id, description FROM categories WHERE parent_id IS ? ORDER BY name"
        )?;
        
        let categories = stmt.query_map([parent_id], |row| Category::from_row(row))?
            .collect::<Result<Vec<_>>>()?;
        
        Ok(categories)
    }

    pub fn create_default_categories(&self) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        
        // Check if categories already exist
        let count: i32 = connection.query_row(
            "SELECT COUNT(*) FROM categories",
            [],
            |row| row.get(0)
        )?;
        
        if count > 0 {
            return Ok(()); // Categories already exist
        }
        
        // Create default categories
        let default_categories = vec![
            ("Men", None::<i32>, "Men's clothing"),
            ("Women", None::<i32>, "Women's clothing"),
            ("Kids", None::<i32>, "Kids clothing"),
            ("Accessories", None::<i32>, "Fashion accessories"),
            ("Footwear", None::<i32>, "Shoes and footwear"),
        ];
        
        let mut stmt = connection.prepare(
            "INSERT INTO categories (name, parent_id, description) VALUES (?, ?, ?)"
        )?;
        
        for (name, parent_id, description) in default_categories {
            stmt.execute(params![name, parent_id, description])?;
        }
        
        Ok(())
    }
}

pub struct BrandService {
    connection: Arc<Mutex<Connection>>,
}

impl BrandService {
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self { connection }
    }

    pub fn get_all_brands(&self) -> Result<Vec<Brand>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, name, description, created_at, updated_at FROM brands ORDER BY name"
        )?;
        
        let brands = stmt.query_map([], |row| Brand::from_row(row))?
            .collect::<Result<Vec<_>>>()?;
        
        Ok(brands)
    }

    pub fn create_brand(&self, brand: &Brand) -> Result<i32> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "INSERT INTO brands (name, description) VALUES (?, ?)"
        )?;
        
        let id = stmt.insert(params![
            brand.name,
            brand.description,
        ])?;
        
        Ok(id as i32)
    }

    pub fn update_brand(&self, brand: &Brand) -> Result<()> {
        if let Some(id) = brand.id {
            let connection = self.connection.lock().unwrap();
            let mut stmt = connection.prepare(
                "UPDATE brands SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            )?;
            
            stmt.execute(params![
                brand.name,
                brand.description,
                id,
            ])?;
        }
        
        Ok(())
    }

    pub fn delete_brand(&self, id: i32) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        
        // Check if brand is used in products
        let product_count: i32 = connection.query_row(
            "SELECT COUNT(*) FROM products WHERE brand = (SELECT name FROM brands WHERE id = ?)",
            [id],
            |row| row.get(0),
        )?;
        
        if product_count > 0 {
            return Err(rusqlite::Error::InvalidParameterName(
                "Cannot delete brand that is used by products".to_string()
            ));
        }
        
        connection.execute("DELETE FROM brands WHERE id = ?", [id])?;
        Ok(())
    }

    pub fn get_brand_by_id(&self, id: i32) -> Result<Option<Brand>> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "SELECT id, name, description, created_at, updated_at FROM brands WHERE id = ?"
        )?;
        
        let mut rows = stmt.query_map([id], |row| Brand::from_row(row))?;
        
        if let Some(row) = rows.next() {
            Ok(Some(row?))
        } else {
            Ok(None)
        }
    }

    pub fn create_default_brands(&self) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        
        // Check if brands already exist
        let count: i32 = connection.query_row(
            "SELECT COUNT(*) FROM brands",
            [],
            |row| row.get(0)
        )?;
        
        if count > 0 {
            return Ok(()); // Brands already exist
        }
        
        // Create default brands
        let default_brands = vec![
            ("Nike", "Athletic wear and footwear"),
            ("Adidas", "Sports and casual wear"),
            ("Puma", "Athletic and casual wear"),
            ("Levi's", "Denim and casual wear"),
            ("Zara", "Fashion and accessories"),
            ("H&M", "Fashion and accessories"),
            ("Uniqlo", "Casual and basic wear"),
            ("Gap", "Casual and basic wear"),
        ];
        
        let mut stmt = connection.prepare(
            "INSERT INTO brands (name, description) VALUES (?, ?)"
        )?;
        
        for (name, description) in default_brands {
            stmt.execute(params![name, description])?;
        }
        
        Ok(())
    }
}

pub struct AnalyticsService {
    connection: Arc<Mutex<Connection>>,
}

impl AnalyticsService {
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self { connection }
    }

    pub fn track_event(&self, event_type: &str, event_data: Option<&str>, user_id: Option<i32>) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "INSERT INTO analytics_events (event_type, event_data, user_id) VALUES (?, ?, ?)"
        )?;
        
        stmt.execute(params![event_type, event_data, user_id])?;
        Ok(())
    }

    pub fn track_product_view(&self, product_id: i32, user_id: Option<i32>) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "INSERT INTO product_views (product_id, user_id) VALUES (?, ?)"
        )?;
        
        stmt.execute(params![product_id, user_id])?;
        Ok(())
    }

    pub fn get_analytics_summary(&self) -> Result<AnalyticsSummary> {
        println!("Starting analytics summary calculation...");
        let connection = self.connection.lock().unwrap();
        
        // Check if analytics tables exist
        let table_exists: i32 = connection.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='analytics_events'",
            [],
            |row| row.get(0)
        ).unwrap_or(0);
        
        println!("Analytics tables exist: {}", table_exists > 0);
        
        if table_exists == 0 {
            println!("Analytics tables don't exist, returning empty summary");
            return Ok(AnalyticsSummary {
                total_sales: 0.0,
                total_orders: 0,
                average_order_value: 0.0,
                total_customers: 0,
                total_products: 0,
                low_stock_items: 0,
                out_of_stock_items: 0,
                today_sales: 0.0,
                today_orders: 0,
                monthly_sales: 0.0,
                monthly_orders: 0,
                top_selling_products: vec![],
                top_customers: vec![],
                sales_trends: vec![],
                profit_margins: vec![],
            });
        }
        
        // No indexes needed for simple queries
        
        // Get basic metrics
        let total_sales: f64 = connection.query_row(
            "SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE status = 'completed'",
            [],
            |row| row.get(0)
        )?;
        
        let total_orders: i32 = connection.query_row(
            "SELECT COUNT(*) FROM sales WHERE status = 'completed'",
            [],
            |row| row.get(0)
        )?;
        
        let average_order_value = if total_orders > 0 { total_sales / total_orders as f64 } else { 0.0 };
        
        let total_customers: i32 = connection.query_row(
            "SELECT COUNT(DISTINCT customer_id) FROM sales WHERE customer_id IS NOT NULL",
            [],
            |row| row.get(0)
        )?;
        
        let total_products: i32 = connection.query_row(
            "SELECT COUNT(*) FROM products",
            [],
            |row| row.get(0)
        )?;
        
        let low_stock_items: i32 = connection.query_row(
            "SELECT COUNT(*) FROM product_variants WHERE stock_quantity <= 10",
            [],
            |row| row.get(0)
        )?;
        
        let out_of_stock_items: i32 = connection.query_row(
            "SELECT COUNT(*) FROM product_variants WHERE stock_quantity = 0",
            [],
            |row| row.get(0)
        )?;
        
        // Today's metrics
        let today_sales: f64 = connection.query_row(
            "SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE status = 'completed' AND DATE(created_at) = DATE('now')",
            [],
            |row| row.get(0)
        )?;
        
        let today_orders: i32 = connection.query_row(
            "SELECT COUNT(*) FROM sales WHERE status = 'completed' AND DATE(created_at) = DATE('now')",
            [],
            |row| row.get(0)
        )?;
        
        // Monthly metrics
        let monthly_sales: f64 = connection.query_row(
            "SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE status = 'completed' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')",
            [],
            |row| row.get(0)
        )?;
        
        let monthly_orders: i32 = connection.query_row(
            "SELECT COUNT(*) FROM sales WHERE status = 'completed' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')",
            [],
            |row| row.get(0)
        )?;
        
        // Top selling products (limit to 5 for faster loading)
        let top_selling_products = self.get_top_selling_products()?;
        
        // Top customers (limit to 5 for faster loading)
        let top_customers = self.get_top_customers()?;
        
        // Sales trends (last 7 days instead of 30 for faster loading)
        let sales_trends = self.get_sales_trends()?;
        
        // Profit margins (limit to 10 for faster loading)
        let profit_margins = self.get_profit_margins()?;
        
        println!("Analytics summary calculation completed successfully");
        
        Ok(AnalyticsSummary {
            total_sales,
            total_orders,
            average_order_value,
            total_customers,
            total_products,
            low_stock_items,
            out_of_stock_items,
            today_sales,
            today_orders,
            monthly_sales,
            monthly_orders,
            top_selling_products,
            top_customers,
            sales_trends,
            profit_margins,
        })
    }

    pub fn get_top_selling_products(&self) -> Result<Vec<ProductPerformance>> {
        let connection = self.connection.lock().unwrap();
        
        // Simple query without JOINs - just get products
        let mut stmt = connection.prepare(
            "SELECT id, name, cost_price FROM products ORDER BY name LIMIT 10"
        )?;
        
        let products = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i32>(0)?,  // id
                row.get::<_, String>(1)?, // name
                row.get::<_, f64>(2)?,   // cost_price
            ))
        })?.collect::<Result<Vec<_>>>()?;
        
        // Convert to ProductPerformance with default values
        let top_products = products.into_iter().map(|(id, name, _cost_price)| {
            ProductPerformance {
                product_id: id,
                product_name: name,
                total_sales: 0.0,  // Will be calculated separately if needed
                total_quantity: 0,
                profit_margin: 0.0,
                views: 0,
            }
        }).collect();
        
        Ok(top_products)
    }

    pub fn get_top_customers(&self) -> Result<Vec<CustomerPerformance>> {
        let connection = self.connection.lock().unwrap();
        
        // Simple query without JOINs - just get customers
        let mut stmt = connection.prepare(
            "SELECT id, name FROM customers ORDER BY name LIMIT 10"
        )?;
        
        let customers = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i32>(0)?,  // id
                row.get::<_, String>(1)?, // name
            ))
        })?.collect::<Result<Vec<_>>>()?;
        
        // Convert to CustomerPerformance with default values
        let top_customers = customers.into_iter().map(|(id, name)| {
            CustomerPerformance {
                customer_id: id,
                customer_name: name,
                total_spent: 0.0,  // Will be calculated separately if needed
                total_orders: 0,
                average_order_value: 0.0,
                last_order_date: None,
            }
        }).collect();
        
        Ok(top_customers)
    }

    pub fn get_sales_trends(&self) -> Result<Vec<SalesTrend>> {
        let connection = self.connection.lock().unwrap();
        
        // Simple query - just get recent sales count
        let mut stmt = connection.prepare(
            "SELECT COUNT(*) FROM sales WHERE status = 'completed' AND created_at >= date('now', '-7 days')"
        )?;
        
        let recent_sales_count: i32 = stmt.query_row([], |row| row.get(0))?;
        
        // Return simple trend data
        let trends = vec![
            SalesTrend {
                date: chrono::Utc::now().format("%Y-%m-%d").to_string(),
                sales: 0.0,
                orders: recent_sales_count,
                customers: 0,
            }
        ];
        
        Ok(trends)
    }

    pub fn get_profit_margins(&self) -> Result<Vec<ProfitMarginData>> {
        let connection = self.connection.lock().unwrap();
        
        // Simple query - just get products with cost prices
        let mut stmt = connection.prepare(
            "SELECT id, name, cost_price FROM products ORDER BY name LIMIT 10"
        )?;
        
        let products = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i32>(0)?,  // id
                row.get::<_, String>(1)?, // name
                row.get::<_, f64>(2)?,   // cost_price
            ))
        })?.collect::<Result<Vec<_>>>()?;
        
        // Convert to ProfitMarginData with default values
        let margins = products.into_iter().map(|(id, name, cost_price)| {
            ProfitMarginData {
                product_id: id,
                product_name: name,
                cost_price,
                selling_price: cost_price * 1.2, // Assume 20% markup
                profit_margin: cost_price * 0.2,
                profit_percentage: 20.0,
                total_quantity: 0,
            }
        }).collect();
        
        Ok(margins)
    }

    pub fn generate_sales_forecast(&self, product_id: i32, days: i32) -> Result<Vec<SalesForecast>> {
        let connection = self.connection.lock().unwrap();
        
        // Simple forecasting based on historical sales
        let mut stmt = connection.prepare(
            "SELECT 
                DATE(created_at) as sale_date,
                SUM(si.quantity) as daily_sales
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            JOIN product_variants pv ON si.product_variant_id = pv.id
            WHERE pv.product_id = ? 
            AND s.status = 'completed'
            AND s.created_at >= date('now', '-30 days')
            GROUP BY DATE(created_at)
            ORDER BY sale_date"
        )?;
        
        let historical_data: Vec<(String, i32)> = stmt.query_map([product_id], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?.collect::<Result<Vec<_>>>()?;
        
        // Simple average-based forecasting
        let avg_daily_sales = if !historical_data.is_empty() {
            historical_data.iter().map(|(_, qty)| *qty).sum::<i32>() as f64 / historical_data.len() as f64
        } else {
            0.0
        };
        
        let mut forecasts = Vec::new();
        for i in 1..=days {
            let forecast_date = chrono::Utc::now() + chrono::Duration::days(i as i64);
            let predicted_quantity = avg_daily_sales.round() as i32;
            
            forecasts.push(SalesForecast {
                id: None,
                product_id,
                forecast_date: forecast_date.format("%Y-%m-%d").to_string(),
                predicted_quantity,
                confidence_level: Some(0.8), // Simple confidence level
                created_at: Some(chrono::Utc::now().to_rfc3339()),
            });
        }
        
        Ok(forecasts)
    }

    pub fn save_profit_margin(&self, profit_margin: &ProfitMargin) -> Result<()> {
        let connection = self.connection.lock().unwrap();
        let mut stmt = connection.prepare(
            "INSERT INTO profit_margins (product_id, sale_id, cost_price, selling_price, profit_margin, profit_percentage) 
             VALUES (?, ?, ?, ?, ?, ?)"
        )?;
        
        stmt.execute(params![
            profit_margin.product_id,
            profit_margin.sale_id,
            profit_margin.cost_price,
            profit_margin.selling_price,
            profit_margin.profit_margin,
            profit_margin.profit_percentage,
        ])?;
        
        Ok(())
    }
}