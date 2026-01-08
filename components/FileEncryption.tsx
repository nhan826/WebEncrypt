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
  const [processedFile, setProcessedFile] = useState<{blob: Blob, filename: string} | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [savedEncryptedPreview, setSavedEncryptedPreview] = useState<string | null>(null)

  // DEBUG: Track processedFile changes
  useEffect(() => {
    console.log('📦 processedFile changed:', processedFile?.filename || 'null')
    if (processedFile) {
      console.trace('  Stack trace for processedFile set')
    }
  }, [processedFile])

  // Auto-load last file when switching modes (like Mac app)
  useEffect(() => {
    // Clear previous processed file when switching modes
    setProcessedFile(null)
    setResultMessage('')
    setError('')
    
    if (!isEncrypting && lastEncryptedFile) {
      // Switching to decrypt - load encrypted file
      const file = new File([lastEncryptedFile.blob], lastEncryptedFile.name, { type: 'application/octet-stream' })
      setSelectedFile(file)
      // Show encrypted preview - use the saved one from encryption
      if (savedEncryptedPreview) {
        setEncryptedPreview(savedEncryptedPreview)
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const preview = e.target?.result as string
        setOriginalPreview(preview)
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
        setSavedEncryptedPreview(null)
      }
      reader.readAsDataURL(file)
    }
  }, [isEncrypting, lastEncryptedFile, lastDecryptedFile])  // Removed savedEncryptedPreview from deps

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError('')
      setResultMessage('')
      setEncryptedPreview(null)
      setDecryptedPreview(null)
      setProcessedFile(null)
      
      // Create preview for supported file types
      if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type === 'application/pdf' || file.name.endsWith('.claudo')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const preview = e.target?.result as string
          setOriginalPreview(preview)
          
          // Only generate distorted preview for .claudo files in decrypt mode
          if (file.name.endsWith('.claudo') && !isEncrypting) {
            // If we have a saved encrypted preview from previous encryption, use it
            if (savedEncryptedPreview) {
              setEncryptedPreview(savedEncryptedPreview)
            } else {
              generateEncryptedPreview(preview, file.type)
            }
          }
          // Generate video thumbnail preview for video files
          else if (file.type.startsWith('video/')) {
            const video = document.createElement('video')
            video.src = preview
            video.currentTime = 0.1
            video.muted = true
            video.playsInline = true
            video.preload = 'metadata'
            
            video.addEventListener('loadedmetadata', () => {
              console.log('Video loaded, dimensions:', video.videoWidth, 'x', video.videoHeight)
            })
            
            video.addEventListener('seeked', () => {
              console.log('Video seeked, ready to generate thumbnail')
              video.pause()
              video.src = ''
              video.remove()
            }, { once: true })
            
            video.addEventListener('error', (e) => {
              console.error('Video load error:', e)
            })
            
            video.load()
          }
        }
        reader.readAsDataURL(file)
      } else {
        setOriginalPreview(null)
      }
    }
  }

  // Generate PDF preview as image
  const generatePDFPreview = (pdfUrl: string) => {
    // Create an iframe to render PDF and capture it
    const iframe = document.createElement('iframe')
    iframe.src = pdfUrl
    iframe.style.position = 'absolute'
    iframe.style.width = '800px'
    iframe.style.height = '1000px'
    iframe.style.left = '-9999px'
    document.body.appendChild(iframe)
    
    // Wait for PDF to load, then capture first page
    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 600
        canvas.height = 800
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          // Draw a PDF icon placeholder since we can't directly capture PDF content
          ctx.fillStyle = '#f3f4f6'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          // Draw PDF icon
          ctx.fillStyle = '#6b7280'
          ctx.font = 'bold 48px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('PDF', canvas.width / 2, canvas.height / 2 - 50)
          
          ctx.font = '16px sans-serif'
          ctx.fillText('Preview not available', canvas.width / 2, canvas.height / 2 + 20)
          
          const preview = canvas.toDataURL()
          generateEncryptedPreview(preview, 'application/pdf')
        }
      } catch (e) {
        console.error('PDF preview error:', e)
      } finally {
        document.body.removeChild(iframe)
      }
    }, 500)
  }

  // Generate video thumbnail for preview
  const generateVideoThumbnail = (videoUrl: string) => {
    const video = document.createElement('video')
    video.src = videoUrl
    video.currentTime = 0.1 // Capture frame at 0.1 seconds
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      
      if (ctx && video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const thumbnail = canvas.toDataURL('image/jpeg', 0.9)
        // Generate distorted preview from thumbnail
        generateEncryptedPreview(thumbnail, 'video/thumbnail')
        
        // Clean up
        video.pause()
        video.src = ''
        video.remove()
      }
    }, { once: true })
    
    video.load()
  }

  // Generate distorted preview for encrypted files
  const generateEncryptedPreview = (originalImage: string, fileType?: string) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      // Use consistent dimensions
      const maxSize = 800
      let width = img.width
      let height = img.height
      
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize
          width = maxSize
        } else {
          width = (width / height) * maxSize
          height = maxSize
        }
      }
      
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        // Draw the image at the calculated size
        ctx.drawImage(img, 0, 0, width, height)
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          
          // Create colorful noise pattern (like Mac app) - distort ALL pixels
          for (let i = 0; i < data.length; i += 4) {
            // Use deterministic random based on position
            const seed = (i / 4) * 2654435761
            data[i] = (seed * 123) % 256      // R
            data[i + 1] = (seed * 456) % 256  // G
            data[i + 2] = (seed * 789) % 256  // B
            // Keep alpha channel
            data[i + 3] = 255
          }
          
          ctx.putImageData(imageData, 0, 0)
          setEncryptedPreview(canvas.toDataURL('image/jpeg', 0.9))
        } catch (e) {
          console.error('Error generating distorted preview:', e)
          // Fallback: just show colored noise
          ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16)
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          setEncryptedPreview(canvas.toDataURL())
        }
      }
    }
    img.onerror = () => {
      console.error('Failed to load image for distortion')
      // Create a simple noise pattern as fallback
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 400
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const imageData = ctx.createImageData(canvas.width, canvas.height)
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = Math.random() * 255
          imageData.data[i + 1] = Math.random() * 255
          imageData.data[i + 2] = Math.random() * 255
          imageData.data[i + 3] = 255
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

    console.log(`Starting ${isEncrypting ? 'encryption' : 'decryption'} for file:`, selectedFile.name)
    
    setLoading(true)
    setError('')
    setResultMessage('')
    setProcessedFile(null)

    // Generate encrypted preview for visual feedback during encryption
    let encryptedPreviewUrl: string | null = null
    if (isEncrypting && originalPreview) {
      // Generate preview from original for images
      if (selectedFile.type.startsWith('image/')) {
        await new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const maxSize = 800
            let width = img.width
            let height = img.height
            
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height / width) * maxSize
                width = maxSize
              } else {
                width = (width / height) * maxSize
                height = maxSize
              }
            }
            
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height)
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
              const data = imageData.data
              
              for (let i = 0; i < data.length; i += 4) {
                const seed = (i / 4) * 2654435761
                data[i] = (seed * 123) % 256
                data[i + 1] = (seed * 456) % 256
                data[i + 2] = (seed * 789) % 256
                data[i + 3] = 255
              }
              
              ctx.putImageData(imageData, 0, 0)
              encryptedPreviewUrl = canvas.toDataURL('image/jpeg', 0.9)
              setEncryptedPreview(encryptedPreviewUrl)
              setSavedEncryptedPreview(encryptedPreviewUrl)
            }
            resolve()
          }
          img.onerror = () => resolve()
          img.src = originalPreview
        })
      } else if (selectedFile.type.startsWith('video/')) {
        // Generate from video thumbnail
        await new Promise<void>((resolve) => {
          const video = document.createElement('video')
          video.src = originalPreview
          video.currentTime = 0.1
          video.muted = true
          video.playsInline = true
          video.preload = 'metadata'
          
          video.addEventListener('seeked', () => {
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            
            if (ctx && video.videoWidth > 0) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
              const data = imageData.data
              
              for (let i = 0; i < data.length; i += 4) {
                const seed = (i / 4) * 2654435761
                data[i] = (seed * 123) % 256
                data[i + 1] = (seed * 456) % 256
                data[i + 2] = (seed * 789) % 256
                data[i + 3] = 255
              }
              
              ctx.putImageData(imageData, 0, 0)
              encryptedPreviewUrl = canvas.toDataURL('image/jpeg', 0.9)
              console.log('Generated encrypted video preview:', canvas.width, 'x', canvas.height)
              setEncryptedPreview(encryptedPreviewUrl)
              setSavedEncryptedPreview(encryptedPreviewUrl)
              
              video.pause()
              video.src = ''
              video.remove()
            }
            resolve()
          }, { once: true })
          
          video.addEventListener('error', (e) => {
            console.error('Video load error:', e)
            resolve()
          })
          
          video.load()
          setTimeout(() => resolve(), 2000) // Timeout fallback
        })
      } else if (selectedFile.type === 'application/pdf') {
        // For PDFs, create a simple distorted placeholder
        // Since we can't easily render PDF in browser without external libraries,
        // we'll create a colorful noise pattern as the encrypted preview
        const canvas = document.createElement('canvas')
        canvas.width = 400
        canvas.height = 500
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          // Create noise pattern
          const imageData = ctx.createImageData(canvas.width, canvas.height)
          const data = imageData.data
          
          for (let i = 0; i < data.length; i += 4) {
            const seed = (i / 4) * 2654435761
            data[i] = (seed * 123) % 256
            data[i + 1] = (seed * 456) % 256
            data[i + 2] = (seed * 789) % 256
            data[i + 3] = 255
          }
          
          ctx.putImageData(imageData, 0, 0)
          encryptedPreviewUrl = canvas.toDataURL('image/jpeg', 0.9)
          console.log('Generated encrypted PDF preview:', canvas.width, 'x', canvas.height)
          setEncryptedPreview(encryptedPreviewUrl)
          setSavedEncryptedPreview(encryptedPreviewUrl)
        }
      }
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
      
      console.log('Sending request to:', endpoint)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      console.log('Response status:', response.status, response.statusText)
      
      if (response.ok) {
        // Get the Content-Type from response
        const contentType = response.headers.get('Content-Type')
        console.log('Response Content-Type:', contentType)
        
        const blob = await response.blob()
        console.log('Blob created, type:', blob.type, 'size:', blob.size)
        
        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition')
        console.log('Content-Disposition:', contentDisposition)
        
        let filename = 'download'
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
          if (filenameMatch) {
            filename = filenameMatch[1]
            console.log('Filename from header:', filename)
          }
        }
        
        // If blob type is missing or generic, infer it from filename
        let finalBlob = blob
        if (!blob.type || blob.type === 'application/octet-stream') {
          const ext = filename.split('.').pop()?.toLowerCase()
          let mimeType = blob.type
          
          if (ext === 'mp4') mimeType = 'video/mp4'
          else if (ext === 'mov') mimeType = 'video/quicktime'
          else if (ext === 'avi') mimeType = 'video/x-msvideo'
          else if (ext === 'webm') mimeType = 'video/webm'
          else if (ext === 'pdf') mimeType = 'application/pdf'
          else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg'
          else if (ext === 'png') mimeType = 'image/png'
          else if (ext === 'gif') mimeType = 'image/gif'
          
          if (mimeType !== blob.type) {
            console.log('Correcting MIME type from', blob.type, 'to', mimeType)
            finalBlob = new Blob([blob], { type: mimeType })
          }
        }
        
        console.log('Final filename:', filename)
        
        // Show decrypted preview
        if (!isEncrypting) {
          // Don't create blob URL preview for PDFs (we show an icon instead)
          if (finalBlob.type !== 'application/pdf') {
            const url = URL.createObjectURL(finalBlob)
            console.log('Setting decrypted preview, blob type:', finalBlob.type, 'size:', finalBlob.size)
            setDecryptedPreview(url)
            
            // For videos, verify the blob is valid
            if (finalBlob.type.startsWith('video/')) {
              console.log('Video blob created:', url)
              console.log('Video file size:', (finalBlob.size / 1024 / 1024).toFixed(2), 'MB')
              
              // Test if blob is readable
              finalBlob.slice(0, 100).arrayBuffer().then(buffer => {
                console.log('Blob is readable, first bytes:', new Uint8Array(buffer).slice(0, 10))
              }).catch(err => {
                console.error('Blob read error:', err)
              })
            }
          } else {
            console.log('PDF decrypted, showing icon placeholder')
            setDecryptedPreview(null) // Don't set preview for PDFs
          }
        }
        
        // Store file for download button
        setProcessedFile({ blob: finalBlob, filename })
        setResultMessage(`Success! File ready for download: ${filename}`)
        
        // Save to history for switching modes
        if (isEncrypting) {
          setLastEncryptedFile({ blob: finalBlob, name: filename })
          // Save the encrypted preview for consistency when switching to decrypt mode
          if (encryptedPreviewUrl) {
            setSavedEncryptedPreview(encryptedPreviewUrl)
          }
        }
        // Note: We don't save lastDecryptedFile because after decryption,
        // the user typically downloads the file rather than re-encrypting it
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
    setProcessedFile(null)
    setSavedEncryptedPreview(null)
  }

  const downloadFile = () => {
    if (!processedFile) return
    
    const url = window.URL.createObjectURL(processedFile.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = processedFile.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">File Encryption</h2>
        <p className="text-gray-600">Encrypt or decrypt your files securely</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setIsEncrypting(true)}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            isEncrypting
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Encrypt
        </button>
        <button
          onClick={() => setIsEncrypting(false)}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            !isEncrypting
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Decrypt
        </button>
      </div>

      {/* File Upload Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block">
          <span className="text-sm font-medium text-gray-700 mb-2 block">
            Select File
          </span>
          <input
            type="file"
            accept="image/*,video/*,application/pdf,.claudo"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </label>
        {selectedFile && (
          <div className="mt-3 flex items-center justify-between bg-gray-50 p-3 rounded">
            <span className="text-sm text-gray-700">{selectedFile.name}</span>
            <button
              onClick={clearSelection}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Password Input */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block">
          <span className="text-sm font-medium text-gray-700 mb-2 block">
            Password
          </span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter encryption password"
              className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
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
          </div>
          <p className="text-xs text-gray-500 mt-1">Password length: {password.length} chars</p>
        </label>

        {/* Head Size (for encryption only) */}
        {isEncrypting && (
          <div className="mt-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-2 block">
                Head Size
              </span>
              <input
                type="text"
                value={headSize}
                onChange={(e) => setHeadSize(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {(originalPreview || encryptedPreview || decryptedPreview) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Encryption mode: Show original and encrypted side by side */}
            {isEncrypting && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Original</p>
                  {originalPreview ? (
                    selectedFile?.type.startsWith('video/') ? (
                      <video src={originalPreview} controls className="w-full h-64 object-contain border rounded bg-black" />
                    ) : selectedFile?.type === 'application/pdf' ? (
                      <embed src={originalPreview} type="application/pdf" className="w-full h-64 border rounded" />
                    ) : (
                      <img src={originalPreview} alt="Original" className="w-full h-64 object-contain border rounded" />
                    )
                  ) : (
                    <div className="w-full h-64 bg-gray-100 border rounded flex items-center justify-center text-gray-400">
                      No preview
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Encrypted</p>
                  {encryptedPreview ? (
                    <img src={encryptedPreview} alt="Encrypted" className="w-full h-64 object-contain border rounded bg-gray-50" />
                  ) : (
                    <div className="w-full h-64 bg-gray-100 border rounded flex items-center justify-center text-gray-400">
                      {selectedFile?.type.startsWith('video/') ? 'Generating preview...' : 'Processing...'}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Decryption mode: Show encrypted and decrypted side by side */}
            {!isEncrypting && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Encrypted</p>
                  {encryptedPreview ? (
                    <img src={encryptedPreview} alt="Encrypted" className="w-full h-64 object-contain border rounded" />
                  ) : (
                    <div className="w-full h-64 bg-gray-100 border rounded flex items-center justify-center text-gray-400">
                      {originalPreview ? 'Generating preview...' : 'No preview'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Decrypted</p>
                  {(() => {
                    const isVideo = processedFile?.filename.match(/\.(mp4|mov|avi|webm)$/i);
                    const isPDF = processedFile?.filename.endsWith('.pdf');
                    
                    // Show PDF icon if we have a decrypted PDF file (even without preview URL)
                    if (processedFile && isPDF) {
                      return (
                        <div className="w-full h-64 bg-gray-100 border rounded flex flex-col items-center justify-center text-gray-600">
                          <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="font-medium">Decrypted PDF</p>
                          <p className="text-sm text-gray-500">Ready to download</p>
                        </div>
                      );
                    }
                    
                    // Show video or image preview if available
                    if (decryptedPreview) {
                      console.log('Rendering decrypted preview:');
                      console.log('  Filename:', processedFile?.filename);
                      console.log('  Is video:', !!isVideo);
                      console.log('  Preview URL:', decryptedPreview);
                      
                      if (isVideo) {
                        return (
                          <video 
                            src={decryptedPreview} 
                            controls 
                            className="w-full h-64 object-contain border rounded bg-black" 
                            key={decryptedPreview}
                            preload="metadata"
                            playsInline
                            onLoadedMetadata={(e) => {
                              console.log('✓ Video loaded successfully:', e.currentTarget.videoWidth, 'x', e.currentTarget.videoHeight)
                              console.log('  Duration:', e.currentTarget.duration, 'seconds')
                              console.log('  Source:', e.currentTarget.currentSrc)
                            }}
                            onError={(e) => {
                              console.error('✗ Video load failed')
                              console.error('  Error target:', e.currentTarget)
                              console.error('  Error code:', e.currentTarget.error?.code)
                              console.error('  Error message:', e.currentTarget.error?.message)
                              console.error('  Source:', e.currentTarget.src)
                            }}
                            onCanPlay={() => console.log('✓ Video can play')}
                          />
                        );
                      } else {
                        return <img src={decryptedPreview} alt="Decrypted" className="w-full h-64 object-contain border rounded" />;
                      }
                    }
                    
                    // Default empty state
                    return (
                      <div className="w-full h-64 bg-gray-100 border rounded flex items-center justify-center text-gray-400">
                        {loading ? 'Processing...' : 'Decrypt to preview'}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Process Button */}
      <button
        onClick={processFile}
        disabled={!selectedFile || !password || loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Processing...' : (isEncrypting ? 'Encrypt File' : 'Decrypt File')}
      </button>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Success Message */}
      {resultMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {resultMessage}
        </div>
      )}

      {/* Download Button */}
      {processedFile && (
        <button
          onClick={downloadFile}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Download {processedFile.filename}</span>
        </button>
      )}
    </div>
  )
}
