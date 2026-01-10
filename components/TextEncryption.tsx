'use client'

import { useState, useEffect } from 'react'

export default function TextEncryption() {
  const [inputText, setInputText] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [outputText, setOutputText] = useState('')
  const [isEncrypting, setIsEncrypting] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastEncryptedText, setLastEncryptedText] = useState('')
  const [lastDecryptedText, setLastDecryptedText] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Auto-populate when switching modes (like Mac app)
  useEffect(() => {
    if (isEncrypting && lastDecryptedText) {
      setInputText(lastDecryptedText)
      setOutputText('')
    } else if (!isEncrypting && lastEncryptedText) {
      setInputText(lastEncryptedText)
      setOutputText('')
    }
  }, [isEncrypting])

  const processText = async () => {
    console.log('[TextEncryption] Encrypt/Decrypt button clicked')
    console.log('[TextEncryption] inputText:', inputText)
    console.log('[TextEncryption] userPassword:', userPassword)
    console.log('[TextEncryption] isEncrypting:', isEncrypting)
    setLoading(true)
    setError('')

    if (!inputText.trim()) {
      setError('Please enter some text')
      setLoading(false)
      console.log('[TextEncryption] Error: No input text')
      return
    }
    if (!userPassword.trim()) {
      setError('Please enter a password for encryption/decryption')
      setLoading(false)
      console.log('[TextEncryption] Error: No password')
      return
    }
    try {
      const token = localStorage.getItem('auth_token')
      console.log('[TextEncryption] token before fetch:', token)
      const endpoint = isEncrypting ? '/api/encrypt/text' : '/api/decrypt/text'
      const body = isEncrypting
        ? { text: inputText, password: userPassword }
        : { encryptedText: inputText, password: userPassword };
      console.log('[TextEncryption] Fetching:', endpoint, 'with body:', body)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      console.log('[TextEncryption] Response status:', response.status, response.statusText)
      const data = await response.json()
      console.log('[TextEncryption] Response data:', data)
      if (response.ok) {
        setOutputText(data.encryptedText || data.decryptedText || data.result)
        // Save to history
        if (isEncrypting) {
          setLastEncryptedText(data.encryptedText || data.result)
        } else {
          setLastDecryptedText(data.decryptedText || data.result)
        }
        console.log('[TextEncryption] Success:', data)
      } else {
        setError(data.error || 'Processing failed')
        console.log('[TextEncryption] Error:', data.error || 'Processing failed')
      }
    } catch (err) {
      setError('Connection error. Please ensure the backend server is running.')
      console.error('[TextEncryption] Encryption error:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputText)
    // Show copied feedback
    const originalError = error
    setError('Copied to clipboard!')
    setTimeout(() => setError(originalError), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          {isEncrypting ? 'Enter text to encrypt:' : 'Enter encrypted text:'}
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="mac-textarea mac-input w-full h-40 px-4 py-3 text-gray-900 resize-none"
          placeholder={isEncrypting ? 'Type your message here...' : 'Paste encrypted text here...'}
        />
        <label className="block text-sm font-semibold text-gray-700 mt-2">
          Password for encryption/decryption:
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
            placeholder="Enter encryption password"
            className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-1">Password length: {userPassword.length} chars</p>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={processText}
        disabled={!inputText || loading}
        className={`mac-button w-full py-4 px-6 rounded-lg text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
          isEncrypting
            ? 'bg-gradient-to-r from-blue-500 to-blue-600'
            : 'bg-gradient-to-r from-green-500 to-green-600'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isEncrypting ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              )}
            </svg>
            {isEncrypting ? 'Encrypt' : 'Decrypt'}
          </span>
        )}
      </button>
    </div>
  )
}
