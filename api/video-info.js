const fetch = require('node-fetch');

// Function to extract video ID from various YouTube URL formats
function extractVideoId(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.pathname.includes('/shorts/')) {
            return urlObj.pathname.split('/shorts/')[1].split('?')[0];
        }
        return null;
    } catch (error) {
        console.error('Error extracting video ID:', error);
        return null;
    }
}

async function getVideoInfo(videoId) {
    try {
        // First try to get video metadata using YouTube's Data API alternative
        const response = await fetch(`https://www.youtube.com/shorts/${videoId}`);
        const html = await response.text();
        
        // Extract video title from meta tags
        const titleMatch = html.match(/<meta name="title" content="([^"]+)"/);
        const authorMatch = html.match(/<link itemprop="name" content="([^"]+)"/);
        
        if (!titleMatch) {
            throw new Error('Video not available');
        }

        const title = titleMatch[1];
        const author = authorMatch ? authorMatch[1] : 'Unknown Creator';
        
        // Use YouTube's image API to get thumbnails
        const thumbnails = [
            `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        ];

        return {
            title,
            author,
            thumbnails,
            videoId,
            watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
            shortsUrl: `https://www.youtube.com/shorts/${videoId}`
        };
    } catch (error) {
        console.error('Error fetching video info:', error);
        throw new Error('Video not available');
    }
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ 
                error: 'Missing URL',
                message: 'Please provide a YouTube Shorts URL'
            });
        }

        if (!url.includes('youtube.com/shorts/')) {
            return res.status(400).json({ 
                error: 'Invalid URL',
                message: 'Please provide a valid YouTube Shorts URL'
            });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ 
                error: 'Invalid URL',
                message: 'Could not extract video ID from URL'
            });
        }

        const info = await getVideoInfo(videoId);
        return res.json({
            success: true,
            info
        });

    } catch (error) {
        if (error.message === 'Video not available') {
            return res.status(404).json({
                error: 'Video Not Found',
                message: 'The video does not exist or is not available'
            });
        }

        return res.status(500).json({
            error: 'Server Error',
            message: 'An error occurred while processing your request'
        });
    }
}; 