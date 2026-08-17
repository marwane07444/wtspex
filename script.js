/**
 * Chat on WhatsApp - Interaction Scripts & Dynamic Locker Flow
 */

document.addEventListener('DOMContentLoaded', () => {
  const primaryBtn = document.getElementById('primary-cta');
  const secondaryBtn = document.getElementById('secondary-cta');
  const profileImg = document.getElementById('profile-img');
  
  // Navigation Menu elements
  const menuNavWrapper = document.getElementById('header-nav-wrapper');
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const navDropdownMenu = document.getElementById('nav-dropdown-menu');

  // Toggle dropdown menu
  if (menuToggleBtn && menuNavWrapper) {
    menuToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menuNavWrapper.classList.toggle('is-open');
      menuToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (menuNavWrapper.classList.contains('is-open') && !menuNavWrapper.contains(e.target)) {
        menuNavWrapper.classList.remove('is-open');
        menuToggleBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Close menu on link click
    if (navDropdownMenu) {
      navDropdownMenu.querySelectorAll('.nav-item-link').forEach(link => {
        link.addEventListener('click', () => {
          menuNavWrapper.classList.remove('is-open');
          menuToggleBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  // Modal elements
  const lockerModal = document.getElementById('locker-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const lockerIframe = document.getElementById('locker-iframe');

  const TARGET_WHATSAPP_URL = 'https://wa.me/212696285737';
  const OFFERS_FEED_URL = 'https://d1cdbd1x576ga0.cloudfront.net/public/offers/feed.php?user_id=536541&api_key=b18c81828ee8bdf3b552ed2e5bf88f92&s1=&s2=';
  const LOCKER_ICON_URL = 'https://i.postimg.cc/LXnmWzQn/locker-without-bg.png';

  // Fallback offers matching user configuration
  const DEFAULT_OFFERS = [
    {
      id: 'server_1',
      name: 'Verify your phone number to continue',
      anchor: 'Server 1',
      conversion: 'Server 1',
      network_icon: LOCKER_ICON_URL,
      url: TARGET_WHATSAPP_URL
    },
    {
      id: 'server_2',
      name: 'Verify your phone number to continue',
      anchor: 'Server 2',
      conversion: 'Server 2',
      network_icon: LOCKER_ICON_URL,
      url: TARGET_WHATSAPP_URL
    }
  ];

  let cachedOffers = null;
  let isFetchingOffers = false;

  // Fetch offers feed from CloudFront endpoint
  async function fetchOffersFeed() {
    if (cachedOffers && cachedOffers.length > 0) {
      return cachedOffers;
    }

    isFetchingOffers = true;
    try {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const res = await window.fetch(OFFERS_FEED_URL, { credentials: 'omit' });
        if (res && res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            cachedOffers = data.slice(0, 2);
            return cachedOffers;
          }
        }
      }
    } catch (err) {
      console.warn('Unable to load offers feed directly in parent, fallback will be used:', err);
    } finally {
      isFetchingOffers = false;
    }

    cachedOffers = DEFAULT_OFFERS;
    return cachedOffers;
  }

  // Helper to escape HTML strings safely
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function createIframeIconElement(iconUrl, index, iframeDoc) {
    const iconDiv = iframeDoc.createElement('div');
    iconDiv.className = 'offer-app-icon';
    const img = iframeDoc.createElement('img');
    img.src = iconUrl || LOCKER_ICON_URL;
    img.alt = 'Verification Icon';
    img.referrerPolicy = 'no-referrer';
    img.onerror = function() {
      img.src = LOCKER_ICON_URL;
    };
    iconDiv.appendChild(img);
    return iconDiv;
  }

  // Inject & render dynamic offer rows into the iframe document
  function renderOffersInIframe(offers, iframeDoc) {
    if (!iframeDoc) return;
    const container = iframeDoc.getElementById('offers-container');
    if (!container) return;

    container.innerHTML = '';

    const displayOffers = (offers && offers.length > 0) ? offers : DEFAULT_OFFERS;

    displayOffers.forEach((offer, idx) => {
      const offerNumber = idx + 1;
      const titleText = 'Verify your phone number to continue';
      const descText = idx === 0 ? 'Server 1' : 'Server 2';
      const offerUrl = offer.url || TARGET_WHATSAPP_URL;
      const iconUrl = LOCKER_ICON_URL;

      const row = iframeDoc.createElement('div');
      row.className = 'offer-row';
      row.id = `offer-row-${offerNumber}`;

      const offerLeft = iframeDoc.createElement('div');
      offerLeft.className = 'offer-left';

      const iconEl = createIframeIconElement(iconUrl, idx, iframeDoc);
      offerLeft.appendChild(iconEl);

      const textDiv = iframeDoc.createElement('div');
      textDiv.className = 'offer-text-content';
      textDiv.innerHTML = `
        <h3 class="offer-title">${titleText}</h3>
        <p class="offer-desc">${descText}</p>
      `;
      offerLeft.appendChild(textDiv);
      row.appendChild(offerLeft);

      const ctaBtn = iframeDoc.createElement('button');
      ctaBtn.type = 'button';
      ctaBtn.className = 'offer-open-btn';
      ctaBtn.id = `offer-btn-${offerNumber}`;
      ctaBtn.textContent = 'Verify';
      ctaBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleOfferClick(offerNumber, offerUrl, iframeDoc);
      });
      row.appendChild(ctaBtn);

      const loadingDiv = iframeDoc.createElement('div');
      loadingDiv.className = 'completion-status';
      loadingDiv.id = `offer-loading-${offerNumber}`;
      loadingDiv.innerHTML = '<div class="spinner"></div><span>Connecting...</span>';
      row.appendChild(loadingDiv);

      container.appendChild(row);
    });
  }

  // Handle offer card button click - opens offer without switching to successful state
  function handleOfferClick(offerIndex, offerUrl, iframeDoc) {
    // If there's an external offer URL (excluding WhatsApp), open it in a new tab
    if (offerUrl && offerUrl !== '#' && offerUrl !== TARGET_WHATSAPP_URL && !offerUrl.includes('wa.me')) {
      try {
        window.open(offerUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.error('Could not open offer URL:', e);
      }
    }
  }

  // Synchronize and update the iframe content
  async function updateIframeOffers() {
    if (!lockerIframe) return;

    const offers = await fetchOffersFeed();

    // Check same-origin accessibility
    try {
      const iframeDoc = lockerIframe.contentDocument || lockerIframe.contentWindow?.document;
      if (iframeDoc && iframeDoc.getElementById('offers-container')) {
        renderOffersInIframe(offers, iframeDoc);
      }
    } catch (e) {
      // Cross-origin fallback via postMessage
      if (lockerIframe.contentWindow) {
        lockerIframe.contentWindow.postMessage({
          type: 'SET_OFFERS',
          offers: offers
        }, '*');
      }
    }
  }

  // Listen to iframe load event to immediately populate offers
  if (lockerIframe) {
    lockerIframe.addEventListener('load', () => {
      updateIframeOffers();
    });
  }

  // Fallback for profile photo if image fails to load
  if (profileImg) {
    let triedLocal = false;
    profileImg.addEventListener('error', () => {
      if (!triedLocal && profileImg.src !== window.location.origin + '/profile.jpg') {
        triedLocal = true;
        profileImg.src = '/profile.jpg';
      } else {
        // Replace with a clean SVG avatar data URI fallback
        profileImg.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23128C7E'><rect width='100' height='100' fill='%23E9EDEF'/><circle cx='50' cy='38' r='20' fill='%23128C7E'/><path d='M20 85c0-16.5 13.5-30 30-30s30 13.5 30 30z' fill='%23128C7E'/></svg>";
      }
    });
  }

  // Fallback for WhatsApp logo images
  const logoImgs = document.querySelectorAll('.header-logo-img, .btn-logo-img');
  logoImgs.forEach((logo) => {
    let triedLocalLogo = false;
    logo.addEventListener('error', () => {
      if (!triedLocalLogo && logo.src !== window.location.origin + '/whatsapp-logo.png') {
        triedLocalLogo = true;
        logo.src = '/whatsapp-logo.png';
      }
    });
  });

  // Modal open / close helpers
  const openModal = () => {
    if (!lockerModal) return;
    lockerModal.classList.add('is-active');
    lockerModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Trigger offer synchronization
    updateIframeOffers();
  };

  const closeModal = () => {
    if (!lockerModal) return;
    lockerModal.classList.remove('is-active');
    lockerModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  // Prevent direct WhatsApp navigation on Send Message & Continue to WhatsApp Web clicks, and open Modal instead
  if (primaryBtn) {
    primaryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });
  }

  if (secondaryBtn) {
    secondaryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });
  }

  // Close handlers
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', () => {
      closeModal();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (menuNavWrapper && menuNavWrapper.classList.contains('is-open')) {
        menuNavWrapper.classList.remove('is-open');
        if (menuToggleBtn) menuToggleBtn.setAttribute('aria-expanded', 'false');
      }
      if (lockerModal && lockerModal.classList.contains('is-active')) {
        closeModal();
      }
    }
  });

  // Handler for locker completion (without external redirect)
  const handleLockerCompletion = (data) => {
    console.log('Locker verification completed:', data);
  };

  // Expose global callback for same-origin iframe execution
  window.onLockerCompleted = handleLockerCompletion;

  // Listen for postMessage from content-locker iframe
  window.addEventListener('message', (event) => {
    if (!event.data) return;

    // Check for custom completion event or standard CPA/Content Locker postMessage signatures
    if (
      event.data.type === 'LOCKER_COMPLETED' ||
      event.data.action === 'LOCKER_COMPLETED' ||
      event.data.status === 'completed' ||
      event.data.event === 'cpa_lead_completed' ||
      event.data.event === 'ogads_completed' ||
      event.data.event === 'cpabuild_completed'
    ) {
      handleLockerCompletion(event.data);
    }
  });

  // Tactile button click feedback
  const setupButtonFeedback = (button) => {
    if (!button) return;
    
    button.addEventListener('click', () => {
      button.style.transform = 'scale(0.97)';
      setTimeout(() => {
        button.style.transform = '';
      }, 150);
    });
  };

  setupButtonFeedback(primaryBtn);
  setupButtonFeedback(secondaryBtn);

  // Pre-fetch offer feed early in background
  fetchOffersFeed();
});


