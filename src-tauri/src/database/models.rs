use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[derive(Debug, Serialize, Deserialize)]
pub struct Product {
    pub id: Option<i32>,
    pub name: String,
    pub brand: String,
    pub category: String,
    pub subcategory: String,
    pub description: Option<String>,
    pub base_price: f64,
    pub cost_price: f64,
    pub barcode: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductVariant {
    pub id: Option<i32>,
    pub product_id: i32,
    pub size: String,
    pub color: String,
    pub sku: String,
    pub stock_quantity: i32,
    pub price_adjustment: f64,
    pub image_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Customer {
    pub id: Option<i32>,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub password_hash: String,
    pub role: String,
    pub name: String,
    pub created_at: String,
    pub last_login: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Salesperson {
    pub id: i32,
    pub user_id: i32,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub commission_rate: f64,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Sale {
    pub id: i32,
    pub customer_id: Option<i32>,
    pub user_id: i32,
    pub salesperson_id: Option<i32>,
    pub total_amount: f64,
    pub tax_amount: f64,
    pub discount_amount: f64,
    pub payment_method: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleItem {
    pub id: Option<i32>,
    pub sale_id: i32,
    pub product_variant_id: i32,
    pub quantity: i32,
    pub unit_price: f64,
    pub discount: f64,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Category {
    pub id: Option<i32>,
    pub name: String,
    pub parent_id: Option<i32>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Supplier {
    pub id: Option<i32>,
    pub name: String,
    pub contact_person: String,
    pub phone: String,
    pub email: Option<String>,
    pub address: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Setting {
    pub id: Option<i32>,
    pub key: String,
    pub value: String,
    pub description: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct License {
    pub id: Option<i32>,
    pub license_key: String,
    pub license_type: String,
    pub is_active: bool,
    pub activated_at: Option<String>,
    pub expires_at: Option<String>,
    pub created_at: Option<String>,
}

// Helper functions to convert from database rows
impl Product {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Product {
            id: row.get(0)?,
            name: row.get(1)?,
            brand: row.get(2)?,
            category: row.get(3)?,
            subcategory: row.get(4)?,
            description: row.get(5)?,
            base_price: row.get(6)?,
            cost_price: row.get(7)?,
            barcode: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    }
}

impl ProductVariant {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(ProductVariant {
            id: row.get(0)?,
            product_id: row.get(1)?,
            size: row.get(2)?,
            color: row.get(3)?,
            sku: row.get(4)?,
            stock_quantity: row.get(5)?,
            price_adjustment: row.get(6)?,
            image_url: row.get(7)?,
        })
    }
}

impl Customer {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Customer {
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
            updated_at: row.get(10)?,
        })
    }
}

impl Sale {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
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
    }
}

impl SaleItem {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(SaleItem {
            id: row.get(0)?,
            sale_id: row.get(1)?,
            product_variant_id: row.get(2)?,
            quantity: row.get(3)?,
            unit_price: row.get(4)?,
            discount: row.get(5)?,
            total: row.get(6)?,
        })
    }
}

impl User {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(User {
            id: row.get(0)?,
            username: row.get(1)?,
            password_hash: row.get(2)?,
            role: row.get(3)?,
            name: row.get(4)?,
            created_at: row.get(5)?,
            last_login: row.get(6)?,
        })
    }
}

impl Setting {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Setting {
            id: row.get(0)?,
            key: row.get(1)?,
            value: row.get(2)?,
            description: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }
} 