use rusqlite::{Connection, Result};

pub const CURRENT_VERSION: u32 = 8;

pub fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    let current_version = get_current_version(conn)?;
    
    if current_version < 1 {
        run_migration_1(conn)?;
    }
    if current_version < 2 {
        run_migration_2(conn)?;
    }
    if current_version < 3 {
        run_migration_3(conn)?;
    }
    if current_version < 4 {
        run_migration_4(conn)?;
    }
    if current_version < 5 {
        run_migration_5(conn)?;
    }
                    if current_version < 6 {
                    run_migration_6(conn)?;
                }
                        if current_version < 7 {
            run_migration_7(conn)?;
        }
        if current_version < 8 {
            run_migration_8(conn)?;
        }
    
    Ok(())
}

fn get_current_version(conn: &Connection) -> Result<u32, rusqlite::Error> {
    // Create version table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS db_version (version INTEGER PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
        [],
    )?;

    // Get current version
    let current_version: u32 = conn
        .query_row("SELECT COALESCE(MAX(version), 0) FROM db_version", [], |row| row.get(0))
        .unwrap_or(0);

    println!("Current database version: {}", current_version);
    Ok(current_version)
}

fn run_migration_4(conn: &Connection) -> Result<(), rusqlite::Error> {
    println!("Running migration 4: Adding salesperson_id to sales table and settings table");
    
    // Create salespersons table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS salespersons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            commission_rate REAL DEFAULT 0.0,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )",
        [],
    )?;
    
    // Add salesperson_id column to sales table if it doesn't exist
    conn.execute(
        "ALTER TABLE sales ADD COLUMN salesperson_id INTEGER REFERENCES salespersons (id)",
        [],
    ).ok(); // Use .ok() to ignore if column already exists

    // Create settings table
    conn.execute(
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
    conn.execute("CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)", [])?;

    // Update version
    conn.execute(
        "INSERT OR REPLACE INTO db_version (version) VALUES (?)",
        [4],
    )?;

    println!("Migration 4 completed successfully");
    Ok(())
}

pub fn run_migration_5(conn: &Connection) -> Result<(), rusqlite::Error> {
    println!("Running migration 5: Adding licenses table");
    
    // Create licenses table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS licenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            license_key TEXT UNIQUE NOT NULL,
            license_type TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            activated_at DATETIME,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    // Create license indexes
    conn.execute("CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_licenses_active ON licenses(is_active)", [])?;

    // Update version
    conn.execute(
        "INSERT OR REPLACE INTO db_version (version) VALUES (?)",
        [5],
    )?;

    println!("Migration 5 completed successfully");
    Ok(())
}

fn run_migration_1(connection: &Connection) -> Result<()> {
    println!("Running migration 1: Initial schema");
    
    // Create initial tables
    connection.execute_batch(
        r#"
        -- Products table
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            brand TEXT NOT NULL,
            category TEXT NOT NULL,
            subcategory TEXT,
            description TEXT,
            base_price REAL NOT NULL,
            cost_price REAL NOT NULL,
            barcode TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Product variants table
        CREATE TABLE IF NOT EXISTS product_variants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            size TEXT NOT NULL,
            color TEXT NOT NULL,
            sku TEXT UNIQUE NOT NULL,
            stock_quantity INTEGER DEFAULT 0,
            price_adjustment REAL DEFAULT 0,
            image_url TEXT,
            FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
        );

        -- Categories table
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            parent_id INTEGER,
            description TEXT,
            FOREIGN KEY (parent_id) REFERENCES categories (id)
        );

        -- Users table
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        );

        -- Sales table
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            user_id INTEGER NOT NULL,
            salesperson_id INTEGER,
            total_amount REAL NOT NULL,
            tax_amount REAL NOT NULL,
            discount_amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (salesperson_id) REFERENCES salespersons (id)
        );

        -- Sale items table
        CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL,
            product_variant_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            discount REAL DEFAULT 0,
            total REAL NOT NULL,
            FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
            FOREIGN KEY (product_variant_id) REFERENCES product_variants (id)
        );

        -- Suppliers table
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact_person TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            address TEXT
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
        CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
        CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
        CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
        CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
        CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        "#,
    )?;

    Ok(())
}

fn run_migration_2(connection: &Connection) -> Result<()> {
    println!("Running migration 2: Updated customers table");
    
    // Check if old customers table exists
    let table_exists: bool = connection
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='customers'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if table_exists {
        // Check if old schema (has birthday column)
        let has_birthday: bool = connection
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('customers') WHERE name='birthday'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if has_birthday {
            // Backup old data
            connection.execute(
                "CREATE TABLE customers_backup AS SELECT * FROM customers",
                [],
            )?;

            // Drop old table
            connection.execute("DROP TABLE customers", [])?;
        }
    }

    // Create new customers table
    connection.execute(
        r#"
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            address TEXT,
            city TEXT,
            state TEXT,
            zip_code TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        "#,
        [],
    )?;

    // Create customer indexes
    connection.execute("CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)", [])?;
    connection.execute("CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)", [])?;

    Ok(())
}

fn run_migration_3(connection: &Connection) -> Result<()> {
    println!("Running migration 3: Updated sales table schema");
    
    // Check if old sales table exists
    let table_exists: bool = connection
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sales'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if table_exists {
        // Check if old schema (has customer_id column)
        let has_old_schema: bool = connection
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('sales') WHERE name='customer_id'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if has_old_schema {
            // Backup old data
            connection.execute(
                "CREATE TABLE sales_backup AS SELECT * FROM sales",
                [],
            )?;

            // Drop old table
            connection.execute("DROP TABLE sales", [])?;
        }
    }

    // Create new sales table
    connection.execute(
        r#"
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            user_id INTEGER NOT NULL,
            salesperson_id INTEGER,
            total_amount REAL NOT NULL,
            tax_amount REAL NOT NULL,
            discount_amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (salesperson_id) REFERENCES salespersons (id)
        )
        "#,
        [],
    )?;

    // Check if old sale_items table exists
    let items_table_exists: bool = connection
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sale_items'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if items_table_exists {
        // Check if old schema (has sale_id column)
        let has_old_items_schema: bool = connection
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('sale_items') WHERE name='sale_id'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if has_old_items_schema {
            // Backup old data
            connection.execute(
                "CREATE TABLE sale_items_backup AS SELECT * FROM sale_items",
                [],
            )?;

            // Drop old table
            connection.execute("DROP TABLE sale_items", [])?;
        }
    }

    // Create new sale_items table
    connection.execute(
        r#"
        CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL,
            product_variant_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            discount REAL DEFAULT 0,
            total REAL NOT NULL,
            FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
            FOREIGN KEY (product_variant_id) REFERENCES product_variants (id)
        )
        "#,
        [],
    )?;

    // Create sales indexes
    connection.execute("CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id)", [])?;
    connection.execute("CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)", [])?;
    connection.execute("CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)", [])?;

    Ok(())
}

pub fn run_migration_6(conn: &Connection) -> Result<(), rusqlite::Error> {
    println!("Running migration 6: Adding refunds and refund_items tables");
    
    // Create refunds table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS refunds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            refund_amount REAL NOT NULL,
            refund_reason TEXT NOT NULL,
            refund_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            processed_at DATETIME,
            FOREIGN KEY (sale_id) REFERENCES sales (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )",
        [],
    )?;
    
    // Create refund_items table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS refund_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            refund_id INTEGER NOT NULL,
            sale_item_id INTEGER NOT NULL,
            product_variant_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            refund_amount REAL NOT NULL,
            reason TEXT,
            FOREIGN KEY (refund_id) REFERENCES refunds (id) ON DELETE CASCADE,
            FOREIGN KEY (sale_item_id) REFERENCES sale_items (id),
            FOREIGN KEY (product_variant_id) REFERENCES product_variants (id)
        )",
        [],
    )?;
    
    // Create refund indexes
    conn.execute("CREATE INDEX IF NOT EXISTS idx_refunds_sale_id ON refunds(sale_id)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_refund_items_refund_id ON refund_items(refund_id)", [])?;

    // Update version
    conn.execute(
        "INSERT OR REPLACE INTO db_version (version) VALUES (?)",
        [6],
    )?;

    println!("Migration 6 completed successfully");
    Ok(())
}

pub fn run_migration_7(conn: &Connection) -> Result<(), rusqlite::Error> {
    println!("Running migration 7: Adding brands table");
    
    // Create brands table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS brands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    // Create brand indexes
    conn.execute("CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name)", [])?;

    // Update version
    conn.execute(
        "INSERT OR REPLACE INTO db_version (version) VALUES (?)",
        [7],
    )?;

    println!("Migration 7 completed successfully");
    Ok(())
}

pub fn run_migration_8(conn: &Connection) -> Result<(), rusqlite::Error> {
    println!("Running migration 8: Adding analytics tables");
    
    // Create analytics_events table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS analytics_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            event_data TEXT,
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )",
        [],
    )?;
    
    // Create product_views table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS product_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            user_id INTEGER,
            viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )",
        [],
    )?;
    
    // Create sales_forecasts table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sales_forecasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            forecast_date DATE NOT NULL,
            predicted_quantity INTEGER NOT NULL,
            confidence_level REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products (id)
        )",
        [],
    )?;
    
    // Create profit_margins table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS profit_margins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            sale_id INTEGER NOT NULL,
            cost_price REAL NOT NULL,
            selling_price REAL NOT NULL,
            profit_margin REAL NOT NULL,
            profit_percentage REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products (id),
            FOREIGN KEY (sale_id) REFERENCES sales (id)
        )",
        [],
    )?;
    
    // Create analytics indexes
    conn.execute("CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_product_views_viewed_at ON product_views(viewed_at)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_sales_forecasts_date ON sales_forecasts(forecast_date)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_profit_margins_product_id ON profit_margins(product_id)", [])?;

    // Update version
    conn.execute(
        "INSERT OR REPLACE INTO db_version (version) VALUES (?)",
        [8],
    )?;

    println!("Migration 8 completed successfully");
    Ok(())
}

 