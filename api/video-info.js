const fetch = require('node-fetch');

// Function to extract video ID from various YouTube URL formats
function extractVideoId(url) {
    try {
        const urlObj = new URL(url);
        let videoId = null;

        if (urlObj.pathname.includes('/shorts/')) {
            videoId = urlObj.pathname.split('/shorts/')[1].split('?')[0];
        } else if (urlObj.pathname.includes('/watch')) {
            videoId = urlObj.searchParams.get('v');
        } else if (urlObj.pathname.includes('/v/')) {
            videoId = urlObj.pathname.split('/v/')[1];
        }

        console.log('Extracted video ID:', videoId);
        return videoId;
    } catch (error) {
        console.error('Error extracting video ID:', error);
        return null;
    }
}

async function getVideoInfo(videoId) {
    console.log('Fetching video info for ID:', videoId);
    
    try {
        // First, check if video exists using YouTube's oEmbed endpoint
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        console.log('Fetching from oEmbed URL:', oembedUrl);
        
        const oembedResponse = await fetch(oembedUrl);
        console.log('oEmbed response status:', oembedResponse.status);
        
        if (!oembedResponse.ok) {
            const errorText = await oembedResponse.text();
            console.error('oEmbed error response:', errorText);
            throw new Error('Video not available');
        }

        const oembedData = await oembedResponse.json();
        console.log('Successfully fetched oEmbed data');
        
        // Use YouTube's image API to get the highest quality thumbnail
        const thumbnails = [
            `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/default.jpg`
        ];

        const videoInfo = {
            title: oembedData.title,
            author: oembedData.author_name,
            thumbnails: thumbnails,
            embedUrl: `https://www.youtube.com/embed/${videoId}`,
            watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
            shortsUrl: `https://www.youtube.com/shorts/${videoId}`
        };

        console.log('Returning video info:', JSON.stringify(videoInfo, null, 2));
        return videoInfo;
    } catch (error) {
        console.error('Error fetching video info:', error);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

module.exports = async (req, res) => {
    console.log('Received request:', {
        method: req.method,
        url: req.url,
        query: req.query,
        headers: req.headers
    });

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

    try {
        const { url } = req.query;
        
        if (!url) {
            console.log('Missing URL parameter');
            return res.status(400).json({ 
                error: 'Missing URL',
                message: 'Video URL is required'
            });
        }

        console.log('Processing URL:', url);
        const videoId = extractVideoId(url);
        
        if (!videoId) {
            console.log('Failed to extract video ID from URL:', url);
            return res.status(400).json({ 
                error: 'Invalid URL',
                message: 'Could not extract video ID from URL'
            });
        }

        const info = await getVideoInfo(videoId);
        
        console.log('Successfully processed request');
        return res.json({
            success: true,
            videoId: videoId,
            info: info
        });

    } catch (error) {
        console.error('Error processing request:', {
            message: error.message,
            stack: error.stack
        });

        if (error.message.includes('Video not available')) {
            return res.status(404).json({
                error: 'Video Not Found',
                message: 'The requested video does not exist or is not available',
                videoId: videoId
            });
        }

        return res.status(500).json({
            error: 'Server Error',
            message: 'An error occurred while processing your request',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}; 