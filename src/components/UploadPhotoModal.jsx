import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Camera, Upload, Image as ImageIcon } from 'lucide-react'
import { useToast } from '../lib/ToastContext'

export default function UploadPhotoModal({ isOpen, onClose, job, userId }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [stream, setStream] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen])

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        return
      }

      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }

      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError(null)
    }
  }

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      setStream(mediaStream)
      setIsCameraActive(true)
      setError(null)

      // Allow video to load
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      }, 100)
    } catch (err) {
      console.error('Camera error:', err)
      setError('Could not access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCameraActive(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const context = canvas.getContext('2d')
      // Mirror if needed, but for back camera usually not needed. 
      // User style had scale-x-[-1] which mirrors. 
      // Let's mirror the capture too if we are mirroring preview.
      context.translate(canvas.width, 0)
      context.scale(-1, 1)

      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(blob => {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
        setSelectedFile(file)
        setPreviewUrl(URL.createObjectURL(file))
        stopCamera()
      }, 'image/jpeg', 0.8)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedFile) {
      setError('Please capture or select a photo')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Upload image to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('job-photos')
        .getPublicUrl(filePath)

      // Get Photo Type
      const photoType = document.querySelector('input[name="photoType"]:checked').value
      const taggedDescription = photoType === 'GENERAL' ? description : `[${photoType}] ${description}`

      // Save photo record to database
      const { error: dbError } = await supabase
        .from('photos')
        .insert([
          {
            job_id: job.id,
            uploaded_by: userId,
            file_path: publicUrl,
            description: taggedDescription,
            is_urgent: isUrgent
          }
        ])

      if (dbError) throw dbError

      showToast('Photo uploaded successfully!', 'success')
      onClose()

      // Reset form
      setDescription('')
      setIsUrgent(false)
      setSelectedFile(null)
      setPreviewUrl(null)
    } catch (error) {
      console.error('Upload error:', error)
      showToast('Failed to upload photo: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetPhoto = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setError(null)
    setIsCameraActive(false)
    stopCamera()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700 transition-colors">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10 transition-colors">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Upload Photo</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-500 dark:text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
            <p className="font-bold text-gray-800 dark:text-gray-200">{job?.title}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{job?.clients?.name}</p>
          </div>

          {/* Photo Capture/Upload Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Photo Evidence *
            </label>

            {isCameraActive ? (
              <div className="relative bg-black rounded-xl overflow-hidden shadow-lg ring-4 ring-gray-100 dark:ring-gray-700">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-80 object-cover transform scale-x-[-1]"
                />
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 z-10">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-4 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-all backdrop-blur-sm shadow-lg hover:scale-105"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="p-6 bg-white rounded-full hover:scale-110 transition-all border-4 border-gray-200 shadow-xl active:scale-95"
                  >
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  </button>
                </div>
                <div className="absolute top-4 left-4 right-4 text-center">
                  <span className="px-3 py-1 bg-black/50 text-white text-xs rounded-full backdrop-blur-sm border border-white/10">
                    Adjust camera to frame the subject
                  </span>
                </div>
              </div>
            ) : previewUrl ? (
              // Preview
              <div className="relative group">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-80 object-contain rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
                />
                <button
                  type="button"
                  onClick={resetPhoto}
                  className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg transition-transform hover:scale-105"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10">
                  {selectedFile?.name || 'Captured Photo'}
                </div>
              </div>
            ) : (
              // Capture Options
              <div className="space-y-4">
                {/* Take Photo Button (Camera API) */}
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center justify-center w-full h-48 border-2 border-blue-500/30 border-dashed rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 bg-blue-50/50 dark:bg-blue-900/5 transition-all group"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="p-4 bg-blue-100 dark:bg-blue-800/30 rounded-full mb-3 group-hover:scale-110 transition-transform shadow-sm">
                      <Camera className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">Open Camera</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Take a photo directly</p>
                  </div>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">or upload from device</span>
                  </div>
                </div>

                {/* Upload File Button */}
                <label className="flex items-center justify-center w-full h-24 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-6 h-6 text-gray-400 dark:text-gray-500 mb-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">Select from Gallery</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
            )}

            {/* Hidden Canvas for Capture */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all resize-none shadow-sm"
              placeholder="e.g., Damaged motherboard, Broken screen, Completed repair..."
            />
          </div>

          {/* Photo Type Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Photo Type *</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'BEFORE', label: 'Before Work' },
                { value: 'AFTER', label: 'After Work' },
                { value: 'GENERAL', label: 'General' }
              ].map((type) => (
                <label key={type.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="photoType"
                    value={type.value}
                    className="peer sr-only"
                    defaultChecked={type.value === 'BEFORE'}
                  />
                  <div className="text-center py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-sm font-medium transition-all peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 dark:peer-checked:bg-blue-900/30 dark:peer-checked:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    {type.label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Urgent Checkbox */}
          <div className="flex items-center p-4 bg-gray-50 dark:bg-red-900/10 rounded-xl border border-transparent dark:border-red-900/20">
            <input
              type="checkbox"
              id="urgent"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 bg-white dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="urgent" className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              🚨 Mark as urgent <span className="text-xs text-gray-500 dark:text-gray-400 block sm:inline">(requires immediate attention)</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold text-gray-700 dark:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              <Upload className="w-5 h-5" />
              {loading ? 'Uploading...' : 'Upload Photo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}