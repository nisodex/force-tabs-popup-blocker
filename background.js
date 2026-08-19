/**
 * Force Tabs - Popup Blocker (Manifest V3)
 * Service Worker en segundo plano: inicialización, insignias y menús contextuales.
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  whitelistedDomains: [
    'accounts.google.com',
    'appleid.apple.com',
    'login.microsoftonline.com',
    'paypal.com',
    'auth0.com'
  ],
  allowOAuthPresets: true
};

// Inicialización de valores predeterminados al instalar o actualizar
chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const toInit = {};

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (current[key] === undefined) {
      toInit[key] = value;
    }
  }

  if (Object.keys(toInit).length > 0) {
    await chrome.storage.local.set(toInit);
  }

  // Registrar menú contextual
  try {
    chrome.contextMenus.create({
      id: 'force-tabs-toggle-whitelist',
      title: 'Alternar este dominio en la Lista Blanca',
      contexts: ['action', 'page']
    });
  } catch (_) {
    // Ignorar si ya existe
  }

  await updateAllBadges();
});

// Manejador del menú contextual
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'force-tabs-toggle-whitelist' || !tab || !tab.url) {
    return;
  }

  try {
    const url = new URL(tab.url);
    const domain = url.hostname;
    if (!domain) return;

    const data = await chrome.storage.local.get(['whitelistedDomains']);
    const list = Array.isArray(data.whitelistedDomains) ? [...data.whitelistedDomains] : [];

    const index = list.indexOf(domain);
    if (index >= 0) {
      list.splice(index, 1);
    } else {
      list.push(domain);
    }

    await chrome.storage.local.set({ whitelistedDomains: list });
    await updateBadgeForTab(tab);
  } catch (err) {
    console.error('Error al alternar dominio en lista blanca:', err);
  }
});

// Manejador de mensajes de los scripts de contenido y popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'GET_TAB_DOMAIN_STATUS') {
    handleGetDomainStatus(message.domain).then(sendResponse);
    return true;
  }
});

// Consultar estado de un dominio específico
async function handleGetDomainStatus(domain) {
  if (!domain) return { whitelisted: false, enabled: true };
  const data = await chrome.storage.local.get(['enabled', 'whitelistedDomains']);
  const enabled = data.enabled !== false;
  const list = Array.isArray(data.whitelistedDomains) ? data.whitelistedDomains : [];
  const whitelisted = list.includes(domain);
  return { enabled, whitelisted };
}

// Actualización de insignias visuales (Badge)
async function updateBadgeForTab(tab) {
  if (!tab || !tab.id || !tab.url) return;

  try {
    const data = await chrome.storage.local.get(['enabled', 'whitelistedDomains']);
    if (data.enabled === false) {
      chrome.action.setBadgeText({ tabId: tab.id, text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#5f6368' });
      return;
    }

    const domain = new URL(tab.url).hostname;
    const list = Array.isArray(data.whitelistedDomains) ? data.whitelistedDomains : [];

    if (domain && list.includes(domain)) {
      chrome.action.setBadgeText({ tabId: tab.id, text: 'EXC' });
      chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#e37400' });
    } else {
      chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    }
  } catch (_) {
    chrome.action.setBadgeText({ tabId: tab.id, text: '' });
  }
}

async function updateAllBadges() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    await updateBadgeForTab(tab);
  }
}

// Escuchar cambios en almacenamiento para actualizar badges en tiempo real
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'local' && (changes.enabled || changes.whitelistedDomains)) {
    await updateAllBadges();
  }
});

// Actualizar badge al cambiar de pestaña activa o actualizar URL
chrome.tabs.onActivated.addListener(async activeInfo => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await updateBadgeForTab(tab);
  } catch (_) {}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    await updateBadgeForTab(tab);
  }
});
