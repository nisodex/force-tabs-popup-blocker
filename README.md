# Force Tabs - Popup Blocker (Chrome Extension MV3 Suite)

Extensión de Google Chrome (**Manifest V3**) que transforma todas las ventanas emergentes (*popups*) creadas vía `window.open` en **pestañas estándar** del navegador, incorporando una interfaz de control con **lista blanca de dominios** y excepciones para flujos de autenticación/pagos (**OAuth**, PayPal, Google, etc.).

---

## ✨ Características

- 🚀 **Apertura Forzada de Pestañas:** Intercepta llamadas a `window.open` en el contexto global (`MAIN world`) eliminando los modificadores de ventana (`width`, `height`, `toolbar=no`, etc.) para abrir pestañas completas.
- 🛡️ **Control por Sitio Web (Lista Blanca):** Excluye o incluye sitios web con un solo clic directamente desde el Popup UI o el menú contextual.
- 🔑 **Protección de Flujos OAuth / Pagos:** Detección y permiso automático de proveedores habituales de inicio de sesión (`accounts.google.com`, `appleid.apple.com`, `paypal.com`, `auth0.com`) para evitar romper ventanas de login emergentes necesarias.
- 🎨 **Interfaz Nativa Chrome:** Popup UI con diseño Material 3 y soporte automático para tema claro y oscuro (*Dark / Light Mode*).

---

## 📁 Estructura del Proyecto

```text
├── manifest.json            # Manifiesto V3 con permisos (storage, tabs, activeTab, contextMenus)
├── background.js           # Service Worker (inicialización, insignias, menús contextuales, métricas)
├── content_bridge.js       # Script en ISOLATED world (sincroniza storage/eventos con la página)
├── content.js              # Script en MAIN world (intercepta window.open nativo)
├── popup/
│   ├── popup.html          # Interfaz de control del usuario
│   ├── popup.css           # Estilos modernos y variables dark/light
│   └── popup.js            # Lógica reactiva y gestión de la lista blanca
├── icons/
│   ├── icon16.png          # Icono 16x16
│   ├── icon48.png          # Icono 48x48
│   └── icon128.png         # Icono 128x128
└── test.html               # Laboratorio de pruebas interactivo
```

---

## 🚀 Instalación en Google Chrome

1. Abre Google Chrome y navega a `chrome://extensions/`.
2. Activa el interruptor **"Modo de desarrollador"** en la esquina superior derecha.
3. Haz clic en **"Cargar descomprimida"** (*Load unpacked*).
4. Selecciona la carpeta de este proyecto:
   `C:\Users\nurib\.gemini\antigravity\worktrees\modest-pasteur\force_tabs_popup_blocker`
5. Abre el archivo [`test.html`](test.html) para probar el funcionamiento.
