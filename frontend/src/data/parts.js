// Condensed from PRD Section 3 (Hardware Subsystems & BOM).
export const COLLAR_PARTS = [
  {
    id: 'mcu',
    name: 'ESP-WROOM-32',
    role: 'Core controller',
    detail: 'Deep-sleep scheduling, reads sensors, formats LoRa packets.',
  },
  {
    id: 'imu',
    name: 'MPU6050',
    role: 'Motility & rumination',
    detail: 'Accelerometer + gyroscope catches jaw rhythm and head motion; a rumination drop >15% signals distress.',
  },
  {
    id: 'temp',
    name: 'DS18B20',
    role: 'Skin temperature',
    detail: 'Waterproof probe against the neck tracks basal temperature and pre-clinical fever.',
  },
  {
    id: 'radio',
    name: 'SX1278 LoRa',
    role: 'Long-range radio',
    detail: 'Sends telemetry 3–5 km to the gateway with no SIM card or Wi-Fi needed.',
  },
  {
    id: 'solar',
    name: 'Solar + 18650 cell',
    role: 'Power',
    detail: '1W panel trickle-charges the battery for a ~195-day dark reserve.',
  },
];

export const CUP_PARTS = [
  {
    id: 'mcu',
    name: 'ESP-WROOM-32',
    role: 'Core controller',
    detail: 'Runs sequential 4-quarter sampling and drives the OLED UI.',
  },
  {
    id: 'ec-ph',
    name: 'EC + pH probes',
    role: 'Milk chemistry',
    detail: 'Detects the ionic conductivity rise and alkaline shift (pH > 6.8) of leaking mammary tissue.',
  },
  {
    id: 'cmt',
    name: 'Motor + INA219',
    role: 'Viscosity (CMT)',
    detail: 'A geared paddle strains against thickened gel; current draw quantifies somatic cell count.',
  },
  {
    id: 'ir',
    name: 'MLX90614',
    role: 'IR teat temperature',
    detail: 'Flags localised quarter inflammation from surface heat alone.',
  },
  {
    id: 'rfid',
    name: '134.2 kHz LF RFID',
    role: 'Animal ID',
    detail: 'Reads the ear tag through milk and mud in under a second.',
  },
];

export const HUB_PARTS = [
  {
    id: 'gateway',
    name: 'LoRa gateway',
    role: 'Signal collection',
    detail: 'Receives encrypted telemetry from collars and cups across the shed and field edge.',
  },
  {
    id: 'backhaul',
    name: 'Wi-Fi + 4G backhaul',
    role: 'Cloud sync',
    detail: 'Keeps the herd timeline current even when the farm network changes state.',
  },
  {
    id: 'storage',
    name: 'Edge buffer',
    role: 'Offline resilience',
    detail: 'Stores readings locally and forwards them when connectivity returns.',
  },
  {
    id: 'power',
    name: 'Battery backup',
    role: 'Always-on uptime',
    detail: 'Maintains the signal bridge through short power interruptions.',
  },
];

export const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Scan the ear tag',
    detail: 'The cup\u2019s RFID reader pulls the animal ID and lactation history in under 500ms.',
  },
  {
    step: '02',
    title: 'Sample each quarter',
    detail: 'EC, pH, IR temperature and flow are read per-quarter, ~10 seconds each.',
  },
  {
    step: '03',
    title: 'Run the CMT check',
    detail: 'A motorised paddle spin measures reagent viscosity — an uncheatable proxy for SCC.',
  },
  {
    step: '04',
    title: 'Broadcast over LoRa',
    detail: 'Cup and collar both send encrypted packets to the shed gateway.',
  },
  {
    step: '05',
    title: 'Fuse & forecast',
    detail: 'Cloud AI combines chemistry, rumination and weather into a 7\u201314 day risk score.',
  },
];
