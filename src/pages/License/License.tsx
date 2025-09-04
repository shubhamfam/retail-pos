import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface License {
  id?: number;
  license_key: string;
  license_type: string;
  is_active: boolean;
  activated_at?: string;
  expires_at?: string;
  created_at?: string;
}

interface LicenseProps {
  setCurrentPage: (page: string) => void;
  onLicenseActivated?: () => void;
}

const License: React.FC<LicenseProps> = ({ setCurrentPage, onLicenseActivated }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [activeLicense, setActiveLicense] = useState<License | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    checkLicenseStatus();
  }, []);

  // Auto-redirect to dashboard if license is active and not expired
  useEffect(() => {
    if (activeLicense && !isExpired && !loading) {
      console.log('License is active and not expired, redirecting to dashboard');
      setCurrentPage('dashboard');
    }
  }, [activeLicense, isExpired, loading, setCurrentPage]);

  const checkLicenseStatus = async () => {
    try {
      setLoading(true);
      
      // Get active license first
      const license = await invoke<License | null>('get_active_license');
      setActiveLicense(license);
      
      if (license) {
        try {
          // Check if license is expired
          const expired = await invoke<boolean>('is_license_expired');
          setIsExpired(expired);
          
          if (expired) {
            setMessage('Your trial license has expired. Please contact gaikwad.shubham1311@gmail.com for full access.');
            setMessageType('error');
          } else {
            const daysLeft = calculateDaysLeft(license.expires_at!);
            setMessage(`Trial license active. ${daysLeft} days remaining.`);
            setMessageType('info');
            
            // Notify parent component that license is active
            if (onLicenseActivated) {
              onLicenseActivated();
            }
          }
        } catch (error) {
          console.error('Error checking license expiration:', error);
          // If there's a date parsing error, assume license is valid for now
          setIsExpired(false);
          setMessage(`Trial license active. Please check console for details.`);
          setMessageType('info');
          
          // Notify parent component that license is active
          if (onLicenseActivated) {
            onLicenseActivated();
          }
        }
      } else {
        // No active license
        setIsExpired(false);
        setMessage('No active license found. Please activate a trial license.');
        setMessageType('info');
      }
    } catch (error) {
      console.error('Error checking license status:', error);
      // If there's a database error, assume no license is active
      setIsExpired(false);
      setActiveLicense(null);
      setMessage('No active license found. Please activate a trial license.');
      setMessageType('info');
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysLeft = (expiresAt: string): number => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      setMessage('Please enter a license key.');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      
      // Validate license
      const license = await invoke<License | null>('validate_license', { licenseKey });
      
      if (!license) {
        setMessage('Invalid license key. Please try again.');
        setMessageType('error');
        return;
      }

      // Activate license
      await invoke('activate_license', { licenseKey });
      
      setMessage('License activated successfully! You have 15 days of trial access.');
      setMessageType('success');
      setLicenseKey('');
      
      // Refresh license status
      await checkLicenseStatus();
      
      // Notify parent component
      if (onLicenseActivated) {
        onLicenseActivated();
      }
      
    } catch (error) {
      console.error('Error activating license:', error);
      setMessage('Error activating license. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSupport = () => {
            window.open('mailto:gaikwad.shubham1311@gmail.com?subject=License Request - posly', '_blank');
  };

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Trial License Expired</h2>
            <p className="mt-2 text-gray-600">
              Your 15-day trial period has ended. To continue using the application, please purchase a full license.
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={handleContactSupport}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contact Support
            </button>
            <p className="text-sm text-gray-500">
              Email: gaikwad.shubham1311@gmail.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">License Activation</h1>
          <p className="text-gray-600">Enter your trial license key to activate the application</p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${
            messageType === 'success' ? 'bg-green-100 text-green-700' :
            messageType === 'error' ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {message}
          </div>
        )}

        {activeLicense ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-green-800 mb-2">License Active</h3>
            <p className="text-green-700 mb-2">License Key: {activeLicense.license_key}</p>
            <p className="text-green-700 mb-2">Type: {activeLicense.license_type}</p>
            {activeLicense.expires_at && (
              <p className="text-green-700">
                Expires: {new Date(activeLicense.expires_at).toLocaleDateString()} 
                ({calculateDaysLeft(activeLicense.expires_at)} days left)
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="licenseKey" className="block text-sm font-medium text-gray-700 mb-2">
                License Key
              </label>
              <input
                type="text"
                id="licenseKey"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Enter your license key"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleActivateLicense}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Activating...' : 'Activate License'}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Please contact support for trial license keys</p>
              <p className="text-xs text-gray-500">Email: gaikwad.shubham1311@gmail.com</p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              // Update the App state to recognize the active license
              if (onLicenseActivated) {
                onLicenseActivated();
              }
              setCurrentPage('dashboard');
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default License; 