use rusqlite::{Connection, Result};

pub const CURRENT_VERSION: u32 = 4;

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
    println!("Running migration 4: Adding salesperson_id to sales table");
    
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

    // Update version
    conn.execute(
        "INSERT OR REPLACE INTO db_version (version) VALUES (?)",
        [4],
    )?;

    println!("Migration 4 completed successfully");
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