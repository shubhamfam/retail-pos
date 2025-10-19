// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(dead_code)]

mod database;

use tauri::{AppHandle, Manager};
use database::{Database, connection::{ProductService, CustomerService, SaleService, UserService, SalespersonService, SettingsService, LicenseService, RefundService, CategoryService, BrandService, AnalyticsService}, import_export::ImportExportService};
use database::models::*;
use serde::Deserialize;
use std::fs;
use chrono::{DateTime, Utc};

#[derive(Deserialize)]
struct SaleItemData {
    product_variant_id: i32,
    quantity: i32,
    unit_price: f64,
    total: f64,
}

#[derive(Deserialize)]
struct RefundItemData {
    sale_item_id: i32,
    quantity: i32,
    refund_amount: f64,
    reason: Option<String>,
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
        get_all_product_variants,
            create_product_variant,
            update_product_variant,
            delete_product_variant,
            create_salesperson,
            update_salesperson,
            get_all_salespersons,
            get_salesperson_performance,
            get_top_performers,
        create_default_salesperson,
            save_receipt,
            get_setting,
            set_setting,
            get_all_settings,
            export_products_to_csv,
            export_customers_to_csv,
            export_salespersons_to_csv,
            import_products_from_csv,
            import_customers_from_csv,
            import_products_from_csv_content,
            import_customers_from_csv_content,
            import_salespersons_from_csv_content,
            generate_product_template,
            generate_customer_template,
            generate_salesperson_template,
            get_sale_items,
            save_template_with_dialog,
            validate_license,
            activate_license,
            get_active_license,
            is_license_expired,
            create_predefined_licenses,
            create_sample_data,
            reset_license_system,
            debug_license_status,
            check_date_format,
            create_refund,
            get_refund_by_id,
            get_refunds_by_sale_id,
            get_all_refunds,
            update_refund_status,
            get_refund_statistics,
            get_categories,
            create_category,
            update_category,
            delete_category,
            create_default_categories,
            get_brands,
            create_brand,
            update_brand,
            delete_brand,
            create_default_brands,
            get_analytics_summary,
            track_analytics_event,
            track_product_view,
            generate_sales_forecast,
            get_sales_trends,
            get_profit_margins,
            get_top_selling_products,
            get_top_customers,
            test_analytics,
            create_settings_table,
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
async fn get_all_product_variants(app_handle: AppHandle) -> Result<Vec<ProductVariant>, String> {
    let db = app_handle.state::<Database>();
    let product_service = ProductService::new(db.connection.clone());
    
    product_service.get_all_product_variants().map_err(|e| e.to_string())
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
async fn create_default_salesperson(app_handle: AppHandle) -> Result<i32, String> {
    let db = app_handle.state::<Database>();
    let conn = db.connection.lock().unwrap();
    SalespersonService::create_default_salesperson(&conn)
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
async fn get_setting(app_handle: AppHandle, key: String) -> Result<Option<String>, String> {
    let db = app_handle.state::<Database>();
    let settings_service = SettingsService::new(db.connection.clone());
    
    settings_service.get_setting(&key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn validate_license(app_handle: AppHandle, license_key: String) -> Result<Option<License>, String> {
    let db = app_handle.state::<Database>();
    let license_service = LicenseService::new(db.connection.clone());
    
    license_service.validate_license(&license_key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_setting(app_handle: AppHandle, key: String, value: String, description: Option<String>) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let settings_service = SettingsService::new(db.connection.clone());
    
    settings_service.set_setting(&key, &value, description.as_deref())
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
async fn get_all_settings(app_handle: AppHandle) -> Result<Vec<Setting>, String> {
    let db = app_handle.state::<Database>();
    let settings_service = SettingsService::new(db.connection.clone());
    
    settings_service.get_all_settings()
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
async fn export_products_to_csv(app_handle: AppHandle, file_path: String) -> Result<String, String> {
    let db = app_handle.state::<Database>();
    let import_export_service = ImportExportService::new(db.connection.clone());
    
    // If file_path is empty, use automatic directory selection like templates
    let final_file_path = if file_path.is_empty() {
        // Try multiple directory options in order of preference
        let target_dir = if let Some(docs) = dirs::document_dir() {
            println!("📁 Using Documents directory for export: {}", docs.display());
            docs
        } else if let Ok(current) = std::env::current_dir() {
            println!("📁 Using current directory for export: {}", current.display());
            current
        } else if let Some(home) = dirs::home_dir() {
            println!("📁 Using home directory for export: {}", home.display());
            home
        } else {
            println!("📁 Using temp directory for export");
            std::env::temp_dir()
        };
        
        // Ensure the target directory exists
        if !target_dir.exists() {
            println!("📂 Creating directory for export: {}", target_dir.display());
            std::fs::create_dir_all(&target_dir)
                .map_err(|e| format!("Failed to create directory {}: {}", target_dir.display(), e))?;
        }
        
        // Create the file path with timestamp
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let file_path = target_dir.join(format!("products_export_{}.csv", timestamp));
        
        file_path.to_str()
            .ok_or_else(|| "Failed to convert file path to string".to_string())?
            .to_string()
    } else {
        file_path
    };
    
    import_export_service.export_products_to_csv(&final_file_path)
        .map_err(|e| e.to_string())?;
    
    Ok(format!("Products exported successfully to {}", final_file_path))
}

#[tauri::command]
async fn export_customers_to_csv(app_handle: AppHandle, file_path: String) -> Result<String, String> {
    let db = app_handle.state::<Database>();
    let import_export_service = ImportExportService::new(db.connection.clone());
    
    // If file_path is empty, use automatic directory selection like templates
    let final_file_path = if file_path.is_empty() {
        // Try multiple directory options in order of preference
        let target_dir = if let Some(docs) = dirs::document_dir() {
            println!("📁 Using Documents directory for export: {}", docs.display());
            docs
        } else if let Ok(current) = std::env::current_dir() {
            println!("📁 Using current directory for export: {}", current.display());
            current
        } else if let Some(home) = dirs::home_dir() {
            println!("📁 Using home directory for export: {}", home.display());
            home
        } else {
            println!("📁 Using temp directory for export");
            std::env::temp_dir()
        };
        
        // Ensure the target directory exists
        if !target_dir.exists() {
            println!("📂 Creating directory for export: {}", target_dir.display());
            std::fs::create_dir_all(&target_dir)
                .map_err(|e| format!("Failed to create directory {}: {}", target_dir.display(), e))?;
        }
        
        // Create the file path with timestamp
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let file_path = target_dir.join(format!("customers_export_{}.csv", timestamp));
        
        file_path.to_str()
            .ok_or_else(|| "Failed to convert file path to string".to_string())?
            .to_string()
    } else {
        file_path
    };
    
    import_export_service.export_customers_to_csv(&final_file_path)
        .map_err(|e| e.to_string())?;
    
    Ok(format!("Customers exported successfully to {}", final_file_path))
}

#[tauri::command]
async fn export_salespersons_to_csv(app_handle: AppHandle, file_path: String) -> Result<String, String> {
    let db = app_handle.state::<Database>();
    let import_export_service = ImportExportService::new(db.connection.clone());
    
    // If file_path is empty, use automatic directory selection like templates
    let final_file_path = if file_path.is_empty() {
        // Try multiple directory options in order of preference
        let target_dir = if let Some(docs) = dirs::document_dir() {
            println!("📁 Using Documents directory for export: {}", docs.display());
            docs
        } else if let Ok(current) = std::env::current_dir() {
            println!("📁 Using current directory for export: {}", current.display());
            current
        } else if let Some(home) = dirs::home_dir() {
            println!("📁 Using home directory for export: {}", home.display());
            home
        } else {
            println!("📁 Using temp directory for export");
            std::env::temp_dir()
        };
        
        // Ensure the target directory exists
        if !target_dir.exists() {
            println!("📂 Creating directory for export: {}", target_dir.display());
            std::fs::create_dir_all(&target_dir)
                .map_err(|e| format!("Failed to create directory {}: {}", target_dir.display(), e))?;
        }
        
        // Create the file path with timestamp
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let file_path = target_dir.join(format!("salespersons_export_{}.csv", timestamp));
        
        file_path.to_str()
            .ok_or_else(|| "Failed to convert file path to string".to_string())?
            .to_string()
    } else {
        file_path
    };
    
    import_export_service.export_salespersons_to_csv(&final_file_path)
        .map_err(|e| e.to_string())?;
    
    Ok(format!("Salespersons exported successfully to {}", final_file_path))
}

#[tauri::command]
async fn import_products_from_csv(app_handle: AppHandle, file_path: String) -> Result<serde_json::Value, String> {
    let db = app_handle.state::<Database>();
    let mut import_export_service = ImportExportService::new(db.connection.clone());
    
    let result = import_export_service.import_products_from_csv(&file_path)
        .map_err(|e| e.to_string())?;
    
    Ok(serde_json::json!({
        "success_count": result.success_count,
        "error_count": result.error_count,
        "errors": result.errors
    }))
}

#[tauri::command]
async fn import_customers_from_csv(app_handle: AppHandle, file_path: String) -> Result<serde_json::Value, String> {
    let db = app_handle.state::<Database>();
    let mut import_export_service = ImportExportService::new(db.connection.clone());
    
    let result = import_export_service.import_customers_from_csv(&file_path)
        .map_err(|e| e.to_string())?;
    
    Ok(serde_json::json!({
        "success_count": result.success_count,
        "error_count": result.error_count,
        "errors": result.errors
    }))
}

#[tauri::command]
async fn import_products_from_csv_content(app_handle: AppHandle, content: String) -> Result<serde_json::Value, String> {
    let db = app_handle.state::<Database>();
    let mut import_export_service = ImportExportService::new(db.connection.clone());
    
    let result = import_export_service.import_products_from_csv_content(&content)
        .map_err(|e| e.to_string())?;
    
    Ok(serde_json::json!({
        "success_count": result.success_count,
        "error_count": result.error_count,
        "errors": result.errors
    }))
}

#[tauri::command]
async fn import_customers_from_csv_content(app_handle: AppHandle, content: String) -> Result<serde_json::Value, String> {
    let db = app_handle.state::<Database>();
    let mut import_export_service = ImportExportService::new(db.connection.clone());
    
    let result = import_export_service.import_customers_from_csv_content(&content)
        .map_err(|e| e.to_string())?;
    
    Ok(serde_json::json!({
        "success_count": result.success_count,
        "error_count": result.error_count,
        "errors": result.errors
    }))
}

#[tauri::command]
async fn generate_product_template(app_handle: AppHandle, file_path: String) -> Result<String, String> {
    let db = app_handle.state::<Database>();
    let import_export_service = ImportExportService::new(db.connection.clone());
    
    println!("🔧 OLD generate_product_template called with path: '{}'", file_path);
    println!("🔧 Path length: {}", file_path.len());
    
    if file_path.is_empty() {
        println!("❌ OLD function received empty file path! This function requires a valid path.");
        return Err("File path is required for this function. Use saveTemplateWithDialog instead.".to_string());
    }
    
    import_export_service.generate_product_template(&file_path)
        .map_err(|e| e.to_string())?;
    
    Ok(format!("Product template generated successfully at {}", file_path))
}

#[tauri::command]
async fn generate_customer_template(app_handle: AppHandle, file_path: String) -> Result<String, String> {
    let db = app_handle.state::<Database>();
    let import_export_service = ImportExportService::new(db.connection.clone());
    
    import_export_service.generate_customer_template(&file_path)
        .map_err(|e| e.to_string())?;
    
    Ok(format!("Customer template generated successfully at {}", file_path))
}

#[tauri::command]
async fn save_template_with_dialog(app_handle: AppHandle, template_type: String) -> Result<String, String> {
    let db = app_handle.state::<Database>();
    let import_export_service = ImportExportService::new(db.connection.clone());
    
    // Debug: Log the template type
    println!("🔍 Generating template for type: '{}'", template_type);
    println!("🔍 Template type length: {}", template_type.len());
    
    // Validate and fix template type
    let template_type = if template_type.is_empty() {
        println!("❌ Template type is empty! Using 'products' as fallback");
        "products".to_string()
    } else {
        template_type
    };
    
    println!("🔍 Final template type: '{}'", template_type);
    
    // Try multiple directory options in order of preference
    let target_dir = if let Some(docs) = dirs::document_dir() {
        println!("📁 Using Documents directory: {}", docs.display());
        docs
    } else if let Ok(current) = std::env::current_dir() {
        println!("📁 Using current directory: {}", current.display());
        current
    } else if let Some(home) = dirs::home_dir() {
        println!("📁 Using home directory: {}", home.display());
        home
    } else {
        println!("📁 Using temp directory");
        std::env::temp_dir()
    };
    
    println!("📁 Target directory: {}", target_dir.display());
    
    // Ensure the target directory exists
    if !target_dir.exists() {
        println!("📂 Creating directory: {}", target_dir.display());
        std::fs::create_dir_all(&target_dir)
            .map_err(|e| format!("Failed to create directory {}: {}", target_dir.display(), e))?;
    } else {
        println!("✅ Directory exists: {}", target_dir.display());
    }
    
    // Create the file path in target directory
    let file_path = target_dir.join(format!("{}_template.csv", template_type));
    println!("📄 Target file path: {}", file_path.display());
    
    // Convert path to string safely
    let file_path_str = file_path.to_str()
        .ok_or_else(|| {
            println!("❌ Failed to convert file path to string! Path: {:?}", file_path);
            "Failed to convert file path to string".to_string()
        })?;
    
    println!("🔗 File path string: '{}'", file_path_str);
    
    // Additional validation
    if file_path_str.is_empty() {
        println!("❌ File path is empty! Using fallback path");
        // Emergency fallback - try current directory with simple name
        let fallback_path = format!("{}_template.csv", template_type);
        println!("🔄 Using fallback path: {}", fallback_path);
        
        match template_type.as_str() {
            "products" => {
                import_export_service.generate_product_template(&fallback_path)
                    .map_err(|e| format!("Failed to generate product template with fallback: {}", e))?;
            },
            _ => return Err("Unsupported template type with fallback".to_string()),
        }
        
        return Ok(format!("✅ Template generated with fallback path: {}", fallback_path));
    }
    
    // Generate the template
    match template_type.as_str() {
        "products" => {
            import_export_service.generate_product_template(file_path_str)
                .map_err(|e| format!("Failed to generate product template: {}", e))?;
        },
        "customers" => {
            import_export_service.generate_customer_template(file_path_str)
                .map_err(|e| format!("Failed to generate customer template: {}", e))?;
        },
        "salespersons" => {
            import_export_service.generate_salesperson_template(file_path_str)
                .map_err(|e| format!("Failed to generate salesperson template: {}", e))?;
        },
        _ => return Err("Invalid template type".to_string())
    }
    
    Ok(format!("✅ Template downloaded successfully!\n\n📁 Location: {}\n\n📋 You can now open this file in Excel or any spreadsheet application to fill in your data.", file_path.display()))
}

#[tauri::command]
async fn import_salespersons_from_csv_content(app_handle: AppHandle, content: String) -> Result<serde_json::Value, String> {
    let db = app_handle.state::<Database>();
    let mut import_export_service = ImportExportService::new(db.connection.clone());
    
    let result = import_export_service.import_salespersons_from_csv_content(&content)
        .map_err(|e| e.to_string())?;
    
    Ok(serde_json::json!({
        "success_count": result.success_count,
        "error_count": result.error_count,
        "errors": result.errors
    }))
}

#[tauri::command]
async fn generate_salesperson_template(app_handle: AppHandle, file_path: String) -> Result<String, String> {
    let db = app_handle.state::<Database>();
    let import_export_service = ImportExportService::new(db.connection.clone());
    
    import_export_service.generate_salesperson_template(&file_path)
        .map_err(|e| e.to_string())?;
    
    Ok(format!("Salesperson template generated successfully at {}", file_path))
}

#[tauri::command]
async fn get_sale_items(app_handle: AppHandle, sale_id: i32) -> Result<Vec<SaleItem>, String> {
    let db = app_handle.state::<Database>();
    let sale_service = SaleService::new(db.connection.clone());
    
    sale_service.get_sale_items(sale_id)
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

#[tauri::command]
async fn create_refund(
    app_handle: AppHandle,
    saleid: i32,
    userid: i32,
    refundamount: f64,
    refundreason: String,
    refundtype: String,
    notes: Option<String>,
    items: Vec<RefundItemData>,
) -> Result<i32, String> {
    let db = app_handle.state::<Database>();
    let refund_service = RefundService::new(db.connection.clone());
    
    // Convert items to the format expected by the service
    let refund_items: Vec<(i32, i32, f64, Option<String>)> = items
        .into_iter()
        .map(|item| (item.sale_item_id, item.quantity, item.refund_amount, item.reason))
        .collect();
    
    refund_service.create_refund(
        saleid,
        userid,
        refundamount,
        refundreason,
        refundtype,
        notes,
        refund_items,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_refund_by_id(app_handle: AppHandle, refund_id: i32) -> Result<Option<RefundWithItems>, String> {
    let db = app_handle.state::<Database>();
    let refund_service = RefundService::new(db.connection.clone());
    
    refund_service.get_refund_by_id(refund_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_refunds_by_sale_id(app_handle: AppHandle, sale_id: i32) -> Result<Vec<RefundWithItems>, String> {
    let db = app_handle.state::<Database>();
    let refund_service = RefundService::new(db.connection.clone());
    
    refund_service.get_refunds_by_sale_id(sale_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_all_refunds(app_handle: AppHandle, limit: Option<i32>) -> Result<Vec<RefundWithItems>, String> {
    let db = app_handle.state::<Database>();
    let refund_service = RefundService::new(db.connection.clone());
    
    refund_service.get_all_refunds(limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_refund_status(app_handle: AppHandle, refundid: i32, status: String) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let refund_service = RefundService::new(db.connection.clone());
    
    refund_service.update_refund_status(refundid, status)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_refund_statistics(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    let db = app_handle.state::<Database>();
    let refund_service = RefundService::new(db.connection.clone());
    
    let (total_amount, total_count, today_count) = refund_service.get_refund_statistics()
        .map_err(|e| e.to_string())?;
    
    Ok(serde_json::json!({
        "total_amount": total_amount,
        "total_count": total_count,
        "today_count": today_count
    }))
}

#[tauri::command]
async fn get_categories(app_handle: AppHandle) -> Result<Vec<Category>, String> {
    let db = app_handle.state::<Database>();
    let category_service = CategoryService::new(db.connection.clone());
    
    category_service.get_all_categories()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_category(app_handle: AppHandle, category: Category) -> Result<i32, String> {
    let db = app_handle.state::<Database>();
    let category_service = CategoryService::new(db.connection.clone());
    
    category_service.create_category(&category)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_category(app_handle: AppHandle, category: Category) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let category_service = CategoryService::new(db.connection.clone());
    
    category_service.update_category(&category)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_category(app_handle: AppHandle, id: i32) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let category_service = CategoryService::new(db.connection.clone());
    
    category_service.delete_category(id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_default_categories(app_handle: AppHandle) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let category_service = CategoryService::new(db.connection.clone());
    
    category_service.create_default_categories()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_brands(app_handle: AppHandle) -> Result<Vec<Brand>, String> {
    let db = app_handle.state::<Database>();
    let brand_service = BrandService::new(db.connection.clone());
    
    brand_service.get_all_brands()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_brand(app_handle: AppHandle, brand: Brand) -> Result<i32, String> {
    let db = app_handle.state::<Database>();
    let brand_service = BrandService::new(db.connection.clone());
    
    brand_service.create_brand(&brand)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_brand(app_handle: AppHandle, brand: Brand) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let brand_service = BrandService::new(db.connection.clone());
    
    brand_service.update_brand(&brand)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_brand(app_handle: AppHandle, id: i32) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let brand_service = BrandService::new(db.connection.clone());
    
    brand_service.delete_brand(id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_default_brands(app_handle: AppHandle) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let brand_service = BrandService::new(db.connection.clone());
    
    brand_service.create_default_brands()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_analytics_summary(app_handle: AppHandle) -> Result<AnalyticsSummary, String> {
    let db = app_handle.state::<Database>();
    let analytics_service = AnalyticsService::new(db.connection.clone());
    
    analytics_service.get_analytics_summary()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn track_analytics_event(
    app_handle: AppHandle,
    event_type: String,
    event_data: Option<String>,
    user_id: Option<i32>,
) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let analytics_service = AnalyticsService::new(db.connection.clone());
    
    analytics_service.track_event(&event_type, event_data.as_deref(), user_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn track_product_view(
    app_handle: AppHandle,
    product_id: i32,
    user_id: Option<i32>,
) -> Result<(), String> {
    let db = app_handle.state::<Database>();
    let analytics_service = AnalyticsService::new(db.connection.clone());
    
    analytics_service.track_product_view(product_id, user_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn generate_sales_forecast(
    app_handle: AppHandle,
    product_id: i32,
    days: i32,
) -> Result<Vec<SalesForecast>, String> {
    let db = app_handle.state::<Database>();
    let analytics_service = AnalyticsService::new(db.connection.clone());
    
    analytics_service.generate_sales_forecast(product_id, days)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_sales_trends(app_handle: AppHandle) -> Result<Vec<SalesTrend>, String> {
    let db = app_handle.state::<Database>();
    let analytics_service = AnalyticsService::new(db.connection.clone());
    
    analytics_service.get_sales_trends()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_profit_margins(app_handle: AppHandle) -> Result<Vec<ProfitMarginData>, String> {
    let db = app_handle.state::<Database>();
    let analytics_service = AnalyticsService::new(db.connection.clone());
    
    analytics_service.get_profit_margins()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_top_selling_products(app_handle: AppHandle) -> Result<Vec<ProductPerformance>, String> {
    let db = app_handle.state::<Database>();
    let analytics_service = AnalyticsService::new(db.connection.clone());
    
    analytics_service.get_top_selling_products()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_top_customers(app_handle: AppHandle) -> Result<Vec<CustomerPerformance>, String> {
    let db = app_handle.state::<Database>();
    let analytics_service = AnalyticsService::new(db.connection.clone());
    
    analytics_service.get_top_customers()
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn test_analytics(app_handle: AppHandle) -> Result<String, String> {
    let db = app_handle.state::<Database>();
    let analytics_service = AnalyticsService::new(db.connection.clone());
    
    match analytics_service.get_analytics_summary() {
        Ok(summary) => Ok(format!("Analytics working! Total sales: {}", summary.total_sales)),
        Err(e) => Err(format!("Analytics error: {}", e))
    }
}

#[tauri::command]
async fn create_settings_table(app_handle: AppHandle) -> Result<String, String> {
    let db = app_handle.state::<Database>();
    let connection = db.connection.lock().unwrap();
    
    // Create settings table
    match connection.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ) {
        Ok(_) => {
            // Create settings index
            match connection.execute("CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)", []) {
                Ok(_) => Ok("Settings table created successfully".to_string()),
                Err(e) => Err(format!("Error creating settings index: {}", e))
            }
        },
        Err(e) => Err(format!("Error creating settings table: {}", e))
    }
}

#[tauri::command]
async fn create_sample_data(app_handle: AppHandle) -> Result<String, String> {
    let db = app_handle.state::<Database>();
    let product_service = ProductService::new(db.connection.clone());
    
    println!("Creating sample data...");
    
    // Create sample products with variants
    let sample_products = vec![
        (
            Product {
                id: None,
                name: "Cotton T-Shirt".to_string(),
                brand: "Fashion Brand".to_string(),
                category: "Clothing".to_string(),
                subcategory: Some("T-Shirts".to_string()),
                description: Some("Comfortable cotton t-shirt".to_string()),
                base_price: 500.0,
                cost_price: 300.0,
                barcode: Some("1234567890123".to_string()),
                created_at: None,
                updated_at: None,
            },
            vec![
                ("S", "Blue", "TSHIRT-S-BLUE", 25),
                ("M", "Blue", "TSHIRT-M-BLUE", 30),
                ("L", "Blue", "TSHIRT-L-BLUE", 20),
                ("S", "Red", "TSHIRT-S-RED", 15),
                ("M", "Red", "TSHIRT-M-RED", 25),
            ]
        ),
        (
            Product {
                id: None,
                name: "Denim Jeans".to_string(),
                brand: "Denim Co".to_string(),
                category: "Clothing".to_string(),
                subcategory: Some("Jeans".to_string()),
                description: Some("Classic denim jeans".to_string()),
                base_price: 1200.0,
                cost_price: 800.0,
                barcode: Some("1234567890124".to_string()),
                created_at: None,
                updated_at: None,
            },
            vec![
                ("28", "Blue", "JEANS-28-BLUE", 10),
                ("30", "Blue", "JEANS-30-BLUE", 15),
                ("32", "Blue", "JEANS-32-BLUE", 12),
                ("28", "Black", "JEANS-28-BLACK", 8),
                ("30", "Black", "JEANS-30-BLACK", 10),
            ]
        ),
        (
            Product {
                id: None,
                name: "Casual Shirt".to_string(),
                brand: "Shirt Co".to_string(),
                category: "Clothing".to_string(),
                subcategory: Some("Shirts".to_string()),
                description: Some("Casual cotton shirt".to_string()),
                base_price: 800.0,
                cost_price: 500.0,
                barcode: Some("1234567890125".to_string()),
                created_at: None,
                updated_at: None,
            },
            vec![
                ("S", "White", "SHIRT-S-WHITE", 20),
                ("M", "White", "SHIRT-M-WHITE", 25),
                ("L", "White", "SHIRT-L-WHITE", 18),
                ("M", "Blue", "SHIRT-M-BLUE", 15),
            ]
        ),
    ];
    
    let mut created_count = 0;
    
    for (product, variants) in sample_products {
        // Create the product
        match product_service.create_product(&product) {
            Ok(product_id) => {
                println!("Created product: {} with ID: {}", product.name, product_id);
                
                // Create variants for this product
                for (size, color, sku, stock) in variants {
                    let variant = ProductVariant {
                        id: None,
                        product_id,
                        size: size.to_string(),
                        color: color.to_string(),
                        sku: sku.to_string(),
                        stock_quantity: stock,
                        price_adjustment: 0.0,
                        image_url: None,
                    };
                    
                    match product_service.create_product_variant(&variant) {
                        Ok(variant_id) => {
                            println!("Created variant: {} with ID: {}", sku, variant_id);
                            created_count += 1;
                        },
                        Err(e) => {
                            println!("Error creating variant {}: {}", sku, e);
                        }
                    }
                }
            },
            Err(e) => {
                println!("Error creating product {}: {}", product.name, e);
            }
        }
    }
    
    // Create a default user if none exists
    let user_service = UserService::new(db.connection.clone());
    match user_service.get_user_by_id(1) {
        Ok(_) => {
            println!("Default user already exists");
        },
        Err(_) => {
            // Create default user
            let default_user = User {
                id: None,
                username: "admin".to_string(),
                password_hash: "admin123".to_string(), // In real app, this should be hashed
                role: "admin".to_string(),
                name: "Administrator".to_string(),
                created_at: None,
                last_login: None,
            };
            
            match user_service.create_user(&default_user) {
                Ok(user_id) => {
                    println!("Created default user with ID: {}", user_id);
                },
                Err(e) => {
                    println!("Error creating default user: {}", e);
                }
            }
        }
    }
    
    Ok(format!("Sample data created successfully! Created {} product variants.", created_count))
}


