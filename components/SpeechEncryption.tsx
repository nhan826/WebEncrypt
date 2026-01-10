'use client'

import { useState, useRef, useEffect } from 'react'

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: (event: SpeechRecognitionEvent) => void
  onerror: (event: any) => void
  onend: () => void
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface EncryptedSegment {
  id: string
  original: string
  encrypted: string
  decrypted?: string  // Actual decrypted text from backend
  timestamp: number
  isDecrypting: boolean
}

export default function SpeechEncryption() {
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [isIOS, setIsIOS] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [segments, setSegments] = useState<EncryptedSegment[]>([])
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [error, setError] = useState('')
  const [interimText, setInterimText] = useState('')
  const [showDecrypted, setShowDecrypted] = useState(false)
  const [isDecryptingAll, setIsDecryptingAll] = useState(false)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const segmentIdCounter = useRef(0)

  useEffect(() => {
    // Check if Web Speech API is supported and detect iOS
    if (typeof window !== 'undefined') {
      // iOS detection
      const ua = window.navigator.userAgent
      const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.userAgent.includes('Macintosh') && 'ontouchend' in document)
      setIsIOS(isIOSDevice)

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        setIsSupported(false)
        setError('Speech recognition not supported in this browser. Try Chrome or Edge on desktop or Android. Not supported on iOS/Safari.')
      }
    }
  }, [])

  const encryptText = async (text: string): Promise<string> => {
    try {
      const token = localStorage.getItem('auth_token')
      console.log('Encrypting text:', text.substring(0, 30) + '...')
      console.log('Password:', password)
      console.log('Token exists:', !!token)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/encrypt/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text, password }),
      })

      console.log('Encrypt response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Encrypt response data:', data)
        
        if (!data.encryptedText) {
          throw new Error('No encryptedText in response')
        }
        
        return data.encryptedText
      } else {
        const errorText = await response.text()
        console.error('Encryption failed with status:', response.status, errorText)
        throw new Error(`Encryption failed: ${response.status}`)
      }
    } catch (err) {
      console.error('Encryption error:', err)
      throw err
    }
  }

  const decryptText = async (encryptedText: string, password: string): Promise<string> => {
    try {
      const token = localStorage.getItem('auth_token')
      
      console.log('🔓 DECRYPTING:', {
        encryptedTextLength: encryptedText.length,
        encryptedTextPreview: encryptedText.substring(0, 50),
        passwordLength: password.length,
        hasToken: !!token
      })
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/decrypt/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ encryptedText, password }),
      })

      const data = await response.json()
      console.log('Decrypt response:', { status: response.status, data })

      if (response.ok) {
        return data.decryptedText
      } else {
        throw new Error(data.error || 'Decryption failed')
      }
    } catch (err) {
      console.error('Decryption error:', err)
      return 'Error: Could not decrypt'
    }
  }

  const startRecording = () => {
    if (!password) {
      setError('Please enter a password first')
      return
    }
    if (isIOS) {
      setError('Speech recognition is not supported on iOS devices. Please use a desktop or Android browser.')
      return
    }
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser.')
      return
    }

    setError('')
    // Don't clear segments - keep accumulating them
    setInterimText('')
    setShowDecrypted(false)

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      // Show interim results
      setInterimText(interimTranscript)

      // When we get a final result, encrypt it
      if (finalTranscript && finalTranscript.trim().length > 0) {
        console.log('Final transcript received:', finalTranscript.trim())
        setIsEncrypting(true)
        
        try {
          const encrypted = await encryptText(finalTranscript.trim())
          console.log('✓ ENCRYPTION PROOF:')
          console.log('  Original text:', finalTranscript.trim())
          console.log('  Encrypted text:', encrypted.substring(0, 100) + '...')
          console.log('  Length change:', finalTranscript.trim().length, '→', encrypted.length)
          console.log('  Texts match?', finalTranscript.trim() === encrypted ? 'NO - NOT ENCRYPTED!' : 'NO - ENCRYPTED ✓')
          
          const newSegment: EncryptedSegment = {
            id: `segment-${segmentIdCounter.current++}`,
            original: finalTranscript.trim(),
            encrypted: encrypted,
            timestamp: Date.now(),
            isDecrypting: false,
          }

          setSegments(prev => [...prev, newSegment])
          setInterimText('')
        } catch (error: any) {
          console.error('Encryption failed:', error)
          setError(`Failed to encrypt: ${error.message || 'Unknown error'}`)
        } finally {
          setIsEncrypting(false)
        }
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        setError('Microphone use not supported — please try another device')
      } else if (event.error === 'denied') {
        setError('Microphone access denied by the user. Please allow microphone permissions.')
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.')
      } else {
        setError(`Recognition error: ${event.error}`)
      }
      setIsRecording(false)
    }

    recognition.onend = () => {
      if (isRecording) {
        // Restart if we're still supposed to be recording
        recognition.start()
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
    setInterimText('')
  }

  const toggleDecryption = async () => {
    if (showDecrypted) {
      // Hide decryption
      setShowDecrypted(false)
      setSegments(prev => prev.map(seg => ({ ...seg, isDecrypting: false })))
    } else {
      // Actually decrypt each segment from the backend
      setShowDecrypted(true)
      setIsDecryptingAll(true)
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        
        // Skip if already decrypted
        if (!segment.decrypted) {
          // Actually call the backend to decrypt
          const decryptedText = await decryptText(segment.encrypted, password)
          
          if (decryptedText) {
            console.log('🔓 DECRYPTION PROOF for segment', i + 1)
            console.log('Encrypted input:', segment.encrypted.substring(0, 100) + '...')
            console.log('Decrypted output:', decryptedText)
            console.log('Original text:', segment.original)
            console.log('Match:', decryptedText === segment.original ? '✓ VERIFIED' : '✗ MISMATCH')
            
            setSegments(prev => {
              const updated = [...prev]
              updated[i] = { ...updated[i], decrypted: decryptedText, isDecrypting: true }
              return updated
            })
          }
        } else {
          // Just show existing decryption
          setSegments(prev => {
            const updated = [...prev]
            updated[i] = { ...updated[i], isDecrypting: true }
            return updated
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, 150))
      }
      
      setIsDecryptingAll(false)
    }
  }

  const clearAll = () => {
    setSegments([])
    setInterimText('')
    setShowDecrypted(false)
    setError('')
  }

  return (
    <div className="space-y-6">
      {isIOS && (
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg">
          Speech recognition is not supported on iOS devices. Please use a desktop or Android browser.
        </div>
      )}
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Speech Encryption</h2>
        <p className="text-gray-600">Speak to encrypt your voice in real-time</p>
      </div>

      {!isSupported && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.
        </div>
      )}

      {/* Password Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Encryption Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password for encryption"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
            disabled={isRecording}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
      </div>

      {/* Recording Controls */}
      <div className="flex gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={!password || !isSupported}
            className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-4 px-6 rounded-lg font-semibold hover:from-red-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all hover:opacity-90 shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex-1 bg-gradient-to-r from-gray-700 to-gray-900 text-white py-4 px-6 rounded-lg font-semibold hover:from-gray-800 hover:to-black transition-all hover:opacity-90 shadow-lg flex items-center justify-center gap-2 animate-pulse"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            Stop Recording
          </button>
        )}

        {segments.length > 0 && !isRecording && (
          <button
            onClick={toggleDecryption}
            disabled={isDecryptingAll}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all hover:opacity-90 shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {showDecrypted ? 'Hide' : 'Show'} Decryption
          </button>
        )}

        {segments.length > 0 && (
          <button
            onClick={clearAll}
            disabled={isRecording}
            className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Clear
          </button>
        )}
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-lg p-6 animate-pulse">
          <div className="flex items-center justify-center gap-3">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
            <span className="text-lg font-semibold text-red-700">Recording... Speak now</span>
            <div className="w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
          </div>
        </div>
      )}

      {/* Interim Text (while speaking) */}
      {interimText && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-700">Transcribing...</span>
          </div>
          <p className="text-gray-700 italic">{interimText}</p>
        </div>
      )}

      {/* Encrypting Indicator */}
      {isEncrypting && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-700"></div>
          <span className="text-yellow-700 font-medium">Encrypting...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Encrypted Segments */}
      {segments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Encrypted Speech Segments</h3>
            <span className="text-sm text-gray-500">{segments.length} segment{segments.length !== 1 ? 's' : ''}</span>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                className="bg-white border-2 border-gray-200 rounded-lg p-4 transition-all duration-500 hover:shadow-lg"
                style={{
                  animation: `slideIn 0.5s ease-out ${index * 0.1}s both`
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(segment.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                {/* Original Text (for comparison) */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-gray-600">Original Speech</span>
                  </div>
                  <p className="text-sm text-gray-800 bg-blue-50 p-3 rounded border border-blue-200">
                    {segment.original}
                  </p>
                </div>

                {/* Encrypted Text (backend-encrypted) */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-gray-600">Backend Encrypted (Lockstitch C++)</span>
                    <span className="text-xs text-gray-400">({segment.encrypted.length} chars)</span>
                  </div>
                  <p className="text-sm font-mono text-red-700 bg-red-50 p-3 rounded border border-red-200 break-all max-h-32 overflow-y-auto">
                    {segment.encrypted}
                  </p>
                </div>

                {/* Decrypted Text (with animation) - Backend decrypted */}
                <div
                  className={`transition-all duration-700 overflow-hidden ${
                    showDecrypted && segment.isDecrypting
                      ? 'max-h-48 opacity-100'
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-gray-600">Backend Decrypted (from encrypted text above)</span>
                  </div>
                  <p className="text-sm font-semibold text-green-800 bg-green-50 p-3 rounded border-2 border-green-300">
                    {segment.decrypted || 'Decrypting...'}
                  </p>
                  {segment.decrypted && (
                    <p className={`text-xs mt-1 italic font-semibold ${
                      segment.decrypted === segment.original 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {segment.decrypted === segment.original 
                        ? '✓ Matches original - encryption/decryption verified'
                        : '✗ MISMATCH - decryption failed or wrong password'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {segments.length === 0 && !isRecording && (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <p className="text-gray-600 text-lg font-medium mb-2">Ready to encrypt your voice</p>
          <p className="text-gray-500 text-sm">Enter a password and click &quot;Start Recording&quot;</p>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
