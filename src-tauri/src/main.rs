// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;

use tauri::{AppHandle, Manager};
use database::{Database, connection::{ProductService, CustomerService, SaleService, UserService, SalespersonService, LicenseService}};
use database::models::*;
use serde::Deserialize;
// use std::sync::{Arc, Mutex};
use std::fs;
// use std::path::PathBuf;
use chrono::{DateTime, Utc};

#[derive(Deserialize)]
struct SaleItemData {
    product_variant_id: i32,
    quantity: i32,
    unit_price: f64,
    total: f64,
}



fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize database
            let db = Database::new(&app.handle())?;
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            get_db_version,
            reset_database,
            get_products,
            create_product,
            update_product,
            delete_product,
            get_customers,
            create_customer,
            update_customer,
            delete_customer,
            create_sale,
            create_sale_item,
            get_recent_sales,
            get_today_sales,
            create_default_user,
            get_user_by_id,
            get_or_create_default_variant,
            get_low_stock_items,
            get_out_of_stock_items,
            adjust_stock_quantity,
            get_product_variants,
            create_product_variant,
            update_product_variant,
            delete_product_variant,
            create_salesperson,
            update_salesperson,
            get_all_salespersons,
            get_salesperson_performance,
            get_top_performers,
            save_receipt,
            validate_license,
            activate_license,
            get_active_license,
            is_license_expired,
            create_predefined_licenses,
            reset_license_system,
            debug_license_status,
            check_date_format,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn ping() -> Result<String, String> {
    Ok("pong".to_string())
}

#[tauri::command]
async fn get_db_version(app_handle: AppHandle) -> Result<u32, String> {
    let db = app_handle.state::<Database>();
    let connection = db.connection.lock().unwrap();
    
    // Get current version
    let current_version: u32 = connection
        .query_row("SELECT COALESCE(MAX(version), 0) FROM db_version", [], |row| row.get(0))
        .unwrap_or(0);
    
    Ok(current_version)
}

#[tauri::command]
async fn reset_database(app_handle: AppHandle) -> Result<String, String> {
    let db = app_handle.state::<Database>();
    let connection = db.connection.lock().unwrap();
    
    // Drop all tables and recreate
    if let Err(e) = connection.execute_batch("
        DROP TABLE IF EXISTS sale_items;
        DROP TABLE IF EXISTS sales;
        DROP TABLE IF EXISTS salespersons;
        DROP TABLE IF EXISTS customers;
        DROP TABLE IF EXISTS product_variants;
        DROP TABLE IF EXISTS products;
        DROP TABLE IF EXISTS users;
        DROP TABLE IF EXISTS db_version;
    ") {
        return Err(format!("Failed to drop tables: {}", e));
    }
    
    // Reinitialize database
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");
    
    let db_path = app_dir.join("clothes_shop_pos.db");
    std::fs::remove_file(&db_path).ok(); // Remove the old database file
    
    // The database will be recreated on next startup
    Ok("Database reset successfully. Please restart the application.".to_string())
}

#[tauri::command]
async fn get_products(app_handle: AppHandle) -> Result<Vec<Product>, String> {
    let db = app_handle.state::<Database>();
    let product_service = ProductService::new(db.connection.clone());
    
    product_service.get_all_products()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_product(app_handle: AppHandle, product: Product) -> Result<i32, String> {
    println!("Rust: Received product creation request: {:?}", product);
    let db = app_handle.state::<Database>();
    let product_service = ProductService::new(db.connection.clone());
    
    let result = product_service.create_product(&product)
        .map_err(|e| {
            println!("Rust: Error creating product: {}", e);
            e.to_string()
        })?;
    
    println!("Rust: Product created successfully with ID: {}", result);
    Ok(result)
}

#[tauri::command]
async fn update_product(app_handle: AppHandle, product: Product) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let product_service = ProductService::new(db.connection.clone());
    
    product_service.update_product(&product)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_product(app_handle: AppHandle, id: i32) -> Result<(), String> {
    println!("Rust: Received delete product request for ID: {}", id);
    let db = app_handle.state::<Database>();
    let product_service = ProductService::new(db.connection.clone());
    
    let result = product_service.delete_product(id)
        .map_err(|e| {
            println!("Rust: Error deleting product: {}", e);
            e.to_string()
        })?;
    
    println!("Rust: Product deleted successfully");
    Ok(result)
}

#[tauri::command]
async fn get_customers(app_handle: AppHandle) -> Result<Vec<Customer>, String> {
    let db = app_handle.state::<Database>();
    let customer_service = CustomerService::new(db.connection.clone());
    
    customer_service.get_all_customers()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_customer(app_handle: AppHandle, customer: Customer) -> Result<Customer, String> {
    println!("Rust: Received customer creation request: {:?}", customer);
    let db = app_handle.state::<Database>();
    let customer_service = CustomerService::new(db.connection.clone());
    
    let result = customer_service.create_customer(&customer)
        .map_err(|e| {
            println!("Rust: Error creating customer: {}", e);
            e.to_string()
        })?;
    
    println!("Rust: Customer created successfully: {:?}", result);
    Ok(result)
}

#[tauri::command]
async fn update_customer(app_handle: AppHandle, id: i32, customer: Customer) -> Result<(), String> {
    println!("Rust: Received customer update request for ID: {}", id);
    let db = app_handle.state::<Database>();
    let customer_service = CustomerService::new(db.connection.clone());
    
    let result = customer_service.update_customer(id, &customer)
        .map_err(|e| {
            println!("Rust: Error updating customer: {}", e);
            e.to_string()
        })?;
    
    println!("Rust: Customer updated successfully");
    Ok(result)
}

#[tauri::command]
async fn delete_customer(app_handle: AppHandle, id: i32) -> Result<(), String> {
    println!("Rust: Received delete customer request for ID: {}", id);
    let db = app_handle.state::<Database>();
    let customer_service = CustomerService::new(db.connection.clone());
    
    let result = customer_service.delete_customer(id)
        .map_err(|e| {
            println!("Rust: Error deleting customer: {}", e);
            e.to_string()
        })?;
    
    println!("Rust: Customer deleted successfully");
    Ok(result)
}

#[tauri::command]
async fn create_sale(
    app_handle: AppHandle,
    customer_id: Option<i32>,
    user_id: i32,
    salesperson_id: Option<i32>,
    total_amount: f64,
    tax_amount: f64,
    discount_amount: f64,
    payment_method: String,
    status: String,
    items: Vec<SaleItemData>,
) -> Result<Sale, String> {
    println!("=== Backend create_sale START ===");
    println!("Received parameters: customer_id={:?}, user_id={}, salesperson_id={:?}, total_amount={}, tax_amount={}, discount_amount={}, payment_method={}, status={}, items_count={}", 
             customer_id, user_id, salesperson_id, total_amount, tax_amount, discount_amount, payment_method, status, items.len());
    
    let db = app_handle.state::<Database>();
    let conn = db.connection.lock().unwrap();
    println!("Database connection acquired");
    
    // Create the sale using SaleService
    let sale_service = SaleService::new(db.connection.clone());
    println!("About to create sale...");
    let sale = sale_service.create_sale(
        &conn,
        customer_id,
        user_id,
        salesperson_id,
        total_amount,
        tax_amount,
        discount_amount,
        payment_method,
        status,
    ).map_err(|e| {
        println!("Error creating sale: {}", e);
        e.to_string()
    })?;
    println!("Sale created with ID: {}", sale.id);

    // Create sale items
    println!("Creating {} sale items...", items.len());
    for (i, item) in items.iter().enumerate() {
        println!("Creating sale item {}/{}: product_variant_id={}, quantity={}, unit_price={}, total={}", 
                 i+1, items.len(), item.product_variant_id, item.quantity, item.unit_price, item.total);
        
        let sale_item = SaleItem {
            id: None, // Will be set by database
            sale_id: sale.id,
            product_variant_id: item.product_variant_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: 0.0, // Default discount
            total: item.total,
        };
        sale_service.create_sale_item(&conn, &sale_item).map_err(|e| {
            println!("Error creating sale item {}: {}", i+1, e);
            e.to_string()
        })?;
        println!("Sale item {} created successfully", i+1);
    }

    println!("=== Backend create_sale END ===");
    Ok(sale)
}

#[tauri::command]
async fn get_recent_sales(app_handle: AppHandle, limit: i32) -> Result<Vec<Sale>, String> {
    let db = app_handle.state::<Database>();
    let sale_service = SaleService::new(db.connection.clone());
    
    sale_service.get_recent_sales(limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_sale_item(app_handle: AppHandle, sale_item: SaleItem) -> Result<i32, String> {
    let db = app_handle.state::<Database>();
    let conn = db.connection.lock().unwrap();
    let sale_service = SaleService::new(db.connection.clone());
    
    sale_service.create_sale_item(&conn, &sale_item)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_today_sales(app_handle: AppHandle) -> Result<Vec<Sale>, String> {
    let db = app_handle.state::<Database>();
    let sale_service = SaleService::new(db.connection.clone());
    
    sale_service.get_today_sales()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_default_user(app_handle: AppHandle) -> Result<i32, String> {
    let db = app_handle.state::<Database>();
    let user_service = UserService::new(db.connection.clone());
    
    user_service.create_default_user()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_user_by_id(app_handle: AppHandle, id: i32) -> Result<Option<User>, String> {
    let db = app_handle.state::<Database>();
    let user_service = UserService::new(db.connection.clone());
    
    user_service.get_user_by_id(id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_or_create_default_variant(app_handle: AppHandle, product_id: i32) -> Result<i32, String> {
    let db = app_handle.state::<Database>();
    let product_service = ProductService::new(db.connection.clone());
    
    product_service.get_or_create_default_variant(product_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_low_stock_items(app_handle: AppHandle, threshold: i32) -> Result<Vec<ProductVariant>, String> {
    let db = app_handle.state::<Database>();
    let product_service = ProductService::new(db.connection.clone());
    
    product_service.get_low_stock_items(threshold)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_out_of_stock_items(app_handle: AppHandle) -> Result<Vec<ProductVariant>, String> {
    let db = app_handle.state::<Database>();
    let product_service = ProductService::new(db.connection.clone());
    
    product_service.get_out_of_stock_items()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn adjust_stock_quantity(app_handle: AppHandle, variant_id: i32, adjustment: i32) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let product_service = ProductService::new(db.connection.clone());
    product_service.adjust_stock_quantity(variant_id, adjustment).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_product_variants(app_handle: AppHandle, product_id: i32) -> Result<Vec<ProductVariant>, String> {
    let db = app_handle.state::<Database>();
    let product_service = ProductService::new(db.connection.clone());
    product_service.get_product_variants(product_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_product_variant(app_handle: AppHandle, variant: ProductVariant) -> Result<i32, String> {
    let db = app_handle.state::<Database>();
    let product_service = ProductService::new(db.connection.clone());
    product_service.create_product_variant(&variant).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_product_variant(app_handle: AppHandle, variant_id: i32, variant: ProductVariant) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let product_service = ProductService::new(db.connection.clone());
    product_service.update_product_variant(variant_id, &variant).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_product_variant(app_handle: AppHandle, variant_id: i32) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let product_service = ProductService::new(db.connection.clone());
    product_service.delete_product_variant(variant_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_salesperson(
    app_handle: AppHandle,
    user_id: i32,
    name: String,
    email: Option<String>,
    phone: Option<String>,
    commission_rate: f64,
) -> Result<Salesperson, String> {
    let db = app_handle.state::<Database>();
    let conn = db.connection.lock().unwrap();
    
    // Check if salespersons table exists
    let table_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='salespersons'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);
    
    if !table_exists {
        return Err("Salespersons table does not exist. Please reset the database.".to_string());
    }
    
    SalespersonService::create_salesperson(&conn, user_id, name, email, phone, commission_rate)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_all_salespersons(app_handle: AppHandle) -> Result<Vec<Salesperson>, String> {
    let db = app_handle.state::<Database>();
    let conn = db.connection.lock().unwrap();
    
    // Check if salespersons table exists
    let table_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='salespersons'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);
    
    if !table_exists {
        return Err("Salespersons table does not exist. Please reset the database.".to_string());
    }
    
    SalespersonService::get_all_salespersons(&conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_salesperson_performance(app_handle: AppHandle, salesperson_id: i32, period: String) -> Result<Vec<Sale>, String> {
    let db = app_handle.state::<Database>();
    let conn = db.connection.lock().unwrap();
    SalespersonService::get_salesperson_performance(&conn, salesperson_id, &period)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_top_performers(app_handle: AppHandle, period: String, limit: i32) -> Result<Vec<(i32, String, f64, i32)>, String> {
    let db = app_handle.state::<Database>();
    let conn = db.connection.lock().unwrap();
    SalespersonService::get_top_performers(&conn, &period, limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_salesperson(
    app_handle: AppHandle,
    id: i32,
    name: String,
    email: Option<String>,
    phone: Option<String>,
    commission_rate: f64,
) -> Result<Salesperson, String> {
    let db = app_handle.state::<Database>();
    let conn = db.connection.lock().unwrap();
    
    SalespersonService::update_salesperson(&conn, id, name, email, phone, commission_rate)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_receipt(_app_handle: AppHandle, receipt_content: String, sale_id: i32) -> Result<String, String> {
    // Get the user's Documents directory path
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let mut docs_path = home_dir;
    docs_path.push("Documents");
    
    // Create Documents directory if it doesn't exist
    if !docs_path.exists() {
        fs::create_dir_all(&docs_path).map_err(|e| format!("Failed to create Documents directory: {}", e))?;
    }
    
    // Create receipts subdirectory
    let mut receipts_dir = docs_path.clone();
    receipts_dir.push("Receipts");
    if !receipts_dir.exists() {
        fs::create_dir_all(&receipts_dir).map_err(|e| format!("Failed to create Receipts directory: {}", e))?;
    }
    
    // Generate filename with timestamp
    let now: DateTime<Utc> = Utc::now();
    let timestamp = now.format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("receipt_{}_{}.txt", sale_id, timestamp);
    
    // Create full file path
    let mut file_path = receipts_dir.clone();
    file_path.push(&filename);
    
    // Write receipt content to file
    fs::write(&file_path, receipt_content)
        .map_err(|e| format!("Failed to write receipt file: {}", e))?;
    
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn validate_license(app_handle: AppHandle, license_key: String) -> Result<Option<License>, String> {
    let db = app_handle.state::<Database>();
    let license_service = LicenseService::new(db.connection.clone());
    
    license_service.validate_license(&license_key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn activate_license(app_handle: AppHandle, license_key: String) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let license_service = LicenseService::new(db.connection.clone());
    
    license_service.activate_license(&license_key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_active_license(app_handle: AppHandle) -> Result<Option<License>, String> {
    let db = app_handle.state::<Database>();
    let license_service = LicenseService::new(db.connection.clone());
    
    license_service.get_active_license()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn is_license_expired(app_handle: AppHandle) -> Result<bool, String> {
    let db = app_handle.state::<Database>();
    let license_service = LicenseService::new(db.connection.clone());
    
    license_service.is_license_expired()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_predefined_licenses(app_handle: AppHandle) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let license_service = LicenseService::new(db.connection.clone());
    
    license_service.create_predefined_licenses()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn reset_license_system(app_handle: AppHandle) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let connection = db.connection.lock().unwrap();
    
    // Drop licenses table and recreate it
    connection.execute("DROP TABLE IF EXISTS licenses", [])
        .map_err(|e| e.to_string())?;
    
    // Run migration 5 to recreate the licenses table
    crate::database::migrations::run_migration_5(&connection)
        .map_err(|e| e.to_string())?;
    
    // Create predefined licenses
    let license_service = LicenseService::new(db.connection.clone());
    license_service.create_predefined_licenses()
        .map_err(|e| e.to_string())?;
    
    println!("License system reset successfully");
    Ok(())
}

#[tauri::command]
async fn debug_license_status(app_handle: AppHandle) -> Result<String, String> {
    let db = app_handle.state::<Database>();
    let license_service = LicenseService::new(db.connection.clone());
    
    // Get active license
    match license_service.get_active_license() {
        Ok(Some(license)) => {
            let expired = license_service.is_license_expired()
                .map_err(|e| e.to_string())?;
            
            Ok(format!(
                "Active License: {}\nType: {}\nActivated: {}\nExpires: {}\nExpired: {}",
                license.license_key,
                license.license_type,
                license.activated_at.unwrap_or_else(|| "NULL".to_string()),
                license.expires_at.unwrap_or_else(|| "NULL".to_string()),
                expired
            ))
        },
        Ok(None) => Ok("No active license found".to_string()),
        Err(e) => Err(format!("Error getting license: {}", e))
    }
}

#[tauri::command]
async fn check_date_format(app_handle: AppHandle) -> Result<String, String> {
    let db = app_handle.state::<Database>();
    let connection = db.connection.lock().unwrap();
    
    // Get all licenses with their date formats
    let mut stmt = connection.prepare(
        "SELECT id, license_key, activated_at, expires_at FROM licenses ORDER BY id"
    ).map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(format!(
            "ID: {}, Key: {}, Activated: '{}', Expires: '{}'",
            row.get::<_, i32>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "NULL".to_string()),
            row.get::<_, Option<String>>(3)?.unwrap_or_else(|| "NULL".to_string())
        ))
    }).map_err(|e| e.to_string())?;
    
    let mut result = String::new();
    for row in rows {
        result.push_str(&row.map_err(|e| e.to_string())?);
        result.push('\n');
    }
    
    Ok(result)
}




