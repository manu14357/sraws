const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const csv = require("csv-parser");
const fs = require("fs");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB Atlas');
  // Load CSV data into MongoDB when the database connection is established
  loadCSVData();
});

// Define the City schema and model
const citySchema = new mongoose.Schema({
  id: Number,
  name: String,
  state_id: Number,
  state_code: String,
  state_name: String,
  country_id: Number,
  country_code: String,
  country_name: String,
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number], // [longitude, latitude]
  },
  wikiDataId: String,
});

// Create a 2dsphere index on the location field
citySchema.index({ location: '2dsphere' });

const City = mongoose.model('City', citySchema);

// Load CSV data into MongoDB
const loadCSVData = () => {
  const cities = [];
  fs.createReadStream(path.join(__dirname, 'cities.csv'))
    .pipe(csv())
    .on('data', (row) => {
      const city = {
        id: row.id,
        name: row.name,
        state_id: row.state_id,
        state_code: row.state_code,
        state_name: row.state_name,
        country_id: row.country_id,
        country_code: row.country_code,
        country_name: row.country_name,
        location: {
          type: 'Point',
          coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)],
        },
        wikiDataId: row.wikiDataId,
      };
      cities.push(city);
    })
    .on('end', async () => {
      try {
        await City.insertMany(cities);
        console.log('CSV data loaded into MongoDB');
      } catch (err) {
        console.error('Error loading CSV data into MongoDB:', err);
      }
    });
};

// Function to find the closest city using geospatial query
const findClosestCity = async (lat, lon) => {
  try {
    const city = await City.findOne({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lon, lat] },
          $maxDistance: 50000, // 50 km radius, adjust as needed
        },
      },
    });
    return city;
  } catch (err) {
    console.error('Error finding closest city:', err);
    return null;
  }
};

// Route to get city by latitude and longitude
app.get('/geolocation', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const city = await findClosestCity(parseFloat(lat), parseFloat(lon));
  if (!city) {
    return res.status(404).json({ error: 'City not found' });
  }

  res.json({
    city: city.name,
    state: city.state_name,
    country: city.country_name,
    latitude: city.location.coordinates[1],
    longitude: city.location.coordinates[0],
  });
});

// Routes for other functionalities (e.g., posts, users, comments, messages)
const postsRoutes = require('./routes/posts');
const usersRoutes = require('./routes/users');
const commentsRoutes = require('./routes/comments');
const messagesRoutes = require('./routes/messages');

app.use('/api/posts', postsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/messages', messagesRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Middleware to set global SEO meta tags
app.use((req, res, next) => {
  res.locals.siteName = 'Sraws';
  res.locals.defaultPageTitle = 'Default Page Title'; // Update with your default title
  res.locals.defaultPageDescription = 'Default Page Description'; // Update with your default description
  res.locals.defaultPageKeywords = 'default, keywords, for, your, website'; // Update with your default keywords

  next();
});

// Socket.IO setup
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://sraws.com" ,"https://api.sraws.com", "https://sraws.com:3000", "https://api.sraws.com:4000","http://localhost:4000"],
  },
});
const { authSocket, socketServer } = require("./socketServer");

io.use(authSocket);
io.on("connection", (socket) => socketServer(socket));

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server is running on https://api.sraws.com:${PORT}`);
});


const notificationRoutes = require('./routes/notifications'); // Adjust the path as needed

app.use('/api', notificationRoutes);
app.use('/api', require('./routes/notifications'));

const cron = require('node-cron');
const checkAndSendNotificationEmail = require('./client/src/components/Notifier/notifyUsers');

cron.schedule('*/10 * * * *', checkAndSendNotificationEmail);

console.log('Notification email service started');



const feedbackRoutes = require('./routes/feedback');
app.use('/api/feedback', feedbackRoutes);

const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

const Post = require("./models/Post");

cron.schedule("0 * * * *", async () => { // Runs every minute
  try {
    const now = new Date();

    // Update viewCount by 2 for posts created within the first 3 days
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 5);
    await Post.updateMany(
      { createdAt: { $gte: threeDaysAgo } },
      { $inc: { viewCount: 2 } }
    );

  } catch (error) {
  }
});

cron.schedule("0 */12 * * *", async () => { // Runs every hour
  try {
    const now = new Date();

    // Update viewCount by 1 for posts created more than 3 days ago
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);
    await Post.updateMany(
      { createdAt: { $lt: threeDaysAgo } },
      { $inc: { viewCount: 1 } }
    );

  } catch (error) {
  }
});

const { SitemapStream, streamToPromise } = require('sitemap');

const links = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/about', changefreq: 'monthly', priority: 0.8 },
  { url: '/contact', changefreq: 'monthly', priority: 0.8 },
  // Add other URLs here
];


app.get('/generate-sitemap', async (req, res) => {
  try {
    const hostname = 'https://www.sraws.com';
    
    // Fetch all posts
    const posts = await Post.find({}, 'slug updatedAt'); // Adjust fields as necessary

    // Create a SitemapStream instance
    const sitemap = new SitemapStream({ hostname });

    // Add static URLs
    sitemap.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    sitemap.write({ url: '/About', changefreq: 'monthly', priority: 0.8 });
    sitemap.write({ url: '/Help', changefreq: 'monthly', priority: 0.8 });
    sitemap.write({ url: '/Search-for-Users', changefreq: 'weekly', priority: 0.8 });
    sitemap.write({ url: '/Community-Corner', changefreq: 'yearly', priority: 0.8 });
    sitemap.write({ url: '/terms-of-service', changefreq: 'monthly', priority: 0.7 });
    sitemap.write({ url: '/cookie-policy', changefreq: 'yearly', priority: 0.5 });
    sitemap.write({ url: '/copyright-policy', changefreq: 'yearly', priority: 0.5 });

    // Add dynamic URLs for each post
    posts.forEach(post => {
      sitemap.write({
        url: `/posts/${post.slug}/${post._id}?edited=${post.edited ? "true" : "false"}`, // Adjust path if necessary
        lastmod: post.updatedAt.toISOString().split('T')[0], // Format date as YYYY-MM-DD
        changefreq: 'weekly',
        priority: 0.6,
      });
    });

    // Close the sitemap stream
    sitemap.end();

    // Write sitemap to the correct public directory
    const filePath = path.join(__dirname, 'client', 'public', 'sitemap.xml'); // Adjusted path
    const sitemapData = await streamToPromise(sitemap);
    fs.writeFileSync(filePath, sitemapData);

    res.send('Sitemap generated and saved successfully!');

  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Failed to generate sitemap');
  }
});

// Schedule to run every day at midnight
cron.schedule('0 0 * * *', () => {
  console.log('Generating sitemap...');
  fetch(`https://www.sraws.com/generate-sitemap`) // Use the production URL
    .then(response => response.text())
    .then(console.log)
    .catch(console.error);
});
