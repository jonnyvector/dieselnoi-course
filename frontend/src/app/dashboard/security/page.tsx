'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { twoFactorAPI } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function SecurityPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false)

  // Load 2FA status
  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    loadTwoFactorStatus()
  }, [user, router])

  const loadTwoFactorStatus = async () => {
    try {
      const status = await twoFactorAPI.getStatus()
      setTwoFactorEnabled(status.enabled)
    } catch (error) {
      console.error('Failed to load 2FA status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-purple dark:text-gold hover:underline mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Security Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account security and two-factor authentication
          </p>
        </div>

        {/* Two-Factor Authentication Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Two-Factor Authentication
                </h2>
                {twoFactorEnabled && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold rounded">
                    ENABLED
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Add an extra layer of security to your account by requiring a verification code in addition to your password when logging in.
              </p>

              {twoFactorEnabled ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Two-factor authentication is currently <strong>enabled</strong> on your account.
                    You'll need to enter a code from your authenticator app each time you log in.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowBackupCodesModal(true)}
                      className="px-4 py-2 bg-purple dark:bg-gold text-white rounded-lg hover:bg-purple-dark dark:hover:bg-gold-dark transition-colors text-sm font-medium"
                    >
                      Regenerate Backup Codes
                    </button>
                    <button
                      onClick={() => setShowDisableModal(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Disable 2FA
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Two-factor authentication is currently <strong>disabled</strong> on your account.
                    Enable it to add an extra layer of security.
                  </p>
                  <button
                    onClick={() => setShowSetupModal(true)}
                    className="px-4 py-2 bg-purple dark:bg-gold text-white rounded-lg hover:bg-purple-dark dark:hover:bg-gold-dark transition-colors text-sm font-medium"
                  >
                    Enable Two-Factor Authentication
                  </button>
                </div>
              )}
            </div>

            {/* Icon */}
            <div className="ml-4">
              <svg className="w-12 h-12 text-purple dark:text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="mt-6 bg-purple/5 dark:bg-purple/10 border border-purple/20 dark:border-purple/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-purple dark:text-gold mb-2">
            How Two-Factor Authentication Works
          </h3>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
            <li>Download an authenticator app like Google Authenticator, Authy, or 1Password</li>
            <li>Scan the QR code provided during setup</li>
            <li>Enter the 6-digit code from your app to verify</li>
            <li>Save your backup codes in a secure location</li>
            <li>Use backup codes if you lose access to your authenticator app</li>
          </ul>
        </div>
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <SetupTwoFactorModal
          onClose={() => setShowSetupModal(false)}
          onSuccess={() => {
            setTwoFactorEnabled(true)
            setShowSetupModal(false)
          }}
        />
      )}

      {/* Disable Modal */}
      {showDisableModal && (
        <DisableTwoFactorModal
          onClose={() => setShowDisableModal(false)}
          onSuccess={() => {
            setTwoFactorEnabled(false)
            setShowDisableModal(false)
          }}
        />
      )}

      {/* Backup Codes Modal */}
      {showBackupCodesModal && (
        <RegenerateBackupCodesModal
          onClose={() => setShowBackupCodesModal(false)}
        />
      )}
    </div>
  )
}

// ============================================
// Setup Two-Factor Modal
// ============================================

interface SetupTwoFactorModalProps {
  onClose: () => void
  onSuccess: () => void
}

function SetupTwoFactorModal({ onClose, onSuccess }: SetupTwoFactorModalProps) {
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [token, setToken] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadQRCode()
  }, [])

  const loadQRCode = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await twoFactorAPI.setup()
      console.log('2FA Setup response:', response)
      setQrCode(response.qr_code)
      setSecret(response.secret)
    } catch (error: any) {
      console.error('2FA Setup error:', error)
      console.error('Error response:', error.response)

      // If 2FA is already enabled, close modal and refresh status
      if (error.response?.data?.error?.includes('already enabled')) {
        onSuccess() // This will refresh the status and close the modal
        return
      }

      setError(error.response?.data?.error || error.message || 'Failed to generate QR code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (token.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await twoFactorAPI.verify(token)
      console.log('2FA Verify response:', response)
      setBackupCodes(response.backup_codes)
      setStep('backup')
    } catch (error: any) {
      console.error('2FA Verify error:', error)
      const errorMessage = error.response?.data?.error || 'Invalid code. Please try again.'

      // If error says no setup in progress, the device might have been confirmed already
      if (errorMessage.includes('No setup in progress')) {
        // Check if 2FA was actually enabled
        try {
          const status = await twoFactorAPI.getStatus()
          if (status.enabled) {
            // 2FA was enabled successfully, just missing backup codes
            setError('2FA was enabled but backup codes were not saved. Please regenerate backup codes from the main page.')
            setTimeout(() => {
              onSuccess() // Close modal and refresh
            }, 3000)
            return
          }
        } catch (statusError) {
          console.error('Failed to check 2FA status:', statusError)
        }
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadBackupCodes = () => {
    const text = backupCodes.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dieselnoi-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleComplete = () => {
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {step === 'qr' && 'Scan QR Code'}
            {step === 'verify' && 'Enter Verification Code'}
            {step === 'backup' && 'Save Backup Codes'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR Code Step */}
        {step === 'qr' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple dark:border-gold"></div>
              </div>
            ) : error ? (
              <>
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                </div>
                <button
                  onClick={loadQRCode}
                  className="w-full px-4 py-2 bg-purple dark:bg-gold text-white rounded-lg hover:bg-purple-dark dark:hover:bg-gold-dark transition-colors font-medium"
                >
                  Retry
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
                </p>

                {qrCode && (
                  <div className="flex justify-center py-4">
                    <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                  </div>
                )}

                {!qrCode && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-400">QR code not loaded. Please refresh.</p>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Or enter this key manually:
                  </p>
                  <code className="text-sm font-mono text-gray-900 dark:text-white break-all">
                    {secret || 'Loading...'}
                  </code>
                </div>

                <button
                  onClick={() => setStep('verify')}
                  disabled={!qrCode || !secret}
                  className="w-full px-4 py-2 bg-purple dark:bg-gold text-white rounded-lg hover:bg-purple-dark dark:hover:bg-gold-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </>
            )}
          </div>
        )}

        {/* Verify Step */}
        {step === 'verify' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter the 6-digit code from your authenticator app to verify the setup.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Note: Authentication codes change every 30 seconds and can only be used once.
              </p>
            </div>

            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple dark:focus:ring-gold focus:border-transparent"
                autoFocus
              />
            </div>

            {error && (
              <>
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                </div>
                {error.includes('No setup in progress') && (
                  <button
                    onClick={async () => {
                      try {
                        await twoFactorAPI.cancelSetup()
                        setError('')
                        setToken('')
                        setStep('qr')
                        await loadQRCode()
                      } catch (err) {
                        console.error('Failed to reset setup:', err)
                      }
                    }}
                    className="w-full px-4 py-2 bg-yellow-600 dark:bg-yellow-500 text-white rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors font-medium"
                  >
                    Start Fresh (Remove Old QR Code from Google Auth First!)
                  </button>
                )}
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('qr')}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Back
              </button>
              <button
                onClick={handleVerify}
                disabled={loading || token.length !== 6}
                className="flex-1 px-4 py-2 bg-purple dark:bg-gold text-white rounded-lg hover:bg-purple-dark dark:hover:bg-gold-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        )}

        {/* Backup Codes Step */}
        {step === 'backup' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-1">
                Important: Save these backup codes!
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-400">
                Each code can only be used once. Store them in a safe place in case you lose access to your authenticator app.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="text-gray-900 dark:text-white">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDownloadBackupCodes}
                className="flex-1 px-4 py-2 border border-purple dark:border-gold text-purple dark:text-gold rounded-lg hover:bg-purple/10 dark:hover:bg-gold-900/20 transition-colors font-medium"
              >
                Download Codes
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 px-4 py-2 bg-purple dark:bg-gold text-white rounded-lg hover:bg-purple-dark dark:hover:bg-gold-dark transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Disable Two-Factor Modal
// ============================================

interface DisableTwoFactorModalProps {
  onClose: () => void
  onSuccess: () => void
}

function DisableTwoFactorModal({ onClose, onSuccess }: DisableTwoFactorModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDisable = async () => {
    if (!password) {
      setError('Password is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      await twoFactorAPI.disable(password)
      onSuccess()
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to disable 2FA')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Disable Two-Factor Authentication
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-300">
              Disabling two-factor authentication will make your account less secure. Enter your password to confirm.
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple dark:focus:ring-gold focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleDisable}
              disabled={loading || !password}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Regenerate Backup Codes Modal
// ============================================

interface RegenerateBackupCodesModalProps {
  onClose: () => void
}

function RegenerateBackupCodesModal({ onClose }: RegenerateBackupCodesModalProps) {
  const [password, setPassword] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCodes, setShowCodes] = useState(false)

  const handleRegenerate = async () => {
    if (!password) {
      setError('Password is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await twoFactorAPI.regenerateBackupCodes(password)
      setBackupCodes(response.backup_codes)
      setShowCodes(true)
    } catch (error: any) {
      console.error('Regenerate backup codes error:', error)
      console.error('Error response:', error.response)
      const errorMsg = error.response?.data?.error || error.message || 'Failed to regenerate backup codes'
      console.error('Error message:', errorMsg)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadBackupCodes = () => {
    const text = backupCodes.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dieselnoi-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Regenerate Backup Codes
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!showCodes ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                Regenerating backup codes will invalidate your old codes. Make sure to save the new codes in a safe place.
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple dark:focus:ring-gold focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={loading || !password}
                className="flex-1 px-4 py-2 bg-purple dark:bg-gold text-white rounded-lg hover:bg-purple-dark dark:hover:bg-gold-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-900 dark:text-green-300 mb-1">
                New backup codes generated!
              </p>
              <p className="text-xs text-green-800 dark:text-green-400">
                Your old backup codes are no longer valid. Save these new codes in a safe place.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="text-gray-900 dark:text-white">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDownloadBackupCodes}
                className="flex-1 px-4 py-2 border border-purple dark:border-gold text-purple dark:text-gold rounded-lg hover:bg-purple/10 dark:hover:bg-gold-900/20 transition-colors font-medium"
              >
                Download Codes
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-purple dark:bg-gold text-white rounded-lg hover:bg-purple-dark dark:hover:bg-gold-dark transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
