/**
 * Force Tabs - Popup Controller
 * Lógica reactiva para la interfaz de configuración de la extensión.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elementos del DOM
  const globalToggle = document.getElementById('globalToggle');
  const masterStatusText = document.getElementById('masterStatusText');
  const currentDomainEl = document.getElementById('currentDomain');
  const siteBadgeEl = document.getElementById('siteBadge');
  const toggleCurrentSiteBtn = document.getElementById('toggleCurrentSiteBtn');
  const toggleSiteBtnText = document.getElementById('toggleSiteBtnText');
  const oauthToggle = document.getElementById('oauthToggle');
  const whitelistCountEl = document.getElementById('whitelistCount');
  const addDomainForm = document.getElementById('addDomainForm');
  const domainInput = document.getElementById('domainInput');
  const whitelistUl = document.getElementById('whitelistUl');

  let currentTabDomain = '';

  /**
   * Normaliza una URL o string a nombre de dominio limpio
   */
  function sanitizeDomain(input) {
    if (!input) return '';
    let cleaned = input.trim().toLowerCase();
    try {
      if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
        cleaned = 'https://' + cleaned;
      }
      const url = new URL(cleaned);
      return url.hostname;
    } catch (_) {
      return input.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split('/')[0];
    }
  }

  /**
   * Obtiene la pestaña activa y su dominio
   */
  async function resolveCurrentTabDomain() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
          currentTabDomain = 'Página interna de Chrome';
        } else {
          const url = new URL(tab.url);
          currentTabDomain = url.hostname;
        }
      } else {
        currentTabDomain = 'Desconocido';
      }
    } catch (_) {
      currentTabDomain = 'Desconocido';
    }
    currentDomainEl.textContent = currentTabDomain;
  }

  /**
   * Renderiza el estado completo de la interfaz
   */
  async function renderState() {
    const data = await chrome.storage.local.get([
      'enabled',
      'whitelistedDomains',
      'allowOAuthPresets'
    ]);

    const isGlobalEnabled = data.enabled !== false;
    const whitelistedDomains = Array.isArray(data.whitelistedDomains) ? data.whitelistedDomains : [];
    const allowOAuth = data.allowOAuthPresets !== false;

    // 1. Estado Global
    globalToggle.checked = isGlobalEnabled;
    masterStatusText.textContent = isGlobalEnabled ? 'Activada' : 'Desactivada';
    masterStatusText.className = 'status-indicator ' + (isGlobalEnabled ? 'active' : 'disabled');

    // 2. OAuth Toggle
    oauthToggle.checked = allowOAuth;

    // 4. Estado del Sitio Actual
    const isDomainValid = currentTabDomain && !currentTabDomain.includes(' ') && currentTabDomain !== 'Desconocido';
    const isWhitelisted = isDomainValid && whitelistedDomains.includes(currentTabDomain);

    if (!isDomainValid) {
      siteBadgeEl.textContent = 'No aplicable';
      siteBadgeEl.className = 'badge badge-warning';
      toggleCurrentSiteBtn.disabled = true;
      toggleSiteBtnText.textContent = 'No disponible';
    } else if (!isGlobalEnabled) {
      siteBadgeEl.textContent = 'Pausado';
      siteBadgeEl.className = 'badge badge-warning';
      toggleCurrentSiteBtn.disabled = true;
      toggleSiteBtnText.textContent = 'Extensión desactivada';
    } else if (isWhitelisted) {
      siteBadgeEl.textContent = 'Excluido (Popups permitidos)';
      siteBadgeEl.className = 'badge badge-warning';
      toggleCurrentSiteBtn.disabled = false;
      toggleSiteBtnText.textContent = 'Volver a proteger este sitio';
    } else {
      siteBadgeEl.textContent = 'Protegido (Pestañas forzadas)';
      siteBadgeEl.className = 'badge badge-active';
      toggleCurrentSiteBtn.disabled = false;
      toggleSiteBtnText.textContent = 'Excluir este sitio';
    }

    // 5. Lista Blanca
    whitelistCountEl.textContent = whitelistedDomains.length;
    whitelistUl.innerHTML = '';

    if (whitelistedDomains.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'empty-state';
      emptyLi.textContent = 'No hay dominios excluidos manualmente.';
      whitelistUl.appendChild(emptyLi);
    } else {
      whitelistedDomains.forEach(domain => {
        const li = document.createElement('li');
        li.className = 'whitelist-item';

        const span = document.createElement('span');
        span.textContent = domain;
        span.title = domain;

        const delBtn = document.createElement('button');
        delBtn.className = 'btn-icon-delete';
        delBtn.innerHTML = '✕';
        delBtn.title = `Eliminar ${domain}`;
        delBtn.addEventListener('click', () => removeDomain(domain));

        li.appendChild(span);
        li.appendChild(delBtn);
        whitelistUl.appendChild(li);
      });
    }
  }

  /**
   * Eliminar un dominio de la lista blanca
   */
  async function removeDomain(domain) {
    const data = await chrome.storage.local.get(['whitelistedDomains']);
    const list = Array.isArray(data.whitelistedDomains) ? data.whitelistedDomains : [];
    const updated = list.filter(d => d !== domain);
    await chrome.storage.local.set({ whitelistedDomains: updated });
    await renderState();
  }

  /**
   * Añadir un dominio a la lista blanca
   */
  async function addDomain(domain) {
    const clean = sanitizeDomain(domain);
    if (!clean) return;

    const data = await chrome.storage.local.get(['whitelistedDomains']);
    const list = Array.isArray(data.whitelistedDomains) ? [...data.whitelistedDomains] : [];

    if (!list.includes(clean)) {
      list.push(clean);
      await chrome.storage.local.set({ whitelistedDomains: list });
    }
    await renderState();
  }

  // Event Listeners
  globalToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ enabled: globalToggle.checked });
    await renderState();
  });

  oauthToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ allowOAuthPresets: oauthToggle.checked });
    await renderState();
  });

  toggleCurrentSiteBtn.addEventListener('click', async () => {
    if (!currentTabDomain || currentTabDomain.includes(' ')) return;
    const data = await chrome.storage.local.get(['whitelistedDomains']);
    const list = Array.isArray(data.whitelistedDomains) ? [...data.whitelistedDomains] : [];

    const idx = list.indexOf(currentTabDomain);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(currentTabDomain);
    }

    await chrome.storage.local.set({ whitelistedDomains: list });
    await renderState();
  });

  addDomainForm.addEventListener('submit', async event => {
    event.preventDefault();
    const val = domainInput.value;
    if (val) {
      await addDomain(val);
      domainInput.value = '';
    }
  });

  // Escuchar cambios en storage
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      renderState();
    }
  });

  // Inicialización
  await resolveCurrentTabDomain();
  await renderState();
});
