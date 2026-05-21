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

function showView(viewName, options = {}) {
	const showDashboard = viewName === 'dashboard';
	homeView.classList.toggle('active', !showDashboard);
	dashboardView.classList.toggle('active', showDashboard);
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

const mockData = {
	temp: '4°C',
	humidity: '45%',
	vibration: 'مستقر (0G)',
	totalShipments: '128',
	activeAlerts: '03',
	safeShipments: '121'
};

const temperatureSeries = [
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

	const yTicks = [3.8, 4.0, 4.2, 4.4, 4.6, 4.8];
	const xLabels = temperatureSeries.map((point) => point.time);

	tempChart.innerHTML = `
	  <defs>
	    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
	      <stop offset="0%" stop-color="rgba(34, 193, 179, 0.36)" />
	      <stop offset="100%" stop-color="rgba(34, 193, 179, 0.02)" />
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

	chartCurrentValue.textContent = mockData.temp;

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

document.getElementById('tempValue').textContent = mockData.temp;
document.getElementById('humidityValue').textContent = mockData.humidity;
document.getElementById('vibrationValue').textContent = mockData.vibration;
document.getElementById('kpiTotalShipments').textContent = mockData.totalShipments;
document.getElementById('kpiActiveAlerts').textContent = mockData.activeAlerts;
document.getElementById('kpiSafeShipments').textContent = mockData.safeShipments;
document.getElementById('heroTempValue').textContent = mockData.temp;
document.getElementById('heroAlertValue').textContent = `${mockData.activeAlerts} Alerts`;
renderTemperatureChart();
