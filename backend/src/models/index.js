const mongoose = require("mongoose");

const { Schema } = mongoose;

// Bỏ _id và __v khi trả JSON cho frontend (frontend dùng trường "id")
const cleanJSON = {
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
    return ret;
  }
};

// Dùng cho Booking/Contact: đổi _id thành id để admin có khoá xoá
const idJSON = {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
};

const serviceSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: String,
    icon: String,
    description: String,
    items: [
      {
        _id: false,
        name: String,
        duration: String,
        price: Number,
        steps: [String]
      }
    ],
    active: { type: Boolean, default: true } // true = hiển thị web, false = đã dừng
  },
  { toJSON: cleanJSON }
);

const comboSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: String,
    description: String,
    price: String,        // hiển thị dạng "99K"
    oldPrice: String,     // hiển thị dạng "199K"
    image: String,
    badge: String,        // "HOT", "BEST SELLER"...
    best: Boolean,        // tô màu badge nổi bật
    items: [String],      // danh sách gạch đầu dòng
    gift: String,         // dòng "TẶNG: ..."
    active: { type: Boolean, default: true }
  },
  { toJSON: cleanJSON }
);

const productSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: String,
    price: Number,
    category: String,
    image: String,
    description: String,
    active: { type: Boolean, default: true }
  },
  { toJSON: cleanJSON }
);

const newsSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    title: String,
    date: String,
    excerpt: String,
    image: String,
    content: String,
    active: { type: Boolean, default: true }
  },
  { toJSON: cleanJSON }
);

const trainingSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: String,
    duration: String,
    price: Number,
    description: String,
    active: { type: Boolean, default: true }
  },
  { toJSON: cleanJSON }
);

const testimonialSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: String,
    rating: Number,
    comment: String,
    img: String,   // ảnh đại diện
    loc: String,   // địa điểm, vd "Châu Thành, Bến Tre"
    active: { type: Boolean, default: true }
  },
  { toJSON: cleanJSON }
);

const infoSchema = new Schema(
  {
    name: String,
    slogan: String,
    phone: String,
    email: String,
    website: String,
    branches: [String],
    workingHours: String,
    socials: {
      _id: false,
      facebook: String,
      instagram: String,
      zalo: String
    }
  },
  { toJSON: cleanJSON }
);

const bookingSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    service: { type: String, required: true },
    branch: String, // cơ sở/chi nhánh khách chọn
    date: String,
    note: String,
    // Trạng thái xử lý: moi | da_dung | doi_dv | huy
    status: { type: String, default: "moi" }
  },
  { timestamps: true, toJSON: idJSON }
);

const contactSchema = new Schema(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
    message: { type: String, required: true }
  },
  { timestamps: true, toJSON: idJSON }
);

// Tin nhắn trong 1 hội thoại (khách <-> nhân viên)
const chatMessageSchema = new Schema(
  {
    from: { type: String, enum: ["user", "staff"], required: true },
    text: { type: String, default: "" },
    image: String, // ảnh dạng data URL (base64) nếu là tin nhắn ảnh
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

// Hội thoại chat trực tiếp với tư vấn viên
const conversationSchema = new Schema(
  {
    // Mã khách (lưu ở localStorage trình duyệt khách) để nhận lại đúng hội thoại
    visitorId: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "Khách" },
    phone: String,
    messages: [chatMessageSchema],
    lastMessageAt: { type: Date, default: Date.now },
    // Số tin nhắn của khách mà admin chưa đọc
    unreadAdmin: { type: Number, default: 0 },
    // Thời điểm gõ gần nhất của mỗi bên (để hiện "đang soạn tin...")
    userTypingAt: Date,
    staffTypingAt: Date
  },
  { timestamps: true, toJSON: idJSON }
);

// Khách hàng (tự tạo khi có lịch hẹn; nhân viên bổ sung thông tin)
const customerSchema = new Schema(
  {
    name: String,
    phone: { type: String, index: true },
    email: String,
    address: String,
    birthday: String,
    note: String
  },
  { timestamps: true, toJSON: idJSON }
);

// Sự kiện thống kê: truy cập & lượt bấm các nút liên hệ
const eventSchema = new Schema(
  {
    // visit | call | zalo | messenger | chat
    type: { type: String, required: true, index: true },
    day: { type: String, index: true }, // "YYYY-MM-DD" (giờ VN) để gom nhanh
    at: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

// ====== INDEXES de toi uu query (chay khi seed/start) ======
// Booking: tim theo SDT, sort theo createdAt, loc theo status
bookingSchema.index({ phone: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ createdAt: -1 });

// Contact: sort theo createdAt
contactSchema.index({ createdAt: -1 });

// Conversation: sort theo lastMessageAt (visitorId da co unique)
conversationSchema.index({ lastMessageAt: -1 });

// Customer: tim nhanh theo phone
customerSchema.index({ phone: 1 }, { unique: true, sparse: true });

// Event: compound index cho stats query
eventSchema.index({ day: 1, type: 1 });

// News: sort theo date
newsSchema.index({ date: -1 });

// Tat ca model co "active" -> them index
serviceSchema.index({ active: 1 });
comboSchema.index({ active: 1 });
productSchema.index({ active: 1, category: 1 });
trainingSchema.index({ active: 1 });
testimonialSchema.index({ active: 1 });

module.exports = {
  Service: mongoose.model("Service", serviceSchema),
  Combo: mongoose.model("Combo", comboSchema),
  Product: mongoose.model("Product", productSchema),
  News: mongoose.model("News", newsSchema),
  Training: mongoose.model("Training", trainingSchema),
  Testimonial: mongoose.model("Testimonial", testimonialSchema),
  Info: mongoose.model("Info", infoSchema),
  Booking: mongoose.model("Booking", bookingSchema),
  Contact: mongoose.model("Contact", contactSchema),
  Conversation: mongoose.model("Conversation", conversationSchema),
  Event: mongoose.model("Event", eventSchema),
  Customer: mongoose.model("Customer", customerSchema)
};
