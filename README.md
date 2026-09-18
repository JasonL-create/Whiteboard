# Whiteboard prototype

Static HTML/CSS/JavaScript prototype for the Northwoods office Whiteboard.

## Run locally
Open `index.html` in a browser, or serve the folder with any static web server.

## GitHub Pages
Push these files to a GitHub repository and enable GitHub Pages from the repository settings. No build step is required.

## Current behavior
- Shared board concept with Turns and Listings
- Quick filters and counts
- Inline property workflow expansion
- Process / Status controls
- Keys Returned changes a Turn from Notice to Active and starts the Day X / 31 counter
- Start New Process modal
- Browser-local persistence via localStorage

## Important
This is currently a front-end prototype. `localStorage` only saves data in the current browser/device; it is not yet multi-user. The next architecture step for an office-wide app is a shared backend/database and authentication.
