import React, { useState, useEffect } from 'react';
import { useFirebase } from '../../context/FirebaseContext';
import { collection, getDocs, doc, query, where } from 'firebase/firestore';
import NavDropdown from './NavDropdown';

const fetchImages = async (ids, firestore) => {
  const uniqueIds = [...new Set(ids.filter(id => id))];
  const chunks = [];
  for (let i = 0; i < uniqueIds.length; i += 10) {
    chunks.push(uniqueIds.slice(i, i + 10));
  }

  const imageResults = [];
  for (const chunk of chunks) {
    const q = query(collection(firestore, "posters"), where("__name__", "in", chunk));
    const querySnap = await getDocs(q);
    querySnap.forEach(doc => imageResults.push([doc.id, doc.data().imageUrl || ""]));
  }
  return imageResults;
};

export default function NavLinks() {
  const { firestore } = useFirebase();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [menus, setMenus] = useState([]);
  const [posterImages, setPosterImages] = useState({});
  const [loading, setLoading] = useState(true);

  const handleMouseEnter = (type) => setActiveDropdown(type);
  const handleMouseLeave = () => setActiveDropdown(null);

  useEffect(() => {
    const fetchMenus = async () => {
      if (!firestore) {
        console.error('Firestore instance is not available');
        setLoading(false);
        return;
      }
      try {
        const menusDocRef = doc(firestore, 'homeSections', 'menus');
        const menusDoc = await getDocs(collection(firestore, 'homeSections'));
        const menusData = menusDoc.docs.find((d) => d.id === 'menus')?.data();
        const menuList = menusData?.menuList || [];

        if (!Array.isArray(menuList)) {
          console.error('menuList is not an array:', menuList);
          setMenus([]);
          setLoading(false);
          return;
        }

        const sanitizedMenus = menuList.map((menu) => {
          const sanitized = {
            id: menu.id || '',
            sections: Array.isArray(menu.sections) ? menu.sections : [],
            images: Array.isArray(menu.images) ? menu.images : [],
          };
          return sanitized;
        });

        setMenus(sanitizedMenus);

        const imageIds = sanitizedMenus.flatMap((menu) =>
          menu.images.map((img) => img.src).filter((id) => id && typeof id === 'string')
        );

        if (imageIds.length) {
          const imageResults = await fetchImages(imageIds, firestore);
          setPosterImages(Object.fromEntries(imageResults));
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch menus:', err);
        setMenus([]);
        setLoading(false);
      }
    };

    fetchMenus();
  }, [firestore]);

  if (loading) {
    return null;
  }

  return (
    <nav className="col-md-5 d-none d-lg-flex flex-grow-1 justify-content-center h-100">
      <ul className="nav h-100 justify-content-between align-items-stretch py-0 my-0" style={{ fontSize: '17px' }}>
        <li className="nav-item">
          <a className="nav-link text-dark h-100 d-flex align-items-center" href="/">
            Home
          </a>
        </li>

        {menus.map((menu) => {
          const menuProp = {
            sections: menu.sections || [],
            images: (menu.images || []).map((img) => ({
              ...img,
              src: posterImages[img.src] || img.src || '',
            })),
          };
          return (
            <NavDropdown
              key={menu.id}
              title={menu.id.charAt(0).toUpperCase() + menu.id.slice(1)}
              menu={menuProp}
              activeDropdown={activeDropdown}
              setActiveDropdown={setActiveDropdown}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              dropdownKey={menu.id}
            />
          );
        })}
      </ul>
    </nav>
  );
}