# ☀️ Home Assistant Solar & APSystems Mission Control Dashboard

An ultra-responsive, high-density **Solar Photovoltaic & Microinverter Mission Control Dashboard** for **Home Assistant**. Built specifically for APSystems microinverters (DS3, DS3-H, QT2, YC600) and general solar PV installations, requiring **zero exotic dependencies** — powered entirely by `custom:button-card`!

![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.x%2B-blue.svg?logo=home-assistant)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![HACS Cards](https://img.shields.io/badge/Required%20Cards-1%20(button--card)-orange.svg)

---

## 🌟 Key Features

1. **Photovoltaic Rooftop SVG Topology Grid**:
   - Real-time per-panel generation monitoring (Watts and Module Rating percentage).
   - Dynamic 6-tier chromatic glow (from nocturnal idle cyan to peak solar flare neon orange).
   - Fluid power level waterline fill and animated PV wafer texture.
   - Interactive tap-to-inspect modal (`hass-more-info`) with mobile WebView scroll guards.
   - Landscape and Portrait panel orientations (`h` vs `v`).

2. **Diurnal Celestial Trajectory & Astronomical Arc**:
   - Real-time Sun positioning driven by Home Assistant's native `sun.sun` (azimuth & elevation).
   - Dynamic Astronomical Solar Noon computation (adapts automatically every single day across all seasons).
   - Real astronomical Moon Phase calculations and illuminated SVG lunar rendering for night hours.
   - Live weather synchronization: chromatic sun shifts (sunrise fiery orange to peak radiant white), drifting translucent clouds, and animated SVG rain/lightning storms.

3. **Volumetric Shadow Projection & Shading Engine**:
   - Architectural brick chimney obstacle embedded directly in the roof topology.
   - Volumetric soft cast shadow cone mathematically projected from real-time Sun vector and elevation (`shadow_proj_len = 34 / tan(elevation)`).
   - Intelligent shadow warning badges on panels actively obstructed by chimney or perimeter parapets.
   - Fully customizable or easy to disable if your roof is obstruction-free.

4. **Solcast PV Solar Forecast Integration**:
   - Real-time today's generation vs forecast target tracking (`% Target Achieved`).
   - Hourly production curve and 7-day weather/generation outlook.

5. **Microinverter Cluster Telemetry & Thermal Diagnostics**:
   - Complete multi-inverter telemetry matrix: real-time temperatures, AC voltages, DC channel power, and communication signal.
   - Dynamic cluster peak temperature tracking (`inverters_max_temperature`).
   - Software-debounced auxiliary active cooling fan controls (`switch.inverters_fan_plug`).

6. **Lifetime Milestones & Financial Analytics**:
   - ECU lifetime energy milestones (MWh generated, all-time peak power).
   - Stable 24-hour daylight-weighted tariff valuation (eliminates chaotic hourly tariff oscillations).
   - Environmental CO2 offset calculation.

---

## 📦 Prerequisites & Required Cards

This entire mission control dashboard is designed with zero bloat. You only need **ONE** custom card from HACS:

| Requirement | Type | Description | Link |
|---|---|---|---|
| **`button-card`** | HACS Frontend | Powers all dynamic SVG rendering, state triggers, and grid layouts | [custom-cards/button-card](https://github.com/custom-cards/button-card) |

### Integrations Used (Optional but Recommended):
- **APSystems ECU**: Native or custom HACS integration (`sensor.ecu_*` and `sensor.inverter_*`).
- **Sun**: Native Home Assistant Core integration (`sun.sun`).
- **Weather**: Any standard weather provider (`weather.home`, Open-Meteo, AEMET, etc.).
- **Solcast PV Forecast**: Free HACS integration for solar yield forecasting.
- **Energy Meter**: Shelly EM, Emporia Vue, or Home Assistant Energy meter for grid import/export and solar yield.

---

## 🚀 Quick Start Installation

1. Install **`button-card`** via HACS (`HACS -> Frontend -> Explore & Download Repositories -> button-card`).
2. Download or copy [`solar_mission_control.yaml`](./solar_mission_control.yaml) from this repository.
3. In Home Assistant, navigate to your desired dashboard, click the **Three Dots (⋮)** in the top right, and select **Edit Dashboard**.
4. Click **Three Dots (⋮)** again and choose **Raw Configuration Editor**.
5. Paste the contents of `solar_mission_control.yaml` under the `views:` section:
   ```yaml
   views:
     # ... your existing views ...
     - title: Solar Mission Control
       path: solar-mission-control
       # (paste the rest of solar_mission_control.yaml here)
   ```
6. Click **Save** and close the editor. Your dashboard is ready!

---

## 🛠️ Complete Customization Guide

### 1. How to Add, Remove, or Reposition Solar Panels

The rooftop panel topology is defined by a clean, readable JavaScript array at the very top of **Card 0 (Array)**:

```javascript
const panelList = [
  { row: 1, col: 3, inv: "704000000001", ch: 1, id: "000001", type: "h", model: "DS3" },
  { row: 1, col: 4, inv: "704000000002", ch: 1, id: "000002", type: "h", model: "DS3" },
  { row: 1, col: 5, inv: "704000000003", ch: 1, id: "000003", type: "h", model: "DS3" },
  { row: 1, col: 6, inv: "704000000004", ch: 1, id: "000004", type: "h", model: "DS3" },
  // ... more panels
];
```

#### Field Reference:
- **`row`**: Vertical row in the roof grid (values `1` to `4`, or more).
- **`col`**: Horizontal column in the roof grid (values `1` to `6`, or more).
- **`inv`**: The full 12-digit microinverter serial number matching your entities (`sensor.inverter_<inv>_power_ch_<ch>`).
- **`ch`**: Inverter input channel (`1` or `2` for dual-input inverters like DS3/DS3-H; `1` to `4` for quad inverters like QT2).
- **`id`**: Short identifier displayed on the bottom badge of the panel tile.
- **`type`**: 
  - `'h'` = Horizontal / Landscape orientation (standard aspect ratio, min-height `74px`).
  - `'v'` = Vertical / Portrait orientation (taller aspect ratio, min-height `94px`).
- **`model`**: Microinverter model tag displayed in the top right badge (e.g. `'DS3'`, `'DS3-H'`, `'DS3D'`).

#### Examples:

- **Adding a new panel on Row 1, Column 1:**
  ```javascript
  { row: 1, col: 1, inv: "704000000009", ch: 1, id: "000009", type: "h", model: "DS3" },
  ```

- **Changing a panel from Landscape to Portrait:**
  ```javascript
  // Change type: "h" to type: "v"
  { row: 3, col: 1, inv: "704000000005", ch: 1, id: "000005", type: "v", model: "DS3-H" },
  ```

- **Calibrating Panel Wattage Rating (Module Power):**
  By default, panels are calibrated for **450W** modules. If your solar panels are 400W, 420W, or 500W, locate this line in `card_0_array`:
  ```javascript
  let pct = Math.min(100, Math.round((p_state / 450) * 100));
  ```
  Change `450` to your actual module peak rating (e.g. `400` or `500`).

---

### 2. How to Calibrate the Sun & Celestial Arc

The celestial trajectory widget is powered dynamically by Home Assistant's native `sun.sun` entity attributes:
- `sun.sun.attributes.azimuth`
- `sun.sun.attributes.elevation`
- `sun.sun.attributes.next_rising`
- `sun.sun.attributes.next_setting`

#### How Astronomical Solar Noon Works:
Unlike static dashboards that hardcode solar noon to 12:00 or 14:00, this dashboard computes the dynamic solar noon for your exact latitude and day of the year:
```javascript
let solar_noon_mins = Math.round((sunrise_mins + sunset_mins) / 2);
```
- **Morning Arc**: The sun travels from the horizon up to apex solar noon.
- **Afternoon Arc**: The sun travels across the celestial perimeter down to dynamic sunset.
- **Night Arc**: When `sun_elevation <= 0`, the sun transitions to the dashed night horizon, and the real-time Moon Phase orb illuminates with astronomical phase geometry (`waxing_crescent`, `full_moon`, `waning_gibbous`, etc.).

#### Adjusting the Solar Perimeter Track:
In the 400x370 rooftop coordinate space, the sun follows a perimeter track that stays clear of your rooftop hardware tiles:
```javascript
// Morning: climbs left margin (x=6, y=350 -> 50) and rounds corner to solar noon (x=50, y=8)
// Afternoon: traverses top perimeter from solar noon (x=50, y=8) to sunset (x=390, y=8)
```
If your dashboard layout has different aspect ratios, you can adjust the corner bounds `(x=6, y=350)` and apex `(x=50, y=8)` in Section 9 of the array script.

---

### 3. How to Customize or Disable the Chimney & Shadow Obstacle

The roof model includes an architectural obstacle (a brick chimney) that casts a real-time volumetric soft shadow cone onto neighboring panels according to the sun's position.

#### Chimney Location in Grid:
The chimney sits inside the CSS grid layout:
```html
<div style="grid-column: 2; grid-row: 2; ...">
  <!-- Volumetric Soft Shadow Cone Projection -->
  <!-- Brick Chimney Badge -->
</div>
```

#### Center Coordinates & Projection Math:
```javascript
let ch_cx_400 = 115; // Chimney center X in 400x370 space
let ch_cy_400 = 140; // Chimney center Y in 400x370 space
let shadow_active = (is_day && sun_elevation > 2);

// Volumetric shadow length based on sun elevation angle:
let shadow_proj_len = shadow_active 
  ? Math.min(52, Math.max(22, Math.round(34 / Math.tan(Math.max(12, sun_elevation) * Math.PI / 180)))) 
  : 0;
```

#### How to Disable the Chimney Completely:
If your roof has no chimney or shade obstacles:
1. Search for `let shadow_active` in `card_0_array` and set it to `false`:
   ```javascript
   let shadow_active = false;
   ```
2. Remove or comment out the `<div style="grid-column: 2; grid-row: 2; ...">` chimney container block.
3. You can now place another solar panel at Row 2, Col 2!

#### Adjusting Shading Rules:
When a panel is shadowed by the chimney or wall, an amber `CHIMNEY` or `WALL` tag appears on the panel tile. You can customize which panels are evaluated for shading in Section 9 of the script:
```javascript
// Example: Morning shadow check onto Row 2 Col 2/3
if (sun_azimuth <= 185) {
  if ((p.row === 2 && (p.col === 2 || p.col === 3)) || (p.row === 3 && (p.col === 2 || p.col === 3))) {
    if (p_state <= max_panel_watt * 0.45 && p_state < 160) {
      is_shaded = true;
      shade_reason = 'Chimney';
    }
  }
}
```

---

## 📋 Entity Mapping Table

To connect your Home Assistant entities, replace the placeholder IDs in `solar_mission_control.yaml` with your live entities:

| Dashboard Placeholder | Recommended Home Assistant Entity | Description |
|---|---|---|
| `sensor.solar_power` | `sensor.shellyem_channel_2_power` / Solar Meter | Real-time solar production in Watts |
| `sensor.solar_daily_yield` | `sensor.solar_energy_today` / Solar Meter | Today's accumulated solar yield in kWh |
| `sensor.solar_daily_peak_power` | `sensor.solar_peak_today` | Today's maximum solar power in Watts |
| `sensor.grid_daily_import_energy` | `sensor.grid_import_energy_today` | Today's energy imported from grid (kWh) |
| `sensor.grid_daily_export_energy` | `sensor.grid_export_energy_today` | Today's energy exported / returned to grid (kWh) |
| `sensor.return_to_grid_new` | `sensor.grid_power` (negative = export) | Real-time grid return power in Watts |
| `sensor.grid_voltage` | `sensor.shellyem_channel_1_voltage` | AC Grid voltage (e.g. 230V) |
| `sensor.solar_voltage` | `sensor.shellyem_channel_2_voltage` | Solar line AC voltage |
| `sun.sun` | `sun.sun` (HA Core) | Solar azimuth, elevation, sunrise/sunset |
| `sensor.moon_phase` | `sensor.moon_phase` (HA Core or Moon integration) | Real lunar phase calculation |
| `weather.home` | `weather.home` (or Open-Meteo / AEMET) | Weather conditions for solar overlays |
| `sensor.inverter_704000000001_power_ch_1` | `sensor.inverter_<serial>_power_ch_1` | Channel 1 generation in Watts |
| `sensor.inverter_704000000001_power_ch_2` | `sensor.inverter_<serial>_power_ch_2` | Channel 2 generation in Watts |
| `sensor.inverter_704000000001_temperature` | `sensor.inverter_<serial>_temperature` | Inverter operating temperature in °C |
| `sensor.inverter_704000000001_voltage` | `sensor.inverter_<serial>_voltage` | Inverter AC voltage |
| `sensor.ecu_215000000001_inverters_online` | `sensor.ecu_<serial>_inverters_online` | Number of microinverters communicating |
| `sensor.ecu_215000000001_inverters` | `sensor.ecu_<serial>_inverters` | Total microinverters in array |
| `sensor.ecu_215000000001_lifetime_energy` | `sensor.ecu_<serial>_lifetime_energy` | Total lifetime solar energy generated (kWh) |
| `sensor.ecu_215000000001_lifetime_maximum_power` | `sensor.ecu_<serial>_lifetime_maximum_power` | All-time highest solar power record |
| `switch.inverters_fan_plug` | `switch.inverters_cooling_fan` | Auxiliary cooling fan switch |
| `sensor.solcast_pv_forecast_forecast_today` | `sensor.solcast_pv_forecast_forecast_today` | Solcast today's forecasted yield |
| `sensor.precio_kwh` | `sensor.precio_kwh` / Electricity price sensor | Hourly tariff sensor for financial valuation |

---

## 📱 Mobile Tap & WebView Optimization

If you view your Home Assistant dashboards on the official **Home Assistant Companion App** (Android / iOS WebView) or wall-mounted touch tablets:
- This dashboard includes an **in-card software scroll guard (`dx > 8 || dy > 8`)**. When you scroll through your dashboard vertically, panel tap events are suppressed so the card does not open unwanted popups while your finger is moving.
- Auxiliary cooling fan toggles use a **500ms software debounce** to prevent phantom double-taps.
- Click actions pierce Shadow DOM boundaries using `e.composedPath()` ensuring reliable popups on both desktop browsers and mobile touchscreens.

---

## 📄 License

This project is licensed under the MIT License - feel free to modify, extend, and share!
