const mongoose = require("mongoose");

// Kết nối tới MongoDB (Atlas hoặc local) qua biến môi trường MONGODB_URI
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "❌ Thiếu MONGODB_URI. Hãy tạo file backend/.env và thêm chuỗi kết nối MongoDB Atlas."
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000
    });
    console.log("✅ Đã kết nối MongoDB");
  } catch (err) {
    console.error("❌ Không kết nối được MongoDB:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
