/**
 * ====================================================================
 * RAQUIB TELEMETRY - FULL WEB & CONTROL CENTER INTERACTION ENGINE (v2.0)
 * ====================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Backend API Endpoint & Storage Keys
  const API_BASE = 'https://raquib-api.alghzwanyk7.workers.dev';
  const TOKEN_KEY = 'raquib_jwt_token';
  const USER_KEY = 'raquib_user_profile';

  // Views & Shell Elements
  const homeView = document.getElementById('homeView');
  const controlCenterView = document.getElementById('controlCenterView');
  
  // Navigation Trigger Buttons
  const navOpenDashboardBtn = document.getElementById('navOpenDashboardBtn');
  const heroControlCenterBtn = document.getElementById('heroControlCenterBtn');
  const btnBackToHome = document.getElementById('btnBackToHome');
  const brandHomeLink = document.getElementById('brandHomeLink');
  const navHomeLink = document.getElementById('navHomeLink');
  const footerHomeLink = document.getElementById('footerHomeLink');
  const footerDashboardLink = document.getElementById('footerDashboardLink');
  const btnDashLogout = document.getElementById('btnDashLogout');

  // ------------------------------------------------------------------
  // 1. SPA View Router System
  // ------------------------------------------------------------------
  function switchView(viewName, scroll = true) {
    const isDashboard = viewName === 'controlCenter' || viewName === 'dashboard';

    if (homeView) homeView.classList.toggle('active', !isDashboard);
    if (controlCenterView) controlCenterView.classList.toggle('active', isDashboard);

    if (navHomeLink) navHomeLink.classList.toggle('active', !isDashboard);

    if (isDashboard) {
      loadDashboardState();
      // Initialize or invalidate real GIS Leaflet map size after view transition
      setTimeout(() => {
        initOrUpdateGisMap();
      }, 200);
    }

    if (scroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (navOpenDashboardBtn) {
    navOpenDashboardBtn.addEventListener('click', () => switchView('controlCenter'));
  }

  if (heroControlCenterBtn) {
    heroControlCenterBtn.addEventListener('click', () => switchView('controlCenter'));
  }

  if (footerDashboardLink) {
    footerDashboardLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('controlCenter');
    });
  }

  if (btnBackToHome) {
    btnBackToHome.addEventListener('click', () => switchView('home'));
  }

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

  // ------------------------------------------------------------------
  // 2. Mobile Menu Navigation Toggle
  // ------------------------------------------------------------------
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const navLinks = document.getElementById('navLinks');

  if (mobileMenuToggle && navLinks) {
    mobileMenuToggle.addEventListener('click', () => {
      const isExpanded = navLinks.classList.toggle('mobile-open');
      mobileMenuToggle.setAttribute('aria-expanded', String(isExpanded));
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-open');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ------------------------------------------------------------------
  // 3. Hardware Rental Filter Tabs
  // ------------------------------------------------------------------
  const hardwareTabs = document.querySelectorAll('.hardware-tabs .tab-pill');
  const hardwareCards = document.querySelectorAll('.hardware-cards-grid .hardware-card');

  hardwareTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      hardwareTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.dataset.filter || 'all';

      hardwareCards.forEach((card) => {
        const category = card.dataset.category;
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // ------------------------------------------------------------------
  // 4. Holographic HUD Live Telemetry Simulator (Hero Section)
  // ------------------------------------------------------------------
  const heroLiveTemp = document.getElementById('heroLiveTemp');
  const heroLiveHumidity = document.getElementById('heroLiveHumidity');
  const heroTempBar = document.getElementById('heroTempBar');
  const btnSimulateWarning = document.getElementById('btnSimulateTempWarning');

  let currentTemp = 4.2;
  let currentHumidity = 45;
  let isSimulatedAlert = false;

  function updateHudValues() {
    if (!heroLiveTemp) return;

    if (!isSimulatedAlert) {
      const delta = (Math.random() - 0.5) * 0.2;
      currentTemp = Math.round((currentTemp + delta) * 10) / 10;
      if (currentTemp < 3.8) currentTemp = 3.9;
      if (currentTemp > 4.5) currentTemp = 4.4;

      heroLiveTemp.textContent = currentTemp.toFixed(1);
      if (heroLiveHumidity) {
        currentHumidity = Math.floor(44 + Math.random() * 3);
        heroLiveHumidity.textContent = currentHumidity;
      }

      const pct = Math.min(100, Math.max(10, ((currentTemp - 2) / 6) * 100));
      if (heroTempBar) {
        heroTempBar.style.width = `${pct}%`;
        heroTempBar.style.background = 'linear-gradient(90deg, var(--signal-radar), var(--signal-safe))';
      }
    }
  }

  setInterval(updateHudValues, 3000);

  if (btnSimulateWarning) {
    btnSimulateWarning.addEventListener('click', () => {
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
        btnSimulateWarning.innerHTML = '<span>🔄 إعادة ضبط القراءة</span>';
      } else {
        currentTemp = 4.2;
        if (heroLiveTemp) {
          heroLiveTemp.textContent = currentTemp.toFixed(1);
          heroLiveTemp.classList.remove('text-crimson');
        }
        btnSimulateWarning.innerHTML = '<span>⚡ محاكاة قراءة</span>';
        updateHudValues();
      }
    });
  }

  // ------------------------------------------------------------------
  // 5. Authentication & Login Form Logic
  // ------------------------------------------------------------------
  const loginForm = document.getElementById('loginForm');
  const employeeBarcode = document.getElementById('employeeBarcode');
  const loginError = document.getElementById('loginError');
  const loginErrorText = document.getElementById('loginErrorText');
  const loginSpinner = document.getElementById('loginSpinner');
  const loginBtnText = document.getElementById('loginBtnText');
  const useDemoData = document.getElementById('useDemoData');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const barcode = employeeBarcode?.value?.trim();

      if (!barcode) return;

      if (loginSpinner) loginSpinner.style.display = 'inline-block';
      if (loginBtnText) loginBtnText.textContent = 'جاري التحقق والاتصال...';
      if (loginError) loginError.style.display = 'none';

      try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode })
        });

        const data = await response.json();

        if (response.ok && data.success && data.token) {
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          
          if (loginBtnText) loginBtnText.textContent = '✓ تم التحقق بنجاح!';
          switchView('controlCenter');
        } else {
          throw new Error(data.error || 'رمز الموظف غير مسجل');
        }
      } catch (err) {
        if (loginError) {
          loginError.style.display = 'flex';
          if (loginErrorText) {
            loginErrorText.textContent = err.message || 'حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً.';
          }
        }
      } finally {
        if (loginSpinner) loginSpinner.style.display = 'none';
        if (loginBtnText) loginBtnText.textContent = 'تسجيل الدخول وفتح مركز العمليات 🚀';
      }
    });
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

  if (btnDashLogout) {
    btnDashLogout.addEventListener('click', () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      switchView('home');
    });
  }

  // ------------------------------------------------------------------
  // 6. Control Center Live Data Engine & Operations
  // ------------------------------------------------------------------
  const dashUserName = document.getElementById('dashUserName');
  const dashUserRole = document.getElementById('dashUserRole');
  const dashLastSyncTime = document.getElementById('dashLastSyncTime');
  const btnRefreshDashboard = document.getElementById('btnRefreshDashboard');

  function updateSyncTimestamp() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (dashLastSyncTime) dashLastSyncTime.textContent = timeStr;
  }

  async function loadDashboardState() {
    // Populate user profile info
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

    // Fetch live dashboard metrics from Cloudflare Hono Backend
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && token !== 'demo_session_token_123') {
      try {
        const res = await fetch(`${API_BASE}/api/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const dashData = await res.json();
          if (dashData.stats) {
            const elTotal = document.getElementById('dashTotalShipments');
            const elAlerts = document.getElementById('dashActiveAlerts');
            if (elTotal) elTotal.textContent = dashData.stats.totalMonitored || 128;
            if (elAlerts) elAlerts.textContent = String(dashData.stats.activeAlerts).padStart(2, '0');
          }
        }
      } catch (err) {
        console.warn('Using local fallback telemetry metrics:', err);
      }
    }
  }

  if (btnRefreshDashboard) {
    btnRefreshDashboard.addEventListener('click', () => {
      btnRefreshDashboard.innerHTML = '<span>جاري التحديث...</span>';
      setTimeout(() => {
        loadDashboardState();
        btnRefreshDashboard.innerHTML = '<span>🔄 تم التحديث بنجاح</span>';
        setTimeout(() => {
          btnRefreshDashboard.innerHTML = '<span>🔄 تحديث البيانات الحية</span>';
        }, 1500);
      }, 600);
    });
  }

  // ------------------------------------------------------------------
  // 7. Dynamic Incident Escalation Timer Engine
  // ------------------------------------------------------------------
  const escalationLiveTimer = document.getElementById('escalationLiveTimer');
  const toggleEscalationTimerBtn = document.getElementById('toggleEscalationTimerBtn');
  const timerPausePlayIcon = document.getElementById('timerPausePlayIcon');

  let escalationSeconds = 462; // 07:42
  let isTimerRunning = true;
  let escalationTimerInterval = null;

  function runEscalationTimer() {
    clearInterval(escalationTimerInterval);
    escalationTimerInterval = setInterval(() => {
      if (isTimerRunning) {
        escalationSeconds++;
        const mins = String(Math.floor(escalationSeconds / 60)).padStart(2, '0');
        const secs = String(escalationSeconds % 60).padStart(2, '0');
        if (escalationLiveTimer) escalationLiveTimer.textContent = `${mins}:${secs}`;
      }
    }, 1000);
  }

  if (toggleEscalationTimerBtn) {
    toggleEscalationTimerBtn.addEventListener('click', () => {
      isTimerRunning = !isTimerRunning;
      if (timerPausePlayIcon) {
        timerPausePlayIcon.textContent = isTimerRunning ? '⏸' : '▶';
      }
    });
  }

  runEscalationTimer();

  // ------------------------------------------------------------------
  // 8. Quality Policy & Sign-off Approval Form Logic
  // ------------------------------------------------------------------
  const qualityApprovalForm = document.getElementById('qualityApprovalForm');
  const qaDecisionReason = document.getElementById('qaDecisionReason');
  const qaCustomReason = document.getElementById('qaCustomReason');
  const qaSuccessAlert = document.getElementById('qaSuccessAlert');
  const qaSubmitBtn = document.getElementById('qaSubmitBtn');
  const qaBtnSpinner = document.getElementById('qaBtnSpinner');
  const qaBtnText = document.getElementById('qaBtnText');
  const qaTimestamp = document.getElementById('qaTimestamp');

  function initQualityTimestamp() {
    if (qaTimestamp) {
      const now = new Date();
      qaTimestamp.value = `${now.toLocaleDateString('ar-SA')} - ${now.toLocaleTimeString('ar-SA')}`;
    }
  }

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

  // ------------------------------------------------------------------
  // 9. REAL INTERACTIVE LEAFLET GIS FLEET RADAR & MOVEMENT SIMULATOR
  // ------------------------------------------------------------------
  let gisMap = null;
  let truckMarker1002 = null;
  let truckPathIndex = 0;
  let truckInterpolateStep = 0;

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

  const drawerTruckTitle = document.getElementById('drawerTruckTitle');
  const drawerStatusBadge = document.getElementById('drawerStatusBadge');
  const drawerDriverName = document.getElementById('drawerDriverName');
  const drawerTemp = document.getElementById('drawerTemp');
  const drawerHumidity = document.getElementById('drawerHumidity');
  const drawerSpeed = document.getElementById('drawerSpeed');
  const drawerLocation = document.getElementById('drawerLocation');
  const drawerGpsCoords = document.getElementById('drawerGpsCoords');
  const drawerEta = document.getElementById('drawerEta');
  const shipmentDetailDrawer = document.getElementById('shipmentDetailDrawer');
  const toggleShipmentDrawerBtn = document.getElementById('toggleShipmentDrawerBtn');
  const drawerToggleIcon = document.getElementById('drawerToggleIcon');
  const btnRecenterSaudiMap = document.getElementById('btnRecenterSaudiMap');
  const btnFollowTruck1002 = document.getElementById('btnFollowTruck1002');

  function updateInspectionDrawer(info) {
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

  function initOrUpdateGisMap() {
    const mapContainer = document.getElementById('gisLiveMap');
    if (!mapContainer || typeof L === 'undefined') return;

    if (!gisMap) {
      // Create Leaflet Map centered on Saudi Arabia
      gisMap = L.map('gisLiveMap', {
        center: [20.5, 44.5],
        zoom: 6,
        zoomControl: true,
        attributionControl: false
      });

      // Add CartoDB Dark Matter Cyber Basemap Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd'
      }).addTo(gisMap);

      // Draw Main Transport Polyline
      const latlngs = waypointsJazanToRiyadh.map(wp => [wp.lat, wp.lng]);
      
      // Background Glow Path
      L.polyline(latlngs, {
        color: '#00F0FF',
        weight: 6,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(gisMap);

      // Foreground Dashed Neon Path
      L.polyline(latlngs, {
        color: '#00FF66',
        weight: 3,
        dashArray: '8, 8',
        opacity: 0.9
      }).addTo(gisMap);

      // Add Warehouse Hub Markers
      const hubs = [
        { lat: 16.8892, lng: 42.5706, name: 'ميناء ومستودع جازان للتبريد', role: 'نقطة الانطلاق البحرية' },
        { lat: 18.3000, lng: 42.7333, name: 'مركز التوزيع اللوجستي (عسير)', role: 'محطة الفحص المرحلي' },
        { lat: 24.7136, lng: 46.6753, name: 'المستودع الرئيسي (الرياض)', role: 'مركز القيادة والفرز' }
      ];

      hubs.forEach(hub => {
        const hubIcon = L.divIcon({
          className: 'hub-gis-marker',
          html: `<div class="hub-marker-inner">🏢</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18]
        });

        L.marker([hub.lat, hub.lng], { icon: hubIcon })
          .addTo(gisMap)
          .bindPopup(`
            <div class="map-custom-popup">
              <div class="map-popup-header">
                <strong>🏢 ${hub.name}</strong>
              </div>
              <div class="map-popup-grid">
                <div><span>الدور:</span> <strong class="text-cyan">${hub.role}</strong></div>
                <div><span>حالة التبريد:</span> <strong class="text-emerald">✓ آمن ومطابق</strong></div>
              </div>
            </div>
          `);
      });

      // Add Static Fleet Trucks
      // Truck 1: Jazan (Safe)
      const truck1 = L.marker([16.8892, 42.5706], { icon: createCustomTruckIcon('🚚', 'truck-safe') }).addTo(gisMap);
      truck1.bindPopup(`
        <div class="map-custom-popup">
          <div class="map-popup-header">
            <strong>🚚 شاحنة #RQ-1001 (جازان)</strong>
            <span class="badge-tag-emerald">Safe</span>
          </div>
          <div class="map-popup-grid">
            <div><span>السائق:</span> <strong>خالد المالكي</strong></div>
            <div><span>الحرارة:</span> <strong class="text-emerald tabular-mono">4.0°C</strong></div>
            <div><span>الحالة:</span> <strong class="text-emerald">مستقرة وجاهزة</strong></div>
          </div>
        </div>
      `);
      truck1.on('click', () => {
        updateInspectionDrawer({
          title: 'تفاصيل الشاحنة #RQ-1001',
          status: 'في محطة جازان (Idle)',
          badgeColor: 'emerald',
          driver: 'خالد المالكي',
          temp: 4.0,
          tempState: 'مثالي',
          tempColor: 'emerald',
          humidity: 44,
          speed: 0,
          location: 'ميناء جازان للتبريد',
          lat: 16.8892,
          lng: 42.5706,
          eta: '10:00 (جاهز للتحرك)'
        });
      });

      // Truck 3: Khamis Mushait (Safe)
      const truck3 = L.marker([18.3000, 42.7333], { icon: createCustomTruckIcon('🚚', 'truck-safe') }).addTo(gisMap);
      truck3.bindPopup(`
        <div class="map-custom-popup">
          <div class="map-popup-header">
            <strong>🚚 شاحنة #RQ-1003 (خميس مشيط)</strong>
            <span class="badge-tag-emerald">Safe</span>
          </div>
          <div class="map-popup-grid">
            <div><span>السائق:</span> <strong>سلطان الغامدي</strong></div>
            <div><span>الحرارة:</span> <strong class="text-emerald tabular-mono">3.8°C</strong></div>
            <div><span>الموقع:</span> <strong>مستودع عسير</strong></div>
          </div>
        </div>
      `);
      truck3.on('click', () => {
        updateInspectionDrawer({
          title: 'تفاصيل الشاحنة #RQ-1003',
          status: 'تفريغ البضاعة (Unloading)',
          badgeColor: 'emerald',
          driver: 'سلطان الغامدي',
          temp: 3.8,
          tempState: 'مطابق',
          tempColor: 'emerald',
          humidity: 46,
          speed: 0,
          location: 'مستودع خميس مشيط',
          lat: 18.3000,
          lng: 42.7333,
          eta: 'مكتمل الوصول ✓'
        });
      });

      // Truck 4: Near Riyadh (Critical Alert)
      const truck4 = L.marker([23.8500, 46.8000], { icon: createCustomTruckIcon('🚚', 'truck-danger') }).addTo(gisMap);
      truck4.bindPopup(`
        <div class="map-custom-popup">
          <div class="map-popup-header">
            <strong>🚚 شاحنة #RQ-1004 (تجاوز حراري) 🚨</strong>
            <span class="badge-tag-crimson">Critical</span>
          </div>
          <div class="map-popup-grid">
            <div><span>السائق:</span> <strong>فهد الدوسري</strong></div>
            <div><span>الحرارة:</span> <strong class="text-crimson tabular-mono">11.2°C</strong></div>
            <div><span>الإجراء:</span> <strong class="text-crimson">توجيه لوحدة تبريد طارئة</strong></div>
          </div>
        </div>
      `);
      truck4.on('click', () => {
        updateInspectionDrawer({
          title: 'تفاصيل الشاحنة #RQ-1004',
          status: 'تجاوز حراري حرج (Critical)',
          badgeColor: 'crimson',
          driver: 'فهد الدوسري',
          temp: 11.2,
          tempState: 'تجاوز حرج',
          tempColor: 'crimson',
          humidity: 56,
          speed: 85,
          location: 'طريق الخرج - الرياض',
          lat: 23.8500,
          lng: 46.8000,
          eta: '13:10 (استقبال طوارئ)'
        });
      });

      // Active Moving Truck 2: RQ-1002 (In Transit Simulation)
      const startCoord = waypointsJazanToRiyadh[2]; // Abu Arish
      truckMarker1002 = L.marker([startCoord.lat, startCoord.lng], {
        icon: createCustomTruckIcon('🚚', 'truck-warn')
      }).addTo(gisMap);

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
          title: 'تفاصيل الشاحنة #RQ-1002',
          status: 'في الطريق (In Transit)',
          badgeColor: 'amber',
          driver: 'أحمد السعيد',
          temp: 6.2,
          tempState: 'تجاوز طفيف مسموح',
          tempColor: 'amber',
          humidity: 48,
          speed: 65,
          location: 'طريق جازان - عسير السريع',
          lat: curPos.lat,
          lng: curPos.lng,
          eta: '14:35 (مستودع الرياض)'
        });
      });

      // Start Real Movement Simulation Engine
      startTruckLiveMovement();
    } else {
      gisMap.invalidateSize();
    }
  }

  // Animate Truck 1002 moving smoothly along waypoints
  function startTruckLiveMovement() {
    truckPathIndex = 2; // Start around Abu Arish
    truckInterpolateStep = 0;

    setInterval(() => {
      if (!gisMap || !truckMarker1002) return;

      const p1 = waypointsJazanToRiyadh[truckPathIndex];
      const nextIdx = (truckPathIndex + 1) % waypointsJazanToRiyadh.length;
      const p2 = waypointsJazanToRiyadh[nextIdx];

      truckInterpolateStep += 0.05; // 5% step progress
      if (truckInterpolateStep >= 1) {
        truckInterpolateStep = 0;
        truckPathIndex = nextIdx;
      }

      // Linear Interpolation between GPS coordinates
      const currentLat = p1.lat + (p2.lat - p1.lat) * truckInterpolateStep;
      const currentLng = p1.lng + (p2.lng - p1.lng) * truckInterpolateStep;

      truckMarker1002.setLatLng([currentLat, currentLng]);

      // Update Live Drawer GPS Coordinates in real time
      if (drawerGpsCoords) {
        drawerGpsCoords.textContent = `${currentLat.toFixed(4)}° N, ${currentLng.toFixed(4)}° E`;
      }
      if (drawerLocation) {
        drawerLocation.textContent = p1.name;
      }
      if (drawerSpeed) {
        const jitter = Math.floor(Math.random() * 4) - 2;
        drawerSpeed.textContent = `${Math.max(40, p1.speed + jitter)} كم/س`;
      }
    }, 1500);
  }

  // Recenter Map on Saudi Arabia Overview
  if (btnRecenterSaudiMap) {
    btnRecenterSaudiMap.addEventListener('click', () => {
      if (gisMap) {
        gisMap.flyTo([20.5, 44.5], 6, { duration: 1.5 });
      }
    });
  }

  // Focus & Follow Active Truck RQ-1002
  if (btnFollowTruck1002) {
    btnFollowTruck1002.addEventListener('click', () => {
      if (gisMap && truckMarker1002) {
        const pos = truckMarker1002.getLatLng();
        gisMap.flyTo(pos, 11, { duration: 1.5 });
        truckMarker1002.openPopup();
      }
    });
  }

  // Toggle Drawer Visibility
  let isDrawerOpen = true;
  if (toggleShipmentDrawerBtn && shipmentDetailDrawer) {
    toggleShipmentDrawerBtn.addEventListener('click', () => {
      isDrawerOpen = !isDrawerOpen;
      shipmentDetailDrawer.style.display = isDrawerOpen ? 'block' : 'none';
      if (drawerToggleIcon) drawerToggleIcon.textContent = isDrawerOpen ? '▼' : '▲';
    });
  }

  // ------------------------------------------------------------------
  // 10. Alert Resolution Action
  // ------------------------------------------------------------------
  const btnResolveAlertALT = document.getElementById('btnResolveAlertALT');
  const alertCardALT = document.getElementById('alertCard-ALT-2026-0647');
  const dashActiveAlerts = document.getElementById('dashActiveAlerts');

  if (btnResolveAlertALT && alertCardALT) {
    btnResolveAlertALT.addEventListener('click', async () => {
      btnResolveAlertALT.innerHTML = '<span>جاري إرسال إغلاق التنبيه...</span>';
      
      const token = localStorage.getItem(TOKEN_KEY);
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
  const sideNavItems = document.querySelectorAll('.sidebar-nav .side-nav-item');

  sideNavItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      sideNavItems.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const targetId = btn.dataset.targetSection;
      if (targetId) {
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  });

  // ------------------------------------------------------------------
  // 12. Device Fleet Health, Filter Tabs & Telemetry Ingestion Console
  // ------------------------------------------------------------------
  const healthFilterTabs = document.querySelectorAll('.health-filter-tabs .health-tab-btn');
  const deviceFleetRows = document.querySelectorAll('#deviceFleetTableBody tr');
  const btnPingAllDevices = document.getElementById('btnPingAllDevices');
  const btnCopyIngestUrl = document.getElementById('btnCopyIngestUrl');
  const btnSimulateHardwarePacket = document.getElementById('btnSimulateHardwarePacket');
  const ingestResponseLog = document.getElementById('ingestResponseLog');
  const ingestResponseJson = document.getElementById('ingestResponseJson');

  // Filter Tabs
  healthFilterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      healthFilterTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.dataset.fleetFilter || 'all';

      deviceFleetRows.forEach((row) => {
        const type = row.dataset.deviceType;
        if (filter === 'all' || type === filter) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });

  // Ping All Devices
  if (btnPingAllDevices) {
    btnPingAllDevices.addEventListener('click', () => {
      const origText = btnPingAllDevices.innerHTML;
      btnPingAllDevices.innerHTML = '<span>📡 جاري إرسال إشارة Ping لكافة الأجهزة (24/24)...</span>';
      btnPingAllDevices.disabled = true;

      setTimeout(() => {
        btnPingAllDevices.innerHTML = '<span>✓ تم استلام نبضات الاستجابة من 24 جهازاً بنجاح (RTT: 42ms)</span>';
        btnPingAllDevices.style.borderColor = 'var(--signal-safe)';
        btnPingAllDevices.style.color = 'var(--signal-safe)';

        setTimeout(() => {
          btnPingAllDevices.innerHTML = origText;
          btnPingAllDevices.style.borderColor = '';
          btnPingAllDevices.style.color = '';
          btnPingAllDevices.disabled = false;
        }, 3000);
      }, 900);
    });
  }

  // Copy Ingest URL
  if (btnCopyIngestUrl) {
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

  // Simulate Hardware Packet Send
  if (btnSimulateHardwarePacket) {
    btnSimulateHardwarePacket.addEventListener('click', async () => {
      btnSimulateHardwarePacket.innerHTML = '<span>📡 جاري الإرسال إلى السيرفر الحي...</span>';
      btnSimulateHardwarePacket.disabled = true;

      const samplePacket = {
        device_id: "RQ-TRACKER-1002",
        temperature: Number((3.8 + Math.random() * 0.8).toFixed(1)),
        humidity: Math.floor(45 + Math.random() * 4),
        vibration: 0.02,
        lat: 17.0650,
        lng: 42.8820,
        speed: 62,
        battery: 95,
        voltage: 4.14,
        signal_dbm: -65,
        timestamp: new Date().toISOString()
      };

      try {
        const res = await fetch(`${API_BASE}/api/telemetry/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(samplePacket)
        });
        const data = await res.json();

        if (ingestResponseLog && ingestResponseJson) {
          ingestResponseLog.style.display = 'block';
          ingestResponseJson.textContent = JSON.stringify(data, null, 2);
        }
      } catch {
        // Fallback demo response
        const fallbackRes = {
          success: true,
          message: "Telemetry received and logged successfully [Local Simulated Ingest]",
          processed: samplePacket
        };
        if (ingestResponseLog && ingestResponseJson) {
          ingestResponseLog.style.display = 'block';
          ingestResponseJson.textContent = JSON.stringify(fallbackRes, null, 2);
        }
      }

      btnSimulateHardwarePacket.innerHTML = '<span>✓ تم استقبال القراءة وتحديث اللوحة!</span>';
      setTimeout(() => {
        btnSimulateHardwarePacket.innerHTML = '<span>📡 محاكاة إرسال قراءة من الجهاز الفعلي</span>';
        btnSimulateHardwarePacket.disabled = false;
      }, 2500);
    });
  }

  // Global window helpers for table action buttons
  window.pingSingleDevice = function(deviceId) {
    alert(`[Hardware Ping] تم إرسال نبضة فحص إلى الجهاز ${deviceId} واستلام الرد: Online (RTT: 38ms) - Battery: OK`);
  };

  window.requestBatterySwap = function(deviceId) {
    alert(`[Work Order] تم فتح تذكرة صيانة فورية لتبديل بطارية الجهاز ${deviceId} لفريق المستودع.`);
  };

  // ------------------------------------------------------------------
  // 13. Smooth Scroll for Landing Page Buttons
  // ------------------------------------------------------------------
  const heroExploreHardwareBtn = document.getElementById('heroExploreHardwareBtn');

  if (heroExploreHardwareBtn) {
    heroExploreHardwareBtn.addEventListener('click', () => {
      const el = document.getElementById('hardware');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
});
