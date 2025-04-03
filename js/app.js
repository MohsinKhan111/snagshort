document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const input = document.querySelector('input[type="url"]');
    const videoContainer = document.querySelector('.video-container');
    const downloadBtn = document.querySelector('.download-btn');
    const termsCheckbox = document.getElementById('terms-agree');
    const errorMessage = document.getElementById('error-message');
    
    // Use production URL when deployed, localhost for development
    const API_BASE_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : '/api';

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
        showMessage('Processing your request...');

        try {
            console.log('Sending request to:', `${API_BASE_URL}/video-info?url=${encodeURIComponent(url)}`);
            const response = await fetch(`${API_BASE_URL}/video-info?url=${encodeURIComponent(url)}`);
            console.log('Response status:', response.status);
            
            const data = await response.json();
            console.log('Response data:', data);

            if (!response.ok) {
                throw new Error(data.error || data.details?.message || 'Failed to get video information');
            }

            currentVideoUrl = url;
            displayVideo(url);
            downloadBtn.style.display = 'block';
            showMessage('Video processed successfully!');
            
        } catch (error) {
            console.error('Detailed error:', error);
            let errorMsg = error.message;
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMsg = 'Cannot connect to server. Please try again later.';
            }
            showError(errorMsg);
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
            console.log('Initiating download from:', `${API_BASE_URL}/download?url=${encodeURIComponent(currentVideoUrl)}`);
            window.location.href = `${API_BASE_URL}/download?url=${encodeURIComponent(currentVideoUrl)}`;
        } catch (error) {
            console.error('Download error:', error);
            showError('Failed to download video: ' + error.message);
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
                return urlObj.pathname.split('/shorts/')[1].split('?')[0];
            }
            if (urlObj.pathname.includes('/reel/')) {
                return urlObj.pathname.split('/reel/')[1].split('?')[0];
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
        
        // Don't auto-remove error messages
        if (!message.toLowerCase().includes('error')) {
            setTimeout(() => {
                messageElement.remove();
            }, 5000);
        }
    }

    function showError(message) {
        console.error('Error:', message);
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