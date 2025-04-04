const express = require('express');
const cors = require('cors');
const videoInfo = require('./video-info');
const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is working', timestamp: new Date().toISOString() });
});

// Video info endpoint
app.get('/api/video-info', async (req, res) => {
    try {
        await videoInfo(req, res);
    } catch (error) {
        console.error('Error in video-info endpoint:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Default route
app.get('*', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 