import React from 'react';
import { useFirebase } from '../../context/FirebaseContext';
import SectionScroll from './SectionScroll';

export default function Trending() {
  const { firestore } = useFirebase();

  return (
    <SectionScroll
      sectionId="trending"
      title="Trending Posters"
      firestore={firestore}
    />
  );
}