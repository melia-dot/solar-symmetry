# Product Requirements Document (PRD)
## Solar Symmetry Web Application

**Version**: 1.0  
**Date**: September 2025  
**Product Manager**: Mikael Eliaeson  

---

## 1. Executive Summary

### Vision Statement
Create an intuitive web application that reveals the hidden symmetrical patterns in our solar year by visualizing how dates mirror around solstices, complete with real-world twilight data for any location on Earth.

### Business Objectives
- Educate users about astronomical patterns and solar cycles
- Provide a unique, shareable web experience for astronomy enthusiasts
- Demonstrate advanced frontend development skills
- Build community engagement around astronomical awareness

---

## 2. Product Overview

### Problem Statement
Most people are unaware of the elegant symmetrical patterns that exist in our solar calendar. Traditional calendar applications don't reveal how dates relate to each other through solstices, missing an opportunity to connect users with natural rhythms.

### Solution
Solar Symmetry visualizes the relationship between any date and its "mirror date" - the date that sits equidistant from the nearest solstice but on the opposite side. Users can see how these paired dates share similar twilight patterns worldwide.

### Target Users
- **Primary**: Astronomy enthusiasts, educators, students
- **Secondary**: Developers interested in clean code examples
- **Tertiary**: General users curious about natural patterns

---

## 3. Core Features & User Stories

### Epic 1: Location-Based Twilight Calculation

#### User Story 1.1: Location Search
**As a** user  
**I want to** search for any city or location worldwide  
**So that** I can see twilight data specific to my location  

**Acceptance Criteria:**
- [ ] Location search input is prominently displayed at top of page
- [ ] Search provides real-time suggestions as user types
- [ ] Dropdown shows up to 5 relevant location suggestions
- [ ] Selecting a location immediately updates all displayed data
- [ ] Search handles various input formats (city names, regions, countries)
- [ ] Invalid locations show "No locations found" message
- [ ] Location selector remains fixed during page scrolling

#### User Story 1.2: Automatic Location Detection
**As a** user  
**I want to** automatically use my current location when I first visit  
**So that** I don't have to manually enter my city  

**Acceptance Criteria:**
- [ ] App requests geolocation permission on first load
- [ ] If granted, automatically populates location field with user's city
- [ ] If denied, defaults to placeholder text "Enter your city..."
- [ ] Fallback location (London) is used if geolocation fails
- [ ] Loading indicator shows while detecting location

### Epic 2: Solar Symmetry Visualization

#### User Story 2.1: Current Month Display
**As a** user  
**I want to** see all dates in the current month with their twilight times AND sunset/sunrise times  
**So that** I can understand the complete light patterns for familiar dates  

**Acceptance Criteria:**
- [ ] Left column shows all dates of current month in ascending order
- [ ] Each date displays civil twilight begin time (dawn) 
- [ ] Each date displays actual sunrise time
- [ ] Each date displays actual sunset time
- [ ] Each date displays civil twilight end time (dusk)
- [ ] All four times are clearly labeled and visually distinct
- [ ] Today's date is visually highlighted with special styling
- [ ] Times display in 24-hour format (HH:MM)
- [ ] Loading state shows while fetching twilight data

#### User Story 2.2: Mirrored Dates Display
**As a** user  
**I want to** see the mirrored dates with their complete twilight and sunset/sunrise times  
**So that** I can compare the full light patterns between symmetrical dates  

**Acceptance Criteria:**
- [ ] Right column shows mirrored dates in descending order
- [ ] Each mirrored date displays civil twilight begin (dawn)
- [ ] Each mirrored date displays sunrise time
- [ ] Each mirrored date displays sunset time
- [ ] Each mirrored date displays civil twilight end (dusk)
- [ ] Dates from different months show month names (e.g., "Mar 31", "Apr 1")
- [ ] Mirrored dates are calculated from nearest solstice (June 21 or Dec 21)
- [ ] Calculation accounts for leap years correctly
- [ ] Visual styling matches current month column

#### User Story 2.3: Month Navigation
**As a** user  
**I want to** navigate between different months  
**So that** I can explore symmetry patterns throughout the year  

**Acceptance Criteria:**
- [ ] Previous/Next month buttons are clearly visible
- [ ] Clicking buttons smoothly transitions to adjacent month
- [ ] Month title updates to show current month and year
- [ ] Previous button is disabled when viewing January
- [ ] Next button is disabled when viewing December
- [ ] Keyboard arrow keys also navigate months
- [ ] URL optionally updates to reflect current month

### Epic 3: User Experience & Design

#### User Story 3.1: Responsive Design
**As a** user on any device  
**I want to** access the app comfortably  
**So that** I can use it on desktop, tablet, or mobile  

**Acceptance Criteria:**
- [ ] Layout adapts to screen sizes from 320px to 1200px+
- [ ] Two-column layout stacks vertically on mobile
- [ ] Touch-friendly button sizes on mobile (minimum 44px)
- [ ] Text remains readable at all screen sizes
- [ ] Navigation works with touch gestures
- [ ] Location search dropdown fits screen width

#### User Story 3.2: Visual Theme
**As a** user  
**I want to** experience a beautiful, professional interface  
**So that** the app feels polished and trustworthy  

**Acceptance Criteria:**
- [ ] Consistent indigo (#4338ca) and white color scheme
- [ ] Custom solar-themed favicon in browser tab
- [ ] Smooth hover effects and transitions
- [ ] Professional typography using system fonts
- [ ] Appropriate visual hierarchy with clear headers
- [ ] Loading animations provide feedback during data fetching

### Epic 4: Performance & Reliability

#### User Story 4.1: Fast Loading
**As a** user  
**I want to** see data quickly  
**So that** I don't wait for slow API responses  

**Acceptance Criteria:**
- [ ] Initial page load completes in under 2 seconds
- [ ] Twilight data caches for 24 hours to avoid repeat API calls
- [ ] Location search results cache to improve repeat searches
- [ ] Batch API calls minimize individual requests
- [ ] Graceful error handling when APIs are unavailable
- [ ] Fallback UI shows when data cannot be loaded

---

## 4. Technical Requirements

### Browser Support
- Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- Mobile browsers: iOS Safari 12+, Chrome Mobile 60+

### Performance Targets
- Initial page load: < 2 seconds
- API response time: < 3 seconds
- Memory usage: < 50MB
- Bundle size: < 100KB total

### APIs & Dependencies
- **Geocoding**: OpenStreetMap Nominatim (free, no API key)
- **Twilight Data**: Sunrise-sunset.org API (free, no API key)
- **Technology Stack**: Pure HTML5, CSS3, JavaScript ES6+
- **No Build Process**: Direct browser compatibility

---

## 5. Success Metrics

### User Engagement
- Time on page: > 2 minutes average
- Month navigation: > 3 months viewed per session
- Location searches: > 1 location tried per user

### Technical Performance
- Page load time: < 2 seconds (95th percentile)
- API success rate: > 99%
- Mobile usability score: > 95

### Community Growth
- GitHub stars: Target 50+ in first month
- Social shares: Track via URL parameters
- Developer interest: Monitor forks and issues

---

## 6. Release Plan

### Phase 1: Core MVP (Current)
- ✅ Basic solar symmetry calculations
- ✅ Location search and twilight data
- ✅ Two-column responsive layout
- ✅ Month navigation

### Phase 2: Enhanced Features (Future)
- Timezone handling improvements
- Historical date ranges (multi-year)
- Export/sharing capabilities
- Additional astronomical data points

### Phase 3: Community Features (Future)
- User favorite locations
- Social sharing with custom graphics
- Educational content and explanations
- Interactive tutorials

---

## 7. Risk Assessment

### Technical Risks
- **API Rate Limits**: Mitigated by aggressive caching
- **Browser Compatibility**: Tested across target browsers
- **Mobile Performance**: Optimized for lower-end devices

### User Experience Risks
- **Complex Concept**: Mitigated by clear visual design
- **Data Accuracy**: Using established astronomical APIs
- **Loading Times**: Batch requests and caching strategy

---

## 8. Appendices

### Glossary
- **Civil Twilight**: Period when sun is 6° below horizon (when it starts getting light/dark)
- **Solstice**: Dates when sun reaches maximum/minimum elevation (June 21, Dec 21)
- **Mirror Date**: Date equidistant from solstice but on opposite side

### Reference Materials
- Astronomical calculations based on standard solstice dates
- API documentation for Nominatim and Sunrise-Sunset.org
- Web Accessibility Guidelines (WCAG 2.1) compliance

---

**Document Status**: Final  
**Last Updated**: September 2025  
**Next Review**: Post-launch feedback analysis