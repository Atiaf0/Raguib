/**
 * ====================================================================
 * RAQUIB TELEMETRY - FULL WEB & CONTROL CENTER INTERACTION ENGINE (v2.0)
 * ====================================================================
 */

/**
 * Cryptographically secure pseudo-random number generator (CSPRNG).
 */
function secureRandom() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1);
}

// ------------------------------------------------------------------
// Module-level state (shared between DOMContentLoaded sections)
// ------------------------------------------------------------------
const API_BASE = 'https://raquib-api.alghzwanyk7.workers.dev';
const TOKEN_KEY = 'raquib_jwt_token';
const USER_KEY = 'raquib_user_profile';

// GIS / map state
let gisMap = null;
let truckMarker1002 = null;
let truckPathIndex = 0;
let truckInterpolateStep = 0;

// HUD telemetry state
let currentTemp = 4.2;
let currentHumidity = 45;
let isSimulatedAlert = false;

// Escalation timer state
let escalationSeconds = 462; // 07:42
let isTimerRunning = true;
let escalationTimerInterval = null;

// Real Saudi Highway Waypoints (Jazan -> Abu Arish -> Abha -> Khamis Mushait -> Riyadh)
const waypointsJazanToRiyadh = [
  { lat: 16.8892, lng: 42.5706, name: 'ميناء جازان (نقطة الانطلاق)', speed: 0 },
  { lat: 17.0200, lng: 42.7500, name: 'طريق جازان السريع', speed: 65 },
  { lat: 17.0500, lng: 42.8600, name: 'محافظة أبو عريش', speed: 60 },
  { lat: 17.2000, lng: 42.7000, name: 'طريق صبيا - الدرب', speed: 75 },
  { lat: 17.7200, lng: 42.2500, name: 'محافظة الدرب', speed: 70 },
  { lat: 18.1500, lng: 42.3800, name: 'عقبة ضلع (منطقة عسير)', speed: 45 },
  { lat: 18.2164, lng: 42.5053, name: 'مدينة أبها', speed: 55 },
  { lat: 18.3000, lng: 42.7333, name: 'خميس مشيط (مركز التوزيع المركزي)', speed: 50 },
  { lat: 19.5500, lng: 43.5000, name: 'طريق تثليث السريع', speed: 85 },
  { lat: 20.4500, lng: 44.8000, name: 'وادي الدواسر', speed: 80 },
  { lat: 22.0000, lng: 45.8000, name: 'طريق الرياض الجنوبي', speed: 90 },
  { lat: 24.1500, lng: 47.3000, name: 'محافظة الخرج', speed: 85 },
  { lat: 24.7136, lng: 46.6753, name: 'مستودع الرياض المركزي (الوجهة النهائية)', speed: 0 }
];

// Lazily-resolved DOM refs used by module-level functions
function getEl(id) { return document.getElementById(id); }
function setElText(id, text) {
  const el = getEl(id);
  if (el) el.textContent = text;
}

// ------------------------------------------------------------------
// 1. SPA View Router
// ------------------------------------------------------------------
function switchView(viewName, scroll = true) {
  const homeView = getEl('homeView');
  const controlCenterView = getEl('controlCenterView');
  const navHomeLink = getEl('navHomeLink');
  const isDashboard = viewName === 'controlCenter' || viewName === 'dashboard';

  if (homeView) homeView.classList.toggle('active', !isDashboard);
  if (controlCenterView) controlCenterView.classList.toggle('active', isDashboard);
  if (navHomeLink) navHomeLink.classList.toggle('active', !isDashboard);

  if (isDashboard) {
    loadDashboardState();
    setTimeout(() => initOrUpdateGisMap(), 200);
  }
  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ------------------------------------------------------------------
// 4. HUD Telemetry
// ------------------------------------------------------------------
function updateHudValues() {
  const heroLiveTemp = getEl('heroLiveTemp');
  const heroLiveHumidity = getEl('heroLiveHumidity');
  const heroTempBar = getEl('heroTempBar');
  if (!heroLiveTemp || isSimulatedAlert) return;

  const delta = (secureRandom() - 0.5) * 0.2;
  currentTemp = Math.round((currentTemp + delta) * 10) / 10;
  if (currentTemp < 3.8) currentTemp = 3.9;
  if (currentTemp > 4.5) currentTemp = 4.4;

  heroLiveTemp.textContent = currentTemp.toFixed(1);
  if (heroLiveHumidity) {
    currentHumidity = Math.floor(44 + secureRandom() * 3);
    heroLiveHumidity.textContent = currentHumidity;
  }

  const pct = Math.min(100, Math.max(10, ((currentTemp - 2) / 6) * 100));
  if (heroTempBar) {
    heroTempBar.style.width = `${pct}%`;
    heroTempBar.style.background = 'linear-gradient(90deg, var(--signal-radar), var(--signal-safe))';
  }
}

function toggleSimulatedWarning() {
  const btnSimulateWarning = getEl('btnSimulateTempWarning');
  const heroLiveTemp = getEl('heroLiveTemp');
  const heroTempBar = getEl('heroTempBar');

  isSimulatedAlert = !isSimulatedAlert;

  if (isSimulatedAlert) {
    currentTemp = 11.2;
    if (heroLiveTemp) {
      heroLiveTemp.textContent = currentTemp.toFixed(1);
      heroLiveTemp.classList.add('text-crimson');
    }
    if (heroTempBar) {
      heroTempBar.style.width = '100%';
      heroTempBar.style.background = 'linear-gradient(90deg, #FFB800, #FF0055)';
    }
    if (btnSimulateWarning) {
      btnSimulateWarning.textContent = '🔄 إعادة ضبط القراءة';
    }
  } else {
    currentTemp = 4.2;
    if (heroLiveTemp) {
      heroLiveTemp.textContent = currentTemp.toFixed(1);
      heroLiveTemp.classList.remove('text-crimson');
    }
    if (btnSimulateWarning) {
      btnSimulateWarning.textContent = '⚡ محاكاة قراءة';
    }
    updateHudValues();
  }
}

// ------------------------------------------------------------------
// 5. Authentication Engine
// ------------------------------------------------------------------
function setLoginPendingState(isPending) {
  const loginSpinner = getEl('loginSpinner');
  const loginBtnText = getEl('loginBtnText');
  const loginError = getEl('loginError');

  if (loginSpinner) {
    loginSpinner.style.display = isPending ? 'inline-block' : 'none';
  }
  if (loginBtnText) {
    loginBtnText.textContent = isPending
      ? 'جاري التحقق والاتصال...'
      : 'تسجيل الدخول وفتح مركز العمليات 🚀';
  }
  if (isPending && loginError) {
    loginError.style.display = 'none';
  }
}

function showLoginError(message) {
  const loginError = getEl('loginError');
  const loginErrorText = getEl('loginErrorText');
  if (!loginError) return;

  loginError.style.display = 'flex';
  if (loginErrorText) {
    loginErrorText.textContent = message || 'حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً.';
  }
}

async function loginWithBarcode(barcode) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ barcode })
  });

  const data = await response.json();
  if (!response.ok || !data.success || !data.token) {
    throw new Error(data.error || 'رمز الموظف غير مسجل');
  }

  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));

  const loginBtnText = getEl('loginBtnText');
  if (loginBtnText) loginBtnText.textContent = '✓ تم التحقق بنجاح!';
  switchView('controlCenter');
}

async function handleLoginFormSubmit(e) {
  e.preventDefault();
  const employeeBarcode = getEl('employeeBarcode');
  const barcode = employeeBarcode?.value?.trim();
  if (!barcode) return;

  setLoginPendingState(true);
  try {
    await loginWithBarcode(barcode);
  } catch (err) {
    showLoginError(err.message);
  } finally {
    setLoginPendingState(false);
  }
}

// ------------------------------------------------------------------
// 6. Dashboard State Loader
// ------------------------------------------------------------------
function updateSyncTimestamp() {
  const dashLastSyncTime = getEl('dashLastSyncTime');
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (dashLastSyncTime) dashLastSyncTime.textContent = timeStr;
}

async function loadDashboardState() {
  const dashUserName = getEl('dashUserName');
  const dashUserRole = getEl('dashUserRole');
  const storedUser = localStorage.getItem(USER_KEY);
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (dashUserName) dashUserName.textContent = user.name || 'محمد العتيبي';
      if (dashUserRole) dashUserRole.textContent = `مسؤول العمليات (${user.id || 'USR-101'})`;
    } catch (e) {
      console.error('Error parsing stored user:', e);
    }
  }

  updateSyncTimestamp();
  initQualityTimestamp();

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || token === 'demo_session_token_123') return;

  try {
    const res = await fetch(`${API_BASE}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const dashData = await res.json();
    if (!dashData.stats) return;
    const elTotal = getEl('dashTotalShipments');
    const elAlerts = getEl('dashActiveAlerts');
    if (elTotal) elTotal.textContent = dashData.stats.totalMonitored || 128;
    if (elAlerts) elAlerts.textContent = String(dashData.stats.activeAlerts).padStart(2, '0');
  } catch (err) {
    console.warn('Using local fallback telemetry metrics:', err);
  }
}

// ------------------------------------------------------------------
// 7. Escalation Timer
// ------------------------------------------------------------------
function runEscalationTimer() {
  const escalationLiveTimer = getEl('escalationLiveTimer');
  clearInterval(escalationTimerInterval);
  escalationTimerInterval = setInterval(() => {
    if (!isTimerRunning) return;
    escalationSeconds++;
    const mins = String(Math.floor(escalationSeconds / 60)).padStart(2, '0');
    const secs = String(escalationSeconds % 60).padStart(2, '0');
    if (escalationLiveTimer) escalationLiveTimer.textContent = `${mins}:${secs}`;
  }, 1000);
}

// ------------------------------------------------------------------
// 8. Quality Timestamp
// ------------------------------------------------------------------
function initQualityTimestamp() {
  const qaTimestamp = getEl('qaTimestamp');
  if (!qaTimestamp) return;
  const now = new Date();
  qaTimestamp.value = `${now.toLocaleDateString('ar-SA')} - ${now.toLocaleTimeString('ar-SA')}`;
}

// ------------------------------------------------------------------
// 9. GIS Map Helpers
// ------------------------------------------------------------------
function updateInspectionDrawer(info) {
  const drawerTruckTitle  = getEl('drawerTruckTitle');
  const drawerStatusBadge = getEl('drawerStatusBadge');
  const drawerDriverName  = getEl('drawerDriverName');
  const drawerTemp        = getEl('drawerTemp');
  const drawerHumidity    = getEl('drawerHumidity');
  const drawerSpeed       = getEl('drawerSpeed');
  const drawerLocation    = getEl('drawerLocation');
  const drawerGpsCoords   = getEl('drawerGpsCoords');
  const drawerEta         = getEl('drawerEta');

  if (drawerTruckTitle) drawerTruckTitle.textContent = info.title || 'تفاصيل الشاحنة';
  if (drawerStatusBadge) {
    drawerStatusBadge.textContent = info.status || 'في الطريق';
    drawerStatusBadge.className = `badge-tag-${info.badgeColor || 'amber'}`;
  }
  if (drawerDriverName) drawerDriverName.textContent = info.driver || 'أحمد السعيد';
  if (drawerTemp) {
    drawerTemp.textContent = `${info.temp}°C (${info.tempState || 'مستقر'})`;
    drawerTemp.className = `tabular-mono text-${info.tempColor || 'white'}`;
  }
  if (drawerHumidity) drawerHumidity.textContent = `${info.humidity || 45}%`;
  if (drawerSpeed) drawerSpeed.textContent = `${info.speed || 65} كم/س`;
  if (drawerLocation) drawerLocation.textContent = info.location || 'طريق جازان';
  if (drawerGpsCoords) drawerGpsCoords.textContent = `${info.lat.toFixed(4)}° N, ${info.lng.toFixed(4)}° E`;
  if (drawerEta) drawerEta.textContent = info.eta || '14:35 (مستودع الرياض)';
}

function createCustomTruckIcon(emoji, statusClass) {
  return L.divIcon({
    className: `truck-gis-marker ${statusClass}`,
    html: `
      <div class="marker-radar-ring"></div>
      <div class="truck-marker-inner">${emoji}</div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22]
  });
}

function startTruckLiveMovement() {
  const drawerGpsCoords = getEl('drawerGpsCoords');
  const drawerLocation  = getEl('drawerLocation');
  const drawerSpeed     = getEl('drawerSpeed');
  truckPathIndex = 2;
  truckInterpolateStep = 0;

  setInterval(() => {
    if (!gisMap || !truckMarker1002) return;
    const p1 = waypointsJazanToRiyadh[truckPathIndex];
    const nextIdx = (truckPathIndex + 1) % waypointsJazanToRiyadh.length;
    const p2 = waypointsJazanToRiyadh[nextIdx];

    truckInterpolateStep += 0.05;
    if (truckInterpolateStep >= 1) {
      truckInterpolateStep = 0;
      truckPathIndex = nextIdx;
    }

    const currentLat = p1.lat + (p2.lat - p1.lat) * truckInterpolateStep;
    const currentLng = p1.lng + (p2.lng - p1.lng) * truckInterpolateStep;
    truckMarker1002.setLatLng([currentLat, currentLng]);

    if (drawerGpsCoords) drawerGpsCoords.textContent = `${currentLat.toFixed(4)}° N, ${currentLng.toFixed(4)}° E`;
    if (drawerLocation)  drawerLocation.textContent  = p1.name;
    if (drawerSpeed) {
      const jitter = Math.floor(secureRandom() * 4) - 2;
      drawerSpeed.textContent = `${Math.max(40, p1.speed + jitter)} كم/س`;
    }
  }, 1500);
}

function initOrUpdateGisMap() {
  const mapContainer = getEl('gisLiveMap');
  if (!mapContainer || typeof L === 'undefined') return;

  if (gisMap) { gisMap.invalidateSize(); return; }

  gisMap = L.map('gisLiveMap', { center: [20.5, 44.5], zoom: 6, zoomControl: true, attributionControl: false });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18, subdomains: 'abcd'
  }).addTo(gisMap);

  const latlngs = waypointsJazanToRiyadh.map(wp => [wp.lat, wp.lng]);
  L.polyline(latlngs, { color: '#00F0FF', weight: 6, opacity: 0.35, lineCap: 'round', lineJoin: 'round' }).addTo(gisMap);
  L.polyline(latlngs, { color: '#00FF66', weight: 3, dashArray: '8, 8', opacity: 0.9 }).addTo(gisMap);

  const hubs = [
    { lat: 16.8892, lng: 42.5706, name: 'ميناء ومستودع جازان للتبريد', role: 'نقطة الانطلاق البحرية' },
    { lat: 18.3000, lng: 42.7333, name: 'مركز التوزيع اللوجستي (عسير)', role: 'محطة الفحص المرحلي' },
    { lat: 24.7136, lng: 46.6753, name: 'المستودع الرئيسي (الرياض)', role: 'مركز القيادة والفرز' }
  ];
  hubs.forEach(hub => {
    const hubIcon = L.divIcon({ className: 'hub-gis-marker', html: `<div class="hub-marker-inner">🏢</div>`, iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18] });
    L.marker([hub.lat, hub.lng], { icon: hubIcon }).addTo(gisMap).bindPopup(`
      <div class="map-custom-popup">
        <div class="map-popup-header"><strong>🏢 ${hub.name}</strong></div>
        <div class="map-popup-grid">
          <div><span>الدور:</span> <strong class="text-cyan">${hub.role}</strong></div>
          <div><span>حالة التبريد:</span> <strong class="text-emerald">✓ آمن ومطابق</strong></div>
        </div>
      </div>
    `);
  });

  _addStaticTrucks();

  const startCoord = waypointsJazanToRiyadh[2];
  truckMarker1002 = L.marker([startCoord.lat, startCoord.lng], { icon: createCustomTruckIcon('🚚', 'truck-warn') }).addTo(gisMap);
  truckMarker1002.bindPopup(`
    <div class="map-custom-popup">
      <div class="map-popup-header">
        <strong>🚚 شاحنة #RQ-1002 (مباشر)</strong>
        <span class="badge-tag-amber">6.2°C ⚠️</span>
      </div>
      <div class="map-popup-grid">
        <div><span>السائق:</span> <strong>أحمد السعيد</strong></div>
        <div><span>السرعة:</span> <strong class="text-white tabular-mono" id="popSpeed">65 كم/س</strong></div>
        <div><span>الحرارة:</span> <strong class="text-amber tabular-mono">6.2°C</strong></div>
        <div><span>الموقع:</span> <strong class="text-cyan" id="popLoc">طريق عسير</strong></div>
      </div>
    </div>
  `);
  truckMarker1002.on('click', () => {
    const curPos = truckMarker1002.getLatLng();
    updateInspectionDrawer({
      title: 'تفاصيل الشاحنة #RQ-1002', status: 'في الطريق (In Transit)', badgeColor: 'amber',
      driver: 'أحمد السعيد', temp: 6.2, tempState: 'تجاوز طفيف مسموح', tempColor: 'amber',
      humidity: 48, speed: 65, location: 'طريق جازان - عسير السريع',
      lat: curPos.lat, lng: curPos.lng, eta: '14:35 (مستودع الرياض)'
    });
  });

  startTruckLiveMovement();
}

function _addStaticTrucks() {
  const truck1 = L.marker([16.8892, 42.5706], { icon: createCustomTruckIcon('🚚', 'truck-safe') }).addTo(gisMap);
  truck1.bindPopup(`
    <div class="map-custom-popup">
      <div class="map-popup-header"><strong>🚚 شاحنة #RQ-1001 (جازان)</strong><span class="badge-tag-emerald">Safe</span></div>
      <div class="map-popup-grid">
        <div><span>السائق:</span> <strong>خالد المالكي</strong></div>
        <div><span>الحرارة:</span> <strong class="text-emerald tabular-mono">4.0°C</strong></div>
        <div><span>الحالة:</span> <strong class="text-emerald">مستقرة وجاهزة</strong></div>
      </div>
    </div>
  `);
  truck1.on('click', () => updateInspectionDrawer({
    title: 'تفاصيل الشاحنة #RQ-1001', status: 'في محطة جازان (Idle)', badgeColor: 'emerald',
    driver: 'خالد المالكي', temp: 4.0, tempState: 'مثالي', tempColor: 'emerald',
    humidity: 44, speed: 0, location: 'ميناء جازان للتبريد',
    lat: 16.8892, lng: 42.5706, eta: '10:00 (جاهز للتحرك)'
  }));

  const truck3 = L.marker([18.3000, 42.7333], { icon: createCustomTruckIcon('🚚', 'truck-safe') }).addTo(gisMap);
  truck3.bindPopup(`
    <div class="map-custom-popup">
      <div class="map-popup-header"><strong>🚚 شاحنة #RQ-1003 (خميس مشيط)</strong><span class="badge-tag-emerald">Safe</span></div>
      <div class="map-popup-grid">
        <div><span>السائق:</span> <strong>سلطان الغامدي</strong></div>
        <div><span>الحرارة:</span> <strong class="text-emerald tabular-mono">3.8°C</strong></div>
        <div><span>الموقع:</span> <strong>مستودع عسير</strong></div>
      </div>
    </div>
  `);
  truck3.on('click', () => updateInspectionDrawer({
    title: 'تفاصيل الشاحنة #RQ-1003', status: 'تفريغ البضاعة (Unloading)', badgeColor: 'emerald',
    driver: 'سلطان الغامدي', temp: 3.8, tempState: 'مطابق', tempColor: 'emerald',
    humidity: 46, speed: 0, location: 'مستودع خميس مشيط',
    lat: 18.3000, lng: 42.7333, eta: 'مكتمل الوصول ✓'
  }));

  const truck4 = L.marker([23.8500, 46.8000], { icon: createCustomTruckIcon('🚚', 'truck-danger') }).addTo(gisMap);
  truck4.bindPopup(`
    <div class="map-custom-popup">
      <div class="map-popup-header"><strong>🚚 شاحنة #RQ-1004 (تجاوز حراري) 🚨</strong><span class="badge-tag-crimson">Critical</span></div>
      <div class="map-popup-grid">
        <div><span>السائق:</span> <strong>فهد الدوسري</strong></div>
        <div><span>الحرارة:</span> <strong class="text-crimson tabular-mono">11.2°C</strong></div>
        <div><span>الإجراء:</span> <strong class="text-crimson">توجيه لوحدة تبريد طارئة</strong></div>
      </div>
    </div>
  `);
  truck4.on('click', () => updateInspectionDrawer({
    title: 'تفاصيل الشاحنة #RQ-1004', status: 'تجاوز حراري حرج (Critical)', badgeColor: 'crimson',
    driver: 'فهد الدوسري', temp: 11.2, tempState: 'تجاوز حرج', tempColor: 'crimson',
    humidity: 56, speed: 85, location: 'طريق الخرج - الرياض',
    lat: 23.8500, lng: 46.8000, eta: '13:10 (استقبال طوارئ)'
  }));
}

// ------------------------------------------------------------------
// 1. Navigation & View Routing Init
// ------------------------------------------------------------------
function initNavigationEvents() {
  const navOpenDashboardBtn = getEl('navOpenDashboardBtn');
  const heroControlCenterBtn = getEl('heroControlCenterBtn');
  const footerDashboardLink = getEl('footerDashboardLink');
  const btnBackToHome = getEl('btnBackToHome');
  const brandHomeLink = getEl('brandHomeLink');
  const navHomeLink = getEl('navHomeLink');
  const footerHomeLink = getEl('footerHomeLink');
  const btnDashLogout = getEl('btnDashLogout');

  if (navOpenDashboardBtn) navOpenDashboardBtn.addEventListener('click', () => switchView('controlCenter'));
  if (heroControlCenterBtn) heroControlCenterBtn.addEventListener('click', () => switchView('controlCenter'));
  if (footerDashboardLink) {
    footerDashboardLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('controlCenter');
    });
  }
  if (btnBackToHome) btnBackToHome.addEventListener('click', () => switchView('home'));
  if (brandHomeLink) {
    brandHomeLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('home');
    });
  }
  if (navHomeLink) {
    navHomeLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('home');
    });
  }
  if (footerHomeLink) {
    footerHomeLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('home');
    });
  }
  if (btnDashLogout) {
    btnDashLogout.addEventListener('click', () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      switchView('home');
    });
  }
}

// ------------------------------------------------------------------
// 2. Mobile Navigation Drawer System
// ------------------------------------------------------------------
function initMobileMenu() {
  const toggleBtn = getEl('mobileMenuToggle');
  const navLinks = getEl('navLinks');
  const backdrop = getEl('mobileNavBackdrop');

  if (!toggleBtn || !navLinks) return;

  function closeMenu() {
    toggleBtn.classList.remove('active');
    toggleBtn.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  function openMenu() {
    toggleBtn.classList.add('active');
    toggleBtn.setAttribute('aria-expanded', 'true');
    navLinks.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = navLinks.classList.contains('open');
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  if (backdrop) {
    backdrop.addEventListener('click', closeMenu);
  }

  // Close drawer when clicking any nav link or CTA inside it
  navLinks.querySelectorAll('a, button').forEach((item) => {
    item.addEventListener('click', () => {
      closeMenu();
    });
  });

  // Auto-close on resize to desktop & invalidate GIS map layout
  window.addEventListener('resize', () => {
    if (window.innerWidth > 992 && navLinks.classList.contains('open')) {
      closeMenu();
    }
    if (gisMap && typeof gisMap.invalidateSize === 'function') {
      gisMap.invalidateSize();
    }
  });
}

// ------------------------------------------------------------------
// 3. Hardware Rental Filter Tabs
// ------------------------------------------------------------------
function initHardwareFilters() {
  const hardwareTabs = document.querySelectorAll('.hardware-tabs .tab-pill');
  const hardwareCards = document.querySelectorAll('.hardware-cards-grid .hardware-card');

  hardwareTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      hardwareTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.dataset.filter || 'all';
      hardwareCards.forEach((card) => {
        const category = card.dataset.category;
        card.style.display = (filter === 'all' || category === filter) ? 'flex' : 'none';
      });
    });
  });
}

// ------------------------------------------------------------------
// 4. Holographic HUD Live Telemetry Simulator
// ------------------------------------------------------------------
function initHudSimulator() {
  const btnSimulateWarning = getEl('btnSimulateTempWarning');
  setInterval(updateHudValues, 3000);
  if (btnSimulateWarning) {
    btnSimulateWarning.addEventListener('click', toggleSimulatedWarning);
  }
}

// ------------------------------------------------------------------
// 5. Authentication & Login Form Logic
// ------------------------------------------------------------------
function initAuthForms() {
  const loginForm = getEl('loginForm');
  const useDemoData = getEl('useDemoData');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginFormSubmit);
  }

  if (useDemoData) {
    useDemoData.addEventListener('click', () => {
      const demoUser = {
        id: 'USR-101',
        name: 'محمد العتيبي',
        name_en: 'Mohammed Al-Otaibi',
        role: 'worker'
      };
      localStorage.setItem(TOKEN_KEY, 'demo_session_token_123');
      localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
      switchView('controlCenter');
    });
  }
}

// ------------------------------------------------------------------
// 6. Control Center Live Data Engine
// ------------------------------------------------------------------
function initDashboardControls() {
  const btnRefreshDashboard = getEl('btnRefreshDashboard');
  if (!btnRefreshDashboard) return;

  btnRefreshDashboard.addEventListener('click', () => {
    btnRefreshDashboard.textContent = 'جاري التحديث...';
    setTimeout(() => {
      loadDashboardState();
      btnRefreshDashboard.textContent = '🔄 تم التحديث بنجاح';
      setTimeout(() => {
        btnRefreshDashboard.textContent = '🔄 تحديث البيانات الحية';
      }, 1500);
    }, 600);
  });
}

// ------------------------------------------------------------------
// 7. Incident Escalation Timer
// ------------------------------------------------------------------
function initEscalationControls() {
  const toggleEscalationTimerBtn = getEl('toggleEscalationTimerBtn');
  const timerPausePlayIcon = getEl('timerPausePlayIcon');

  if (toggleEscalationTimerBtn) {
    toggleEscalationTimerBtn.addEventListener('click', () => {
      isTimerRunning = !isTimerRunning;
      if (timerPausePlayIcon) timerPausePlayIcon.textContent = isTimerRunning ? '⏸' : '▶';
    });
  }

  runEscalationTimer();
}

// ------------------------------------------------------------------
// 8. Quality Policy & Sign-off Approval Form Logic
// ------------------------------------------------------------------
function initQualityApprovalForm() {
  const qualityApprovalForm = getEl('qualityApprovalForm');
  const qaDecisionReason = getEl('qaDecisionReason');
  const qaCustomReason = getEl('qaCustomReason');
  const qaSuccessAlert = getEl('qaSuccessAlert');
  const qaBtnSpinner = getEl('qaBtnSpinner');
  const qaBtnText = getEl('qaBtnText');

  if (qaDecisionReason && qaCustomReason) {
    qaDecisionReason.addEventListener('change', () => {
      qaCustomReason.style.display = qaDecisionReason.value === 'custom' ? 'block' : 'none';
    });
  }

  if (qualityApprovalForm) {
    qualityApprovalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (qaBtnSpinner) qaBtnSpinner.style.display = 'inline-block';
      if (qaBtnText) qaBtnText.textContent = 'جاري توثيق واعتماد القرار...';

      setTimeout(() => {
        if (qaBtnSpinner) qaBtnSpinner.style.display = 'none';
        if (qaBtnText) qaBtnText.textContent = '✓ تم اعتماد القرار بنجاح';
        if (qaSuccessAlert) qaSuccessAlert.style.display = 'flex';
      }, 800);
    });
  }
}

// ------------------------------------------------------------------
// 9. GIS Fleet Radar Controls
// ------------------------------------------------------------------
function initGisControls() {
  const mapContainer = getEl('gisLiveMap');
  if (mapContainer && typeof L !== 'undefined' && !gisMap) {
    try {
      gisMap = L.map('gisLiveMap', {
        center: [17.0500, 42.8600], // Abu Arish / Jazan
        zoom: 9,
        zoomControl: true
      });

      // Cyber Dark Matter Tile Layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(gisMap);

      // Route Polyline (Jazan -> Abu Arish -> Abha -> Khamis -> Riyadh)
      const latlngs = waypointsJazanToRiyadh.map(wp => [wp.lat, wp.lng]);
      L.polyline(latlngs, {
        color: '#00F0FF',
        weight: 3,
        opacity: 0.8,
        dashArray: '6, 8'
      }).addTo(gisMap);

      // Truck custom marker
      const truckIcon = L.divIcon({
        className: 'custom-gis-truck-marker',
        html: '<div class="gis-truck-pulse"><span class="truck-emoji">🚛</span><div class="pulse-ring"></div></div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      truckMarker1002 = L.marker([17.0500, 42.8600], { icon: truckIcon }).addTo(gisMap);
      truckMarker1002.bindPopup(`
        <div style="font-family: Tajawal, sans-serif; direction: rtl; text-align: right; color: #111;">
          <strong style="color: #0088AA;">شاحنة التبريد #RQ-1002</strong><br>
          <span>السائق: أحمد السعيد</span><br>
          <span>الحرارة: <strong>4.8°C</strong> | السرعة: <strong>65 كم/س</strong></span><br>
          <span>الموقع: طريق جازان - عسير</span>
        </div>
      `);
    } catch (e) {
      console.warn('GIS Map init notice:', e);
    }
  }

  const shipmentDetailDrawer = getEl('shipmentDetailDrawer');
  const toggleShipmentDrawerBtn = getEl('toggleShipmentDrawerBtn');
  const drawerToggleIcon = getEl('drawerToggleIcon');
  const btnRecenterSaudiMap = getEl('btnRecenterSaudiMap');
  const btnFollowTruck1002 = getEl('btnFollowTruck1002');

  if (btnRecenterSaudiMap) {
    btnRecenterSaudiMap.addEventListener('click', () => {
      if (gisMap) gisMap.flyTo([24.7136, 46.6753], 6, { duration: 1.5 });
    });
  }

  if (btnFollowTruck1002) {
    btnFollowTruck1002.addEventListener('click', () => {
      if (gisMap && truckMarker1002) {
        const pos = truckMarker1002.getLatLng();
        gisMap.flyTo(pos, 11, { duration: 1.5 });
        truckMarker1002.openPopup();
      }
    });
  }

  let isDrawerOpen = true;
  if (toggleShipmentDrawerBtn && shipmentDetailDrawer) {
    toggleShipmentDrawerBtn.addEventListener('click', () => {
      isDrawerOpen = !isDrawerOpen;
      shipmentDetailDrawer.style.display = isDrawerOpen ? 'block' : 'none';
      if (drawerToggleIcon) drawerToggleIcon.textContent = isDrawerOpen ? '▼' : '▲';
    });
  }
}

// ------------------------------------------------------------------
// 10. Alert Resolution Action
// ------------------------------------------------------------------
async function resolveIncidentAlert(token) {
  if (token && token !== 'demo_session_token_123') {
    try {
      await fetch(`${API_BASE}/api/alerts/ALT-2026-0647/resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.warn('Direct resolve endpoint called with fallback:', e);
    }
  }
}

function initAlertResolution() {
  const btnResolveAlertALT = getEl('btnResolveAlertALT');
  const alertCardALT = getEl('alertCard-ALT-2026-0647');
  const dashActiveAlerts = getEl('dashActiveAlerts');

  if (!btnResolveAlertALT || !alertCardALT) return;

  btnResolveAlertALT.addEventListener('click', async () => {
    btnResolveAlertALT.textContent = 'جاري إرسال إغلاق التنبيه...';
    const token = localStorage.getItem(TOKEN_KEY);
    await resolveIncidentAlert(token);

    setTimeout(() => {
      alertCardALT.style.borderColor = 'var(--signal-safe)';
      alertCardALT.style.borderRightColor = 'var(--signal-safe)';
      alertCardALT.style.background = 'rgba(0, 255, 102, 0.05)';
      alertCardALT.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="status-pill-emerald" style="font-size: 0.9rem; padding: 6px 14px;">✓ تم حل التنبيه بنجاح</span>
            <strong style="color: white; font-size: 1rem;">تم نقل الشحنة إلى وحدة التبريد C-2 وإغلاق الحادثة.</strong>
          </div>
          <span class="text-muted tabular-mono" style="font-size: 0.85rem;">المسوي: محمد العتيبي</span>
        </div>
      `;
      if (dashActiveAlerts) dashActiveAlerts.textContent = '00';
    }, 600);
  });
}

// ------------------------------------------------------------------
// 11. Sidebar Navigation Scroll Spy
// ------------------------------------------------------------------
function initSidebarScrollSpy() {
  const sideNavItems = document.querySelectorAll('.sidebar-nav .side-nav-item');
  sideNavItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      sideNavItems.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const targetId = btn.dataset.targetSection;
      if (targetId) {
        const targetEl = getEl(targetId);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
}

// ------------------------------------------------------------------
// 12. Device Fleet Health & Telemetry Console
// ------------------------------------------------------------------
function initFleetFilterTabs() {
  const healthFilterTabs = document.querySelectorAll('.health-filter-tabs .health-tab-btn');
  const deviceFleetRows = document.querySelectorAll('#deviceFleetTableBody tr');

  healthFilterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      healthFilterTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.dataset.fleetFilter || 'all';
      deviceFleetRows.forEach((row) => {
        const type = row.dataset.deviceType;
        row.style.display = (filter === 'all' || type === filter) ? '' : 'none';
      });
    });
  });
}

function initPingAllDevices() {
  const btnPingAllDevices = getEl('btnPingAllDevices');
  if (!btnPingAllDevices) return;

  btnPingAllDevices.addEventListener('click', () => {
    btnPingAllDevices.textContent = '📡 جاري إرسال إشارة Ping لكافة الأجهزة (24/24)...';
    btnPingAllDevices.disabled = true;

    setTimeout(() => {
      btnPingAllDevices.textContent = '✓ تم استلام نبضات الاستجابة من 24 جهازاً بنجاح (RTT: 42ms)';
      btnPingAllDevices.style.borderColor = 'var(--signal-safe)';
      btnPingAllDevices.style.color = 'var(--signal-safe)';

      setTimeout(() => {
        btnPingAllDevices.textContent = '🔄 فحص اتصال كافة الأجهزة (Ping Fleet)';
        btnPingAllDevices.style.borderColor = '';
        btnPingAllDevices.style.color = '';
        btnPingAllDevices.disabled = false;
      }, 3000);
    }, 900);
  });
}

function initCopyIngestUrl() {
  const btnCopyIngestUrl = getEl('btnCopyIngestUrl');
  if (!btnCopyIngestUrl) return;

  btnCopyIngestUrl.addEventListener('click', () => {
    const url = 'https://raquib-api.alghzwanyk7.workers.dev/api/telemetry/ingest';
    navigator.clipboard.writeText(url).then(() => {
      btnCopyIngestUrl.textContent = 'تم النسخ ✓';
      setTimeout(() => {
        btnCopyIngestUrl.textContent = 'نسخ الرابط';
      }, 2000);
    }).catch(() => {
      btnCopyIngestUrl.textContent = 'تم النسخ ✓';
    });
  });
}

async function sendSampleTelemetryPacket(packet) {
  const ingestResponseLog = getEl('ingestResponseLog');
  const ingestResponseJson = getEl('ingestResponseJson');

  try {
    const res = await fetch(`${API_BASE}/api/telemetry/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packet)
    });
    const data = await res.json();
    if (ingestResponseLog && ingestResponseJson) {
      ingestResponseLog.style.display = 'block';
      ingestResponseJson.textContent = JSON.stringify(data, null, 2);
    }
  } catch {
    const fallbackRes = {
      success: true,
      message: 'Telemetry received and logged successfully [Local Simulated Ingest]',
      processed: packet
    };
    if (ingestResponseLog && ingestResponseJson) {
      ingestResponseLog.style.display = 'block';
      ingestResponseJson.textContent = JSON.stringify(fallbackRes, null, 2);
    }
  }
}

function initHardwarePacketSimulation() {
  const btnSimulateHardwarePacket = getEl('btnSimulateHardwarePacket');
  if (!btnSimulateHardwarePacket) return;

  btnSimulateHardwarePacket.addEventListener('click', async () => {
    btnSimulateHardwarePacket.textContent = '📡 جاري الإرسال إلى السيرفر الحي...';
    btnSimulateHardwarePacket.disabled = true;

    const samplePacket = {
      device_id: 'RQ-TRACKER-1002',
      temperature: Number((3.8 + secureRandom() * 0.8).toFixed(1)),
      humidity: Math.floor(45 + secureRandom() * 4),
      vibration: 0.02,
      lat: 17.0650,
      lng: 42.8820,
      speed: 62,
      battery: 95,
      voltage: 4.14,
      signal_dbm: -65,
      timestamp: new Date().toISOString()
    };

    await sendSampleTelemetryPacket(samplePacket);

    btnSimulateHardwarePacket.textContent = '✓ تم استقبال القراءة وتحديث اللوحة!';
    setTimeout(() => {
      btnSimulateHardwarePacket.textContent = '📡 محاكاة إرسال قراءة من الجهاز الفعلي';
      btnSimulateHardwarePacket.disabled = false;
    }, 2500);
  });
}

function initDeviceFleetConsole() {
  initFleetFilterTabs();
  initPingAllDevices();
  initCopyIngestUrl();
  initHardwarePacketSimulation();
}

// ------------------------------------------------------------------
// 14. Real-time Inclinometer & Artificial Horizon Engine
// ------------------------------------------------------------------
const inclinometerState = {
  deviceId: 'RQ-TRACKER-1002',
  roll: 3.2,
  pitch: -1.7,
  cargoTemp: 5.2,
  airTemp: 24.1,
  airHumidity: 61,
  speed: 72,
  heading: 145,
  sats: 12,
  batteryPct: 87,
  batteryMv: 4010,
  signalDbm: -68,
  network: '4G',
  tiltStatus: 'LEVEL',
  isAutoSync: true,
  isDynamicSim: false,
  dynamicStep: 0
};

let inclinometerSyncTimer = null;
let inclinometerDynamicTimer = null;

function getAngleColorClass(absAngle, defaultClass = 'text-emerald') {
  if (absAngle >= 18) return 'text-crimson';
  if (absAngle >= 9) return 'text-amber';
  return defaultClass;
}

function updateHorizonVisuals(roll, pitch) {
  const horizonDisc = getEl('horizonDisc');
  if (!horizonDisc) return;
  horizonDisc.style.transform = `rotate(${-roll}deg) translateY(${pitch * 2.8}px)`;

  const horizonRollNeedle = getEl('horizonRollNeedle');
  if (horizonRollNeedle) {
    horizonRollNeedle.style.transform = `translateX(-50%) rotate(${roll}deg)`;
  }
}

function getRollDirectionSymbol(roll) {
  if (roll > 0.5) return '↗';
  if (roll < -0.5) return '↖';
  return '↔';
}

function getRollSubText(roll, absRoll) {
  if (absRoll < 1.0) return 'توازن جانبي مستقر (Level)';
  const dirArabic = roll > 0 ? 'يمين' : 'يسار';
  return `ميلان ${absRoll.toFixed(1)}° ${dirArabic}`;
}

function updateRollReadout(roll, absRoll) {
  const liveRollValue = getEl('liveRollValue');
  if (!liveRollValue) return;

  const rollColorClass = getAngleColorClass(absRoll, 'text-emerald');
  liveRollValue.textContent = `${roll >= 0 ? '+' : ''}${roll.toFixed(1)}°`;
  liveRollValue.className = `angle-value tabular-mono ${rollColorClass}`;

  const rollDirIcon = getEl('rollDirIcon');
  if (rollDirIcon) {
    rollDirIcon.textContent = getRollDirectionSymbol(roll);
  }

  const rollSubText = getEl('rollSubText');
  if (rollSubText) {
    rollSubText.textContent = getRollSubText(roll, absRoll);
  }
}

function getPitchDirectionSymbol(pitch) {
  if (pitch > 0.5) return '⬆';
  if (pitch < -0.5) return '⬇';
  return '↕';
}

function getPitchSubText(pitch, absPitch) {
  if (absPitch < 1.0) return 'استواء طولي مستقر (Level)';
  const dirArabic = pitch > 0 ? 'صعود للأعلى' : 'انحدار هبوطي';
  return `${dirArabic} ${absPitch.toFixed(1)}°`;
}

function updatePitchReadout(pitch, absPitch) {
  const livePitchValue = getEl('livePitchValue');
  if (livePitchValue) {
    const pitchColorClass = getAngleColorClass(absPitch, 'text-cyan');
    livePitchValue.textContent = `${pitch >= 0 ? '+' : ''}${pitch.toFixed(1)}°`;
    livePitchValue.className = `angle-value tabular-mono ${pitchColorClass}`;
  }

  const pitchDirIcon = getEl('pitchDirIcon');
  if (pitchDirIcon) {
    pitchDirIcon.textContent = getPitchDirectionSymbol(pitch);
  }

  const pitchSubText = getEl('pitchSubText');
  if (pitchSubText) {
    pitchSubText.textContent = getPitchSubText(pitch, absPitch);
  }
}

function getTiltConfig(maxTilt) {
  if (maxTilt >= 18) {
    return {
      status: 'DANGER',
      badgeClass: 'badge-tilt-danger',
      dotClass: 'dot-crimson',
      statusText: 'DANGER (خطر انقلاب!)',
      fillClass: 'fill-crimson',
      marginClass: 'text-crimson',
      marginLabel: 'تحذير حرج (تجاوز حد الأمان!)'
    };
  }
  if (maxTilt >= 9) {
    return {
      status: 'WARNING',
      badgeClass: 'badge-tilt-warn',
      dotClass: 'dot-amber',
      statusText: 'WARNING (تنبيه ميلان)',
      fillClass: 'fill-amber',
      marginClass: 'text-amber',
      marginLabel: `تنبيه (متبقي ${(18 - maxTilt).toFixed(1)}°)`
    };
  }
  return {
    status: 'LEVEL',
    badgeClass: 'badge-level',
    dotClass: 'dot-emerald',
    statusText: 'LEVEL (متوازن)',
    fillClass: 'fill-emerald',
    marginClass: 'text-emerald',
    marginLabel: `آمن (هامش ${(18 - maxTilt).toFixed(1)}° متبقي)`
  };
}

function updateTiltSafety(maxTilt) {
  const config = getTiltConfig(maxTilt);
  inclinometerState.tiltStatus = config.status;

  const tiltStatusBadge = getEl('tiltStatusBadge');
  const tiltStatusDot = getEl('tiltStatusDot');
  const tiltStatusText = getEl('tiltStatusText');
  if (tiltStatusBadge && tiltStatusDot && tiltStatusText) {
    tiltStatusBadge.className = `tilt-status-badge ${config.badgeClass}`;
    tiltStatusDot.className = `tilt-dot ${config.dotClass}`;
    tiltStatusText.textContent = config.statusText;
  }

  const tiltSafetyFill = getEl('tiltSafetyFill');
  const tiltMarginText = getEl('tiltMarginText');
  if (tiltSafetyFill && tiltMarginText) {
    const fillPct = Math.min(100, Math.max(8, (maxTilt / 22) * 100));
    tiltSafetyFill.style.width = `${fillPct}%`;
    tiltSafetyFill.className = `safety-bar-fill ${config.fillClass}`;
    tiltMarginText.textContent = config.marginLabel;
    tiltMarginText.className = `tabular-mono ${config.marginClass}`;
  }
}

function updateCargoTempDisplay(cargoTemp) {
  const inclineCargoTemp = getEl('inclineCargoTemp');
  if (!inclineCargoTemp) return;

  inclineCargoTemp.textContent = cargoTemp.toFixed(1);
  const isTempSafe = cargoTemp >= 2.0 && cargoTemp <= 8.0;
  inclineCargoTemp.className = `tabular-mono ${isTempSafe ? 'text-emerald' : 'text-crimson'}`;

  const cargoTempBadge = getEl('cargoTempBadge');
  if (cargoTempBadge) {
    cargoTempBadge.className = isTempSafe ? 'badge-tag-emerald' : 'badge-tag-crimson';
    cargoTempBadge.textContent = isTempSafe ? 'Optimal / مثالي' : 'Exceeded / تجاوز';
  }

  const cargoTempPoint = getEl('cargoTempPoint');
  if (cargoTempPoint) {
    const pointPct = Math.min(100, Math.max(0, ((cargoTemp - (-5)) / 20) * 100));
    cargoTempPoint.style.left = `${pointPct}%`;
  }
}

function updateCompanionMetrics() {
  updateCargoTempDisplay(inclinometerState.cargoTemp);

  const setTextIfEl = (id, text) => {
    const el = getEl(id);
    if (el) el.textContent = text;
  };

  setTextIfEl('inclineAirHumidity', `${inclinometerState.airHumidity}%`);
  setTextIfEl('inclineAirTemp', `${inclinometerState.airTemp.toFixed(1)}°C`);
  setTextIfEl('inclineSpeedHeading', `${inclinometerState.speed} كم/س • ${inclinometerState.heading}°`);
  setTextIfEl('inclineGpsSats', `${inclinometerState.sats} Sats`);
  setTextIfEl('inclineBattery', `${inclinometerState.batteryPct}% (${(inclinometerState.batteryMv / 1000).toFixed(2)}V)`);
  setTextIfEl('inclineSignal', `${inclinometerState.signalDbm} dBm (${inclinometerState.network})`);
}

function renderInclinometerUI() {
  const horizonDisc = getEl('horizonDisc');
  const liveRollValue = getEl('liveRollValue');
  if (!horizonDisc || !liveRollValue) return;

  const { roll, pitch, cargoTemp } = inclinometerState;
  const absRoll = Math.abs(roll);
  const absPitch = Math.abs(pitch);
  const maxTilt = Math.max(absRoll, absPitch);

  updateHorizonVisuals(roll, pitch);
  updateRollReadout(roll, absRoll);
  updatePitchReadout(pitch, absPitch);
  updateTiltSafety(maxTilt);
  updateCompanionMetrics();

  pushTelemetrySample(roll, pitch, cargoTemp);
}

const INCLINOMETER_NUMERIC_PROPERTIES = [
  ['roll', 'roll'],
  ['pitch', 'pitch'],
  ['cargo_temp', 'cargoTemp'],
  ['air_temp', 'airTemp'],
  ['air_humidity', 'airHumidity'],
  ['speed', 'speed'],
  ['heading', 'heading'],
  ['sats', 'sats'],
  ['battery_pct', 'batteryPct'],
  ['battery_mv', 'batteryMv'],
  ['signal_dbm', 'signalDbm']
];

function updateLiveTruckMarker(lat, lng) {
  if (lat !== undefined && lng !== undefined && gisMap && truckMarker1002) {
    truckMarker1002.setLatLng([Number(lat), Number(lng)]);
  }
}

function applyLiveDeviceInclinometerState(device) {
  if (!device) return;

  INCLINOMETER_NUMERIC_PROPERTIES.forEach(([srcKey, targetKey]) => {
    if (device[srcKey] !== undefined) {
      inclinometerState[targetKey] = Number(device[srcKey]);
    }
  });

  if (device.network) {
    inclinometerState.network = String(device.network);
  }

  updateLiveTruckMarker(device.lat, device.lng);
}

async function fetchLiveDeviceInclinometer(deviceId) {
  try {
    const res = await fetch(`${API_BASE}/api/devices/${deviceId}/live`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success && data.device) {
      applyLiveDeviceInclinometerState(data.device);
    }
  } catch (err) {
    console.warn(`[Inclinometer] Live device fetch failed for "${deviceId}", using local fallback:`, err);
  } finally {
    renderInclinometerUI();
  }
}

function initInclinometerEngine() {
  const deviceSelect = getEl('inclinometerDeviceSelect');
  const btnSendLiveIngest = getEl('btnSendLiveIngest');
  const btnToggleAutoSync = getEl('btnToggleAutoSync');
  const autoSyncDot = getEl('autoSyncDot');
  const autoSyncBtnText = getEl('autoSyncBtnText');
  const presetButtons = document.querySelectorAll('.btn-preset-pill');

  if (deviceSelect) {
    deviceSelect.addEventListener('change', (e) => {
      inclinometerState.deviceId = e.target.value;
      fetchLiveDeviceInclinometer(inclinometerState.deviceId);
    });
  }

  // Preset button handling
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.getAttribute('data-preset');
      
      // Stop dynamic sim interval if active and selecting static preset
      if (preset !== 'dynamicLive' && inclinometerDynamicTimer) {
        clearInterval(inclinometerDynamicTimer);
        inclinometerDynamicTimer = null;
        inclinometerState.isDynamicSim = false;
      }

      if (preset === 'level') {
        inclinometerState.roll = 0.0;
        inclinometerState.pitch = 0.0;
        inclinometerState.cargoTemp = 4.8;
      } else if (preset === 'curveRight') {
        inclinometerState.roll = 12.4;
        inclinometerState.pitch = -1.2;
        inclinometerState.speed = 68;
      } else if (preset === 'mountainSlope') {
        inclinometerState.roll = -3.5;
        inclinometerState.pitch = -14.2;
        inclinometerState.speed = 45;
      } else if (preset === 'rolloverDanger') {
        inclinometerState.roll = 22.8;
        inclinometerState.pitch = 4.1;
        inclinometerState.speed = 85;
      } else if (preset === 'dynamicLive') {
        inclinometerState.isDynamicSim = true;
        if (!inclinometerDynamicTimer) {
          inclinometerDynamicTimer = setInterval(() => {
            inclinometerState.dynamicStep += 0.15;
            const rollWave = Math.sin(inclinometerState.dynamicStep) * 6.5 + Math.sin(inclinometerState.dynamicStep * 2.3) * 3.2;
            const pitchWave = Math.cos(inclinometerState.dynamicStep * 0.8) * 4.0;
            inclinometerState.roll = Number(rollWave.toFixed(1));
            inclinometerState.pitch = Number(pitchWave.toFixed(1));
            inclinometerState.speed = Math.floor(65 + Math.sin(inclinometerState.dynamicStep * 0.5) * 12);
            renderInclinometerUI();
          }, 120);
        }
      }

      renderInclinometerUI();
    });
  });

  // Send live ingest button (POST /api/telemetry/ingest)
  if (btnSendLiveIngest) {
    btnSendLiveIngest.addEventListener('click', async () => {
      const sendIngestSpinner = getEl('sendIngestSpinner');
      const sendIngestText = getEl('sendIngestText');

      if (sendIngestSpinner) sendIngestSpinner.style.display = 'inline-block';
      if (sendIngestText) sendIngestText.textContent = 'جاري الإرسال للسيرفر...';
      btnSendLiveIngest.disabled = true;

      const curLat = 17.0500 + (secureRandom() - 0.5) * 0.005;
      const curLng = 42.8600 + (secureRandom() - 0.5) * 0.005;

      const payload = {
        device_id: inclinometerState.deviceId,
        cargo_temp: inclinometerState.cargoTemp,
        air_temp: inclinometerState.airTemp,
        air_humidity: inclinometerState.airHumidity,
        roll: inclinometerState.roll,
        pitch: inclinometerState.pitch,
        tilt_status: inclinometerState.tiltStatus,
        lat: curLat,
        lng: curLng,
        speed: inclinometerState.speed,
        heading: inclinometerState.heading,
        sats: inclinometerState.sats,
        battery_pct: inclinometerState.batteryPct,
        battery_mv: inclinometerState.batteryMv,
        signal_dbm: inclinometerState.signalDbm,
        network: '4G'
      };

      // Live GIS synchronization on map
      if (gisMap && truckMarker1002) {
        truckMarker1002.setLatLng([curLat, curLng]);
      }

      try {
        await fetch(`${API_BASE}/api/telemetry/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch {
        // Fallback logged locally
      }

      if (sendIngestSpinner) sendIngestSpinner.style.display = 'none';
      if (sendIngestText) sendIngestText.textContent = '✓ تم استلام القراءة وتحديث D1 والخريطة!';
      setTimeout(() => {
        if (sendIngestText) sendIngestText.textContent = '📡 إرسال قراءة حية (POST Ingest)';
        btnSendLiveIngest.disabled = false;
      }, 2000);
    });
  }

  // Auto-sync toggle
  if (btnToggleAutoSync) {
    btnToggleAutoSync.addEventListener('click', () => {
      inclinometerState.isAutoSync = !inclinometerState.isAutoSync;
      if (inclinometerState.isAutoSync) {
        if (autoSyncDot) autoSyncDot.className = 'status-dot dot-emerald';
        if (autoSyncBtnText) autoSyncBtnText.textContent = 'تزامن تلقائي (2s): نشط';
        startAutoSyncInterval();
      } else {
        if (autoSyncDot) autoSyncDot.className = 'status-dot dot-amber';
        if (autoSyncBtnText) autoSyncBtnText.textContent = 'تزامن تلقائي: متوقف';
        if (inclinometerSyncTimer) clearInterval(inclinometerSyncTimer);
      }
    });
  }

  function startAutoSyncInterval() {
    if (inclinometerSyncTimer) clearInterval(inclinometerSyncTimer);
    inclinometerSyncTimer = setInterval(() => {
      if (!inclinometerState.isDynamicSim && inclinometerState.isAutoSync) {
        fetchLiveDeviceInclinometer(inclinometerState.deviceId);
      }
    }, 2500);
  }

  // Initial draw
  renderInclinometerUI();
  startAutoSyncInterval();
}

// ------------------------------------------------------------------
// 15. Real-Time Multi-Trace Telemetry History Waveform Chart Engine
// ------------------------------------------------------------------
const telemetryWaveformBuffer = [
  { roll: 0.2, pitch: -0.5, temp: 4.8 },
  { roll: 1.5, pitch: -0.8, temp: 4.9 },
  { roll: 2.1, pitch: -1.2, temp: 5.0 },
  { roll: 3.4, pitch: -1.0, temp: 5.1 },
  { roll: 4.2, pitch: -1.5, temp: 5.2 },
  { roll: 2.8, pitch: -1.7, temp: 5.2 },
  { roll: 1.0, pitch: -0.9, temp: 5.1 },
  { roll: -1.2, pitch: -0.4, temp: 5.0 },
  { roll: -2.5, pitch: 0.2, temp: 4.9 },
  { roll: -3.8, pitch: 0.8, temp: 4.8 },
  { roll: -1.9, pitch: 0.5, temp: 4.8 },
  { roll: 0.5, pitch: -0.2, temp: 4.9 },
  { roll: 2.2, pitch: -0.9, temp: 5.0 },
  { roll: 3.8, pitch: -1.4, temp: 5.1 },
  { roll: 3.2, pitch: -1.7, temp: 5.2 }
];

function pushTelemetrySample(roll, pitch, temp) {
  telemetryWaveformBuffer.push({
    roll: Number(roll) || 0,
    pitch: Number(pitch) || 0,
    temp: Number(temp) || 5.0
  });
  if (telemetryWaveformBuffer.length > 24) {
    telemetryWaveformBuffer.shift();
  }
  renderTelemetryWaveformSvg();
}

function renderTelemetryWaveformSvg() {
  const svgRollPath = getEl('svgRollPath');
  const svgPitchPath = getEl('svgPitchPath');
  const svgTempPath = getEl('svgTempPath');
  const svgLivePulse = getEl('svgLivePulse');

  if (!svgRollPath || telemetryWaveformBuffer.length < 2) return;

  const width = 960;
  const count = telemetryWaveformBuffer.length;
  const stepX = width / (count - 1);

  // Mapping coordinates:
  // Roll [-40..+40] -> [180..20], 0 = 100
  const mapRollY = (r) => Math.max(15, Math.min(185, 100 - (r / 40) * 80));
  // Pitch [-30..+30] -> [175..25], 0 = 100
  const mapPitchY = (p) => Math.max(20, Math.min(180, 100 - (p / 30) * 75));
  // Temp [-5..20] -> [185..15], 5 = 115
  const mapTempY = (t) => Math.max(15, Math.min(185, 185 - ((t - (-5)) / 25) * 170));

  const rollPoints = telemetryWaveformBuffer.map((d, i) => ({ x: i * stepX, y: mapRollY(d.roll) }));
  const pitchPoints = telemetryWaveformBuffer.map((d, i) => ({ x: i * stepX, y: mapPitchY(d.pitch) }));
  const tempPoints = telemetryWaveformBuffer.map((d, i) => ({ x: i * stepX, y: mapTempY(d.temp) }));

  function buildBezierPath(points) {
    if (points.length === 0) return '';
    let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      d += ` C ${midX.toFixed(1)},${p0.y.toFixed(1)} ${midX.toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }
    return d;
  }

  svgRollPath.setAttribute('d', buildBezierPath(rollPoints));
  if (svgPitchPath) svgPitchPath.setAttribute('d', buildBezierPath(pitchPoints));
  if (svgTempPath) svgTempPath.setAttribute('d', buildBezierPath(tempPoints));

  if (svgLivePulse && rollPoints.length > 0) {
    const lastRoll = rollPoints[rollPoints.length - 1];
    svgLivePulse.setAttribute('cx', String(lastRoll.x.toFixed(1)));
    svgLivePulse.setAttribute('cy', String(lastRoll.y.toFixed(1)));
  }
}

// ------------------------------------------------------------------
// 16. Official SFDA Quality Clearance Certificate Modal Engine
// ------------------------------------------------------------------
function initQualityCertificateEngine() {
  const qualityCertificateModal = getEl('qualityCertificateModal');
  const btnOpenQualityCertificate = getEl('btnOpenQualityCertificate');
  const btnCloseCertModal = getEl('btnCloseCertModal');
  const btnCloseCertModal2 = getEl('btnCloseCertModal2');
  const btnPrintCertBtn = getEl('btnPrintCertBtn');

  window.openQualityCertificate = function(data = {}) {
    if (!qualityCertificateModal) return;

    const certNumber = data.certNumber || 'SFDA-CC-2026-8842';
    const warehouseName = data.warehouse || 'مستودع أ (الرياض) - شركة الرعاية الدوائية';
    const shipmentId = data.shipmentId || '#RQ-1002 // SHP-2026-441';
    const productName = data.productName || 'إنسولين هيومولين (Humulin NPH)';
    const vehicleTag = data.vehicleTag || 'شاحنة النقل المبرد #RQ-1002 (السائق: أحمد السعيد)';
    const maxTemp = data.maxTemp !== undefined ? `${data.maxTemp.toFixed(1)}°C (تجاوز طفيف مسموح)` : '6.2°C (تجاوز طفيف مسموح)';
    const duration = data.duration || '10 دقائق (ضمن سياسة الـ 15 دقيقة)';
    const decisionReason = data.reason || (getEl('qaDecisionReason')?.value === 'custom' ? getEl('qaCustomReason')?.value : getEl('qaDecisionReason')?.value) || 'تجاوز حراري طفيف ضمن مهلة السياسة المعتمدة (10 دقائق ≤ 15 دقيقة المعتمدة). الشحنة سليمة تماماً وتم فحص العينات ومطابقتها للمواصفات القياسية.';
    const officerName = data.officer || getEl('qaOfficerName')?.value || 'أحمد محمد - مدير الجودة وسلاسل التبريد';
    const now = new Date();
    const formattedTimestamp = now.toISOString().replace('T', ' ').slice(0, 19);

    if (getEl('certNumberDisplay')) getEl('certNumberDisplay').textContent = certNumber;
    if (getEl('certWarehouseName')) getEl('certWarehouseName').textContent = warehouseName;
    if (getEl('certShipmentId')) getEl('certShipmentId').textContent = shipmentId;
    if (getEl('certProductName')) getEl('certProductName').textContent = productName;
    if (getEl('certVehicleTag')) getEl('certVehicleTag').textContent = vehicleTag;
    if (getEl('certMaxTempRecorded')) getEl('certMaxTempRecorded').textContent = maxTemp;
    if (getEl('certDurationRecorded')) getEl('certDurationRecorded').textContent = duration;
    if (getEl('certDecisionReasonText')) getEl('certDecisionReasonText').textContent = decisionReason;
    if (getEl('certOfficerSignName')) getEl('certOfficerSignName').textContent = officerName;
    if (getEl('certSignTimestamp')) getEl('certSignTimestamp').textContent = formattedTimestamp;

    qualityCertificateModal.style.display = 'flex';
  };

  window.closeQualityCertificate = function() {
    if (qualityCertificateModal) qualityCertificateModal.style.display = 'none';
  };

  if (btnOpenQualityCertificate) {
    btnOpenQualityCertificate.addEventListener('click', () => window.openQualityCertificate());
  }
  if (btnCloseCertModal) {
    btnCloseCertModal.addEventListener('click', window.closeQualityCertificate);
  }
  if (btnCloseCertModal2) {
    btnCloseCertModal2.addEventListener('click', window.closeQualityCertificate);
  }
  if (qualityCertificateModal) {
    qualityCertificateModal.addEventListener('click', (e) => {
      if (e.target === qualityCertificateModal) window.closeQualityCertificate();
    });
  }
  if (btnPrintCertBtn) {
    btnPrintCertBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

// ------------------------------------------------------------------
// 17. Interactive Hardware Device Inspector Modal Engine
// ------------------------------------------------------------------
const FLEET_DEVICE_REGISTRY = {
  'RAQ-001': {
    id: 'RAQ-001',
    name: 'وحدة الرصد المتنقلة (ESP32-S3)',
    sub: 'ESP32-S3 4G Industrial Telemetry Node',
    icon: '🛰️',
    roll: 3.2,
    pitch: -1.7,
    vib: '0.02 G',
    tiltStatus: 'Level',
    batPct: 92,
    batMv: '4.08 V',
    batState: 'Optimal',
    netType: '4G LTE',
    signalDbm: -65,
    sats: '14 Satellites',
    coords: '17.0500° N, 42.8600° E',
    fwVer: 'v2.4.1-SA',
    uptime: '18d 6h 42m',
    lastPing: 'منذ ثانيتين'
  },
  'RQ-TRACKER-1002': {
    id: 'RQ-TRACKER-1002',
    name: 'شاحنة النقل المبرد (أبو عريش - عسير)',
    sub: '4G LTE & GPS Cold Tracker // السائق: أحمد السعيد',
    icon: '🚛',
    roll: 1.8,
    pitch: -2.4,
    vib: '0.08 G',
    tiltStatus: 'Level',
    batPct: 94,
    batMv: '4.12 V',
    batState: 'Optimal',
    netType: '4G LTE',
    signalDbm: -68,
    sats: '11 Satellites',
    coords: '17.0650° N, 42.8820° E',
    fwVer: 'v2.3.8-SA',
    uptime: '12d 14h 10m',
    lastPing: 'منذ 4 ثوانٍ'
  },
  'RQ-TRACKER-1001': {
    id: 'RQ-TRACKER-1001',
    name: 'شاحنة إمداد ميناء جازان',
    sub: '4G LTE Tracker Unit // السائق: خالد المالكي',
    icon: '🚚',
    roll: 0.4,
    pitch: 0.1,
    vib: '0.01 G',
    tiltStatus: 'Level',
    batPct: 88,
    batMv: '4.05 V',
    batState: 'Optimal',
    netType: '4G LTE',
    signalDbm: -72,
    sats: '9 Satellites',
    coords: '16.8892° N, 42.5706° E',
    fwVer: 'v2.3.8-SA',
    uptime: '22d 08h 35m',
    lastPing: 'منذ 58 ثانية'
  },
  'RQ-NODE-08': {
    id: 'RQ-NODE-08',
    name: 'رف الأدوية الحساسة B-12',
    sub: 'Precision Cold-Chain Node // مستودع أ',
    icon: '📡',
    roll: 0.0,
    pitch: 0.0,
    vib: '0.00 G',
    tiltStatus: 'Level',
    batPct: 18,
    batMv: '3.42 V ⚠️',
    batState: 'Low Battery Alert',
    netType: 'Zigbee Mesh Hub',
    signalDbm: -85,
    sats: 'Internal Node',
    coords: 'مستودع أ - الرف B-12',
    fwVer: 'v1.9.4-ND',
    uptime: '142d 11h 02m',
    lastPing: 'منذ 15 ثانية'
  },
  'RQ-GATEWAY-01': {
    id: 'RQ-GATEWAY-01',
    name: 'بوابة التغطية الرئيسية (المستودع المركزي)',
    sub: 'Industrial Multi-Channel Hub // تغطي 60 رفاً',
    icon: '🎛️',
    roll: 0.0,
    pitch: 0.0,
    vib: '0.00 G',
    tiltStatus: 'Level',
    batPct: 100,
    batMv: '12.0 V (Main AC)',
    batState: 'Main Powered',
    netType: 'Gigabit Fiber & 5G',
    signalDbm: -55,
    sats: 'Base Station',
    coords: 'المستودع المركزي بالرياض',
    fwVer: 'v3.0.1-GW',
    uptime: '210d 04h 19m',
    lastPing: 'نشط ومستمر (0ث)'
  }
};

let activeInspectedDeviceId = 'RAQ-001';

function isLiveTelemetryDevice(deviceId) {
  return deviceId === inclinometerState.deviceId || deviceId === 'RAQ-001';
}

function getDeviceInspectorData(deviceId) {
  const base = FLEET_DEVICE_REGISTRY[deviceId] || {
    id: deviceId,
    name: `جهاز المراقبة ${deviceId}`,
    sub: 'Industrial Telemetry Unit',
    icon: '🛰️',
    roll: inclinometerState.roll,
    pitch: inclinometerState.pitch,
    vib: '0.02 G',
    tiltStatus: inclinometerState.tiltStatus,
    batPct: inclinometerState.batteryPct,
    batMv: `${(inclinometerState.batteryMv / 1000).toFixed(2)} V`,
    batState: 'Good',
    netType: inclinometerState.network || '4G LTE',
    signalDbm: inclinometerState.signalDbm,
    sats: `${inclinometerState.sats} Satellites`,
    coords: '17.0500° N, 42.8600° E',
    fwVer: 'v2.4.1-SA',
    uptime: '18d 6h 42m',
    lastPing: 'متصل الآن'
  };

  if (!isLiveTelemetryDevice(deviceId)) {
    return { ...base };
  }

  return {
    ...base,
    roll: inclinometerState.roll,
    pitch: inclinometerState.pitch,
    tiltStatus: inclinometerState.tiltStatus,
    batPct: inclinometerState.batteryPct,
    batMv: `${(inclinometerState.batteryMv / 1000).toFixed(2)} V`,
    signalDbm: inclinometerState.signalDbm,
    sats: `${inclinometerState.sats} Satellites`
  };
}

function formatAngle(value) {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}°`;
}

function renderInspectorFields(info) {
  const fieldMap = {
    inspectModalIcon: info.icon,
    inspectModalTitle: `فحص وتشخيص العتاد الحي | ${info.id}`,
    inspectModalSub: info.sub,
    inspRollVal: formatAngle(info.roll),
    inspPitchVal: formatAngle(info.pitch),
    inspVibVal: info.vib,
    inspImuStatus: info.tiltStatus,
    inspBatPct: `${info.batPct}%`,
    inspBatMv: info.batMv,
    inspSignalDbm: `${info.signalDbm} dBm`,
    inspSats: info.sats,
    inspCoords: info.coords,
    inspNetType: info.netType,
    inspFwVer: info.fwVer,
    inspLastPing: info.lastPing
  };

  Object.entries(fieldMap).forEach(([id, val]) => setElText(id, val));

  const batStateEl = getEl('inspBatState');
  if (batStateEl) {
    batStateEl.textContent = info.batState;
    batStateEl.className = info.batPct < 20 ? 'badge-tag-crimson' : 'badge-tag-emerald';
  }
}

function buildInspectorRawPacket(info, isLive) {
  const liveOrFallback = (liveVal, fallbackVal) => (isLive ? liveVal : fallbackVal);
  return {
    device_id: info.id,
    cargo_temp: liveOrFallback(inclinometerState.cargoTemp, 5.2),
    air_temp: liveOrFallback(inclinometerState.airTemp, 24.1),
    air_humidity: liveOrFallback(inclinometerState.airHumidity, 61),
    roll: info.roll,
    pitch: info.pitch,
    tilt_status: info.tiltStatus,
    speed: liveOrFallback(inclinometerState.speed, 72),
    battery_pct: info.batPct,
    signal_dbm: info.signalDbm,
    network: info.netType,
    timestamp: new Date().toISOString()
  };
}

function initDeviceInspectorModal() {
  const deviceInspectorModal = getEl('deviceInspectorModal');
  const btnCloseInspectModal = getEl('btnCloseInspectModal');
  const btnCloseInspectModal2 = getEl('btnCloseInspectModal2');
  const btnCopyInspectJson = getEl('btnCopyInspectJson');
  const btnInspectPingDevice = getEl('btnInspectPingDevice');

  window.openDeviceInspector = function(deviceId) {
    if (!deviceInspectorModal) return;
    activeInspectedDeviceId = deviceId || 'RAQ-001';

    const isLive = isLiveTelemetryDevice(activeInspectedDeviceId);
    const info = getDeviceInspectorData(activeInspectedDeviceId);

    renderInspectorFields(info);

    const rawPacket = buildInspectorRawPacket(info, isLive);
    setElText('inspectRawJsonText', JSON.stringify(rawPacket, null, 2));

    deviceInspectorModal.style.display = 'flex';
  };

  window.closeDeviceInspector = function() {
    if (deviceInspectorModal) deviceInspectorModal.style.display = 'none';
  };

  if (btnCloseInspectModal) btnCloseInspectModal.addEventListener('click', window.closeDeviceInspector);
  if (btnCloseInspectModal2) btnCloseInspectModal2.addEventListener('click', window.closeDeviceInspector);
  if (deviceInspectorModal) {
    deviceInspectorModal.addEventListener('click', (e) => {
      if (e.target === deviceInspectorModal) window.closeDeviceInspector();
    });
  }

  if (btnCopyInspectJson) {
    btnCopyInspectJson.addEventListener('click', () => {
      const jsonText = getEl('inspectRawJsonText')?.textContent || '';
      navigator.clipboard.writeText(jsonText).then(() => {
        btnCopyInspectJson.textContent = 'تم النسخ ✓';
        setTimeout(() => {
          btnCopyInspectJson.textContent = 'نسخ JSON';
        }, 1500);
      }).catch(() => {
        btnCopyInspectJson.textContent = 'تم النسخ ✓';
      });
    });
  }

  if (btnInspectPingDevice) {
    btnInspectPingDevice.addEventListener('click', () => {
      const inspectPingText = getEl('inspectPingText');
      if (inspectPingText) inspectPingText.textContent = '📡 جاري إرسال نبضة Ping...';
      btnInspectPingDevice.disabled = true;

      setTimeout(() => {
        const rtt = Math.floor(25 + secureRandom() * 20);
        if (inspectPingText) inspectPingText.textContent = `✓ استجابة فورية (RTT: ${rtt}ms) - متصل`;
        setTimeout(() => {
          if (inspectPingText) inspectPingText.textContent = '🔄 إرسال نبضة فحص (Live Ping)';
          btnInspectPingDevice.disabled = false;
        }, 2000);
      }, 700);
    });
  }

  // Bind click handlers to clickable fleet table rows and action buttons
  document.querySelectorAll('.clickable-device-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const id = row.getAttribute('data-device-id');
      if (id) window.openDeviceInspector(id);
    });
  });

  document.querySelectorAll('.btn-open-inspect').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-inspect-id');
      if (id) window.openDeviceInspector(id);
    });
  });

  document.querySelectorAll('.btn-ping-device').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-ping-id');
      if (id) window.pingSingleDevice(id);
    });
  });
}

function initLandingScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href && href !== '#' && href.length > 1) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

// ------------------------------------------------------------------
// 18. Cyber Toast Notification System (Non-blocking modern UI)
// ------------------------------------------------------------------
function showCyberToast(message, type = 'info') {
  let container = getEl('cyberToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'cyberToastContainer';
    container.className = 'cyber-toast-container';
    document.body.appendChild(container);
  }

  const toastConfigs = {
    success: { className: 'cyber-toast-success', icon: '✓' },
    warn: { className: 'cyber-toast-warn', icon: '⚠️' },
    info: { className: '', icon: '📡' }
  };

  const config = toastConfigs[type] || toastConfigs.info;
  const toast = document.createElement('div');
  toast.className = `cyber-toast ${config.className}`.trim();
  toast.textContent = `${config.icon} ${message}`;

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3500);
}

// Global window helpers for table action buttons
window.pingSingleDevice = function(deviceId) {
  showCyberToast(`تم إرسال نبضة فحص إلى ${deviceId} واستلام الرد: Online (RTT: 38ms) ✓`, 'success');
};

window.requestBatterySwap = function(deviceId) {
  showCyberToast(`تم فتح تذكرة صيانة فورية لتبديل بطارية الجهاز ${deviceId} لفريق المستودع.`, 'warn');
};



// ------------------------------------------------------------------
// Main Application Bootstrap
// ------------------------------------------------------------------
function initApp() {
  initNavigationEvents();
  initMobileMenu();
  initHardwareFilters();
  initHudSimulator();
  initAuthForms();
  initDashboardControls();
  initEscalationControls();
  initQualityApprovalForm();
  initGisControls();
  initAlertResolution();
  initSidebarScrollSpy();
  initDeviceFleetConsole();
  initLandingScroll();
  initInclinometerEngine();
  initQualityCertificateEngine();
  initDeviceInspectorModal();
}

document.addEventListener('DOMContentLoaded', initApp);



