(function() {
    const banner = document.getElementById('cookie-consent-banner');
    const modal = document.getElementById('cookie-settings-modal');
    const trigger = document.getElementById('cookie-consent-trigger');
    
    const btnAcceptAll = document.getElementById('cookie-accept-all');
    const btnRejectAll = document.getElementById('cookie-reject-all');
    const btnOpenSettings = document.getElementById('cookie-open-settings');
    const btnSaveSettings = document.getElementById('cookie-save-settings');
    const btnCloseModal = document.getElementById('cookie-close-modal');
    
    const optAnalytics = document.getElementById('cookie-opt-analytics');
    const optMarketing = document.getElementById('cookie-opt-marketing');

    // Configuration
    const COOKIE_STORAGE_KEY = 'cookie_consent_choice';
    const CONSENT_EXPIRY_DAYS = 365;

    function setConsent(analytics, marketing) {
        const consentData = {
            analytics,
            marketing,
            timestamp: new Date().getTime()
        };
        
        localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(consentData));
        
        // Aktualizace stavu po kliknutí (Consent Mode v2 Update)
        gtag('consent', 'update', {
            'analytics_storage': analytics ? 'granted' : 'denied',
            'ad_storage': marketing ? 'granted' : 'denied',
            'ad_user_data': marketing ? 'granted' : 'denied',
            'ad_personalization': marketing ? 'granted' : 'denied'
        });

        banner.classList.remove('show');
        modal.classList.remove('show');

        // Trigger custom event for other scripts (like Google Maps loader)
        window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: consentData }));
    }

    function checkConsent() {
        const stored = localStorage.getItem(COOKIE_STORAGE_KEY);
        if (!stored) {
            banner.classList.add('show');
            return;
        }

        const data = JSON.parse(stored);
        const now = new Date().getTime();
        const expiry = CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        if (now - data.timestamp > expiry) {
            banner.classList.add('show');
        } else {
            // Re-apply marketing/analytics if needed (though 'default' in EJS handles initial load)
            if (data.marketing) {
                window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: data }));
            }
        }
    }

    btnAcceptAll.addEventListener('click', () => setConsent(true, true));
    
    btnRejectAll.addEventListener('click', () => setConsent(false, false));
    
    btnOpenSettings.addEventListener('click', () => {
        const stored = localStorage.getItem(COOKIE_STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            optAnalytics.checked = data.analytics;
            optMarketing.checked = data.marketing;
        }
        modal.classList.add('show');
    });

    btnSaveSettings.addEventListener('click', () => {
        setConsent(optAnalytics.checked, optMarketing.checked);
    });

    btnCloseModal.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    trigger.addEventListener('click', () => {
        const stored = localStorage.getItem(COOKIE_STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            optAnalytics.checked = data.analytics;
            optMarketing.checked = data.marketing;
        }
        modal.classList.add('show');
    });

    // Initialize
    checkConsent();

    // Google Maps Embed Loader (Integrated with Cookie Consent)
    window.initGoogleMaps = function(containerId, embedUrl) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const loadMap = () => {
            container.innerHTML = `
                <iframe 
                    src="${embedUrl}" 
                    width="100%" 
                    height="450px"
                    style="border:0; border-radius: 8px;" 
                    allowfullscreen="" 
                    loading="lazy" 
                    referrerpolicy="no-referrer-when-downgrade">
                </iframe>`;
        };

        const stored = localStorage.getItem(COOKIE_STORAGE_KEY);
        const consent = stored ? JSON.parse(stored) : null;

        if (consent && consent.marketing) {
            loadMap();
        } else {
            // Render Placeholder
            container.innerHTML = `
                <div class="google-maps-placeholder">
                    <p>Pro zobrazení interaktivní mapy je nutné přijmout marketingové cookies.</p>
                    <button class="cookie-btn cookie-btn-primary" id="enable-maps-btn">Povolit mapu</button>
                </div>
            `;
            document.getElementById('enable-maps-btn').addEventListener('click', () => {
                const current = localStorage.getItem(COOKIE_STORAGE_KEY);
                const data = current ? JSON.parse(current) : { analytics: false };
                setConsent(data.analytics, true);
                loadMap();
            });
        }
        
        // Listen for consent updates
        window.addEventListener('cookieConsentUpdated', (e) => {
            if (e.detail.marketing && container.querySelector('.google-maps-placeholder')) {
                loadMap();
            }
        });
    };
})();
