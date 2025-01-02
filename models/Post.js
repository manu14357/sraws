const mongoose = require("mongoose");
const filter = require("../util/filter");
const PostLike = require("./PostLike");
const slugify = require("slugify"); // Ensure you have slugify installed

const PostSchema = new mongoose.Schema(
  {
    poster: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxLength: [80, "Must be no more than 80 characters"],
    },
    content: {
      type: String,
      required: true,
      maxLength: [8000, "Must be no more than 8000 characters"],
    },
    address: {
      country: { type: String, required: true },
      state: { type: String, required: false },
      city: { type: String, required: false },
      area: { type: String, required: false },
    },
    mediaUrls: {
      type: [String], // Array of media URLs
      required: false,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    edited: {
      type: Boolean,
      default: false,
    },
    metaTitle: {
      type: String,
      required: false,
    },
    metaDescription: {
      type: String,
      required: false,
    },
    metaKeywords: {
      type: String,
      required: false,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    slug: { // New slug field
      type: String,
      unique: true, // Ensure slugs are unique
      required: true,
    },
  },
  { timestamps: true }
);

PostSchema.pre("save", function (next) {
  if (this.title.length > 0) {
    this.title = filter.clean(this.title);
  }

  if (this.content.length > 0) {
    this.content = filter.clean(this.content);
  }

  if (!this.metaTitle) {
    this.metaTitle = `${this.title}`;
  }
  if (!this.metaDescription) {
    this.metaDescription = `${this.content.substring(0, 160)}...`;
  }
  if (!this.metaKeywords) {
    this.metaKeywords = `${this.title}, ${this.address.city}, ${this.address.state}, ${this.address.country}`;
  }

  // Create an SEO-friendly slug
  const titleWithHyphens = this.metaTitle.trim().replace(/\s+/g, '-'); // Replace spaces with hyphens
  this.slug = slugify(`${titleWithHyphens} ${this.address.country}`, {
    lower: true, // Convert to lowercase
    strict: true, // Remove special characters
  });

  next();
});

PostSchema.pre("remove", async function (next) {
  await PostLike.deleteMany({ postId: this._id });
  next();
});

const Post = mongoose.model('Post', PostSchema);

module.exports = Post; // Update to export Post model
