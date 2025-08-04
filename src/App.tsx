import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import Dashboard from './pages/Dashboard/Dashboard';
import Products from './pages/Products/Products';
import Customers from './pages/Customers/Customers';
import POS from './pages/POS/POS';
import Inventory from './pages/Inventory/Inventory';
import Reports from './pages/Reports/Reports';
import Settings from './pages/Settings/Settings';
import Sales from './pages/Sales/Sales';
import Salesperson from './pages/Salesperson/Salesperson';
import Login from './pages/Auth/Login';
import License from './pages/License/License';
import { User } from './types';
import { useKeyboardShortcuts, createNavigationShortcuts } from './hooks/useKeyboardShortcuts';
import { invoke } from '@tauri-apps/api/core';
import './App.css';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  // Removed unused state variables
  const [user, setUser] = useState<User | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [licenseChecked, setLicenseChecked] = useState(false);
  const [licenseExpired, setLicenseExpired] = useState(false);
  const [hasActiveLicense, setHasActiveLicense] = useState(false);

  const handleLogin = (loggedInUser: User) => {
    console.log('Login: Setting user:', loggedInUser);
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('dashboard');
  };

  // Check license status on app start
  useEffect(() => {
    const checkLicense = async () => {
      try {
        // Create predefined licenses if they don't exist
        await invoke('create_predefined_licenses');
        
        // Get active license
        const activeLicense = await invoke<any>('get_active_license');
        const hasLicense = activeLicense !== null;
        console.log('App: License check - activeLicense:', activeLicense, 'hasLicense:', hasLicense);
        setHasActiveLicense(hasLicense);
        
        if (hasLicense) {
          // Check if license is expired
          const expired = await invoke<boolean>('is_license_expired');
          console.log('App: License check - expired:', expired);
          setLicenseExpired(expired);
        } else {
          console.log('App: License check - no license found');
          setLicenseExpired(false); // No license, not expired
        }
        
        setLicenseChecked(true);
      } catch (error) {
        console.error('Error checking license:', error);
        // If there's an error, assume no license and show activation screen
        setHasActiveLicense(false);
        setLicenseExpired(false);
        setLicenseChecked(true);
      }
    };

    checkLicense();
  }, []);

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      ...createNavigationShortcuts(setCurrentPage),
      {
        key: 'F1',
        action: () => setShowShortcutsHelp(true),
        description: 'Show keyboard shortcuts help'
      },
      {
        key: 'Escape',
        action: () => {
          if (showShortcutsHelp) {
            setShowShortcutsHelp(false);
          }
        },
        description: 'Close shortcuts help modal'
      }
    ]
  });

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard setCurrentPage={setCurrentPage} />;
      case 'pos':
        return user ? <POS setCurrentPage={setCurrentPage} user={user} /> : <div>Loading...</div>;
      case 'products':
        return <Products setCurrentPage={setCurrentPage} />;
      case 'customers':
        return <Customers setCurrentPage={setCurrentPage} />;
      case 'inventory':
        return <Inventory setCurrentPage={setCurrentPage} />;
      case 'reports':
        return <Reports setCurrentPage={setCurrentPage} />;
      case 'sales':
        return <Sales setCurrentPage={setCurrentPage} />;
      case 'salesperson':
        return <Salesperson setCurrentPage={setCurrentPage} />;
      case 'settings':
        return <Settings setCurrentPage={setCurrentPage} />;
      case 'license':
        return <License setCurrentPage={setCurrentPage} onLicenseActivated={() => {
          setLicenseExpired(false);
          setCurrentPage('dashboard');
        }} />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} />;
    }
  };

  // Debug user state
  console.log('App: Current user state:', user);
  console.log('App: License state - hasActiveLicense:', hasActiveLicense, 'licenseExpired:', licenseExpired, 'licenseChecked:', licenseChecked);
  
  // Show loading while checking license
  if (!licenseChecked) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Checking license...</div>
      </div>
    );
  }
  
  // If no active license or license is expired, show license page
  if (!hasActiveLicense || licenseExpired) {
    console.log('App: Showing license page - hasActiveLicense:', hasActiveLicense, 'licenseExpired:', licenseExpired);
    return <License setCurrentPage={setCurrentPage} onLicenseActivated={() => {
      setHasActiveLicense(true);
      setLicenseExpired(false);
      setCurrentPage('dashboard');
    }} />;
  }
  
  // If user is not authenticated, show login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Provider store={store}>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 text-white p-6">
          <h1 className="text-2xl font-bold mb-8">Clothes Shop POS</h1>
          
          {/* User Info */}
          <div className="mt-auto p-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">A</span>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Administrator</p>
                  <p className="text-gray-400 text-xs">Admin</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-gray-700"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
          
          <nav className="space-y-4">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'dashboard' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setCurrentPage('pos')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'pos' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              🛒 POS
            </button>
            <button
              onClick={() => setCurrentPage('products')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'products' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              📦 Products
            </button>
            <button
              onClick={() => setCurrentPage('customers')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'customers' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              👥 Customers
            </button>
            <button
              onClick={() => setCurrentPage('sales')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'sales' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              📊 Sales
            </button>
            <button
              onClick={() => setCurrentPage('salesperson')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'salesperson' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              👨‍💼 Salesperson
            </button>
            <button
              onClick={() => setCurrentPage('inventory')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'inventory' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              📋 Inventory
            </button>
            <button
              onClick={() => setCurrentPage('reports')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'reports' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              📈 Reports
            </button>
            <button
              onClick={() => setCurrentPage('settings')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'settings' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => setCurrentPage('license')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'license' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
            >
              🔑 License
            </button>
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                ⌨️ Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Navigation Shortcuts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">Dashboard</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl/Cmd + D</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">POS</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl/Cmd + P</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">Products</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl/Cmd + B</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">Customers</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl/Cmd + C</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">Inventory</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl/Cmd + I</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">Reports</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl/Cmd + R</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">Sales</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl/Cmd + S</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">Salesperson</span>
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl/Cmd + L</kbd>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">POS Shortcuts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="text-blue-700">Focus Price Input</span>
                    <kbd className="px-2 py-1 bg-blue-200 rounded text-sm">⌘ + P</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="text-blue-700">Close Modals</span>
                    <kbd className="px-2 py-1 bg-blue-200 rounded text-sm">Escape</kbd>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">General Shortcuts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-green-700">Show This Help</span>
                    <kbd className="px-2 py-1 bg-green-200 rounded text-sm">F1</kbd>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-green-700">Close Forms/Modals</span>
                    <kbd className="px-2 py-1 bg-green-200 rounded text-sm">Escape</kbd>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded">
                <p><strong>Tip:</strong> These shortcuts work from any page in the application.</p>
                <p><strong>Note:</strong> Use Cmd on Mac and Ctrl on Windows/Linux.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Provider>
  );
};

export default App;
