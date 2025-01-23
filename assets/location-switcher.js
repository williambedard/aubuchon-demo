// Use a self-executing function to avoid polluting global scope
(function() {
  // Cache DOM queries and create elements once
  const overlay = document.createElement('div');
  overlay.className = 'location-transition-overlay';
  overlay.innerHTML = '<div class="spinner"></div>';
  
  // Inject minimal required styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    body.is-changing-location .announcement-bar,
    body.is-changing-location .countdown-banner__inner,
    body.is-changing-location .footer__parent,
    body.is-changing-location .badge-shape {
      transition: background-color var(--duration-fast) var(--easing);
    }
    body.is-changing-location .header__logo img {
      transition: opacity var(--duration-fast) var(--easing);
    }
    .location-transition-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--color-background);
      opacity: 0;
      pointer-events: none;
      z-index: var(--z-index-header);
      transform: translateY(-100%);
      transition: opacity var(--duration-fast) var(--easing),
                transform var(--duration-fast) var(--easing);
    }
    .location-transition-overlay.active {
      opacity: 0.5;
      transform: translateY(0);
      pointer-events: all;
    }
  `;

  class LocationSwitcher {
    constructor() {
      // Cache DOM elements and bind methods once
      this.titleElement = document.querySelector('[data-selected-location]');
      this.regularLogo = document.querySelector('.regular-logo img');
      this.announcementBar = document.querySelector('.announcement-bar');
      this.countdownBanner = document.querySelector('.countdown-banner__inner');
      this.badges = document.querySelectorAll('.badge-shape');
      
      // Bind methods to preserve context
      this.selectLocation = this.selectLocation.bind(this);
      this.applyLocationSettings = this.applyLocationSettings.bind(this);
      
      // Initialize
      this.init();
    }

    init() {
      // Add overlay and styles only once
      document.head.appendChild(styleSheet);
      document.body.appendChild(overlay);
      
      // Load stored location
      const storedLocation = sessionStorage.getItem('selectedLocation');
      if (storedLocation) {
        this.applyLocationSettings(JSON.parse(storedLocation));
      }
    }

    selectLocation(event, element) {
      event.preventDefault();
      
      // Use dataset for better performance than getAttribute
      const locationData = {
        address: element.dataset.locationAddress,
        primaryColor: element.dataset.primaryColor,
        secondaryColor: element.dataset.secondaryColor,
        storeLogo: element.dataset.storeLogo,
        locationId: element.dataset.locationId
      };
      
      sessionStorage.setItem('selectedLocation', JSON.stringify(locationData));
      this.applyLocationSettings(locationData);
    }

    applyLocationSettings(locationData) {
      document.body.classList.add('is-changing-location');
      overlay.classList.add('active');

      // Update title with the store status indicator
      if (this.titleElement) {
        this.titleElement.innerHTML = `
          <strong>
            <span class="store-status">
              <span class="store-status__indicator">Open</span>
            </span>
            ${locationData.address}
          </strong>
        `;
      }

      // Batch all visual updates in one animation frame
      requestAnimationFrame(() => {
        this.updateColors(locationData);
        this.updateLogo(locationData);

        // Use Promise to handle completion
        Promise.all([
          this.waitForLogoLoad(locationData),
          new Promise(resolve => setTimeout(resolve, 300))
        ]).then(() => {
          overlay.classList.remove('active');
          document.body.classList.remove('is-changing-location');
        });
      });
    }

    updateColors(locationData) {
      const rootStyle = document.documentElement.style;
      const { primaryColor, secondaryColor } = locationData;
      
      // Batch all CSS variable updates
      const updates = {
        '--color-accent': primaryColor,
        '--color-button-primary-background': primaryColor,
        '--color-button-primary-background-hover': primaryColor,
        '--color-background-footer': primaryColor,
        '--color-button-secondary-background': secondaryColor,
        '--color-button-secondary-background-hover': secondaryColor
      };
      
      Object.entries(updates).forEach(([prop, value]) => {
        rootStyle.setProperty(prop, value);
      });

      // Update announcement bar colors
      if (this.announcementBar) {
        this.announcementBar.style.setProperty('--color-background', primaryColor);
        
      }

      // Update countdown banner colors
      if (this.countdownBanner) {
        this.countdownBanner.style.setProperty('--color-background', primaryColor);
      }

      // Update badges if they exist
      this.badges?.forEach(badge => {
        badge.style.backgroundColor = primaryColor;
      });
    }

    waitForLogoLoad(locationData) {
      return new Promise(resolve => {
        if (!this.regularLogo || !locationData.storeLogo) {
          resolve();
          return;
        }

        const newLogoUrl = locationData.storeLogo.startsWith('files/') 
          ? `${this.regularLogo.src.split('/files/')[0]}/${locationData.storeLogo}`
          : locationData.storeLogo;

        // Preload new logo
        const tempImg = new Image();
        tempImg.onload = () => {
          this.regularLogo.style.opacity = '0';
          requestAnimationFrame(() => {
            this.regularLogo.src = newLogoUrl;
            this.regularLogo.srcset = newLogoUrl;
            this.regularLogo.style.opacity = '1';
            resolve();
          });
        };
        tempImg.src = newLogoUrl;
      });
    }

    updateLogo(locationData) {
      if (this.regularLogo && locationData.storeLogo) {
        this.regularLogo.style.opacity = '0';
        
        const currentSrc = this.regularLogo.src;
        const cdnDomain = currentSrc.split('/files/')[0];
        
        let newLogoUrl = locationData.storeLogo;
        if (newLogoUrl.startsWith('files/')) {
          newLogoUrl = `${cdnDomain}/${newLogoUrl}`;
        }

        // Preload new logo for smooth transition
        const tempImg = new Image();
        tempImg.onload = () => {
          requestAnimationFrame(() => {
            this.regularLogo.src = newLogoUrl;
            this.regularLogo.srcset = newLogoUrl;
            this.regularLogo.style.opacity = '1';
          });
        };
        tempImg.src = newLogoUrl;
      }
    }
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.locationSwitcher = new LocationSwitcher();
    });
  } else {
    window.locationSwitcher = new LocationSwitcher();
  }
})();
