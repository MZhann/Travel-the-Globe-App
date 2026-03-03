import { useState } from 'react';
import type { TravelMemory } from '../api/albums';

interface PhotoAlbumProps {
  memories: TravelMemory[];
  countryNames: Record<string, string>;
  isOwnProfile: boolean;
  onDelete?: (memoryId: string) => void;
  onTogglePublic?: (memoryId: string, isPublic: boolean) => void;
}

interface PhotoCardProps {
  memory: TravelMemory;
  countryName: string;
  isOwnProfile: boolean;
  onDelete?: (memoryId: string) => void;
  onTogglePublic?: (memoryId: string, isPublic: boolean) => void;
  onClick: () => void;
}

function PhotoCard({ memory, countryName, isOwnProfile, onDelete, onTogglePublic, onClick }: PhotoCardProps) {
  const [showActions, setShowActions] = useState(false);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Random slight rotation for vintage effect
  const rotation = (memory.id.charCodeAt(0) % 7) - 3;

  return (
    <div
      className="group relative cursor-pointer transition-all duration-300 hover:z-10"
      style={{
        transform: `rotate(${rotation}deg)`,
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={onClick}
    >
      {/* Photo frame */}
      <div
        className="overflow-hidden rounded-sm shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl"
        style={{
          background: '#f5f0e6',
          padding: '12px 12px 40px 12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 0 20px rgba(139,115,85,0.1)',
        }}
      >
        {/* Photo with vintage effects */}
        <div className="relative overflow-hidden">
          <img
            src={memory.imageData}
            alt={`Memory from ${countryName}`}
            className="aspect-square w-full object-cover"
            style={{
              filter: 'sepia(20%) saturate(85%) contrast(95%)',
              borderRadius: '1px',
            }}
          />
          {/* Vintage overlay */}
          <div 
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(255,250,240,0.15) 0%, transparent 50%, rgba(139,115,85,0.1) 100%)',
              mixBlendMode: 'overlay',
            }}
          />
          {/* Corner wear effect */}
          <div 
            className="pointer-events-none absolute inset-0"
            style={{
              boxShadow: 'inset 0 0 30px rgba(139,115,85,0.2)',
            }}
          />
          
          {/* Privacy badge */}
          {isOwnProfile && (
            <div className="absolute right-2 top-2">
              <span 
                className={`rounded-full px-2 py-0.5 text-xs font-medium shadow ${
                  memory.isPublic 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {memory.isPublic ? '🌍 Public' : '🔒 Private'}
              </span>
            </div>
          )}
        </div>

        {/* Handwritten-style caption */}
        <div className="mt-3 text-center">
          <p 
            className="text-sm text-amber-900"
            style={{ 
              fontFamily: "'Caveat', cursive, sans-serif",
              fontSize: '1rem',
            }}
          >
            {countryName}
          </p>
          <p 
            className="mt-0.5 text-xs text-amber-700"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {formatDate(memory.dateTaken)}
          </p>
        </div>
      </div>

      {/* Tape effect */}
      <div 
        className="absolute -left-1 -top-2 h-6 w-12 rotate-[-15deg] opacity-70"
        style={{
          background: 'linear-gradient(135deg, rgba(255,248,220,0.9) 0%, rgba(255,245,200,0.7) 100%)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
      <div 
        className="absolute -right-1 -top-1 h-5 w-10 rotate-[20deg] opacity-60"
        style={{
          background: 'linear-gradient(135deg, rgba(255,248,220,0.9) 0%, rgba(255,245,200,0.7) 100%)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />

      {/* Actions overlay */}
      {isOwnProfile && showActions && (
        <div 
          className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-2 rounded-full px-3 py-1.5 shadow-lg"
          style={{ background: 'rgba(45, 31, 20, 0.95)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onTogglePublic?.(memory.id, !memory.isPublic)}
            className="rounded-full p-1.5 text-amber-400 transition hover:bg-amber-900/50 hover:text-amber-300"
            title={memory.isPublic ? 'Make private' : 'Make public'}
          >
            {memory.isPublic ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(memory.id)}
            className="rounded-full p-1.5 text-red-400 transition hover:bg-red-900/50 hover:text-red-300"
            title="Delete photo"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

interface PhotoViewerProps {
  memory: TravelMemory;
  countryName: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

function PhotoViewer({ memory, countryName, onClose, onPrev, onNext, hasPrev, hasNext }: PhotoViewerProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Navigation arrows */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Photo with vintage frame */}
      <div 
        className="mx-4 max-h-[90vh] max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="overflow-hidden rounded shadow-2xl"
          style={{
            background: '#f5f0e6',
            padding: '20px 20px 60px 20px',
          }}
        >
          <img
            src={memory.imageData}
            alt={`Memory from ${countryName}`}
            className="max-h-[60vh] w-auto rounded-sm object-contain"
            style={{
              filter: 'sepia(15%) saturate(90%)',
            }}
          />
          
          {/* Caption area */}
          <div className="mt-4 text-center">
            <h3 
              className="text-xl text-amber-900"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {countryName}
            </h3>
            <p 
              className="mt-1 text-sm text-amber-700"
              style={{ fontFamily: "'Caveat', cursive, sans-serif", fontSize: '1.1rem' }}
            >
              {formatDate(memory.dateTaken)}
            </p>
            {memory.notes && (
              <p 
                className="mx-auto mt-3 max-w-md text-amber-800"
                style={{ 
                  fontFamily: "'Caveat', cursive, sans-serif", 
                  fontSize: '1.2rem',
                  lineHeight: '1.4',
                }}
              >
                "{memory.notes}"
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PhotoAlbum({
  memories,
  countryNames,
  isOwnProfile,
  onDelete,
  onTogglePublic,
}: PhotoAlbumProps) {
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  // Group memories by country
  const memoriesByCountry = memories.reduce((acc, memory) => {
    const code = memory.countryCode;
    if (!acc[code]) acc[code] = [];
    acc[code].push(memory);
    return acc;
  }, {} as Record<string, TravelMemory[]>);

  const countries = Object.keys(memoriesByCountry).sort((a, b) => 
    (countryNames[a] ?? a).localeCompare(countryNames[b] ?? b)
  );

  if (memories.length === 0) {
    return (
      <div 
        className="flex flex-col items-center justify-center py-12 text-center"
        style={{ minHeight: '200px' }}
      >
        <div 
          className="mb-4 rounded-full p-4"
          style={{ background: 'rgba(139, 115, 85, 0.2)' }}
        >
          <svg className="h-10 w-10 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p 
          className="text-lg text-amber-600"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {isOwnProfile ? 'Your album is empty' : 'No photos to show'}
        </p>
        <p className="mt-1 text-sm text-amber-800">
          {isOwnProfile 
            ? 'Add photos from your travels to preserve memories!' 
            : 'This traveler hasn\'t shared any photos yet.'}
        </p>
      </div>
    );
  }

  const viewingMemory = viewingIndex !== null ? memories[viewingIndex] : null;

  return (
    <div className="space-y-8">
      {countries.map((countryCode) => (
        <div key={countryCode}>
          {/* Country section header */}
          <div className="mb-4 flex items-center gap-3">
            <div 
              className="h-px flex-1"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(139,115,85,0.5) 50%, transparent 100%)' }}
            />
            <h3 
              className="text-lg text-amber-500"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {countryNames[countryCode] ?? countryCode}
            </h3>
            <span className="rounded-full bg-amber-900/30 px-2 py-0.5 text-xs text-amber-600">
              {memoriesByCountry[countryCode].length} photos
            </span>
            <div 
              className="h-px flex-1"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(139,115,85,0.5) 50%, transparent 100%)' }}
            />
          </div>

          {/* Photo grid with scattered effect */}
          <div 
            className="grid gap-6 px-2"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            }}
          >
            {memoriesByCountry[countryCode].map((memory) => (
              <PhotoCard
                key={memory.id}
                memory={memory}
                countryName={countryNames[countryCode] ?? countryCode}
                isOwnProfile={isOwnProfile}
                onDelete={onDelete}
                onTogglePublic={onTogglePublic}
                onClick={() => setViewingIndex(memories.findIndex(m => m.id === memory.id))}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Photo viewer modal */}
      {viewingMemory && viewingIndex !== null && (
        <PhotoViewer
          memory={viewingMemory}
          countryName={countryNames[viewingMemory.countryCode] ?? viewingMemory.countryCode}
          onClose={() => setViewingIndex(null)}
          onPrev={() => setViewingIndex(Math.max(0, viewingIndex - 1))}
          onNext={() => setViewingIndex(Math.min(memories.length - 1, viewingIndex + 1))}
          hasPrev={viewingIndex > 0}
          hasNext={viewingIndex < memories.length - 1}
        />
      )}
    </div>
  );
}

