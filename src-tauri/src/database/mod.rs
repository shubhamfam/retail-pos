pub mod connection;
pub mod models;
pub mod schema;
pub mod migrations;

use rusqlite::{Connection, Result};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

pub struct Database {
    pub connection: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new(app_handle: &AppHandle) -> Result<Self> {
        // Get app data directory using Tauri v2 API
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .expect("Failed to get app data directory");
        
        std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
        
        let db_path = app_dir.join("clothes_shop_pos.db");
        let connection = Connection::open(&db_path)?;
        
        // Initialize database schema
        Self::init_schema(&connection)?;
        
        Ok(Database { 
            connection: Arc::new(Mutex::new(connection)) 
        })
    }
    
    fn init_schema(connection: &Connection) -> Result<()> {
        // Enable foreign keys
        connection.execute("PRAGMA foreign_keys = ON", [])?;
        
        // Run migrations
        migrations::run_migrations(connection)?;
        
        Ok(())
    }
} 