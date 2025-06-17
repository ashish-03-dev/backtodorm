import React, { createContext, useContext, useState } from "react";

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const [searchState, setSearchState] = useState({
    queryString: "",
    results: [],
    loading: false,
    imagesLoading: false,
    error: "",
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

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
};