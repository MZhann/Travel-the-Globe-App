import { useState, useRef, useCallback } from 'react';
import { fileToBase64 } from '../api/albums';

interface AddPhotoModalProps {
  countryCode: string;
  countryName: string;
  onClose: () => void;
  onSubmit: (data: {
    imageData: string;
    dateTaken: string;
    notes: string;
    isPublic: boolean;
  }) => Promise<void>;
}

export default function AddPhotoModal({
  countryCode,
  countryName,
  onClose,
  onSubmit,
}: AddPhotoModalProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [dateTaken, setDateTaken] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setImageData(base64);
      setError(null);
    } catch {
      setError('Failed to read image');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageData) {
      setError('Please select an image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        imageData,
        dateTaken,
        notes,
        isPublic,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add photo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div 
        className="relative mx-4 w-full max-w-lg overflow-hidden rounded-xl shadow-2xl"
        style={{
          background: 'linear-gradient(145deg, #2d1f14 0%, #1a1208 100%)',
          border: '3px solid #8b7355',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1), 0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Vintage paper texture overlay */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Header */}
        <div className="relative border-b border-amber-800/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-900/50 text-xl">
              📷
            </div>
            <div>
              <h2 
                className="text-xl font-semibold"
                style={{ 
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: '#d4c4a8',
                }}
              >
                Add Memory
              </h2>
              <p className="text-sm text-amber-700">{countryName} ({countryCode})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-amber-700 transition hover:bg-amber-900/30 hover:text-amber-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="relative space-y-5 p-6">
          {/* Image upload area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer overflow-hidden rounded-lg transition-all ${
              isDragging 
                ? 'ring-2 ring-amber-500' 
                : 'hover:ring-1 hover:ring-amber-700'
            }`}
            style={{
              background: 'linear-gradient(135deg, #1a1208 0%, #2d1f14 100%)',
              border: '2px dashed #5c4d3d',
              minHeight: '180px',
            }}
          >
            {imageData ? (
              <div className="relative">
                <img
                  src={imageData}
                  alt="Preview"
                  className="h-48 w-full object-cover"
                  style={{
                    filter: 'sepia(15%) saturate(90%)',
                  }}
                />
                <div 
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(180deg, transparent 60%, rgba(26,18,8,0.8) 100%)',
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageData(null);
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center gap-3 px-6 text-center">
                <div 
                  className="rounded-full p-4"
                  style={{ background: 'rgba(139, 115, 85, 0.2)' }}
                >
                  <svg className="h-8 w-8 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-600">Drop your photo here</p>
                  <p className="mt-1 text-xs text-amber-800">or click to browse</p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>

          {/* Date picker */}
          <div>
            <label 
              className="mb-2 block text-sm font-medium"
              style={{ color: '#b8a88a', fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              📅 When was this taken?
            </label>
            <input
              type="date"
              value={dateTaken}
              onChange={(e) => setDateTaken(e.target.value)}
              className="w-full rounded-lg border border-amber-900/50 bg-amber-950/50 px-4 py-2.5 text-amber-100 outline-none transition focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Notes */}
          <div>
            <label 
              className="mb-2 block text-sm font-medium"
              style={{ color: '#b8a88a', fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              ✍️ Notes & Memories
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What made this moment special..."
              rows={3}
              maxLength={1000}
              className="w-full resize-none rounded-lg border border-amber-900/50 bg-amber-950/50 px-4 py-2.5 text-amber-100 placeholder-amber-800 outline-none transition focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
              style={{ fontFamily: "'Caveat', cursive, sans-serif", fontSize: '1.1rem' }}
            />
          </div>

          {/* Privacy toggle */}
          <div 
            className="flex items-center justify-between rounded-lg px-4 py-3"
            style={{ background: 'rgba(139, 115, 85, 0.15)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{isPublic ? '🌍' : '🔒'}</span>
              <div>
                <p className="text-sm font-medium text-amber-200">
                  {isPublic ? 'Public Memory' : 'Private Memory'}
                </p>
                <p className="text-xs text-amber-700">
                  {isPublic ? 'Visitors can see this photo' : 'Only you can see this photo'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                isPublic ? 'bg-amber-600' : 'bg-amber-900'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-amber-100 shadow transition-transform ${
                  isPublic ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !imageData}
            className="w-full rounded-lg py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #8b7355 0%, #6b5344 100%)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(139, 115, 85, 0.3)',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Adding to album...
              </span>
            ) : (
              '📸 Add to Album'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

