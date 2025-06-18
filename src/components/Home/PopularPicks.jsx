import React from 'react';
import { useFirebase } from '../../context/FirebaseContext';
import SectionScroll from './SectionScroll';

export default function PopularPicks() {
  const { firestore } = useFirebase();

  return (
    <SectionScroll
      sectionId="popular"
      title="Popular Picks"
      firestore={firestore}
    />
  );
}