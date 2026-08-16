/* ============================================================
   QPI — shared site behaviour
   Loaded on every page with <script src="/assets/site.js" defer>
   ============================================================ */

(function () {
  'use strict';

  /* ==============================================================
     1. CONTACT FORM  —  ONE VALUE TO FILL IN
     ==============================================================

     >>> PASTE YOUR APPS SCRIPT WEB APP URL ON THE LINE BELOW. <<<

     The backend is a Google Apps Script running in the QPI Workspace
     account. Source and full deploy instructions:
         backend/apps-script/Code.gs
         backend/apps-script/SETUP.md

     The URL you want ends in /exec and looks like:
         https://script.google.com/macros/s/AKfycb.../exec

     WHILE THIS IS EMPTY the form degrades gracefully: it opens the
     visitor's mail client with the message pre-filled and addressed
     to CONTACT_EMAIL. That is a safety net so the form is never a
     dead end — it is NOT a substitute for a working endpoint, because
     a large share of visitors have no configured mail client.
  ================================================================ */
  var FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwnoEcoe9rEuOI_HwBqngtqi8Xh0oa919UPPmQntiO_Lj24dSFOQaFMruDKUru97sR0jA/exec';

  /**
   * Must match FORM_TOKEN in Code.gs. Obfuscation, not security — it is
   * visible to anyone who reads this file. It stops drive-by bots; the
   * honeypot handles the rest. Change both values together.
   */
  var FORM_TOKEN = 'qpi-web-2026';

  var CONTACT_EMAIL = 'info@qpi-inspect.com';

  /* ----------------------------------------------------------
     2. ANALYTICS HOOK (currently inert)
     ----------------------------------------------------------
     Analytics was deliberately left out of this pass. When you add
     GA4 or Plausible, this one function is the only place that needs
     to change — call sites for form submits and tel: clicks are
     already wired below.

     GA4:       gtag('event', name, params);
     Plausible: window.plausible && window.plausible(name, {props: params});
  --------------------------------------------------------------- */
  function track(name, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params || {});
    }
    if (typeof window.plausible === 'function') {
      window.plausible(name, { props: params || {} });
    }
  }

  /* ---------------------------------------------------------------
     3. Mobile navigation
  --------------------------------------------------------------- */
  function initMobileMenu() {
    var btn = document.getElementById('menu-toggle');
    var menu = document.getElementById('mobile-menu');
    var openIcon = document.getElementById('menu-open-icon');
    var closeIcon = document.getElementById('menu-close-icon');
    if (!btn || !menu) return;

    function setOpen(open) {
      menu.classList.toggle('hidden', !open);
      if (openIcon) openIcon.classList.toggle('hidden', open);
      if (closeIcon) closeIcon.classList.toggle('hidden', !open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    btn.addEventListener('click', function () {
      setOpen(menu.classList.contains('hidden'));
    });

    Array.prototype.forEach.call(menu.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.classList.contains('hidden')) {
        setOpen(false);
        btn.focus();
      }
    });
  }

  /* ---------------------------------------------------------------
     4. Phone-click tracking
  --------------------------------------------------------------- */
  function initPhoneTracking() {
    Array.prototype.forEach.call(
      document.querySelectorAll('a[href^="tel:"]'),
      function (a) {
        a.addEventListener('click', function () {
          track('phone_click', { location: a.dataset.telLocation || 'unknown' });
        });
      }
    );
  }

  /* ---------------------------------------------------------------
     5. Contact form
  --------------------------------------------------------------- */
  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var status = document.getElementById('form-status');
    var submitBtn = form.querySelector('button[type="submit"]');

    function showError(field, message) {
      var box = document.getElementById(field.id + '-error');
      field.setAttribute('aria-invalid', 'true');
      if (box) {
        box.textContent = message;
        box.classList.add('is-visible');
      }
    }

    function clearError(field) {
      var box = document.getElementById(field.id + '-error');
      field.removeAttribute('aria-invalid');
      if (box) {
        box.textContent = '';
        box.classList.remove('is-visible');
      }
    }

    function validate() {
      var ok = true;
      var firstBad = null;

      Array.prototype.forEach.call(
        form.querySelectorAll('[data-required]'),
        function (field) {
          clearError(field);
          var value = (field.value || '').trim();

          if (!value) {
            showError(field, 'This field is required.');
            ok = false;
            if (!firstBad) firstBad = field;
            return;
          }
          if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
            showError(field, 'Enter a valid email address.');
            ok = false;
            if (!firstBad) firstBad = field;
            return;
          }
          if (field.type === 'tel' && value.replace(/\D/g, '').length < 10) {
            showError(field, 'Enter a 10-digit phone number.');
            ok = false;
            if (!firstBad) firstBad = field;
          }
        }
      );

      if (firstBad) firstBad.focus();
      return ok;
    }

    // Clear a field's error as soon as the visitor starts fixing it
    Array.prototype.forEach.call(
      form.querySelectorAll('[data-required]'),
      function (field) {
        field.addEventListener('input', function () {
          if (field.getAttribute('aria-invalid') === 'true') clearError(field);
        });
      }
    );

    function setStatus(message, kind) {
      if (!status) return;
      status.textContent = message;
      status.className =
        'mt-6 text-sm ' +
        (kind === 'error' ? 'text-red-400' : kind === 'success' ? 'text-blue-400' : 'text-slate-400');
    }

    function mailtoFallback(data) {
      var lines = [
        'Name: ' + (data.get('name') || ''),
        'Company: ' + (data.get('company') || ''),
        'Email: ' + (data.get('email') || ''),
        'Phone: ' + (data.get('phone') || ''),
        'Service needed: ' + (data.get('service') || ''),
        'Project location: ' + (data.get('location') || ''),
        '',
        'Details:',
        (data.get('details') || '')
      ];
      window.location.href =
        'mailto:' + CONTACT_EMAIL +
        '?subject=' + encodeURIComponent('Inspection request — ' + (data.get('name') || 'website')) +
        '&body=' + encodeURIComponent(lines.join('\n'));
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Honeypot: a real visitor never fills this in.
      var hp = form.querySelector('input[name="_gotcha"]');
      if (hp && hp.value) return;

      if (!validate()) {
        setStatus('Please correct the highlighted fields.', 'error');
        return;
      }

      var data = new FormData(form);

      // No endpoint configured yet — fall back to the visitor's mail client
      // rather than silently dropping the message.
      if (!FORM_ENDPOINT) {
        setStatus('Opening your email app…', 'info');
        track('form_submit', { method: 'mailto_fallback' });
        mailtoFallback(data);
        return;
      }

      /* Encode as application/x-www-form-urlencoded.
         This is load-bearing, not stylistic:
           - It keeps the POST a CORS "simple request", so the browser skips
             the preflight OPTIONS call. Apps Script cannot answer a preflight,
             so a preflight means the submission fails outright.
           - Apps Script populates e.parameter for urlencoded bodies but NOT
             for multipart/form-data (what FormData would send).
         Do not switch this to JSON or raw FormData. */
      var params = new URLSearchParams();
      data.forEach(function (value, key) {
        params.append(key, value);
      });
      params.append('token', FORM_TOKEN);
      params.append('page', window.location.pathname || '/');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending…';
      }
      setStatus('Sending your request…', 'info');

      fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: params
        // No custom headers on purpose — adding one would trigger a preflight.
      })
        .then(function (res) {
          // Apps Script returns HTTP 200 with {"success": false} for
          // validation failures, so the body must be checked too.
          return res.json().then(function (json) {
            return { ok: res.ok, json: json };
          });
        })
        .then(function (r) {
          if (!r.ok || !r.json || r.json.success !== true) {
            throw new Error((r.json && r.json.message) || 'Submission rejected');
          }
          form.reset();
          setStatus(
            'Thanks — your request is in. We respond to inspection requests within one business day.',
            'success'
          );
          track('form_submit', { method: 'apps_script', result: 'success' });
        })
        .catch(function (err) {
          /* A TypeError here means the browser blocked us from READING the
             response — the POST itself was still delivered, because a simple
             request is sent before any CORS check happens. So the lead very
             likely arrived. Saying "something went wrong" would be wrong, and
             claiming success would be dishonest. Say exactly what we know. */
          var blocked = err instanceof TypeError;

          setStatus(
            blocked
              ? 'Your request was sent, but we could not confirm it. If you have not heard back within one business day, call 901.300.0626.'
              : 'Something went wrong sending that. Please call 901.300.0626 or email ' + CONTACT_EMAIL + '.',
            blocked ? 'info' : 'error'
          );

          if (blocked) form.reset();

          // Surfaced so a misconfigured deployment is diagnosable rather than
          // looking like a random network failure.
          if (window.console && console.warn) {
            console.warn(
              '[QPI contact form] ' + (err && err.message ? err.message : err) +
              (blocked
                ? ' — response unreadable. Usual cause: the Apps Script web app is not deployed with "Who has access: Anyone". See backend/apps-script/SETUP.md.'
                : '')
            );
          }
          track('form_submit', { method: 'apps_script', result: blocked ? 'unconfirmed' : 'error' });
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.originalText || 'Request an inspection';
          }
        });
    });
  }

  function init() {
    initMobileMenu();
    initPhoneTracking();
    initContactForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
