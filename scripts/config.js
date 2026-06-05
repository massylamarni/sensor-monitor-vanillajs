const DEFAULT_REFRESH_RATE = 30_000;

const SENSORS = [
  {
    id: 'temperature',
    sensorType: 'data',
    endpoint: { url: '/api/temperature', method: 'GET' },
    info: { label: 'Temperature', unit: '°C' },
    icon: ['temperature']
  },
  {
    id: 'gas',
    sensorType: 'data',
    endpoint: { url: '/api/gas', method: 'GET' },
    info: { label: 'Gas rate', unit: 'PPM' },
    icon: ['gas']
  },
  {
    id: 'rfid',
    sensorType: 'state',
    endpoint: { url: '/api/rfid', method: 'GET' }, // /api/ws/rfid
    info: { label: 'RFID validation', dataType: 'UID', labelOnTrue: 'Valid', labelOnFalse: 'Not valid' },
    icon: ['doorOpen', 'doorClosed']
  },
  {
    id: 'movement',
    sensorType: 'state',
    endpoint: { url: '/api/movement', method: 'GET' },
    info: { label: 'Movement state', dataType: 'State', labelOnTrue: 'Movement detected', labelOnFalse: 'No Movement' },
    icon: ['doorOpen', 'doorClosed']
  },
];

const ICONS = {
  temperature: `
    <svg
      width="800px" height="800px"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 9C11.1077 8.98562 10.2363 9.27003 9.52424 9.808C8.81222 10.346 8.30055 11.1066 8.07061 11.9688C7.84068 12.8311 7.90568 13.7455 8.25529 14.5665C8.6049 15.3876 9.21904 16.0682 10 16.5M12 3V5M6.6 18.4L5.2 19.8M4 13H2M6.6 7.6L5.2 6.2M20 14.5351V4C20 2.89543 19.1046 2 18 2C16.8954 2 16 2.89543 16 4V14.5351C14.8044 15.2267 14 16.5194 14 18C14 20.2091 15.7909 22 18 22C20.2091 22 22 20.2091 22 18C22 16.5194 21.1956 15.2267 20 14.5351Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  `,
  gas: `
    <svg
      width="800px" height="800px"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path d="M3 8H10C11.6569 8 13 6.65685 13 5C13 3.34315 11.6569 2 10 2C8.34315 2 7 3.34315 7 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16H15C16.6569 16 18 17.3431 18 19C18 20.6569 16.6569 22 15 22C13.3431 22 12 20.6569 12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12H19C20.6569 12 22 10.6569 22 9C22 7.34315 20.6569 6 19 6C17.3431 6 16 7.34315 16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  `,
  doorClosed: `
    <svg
      width="800px" height="800px"
      viewBox="0 0 24 24"
      fill="none"
      class="__sensor-state-false"
    >
      <path
        d="M3 21H21M18 21V6.2C18 5.0799 18 4.51984 17.782 4.09202C17.5903 3.71569 17.2843 3.40973 16.908 3.21799C16.4802 3 15.9201 3 14.8 3H9.2C8.0799 3 7.51984 3 7.09202 3.21799C6.71569 3.40973 6.40973 3.71569 6.21799 4.09202C6 4.51984 6 5.0799 6 6.2V21M15 12H15.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  `,
  doorOpen: `
    <svg
      width="800px" height="800px"
      viewBox="0 0 24 24"
      fill="none"
      class="__sensor-state-true hidden"
    >
      <path
        d="M3 21.0001L14 21V5.98924C14 4.6252 14 3.94318 13.7187 3.47045C13.472 3.05596 13.0838 2.74457 12.6257 2.59368C12.1032 2.42159 11.4374 2.56954 10.1058 2.86544L7.50582 3.44322C6.6117 3.64191 6.16464 3.74126 5.83093 3.98167C5.53658 4.19373 5.30545 4.48186 5.1623 4.8152C5 5.19312 5 5.65108 5 6.56702V21.0001M13.994 5.00007H15.8C16.9201 5.00007 17.4802 5.00007 17.908 5.21805C18.2843 5.4098 18.5903 5.71576 18.782 6.09209C19 6.51991 19 7.07996 19 8.20007V21.0001H21M11 12.0001H11.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  `,
};