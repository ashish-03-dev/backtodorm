// src/data/collections.js

const collections = {
  minimal: [
    {
      id: 'black-white',
      title: 'Black & White Minimal',
      description: 'Clean and simple designs in monochrome.',
      posters: [
        {
          id: 'bw1',
          title: 'Black Dot',
          description: 'Minimalist black dot on white background.',
          img: '/images/trending/image1.png',
          price: 199
        }
      ]
    }
  ],
  marvel: [
    {
      id: 'avengers',
      title: 'Avengers Assemble',
      description: 'Posters featuring the original Avengers.',
      posters: [
        {
          id: 'av1',
          title: 'Iron Man',
          description: 'Stylized poster of Iron Man.',
          img: '/images/ironman.jpg',
          price: 399
        }
      ]
    }
  ],
  art: [
    {
      id: 'modern',
      title: 'Modern Art',
      description: 'Abstract and contemporary designs.',
      posters: [
        {
          id: 'art1',
          title: 'Color Shapes',
          description: 'A blend of bold shapes and colors.',
          img: '/images/art1.jpg',
          price: 349
        }
      ]
    }
  ]
};

export default collections;
