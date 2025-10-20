const imageInput = document.getElementById('imageInput');
const imagePreviewsContainer = document.getElementById('image-previews');
const extractedTextElement = document.getElementById('extractedText');
const statusElement = document.getElementById('status');
const extractButton = document.getElementById('extractButton');
const clearButton = document.getElementById('clearButton');
const resultsArea = document.getElementById('results-area');

let uploadedFiles = []; // Array to store File objects

// --- File Selection and Preview Handling ---
imageInput.addEventListener('change', function(event) {
    uploadedFiles = Array.from(event.target.files);
    updatePreviews();
    updateButtonStates();
    resultsArea.classList.add('hidden'); // Hide previous results
    extractedTextElement.textContent = ''; // Clear previous text
    statusElement.textContent = `Ready to extract data from ${uploadedFiles.length} image(s).`;
});

function updatePreviews() {
    imagePreviewsContainer.innerHTML = '';
    uploadedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = file.name;
            
            previewItem.appendChild(img);
            imagePreviewsContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

function updateButtonStates() {
    const hasFiles = uploadedFiles.length > 0;
    extractButton.disabled = !hasFiles;
    clearButton.disabled = !hasFiles;
}

// --- OCR Data Extraction Logic ---
async function extractData() {
    if (uploadedFiles.length === 0) {
        alert('Please select one or more images first.');
        return;
    }

    // Disable buttons during processing
    extractButton.disabled = true;
    clearButton.disabled = true;
    resultsArea.classList.add('hidden');
    extractedTextElement.textContent = '';
    
    // Tesseract.js Worker initialization
    statusElement.textContent = 'Initializing OCR Worker... This might take a moment.';
    const worker = await Tesseract.createWorker({
        logger: m => {
            // OPTIONAL: Keep this line for debugging, but remove it once fixed
            // console.log(m.status, m.progress); 
            
            // Only access status and progress, and construct a new string for the DOM
            if (m.status === 'recognizing text') {
                 // Use Math.round to display a cleaner percentage
                 const progressPercent = Math.round(m.progress * 100);
                 statusElement.textContent = `Processing image ${progressPercent}%...`;
            } else if (m.status) {
                 // Update status for loading and initialization steps
                 const statusText = m.status.charAt(0).toUpperCase() + m.status.slice(1);
                 statusElement.textContent = `${statusText}...`;
            }
        }
    });

    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    let fullText = "";

    // Process each uploaded image sequentially
    for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        statusElement.textContent = `[${i + 1}/${uploadedFiles.length}] Analyzing text in: ${file.name}`;
        
        try {
            const { data: { text } } = await worker.recognize(file);
            
            // Append the result, separated by a header for multi-image processing
            fullText += `\n\n--- TEXT FROM IMAGE: ${file.name} ---\n\n${text}`;
            
        } catch (error) {
            fullText += `\n\n--- ERROR PROCESSING: ${file.name} ---\n\n${error.message}`;
            console.error(`Error processing image ${file.name}:`, error);
        }
    }

    await worker.terminate(); // Terminate the worker to free up resources

    // Display the final results
    extractedTextElement.textContent = fullText.trim();
    resultsArea.classList.remove('hidden');
    statusElement.textContent = `✅ Extraction complete for ${uploadedFiles.length} image(s).`;
    
    // Re-enable buttons
    updateButtonStates();
}

// --- Clear Function ---
function clearAll() {
    // Clear the file input
    imageInput.value = ''; 
    // Clear the file array
    uploadedFiles = [];
    // Clear the previews
    imagePreviewsContainer.innerHTML = '';
    // Clear the text result
    extractedTextElement.textContent = '';
    resultsArea.classList.add('hidden');
    // Update status and buttons
    statusElement.textContent = 'Awaiting image upload...';
    updateButtonStates();

}
