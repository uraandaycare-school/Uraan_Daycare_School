/**
 * URAAN-WEB-2026: Frontend Script Orchestrator
 * Controls: Scroll Animations, Mobile Navigation, Program Tabs,
 *           Multi-step Admissions Form Wizard, and API Submissions.
 *
 * Security:
 *   - X-Requested-With header on all API fetches (CSRF mitigation — OWASP A01)
 *   - alert() replaced with toast notifications (no innerHTML — OWASP A03)
 */

/* ==========================================================================
   TOAST NOTIFICATION UTILITY
   XSS-safe: uses textContent only — never innerHTML.
   Type: 'success' | 'error' | 'info'
   ========================================================================== */
function showToast(message, type) {
  type = type || 'info';

  // Remove any existing toast
  const existing = document.getElementById('uraan-toast-live');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id        = 'uraan-toast-live';
  toast.className = 'uraan-toast toast-' + type;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');

  const icon = document.createElement('i');
  icon.className = type === 'success'
    ? 'fas fa-check-circle'
    : type === 'error'
      ? 'fas fa-exclamation-circle'
      : 'fas fa-info-circle';

  const text = document.createElement('span');
  // UraanSecurity.safeText ensures textContent — loaded by security.js before this file
  if (window.UraanSecurity) {
    window.UraanSecurity.safeText(text, message);
  } else {
    text.textContent = String(message);
  }

  toast.appendChild(icon);
  toast.appendChild(text);
  document.body.appendChild(toast);

  // Auto-dismiss after 5 seconds
  setTimeout(function () {
    toast.classList.add('toast-fade-out');
    setTimeout(function () { toast.remove(); }, 380);
  }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all client controllers
  initNavigation();
  initScrollAnimations();
  initProgramTabs();
  initAdmissionsForm();
  initContactForm();
  initWhatsAppWidget();
});

/* ==========================================================================
   1. NAVIGATION & SCROLL HANDLERS
   ========================================================================== */
function initNavigation() {
  const header = document.querySelector('header');
  const burgerMenu = document.querySelector('.burger-menu');
  const navLinks = document.querySelector('.nav-links');
  const navAnchors = document.querySelectorAll('.nav-links a:not(.btn)');

  // Sticky Navbar on Scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    trackActiveSection();
  });

  // Mobile Hamburger Toggle
  burgerMenu.addEventListener('click', () => {
    burgerMenu.classList.toggle('active');
    navLinks.classList.toggle('active');
  });

  // Close Mobile Menu on Anchor Click
  navAnchors.forEach(anchor => {
    anchor.addEventListener('click', () => {
      burgerMenu.classList.remove('active');
      navLinks.classList.remove('active');
    });
  });

  // Highlight active section in navbar based on scroll position
  const sections = document.querySelectorAll('section[id]');
  function trackActiveSection() {
    const scrollY = window.pageYOffset;
    
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 100;
      const sectionId = current.getAttribute('id');
      const activeLink = document.querySelector(`.nav-links a[href*=${sectionId}]`);

      if (activeLink) {
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          document.querySelectorAll('.nav-links a').forEach(el => el.classList.remove('active'));
          activeLink.classList.add('active');
        } else {
          activeLink.classList.remove('active');
        }
      }
    });
  }
}

/* ==========================================================================
   2. VIEWPORT INTERSECTION OBSERVER ANIMATIONS
   ========================================================================== */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  const observerOptions = {
    root: null,
    threshold: 0.15, // Trigger when 15% of element is in viewport
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
        observer.unobserve(entry.target); // Stop tracking once animated
      }
    });
  }, observerOptions);

  animatedElements.forEach(el => observer.observe(el));
}

/* ==========================================================================
   3. PROGRAMS INTERACTIVE TABS
   ========================================================================== */
function initProgramTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-content-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      // Update active button state
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Transition visible panel
      panels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.getAttribute('id') === targetTab) {
          panel.classList.add('active');
        }
      });
    });
  });
}

/* ==========================================================================
   4. FORM REGEX & SANITIZATION RULES (CLIENT SIDE)
   ========================================================================== */
const VALIDATION_SCHEMAS = {
  name: /^[a-zA-Z\s]{2,100}$/,
  phone: /^(?:\+92|92|0)?3\d{9}$|^\+?[0-9\s\-()]{7,20}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  dob: (val) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
    // Parse parts directly to avoid UTC timezone offset shifting the date
    const [y, m, d] = val.split('-').map(Number);
    const dobDate = new Date(y, m - 1, d); // local timezone
    if (isNaN(dobDate.getTime())) return false;
    const ageMs = Date.now() - dobDate.getTime();
    const age = ageMs / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 1 && age <= 15;
  }
};

/**
 * Validates a form input and displays/hides appropriate error styling
 */
function validateField(inputElement) {
  const name = inputElement.getAttribute('name');
  const val = inputElement.value.trim();
  const errorMsgEl = document.getElementById(`${inputElement.id}-error`);
  let isValid = true;

  if (inputElement.hasAttribute('required') && val === '') {
    isValid = false;
  } else if (val !== '') {
    if (name === 'childName' || name === 'parentName' || name === 'name') {
      isValid = VALIDATION_SCHEMAS.name.test(val);
    } else if (name === 'childDob') {
      isValid = VALIDATION_SCHEMAS.dob(val);
    } else if (name === 'parentPhone' || name === 'emergencyContact' || name === 'phone') {
      isValid = VALIDATION_SCHEMAS.phone.test(val);
    } else if (name === 'parentEmail' || name === 'email') {
      isValid = VALIDATION_SCHEMAS.email.test(val);
    }
  }

  if (isValid) {
    inputElement.classList.remove('is-invalid');
    inputElement.classList.add('is-valid');
    if (errorMsgEl) errorMsgEl.classList.remove('visible');
  } else {
    inputElement.classList.remove('is-valid');
    inputElement.classList.add('is-invalid');
    if (errorMsgEl) errorMsgEl.classList.add('visible');
  }

  return isValid;
}

// Attach real-time validation listeners to input fields
function attachLiveValidation(inputs) {
  inputs.forEach(input => {
    input.addEventListener('input', () => validateField(input));
    input.addEventListener('blur', () => validateField(input));
  });
}

/* ==========================================================================
   5. ADMISSIONS MULTI-STEP FORM WIZARD
   ========================================================================== */
function initAdmissionsForm() {
  const form = document.getElementById('admissions-wizard');
  if (!form) return;

  const panels = form.querySelectorAll('.form-step-panel');
  const stepNodes = document.querySelectorAll('.step-node');
  const progressBar = document.querySelector('.steps-progress-bar');
  const nextBtns = form.querySelectorAll('.btn-next');
  const prevBtns = form.querySelectorAll('.btn-prev');
  const successCard = document.getElementById('admissions-success');
  const formCard = document.getElementById('admissions-form-card');

  let currentStepIndex = 0;

  // Track inputs for live validation
  const inputsStep1 = form.querySelectorAll('#step-1-panel input, #step-1-panel select');
  const inputsStep2 = form.querySelectorAll('#step-2-panel input');
  const inputsStep3 = form.querySelectorAll('#step-3-panel select');

  attachLiveValidation([...inputsStep1, ...inputsStep2, ...inputsStep3]);

  // Update step visual state (nodes & connector bar)
  function updateStepUI() {
    panels.forEach((panel, index) => {
      panel.classList.toggle('active', index === currentStepIndex);
    });

    stepNodes.forEach((node, index) => {
      if (index === currentStepIndex) {
        node.className = 'step-node active';
      } else if (index < currentStepIndex) {
        node.className = 'step-node completed';
      } else {
        node.className = 'step-node';
      }
    });

    const progressPercentage = (currentStepIndex / (panels.length - 1)) * 100;
    progressBar.style.width = `${progressPercentage}%`;
  }

  // Validate all fields inside the current panel
  function validateCurrentStep() {
    const currentPanel = panels[currentStepIndex];
    const inputs = currentPanel.querySelectorAll('input[required], select[required]');
    let isAllValid = true;

    inputs.forEach(input => {
      const isValid = validateField(input);
      if (!isValid) isAllValid = false;
    });

    return isAllValid;
  }

  // Wizard Navigation Action Button Handlers
  nextBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (validateCurrentStep()) {
        currentStepIndex++;
        updateStepUI();
      }
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      currentStepIndex--;
      updateStepUI();
    });
  });

  // Final Form Submission Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) return;

    // Check Turnstile token
    let turnstileToken = '';
    try {
      turnstileToken = turnstile.getResponse();
    } catch(err) {
      console.warn("Turnstile API not loaded, using fallback.");
    }

    if (!turnstileToken) {
      showToast('Please complete the Cloudflare security verification check.', 'info');
      return;
    }

    // Prepare payload
    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });
    payload.captchaToken = turnstileToken;

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Securing Session... <i class="fas fa-spinner fa-spin"></i>';

    try {
      const response = await fetch('/api/admissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest', // CSRF guard — OWASP A01
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Reset and display success
        form.reset();
        formCard.style.display = 'none';
        successCard.style.display = 'block';
        successCard.scrollIntoView({ behavior: 'smooth' });
      } else {
        showToast(result.message || 'Admissions registration failed. Please review your credentials.', 'error');
        // Reset Captcha to enforce fresh challenge on failure
        try { turnstile.reset(); } catch(e) {}
      }
    } catch (error) {
      console.error('[Admissions] Submission error:', error);
      showToast('A network error occurred. Please check your connection and try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

/* ==========================================================================
   6. CONTACT FORM SUBMISSION
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const contactInputs = form.querySelectorAll('input[required], textarea[required]');
  attachLiveValidation(contactInputs);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let isAllValid = true;
    contactInputs.forEach(input => {
      if (!validateField(input)) isAllValid = false;
    });

    if (!isAllValid) return;

    let turnstileToken = '';
    try {
      turnstileToken = turnstile.getResponse();
    } catch (err) {
      console.warn("Turnstile API not loaded, using fallback.");
    }

    if (!turnstileToken) {
      showToast('Please complete the Cloudflare security verification check.', 'info');
      return;
    }

    // Gather payload
    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });
    payload.captchaToken = turnstileToken;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Sending Inquiries... <i class="fas fa-spinner fa-spin"></i>';

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest', // CSRF guard — OWASP A01
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast(result.message, 'success');
        form.reset();
        contactInputs.forEach(input => {
          input.classList.remove('is-valid', 'is-invalid');
        });
        try { turnstile.reset(); } catch(e) {}
      } else {
        showToast(result.message || 'Submission failed. Please try again.', 'error');
        try { turnstile.reset(); } catch(e) {}
      }
    } catch (error) {
      console.error('[Contact] Submission error:', error);
      showToast('A network error occurred. Please try again later.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

/* ==========================================================================
   7. WHATSAPP FLOATING WIDGET
   ========================================================================== */
function initWhatsAppWidget() {
  const waBtn = document.getElementById('whatsapp-widget');
  if (!waBtn) return;

  const phoneNum = '923312058727'; // Official Karachi campus registrar line
  const message = encodeURIComponent("Assalamu Alaikum, I would like to inquire about admissions & campus fees at Uraan Daycare & School.");

  waBtn.addEventListener('click', () => {
    const waUrl = `https://wa.me/${phoneNum}?text=${message}`;
    window.open(waUrl, '_blank');
  });
}
