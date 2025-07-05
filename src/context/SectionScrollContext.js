import React, { createContext, useContext, useState } from 'react';

const PosterContext = createContext();

export const useSectionContext = () => useContext(PosterContext);

export const SectionProvider = ({ children }) => {
  const [posterCache, setPosterCache] = useState({});

  // Function to cache posters for a section
  const cachePosters = (sectionId, posters, posterIds, hasMore) => {
    setPosterCache((prev) => ({
      ...prev,
      [sectionId]: { posters, posterIds, hasMore },
    }));
  };

  // Function to get cached posters
  const getCachedPosters = (sectionId) => {
    return posterCache[sectionId] || null;
  };

  return (
    <PosterContext.Provider value={{ cachePosters, getCachedPosters }}>
      {children}
    </PosterContext.Provider>
  );
};

export const usePosterContext = () => useContext(PosterContext);