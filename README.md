# Email Word Cloud - Thunderbird Extension

A Thunderbird extension that visualizes your email data as an interactive word cloud based on subject lines and sender information.

## Features

- Analyzes all emails across all your Thunderbird accounts
- Extracts words from email subjects and sender names
- Generates an interactive word cloud with font sizes proportional to word frequency
- Filters common stop words for meaningful results
- Color-coded words for visual appeal
- Shows statistics about unique and total words

## Installation

### From Source

1. Clone or download this repository
2. Open Thunderbird
3. Go to Tools > Add-ons (or press Ctrl+Shift+A)
4. Click the gear icon and select "Debug Add-ons"
5. Click "Load Temporary Add-on"
6. Navigate to the extension folder and select `manifest.json`

### For Development

To make changes and reload:
1. Edit the source files
2. In the Add-ons Debugger page, click "Reload" next to the extension

## Usage

1. Click the "Email Word Cloud" button in the Thunderbird toolbar
2. Wait while the extension analyzes your emails
3. View the generated word cloud in the popup
4. Hover over words to see their occurrence count
5. Larger words appear more frequently in your emails

## How It Works

The extension:
- Reads all messages from all folders (excluding Trash and Junk)
- Extracts words from:
  - Email subject lines
  - Sender names
  - Separately sender emails
- Filters out:
  - Common stop words (the, and, for, etc.)
  - Owner's name words and email
  - Words shorter than 3 characters
  - Special characters and punctuation
- Displays the top 200 most frequent words
- Uses logarithmic scaling for font sizes (12px to 48px)

## Permissions

This extension requires the following permissions:
- `messagesRead`: To read email subjects and sender information
- `accountsRead`: To access all your email accounts and folders
- `storage`: To cache last word count results.

## Privacy

All data processing happens locally in your Thunderbird client. No data is sent to external servers.

## Files Structure

```
thunderbird_wordcloud/
├── manifest.json          # Extension configuration
├── background.js          # Background script for email processing
├── popup.html            # Word cloud UI
├── popup.js              # Word cloud rendering logic
├── icons/                # Extension icons
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

## Technical Details

- **Manifest Version**: 2
- **Minimum Thunderbird Version**: 78.0
- **APIs Used**: 
  - `browser.accounts` - for accessing email accounts
  - `browser.messages` - for reading email messages
  - `browser.runtime` - for communication between scripts
  - `browser.storage` - for storing cache results

## Customization

You can customize the extension by editing:

- **Word limit**: Change `slice(0, 200)` in `background.js:22` to show more/fewer words
- **Font size range**: Modify `scaleFontSize()` parameters in `popup.js:46`
- **Colors**: Edit the `colors` array in `popup.js:37`
- **Stop words**: Add/remove words from the `stopWords` Set in `background.js:71`
- **Minimum word length**: Change `word.length > 2` in `background.js:68`

## License

Licensed under the Creative Commons 0 Universal. See LICENSE file for details.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.
