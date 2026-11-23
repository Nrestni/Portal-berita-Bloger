/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Newspaper } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  aspectRatioClass?: string;
  category?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  imgClassName = '',
  aspectRatioClass = 'aspect-video',
  category = 'Berita',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setHasError(false);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`${aspectRatioClass} w-full bg-gradient-to-br from-slate-100 via-slate-200/70 to-slate-100 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-900 flex flex-col items-center justify-center p-6 text-slate-400 dark:text-slate-500 select-none border border-slate-200/60 dark:border-slate-700/60 overflow-hidden relative ${className}`}
      >
        <div className="w-11 h-11 rounded-full bg-white/80 dark:bg-slate-900/80 flex items-center justify-center mb-2 text-slate-500 dark:text-slate-400">
          <Newspaper className="w-5 h-5 stroke-[1.6]" />
        </div>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center line-clamp-1">
          {category}
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate text-center">
          Redaksi NewsApp
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden bg-slate-100 dark:bg-slate-800 ${aspectRatioClass} ${className}`}
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse" />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`block w-full h-full object-cover object-center transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${imgClassName}`}
      />
    </div>
  );
};
