import React, { createContext, useContext, useState } from "react";

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const [searchState, setSearchState] = useState({
    queryString: "",
    results: [],
    loading: false,
    imagesLoading: false,
    error: "",
    hasSearched: false,
    allPosterIds: [],
    page: 0,
    hasMore: true,
    totalResults: 0,
  });

  const updateSearchState = (updates) => {
    setSearchState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <SearchContext.Provider value={{ searchState, updateSearchState }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => useContext(SearchContext);
