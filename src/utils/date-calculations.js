/**
 * Solar Symmetry Date Calculations
 * Handles all date math for finding mirrored dates around solstices
 */

class DateCalculations {
    constructor() {
        // Fixed solstice dates (approximate)
        this.SUMMER_SOLSTICE = { month: 6, day: 21 }; // June 21
        this.WINTER_SOLSTICE = { month: 12, day: 21 }; // December 21
    }

    /**
     * Get the nearest solstice for a given date
     * @param {Date} date - The date to check
     * @returns {Date} - The nearest solstice date
     */
    getNearestSolstice(date) {
        const year = date.getFullYear();
        const summerSolstice = new Date(year, this.SUMMER_SOLSTICE.month - 1, this.SUMMER_SOLSTICE.day);
        const winterSolstice = new Date(year, this.WINTER_SOLSTICE.month - 1, this.WINTER_SOLSTICE.day);
        
        // Calculate distances to both solstices
        const distanceToSummer = Math.abs(date - summerSolstice);
        const distanceToWinter = Math.abs(date - winterSolstice);
        
        // Handle year boundary for winter solstice
        const nextWinterSolstice = new Date(year + 1, this.WINTER_SOLSTICE.month - 1, this.WINTER_SOLSTICE.day);
        const prevWinterSolstice = new Date(year - 1, this.WINTER_SOLSTICE.month - 1, this.WINTER_SOLSTICE.day);
        
        const distanceToNextWinter = Math.abs(date - nextWinterSolstice);
        const distanceToPrevWinter = Math.abs(date - prevWinterSolstice);
        
        // Find the minimum distance
        const distances = [
            { distance: distanceToSummer, date: summerSolstice },
            { distance: distanceToWinter, date: winterSolstice },
            { distance: distanceToNextWinter, date: nextWinterSolstice },
            { distance: distanceToPrevWinter, date: prevWinterSolstice }
        ];
        
        return distances.reduce((nearest, current) => 
            current.distance < nearest.distance ? current : nearest
        ).date;
    }

    /**
     * Calculate the mirrored date for a given date around the nearest solstice
     * @param {Date} date - The date to mirror
     * @returns {Date} - The mirrored date
     */
    calculateMirrorDate(date) {
        const nearestSolstice = this.getNearestSolstice(date);
        
        // Calculate days from solstice
        const daysFromSolstice = Math.floor((date - nearestSolstice) / (1000 * 60 * 60 * 24));
        
        // Mirror the date (same distance, opposite direction)
        const mirroredDate = new Date(nearestSolstice);
        mirroredDate.setDate(mirroredDate.getDate() - daysFromSolstice);
        
        return mirroredDate;
    }

    /**
     * Get all dates for a given month (for cities comparison)
     * @param {number} year - The year
     * @param {number} month - The month (1-12)
     * @returns {Array} - Array of Date objects for all days in the month
     */
    getMonthDates(year, month) {
        const dates = [];
        const daysInMonth = new Date(year, month, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
            dates.push(new Date(year, month - 1, day));
        }
        
        return dates;
    }

    /**
     * Get all dates for a given month with their mirrored counterparts
     * @param {number} year - The year
     * @param {number} month - The month (1-12)
     * @returns {Array} - Array of objects with current and mirrored dates
     */
    getMonthWithMirrors(year, month) {
        const datesData = [];
        const daysInMonth = new Date(year, month, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month - 1, day);
            const mirroredDate = this.calculateMirrorDate(currentDate);
            
            datesData.push({
                current: currentDate,
                mirrored: mirroredDate,
                isToday: this.isToday(currentDate)
            });
        }
        
        return datesData;
    }

    /**
     * Check if a date is today
     * @param {Date} date - The date to check
     * @returns {boolean} - True if the date is today
     */
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    /**
     * Format a date for display
     * @param {Date} date - The date to format
     * @returns {string} - Formatted date string
     */
    formatDate(date) {
        const options = { 
            month: 'short', 
            day: 'numeric'
        };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Format a date with full month name for headers
     * @param {Date} date - The date to format
     * @returns {string} - Formatted date string
     */
    formatMonthYear(date) {
        const options = { 
            month: 'long', 
            year: 'numeric'
        };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Get the current date
     * @returns {Date} - Current date
     */
    getCurrentDate() {
        return new Date();
    }

    /**
     * Navigate to previous month
     * @param {Date} currentDate - Current month date
     * @returns {Date} - Previous month date
     */
    getPreviousMonth(currentDate) {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        return newDate;
    }

    /**
     * Navigate to next month
     * @param {Date} currentDate - Current month date
     * @returns {Date} - Next month date
     */
    getNextMonth(currentDate) {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        return newDate;
    }

    /**
     * Check if we can navigate to previous month (not before January)
     * @param {Date} currentDate - Current month date
     * @returns {boolean} - True if previous month navigation is allowed
     */
    canGoToPreviousMonth(currentDate) {
        return currentDate.getMonth() > 0;
    }

    /**
     * Check if we can navigate to next month (not after December)
     * @param {Date} currentDate - Current month date
     * @returns {boolean} - True if next month navigation is allowed
     */
    canGoToNextMonth(currentDate) {
        return currentDate.getMonth() < 11;
    }
}

// Export for use in other modules
window.DateCalculations = DateCalculations;