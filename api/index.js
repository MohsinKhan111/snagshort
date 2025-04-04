// Import required modules
const videoInfo = require('./video-info');
const download = require('./download');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Get the path from the URL
    const urlParts = req.url.split('/').filter(part => part);
    const path = urlParts[urlParts.length - 1]; // Get the last part of the path

    try {
        switch (path) {
            case 'video-info':
                return await videoInfo(req, res);
            case 'download':
                return await download(req, res);
            case 'health':
                return res.json({ status: 'ok', message: 'API is working', timestamp: new Date().toISOString() });
            default:
                console.log('Path not found:', path, 'URL:', req.url);
                return res.status(404).json({ error: 'Not found', path: path, url: req.url });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}; 