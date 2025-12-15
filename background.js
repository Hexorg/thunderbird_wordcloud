// Background script for Email Word Cloud extension

const CACHE_KEY = "wordCloudCache";

// Listen for messages from popup
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "getWordCloudData") {
    try {
      // Check if we should use cache or force re-analyze
      const forceAnalyze = message.forceAnalyze || false;

      if (!forceAnalyze) {
        // Try to get cached data
        const cached = await browser.storage.local.get(CACHE_KEY);
        if (cached[CACHE_KEY]) {
          console.log("Returning cached word cloud data");
          return Promise.resolve(cached[CACHE_KEY]);
        }
      }

      // No cache or forced re-analyze - collect fresh data
      console.log("Analyzing emails...");
      const wordData = await collectEmailData();

      // Cache the results
      await browser.storage.local.set({
        [CACHE_KEY]: {
          data: wordData,
          timestamp: Date.now()
        }
      });

      return Promise.resolve({
        data: wordData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error collecting email data:", error);
      return Promise.resolve({ error: error.message });
    }
  }
});

async function collectEmailData() {
  const wordCounts = new Map();

  // Get all accounts
  const accounts = await browser.accounts.list();

  // Collect user's own email addresses and names to filter them out
  const userInfo = await getUserInfo(accounts);

  for (const account of accounts) {
    // Process each folder in the account
    await processFolder(account.folders, wordCounts, userInfo);
  }

  // Convert Map to array and sort by count
  const wordArray = Array.from(wordCounts.entries())
    .map(([word, count]) => ({ text: word, count: count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 200); // Limit to top 200 words

  return wordArray;
}

async function getUserInfo(accounts) {
  const userEmails = new Set();
  const userNameWords = new Set();

  for (const account of accounts) {
    // Get identities for this account
    const identities = account.identities || [];

    for (const identity of identities) {
      // Add email address
      if (identity.email) {
        userEmails.add(identity.email.toLowerCase());
      }

      // Extract words from user's name
      if (identity.name) {
        const nameWords = identity.name.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 2);
        nameWords.forEach(word => userNameWords.add(word));
      }
    }
  }

  return { emails: userEmails, nameWords: userNameWords };
}

async function processFolder(folders, wordCounts, userInfo) {
  if (!folders) return;

  // Ignoring folders based on name instead of type because gmail doesn't mark `[Gmail]Trash` as type = 'trash'
  const ignoreFolders = new Set(['trash', 'junk', 'drafts', 'sent', 'sent mail', 'spam', 'all mail', 'outbox']);

  for (const folder of folders) {
    // Process messages in this folder
      let names = folder.name.toLowerCase().split(']'); // split '[Gmail]Folder' to '[gmail' and 'folder'
      const hasAny = names.some(item => ignoreFolders.has(item));
    if (!hasAny) {
        await processMessagesInFolder(folder, wordCounts, userInfo);
    }

    // Recursively process subfolders
    if (folder.subFolders && folder.subFolders.length > 0) {
      await processFolder(folder.subFolders, wordCounts, userInfo);
    }
  }
}

async function processMessagesInFolder(folder, wordCounts, userInfo) {
  try {
    let page = await browser.messages.list(folder.id);

    while (page.messages.length > 0) {
      for (const message of page.messages) {
        // Extract words from subject
        if (message.subject) {
          extractWords(message.subject, wordCounts, userInfo);
        }

        // Extract words from sender (name and email)
        if (message.author) {
          const senderName = extractSenderName(message.author);
          if (senderName) {
            extractWords(senderName, wordCounts, userInfo);
          }

          const senderEmail = extractEmail(message.author);
          if (senderEmail && !userInfo.emails.has(senderEmail)) {
            // Add the full email address as a single "word" (skip if it's user's own email)
            wordCounts.set(senderEmail, (wordCounts.get(senderEmail) || 0) + 1);

            // Also split email and add username and domain separately
            const emailParts = senderEmail.split('@');
            if (emailParts.length === 2) {
              const username = emailParts[0];
              const domain = emailParts[1];

              // Add username (if it's longer than 2 chars)
              if (username.length > 2) {
                wordCounts.set(username, (wordCounts.get(username) || 0) + 1);
              }

              // Add domain
              if (domain.length > 2) {
                wordCounts.set(domain, (wordCounts.get(domain) || 0) + 1);
              }
            }
          }
        }
      }

      // Get next page of messages
      if (page.id) {
        page = await browser.messages.continueList(page.id);
      } else {
        break;
      }
    }
  } catch (error) {
    console.error(`Error processing folder ${folder.name}:`, error);
  }
}

function extractSenderName(authorString) {
  // Extract name from "Name <email@domain.com>" format
  const match = authorString.match(/^([^<]+)/);
  if (match) {
    return match[1].trim();
  }
  return null;
}

function extractEmail(authorString) {
  // Extract email from "Name <email@domain.com>" format or just "email@domain.com"
  const match = authorString.match(/<([^>]+)>/);
  if (match) {
    return match[1].trim().toLowerCase();
  }
  // If no angle brackets, check if the whole string is an email
  if (authorString.includes('@')) {
    return authorString.trim().toLowerCase();
  }
  return null;
}

function extractWords(text, wordCounts, userInfo) {
  // Convert to lowercase and split into words
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2); // Only words longer than 2 characters

  // Common words to exclude (stop words)
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one',
    'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old',
    'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too',
    'use', 'from', 'have', 'that', 'with', 'this', 'will', 'your', 'been', 'they', 'were',
    'said', 'what', 'when', 'than', 'then', 'them', 'some', 'into', 'time', 'very', 'just',
    'know', 'take', 'people', 'year', 'could', 'there', 'about', 'would', 'these', 'other',
    'think', 'also', 'back', 'after', 'well', 'only', 'come', 'work', 'first', 'their',
    'make', 'over', 'such', 'because', 'where', 'those', 'being', 'here', 'should', 'each',
    'which', 'their', 'more', 'most', 'through', 'between', 'under', 'again', 'while',
    're', 'fwd', 'fw'
  ]);

  for (const word of words) {
    // Skip if it's a stop word or one of the user's own name words
    if (!stopWords.has(word) && !userInfo.nameWords.has(word)) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }
}
