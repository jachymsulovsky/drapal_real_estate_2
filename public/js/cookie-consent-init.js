window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

if (!localStorage.getItem('cookie_consent_choice')) {
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied'
  });
} else {
  const consent = JSON.parse(localStorage.getItem('cookie_consent_choice'));
  gtag('consent', 'default', {
    'ad_storage': consent.marketing ? 'granted' : 'denied',
    'ad_user_data': consent.marketing ? 'granted' : 'denied',
    'ad_personalization': consent.marketing ? 'granted' : 'denied',
    'analytics_storage': consent.analytics ? 'granted' : 'denied'
  });
}

gtag('js', new Date());
gtag('config', 'G-V8KTRE2T9Y');
