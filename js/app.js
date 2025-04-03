document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const urlInput = document.getElementById('url-input');
    const downloadBtn = document.getElementById('download-btn');
    const errorMessage = document.getElementById('error-message');
    const resultContainer = document.getElementById('result-container');
    const videoPlaceholder = document.getElementById('video-placeholder');
    const downloadLink = document.getElementById('download-link');
    const termsCheckbox = document.getElementById('terms-agree');

    // Event Listeners
    downloadBtn.addEventListener('click', handleDownload);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleDownload();
        }
    });

    // Functions
    function handleDownload() {
        const url = urlInput.value.trim();
        
        // Check terms agreement
        if (!termsCheckbox.checked) {
            showError('Please agree to the Terms of Service before downloading');
            return;
        }

        // Validate URL
        if (!isValidYouTubeShortsUrl(url)) {
            showError('Please enter a valid YouTube Shorts URL');
            return;
        }

        // Clear previous error
        clearError();
        
        // Show loading state
        showLoading();
        
        // Process the URL
        processYouTubeShortsUrl(url);
    }

    function isValidYouTubeShortsUrl(url) {
        // Basic validation for YouTube Shorts URLs
        const shortsRegex = /^https?:\/\/(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/;
        return shortsRegex.test(url);
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        resultContainer.classList.add('hidden');
    }

    function clearError() {
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
    }

    function showLoading() {
        resultContainer.classList.remove('hidden');
        videoPlaceholder.innerHTML = '<div class="loading-spinner"></div>';
        downloadLink.style.display = 'none';
    }

    function processYouTubeShortsUrl(url) {
        // Extract video ID from URL
        const videoId = extractVideoId(url);
        
        // Display video preview
        displayVideoPreview(videoId);
        
        // Trigger GitHub Actions workflow
        triggerDownloadWorkflow(url, videoId);
    }

    function extractVideoId(url) {
        const match = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    function displayVideoPreview(videoId) {
        // Create an iframe for the video preview
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}`;
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        
        // Replace placeholder with iframe
        videoPlaceholder.innerHTML = '';
        videoPlaceholder.appendChild(iframe);
    }

    function triggerDownloadWorkflow(url, videoId) {
        // Show a message that the video is being processed
        const processingMessage = document.createElement('div');
        processingMessage.className = 'processing-message';
        processingMessage.textContent = 'Processing video... This may take a minute.';
        videoPlaceholder.appendChild(processingMessage);
        
        // In a real implementation, this would call the GitHub Actions workflow
        // For now, we'll simulate the process with a timeout
        setTimeout(() => {
            // Remove the processing message
            processingMessage.remove();
            
            // Set up download link
            setupDownloadLink(videoId);
        }, 3000);
    }

    function setupDownloadLink(videoId) {
        // In a real implementation, this would be a link to the processed video
        downloadLink.href = `#download-${videoId}`;
        downloadLink.style.display = 'flex';
        
        // Add click event to simulate download
        downloadLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (!termsCheckbox.checked) {
                showError('Please agree to the Terms of Service before downloading');
                return;
            }
            alert('In a real implementation, this would download the video. For now, this is just a placeholder.');
        });
    }
}); 