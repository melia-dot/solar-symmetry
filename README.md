Solar Symmetry
Living in England, I dread the approach of winter darkness. But there's something magical about that second week of February when there's still a hint of daylight left after work - it lifts the soul and whispers that spring is coming.
This app grew from my personal ritual of looking backward from autumn to spring, finding comfort in knowing that every darkening day has its bright mirror waiting on the other side of the solstice. It's my way of holding onto hope during the countdown to December 21st - the day when light begins its return.
Solar Symmetry isn't just about astronomy; it's about finding emotional anchors in the rhythm of our solar year. When October feels heavy, you can look forward to its mirror in February. When the darkness feels endless, remember: the light always returns.
🌅 What is Solar Symmetry?
Solar Symmetry reveals the elegant balance in our yearly light cycle. For any date, there's a "mirror date" that sits the same distance from the nearest solstice but on the opposite side. These paired dates share fascinating similarities in their twilight patterns.
Example: September 11 (82 days after June 21 solstice) mirrors with March 31 (82 days before June 21 solstice).
✨ Features

Real-time Location Search: Search any city worldwide
Complete Light Data: Shows dawn, sunrise, sunset, and dusk times for every date
Accurate Twilight Data: Uses civil twilight times (when it actually starts getting light/dark)
Beautiful UI: Clean, modern design with indigo/white theme
Mobile Responsive: Works perfectly on all devices
Monthly Navigation: Smoothly browse through all months
Visual Highlighting: Today's date is prominently highlighted

🚀 Quick Start
Local Development

Clone the repository

bash   git clone https://github.com/melia-dot/solar-symmetry.git
   cd solar-symmetry

Open in browser

bash   # Simply open index.html in your browser
   open index.html
   
   # Or serve with a local server (recommended)
   python -m http.server 8000
   # Then visit http://localhost:8000
Deploy to GitHub Pages

Push to GitHub

bash   git add .
   git commit -m "Initial commit"
   git push origin main

Enable GitHub Pages

Go to your repo Settings → Pages
Select "Deploy from a branch" → main → / (root)
Your app will be live at https://melia-dot.github.io/solar-symmetry



🏗️ Project Structure
solar-symmetry/
├── index.html                 # Main HTML file
├── src/
│   ├── styles/
│   │   └── main.css          # All styling and indigo theme
│   ├── scripts/
│   │   └── app.js            # Main application logic
│   ├── clients/
│   │   ├── geocoding.js      # Location search API client
│   │   └── twilight.js       # Sunrise/sunset API client
│   └── utils/
│       └── date-calculations.js  # Solar symmetry math
├── docs/
│   └── PRD.md                # Product Requirements Document
└── README.md                 # This file
🛠️ Technology Stack

Frontend: Vanilla HTML5, CSS3, JavaScript (ES6+)
APIs Used:

OpenStreetMap Nominatim - Location search
Sunrise-Sunset.org - Civil twilight times


Deployment: GitHub Pages compatible
No Dependencies: Pure web technologies, no build process needed

🎨 Design Features

Indigo Color Scheme: Professional indigo (#4338ca) and white theme
Custom Favicon: Solar-themed icon for browser tabs
Responsive Grid: Two-column layout that stacks on mobile
Smooth Animations: Hover effects and transitions
Accessibility: ARIA labels and keyboard navigation

🌍 How It Works

Date Calculation: For each date, calculates distance from nearest solstice
Mirror Generation: Finds the date the same distance on the opposite side
Location Processing: Converts city names to GPS coordinates
Twilight Fetching: Gets civil twilight times for both dates
Visual Display: Shows the comparison in an elegant two-column layout

🔧 Configuration
The app works out of the box, but you can customize:

Default Location: Modify initializeApp() in app.js
Color Theme: Update CSS variables in main.css
Solstice Dates: Adjust dates in date-calculations.js if needed
Cache Duration: Modify maxCacheAge in twilight.js

📱 Browser Support

Modern Browsers: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
Mobile: iOS Safari 12+, Chrome Mobile 60+
Features Used: Fetch API, CSS Grid, ES6+ JavaScript

🤝 Contributing

Fork the repository
Create a feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request

📄 License
This project is open source and available under the MIT License.
🙋‍♀️ About
Created by melia-dot as an exploration of astronomical patterns and beautiful web interfaces.
Live Demo: https://melia-dot.github.io/solar-symmetry

Discover the hidden symmetries in our solar year ☀️