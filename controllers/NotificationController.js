const admin = require('firebase-admin');
const User = require('../models/User');
const Notification = require('../models/Notification');


const getNotifications = async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
  }

  try {
      const notifications = await Notification.find({ recipient: userId })
          .populate('sender', 'username avatar') // Ensure 'avatar' is included if it's a field
          .populate('post')
          .populate('comment')
          .populate('message');

      res.status(200).json(notifications);
  } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
};

const registerDevice = async (req, res) => {
  try {
    const { userId, token, deviceType, platform } = req.body;
    
    if (!userId || !token) {
      return res.status(400).json({ error: 'userId and token are required' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: {
          devices: { token, type: deviceType, platform }
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: error.message });
  }
};

const createNotification = async (notificationData) => {
  try {
    const {
      type,
      sender,
      recipient,
      post,
      comment,
      message,
      userId,
      title,
      body,
      data
    } = notificationData;

    if (!type || !sender || !recipient || !userId || !title || !body) {
      throw new Error('Missing required notification fields');
    }

    // Validate notification type
    if (!['like', 'comment', 'message', 'reply'].includes(type)) {
      throw new Error('Invalid notification type');
    }

    const notification = await Notification.create({
      type,
      sender,
      recipient,
      post,
      comment,
      message,
      userId,
      title,
      body,
      data: new Map(Object.entries(data || {})),
      sent: true
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// controllers/NotificationController.js

const sendNotification = async (req, res) => {
  try {
    const {
      type,
      senderId,
      recipientId,
      postId,
      commentId,
      messageId,
      title,
      body,
      data
    } = req.body;

    if (!type || !senderId || !recipientId || !title || !body) {
      return res.status(400).json({
        error: 'type, senderId, recipientId, title, and body are required'
      });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Send Mobile Push Notifications via FCM
    const tokens = recipient.devices.map(device => device.token);
    const message = {
      notification: { title, body },
      data: data || {},
      tokens
    };

    const response = await admin.messaging().sendMulticast(message);

    // Send Web Push Notifications
    const webPayload = { title, body, url: data.url || 'https://sraws.com' };
    await sendWebPush(recipientId, webPayload);

    // Create notification in database
    const notification = await createNotification({
      type,
      sender: senderId,
      recipient: recipientId,
      post: postId,
      comment: commentId,
      message: messageId,
      userId: recipientId,
      title,
      body,
      data
    });

    res.status(200).json({
      success: true,
      notification,
      response: {
        successCount: response.successCount,
        failureCount: response.failureCount
      }
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
};

const sendTopicNotification = async (req, res) => {
  try {
    const { topic, title, body, data, type, senderId } = req.body;
    
    if (!topic || !title || !body || !type || !senderId) {
      return res.status(400).json({
        error: 'topic, title, body, type, and senderId are required'
      });
    }

    const message = {
      notification: { title, body },
      data: data || {},
      topic
    };

    const response = await admin.messaging().send(message);
    
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('Error sending topic notification:', error);
    res.status(500).json({ error: error.message });
  }
};

const webPush = require('web-push');

const subscribe = async (req, res) => {
  try {
      const { userId, subscription } = req.body;

      if (!userId || !subscription) {
          return res.status(400).json({ error: 'User ID and subscription are required' });
      }

      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }

      user.subscriptions.push(subscription);
      await user.save();

      res.status(201).json({ message: 'Subscription added successfully' });
  } catch (error) {
      console.error('Error subscribing user:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
};

const sendWebPush = async (userId, payload) => {
  try {
    const user = await User.findById(userId);
    const subscriptions = user.subscriptions;

    const notifications = subscriptions.map(sub => 
      webPush.sendNotification(sub, JSON.stringify(payload))
    );

    await Promise.all(notifications);
    console.log('Web push notifications sent');
  } catch (error) {
    console.error('Error sending web push:', error);
  }
};
const scheduleNotification = async (req, res) => {
  try {
      // Implement your notification scheduling logic here
      res.status(200).json({ message: 'Notification scheduled successfully' });
  } catch (error) {
      console.error('Error scheduling notification:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getNotifications,
  registerDevice,

  sendNotification,
  sendTopicNotification,
  createNotification,
  subscribe,
  sendWebPush,
  scheduleNotification,
};