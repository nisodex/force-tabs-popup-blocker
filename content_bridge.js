/**
 * Force Tabs - Content Bridge (Manifest V3 - ISOLATED World)
 * Puente entre las APIs de Chrome (chrome.storage, chrome.runtime) y el script en el MAIN world.
 */
(function () {
  'use strict';

  // Evitar ejecuciones duplicadas en el mismo frame
  if (window.__force_tabs_bridge_active__) {
    return;
  }
  window.__force_tabs_bridge_active__ = true;

  const currentHost = window.location.hostname || '';

  const OAUTH_PRESET_DOMAINS = [
    'accounts.google.com',
    'appleid.apple.com',
    'login.microsoftonline.com',
    'paypal.com',
    'auth0.com'
  ];

  /**
   * Determina si la intercepción debe estar activa en este documento.
   * @param {Object} data - Datos almacenados en chrome.storage.local
   * @returns {boolean}
   */
  function shouldBeActive(data) {
    const enabled = data.enabled !== false;
    if (!enabled) return false;

    const whitelist = Array.isArray(data.whitelistedDomains) ? data.whitelistedDomains : [];
    const allowOAuth = data.allowOAuthPresets !== false;

    // Verificar si el dominio actual coincide con la lista blanca
    const inWhitelist = whitelist.some(d => d && (currentHost === d || currentHost.endsWith('.' + d)));
    if (inWhitelist) return false;

    // Verificar si el dominio actual coincide con los presets de OAuth
    if (allowOAuth) {
      const inOAuth = OAUTH_PRESET_DOMAINS.some(d => currentHost === d || currentHost.endsWith('.' + d));
      if (inOAuth) return false;
    }

    return true;
  }

  /**
   * Notifica el estado al contexto MAIN y actualiza el atributo en el DOM.
   * @param {boolean} active
   */
  function syncStateToMain(active) {
    try {
      const root = document.documentElement;
      if (root) {
        root.setAttribute('data-force-tabs-active', active ? 'true' : 'false');
      }
    } catch (_) {}

    window.dispatchEvent(
      new CustomEvent('__FORCE_TABS_CONFIG_UPDATE__', {
        detail: { active }
      })
    );
  }

  // Cargar configuración inicial inmediatamente
  chrome.storage.local.get(['enabled', 'whitelistedDomains', 'allowOAuthPresets'], data => {
    const active = shouldBeActive(data);
    syncStateToMain(active);
  });

  // Escuchar cambios de configuración en tiempo real (ej. desde el Popup UI)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      chrome.storage.local.get(['enabled', 'whitelistedDomains', 'allowOAuthPresets'], data => {
        const active = shouldBeActive(data);
        syncStateToMain(active);
      });
    }
  });

})();
