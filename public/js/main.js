(function () {
  'use strict';

  //
  // ============================================================
  // MOTIV: TMA / SVĚTLÝ REŽIM
  // ============================================================
  // Ukládáme preferenci do localStorage, aby vydržela
  // i po obnovení stránky. Tlačítko je označeno data-theme-toggle.
  // ============================================================
  //
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.dataset.theme = savedTheme;

  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('theme', next);
    });
  });

  //
  // ============================================================
  // POTVRZENÍ AKCE — formuláře s data-confirm
  // ============================================================
  // Pokud má <form data-confirm="Text">, před odesláním
  // zobrazí dialogové okno s potvrzením.
  // ============================================================
  //
  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (!window.confirm(form.dataset.confirm)) {
        event.preventDefault();
      }
    });
  });

  //
  // ============================================================
  // LEAFLET MAPY — Interaktivní mapy nemovitostí
  // ============================================================
  // Používáme OpenStreetMap (zdarma, bez API klíče).
  // Každý prvek s data-map vytvoří samostatnou mapu.
  // scrollWheelZoom: false = mapa se nezoomuje kolečkem
  // (uživatel musí kliknout dovnitř).
  // ============================================================
  //
  if (window.L) {
    document.querySelectorAll('[data-map]').forEach((element) => {
      const lat = Number(element.dataset.lat);
      const lng = Number(element.dataset.lng);
      const title = element.dataset.title || 'Drápal Real Estate';
      const map = L.map(element, { scrollWheelZoom: false }).setView([lat, lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      L.marker([lat, lng]).addTo(map).bindPopup(title).openPopup();
    });
  }

  //
  // ============================================================
  // GOOGLE MAPS EMBED — Bezpečné vložení mapy
  // ============================================================
  // Vytvoříme <iframe> s mapou až po načtení stránky.
  // Data bereme z data-map-url atributu (serverem escapováno).
  // ============================================================
  //
  const mapContainer = document.getElementById('google-map-container');
  if (mapContainer && mapContainer.dataset.mapUrl) {
    const iframe = document.createElement('iframe');
    iframe.src = mapContainer.dataset.mapUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    mapContainer.appendChild(iframe);
  }

  //
  // ============================================================
  // LIGHTBOX GALERIE — Pro detail nemovitosti
  // ============================================================
  // Umožňuje prohlížení fotek v celoobrazovkovém režimu.
  // Ovládá se kliknutím, šipkami nebo ESC.
  // ============================================================
  //
  let currentImageIndex = 0;
  let lightboxImages = [];

  // Zpřístupníme funkce globálně pro onclick atributy v šabloně
  window.openLightbox = function(index) {
    // Najdeme všechny obrázky v galerii
    const gallery = document.getElementById('property-gallery');
    if (!gallery) return;

    const imgs = gallery.querySelectorAll('img');
    lightboxImages = Array.from(imgs).map(img => ({ src: img.src, alt: img.alt }));

    if (lightboxImages.length === 0) return;

    currentImageIndex = index;
    showLightboxImage();

    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden'; // Zamezíme scrollování stránky
    }
  };

  window.closeLightbox = function() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
      lightbox.classList.remove('active');
      document.body.style.overflow = ''; // Obnovíme scrollování
    }
  };

  window.changeImage = function(direction) {
    currentImageIndex += direction;
    if (currentImageIndex < 0) {
      currentImageIndex = lightboxImages.length - 1; // Poslední
    } else if (currentImageIndex >= lightboxImages.length) {
      currentImageIndex = 0; // První (cyklické procházení)
    }
    showLightboxImage();
  };

  function showLightboxImage() {
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    if (img && lightboxImages[currentImageIndex]) {
      img.src = lightboxImages[currentImageIndex].src;
      img.alt = lightboxImages[currentImageIndex].alt;
    }
    if (counter) {
      counter.textContent = (currentImageIndex + 1) + ' / ' + lightboxImages.length;
    }
  }

  //
  // ============================================================
  // LIGHTBOX — Ovládání klávesnicí
  // ============================================================
  // Šipka vpravo = další, šipka vlevo = předchozí, ESC = zavřít.
  // ============================================================
  //
  document.addEventListener('keydown', function(e) {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('active')) return;

    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowRight') {
      changeImage(1);
    } else if (e.key === 'ArrowLeft') {
      changeImage(-1);
    }
  });

  //
  // ============================================================
  // MOBILNÍ STICKY CTA — Rychlý kontakt na telefon
  // ============================================================
  // Na detailu nemovitosti zobrazíme pevné tlačítko dole
  // (pouze na mobilu pod 640px šířky).
  // ============================================================
  //
  const stickyCta = document.getElementById('sticky-cta');
  if (stickyCta) {
    // Zobrazit pouze na mobilu (JS detekce, doplněk k CSS media query)
    function checkMobile() {
      stickyCta.style.display = window.innerWidth <= 640 ? 'flex' : 'none';
    }
    checkMobile();
    window.addEventListener('resize', checkMobile);
  }

  //
  // ============================================================
  // VYHLEDÁVACÍ FILTR — Reset tlačítko
  // ============================================================
  // Pokud je filtr aktivní, zobrazíme tlačítko pro smazání filtrů.
  // ============================================================
  //
  const filterForm = document.querySelector('.filter-bar');
  if (filterForm) {
    const urlParams = new URLSearchParams(window.location.search);
    const hasFilters = urlParams.toString().length > 0;

    if (hasFilters) {
      const resetBtn = document.createElement('a');
      resetBtn.href = '/';
      resetBtn.className = 'button secondary small';
      resetBtn.textContent = 'Zrušit filtry';
      resetBtn.style.alignSelf = 'end';
      filterForm.appendChild(resetBtn);
    }
  }
})();
