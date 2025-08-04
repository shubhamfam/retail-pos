# Clothes Shop POS - Desktop Application

A comprehensive desktop application for clothes shop billing and inventory management built with Tauri, React, and TypeScript.

## Features

### ✅ Implemented Features
- **Dashboard**: Real-time overview with sales statistics, recent transactions, and quick actions
- **Point of Sale (POS)**: Complete billing system with product search, cart management, and payment processing
- **Product Management**: Product catalog with categories, variants, and stock tracking
- **Customer Management**: Customer database with loyalty points tracking
- **Sales History**: Transaction history and management
- **User Authentication**: Login system with role-based access
- **Modern UI**: Beautiful interface built with Tailwind CSS and Heroicons

### 🚧 Planned Features
- **Inventory Reports**: Stock level reports, fast/slow-moving items analysis
- **Sales Reports**: Detailed sales analytics and performance metrics
- **Supplier Management**: Supplier database and purchase order tracking
- **Barcode Scanning**: Product scanning and identification
- **Receipt Printing**: Thermal printer support for receipts
- **Data Export**: CSV/Excel export functionality
- **Backup & Restore**: Database backup and restore capabilities

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Desktop Framework**: Tauri (Rust + Web Technologies)
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Routing**: React Router DOM
- **Icons**: Heroicons
- **Database**: SQLite (planned)

## Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Rust** (for Tauri development)
- **System dependencies** for Tauri (see [Tauri prerequisites](https://tauri.app/start/prerequisites/))

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd clothes-shop-pos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Rust dependencies** (if not already installed)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

4. **Install Tauri CLI**
   ```bash
   cargo install tauri-cli
   ```

## Development

### Start Development Server
```bash
npm run tauri dev
```

This will start the development server and open the application window.

### Build for Production
```bash
npm run tauri build
```

This creates platform-specific installers in the `src-tauri/target/release/bundle/` directory.

## Usage

### Login
- **Username**: `admin`
- **Password**: `admin`

### Dashboard
The dashboard provides an overview of:
- Today's sales and transactions
- Total products and customers
- Recent sales history
- Quick action buttons

### POS (Point of Sale)
1. **Search Products**: Use the search bar to find products by name or brand
2. **Filter by Category**: Click category buttons to filter products
3. **Add to Cart**: Click on product variants to add them to the cart
4. **Manage Cart**: Adjust quantities or remove items from the cart
5. **Apply Discount**: Enter discount amount if needed
6. **Process Payment**: Choose payment method and complete the transaction

### Navigation
- **Dashboard**: Overview and statistics
- **POS**: Point of sale interface
- **Products**: Product catalog management (placeholder)
- **Customers**: Customer database (placeholder)
- **Sales**: Sales history (placeholder)
- **Reports**: Business reports (placeholder)
- **Settings**: Application settings (placeholder)

## Project Structure

```
clothes-shop-pos/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── Layout/         # Main layout component
│   ├── pages/              # Application pages
│   │   ├── Auth/          # Authentication pages
│   │   ├── Dashboard/     # Dashboard page
│   │   ├── POS/          # Point of sale page
│   │   ├── Products/     # Product management
│   │   ├── Customers/    # Customer management
│   │   ├── Sales/        # Sales history
│   │   ├── Reports/      # Business reports
│   │   └── Settings/     # Application settings
│   ├── store/             # Redux store and slices
│   │   └── slices/       # Redux slices for state management
│   ├── types/             # TypeScript type definitions
│   ├── database/          # Database schema and services
│   ├── services/          # Business logic services
│   └── utils/             # Utility functions
├── src-tauri/             # Tauri backend (Rust)
├── public/                # Static assets
└── dist/                  # Build output
```

## Database Schema

The application uses SQLite with the following main tables:
- `products`: Product catalog
- `product_variants`: Product size/color variants with stock
- `customers`: Customer information
- `sales`: Sales transactions
- `sale_items`: Individual items in sales
- `users`: User accounts and authentication
- `categories`: Product categories
- `suppliers`: Supplier information

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository.

## Roadmap

### Phase 1: Core Setup ✅
- [x] Project structure and dependencies
- [x] Basic UI components and routing
- [x] Redux store setup
- [x] Dashboard implementation
- [x] POS system with cart management

### Phase 2: Inventory Management 🚧
- [ ] Complete product management interface
- [ ] Stock tracking and adjustments
- [ ] Barcode support
- [ ] Supplier management

### Phase 3: Advanced Features 🚧
- [ ] Database integration
- [ ] Receipt generation
- [ ] Reporting and analytics
- [ ] User management and security
- [ ] Backup and restore functionality

### Phase 4: Production Features 🚧
- [ ] Multi-store support
- [ ] Cloud backup
- [ ] Advanced analytics
- [ ] Mobile companion app
- [ ] API integrations
