/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { NewsArticle } from '../types/blogger';
import { ImageWithFallback } from './ImageWithFallback';

interface FeaturedArticleProps {
  articles: NewsArticle[];
  onSelect: (article: NewsArticle) => void;
}

export const FeaturedArticle: React.FC<FeaturedArticleProps> = ({ articles, onSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!articles || articles.length === 0) return null;

  const currentArticle = articles[currentIndex] || articles[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : articles.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < articles.length - 1 ? prev + 1 : 0));
  };

  return (
    <article
      onClick={() => onSelect(currentArticle)}
      className="group cursor-pointer bg-white rounded-3xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden p-3.5 sm:p-4 relative active:scale-[0.99]"
    >
      {/* Cover Image with Breaking News badge */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-video sm:aspect-[16/10]">
        <ImageWithFallback
          src={currentArticle.thumbnail}
          alt={currentArticle.title}
          aspectRatioClass="w-full h-full"
          className="group-hover:scale-[1.02] transition-transform duration-500 w-full h-full object-cover"
          category={currentArticle.primaryCategory}
        />

        {/* Breaking News Red Badge matching reference image */}
        <div className="absolute bottom-3 left-3 z-10">
          <span className="inline-block px-3.5 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg shadow-md tracking-wide">
            Breaking News
          </span>
        </div>

        {/* Publisher/Category badge on top-right */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded bg-black/50 backdrop-blur-xs text-[10px] font-bold text-white tracking-widest uppercase">
            {currentArticle.primaryCategory}
          </span>
        </div>

        {/* Carousel controls if more than 1 article */}
        {articles.length > 1 && (
          <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
            <button
              onClick={handlePrev}
              className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/60 pointer-events-auto transition-transform active:scale-90"
              aria-label="Previous story"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/60 pointer-events-auto transition-transform active:scale-90"
              aria-label="Next story"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content details beneath image */}
      <div className="pt-3.5 px-1 space-y-2">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2 leading-snug">
          {currentArticle.title}
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed">
          {currentArticle.plainTextExcerpt}
        </p>

        {/* Location / Date info row matching image & Carousel Indicator */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentArticle.publishedFormatted}</span>
            <span className="text-slate-300">·</span>
            <span>{currentArticle.readingTime} min read</span>
          </div>

          {/* Carousel dots */}
          {articles.length > 1 && (
            <div className="flex items-center gap-1">
              {articles.slice(0, 4).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentIndex ? 'w-4 bg-red-600' : 'w-1.5 bg-slate-200'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
