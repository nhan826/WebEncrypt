'use client'

import { useState, useEffect } from 'react'

export default function TextEncryption() {
  const [inputText, setInputText] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [outputText, setOutputText] = useState('')
  const [isEncrypting, setIsEncrypting] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastEncryptedText, setLastEncryptedText] = useState('')
  const [lastDecryptedText, setLastDecryptedText] = useState('')

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
    if (!inputText.trim()) {
      setError('Please enter some text')
      return
    }

    setLoading(true)
    setError('')

    if (!userPassword.trim()) {
      setError('Please enter a password for encryption/decryption')
      setLoading(false)
      return
    }
    try {
      const token = localStorage.getItem('auth_token')
      const endpoint = isEncrypting ? '/api/encrypt/text' : '/api/decrypt/text'
      const body = isEncrypting
        ? { text: inputText, password: userPassword }
        : { encryptedText: inputText, password: userPassword };
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        setOutputText(data.encryptedText || data.decryptedText || data.result)
        // Save to history
        if (isEncrypting) {
          setLastEncryptedText(data.encryptedText || data.result)
        } else {
          setLastDecryptedText(data.decryptedText || data.result)
        }
      } else {
        setError(data.error || 'Processing failed')
      }
    } catch (err) {
      setError('Connection error. Please ensure the backend server is running.')
      console.error('Encryption error:', err)
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
      {/* Title */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Text Encryption</h2>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button
            onClick={() => setIsEncrypting(true)}
            className={`px-6 py-2 rounded-md font-medium transition-all ${
              isEncrypting
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Encrypt
          </button>
          <button
            onClick={() => setIsEncrypting(false)}
            className={`px-6 py-2 rounded-md font-medium transition-all ${
              !isEncrypting
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Decrypt
          </button>
        </div>
      </div>

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
        <label className="block text-sm font-semibold text-gray-700 mt-2">Password for encryption/decryption:</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
            className="mac-input w-full px-4 py-2 text-gray-900 border rounded pr-10"
            placeholder="Enter a password..."
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575m2.1-2.1A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.402 3.22-1.125 4.575m-2.1 2.1A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M9.88 9.88A3 3 0 0112 9c1.657 0 3 1.343 3 3 0 .512-.13.995-.36 1.41m-1.41 1.41A3 3 0 0112 15c-1.657 0-3-1.343-3-3 0-.512.13-.995.36-1.41m1.41-1.41A3 3 0 0112 9c1.657 0 3 1.343 3 3 0 .512-.13.995-.36 1.41m-1.41 1.41A3 3 0 0112 15c-1.657 0-3-1.343-3-3 0-.512.13-.995.36-1.41m1.41-1.41A3 3 0 0112 9c1.657 0 3 1.343 3 3 0 .512-.13.995-.36 1.41m-1.41 1.41A3 3 0 0112 15c-1.657 0-3-1.343-3-3 0-.512.13-.995.36-1.41" /></svg>
            )}
          </button>
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

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Output Section */}
      {outputText && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-semibold text-gray-700">Result:</label>
            <button
              onClick={copyToClipboard}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </button>
          </div>
          <textarea
            value={outputText}
            readOnly
            className="mac-textarea mac-input w-full h-40 px-4 py-3 text-gray-900 resize-none bg-gray-50"
          />
        </div>
      )}
    </div>
  )
}
