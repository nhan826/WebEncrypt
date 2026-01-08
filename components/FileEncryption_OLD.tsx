'use client'

import { useState, useEffect } from 'react'

export default function FileEncryption() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [headSize, setHeadSize] = useState('0')
  const [isEncrypting, setIsEncrypting] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultMessage, setResultMessage] = useState('')
  const [originalPreview, setOriginalPreview] = useState<string | null>(null)
  const [encryptedPreview, setEncryptedPreview] = useState<string | null>(null)
  const [decryptedPreview, setDecryptedPreview] = useState<string | null>(null)
  const [lastEncryptedFile, setLastEncryptedFile] = useState<{blob: Blob, name: string} | null>(null)
  const [lastDecryptedFile, setLastDecryptedFile] = useState<{blob: Blob, name: string} | null>(null)

  // Auto-load last file when switching modes (like Mac app)
  useEffect(() => {
    if (!isEncrypting && lastEncryptedFile) {
      // Switching to decrypt - load encrypted file
      const file = new File([lastEncryptedFile.blob], lastEncryptedFile.name, { type: 'application/octet-stream' })
      setSelectedFile(file)
      // Show encrypted preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setOriginalPreview(e.target?.result as string)
        setEncryptedPreview(null)
      }
      reader.readAsDataURL(file)
    } else if (isEncrypting && lastDecryptedFile) {
      // Switching to encrypt - load decrypted file
      const file = new File([lastDecryptedFile.blob], lastDecryptedFile.name)
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setOriginalPreview(e.target?.result as string)
        setEncryptedPreview(null)
      }
      reader.readAsDataURL(file)
    }
  }, [isEncrypting])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError('')
      setResultMessage('')
      setEncryptedPreview(null)
      setDecryptedPreview(null)
      
      // Create preview for images
      if (file.type.startsWith('image/') || file.name.endsWith('.claudo')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const preview = e.target?.result as string
          setOriginalPreview(preview)
          
          // If it's a .claudo file, show it as encrypted
          if (file.name.endsWith('.claudo')) {
            setEncryptedPreview(preview)
          }
        }
        reader.readAsDataURL(file)
      } else {
        setOriginalPreview(null)
      }
    }
  }

  // Generate distorted preview for encrypted image
  const generateEncryptedPreview = (originalImage: string) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Create colorful noise pattern (like Mac app)
        for (let i = 0; i < data.length; i += 4) {
          // Use deterministic random based on position
          const seed = (i / 4) * 2654435761
          data[i] = (seed * 123) % 256      // R
          data[i + 1] = (seed * 456) % 256  // G
          data[i + 2] = (seed * 789) % 256  // B
        }
        
        ctx.putImageData(imageData, 0, 0)
        setEncryptedPreview(canvas.toDataURL())
      }
    }
    img.src = originalImage
  }

  const processFile = async () => {
    if (!selectedFile || !password) {
      setError('Please select a file and enter a password')
      return
    }

    setLoading(true)
    setError('')
    setResultMessage('')

    // Show encrypted preview for images before processing (encrypt mode only)
    if (isEncrypting && originalPreview && !encryptedPreview) {
      generateEncryptedPreview(originalPreview)
    }

    try {
      const token = localStorage.getItem('auth_token')
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('password', password)
      
      if (isEncrypting) {
        formData.append('headSize', headSize)
      }

      const endpoint = isEncrypting ? '/api/encrypt/file' : '/api/decrypt/file'
      
      const response = await fetch(`${process.env.API_URL || 'http://localhost:3001'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const blob = await response.blob()
        
        // Show decrypted preview if decrypting an image
        if (!isEncrypting && originalPreview) {
          const url = URL.createObjectURL(blob)
          setDecryptedPreview(url)
        }
        
        // Download the file
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        // Get filename from response header or generate one
        const contentDisposition = response.headers.get('Content-Disposition')
        let filename = selectedFile.name
        if (contentDisposition) {
          const matches = /filename="?([^"]+)"?/.exec(contentDisposition)
          if (matches) filename = matches[1]
        } else {
          const ext = filename.split('.').pop()
          filename = isEncrypting 
            ? filename.replace(`.${ext}`, '.claudo')
            : filename.replace('.claudo', `.${ext || 'jpg'}`)
        }
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        setResultMessage(`Success! File saved as: ${filename}`)
        
        // Save to history for switching modes
        if (isEncrypting) {
          setLastEncryptedFile({ blob, name: filename })
        } else {
          setLastDecryptedFile({ blob, name: filename })
        }
      } else {
        const data = await response.json()
        setError(data.error || 'Processing failed')
      }
    } catch (err) {
      setError('Connection error. Please ensure the backend server is running.')
      console.error('File processing error:', err)
    } finally {
      setLoading(false)
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setOriginalPreview(null)
    setEncryptedPreview(null)
    setDecryptedPreview(null)
    setResultMessage('')
    setError('')
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">File Encryption</h2>
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Panel - Controls */}
        <div className="space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Select File:</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600">Click to select file</p>
                <p className="text-xs text-gray-500 mt-1">Images, videos, or any file type</p>
              </label>
            </div>
            
            {selectedFile && (
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-gray-700 truncate">{selectedFile.name}</span>
                </div>
                <button onClick={clearSelection} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mac-input w-full px-4 py-3 text-gray-900"
              placeholder="Enter password"
            />
          </div>

          {/* Head Size (only for encryption) */}
          {isEncrypting && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <label className="block text-sm font-semibold text-gray-700">Skip Header Bytes:</label>
                <span className="text-xs text-gray-500">(0 for images)</span>
              </div>
              <input
                type="number"
                value={headSize}
                onChange={(e) => setHeadSize(e.target.value)}
                className="mac-input w-full px-4 py-3 text-gray-900"
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-gray-500">Keep at 0 for images. Adjust for videos if needed.</p>
            </div>
          )}

          {/* Process Button */}
          <button
            onClick={processFile}
            disabled={!selectedFile || !password || loading}
            className={`mac-button w-full py-4 px-6 rounded-lg text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              isEncrypting
                ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                : 'bg-gradient-to-r from-green-500 to-teal-600'
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
                {isEncrypting ? 'Encrypt File' : 'Decrypt File'}
              </span>
            )}
          </button>

          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {resultMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {resultMessage}
           isEncrypting ? (
            // Encryption Mode: Original | Encrypted
            <>
              {originalPreview && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 font-semibold">Original Image</p>
                  <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-center justify-center border border-gray-200">
                    <img src={originalPreview} alt="Original" className="max-w-full max-h-full object-contain rounded" />
                  </div>
                </div>
              )}
              
              {encryptedPreview && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 font-semibold">Encrypted Preview</p>
                  <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-center justify-center border border-gray-200">
                    <img src={encryptedPreview} alt="Encrypted" className="max-w-full max-h-full object-contain rounded" />
                  </div>
                </div>
              )}
            </>
          ) : (
            // Decryption Mode: Encrypted | Decrypted
            <>
              {originalPreview && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 font-semibold">Encrypted Image</p>
                  <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-center justify-center border border-gray-200">
                    <img src={originalPreview} alt="Encrypted" className="max-w-full max-h-full object-contain rounded" />
                  </div>
                </div>
              )}
              
              {decryptedPreview && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 font-semibold">Decrypted Preview</p>
                  <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-center justify-center border border-gray-200">
                    <img src={decryptedPreview} alt="Decrypted" className="max-w-full max-h-full object-contain rounded" />
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* No preview */}
          {!originalPreview && !encryptedPreview && !des text-gray-600 font-semibold">Encrypted Preview</p>
              <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-center justify-center border border-gray-200">
                <img src={encryptedPreview} alt="Encrypted" className="max-w-full max-h-full object-contain rounded" />
              </div>
            </div>
          )}
          
          {/* No preview */}
          {!originalPreview && !encryptedPreview && (
            <div className="bg-gray-50 rounded-lg p-4 h-96 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>No preview available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
