const homeView = document.getElementById('homeView');
const dashboardView = document.getElementById('dashboardView');
const openDashboardButtons = [
	document.getElementById('openDashboard'),
	document.getElementById('gotoDashboardTop')
];
const backToHome = document.getElementById('backToHome');
const exploreSolutions = document.getElementById('exploreSolutions');
const solutionSection = document.getElementById('solutions');
const solutionTabs = Array.from(document.querySelectorAll('[data-solution-tab]'));
const solutionPanels = Array.from(document.querySelectorAll('[data-solution-panel]'));
const solutionTriggers = Array.from(document.querySelectorAll('[data-solution-target]'));

const tempChart = document.getElementById('tempChart');
const chartTooltip = document.getElementById('chartTooltip');
const chartCurrentValue = document.getElementById('chartCurrentValue');

// Authentication & Live API integrations
const API_BASE = 'https://raquib-api.alghzwanyk7.workers.dev';
const TOKEN_KEY = 'raquib_jwt_token';
const WORKER_KEY = 'raquib_connected_worker';

const loginPanel = document.getElementById('loginPanel');
const dashboardContent = document.getElementById('dashboardContent');
const loginForm = document.getElementById('loginForm');
const employeeBarcode = document.getElementById('employeeBarcode');
const loginError = document.getElementById('loginError');
const useDemoData = document.getElementById('useDemoData');
const logoutBtn = document.getElementById('logoutBtn');
const workerProfileCard = document.getElementById('workerProfileCard');
const connectedWorkerName = document.getElementById('connectedWorkerName');
const connectedWorkerRole = document.getElementById('connectedWorkerRole');
const alertsList = document.getElementById('alertsList');

// App Companion Modal Elements
const appCompanionModal = document.getElementById('appCompanionModal');
const openModalBtn = document.getElementById('openDownloadModalBtn');
const openModalSidebar = document.getElementById('openDownloadModalSidebar');
const closeModalBtn = document.getElementById('closeAppModalBtn');

// Login Tabs and Pairing Elements
const tabBarcodeBtn = document.getElementById('tabBarcodeBtn');
const tabQrBtn = document.getElementById('tabQrBtn');
const tabBarcodeContent = document.getElementById('tabBarcodeContent');
const tabQrContent = document.getElementById('tabQrContent');

const qrLoadingSpinner = document.getElementById('qrLoadingSpinner');
const pairingQrImg = document.getElementById('pairingQrImg');
const qrExpiredMsg = document.getElementById('qrExpiredMsg');
const refreshPairingQrBtn = document.getElementById('refreshPairingQrBtn');
const qrPairingStatus = document.getElementById('qrPairingStatus');
const qrStatusText = document.getElementById('qrStatusText');

let pairingIntervalId = null;
let currentPairingId = null;
let qrCountdownIntervalId = null;
let isUsingDemo = false;

// Default demo/mock data
const mockData = {
	temp: '4°C',
	humidity: '45%',
	vibration: 'مستقر (0G)',
	totalShipments: '128',
	activeAlerts: '03',
	safeShipments: '121'
};

let temperatureSeries = [
	{ time: '06:00', value: 4.2 },
	{ time: '08:00', value: 4.1 },
	{ time: '10:00', value: 4.4 },
	{ time: '12:00', value: 4.6 },
	{ time: '14:00', value: 4.3 },
	{ time: '16:00', value: 4.5 },
	{ time: '18:00', value: 4.2 },
	{ time: '20:00', value: 4.0 },
	{ time: '22:00', value: 3.9 },
	{ time: '00:00', value: 4.1 },
	{ time: '02:00', value: 4.3 },
	{ time: '04:00', value: 4.2 }
];

function showView(viewName, options = {}) {
	const showDashboard = viewName === 'dashboard';
	homeView.classList.toggle('active', !showDashboard);
	dashboardView.classList.toggle('active', showDashboard);
	
	if (showDashboard) {
		checkAuthState();
	}

	if (options.scrollToTop !== false) {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
}

function activateSolutionTab(tabName) {
	solutionTabs.forEach((button) => {
		const isActive = button.dataset.solutionTab === tabName;
		button.classList.toggle('active', isActive);
		button.setAttribute('aria-selected', String(isActive));
	});

	solutionPanels.forEach((panel) => {
		panel.classList.toggle('active', panel.dataset.solutionPanel === tabName);
	});
}

openDashboardButtons.forEach((button) => {
	button.addEventListener('click', () => showView('dashboard'));
});

backToHome.addEventListener('click', () => showView('home'));

solutionTabs.forEach((button) => {
	button.addEventListener('click', () => activateSolutionTab(button.dataset.solutionTab));
});

solutionTriggers.forEach((trigger) => {
	trigger.addEventListener('click', (event) => {
		event.preventDefault();
		const tabName = trigger.dataset.solutionTarget || 'services';
		showView('home', { scrollToTop: false });
		activateSolutionTab(tabName);
		solutionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
	});
});

exploreSolutions.addEventListener('click', () => {
	showView('home', { scrollToTop: false });
	activateSolutionTab('services');
	solutionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Render Temperature SVG Chart
function renderTemperatureChart() {
	if (!tempChart) {
		return;
	}

	const width = 960;
	const height = 360;
	const padding = { top: 24, right: 28, bottom: 52, left: 52 };
	const plotWidth = width - padding.left - padding.right;
	const plotHeight = height - padding.top - padding.bottom;
	const values = temperatureSeries.map((point) => point.value);
	const minValue = Math.min(...values) - 0.2;
	const maxValue = Math.max(...values) + 0.2;
	const yScale = (value) => padding.top + ((maxValue - value) / (maxValue - minValue)) * plotHeight;
	const xScale = (index) => padding.left + (plotWidth / (temperatureSeries.length - 1)) * index;

	const points = temperatureSeries.map((point, index) => ({
		...point,
		x: xScale(index),
		y: yScale(point.value)
	}));

	const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
	const areaPath = [
		`M ${points[0].x} ${height - padding.bottom}`,
		...points.map((point) => `L ${point.x} ${point.y}`),
		`L ${points[points.length - 1].x} ${height - padding.bottom}`,
		'Z'
	].join(' ');

	// Dynamic Y Ticks calculation
	const yTicksCount = 6;
	const yTicks = [];
	for (let i = 0; i < yTicksCount; i++) {
		yTicks.push(minValue + (i * (maxValue - minValue)) / (yTicksCount - 1));
	}
	const xLabels = temperatureSeries.map((point) => point.time);

	tempChart.innerHTML = `
	  <defs>
	    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
	      <stop offset="0%" stop-color="rgba(14, 165, 233, 0.36)" />
	      <stop offset="100%" stop-color="rgba(14, 165, 233, 0.02)" />
	    </linearGradient>
	  </defs>
	  ${yTicks.map((tick) => {
		const y = yScale(tick);
		return `<line class="chart-grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" />`;
	  }).join('')}
	  <line class="chart-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" />
	  <line class="chart-axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" />
	  ${yTicks.map((tick) => {
		const y = yScale(tick);
		return `<text class="chart-label" x="18" y="${y + 4}">${tick.toFixed(1)}°</text>`;
	  }).join('')}
	  ${xLabels.map((label, index) => {
		const x = xScale(index);
		return `<text class="chart-label" x="${x}" y="${height - 18}" text-anchor="middle">${label}</text>`;
	  }).join('')}
	  <path class="chart-area" d="${areaPath}" />
	  <path class="chart-line" d="${linePath}" />
	  <line class="chart-current-line" x1="${points[points.length - 1].x}" y1="${padding.top}" x2="${points[points.length - 1].x}" y2="${height - padding.bottom}" />
	  <circle class="chart-point chart-current-tag" cx="${points[points.length - 1].x}" cy="${points[points.length - 1].y}" r="7" />
	  ${points.map((point) => `<circle class="chart-point" data-time="${point.time}" data-value="${point.value.toFixed(1)}" cx="${point.x}" cy="${point.y}" r="5" tabindex="0" />`).join('')}
	`;

	const lastVal = temperatureSeries[temperatureSeries.length - 1].value;
	chartCurrentValue.textContent = `${lastVal.toFixed(1)}°C`;

	const circles = Array.from(tempChart.querySelectorAll('.chart-point[data-time]'));

	const showTooltip = (circle) => {
		const rect = tempChart.getBoundingClientRect();
		const pointRect = circle.getBoundingClientRect();
		const left = pointRect.left - rect.left + pointRect.width / 2;
		const top = pointRect.top - rect.top;

		chartTooltip.hidden = false;
		chartTooltip.innerHTML = `<strong>${circle.dataset.value}°C</strong><br>${circle.dataset.time}`;
		chartTooltip.style.left = `${left}px`;
		chartTooltip.style.top = `${top}px`;
		circles.forEach((item) => item.classList.toggle('active', item === circle));
	};

	const hideTooltip = () => {
		chartTooltip.hidden = true;
		circles.forEach((item) => item.classList.remove('active'));
	};

	circles.forEach((circle) => {
		circle.addEventListener('mouseenter', () => showTooltip(circle));
		circle.addEventListener('focus', () => showTooltip(circle));
		circle.addEventListener('mouseleave', hideTooltip);
		circle.addEventListener('blur', hideTooltip);
	});

	tempChart.addEventListener('mouseleave', hideTooltip);
	chartTooltip.hidden = true;
}

// Authentication Logic
function checkAuthState() {
	const token = localStorage.getItem(TOKEN_KEY);
	const workerString = localStorage.getItem(WORKER_KEY);

	if (token && workerString && !isUsingDemo) {
		const worker = JSON.parse(workerString);
		loginPanel.style.display = 'none';
		dashboardContent.style.display = 'block';
		logoutBtn.style.display = 'block';
		
		// Set connected worker details
		workerProfileCard.style.display = 'block';
		connectedWorkerName.textContent = worker.nameEn || worker.name;
		connectedWorkerRole.textContent = worker.role.toUpperCase();

		// Load Live Data
		loadLiveDashboard(token);
		
		// Stop pairing poll since we are logged in
		stopPairingPoll();
	} else if (isUsingDemo) {
		loginPanel.style.display = 'none';
		dashboardContent.style.display = 'block';
		logoutBtn.style.display = 'block';
		workerProfileCard.style.display = 'none';
		
		loadDemoDashboard();
		
		// Stop pairing poll since we are logged in
		stopPairingPoll();
	} else {
		loginPanel.style.display = 'flex';
		dashboardContent.style.display = 'none';
		logoutBtn.style.display = 'none';
		workerProfileCard.style.display = 'none';
		stopPairingPoll();
	}
}

// Handle login submit
loginForm.addEventListener('submit', async (e) => {
	e.preventDefault();
	const barcode = employeeBarcode.value.trim();
	if (!barcode) return;

	try {
		loginError.style.display = 'none';
		const response = await fetch(`${API_BASE}/api/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ barcode })
		});

		if (!response.ok) {
			throw new Error('Authentication failed');
		}

		const data = await response.json();
		if (data.success && data.token) {
			isUsingDemo = false;
			localStorage.setItem(TOKEN_KEY, data.token);
			localStorage.setItem(WORKER_KEY, JSON.stringify(data.user));
			employeeBarcode.value = '';
			checkAuthState();
		} else {
			throw new Error('Invalid response');
		}
	} catch (err) {
		console.error('Login error:', err);
		loginError.style.display = 'block';
	}
});

// Demo Data Access
useDemoData.addEventListener('click', (e) => {
	e.preventDefault();
	isUsingDemo = true;
	checkAuthState();
});

// Logout
logoutBtn.addEventListener('click', () => {
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(WORKER_KEY);
	isUsingDemo = false;
	checkAuthState();
});

// Load Live Dashboard Data
async function loadLiveDashboard(token) {
	try {
		// 1. Fetch Dashboard API
		const dashboardResponse = await fetch(`${API_BASE}/api/dashboard`, {
			headers: { 'Authorization': `Bearer ${token}` }
		});

		if (!dashboardResponse.ok) {
			if (dashboardResponse.status === 401) {
				logoutBtn.click();
				return;
			}
			throw new Error('Failed to load dashboard data');
		}

		const dbData = await dashboardResponse.json();
		
		// Update KPIs
		document.getElementById('kpiTotalShipments').textContent = dbData.stats.totalMonitored;
		document.getElementById('kpiActiveAlerts').textContent = String(dbData.stats.activeAlerts).padStart(2, '0');
		document.getElementById('kpiSafeShipments').textContent = dbData.stats.totalMonitored - dbData.stats.activeAlerts;

		// Find the active temperature sensor or default to first
		const tempSensor = dbData.sensors.find(s => s.status !== 'empty') || dbData.sensors[0];
		
		if (tempSensor) {
			const tempVal = tempSensor.temperature;
			document.getElementById('tempValue').textContent = `${tempVal.toFixed(1)}°C`;
			document.getElementById('activeShipmentTag').textContent = `الشحنة النشطة الحالية: ${tempSensor.productEn} (${tempSensor.shelf})`;
			
			// Update status chips
			const tempChip = document.getElementById('tempStatusChip');
			let statusColorClass = 'red';
			if (tempSensor.status === 'safe') {
				statusColorClass = 'green';
			} else if (tempSensor.status === 'warning') {
				statusColorClass = 'yellow';
			}
			tempChip.className = `chip chip-${statusColorClass}`;
			tempChip.textContent = tempSensor.status.toUpperCase();

			// Update the chart series with live temp
			temperatureSeries[temperatureSeries.length - 1].value = tempVal;
		}

		// Fixed/Default values for non-temp parameters in the dashboard
		document.getElementById('humidityValue').textContent = '45%';
		document.getElementById('vibrationValue').textContent = 'مستقر (0G)';
		
		renderTemperatureChart();

		// 2. Fetch active alerts
		loadLiveAlerts(token);

	} catch (err) {
		console.error('Error fetching live dashboard:', err);
	}
}

// Fetch and render live alerts list
async function loadLiveAlerts(token) {
	try {
		const alertsResponse = await fetch(`${API_BASE}/api/alerts`, {
			headers: { 'Authorization': `Bearer ${token}` }
		});

		if (!alertsResponse.ok) throw new Error('Failed to fetch alerts');
		const alerts = await alertsResponse.json();

		renderAlerts(alerts, token);
	} catch (err) {
		console.error('Error fetching live alerts:', err);
	}
}

// Render alert cards in the alerts list
function renderAlerts(alerts, token = null) {
	if (!alertsList) return;

	if (!alerts || alerts.length === 0) {
		alertsList.innerHTML = `
			<div class="no-alerts-msg" style="text-align: center; padding: 24px; color: var(--muted); font-weight: 500;">
				لا توجد تنبيهات نشطة حالياً. كل الأنظمة مستقرة.
			</div>
		`;
		return;
	}

	alertsList.innerHTML = alerts.map(alert => {
		const isCritical = alert.severity === 'critical';
		const severityAr = isCritical ? 'حرجة للغاية' : 'تحذير';
		const badgeClass = isCritical ? 'pill-red' : 'pill-yellow';

		return `
			<div class="alert-item-card ${isCritical ? 'critical' : 'warning'}">
				<div class="alert-item-header">
					<div class="alert-item-title">
						<span class="status-pill ${badgeClass}">${severityAr}</span>
						<strong>تنبيه بيئي: ${alert.productEn || alert.product}</strong>
					</div>
					<div class="alert-item-meta">
						الرف: ${alert.shelf} | القراءة: ${alert.currentTemp}°C (المدى: ${alert.safeMin}-${alert.safeMax}°C)
					</div>
				</div>
				
				<div class="alert-steps-box" style="margin-top: 10px;">
					<strong style="display: block; margin-bottom: 8px; font-size: 0.9rem; color: var(--primary);">خطوات العمل التشغيلية الفورية:</strong>
					${alert.actionSteps.map(step => `
						<div class="alert-step-row">
							<span class="step-num-badge">${step.number}</span>
							<span>${step.textEn || step.text}</span>
						</div>
					`).join('')}
				</div>

				<div class="alert-action-row" style="margin-top: 14px; display: flex; gap: 10px;">
					${token ? `
						<button class="btn btn-primary btn-resolve-alert" data-alert-id="${alert.id}" style="padding: 10px 18px; font-size: 0.9rem; border-radius: 12px; box-shadow: none;">
							تسوية وحل التنبيه (Resolve)
						</button>
					` : `
						<span style="font-size: 0.85rem; color: var(--danger); font-weight: bold; background: rgba(239, 68, 68, 0.08); padding: 8px 12px; border-radius: 10px;">
							سجل الدخول كعامل لتتمكن من تسوية هذا التنبيه
						</span>
					`}
				</div>
			</div>
		`;
	}).join('');

	// Add event listeners to resolve buttons
	const resolveButtons = Array.from(alertsList.querySelectorAll('.btn-resolve-alert'));
	resolveButtons.forEach(btn => {
		btn.addEventListener('click', async () => {
			const alertId = btn.dataset.alertId;
			btn.disabled = true;
			btn.textContent = 'جاري التسوية...';

			try {
				const resolveResponse = await fetch(`${API_BASE}/api/alerts/${alertId}/resolve`, {
					method: 'POST',
					headers: { 
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}` 
					}
				});

				if (!resolveResponse.ok) throw new Error('Failed to resolve alert');
				
				// Reload dashboard
				loadLiveDashboard(token);
			} catch (err) {
				console.error('Error resolving alert:', err);
				btn.disabled = false;
				btn.textContent = 'فشلت التسوية، أعد المحاولة';
			}
		});
	});
}

// Load Demo Dashboard Data
function loadDemoDashboard() {
	document.getElementById('kpiTotalShipments').textContent = mockData.totalShipments;
	document.getElementById('kpiActiveAlerts').textContent = mockData.activeAlerts;
	document.getElementById('kpiSafeShipments').textContent = mockData.safeShipments;

	document.getElementById('tempValue').textContent = mockData.temp;
	document.getElementById('humidityValue').textContent = mockData.humidity;
	document.getElementById('vibrationValue').textContent = mockData.vibration;
	document.getElementById('activeShipmentTag').textContent = 'الشحنة النشطة الحالية: #RQ-000125';
	
	const tempChip = document.getElementById('tempStatusChip');
	tempChip.className = 'chip chip-green';
	tempChip.textContent = 'SAFE';

	// Reset trend value to default demo
	temperatureSeries[temperatureSeries.length - 1].value = 4.2;
	renderTemperatureChart();

	// Render mock alerts
	const mockAlertsList = [
		{
			id: 'DEMO-ALT-1',
			productEn: 'Humulin Insulin (Demo)',
			shelf: 'B-12',
			currentTemp: 11.2,
			safeMin: 2.0,
			safeMax: 8.0,
			severity: 'critical',
			actionSteps: [
				{ number: 1, textEn: 'Go to shelf B-12 in Zone B' },
				{ number: 2, textEn: 'Move shipment to cooling unit C-2' },
				{ number: 3, textEn: 'Scan barcode to confirm completion' }
			]
		}
	];
	renderAlerts(mockAlertsList, null);
}

// Initial triggers
document.getElementById('tempValue').textContent = mockData.temp;
document.getElementById('humidityValue').textContent = mockData.humidity;
document.getElementById('vibrationValue').textContent = mockData.vibration;
document.getElementById('kpiTotalShipments').textContent = mockData.totalShipments;
document.getElementById('kpiActiveAlerts').textContent = mockData.activeAlerts;
document.getElementById('kpiSafeShipments').textContent = mockData.safeShipments;
document.getElementById('heroTempValue').textContent = mockData.temp;
document.getElementById('heroAlertValue').textContent = `${mockData.activeAlerts} Alerts`;

// If user navigates directly to dashboard hash on page load
if (window.location.hash === '#dashboardView') {
	showView('dashboard');
} else {
	renderTemperatureChart();
}

/* ====================================================================
   Scan to Login & Companion App Modal Logic
   ==================================================================== */

// 1. App Companion Modal Event Listeners
function openAppModal(e) {
	if (e) e.preventDefault();
	if (appCompanionModal) appCompanionModal.classList.add('active');
}

function closeAppModal() {
	if (appCompanionModal) appCompanionModal.classList.remove('active');
}

if (openModalBtn) openModalBtn.addEventListener('click', openAppModal);
if (openModalSidebar) openModalSidebar.addEventListener('click', openAppModal);
if (closeModalBtn) closeModalBtn.addEventListener('click', closeAppModal);
if (appCompanionModal) {
	appCompanionModal.addEventListener('click', (e) => {
		if (e.target === appCompanionModal) closeAppModal();
	});
}

// 2. Login Tabs Switching
if (tabBarcodeBtn && tabQrBtn) {
	tabBarcodeBtn.addEventListener('click', () => {
		tabBarcodeBtn.classList.add('active');
		tabQrBtn.classList.remove('active');
		tabBarcodeContent.classList.add('active');
		tabQrContent.classList.remove('active');
		stopPairingPoll();
	});

	tabQrBtn.addEventListener('click', () => {
		tabQrBtn.classList.add('active');
		tabBarcodeBtn.classList.remove('active');
		tabQrContent.classList.add('active');
		tabBarcodeContent.classList.remove('active');
		startPairingSession();
	});
}

// 3. Pairing Session Logic (Scan to Login)
async function startPairingSession() {
	stopPairingPoll();
	
	if (!qrLoadingSpinner || !pairingQrImg || !qrExpiredMsg || !qrPairingStatus || !qrStatusText) return;

	qrLoadingSpinner.style.display = 'flex';
	pairingQrImg.style.display = 'none';
	qrExpiredMsg.style.display = 'none';
	qrPairingStatus.className = 'qr-pairing-status';
	qrStatusText.textContent = 'بانتظار المسح من الهاتف...';

	try {
		const response = await fetch(`${API_BASE}/api/auth/pairing/session`, {
			method: 'POST'
		});
		
		if (!response.ok) throw new Error('Failed to create session');
		
		const data = await response.json();
		if (data.success && data.pairingId) {
			currentPairingId = data.pairingId;
			
			// Generate QR code using qrserver API pointing to standard format
			const qrDataString = `raquib:login:${currentPairingId}`;
			pairingQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=0f172a&data=${encodeURIComponent(qrDataString)}`;
			
			pairingQrImg.onload = () => {
				qrLoadingSpinner.style.display = 'none';
				pairingQrImg.style.display = 'block';
			};

			// Start 5-minute countdown timer
			startQrCountdown(300);

			// Start polling check every 2 seconds
			startPairingPoll();
		}
	} catch (err) {
		console.error('Error starting pairing:', err);
		qrLoadingSpinner.style.display = 'none';
		qrExpiredMsg.style.display = 'flex';
	}
}

function stopPairingPoll() {
	if (pairingIntervalId) {
		clearInterval(pairingIntervalId);
		pairingIntervalId = null;
	}
	if (qrCountdownIntervalId) {
		clearInterval(qrCountdownIntervalId);
		qrCountdownIntervalId = null;
	}
	const container = document.getElementById('qrCountdownContainer');
	if (container) container.style.display = 'none';
}

function startQrCountdown(duration) {
	if (qrCountdownIntervalId) clearInterval(qrCountdownIntervalId);
	const container = document.getElementById('qrCountdownContainer');
	const display = document.getElementById('qrCountdown');
	if (!container || !display) return;
	
	container.style.display = 'block';
	let timer = duration;
	
	const updateDisplay = () => {
		let minutes = parseInt(timer / 60, 10);
		let seconds = parseInt(timer % 60, 10);
		
		minutes = minutes < 10 ? "0" + minutes : minutes;
		seconds = seconds < 10 ? "0" + seconds : seconds;
		
		display.textContent = minutes + ":" + seconds;
		
		if (--timer < 0) {
			clearInterval(qrCountdownIntervalId);
			stopPairingPoll();
			pairingQrImg.style.display = 'none';
			qrExpiredMsg.style.display = 'flex';
			container.style.display = 'none';
			qrPairingStatus.className = 'qr-pairing-status';
			qrStatusText.textContent = 'انتهت صلاحية الرمز، يرجى التحديث.';
		}
	};
	
	updateDisplay();
	qrCountdownIntervalId = setInterval(updateDisplay, 1000);
}

function startPairingPoll() {
	stopPairingPoll();
	
	pairingIntervalId = setInterval(async () => {
		if (!currentPairingId) return;

		try {
			const checkRes = await fetch(`${API_BASE}/api/auth/pairing/check?pairingId=${currentPairingId}`);
			if (!checkRes.ok) throw new Error('Check error');

			const checkData = await checkRes.json();
			if (checkData.success) {
				if (checkData.status === 'authorized' && checkData.token && checkData.user) {
					stopPairingPoll();
					qrPairingStatus.className = 'qr-pairing-status';
					qrPairingStatus.style.borderColor = 'var(--success)';
					qrPairingStatus.style.background = 'rgba(16, 185, 129, 0.08)';
					qrStatusText.textContent = 'تم تسجيل الدخول بنجاح!';
					
					// Save token and user, trigger state update
					isUsingDemo = false;
					localStorage.setItem(TOKEN_KEY, checkData.token);
					localStorage.setItem(WORKER_KEY, JSON.stringify(checkData.user));
					
					setTimeout(() => {
						checkAuthState();
					}, 800);
				} else if (checkData.status === 'expired') {
					stopPairingPoll();
					pairingQrImg.style.display = 'none';
					qrExpiredMsg.style.display = 'flex';
					qrPairingStatus.className = 'qr-pairing-status';
					qrStatusText.textContent = 'انتهت صلاحية الرمز، يرجى التحديث.';
				}
			}
		} catch (err) {
			console.error('Error polling pairing status:', err);
		}
	}, 2000);
}

if (refreshPairingQrBtn) {
	refreshPairingQrBtn.addEventListener('click', startPairingSession);
}

// 4. Dashboard Sidebar Sub-view Navigation
const sideLinkOverview = document.getElementById('sideLinkOverview');
const sideLinkShipments = document.getElementById('sideLinkShipments');
const sideLinkAlerts = document.getElementById('sideLinkAlerts');
const sideLinkSettings = document.getElementById('sideLinkSettings');

const kpiSection = document.getElementById('kpiSection');
const sensorsSection = document.getElementById('sensorsSection');
const alertsSection = document.getElementById('alertsSection');
const trendSection = document.getElementById('trendSection');
const settingsSection = document.getElementById('settingsSection');

const allSideLinks = [sideLinkOverview, sideLinkShipments, sideLinkAlerts, sideLinkSettings];

function activateSideLink(activeLink) {
	allSideLinks.forEach(link => {
		if (link) link.classList.toggle('active', link === activeLink);
	});
}

if (sideLinkOverview) {
	sideLinkOverview.addEventListener('click', (e) => {
		e.preventDefault();
		activateSideLink(sideLinkOverview);
		
		// Overview shows everything except settings
		if (kpiSection) kpiSection.style.display = 'grid';
		if (sensorsSection) sensorsSection.style.display = 'block';
		if (alertsSection) alertsSection.style.display = 'block';
		if (trendSection) trendSection.style.display = 'block';
		if (settingsSection) settingsSection.style.display = 'none';
	});
}

if (sideLinkShipments) {
	sideLinkShipments.addEventListener('click', (e) => {
		e.preventDefault();
		activateSideLink(sideLinkShipments);
		
		// Shipments shows active sensor cards and trend graph
		if (kpiSection) kpiSection.style.display = 'none';
		if (sensorsSection) sensorsSection.style.display = 'block';
		if (alertsSection) alertsSection.style.display = 'none';
		if (trendSection) trendSection.style.display = 'block';
		if (settingsSection) settingsSection.style.display = 'none';
	});
}

if (sideLinkAlerts) {
	sideLinkAlerts.addEventListener('click', (e) => {
		e.preventDefault();
		activateSideLink(sideLinkAlerts);
		
		// Alerts shows only the alerts section
		if (kpiSection) kpiSection.style.display = 'none';
		if (sensorsSection) sensorsSection.style.display = 'none';
		if (alertsSection) alertsSection.style.display = 'block';
		if (trendSection) trendSection.style.display = 'none';
		if (settingsSection) settingsSection.style.display = 'none';
	});
}

if (sideLinkSettings) {
	sideLinkSettings.addEventListener('click', (e) => {
		e.preventDefault();
		activateSideLink(sideLinkSettings);
		
		// Settings shows only the technical settings panel
		if (kpiSection) kpiSection.style.display = 'none';
		if (sensorsSection) sensorsSection.style.display = 'none';
		if (alertsSection) alertsSection.style.display = 'none';
		if (trendSection) trendSection.style.display = 'none';
		if (settingsSection) settingsSection.style.display = 'block';
	});
}

// Mobile menu toggle logic
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navLinks = document.getElementById('navLinks');

if (mobileMenuToggle && navLinks) {
	mobileMenuToggle.addEventListener('click', () => {
		mobileMenuToggle.classList.toggle('active');
		navLinks.classList.toggle('active');
	});

	// Close menu when clicking a link or button
	navLinks.querySelectorAll('a, button').forEach((link) => {
		link.addEventListener('click', () => {
			mobileMenuToggle.classList.remove('active');
			navLinks.classList.remove('active');
		});
	});
}

