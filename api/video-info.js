const ytdl = require('ytdl-core');
const miniget = require('miniget');
const { HttpsProxyAgent } = require('https-proxy-agent');

// List of public HTTPS proxies (update these regularly)
const PROXY_LIST = [
    'https://proxy.scrapingbee.com:8886',
    'https://proxy.webshare.io:80',
    // Add more proxies as needed
];

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

async function fetchWithRetry(url, options, retries = 3) {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Attempt ${i + 1} of ${retries}`);
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.text();
            return data;
        } catch (error) {
            console.log(`Attempt ${i + 1} failed:`, error.message);
            lastError = error;
            
            if (i < retries - 1) {
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }
    
    throw lastError;
}

async function getVideoInfo(videoId) {
    try {
        console.log('Starting video info fetch for ID:', videoId);
        
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
        
        // Try each proxy in sequence
        for (const proxy of ['direct', ...PROXY_LIST]) {
            try {
                console.log('Trying with proxy:', proxy);
                
                const options = {
                    requestOptions: {
                        headers: {
                            'User-Agent': userAgent,
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5',
                            'Connection': 'keep-alive'
                        }
                    }
                };

                // Add proxy if not using direct connection
                if (proxy !== 'direct') {
                    options.requestOptions.agent = new HttpsProxyAgent(proxy);
                }

                // Try ytdl-core first
                try {
                    console.log('Attempting with ytdl-core...');
                    const info = await ytdl.getInfo(videoId, options);
                    console.log('Successfully fetched info with ytdl-core');
                    return info;
                } catch (ytdlError) {
                    console.log('ytdl-core attempt failed:', ytdlError.message);
                    
                    // If ytdl-core fails, try direct request
                    console.log('Attempting direct request...');
                    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    const html = await fetchWithRetry(videoUrl, {
                        headers: options.requestOptions.headers,
                        agent: options.requestOptions.agent
                    });
                    
                    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/);
                    if (!playerResponseMatch) {
                        throw new Error('Could not find player response in page');
                    }
                    
                    const playerResponse = JSON.parse(playerResponseMatch[1]);
                    console.log('Successfully extracted player response');
                    
                    if (!playerResponse.streamingData) {
                        throw new Error('No streaming data found');
                    }
                    
                    const formats = [
                        ...(playerResponse.streamingData.formats || []),
                        ...(playerResponse.streamingData.adaptiveFormats || [])
                    ];
                    
                    return {
                        videoDetails: playerResponse.videoDetails,
                        formats: formats
                    };
                }
            } catch (proxyError) {
                console.log(`Failed with proxy ${proxy}:`, proxyError.message);
                continue;
            }
        }
        
        throw new Error('All proxy attempts failed');
    } catch (error) {
        console.error('All attempts failed. Final error:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
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

        console.log('Fetching info for video ID:', videoId);
        const info = await getVideoInfo(videoId);

        // Get available formats
        console.log('Getting available formats');
        let selectedFormats = [];
        
        // Try different format combinations
        try {
            if (info.formats) {
                console.log('Processing formats...');
                selectedFormats = info.formats.filter(f => {
                    return f.url && (
                        (f.hasVideo && f.hasAudio) ||  // Combined formats
                        (f.hasVideo && f.height)       // Video-only formats
                    );
                });
            }
            
            console.log('Selected formats count:', selectedFormats.length);
        } catch (formatError) {
            console.error('Error filtering formats:', formatError);
            selectedFormats = [];
        }
        
        if (selectedFormats.length === 0) {
            console.log('No suitable formats found');
            return res.status(400).json({
                error: 'No formats available',
                message: 'Could not find any suitable video formats',
                videoId: videoId
            });
        }

        // Sort by quality and get the best format
        const format = selectedFormats.sort((a, b) => {
            // Prefer formats with both video and audio
            if (a.hasVideo && a.hasAudio && (!b.hasVideo || !b.hasAudio)) return -1;
            if (b.hasVideo && b.hasAudio && (!a.hasVideo || !a.hasAudio)) return 1;
            // Then sort by height
            return (b.height || 0) - (a.height || 0);
        })[0];

        console.log('Selected best format:', {
            quality: format.qualityLabel || format.quality,
            container: format.container,
            hasAudio: format.hasAudio,
            hasVideo: format.hasVideo,
            url: format.url ? 'present' : 'missing'
        });

        const response = {
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            downloadUrl: format.url,
            quality: format.qualityLabel || format.quality || `${format.height}p`,
            container: format.container,
            isVideoOnly: !format.hasAudio
        };

        console.log('Sending successful response');
        return res.json(response);

    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            statusCode: error.statusCode
        });

        // Handle specific error cases
        if (error.message.includes('age-restricted')) {
            return res.status(403).json({
                error: 'Age Restricted',
                message: 'This video is age-restricted and cannot be accessed',
                details: error.message
            });
        }

        if (error.message.includes('private')) {
            return res.status(403).json({
                error: 'Private Video',
                message: 'This video is private and cannot be accessed',
                details: error.message
            });
        }

        if (error.message.includes('copyright') || error.message.includes('removed')) {
            return res.status(410).json({
                error: 'Video Unavailable',
                message: 'This video has been removed or is not available',
                details: error.message
            });
        }

        if (error.message.includes('status code: 410')) {
            return res.status(410).json({
                error: 'Resource Gone',
                message: 'The requested video is no longer available',
                details: error.message
            });
        }

        // Default error response with more details
        return res.status(500).json({
            error: 'Server Error',
            message: 'An error occurred while processing your request',
            details: error.message,
            errorType: error.constructor.name,
            videoId: videoId
        });
    }
}; 