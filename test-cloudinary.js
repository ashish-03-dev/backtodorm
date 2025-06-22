const cloudinary = require("cloudinary").v2;
const path = require("path");

cloudinary.config({
  cloud_name: "dqu3mzqfj",
  api_key: "128822176547341",
  api_secret: "5DOZFmacbn8o6aB0BUdPE7OLOLY",
});

// Use path.resolve to ensure correct file path
const imagePath = path.resolve(
  "C:/Users/ashis/Documents/WhatsApp Image 2025-06-20 at 20.40.43_94c6a9d9.jpg"
);

cloudinary.uploader.upload(
  imagePath,
  { resource_type: "image", folder: "test" },
  (error, result) => {
    console.log("Cloudinary test upload:", { error, result });
  }
);