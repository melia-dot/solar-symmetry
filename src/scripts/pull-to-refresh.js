/**
 * Pull-to-Refresh with Cache Busting
 * Detects pull-down gesture and forces a hard reload
 */

class PullToRefresh {
    constructor() {
        this.startY = 0;
        this.currentY = 0;
        this.isDragging = false;
        this.threshold = 80; // Pull distance needed to trigger
        this.maxPullDistance = 150;
        
        this.init();
    }
    
    init() {
        // Create refresh indicator
        this.createRefreshIndicator();
        
        // Bind touch events
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }
    
    createRefreshIndicator() {
        this.indicator = document.createElement('div');
        this.indicator.className = 'pull-to-refresh-indicator';
        this.indicator.innerHTML = `
            <div class="pull-spinner"></div>
            <div class="pull-text">Pull down to refresh</div>
        `;
        document.body.insertBefore(this.indicator, document.body.firstChild);
    }
    
    handleTouchStart(e) {
        // Only allow pull-to-refresh when scrolled to top
        if (window.scrollY === 0) {
            this.startY = e.touches[0].clientY;
            this.isDragging = true;
        }
    }
    
    handleTouchMove(e) {
        if (!this.isDragging) return;
        
        this.currentY = e.touches[0].clientY;
        const pullDistance = Math.min(
            Math.max(this.currentY - this.startY, 0),
            this.maxPullDistance
        );
        
        if (pullDistance > 0 && window.scrollY === 0) {
            e.preventDefault(); // Prevent default scroll
            
            // Update indicator position and state
            const progress = Math.min(pullDistance / this.threshold, 1);
            this.indicator.style.transform = `translateY(${pullDistance}px)`;
            this.indicator.style.opacity = progress;
            
            if (pullDistance >= this.threshold) {
                this.indicator.classList.add('ready');
                this.indicator.querySelector('.pull-text').textContent = 'Release to refresh';
            } else {
                this.indicator.classList.remove('ready');
                this.indicator.querySelector('.pull-text').textContent = 'Pull down to refresh';
            }
        }
    }
    
    handleTouchEnd(e) {
        if (!this.isDragging) return;
        
        const pullDistance = this.currentY - this.startY;
        
        if (pullDistance >= this.threshold) {
            // Trigger refresh
            this.refresh();
        } else {
            // Reset indicator
            this.resetIndicator();
        }
        
        this.isDragging = false;
    }
    
    async refresh() {
        this.indicator.classList.add('refreshing');
        this.indicator.querySelector('.pull-text').textContent = 'Refreshing...';
        
        try {
            // Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }
            
            // Unregister service worker
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(
                    registrations.map(registration => registration.unregister())
                );
            }
            
            // Hard reload with cache bypass
            window.location.reload(true);
            
        } catch (error) {
            console.error('Failed to refresh:', error);
            this.resetIndicator();
        }
    }
    
    resetIndicator() {
        this.indicator.style.transform = 'translateY(0)';
        this.indicator.style.opacity = '0';
        this.indicator.classList.remove('ready', 'refreshing');
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    new PullToRefresh();
});
