const customMenu = [
  {
    title: "Get Your Custom Poster",
    items: [
      { name: "Upload Your Design", link: "/custom/upload" },
      { name: "AI-Generated Poster", link: "/custom/ai" },
      { name: "Poster Sizing Guide", link: "/custom/guide" },
    ],
  },
];

customMenu.images = [
  { src: "/images/trending/image1.png", alt: "AI Poster", link: "/custom/ai", label: "AI Poster" },
  { src: "/images/trending/image2.png", alt: "Upload", link: "/custom/upload", label: "Upload Design" },
];
export default customMenu;
