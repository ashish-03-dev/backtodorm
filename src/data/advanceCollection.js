const allCollections = {
  "theme": {
    minimal: [
      {
        name: "Clean Lines",
        posters: [
          {
            id: "min1",
            title: "Minimalist Plant",
            img: "/images/trending/image1.png",
            price: 299,
          },
          {
            id: "min2",
            title: "Black & White Shapes",
            img: "/images/trending/image2.png",
            price: 349,
          },
        ],
      },
      {
        name: "Neutral Tones",
        posters: [
          {
            id: "min3",
            title: "Calm Desert",
            img: "/images/trending/image3.png",
            price: 399,
          },
        ],
      },
    ],
    abstract: [
      {
        name: "Colorful Forms",
        posters: [
          {
            id: "abs1",
            title: "Color Splash",
            img: "/images/collections/abstract-color.jpg",
            price: 329,
          },
          {
            id: "abs2",
            title: "Geometric Vibes",
            img: "/images/collections/abstract-geo.jpg",
            price: 359,
          },
        ],
      },
    ],
    motivational: [
      {
        name: "Hustle Quotes",
        posters: [
          {
            id: "mot1",
            title: "Dream Big",
            img: "/images/collections/motivational-dream.jpg",
            price: 299,
          },
          {
            id: "mot2",
            title: "Keep Going",
            img: "/images/collections/motivational-keep.jpg",
            price: 319,
          },
        ],
      },
    ],
    quotes: [
      {
        name: "Typography",
        posters: [
          {
            id: "quo1",
            title: "Do What You Love",
            img: "/images/collections/quotes-love.jpg",
            price: 289,
          },
          {
            id: "quo2",
            title: "Believe in Yourself",
            img: "/images/collections/quotes-believe.jpg",
            price: 299,
          },
        ],
      },
    ],
  },
  "pop-culture": {
    // anime: [
    //   {
    //     id: "p1",
    //     title: "Naruto Uzumaki Poster",
    //     img: "/images/trending/image1.png",
    //     price: 299,
    //   },
    //   {
    //     id: "p2",
    //     title: "Jujutsu Kaisen Poster",
    //     img: "/images/trending/image2.png",
    //     price: 349,
    //   },
    //   {
    //     id: "p3",
    //     title: "Attack on Titan Poster",
    //     img: "/images/trending/image3.png",
    //     price: 329,
    //   },
    // ],
    superheroes: [
      {
        id: "p4",
        title: "Iron Man Poster",
        img: "/images/allcollections/pop-culture/superheroes/image1.png",
        price: 399,
      },
      {
        id: "p5",
        title: "Spider-Man Multiverse Poster",
        img: "/images/allcollections/pop-culture/superheroes/image3.png",
        price: 379,
      },
      {
        id: "p5",
        title: "Super Man Poster",
        img: "/images/allcollections/pop-culture/superheroes/image2.png",
        price: 379,
      },
    ],
    "tv-series": [
      {
        id: "p6",
        title: "The Witcher Poster",
        img: "/images/allcollections/pop-culture/TV-series/image1.png",
        price: 359,
      },
      {
        id: "p7",
        title: "Breaking Bad Poster",
        img: "/images/allcollections/pop-culture/TV-series/image3.png",
        price: 349,
      },
    ],
    gaming: [
      {
        id: "p8",
        title: "God of War Poster",
        img: "/images/allcollections/pop-culture/games/image1.png",
        price: 389,
      },
      {
        id: "p9",
        title: "GTA Vice City Poster",
        img: "/images/allcollections/pop-culture/games/image2.png",
        price: 329,
      },
    ],
    movies: [
      {
        id: "p10",
        title: "John Wick Poster",
        img: "/images/allcollections/pop-culture/movies/image1.png",

        price: 419,
      },
      {
        id: "p10",
        title: "The Dark Knight Poster",
        img: "/images/allcollections/pop-culture/movies/image2.png",
        price: 419,
      },
      {
        id: "p10",
        title: "The Shawshank Redemption Poster",
        img: "/images/allcollections/pop-culture/movies/image3.png",
        price: 419,
      },
    ],
  },
  "niche": {
    cars: [
      {
        id: "n1",
        title: "Ford Mustang 1969",
        img: "/images/allCollections/niche/cars/image1.png",
        price: "199",
      },
      {
        id: "n1",
        title: "Porsche Sports",
        img: "/images/allCollections/niche/cars/image2.png",
        price: "219",
      },
      {
        id: "n1",
        title: "Porsche",
        img: "/images/allCollections/niche/cars/image3.png",
        price: "399",
      }
    ],
    bikes: [
      {
        id: "n1",
        title: "Continental GT 650",
        img: "/images/allCollections/niche/bikes/image1.png",
        price: "199",
      },
      {
        id: "n1",
        title: "BMW Sports",
        img: "/images/allCollections/niche/bikes/image2.png",
        price: "219",
      },
      {
        id: "n1",
        title: "Ducati Panigale v4",
        img: "/images/allCollections/niche/bikes/image3.png",
        price: "399",
      }
    ],
    conceptCars: [
      {
        id: "n1",
        title: "Mclaren P1",
        img: "/images/allCollections/niche/concept-cars/image1.png",
        price: "199",
      },
      {
        id: "n1",
        title: "Konigsegg",
        img: "/images/allCollections/niche/concept-cars/image2.png",
        price: "219",
      },
      {
        id: "n1",
        title: "BMW M4",
        img: "/images/allCollections/niche/concept-cars/image3.png",
        price: "399",
      }
    ],
  }
};

export default allCollections;