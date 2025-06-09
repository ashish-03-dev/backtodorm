const productsMenu = [
  {
    title: "All Posters",
    items: [
      { name: "New Arrivals", link: "/products/new" },
      { name: "Bestsellers", link: "/products/bestsellers" },
      { name: "Offers", link: "/products/offers" },
    ],
  },
];

productsMenu.images = [
  { src: "/images/poster1.jpg", alt: "Poster 1", link: "/products/new", label: "New Arrivals" },
  { src: "/images/bestseller.jpg", alt: "Bestseller", link: "/products/bestsellers", label: "Top Pick" },
];
export default productsMenu;
