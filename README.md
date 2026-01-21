# MIPS Content Explorer

A browser-based content filtering tool for browsing MIPS helmet protection content.

## Features

- Filter content by page type, category, and activity
- Sort by relevance or publication date
- Click cards to open content in a new tab
- Click filter chips to quickly add/remove filters

## Usage

1. Open `index.html` in a web browser
2. Use the left sidebar to filter content
3. Click any card to view the full article

## Tech Stack

- Vanilla HTML/CSS/JavaScript
- [PapaParse](https://www.papaparse.com/) for CSV parsing

## Data

Content is loaded from `pages.csv`. The CSV should have these columns:

| Column | Description |
|--------|-------------|
| url | Link to the content |
| title | Display title |
| image_url | Optional image URL |
| page_type | Type (technology, inspiration, news, helmets) |
| category | Category (bike, motorcycle, etc.) |
| activity | Activity (cycling, construction, mx, etc.) |
| publish_date | Publication date (YYYY-MM-DD) |

## Local Development

No build step required. Just serve the files with any static server:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve
```

Then open http://localhost:8000
