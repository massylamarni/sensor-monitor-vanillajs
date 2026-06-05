/* Global variables */
let chartInsts = {};
let sensorData = {};
let ws = null;
let currentChartEndpoint = null;

/* Initialization */
const initClientWebSocket = () => {
  const rfidSensor = SENSORS.find(s => s.id === 'rfid');
  if (!rfidSensor) return;

  const wsUrl = rfidSensor.endpoint.url.replace(/^\/api\//, '');
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  ws = new WebSocket(`${protocol}//${host}/api/ws/${wsUrl}`);

  ws.onopen = () => {
    console.log("WebSocket connection established.");
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  ws.onclose = () => {
    console.log("WebSocket connection closed.");
  };

  ws.onmessage = (event) => {
    const rfidEndpoint = rfidSensor.endpoint.url;
    storeData(rfidEndpoint, JSON.parse(event.data));
  };
};

const initCharts = () => {
  SENSORS.forEach((sensor) => {
    const canvasId = generateCanvaId(sensor.id);
    const canvasEl = document.getElementById(canvasId);
    if (canvasEl) {
      chartInsts[sensor.id] = setChart(sensor);
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  initClientWebSocket();
  initCharts();
  updateAll();
  setInterval(updateAll, DEFAULT_REFRESH_RATE);
});

/* Debug utilities */
const debugHere = (debugTag, debugDataCollection) => {
  const DEBUG_HALF_WALL = '--------------------------------------------------';
  const DEBUG_SMALL_WALL = '----';
  const TOGGLE_DEBUG = false;

  if (TOGGLE_DEBUG) {
    console.log(DEBUG_HALF_WALL + 'START ' + debugTag + DEBUG_HALF_WALL);
    debugDataCollection.forEach((debugData) => {
      if (debugData.type === 0) {
        console.log(`${DEBUG_SMALL_WALL} ${debugData.title} = ${debugData.value} ${DEBUG_SMALL_WALL}`);
      } else if (debugData.type === 1) {
        console.log(DEBUG_SMALL_WALL + 'START ' + debugData.title + DEBUG_SMALL_WALL);
        console.log(debugData.value);
        console.log(DEBUG_SMALL_WALL + 'END ' + debugData.title + DEBUG_SMALL_WALL);
      }
    });
    console.log(DEBUG_HALF_WALL + 'END ' + debugTag + DEBUG_HALF_WALL);
  }
};

/* Data structure validation */
const checkStruct = (rawData) => {
  return Array.isArray(rawData) && rawData.length > 0;
};

const filterNull = (rawData) => {
  if (!checkStruct(rawData)) return [];
  return rawData.filter((data) => data.data != null);
};

/* Parse state object data */
const getStateObjectData = (data) => {
  if (typeof data !== 'object' || data === null) return null;

  const keys = Object.keys(data);
  if (keys.length === 0) return null;

  const value = data[keys[0]];
  const state = data.state !== undefined ? (data.state !== '0' && data.state !== 0) : null;

  return {
    data: value,
    state: state,
    type: typeof value === 'object' ? 1 : 0,
  };
};

/* Time range helpers */
const getInitialChartTimeRange = (sensor) => {
  if (sensor.sensorType === 'data') {
    return {
      start: new Date(new Date().getTime() - 5 * 60 * 1000), // 5 minutes
      end: new Date(),
    };
  } else if (sensor.sensorType === 'state') {
    return {
      start: new Date(new Date().getTime() - 1 * 60 * 60 * 1000), // 1 hour
      end: new Date(),
    };
  }
};

/* Chart data preparation */
const getInitialChartData = (sensor) => {
  const endpoint = sensor.endpoint.url;
  const timeRange = getInitialChartTimeRange(sensor);
  const sensorDataArray = sensorData[endpoint] || [];

  if (!checkStruct(sensorDataArray)) {
    const missingData = getMissingData([], timeRange);
    return {
      missingDataBefore: getChartData(missingData.before),
      sensorData: [],
      missingDataAfter: getChartData(missingData.after),
    };
  }

  const missingData = getMissingData(sensorDataArray, timeRange);

  if (sensor.sensorType === 'data') {
    return {
      missingDataBefore: getChartData(missingData.before),
      sensorData: getChartData(sensorDataArray),
      missingDataAfter: getChartData(missingData.after),
    };
  } else {
    return {
      missingDataBefore: getChartData(missingData.before),
      sensorData: getChartData(sensorDataArray),
      missingDataAfter: getChartData(missingData.after),
    };
  }
};

/* Peak value calculation */
function getPeakSensorValue(dataArray) {
  if (!checkStruct(dataArray)) {
    return { min: 'Unknown', max: 'Unknown' };
  }

  let max = dataArray[0].data;
  let min = dataArray[0].data;

  for (let i = 1; i < dataArray.length; i++) {
    const value = dataArray[i].data;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  return { min, max };
}

/* Average chart data */
function getAverageChartData(chartData, chartTimeRange) {
  const minArrayLength = 15;
  const minTimeSpan = 1000000;
  const relativeChunkSize = 5;

  const timeSpan =
    (new Date(chartTimeRange.end) - new Date(chartTimeRange.start)) / 100000;
  const chunkSize =
    chartData.length > minArrayLength && timeSpan > minTimeSpan
      ? Math.floor(timeSpan / relativeChunkSize)
      : 0;

  if (chunkSize === 0) return chartData;

  const averageChartData = [];
  let chunkSum = 0;
  let chunkCount = 0;

  for (let i = 0; i < chartData.length; i++) {
    chunkSum += chartData[i].y;
    chunkCount++;

    if (chunkCount === chunkSize) {
      averageChartData.push({
        x: chartData[i].x,
        y: chunkSum / chunkSize,
      });
      chunkSum = 0;
      chunkCount = 0;
    }
  }

  if (chunkCount !== 0) {
    averageChartData.push({
      x: chartData[chartData.length - 1].x,
      y: chunkSum / chunkCount,
    });
  }

  return averageChartData;
}

/* Fetch raw data */
async function fetchRawData(endpointName) {
  try {
    const response = await fetch(endpointName, {
      method: 'GET',
    });
    const rawData = await response.json();
    storeData(endpointName, rawData);
  } catch (error) {
    console.error('Error fetching rawData from ' + endpointName + ':', error);
  }
}

/* Store data in memory and localStorage */
function storeData(endpointName, rawData) {
  if (!rawData) return;

  // Normalize response: if it's a single object, wrap it in array
  const dataArray = Array.isArray(rawData) ? rawData : [rawData];

  const enrichedData = dataArray.map((item) => ({
    ...item,
    createdAt: item.createdAt || new Date().toISOString(),
  }));

  const localStorageData = JSON.parse(localStorage.getItem(endpointName)) || [];
  localStorageData.push(...enrichedData);
  localStorage.setItem(endpointName, JSON.stringify(localStorageData));
  sensorData[endpointName] = localStorageData;
}

/* Convert stored data to chart format */
function getChartData(dataArray) {
  return dataArray.map((item) => {
    const stateObjectData = getStateObjectData(item.data);
    const yValue =
      stateObjectData && stateObjectData.state !== null
        ? stateObjectData.state
          ? 1
          : 0
        : parseFloat(item.data?.value || item.data || 0);

    return {
      x: new Date(item.createdAt),
      y: yValue,
    };
  });
}

/* Handle missing data gaps */
function getMissingData(dataArray, chartTimeRange) {
  const delay = 5000;
  const predictedValue = { data: { value: '0', state: '0' }, createdAt: null };

  const defaultMissingData = [
    {
      data: { value: '0', state: '0' },
      createdAt: new Date(chartTimeRange.start).toISOString(),
    },
    {
      data: { value: '0', state: '0' },
      createdAt: new Date(chartTimeRange.end).toISOString(),
    },
  ];

  let missingData = { before: [], after: [] };

  if (!checkStruct(dataArray)) {
    missingData.after = defaultMissingData;
    return missingData;
  }

  const dataTimeRange = {
    start: new Date(dataArray[0].createdAt),
    end: new Date(dataArray[dataArray.length - 1].createdAt),
  };

  if (
    dataTimeRange.start <= chartTimeRange.start &&
    dataTimeRange.end >= chartTimeRange.end
  ) {
    // Normal behavior - data covers full range
  } else if (
    dataTimeRange.start <= chartTimeRange.start &&
    dataTimeRange.end < chartTimeRange.end
  ) {
    // Data ends before chart range
    missingData.after = [
      {
        data: dataArray[dataArray.length - 1].data,
        createdAt: new Date(dataTimeRange.end).toISOString(),
      },
      {
        data: predictedValue.data,
        createdAt: new Date(dataTimeRange.end.getTime() + delay).toISOString(),
      },
      {
        data: predictedValue.data,
        createdAt: new Date(chartTimeRange.end).toISOString(),
      },
    ];
  } else if (
    dataTimeRange.start > chartTimeRange.start &&
    dataTimeRange.end >= chartTimeRange.end
  ) {
    // Data starts after chart range
    missingData.before = [
      {
        data: predictedValue.data,
        createdAt: new Date(chartTimeRange.start).toISOString(),
      },
      {
        data: predictedValue.data,
        createdAt: new Date(
          dataTimeRange.start.getTime() - delay
        ).toISOString(),
      },
      {
        data: dataArray[0].data,
        createdAt: new Date(dataTimeRange.start).toISOString(),
      },
    ];
  } else if (
    dataTimeRange.start > chartTimeRange.start &&
    dataTimeRange.end < chartTimeRange.end
  ) {
    // Data is within chart range with gaps on both sides
    missingData.before = [
      {
        data: predictedValue.data,
        createdAt: new Date(chartTimeRange.start).toISOString(),
      },
      {
        data: predictedValue.data,
        createdAt: new Date(
          dataTimeRange.start.getTime() - delay
        ).toISOString(),
      },
      {
        data: dataArray[0].data,
        createdAt: new Date(dataTimeRange.start).toISOString(),
      },
    ];
    missingData.after = [
      {
        data: dataArray[dataArray.length - 1].data,
        createdAt: new Date(dataTimeRange.end).toISOString(),
      },
      {
        data: predictedValue.data,
        createdAt: new Date(dataTimeRange.end.getTime() + delay).toISOString(),
      },
      {
        data: predictedValue.data,
        createdAt: new Date(chartTimeRange.end).toISOString(),
      },
    ];
  } else {
    missingData.after = defaultMissingData;
  }

  return missingData;
}

/* Chart creation and configuration */
function setChart(sensor) {
  const canvasId = generateCanvaId(sensor.id);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  const initialChartData = getInitialChartData(sensor);
  const chartTimeRange = getInitialChartTimeRange(sensor);
  const isDataSensor = sensor.sensorType === 'data';

  const options = {
    layout: {
      padding: {
        top: 15,
      },
    },
    plugins: {
      legend: { display: false },
    },
    animation: {
      duration: 0,
    },
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: {
        type: 'time',
        display: !isDataSensor,
        grid: {
          display: false,
        },
        ticks: {
          display: !isDataSensor,
          stepSize: 5,
        },
        min: chartTimeRange.start,
        max: chartTimeRange.end,
      },
      y: {
        display: !isDataSensor,
        grid: {
          display: false,
        },
        ticks: {
          display: !isDataSensor,
        },
        min: 0,
      },
    },
  };

  const data = {
    datasets: [
      {
        data: initialChartData.missingDataBefore,
        fill: false,
        tension: 0.5,
        pointRadius: 0,
        borderColor: function (context) {
          const gradient = ctx.createLinearGradient(0, 0, context.chart.width, 0);
          gradient.addColorStop(0, 'rgba(31, 31, 31, 0)');
          gradient.addColorStop(0.5, 'rgb(228, 48, 48)');
          gradient.addColorStop(1, 'rgba(31, 31, 31, 0)');
          return gradient;
        },
      },
      {
        data: initialChartData.sensorData,
        fill: false,
        tension: 0.5,
        pointRadius: 0,
        borderColor: function (context) {
          const gradient = ctx.createLinearGradient(0, 0, context.chart.width, 0);
          gradient.addColorStop(0, 'rgba(31, 31, 31, 0)');
          gradient.addColorStop(0.5, 'rgba(48, 228, 142, 1)');
          gradient.addColorStop(1, 'rgba(31, 31, 31, 0)');
          return gradient;
        },
      },
      {
        data: initialChartData.missingDataAfter,
        fill: false,
        tension: 0.5,
        pointRadius: 0,
        borderColor: function (context) {
          const gradient = ctx.createLinearGradient(0, 0, context.chart.width, 0);
          gradient.addColorStop(0, 'rgba(31, 31, 31, 0)');
          gradient.addColorStop(0.5, 'rgb(228, 48, 48)');
          gradient.addColorStop(1, 'rgba(31, 31, 31, 0)');
          return gradient;
        },
      },
    ],
  };

  return new Chart(canvasId, {
    type: 'line',
    data: data,
    options: options,
  });
}

/* Update all sensor data and UI */
async function updateAll() {
  // Fetch data from all GET endpoints
  const getEndpoints = SENSORS.filter(
    (s) => s.endpoint.method === 'GET'
  ).map((s) => s.endpoint.url);

  const uniqueEndpoints = [...new Set(getEndpoints)];
  for (const endpoint of uniqueEndpoints) {
    await fetchRawData(endpoint);
  }

  // Update display components
  updateSensorDisplayEls();

  // Update charts
  SENSORS.forEach((sensor) => {
    const chartInst = chartInsts[sensor.id];
    if (!chartInst) return;

    const initialChartData = getInitialChartData(sensor);
    const initialChartTimeRange = getInitialChartTimeRange(sensor);

    chartInst.data.datasets[0].data = initialChartData.missingDataBefore;
    chartInst.data.datasets[1].data = initialChartData.sensorData;
    chartInst.data.datasets[2].data = initialChartData.missingDataAfter;
    chartInst.options.scales.x.min = initialChartTimeRange.start;
    chartInst.options.scales.x.max = initialChartTimeRange.end;
    chartInst.update();
  });
}

/* Update sensor display elements */
function updateSensorDisplayEls() {
  const sensorDisplayEls = document.getElementsByClassName('sensor-display');
  const sensorStateDisplayEls = document.getElementsByClassName(
    'sensor-state-display'
  );

  Array.from(sensorDisplayEls).forEach((sensorDisplayEl) => {
    const endpointName = sensorDisplayEl.getAttribute('data-endpointName');
    const sensor = SENSORS.find((s) => s.endpoint.url === endpointName);
    if (!sensor) return;

    const sensorDataArray = sensorData[endpointName] || [];
    if (!checkStruct(sensorDataArray)) return;

    const latestData = sensorDataArray[sensorDataArray.length - 1];
    const sensorDisplayValue = latestData.data?.value || latestData.data || 'Unknown';
    const sensorDisplayValuePeaks = getPeakSensorValue(sensorDataArray);

    const sensorDisplayValueEl = sensorDisplayEl.querySelector(
      '.__sensor-display-value'
    );
    const sensorDisplayMinValueEl = sensorDisplayEl.querySelector(
      '.__sensor-display-min-value'
    );
    const sensorDisplayMaxValueEl = sensorDisplayEl.querySelector(
      '.__sensor-display-max-value'
    );

    if (sensorDisplayValueEl)
      sensorDisplayValueEl.textContent = sensorDisplayValue;
    if (sensorDisplayMinValueEl)
      sensorDisplayMinValueEl.textContent = sensorDisplayValuePeaks.min;
    if (sensorDisplayMaxValueEl)
      sensorDisplayMaxValueEl.textContent = sensorDisplayValuePeaks.max;
  });

  Array.from(sensorStateDisplayEls).forEach((sensorStateDisplayEl) => {
    const endpointName = sensorStateDisplayEl.getAttribute('data-endpointName');
    const sensor = SENSORS.find((s) => s.endpoint.url === endpointName);
    if (!sensor) return;

    const sensorDataArray = sensorData[endpointName] || [];
    if (!checkStruct(sensorDataArray)) return;

    const latestData = sensorDataArray[sensorDataArray.length - 1];
    const stateObjectData = getStateObjectData(latestData.data);

    if (!stateObjectData) return;

    const sensorStateState = stateObjectData.state !== null ? (stateObjectData.state ? 'True' : 'False') : 'Unknown';
    const sensorStateStateValue = stateObjectData.state;
    const sensorStateData =
      sensor.info.labelOnTrue && sensor.info.labelOnFalse
        ? stateObjectData.state
          ? sensor.info.labelOnTrue
          : sensor.info.labelOnFalse
        : stateObjectData.data;

    const sensorStateStateEl = sensorStateDisplayEl.querySelector(
      '.__sensor-state-value'
    );
    const sensorStateDataEl = sensorStateDisplayEl.querySelector(
      '.__sensor-state-last-state'
    );
    const sensorStateTrueEls = sensorStateDisplayEl.querySelectorAll(
      '.__sensor-state-true'
    );
    const sensorStateFalseEls = sensorStateDisplayEl.querySelectorAll(
      '.__sensor-state-false'
    );

    if (sensorStateStateEl)
      sensorStateStateEl.textContent = sensorStateState;
    if (sensorStateDataEl)
      sensorStateDataEl.textContent = sensorStateData;

    sensorStateTrueEls.forEach((el) => {
      sensorStateStateValue
        ? el.classList.remove('hidden')
        : el.classList.add('hidden');
    });

    sensorStateFalseEls.forEach((el) => {
      sensorStateStateValue
        ? el.classList.add('hidden')
        : el.classList.remove('hidden');
    });
  });
}

/* Toggle sensor chart display */
function toggleSensorChart(event) {
  const sensorCard = event.currentTarget;
  const targetId = sensorCard.getAttribute('data-target-id');
  const endpointName = sensorCard.getAttribute('data-endpointName');

  if (!targetId) return;

  // Update the chart with data from the clicked sensor
  const sensorChartSlot = document.getElementById('sensor-chart-slot');
  if (sensorChartSlot) {
    const chartContainers = sensorChartSlot.querySelectorAll('.sensor-chart');
    chartContainers.forEach((chart) => {
      if (chart.id === targetId) {
        chart.classList.remove('hidden');
        // Update chart with sensor data
        const sensor = SENSORS.find((s) => s.endpoint.url === endpointName);
        if (sensor && chartInsts[sensor.id]) {
          chartInsts[sensor.id].update();
        }
      } else {
        chart.classList.add('hidden');
      }
    });
  }
}
