// backend/shared/redisClient.js
const { createClient } = require('redis');

// Connect to the local Docker Redis instance
const redisClient = createClient({
    // url: 'redis://localhost:6379'
    url: 'redis://127.0.0.1:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Successfully connected to Redis'));

// Self-invoking function to establish the connection immediately
(async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
})();

module.exports = redisClient;