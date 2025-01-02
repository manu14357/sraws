const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['like', 'comment', 'message', 'reply'], required: true }, // Add 'reply' type
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  read: { type: Boolean, default: false },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  data: {
    type: Map,
    of: String,
    default: {}
  },
  sent: {
    type: Boolean,
    default: false
  },
  createdAt: { type: Date, default: Date.now }
});


const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
