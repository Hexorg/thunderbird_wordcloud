// Popup script for Email Word Cloud extension

let currentData = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadWordCloud(false);

  // Setup re-analyze button
  const reanalyzeBtn = document.getElementById('reanalyzeBtn');
  reanalyzeBtn.addEventListener('click', async () => {
    reanalyzeBtn.disabled = true;
    await loadWordCloud(true);
    reanalyzeBtn.disabled = false;
  });
});

async function loadWordCloud(forceAnalyze = false) {
  try {
    // Show loading state
    document.getElementById('loading').style.display = 'block';
    document.getElementById('wordcloud').style.display = 'none';
    document.getElementById('stats').style.display = 'none';
    document.getElementById('error').style.display = 'none';
    document.getElementById('reanalyzeBtn').style.display = 'none';

    if (forceAnalyze) {
      document.getElementById('loading').querySelector('p').textContent = 'Re-analyzing your emails...';
    }

    // Request word cloud data from background script
    const response = await browser.runtime.sendMessage({
      type: "getWordCloudData",
      forceAnalyze: forceAnalyze
    });

    if (response.error) {
      showError(response.error);
      return;
    }

    const wordData = response.data;

    if (!wordData || wordData.length === 0) {
      showError("No email data found. Make sure you have emails in your mailbox.");
      return;
    }

    currentData = response;

    // Hide loading, show word cloud
    document.getElementById('loading').style.display = 'none';
    document.getElementById('wordcloud').style.display = 'block';
    document.getElementById('stats').style.display = 'block';
    document.getElementById('reanalyzeBtn').style.display = 'block';

    // Render the word cloud
    renderWordCloud(wordData);

    // Show statistics
    showStats(wordData, response.timestamp);

  } catch (error) {
    showError(`Error loading word cloud: ${error.message}`);
  }
}

function renderWordCloud(wordData) {
  const container = document.getElementById('wordcloud');
  container.innerHTML = '';

  // Find min and max counts for scaling
  const counts = wordData.map(w => w.count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  // Generate color palette
  const colors = [
    '#1976d2', '#388e3c', '#d32f2f', '#f57c00', '#7b1fa2',
    '#0097a7', '#c2185b', '#5d4037', '#455a64', '#00796b'
  ];

  // Create word elements
  wordData.forEach((word, index) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.textContent = word.text;
    span.title = `${word.text}: ${word.count} occurrences - Click to filter emails`;

    // Scale font size based on count (12px to 48px)
    const fontSize = scaleFontSize(word.count, minCount, maxCount, 12, 48);
    span.style.fontSize = `${fontSize}px`;

    // Assign color
    span.style.color = colors[index % colors.length];

    // Add click handler to filter emails by this word
    span.addEventListener('click', async () => {
      await filterByWord(word.text);
    });

    container.appendChild(span);
  });
}

async function filterByWord(word) {
  try {
    // Get the active mail tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });

    // Find a mail tab (3-pane view)
    const mailTabs = await browser.mailTabs.query({});

    if (mailTabs.length > 0) {
      // Use the first mail tab (usually the main 3-pane view)
      const mailTab = mailTabs[0];

      // Set the quick filter to search for the word
      await browser.mailTabs.setQuickFilter(mailTab.id, {
        show: true,
        text: {
          text: word,
          author: true,
          subject: true
        }
      });

      // Switch to the mail tab
      await browser.tabs.update(mailTab.id, { active: true });

      // Close the popup by closing the current window
      window.close();
    } else {
      console.error('No mail tab found');
    }
  } catch (error) {
    console.error('Error setting quick filter:', error);
  }
}

function scaleFontSize(count, minCount, maxCount, minSize, maxSize) {
  if (maxCount === minCount) return maxSize;

  // Logarithmic scaling for better distribution
  const minLog = Math.log(minCount);
  const maxLog = Math.log(maxCount);
  const scale = (Math.log(count) - minLog) / (maxLog - minLog);

  return Math.round(minSize + (scale * (maxSize - minSize)));
}

function showStats(wordData, timestamp) {
  const statsDiv = document.getElementById('stats');
  const totalWords = wordData.reduce((sum, word) => sum + word.count, 0);
  const uniqueWords = wordData.length;

  let statsText = `${uniqueWords} unique words from ${totalWords} total words`;

  if (timestamp) {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleString();
    statsText += ` • Last analyzed: ${timeStr}`;
  }

  statsDiv.textContent = statsText;
}

function showError(message) {
  document.getElementById('loading').style.display = 'none';
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}
