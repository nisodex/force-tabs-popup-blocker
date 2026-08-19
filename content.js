/**
 * Force Tabs - Main Interceptor (Manifest V3 - MAIN World)
 * Intercepta llamadas a window.open en el contexto nativo de la página,
 * respetando el estado de activación y la lista blanca provista por content_bridge.js.
 */
(function () {
  'use strict';

  if (window.__force_tabs_main_injected__) {
    return;
  }
  window.__force_tabs_main_injected__ = true;

  const originalOpen = window.open;
  if (typeof originalOpen !== 'function') {
    return;
  }

  // Estado interno de activación (por defecto true hasta sincronización)
  let isEnabledForPage = true;

  // Sincronizar desde atributo DOM inicial si ya existe
  if (document.documentElement) {
    const attr = document.documentElement.getAttribute('data-force-tabs-active');
    if (attr !== null) {
      isEnabledForPage = attr === 'true';
    }
  }

  // Escuchar eventos de sincronización provenientes de content_bridge.js
  window.addEventListener('__FORCE_TABS_CONFIG_UPDATE__', event => {
    if (event.detail && typeof event.detail.active === 'boolean') {
      isEnabledForPage = event.detail.active;
    }
  });

  /**
   * Reemplazo controlado de window.open
   */
  const patchedOpen = function (url, target, windowFeatures) {
    // Si la extensión está desactivada o el dominio está excluido (lista blanca), ejecutar normalmente
    if (!isEnabledForPage) {
      return originalOpen.apply(this || window, arguments);
    }

    const resolvedTarget = target !== undefined && target !== '' ? target : '_blank';

    // Omitir windowFeatures para que el navegador cree una pestaña en lugar de una ventana emergente
    return originalOpen.call(this || window, url, resolvedTarget);
  };

  // Preservar metadatos de la función nativa
  try {
    Object.defineProperty(patchedOpen, 'name', { value: 'open', configurable: true });
    Object.defineProperty(patchedOpen, 'length', { value: originalOpen.length, configurable: true });
  } catch (_) {}

  try {
    Object.defineProperty(window, 'open', {
      value: patchedOpen,
      writable: true,
      configurable: true,
      enumerable: true
    });
  } catch (_) {
    window.open = patchedOpen;
  }
})();
