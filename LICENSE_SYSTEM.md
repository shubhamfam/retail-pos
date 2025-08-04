# License System Implementation

## Overview
The Clothes Shop POS application now includes a 15-day trial license system. Users must activate a trial license to access the application, and after 15 days, they will be prompted to contact support for full access.

## Features

### Trial License System
- **15-day trial period**: Users get 15 days of full access after activating a trial license
- **Predefined trial keys**: 5 predefined trial license keys are available
- **License validation**: System validates license keys against the database
- **Expiration handling**: App blocks access when trial expires
- **Contact support**: Expired users are directed to contact support

### Available Trial Keys
The following trial license keys are pre-configured in the database:
- `TRIAL-2024-001-ABCD`
- `TRIAL-2024-002-EFGH`
- `TRIAL-2024-003-IJKL`
- `TRIAL-2024-004-MNOP`
- `TRIAL-2024-005-QRST`

## How It Works

### 1. Application Startup
- App checks for active license on startup
- If no active license or license is expired, shows license activation screen
- If license is valid, proceeds to normal login flow

### 2. License Activation
- User enters a trial license key
- System validates the key against predefined keys in database
- If valid, license is activated with 15-day expiration
- User gains access to full application

### 3. During Trial Period
- Full application functionality available
- License status shown in License page
- Days remaining displayed

### 4. After Expiration
- App blocks access to all features
- Shows expiration screen with contact information
- User must contact support for full license

## Technical Implementation

### Database Schema
```sql
CREATE TABLE licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT UNIQUE NOT NULL,
    license_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    activated_at DATETIME,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Backend Commands
- `validate_license(license_key)` - Validates a license key
- `activate_license(license_key)` - Activates a license with 15-day expiration
- `get_active_license()` - Gets the currently active license
- `is_license_expired()` - Checks if current license is expired
- `create_predefined_licenses()` - Creates predefined trial keys

### Frontend Components
- `License.tsx` - License activation and status page
- License checking integrated into main App component
- License status displayed in sidebar navigation

## Usage

### For Users
1. Start the application
2. If prompted, enter one of the trial license keys
3. Use the application for 15 days
4. Contact support when trial expires

### For Developers
1. The license system is automatically initialized on first run
2. Predefined trial keys are created in the database
3. License checking is integrated into the app startup flow
4. License page accessible via sidebar navigation

## Support Contact
For full license access, users should contact: **gaikwad.shubham1311@gmail.com**

## Future Enhancements
- Online license validation
- Automatic license renewal
- Multiple license types (monthly, yearly, etc.)
- License key generation system
- Payment integration 