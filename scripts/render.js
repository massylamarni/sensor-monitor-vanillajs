const generateCanvaId = (sensorId) => {
  return `${sensorId}-chart`;
}

const generateElTargetId = (index) => {
  return `sensor-chart-${index + 1}`;
}

const renderSensorDisplay = () => {
  const sensorDisplayTemplate = document.getElementById("sensor-display-template");
  const sensorDisplaySlot = document.getElementById("sensor-display-slot");

  SENSORS.filter(sensor => sensor.sensorType === 'data').forEach((sensor, index) => {
    const cloneEl = sensorDisplayTemplate.content.cloneNode(true);
    const cardEl = cloneEl.querySelector(".sensor-display");

    cardEl.dataset.endpointName = sensor.endpoint.url;
    cardEl.dataset.targetId = generateElTargetId(index);

    cloneEl.querySelector(".__sensor-display-icon").innerHTML = ICONS[sensor.icon[0]];
    cloneEl.querySelector(".__sensor-display-unit").textContent = sensor.info.unit;
    cloneEl.querySelector(".__sensor-display-type").textContent = sensor.info.label;

    const canvas = cloneEl.querySelector(".sensor-display-chart");
    canvas.id = generateCanvaId(sensor.id);

    sensorDisplaySlot.appendChild(cloneEl);
  });
}

const renderSensorStateDisplay = () => {
  const sensorDisplayTemplate = document.getElementById("sensor-state-display-template");
  const sensorDisplaySlot = document.getElementById("sensor-state-display-slot");

  SENSORS.filter(sensor => sensor.sensorType === 'state').forEach((sensor, index) => {
    const cloneEl = sensorDisplayTemplate.content.cloneNode(true);
    const cardEl = cloneEl.querySelector(".sensor-state-display");

    cardEl.dataset.endpointName = sensor.endpoint.url;
    cardEl.dataset.targetId = generateElTargetId(index);

    cloneEl.querySelector(".__sensor-display-icon").innerHTML = ICONS[sensor.icon[0]] + ICONS[sensor.icon[1]];
    cloneEl.querySelector(".__sensor-display-type").textContent = sensor.info.label;

    const canvas = cloneEl.querySelector(".sensor-display-chart");
    canvas.id = generateCanvaId(sensor.id);

    sensorDisplaySlot.appendChild(cloneEl);
  });
}

const renderSensorChart = (index, sensorLabel) => {
  const sensorChartTemplate = document.getElementById("sensor-chart-template");
  const sensorChartSlot = document.getElementById("sensor-chart-slot");

  const cloneEl = sensorChartTemplate.content.cloneNode(true);
  const cardEl = cloneEl.querySelector(".sensor-chart");

  cloneEl.id = generateElTargetId(index);
  cloneEl.querySelector(".__sensor-display-type").textContent = sensorLabel;

  const canvas = cloneEl.querySelector(".sensor-chart-chart");
  canvas.id = generateCanvaId("chart");

  sensorChartSlot.appendChild(cloneEl);
}

renderSensorDisplay();
renderSensorStateDisplay();
renderSensorChart(0, "Oxygen");
