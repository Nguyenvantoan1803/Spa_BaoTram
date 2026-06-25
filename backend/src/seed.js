// Script nạp dữ liệu mẫu vào MongoDB. Chạy: npm run seed
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./db");
const {
  Service,
  Combo,
  Product,
  News,
  Training,
  Testimonial,
  Info
} = require("./models");
const {
  businessInfo,
  services,
  combos,
  products,
  news,
  trainings,
  testimonials
} = require("./data");

async function seed() {
  await connectDB();
  console.log("🌱 Đang nạp dữ liệu mẫu...");

  await Promise.all([
    Service.deleteMany({}),
    Combo.deleteMany({}),
    Product.deleteMany({}),
    News.deleteMany({}),
    Training.deleteMany({}),
    Testimonial.deleteMany({}),
    Info.deleteMany({})
  ]);

  await Service.insertMany(services);
  await Combo.insertMany(combos);
  await Product.insertMany(products);
  await News.insertMany(news);
  await Training.insertMany(trainings);
  await Testimonial.insertMany(testimonials);
  await Info.create(businessInfo);

  console.log("✅ Nạp dữ liệu thành công:");
  console.log(`   - ${services.length} dịch vụ`);
  console.log(`   - ${combos.length} combo`);
  console.log(`   - ${products.length} sản phẩm`);
  console.log(`   - ${news.length} tin tức`);
  console.log(`   - ${trainings.length} khóa đào tạo`);
  console.log(`   - ${testimonials.length} đánh giá`);
  console.log(`   - 1 thông tin doanh nghiệp`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Lỗi khi nạp dữ liệu:", err);
  process.exit(1);
});
