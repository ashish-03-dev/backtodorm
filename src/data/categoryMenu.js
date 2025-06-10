const categoryMenu = [
  {
    title: "All Posters",
    items: [
      { name: "New Arrivals", link: "/collection/new" },
      { name: "Best Selling", link: "/collection/best-selling" },
    ],
  },
  {
    title: "Niche Picks",
    items: [
      { name: "Cars", link: "/collections/niche/cars" },
      { name: "Bikes", link: "/collections/niche/bikes" },
      { name: "Concept Cars", link: "/collections/niche/concept-cars" },
    ],
  },
  {
    title: "Mindset",
    items: [
      { name: "Devotional", link: "/collections/mindset/devotional" },
      { name: "Motivational", link: "/collections/mindset/motivational" },
      { name: "Quotes", link: "/collections/mindset/quotes" },
      { name: "Productivity", link: "/collections/mindset/productivity" },
    ],
  },
  {
    title: "Sports",
    items: [
      { name: "Football", link: "/collections/sports/football" },
      { name: "Cricket", link: "/collections/sports/cricket" },
      { name: "UFC", link: "/collections/sports/ufc" },
      { name: "F1", link: "/collections/sports/f1" },
    ],
  },
  {
    title: "Pop Culture",
    items: [
      { name: "Marvel", link: "/collections/pop-culture/marvel" },
      { name: "DC", link: "/collections/pop-culture/dc" },
      { name: "Gaming", link: "/collections/pop-culture/gaming" },
      { name: "Movies", link: "/collections/pop-culture/movies" },
      { name: "TV Series", link: "/collections/pop-culture/tv-series" },
      { name: "Music", link: "/collections/pop-culture/music" },
    ],
  },
  {
    title: "Make Your Own Poster",
    items: [], // Optional link to poster customizer
  },
];

export default categoryMenu;
