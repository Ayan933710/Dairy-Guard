// Specs shown on hover, pulled from the BovineGuard/DairyGuard PRD (Section 3).
export const DEVICES = {
  collar: {
    id: 'collar',
    name: 'Smart Collar',
    tagline: '24/7 rumination & motility tracking',
    price: '₹2,500 / unit',
    specs: [
      { label: 'Core', value: 'ESP32 dual-core, deep-sleep scheduling' },
      { label: 'Sensing', value: 'MPU6050 accelerometer + DS18B20 skin temp' },
      { label: 'Radio', value: 'LoRa 433/868 MHz, 3–5 km range' },
      { label: 'Power', value: 'Solar + 18650 Li-ion, ~195 days dark reserve' },
    ],
  },
  cup: {
    id: 'cup',
    name: 'Smart Cup v2.1',
    tagline: 'Quarter-level milk chemistry in under 45 seconds',
    price: '₹4,800 / unit',
    specs: [
      { label: 'Chemistry', value: 'EC + pH probes detect ionic/alkaline shift' },
      { label: 'Rheology', value: 'Motorized CMT viscosity (torque via current draw)' },
      { label: 'Optical', value: 'IR teat temp + RGB colour validation' },
      { label: 'ID', value: '134.2 kHz LF RFID animal handshake, <1s' },
    ],
  },
  hub: {
    id: 'hub',
    name: 'DairyGuard Hub',
    tagline: 'One gateway for every signal in the shed',
    price: '₹6,900 / unit',
    specs: [
      { label: 'Uplink', value: 'LoRa receiver with 3–5 km shed coverage' },
      { label: 'Backhaul', value: 'Wi-Fi and 4G-ready cloud sync' },
      { label: 'Capacity', value: 'Up to 250 active animal devices' },
      { label: 'Power', value: 'Always-on mains with battery backup' },
    ],
  },
};
