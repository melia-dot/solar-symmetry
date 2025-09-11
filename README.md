# Solar Symmetry

A beautiful web application that visualizes the symmetrical relationship between dates around solstices, showing how twilight times mirror across the year.

## 🌅 What is Solar Symmetry?

Solar Symmetry reveals the elegant balance in our yearly light cycle. For any date, there's a "mirror date" that sits the same distance from the nearest solstice but on the opposite side. These paired dates share fascinating similarities in their twilight patterns.

**Example**: September 11 (82 days after June 21 solstice) mirrors with March 31 (82 days before June 21 solstice).

## ✨ Features

- **Real-time Location Search**: Search any city worldwide
- **Complete Light Data**: Shows dawn, sunrise, sunset, and dusk times for every date
- **Accurate Twilight Data**: Uses civil twilight times (when it actually starts getting light/dark)
- **Beautiful UI**: Clean, modern design with indigo/white theme
- **Mobile Responsive**: Works perfectly on all devices
- **Monthly Navigation**: Smoothly browse through all months
- **Visual Highlighting**: Today's date is prominently highlighted

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/melia-dot/solar-symmetry.git
   cd solar-symmetry
   ```

2. **Open in browser**
   ```bash
   # Simply open index.html in your browser
   open index.html
   
   # Or serve with a local server (recommended)
   python -m http.server 8000
   # Then visit http://localhost:8000
   ```

### Deploy to GitHub Pages

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Enable GitHub Pages**
   - Go to your repo Settings → Pages
   - Select "Deploy from a branch" → `main` → `/ (root)`
   - Your app will be live at `https://melia-dot.github.io/solar-symmetry`

## 🏗️ Project Structure

```
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
```

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **APIs Used**:
  - [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) - Location search
  - [Sunrise-Sunset.org](https://sunrise-sunset.org/api) - Civil twilight times
- **Deployment**: GitHub Pages compatible
- **No Dependencies**: Pure web technologies, no build process needed

## 🎨 Design Features

- **Indigo Color Scheme**: Professional indigo (#4338ca) and white theme
- **Custom Favicon**: Solar-themed icon for browser tabs
- **Responsive Grid**: Two-column layout that stacks on mobile
- **Smooth Animations**: Hover effects and transitions
- **Accessibility**: ARIA labels and keyboard navigation

## 🌍 How It Works

1. **Date Calculation**: For each date, calculates distance from nearest solstice
2. **Mirror Generation**: Finds the date the same distance on the opposite side
3. **Location Processing**: Converts city names to GPS coordinates
4. **Twilight Fetching**: Gets civil twilight times for both dates
5. **Visual Display**: Shows the comparison in an elegant two-column layout

## 🔧 Configuration

The app works out of the box, but you can customize:

- **Default Location**: Modify `initializeApp()` in `app.js`
- **Color Theme**: Update CSS variables in `main.css`
- **Solstice Dates**: Adjust dates in `date-calculations.js` if needed
- **Cache Duration**: Modify `maxCacheAge` in `twilight.js`

## 📱 Browser Support

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile**: iOS Safari 12+, Chrome Mobile 60+
- **Features Used**: Fetch API, CSS Grid, ES6+ JavaScript

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙋‍♀️ About

Created by [melia-dot](https://github.com/melia-dot) as an exploration of astronomical patterns and beautiful web interfaces.

**Live Demo**: [https://melia-dot.github.io/solar-symmetry](https://melia-dot.github.io/solar-symmetry)

---

*Discover the hidden symmetries in our solar year* ☀️