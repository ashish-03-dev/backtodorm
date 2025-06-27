import React, { useState, useEffect, useRef } from 'react';

const PosterFrameTest = () => {
  const canvasRef = useRef(null);
  const [frame, setFrame] = useState('wooden');
  const [size, setSize] = useState('A4');
  const [imageUrl, setImageUrl] = useState('');

  // Placeholder image URLs (replace with your own, e.g., Cloudinary or local paths)
  const posterUrl = 'https://via.placeholder.com/496x701.png?text=Poster';
  const frameUrls = {
    A4: {
      wooden: 'https://via.placeholder.com/496x701/ffffff/000000?text=A4+Wooden+Frame',
      metal: 'https://via.placeholder.com/496x701/cccccc/000000?text=A4+Metal+Frame',
    },
    A3: {
      wooden: 'https://via.placeholder.com/701x992/ffffff/000000?text=A3+Wooden+Frame',
      metal: 'https://via.placeholder.com/701x992/cccccc/000000?text=A3+Metal+Frame',
    },
    'A3*3': {
      wooden: 'https://via.placeholder.com/2103x992/ffffff/000000?text=A3x3+Wooden+Frame',
      metal: 'https://via.placeholder.com/2103x992/cccccc/000000?text=A3x3+Metal+Frame',
    },
    'A4*5': {
      wooden: 'https://via.placeholder.com/2480x701/ffffff/000000?text=A4x5+Wooden+Frame',
      metal: 'https://via.placeholder.com/2480x701/cccccc/000000?text=A4x5+Metal+Frame',
    },
  };
  const wallBackgroundUrl = 'https://via.placeholder.com/1200x800/eeeeee/000000?text=Wall+Background';

  // Poster size dimensions (in pixels, scaled for display at 20% of 300 DPI)
  const sizeDimensions = {
    A4: { width: 496, height: 701 }, // A4: 210x297mm
    A3: { width: 701, height: 992 }, // A3: 297x420mm
    'A3*3': { width: 701 * 3, height: 992 }, // A3*3: 891x420mm
    'A4*5': { width: 496 * 5, height: 701 }, // A4*5: 1050x297mm
  };

  useEffect(() => {
    const drawCanvas = async () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Set canvas size to fit the largest possible frame
      canvas.width = 1200;
      canvas.height = 800;

      // Load wall background
      const wallImg = new Image();
      wallImg.crossOrigin = 'Anonymous';
      wallImg.src = wallBackgroundUrl;
      await new Promise((resolve) => (wallImg.onload = resolve));

      // Load poster image
      const posterImg = new Image();
      posterImg.crossOrigin = 'Anonymous';
      posterImg.src = posterUrl;
      await new Promise((resolve) => (posterImg.onload = resolve));

      // Load frame image
      const frameImg = new Image();
      frameImg.crossOrigin = 'Anonymous';
      frameImg.src = frameUrls[size][frame];
      await new Promise((resolve) => (frameImg.onload = resolve));

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw wall background
      ctx.drawImage(wallImg, 0, 0, canvas.width, canvas.height);

      // Calculate poster and frame position (centered)
      const { width, height } = sizeDimensions[size];
      const x = (canvas.width - width) / 2;
      const y = (canvas.height - height) / 2;

      // Draw poster
      ctx.drawImage(posterImg, x, y, width, height);

      // Draw frame
      ctx.drawImage(frameImg, x, y, width, height);

      // Generate image URL for display
      const compositeImage = canvas.toDataURL('image/png');
      setImageUrl(compositeImage);
    };

    drawCanvas();
  }, [frame, size]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `framed_poster_${size}_${frame}.png`;
    link.click();
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Poster Frame Test</h1>
      <div className="mb-4 flex space-x-4">
        <div>
          <label className="mr-2">Frame Style:</label>
          <select
            value={frame}
            onChange={(e) => setFrame(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="wooden">Wooden</option>
            <option value="metal">Metal</option>
          </select>
        </div>
        <div>
          <label className="mr-2">Poster Size:</label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="A3*3">A3*3</option>
            <option value="A4*5">A4*5</option>
          </select>
        </div>
      </div>
      <canvas ref={canvasRef} className="border shadow-lg mb-4 w-full" />
      {imageUrl && (
        <div>
          <img src={imageUrl} alt="Framed Poster" className="max-w-full h-auto mb-4" />
          <button
            onClick={handleDownload}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Download Composite Image
          </button>
        </div>
      )}
    </div>
  );
};

export default PosterFrameTest;