import React from 'react';
import { useFirebase } from '../../context/FirebaseContext';
import SectionScroll from './SectionScroll';

export default function PopularPicks() {
  const { firestore } = useFirebase();

  return (
    <SectionScroll
      sectionId="popular-picks"
      title="Popular Picks"
      firestore={firestore}
    />
  );
}