document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const input = document.querySelector('input[type="url"]');
    const videoContainer = document.querySelector('.video-container');
    const downloadBtn = document.querySelector('.download-btn');
    const termsCheckbox = document.getElementById('terms-agree');
    const errorMessage = document.getElementById('error-message');
    
    // Use production URL when deployed, localhost for development
    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3002'
        : 'https://snagshort-backend.onrender.com';  // We'll create this later

    let currentVideoUrl = '';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!termsCheckbox.checked) {
            showError('Please agree to the Terms of Service before downloading');
            return;
        }

        const url = input.value.trim();
        
        if (!url) {
            showError('Please enter a valid YouTube Shorts URL');
            return;
        }

        if (!isYouTubeShortsUrl(url)) {
            showError('Please enter a valid YouTube Shorts URL');
            return;
        }

        clearError();

        try {
            showMessage('Loading video information...');
            const response = await fetch(`${API_BASE_URL}/video-info?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get video information');
            }

            currentVideoUrl = url;
            displayVideo(url);
            downloadBtn.style.display = 'block';
            
        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'An error occurred while processing your request');
        }
    });

    downloadBtn.addEventListener('click', async () => {
        if (!currentVideoUrl) {
            showError('Please enter a video URL first');
            return;
        }

        if (!termsCheckbox.checked) {
            showError('Please agree to the Terms of Service before downloading');
            return;
        }

        try {
            showMessage('Starting download...');
            window.location.href = `${API_BASE_URL}/download?url=${encodeURIComponent(currentVideoUrl)}`;
        } catch (error) {
            console.error('Error:', error);
            showError('Failed to download video');
        }
    });

    function isYouTubeShortsUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.includes('youtube.com') && 
                   (urlObj.pathname.includes('/shorts/') || urlObj.pathname.includes('/reel/'));
        } catch {
            return false;
        }
    }

    function displayVideo(url) {
        const videoId = extractVideoId(url);
        if (!videoId) {
            showError('Invalid YouTube URL');
            return;
        }

        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        videoContainer.innerHTML = `
            <iframe
                width="100%"
                height="400"
                src="${embedUrl}"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
            ></iframe>
        `;
    }

    function extractVideoId(url) {
        try {
            const urlObj = new URL(url);
            if (urlObj.pathname.includes('/shorts/')) {
                return urlObj.pathname.split('/shorts/')[1];
            }
            if (urlObj.pathname.includes('/reel/')) {
                return urlObj.pathname.split('/reel/')[1];
            }
            return null;
        } catch {
            return null;
        }
    }

    function showMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.textContent = message;
        
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        form.insertAdjacentElement('afterend', messageElement);
        
        setTimeout(() => {
            messageElement.remove();
        }, 5000);
    }

    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
    }

    function clearError() {
        if (errorMessage) {
            errorMessage.textContent = '';
            errorMessage.style.display = 'none';
        }
    }
}); 