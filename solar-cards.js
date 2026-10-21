/**
 * Home Assistant Solar & APSystems Mission Control Cards (HACS Compatible)
 * High-performance, modular cards for rooftop photovoltaic topology, microinverter cluster diagnostics,
 * Solcast PV forecasting, and lifetime autarky analytics.
 *
 * Registered Custom Elements:
 * - <solar-rooftop-card>
 * - <solar-forecast-card>
 * - <solar-inverters-card>
 * - <solar-analytics-card>
 * - <solar-mission-control-deck> (All-in-one unified deck)
 */

(function() {
  'use strict';

  // Base Class for Solar Cards
  class BaseSolarCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    setConfig(config) {
      this._config = Object.assign({}, config);
    }

    set hass(hass) {
      this._hass = hass;
      if (typeof window !== 'undefined') {
        window._haHass = hass;
      }
      this._render();
    }

    _render() {
      if (!this._hass) return;
      const states = this._hass.states;
      const hass = this._hass;
      const config = this._config;

      try {
        const html = this.renderContent(states, hass, config);
        this.shadowRoot.innerHTML = `
          <style>
            :host {
              display: block;
            }
            ha-card {
              background: ${this.cardBackground || 'linear-gradient(145deg, #11141a 0%, #1a1e26 100%)'};
              border-radius: 20px;
              border: 1px solid ${this.cardBorder || 'rgba(255, 152, 0, 0.2)'};
              box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
              overflow: hidden;
              padding: 0px;
              display: block;
              pointer-events: auto !important;
            }
            ${this.extraStyles || ''}
          </style>
          <ha-card>
            ${html}
          </ha-card>
        `;
      } catch (err) {
        console.error('Error rendering solar card:', err);
        this.shadowRoot.innerHTML = `<ha-card style="padding: 16px; color: #ff5252;">Error rendering ${this.tagName.toLowerCase()}: ${err.message}</ha-card>`;
      }
    }
  }

  // 1. Solar Rooftop Topology & Celestial Arc Card
  class SolarRooftopCard extends BaseSolarCard {
    get cardBorder() { return 'rgba(255, 152, 0, 0.2)'; }
    renderContent(states, hass, config) {
  const defaultPanelList = [{"row": 1, "col": 3, "inv": "704000000001", "ch": 1, "id": "000001", "type": "h", "model": "DS3"}, {"row": 1, "col": 4, "inv": "704000000002", "ch": 1, "id": "000002", "type": "h", "model": "DS3"}, {"row": 1, "col": 5, "inv": "704000000003", "ch": 1, "id": "000003", "type": "h", "model": "DS3"}, {"row": 1, "col": 6, "inv": "704000000004", "ch": 1, "id": "000004", "type": "h", "model": "DS3"}, {"row": 2, "col": 3, "inv": "704000000001", "ch": 2, "id": "000001", "type": "h", "model": "DS3"}, {"row": 2, "col": 4, "inv": "704000000002", "ch": 2, "id": "000002", "type": "h", "model": "DS3"}, {"row": 2, "col": 5, "inv": "704000000003", "ch": 2, "id": "000003", "type": "h", "model": "DS3"}, {"row": 2, "col": 6, "inv": "704000000004", "ch": 2, "id": "000004", "type": "h", "model": "DS3"}, {"row": 3, "col": 1, "inv": "704000000005", "ch": 1, "id": "000005", "type": "v", "model": "DS3-H"}, {"row": 3, "col": 2, "inv": "704000000005", "ch": 2, "id": "000005", "type": "v", "model": "DS3-H"}, {"row": 3, "col": 3, "inv": "705000000006", "ch": 1, "id": "000006", "type": "h", "model": "DS3"}, {"row": 3, "col": 4, "inv": "705000000006", "ch": 2, "id": "000006", "type": "h", "model": "DS3"}, {"row": 3, "col": 5, "inv": "705000000007", "ch": 1, "id": "000007", "type": "h", "model": "DS3"}, {"row": 3, "col": 6, "inv": "705000000007", "ch": 2, "id": "000007", "type": "h", "model": "DS3"}, {"row": 4, "col": 1, "inv": "704000000008", "ch": 1, "id": "000008", "type": "v", "model": "DS3-H"}, {"row": 4, "col": 2, "inv": "704000000008", "ch": 2, "id": "000008", "type": "v", "model": "DS3-H"}];
  const panelList = (config && config.panels && Array.isArray(config.panels)) ? config.panels : defaultPanelList;
  const uniqueInverters = (config && config.inverters && Array.isArray(config.inverters)) ? config.inverters : [...new Set(panelList.map(p => p.inv))];
  const cardElement = this;
  const cardHelpers = (typeof helpers !== 'undefined' ? helpers : {});

  // 0. Robust Panel Click / Tap Handler with Scroll Guard
  let _lastOpenTime = 0;
  window._openPanelMoreInfo = function(eid, targetEl) {
    if (!eid) return;
    if (window._isCardScrolling) return; // Ignore if user was scrolling!
    const now = Date.now();
    if (now - _lastOpenTime < 450) return; // Debounce rapid triggers
    _lastOpenTime = now;
    
    // Direct Home Assistant hass-more-info CustomEvent
    const infoEv = new CustomEvent('hass-more-info', {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail: { entityId: eid }
    });

    if (targetEl && targetEl.dispatchEvent) {
      try { targetEl.dispatchEvent(infoEv); } catch(err) {}
    }
    if (cardElement && cardElement.dispatchEvent) {
      try { cardElement.dispatchEvent(infoEv); } catch(err) {}
    }
    const ha = document.querySelector('home-assistant');
    if (ha) {
      try { ha.dispatchEvent(infoEv); } catch(err) {}
    }
    try { window.dispatchEvent(infoEv); } catch(err) {}
  };

  // Delegated Capture-Phase Tap Listener with Distance/Scroll Filter
  if (!cardElement._solarDelegatedTap) {
    cardElement._solarDelegatedTap = true;
    let touchStartX = 0;
    let touchStartY = 0;
    window._isCardScrolling = false;

    cardElement.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        window._isCardScrolling = false;
      }
    }, { passive: true, capture: true });

    cardElement.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        const dx = Math.abs(e.touches[0].clientX - touchStartX);
        const dy = Math.abs(e.touches[0].clientY - touchStartY);
        if (dx > 8 || dy > 8) {
          window._isCardScrolling = true; // User is scrolling vertically or horizontally!
        }
      }
    }, { passive: true, capture: true });

    cardElement.addEventListener('touchend', (e) => {
      if (window._isCardScrolling) {
        // User was scrolling, suppress the tap!
        setTimeout(() => { window._isCardScrolling = false; }, 80);
        return;
      }
      const path = e.composedPath ? e.composedPath() : [];
      for (let i = 0; i < path.length; i++) {
        const el = path[i];
        if (el && el.getAttribute && el.getAttribute('data-entity')) {
          const eid = el.getAttribute('data-entity');
          window._openPanelMoreInfo(eid, el);
          break;
        }
      }
    }, { passive: true, capture: true });

    cardElement.addEventListener('click', (e) => {
      if (window._isCardScrolling) {
        e.stopPropagation();
        return;
      }
      const path = e.composedPath ? e.composedPath() : [];
      for (let i = 0; i < path.length; i++) {
        const el = path[i];
        if (el && el.getAttribute && el.getAttribute('data-entity')) {
          const eid = el.getAttribute('data-entity');
          window._openPanelMoreInfo(eid, el);
          break;
        }
      }
    }, true);
  }

  // 1. Live Solar Power (Shelly EM Channel 2)
  const shelly_ent = states['sensor.shellyem_e4525b_channel_2_power'];
  let solar_pwr = shelly_ent ? Math.max(0, Math.round(parseFloat(shelly_ent.state))) : 0;
  if (isNaN(solar_pwr)) solar_pwr = 0;

  // 2. Daily Yield (Shelly EM)
  const yield_ent = states['sensor.solar_daily_yield'];
  let yield_raw = yield_ent ? parseFloat(yield_ent.state) : 0;
  let yield_display = isNaN(yield_raw) ? '0.00 kWh' : yield_raw.toFixed(2) + ' kWh';

  // 3. Inverters Online Status with Solar Night-Standby Awareness
  const online_ent = states['sensor.ecu_215000026612_inverters_online'];
  const total_ent = states['sensor.ecu_215000026612_inverters'];
  let online_count = online_ent ? parseInt(online_ent.state) || 0 : 0;
  let total_count = total_ent ? parseInt(total_ent.state) || 8 : 8;
  const sun_ent0 = states['sun.sun'];
  let sun_elev0 = (sun_ent0 && sun_ent0.attributes && typeof sun_ent0.attributes.elevation === 'number') ? sun_ent0.attributes.elevation : -10;
  let is_sun_down0 = (sun_elev0 <= 0) && (solar_pwr < 50);
  let is_night_standby0 = is_sun_down0 && (online_count === 0);
  let all_online = !is_night_standby0 && (online_count === total_count);

  let inv_badge_text = is_night_standby0 ? '🌙 Night Standby' : (all_online ? `${total_count}/${total_count} Online` : `${online_count}/${total_count} Inverters`);
  let inv_badge_color = is_night_standby0 ? '#90caf9' : (all_online ? '#00e676' : '#ffb74d');
  let inv_badge_bg = is_night_standby0 ? 'rgba(144, 202, 249, 0.12)' : (all_online ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 179, 0, 0.15)');
  let inv_badge_border = is_night_standby0 ? 'rgba(144, 202, 249, 0.35)' : (all_online ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 179, 0, 0.4)');
  let inv_badge_shadow = is_night_standby0 ? '0 0 10px rgba(144, 202, 249, 0.2)' : (all_online ? '0 0 10px rgba(0, 230, 118, 0.2)' : '0 0 10px rgba(255, 179, 0, 0.2)');

  // ECU Sync Timestamp
  const ecu_life_ent = states['sensor.ecu_215000026612_lifetime_energy'];
  let ecu_sync_str = '--:--';
  if (ecu_life_ent && ecu_life_ent.attributes && ecu_life_ent.attributes.last_data_update) {
    try {
      let parts = ecu_life_ent.attributes.last_data_update.split(' ');
      if (parts.length > 1) {
        ecu_sync_str = parts[1].substring(0, 5);
      }
    } catch(e) {}
  }

  // 4. Grid Return / Export / Import & Home Load
  const grid_ent = states['sensor.return_to_grid_new'];
  let grid_raw = grid_ent ? parseFloat(grid_ent.state) : 0;
  if (isNaN(grid_raw)) grid_raw = 0;
  let is_exporting = grid_raw < 0;
  let export_w = is_exporting ? Math.abs(grid_raw) : 0;
  let import_w = !is_exporting ? grid_raw : 0;
  let home_load = is_exporting ? Math.max(0, solar_pwr - export_w) : (solar_pwr + import_w);
  let solar_cov_pct = home_load > 0 ? Math.min(100, Math.round((solar_pwr / home_load) * 100)) : 100;

  // 5. Inverter Thermal Stats across all 8 microinverters
  let temps = [];
  for (const inv of uniqueInverters) {
    let t_ent = states['sensor.inverter_' + inv + '_temperature'];
    if (t_ent && !isNaN(parseFloat(t_ent.state))) {
      temps.push(parseFloat(t_ent.state));
    }
  }
  let min_temp = temps.length ? Math.min(...temps).toFixed(0) : '--';
  let max_temp = temps.length ? Math.max(...temps).toFixed(0) : '--';
  let avg_temp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(0) : '--';

  // 6. Solcast Forecast & Peak Time
  const sol_today_ent = states['sensor.solcast_pv_forecast_forecast_today'];
  const sol_rem_ent = states['sensor.solcast_pv_forecast_forecast_remaining_today'];
  const sol_peak_ent = states['sensor.solcast_pv_forecast_peak_forecast_today'];
  const sol_time_ent = states['sensor.solcast_pv_forecast_peak_time_today'];
  let sol_today = sol_today_ent && !isNaN(parseFloat(sol_today_ent.state)) ? parseFloat(sol_today_ent.state).toFixed(1) : '0.0';
  let sol_rem = sol_rem_ent && !isNaN(parseFloat(sol_rem_ent.state)) ? parseFloat(sol_rem_ent.state).toFixed(1) : '0.0';
  let sol_peak_w = sol_peak_ent && !isNaN(parseFloat(sol_peak_ent.state)) ? parseFloat(sol_peak_ent.state) : 0;
  let sol_peak_str = sol_peak_w >= 1000 ? (sol_peak_w / 1000).toFixed(1) + ' kW' : Math.round(sol_peak_w) + ' W';

  // Real Achieved Peak Measured Today (Daily Midnight-Reset Peak prioritized over 24h rolling buffer)
  const real_peak_ent = states['sensor.solar_daily_peak_power'] || states['sensor.living_room_shellyem_e4525b_channel_2_solar_peak_today'];
  let real_peak_w = real_peak_ent && !isNaN(parseFloat(real_peak_ent.state)) ? parseFloat(real_peak_ent.state) : null;
  let real_peak_str = real_peak_w ? (real_peak_w >= 1000 ? (real_peak_w / 1000).toFixed(1) + ' kW' : Math.round(real_peak_w) + ' W') : '0 W';

  // Delta calculation: Produced Today vs Solcast Forecast (Strict zero fallbacks, no hardcoded constants)
  let solcast_f = sol_today_ent && !isNaN(parseFloat(sol_today_ent.state)) ? parseFloat(sol_today_ent.state) : 0;
  let yield_kwh_val = yield_ent && !isNaN(parseFloat(yield_ent.state)) ? parseFloat(yield_ent.state) : 0;
  let delta_kwh = yield_kwh_val - solcast_f;
  let delta_pct = solcast_f > 0 ? (delta_kwh / solcast_f) * 100 : 0;
  let delta_is_pos = delta_kwh >= 0;
  let delta_str = (delta_is_pos ? '▲ +' : '▼ ') + Math.abs(delta_kwh).toFixed(2) + ' kWh (' + (delta_is_pos ? '+' : '') + delta_pct.toFixed(1) + '%)';
  let delta_color = delta_is_pos ? '#00e676' : '#ffa726';
  
  let peak_date = new Date();
  peak_date.setHours(14, 0, 0, 0);
  let sol_time_str = '14:00';
  if (sol_time_ent && sol_time_ent.state) {
    try {
      let d = new Date(sol_time_ent.state);
      if (!isNaN(d.getTime())) {
        peak_date = d;
        let hh = String(d.getHours()).padStart(2, '0');
        let mm = String(d.getMinutes()).padStart(2, '0');
        sol_time_str = hh + ':' + mm;
      }
    } catch(e) {}
  }

  // 7. Sun Arc & Solar Diurnal Dynamics
  const sun_ent = states['sun.sun'];
  let sunrise_str = '08:15';
  let sunset_str = '19:50';
  let sunrise_mins = 8 * 60 + 15;
  let sunset_mins = 19 * 60 + 50;
  let sun_azimuth = 180;
  let sun_elevation = 35;

  if (sun_ent && sun_ent.attributes) {
    if (sun_ent.attributes.next_rising) {
      let r = new Date(sun_ent.attributes.next_rising);
      sunrise_str = String(r.getHours()).padStart(2, '0') + ':' + String(r.getMinutes()).padStart(2, '0');
      sunrise_mins = r.getHours() * 60 + r.getMinutes();
    }
    if (sun_ent.attributes.next_setting) {
      let s = new Date(sun_ent.attributes.next_setting);
      sunset_str = String(s.getHours()).padStart(2, '0') + ':' + String(s.getMinutes()).padStart(2, '0');
      sunset_mins = s.getHours() * 60 + s.getMinutes();
    }
    if (typeof sun_ent.attributes.azimuth === 'number') sun_azimuth = sun_ent.attributes.azimuth;
    if (typeof sun_ent.attributes.elevation === 'number') sun_elevation = sun_ent.attributes.elevation;
  }

  let now = new Date();
  let now_mins = now.getHours() * 60 + now.getMinutes();
  let day_duration = Math.max(1, sunset_mins - sunrise_mins);
  let sun_t = Math.max(0, Math.min(1, (now_mins - sunrise_mins) / day_duration));
  let is_day = (sun_elevation > 0);

  // Dynamic Astronomical Solar Noon (computed from actual sunrise & sunset for any day/season)
  let solar_noon_mins = Math.round((sunrise_mins + sunset_mins) / 2);
  let solar_noon_hh = String(Math.floor(solar_noon_mins / 60)).padStart(2, '0');
  let solar_noon_mm = String(solar_noon_mins % 60).padStart(2, '0');
  let solar_noon_str = solar_noon_hh + ':' + solar_noon_mm;

  // True solar noon sits at apex of daytime arc (t = 0.5)
  let peak_t = 0.5;
  // Determine contextual peak text: after sunset or afternoon, show Achieved Real Peak
  let peak_badge_text = (!is_day || now_mins >= solar_noon_mins) 
    ? `⚡ Achieved Peak ${real_peak_str}` 
    : `☀️ Solar Noon ${solar_noon_str}`;

  // Arc geometry: width=360, height=72. Horizon at y=52. Apex at y=16.
  const getArcPoint = (t) => {
    let x = 38 + t * 284;
    let y = 52 - 36 * Math.sin(t * Math.PI);
    return { x, y };
  };

  const getNightArcPoint = (t) => {
    let x = 38 + t * 284;
    let y = 52 + 16 * Math.sin(t * Math.PI);
    return { x, y };
  };

  // Helios-aligned solar trajectory mapping
  // X-position tracks solar azimuth (~90° sunrise to ~270° sunset)
  let t_az = Math.max(0, Math.min(1, (sun_azimuth - 85) / 190));
  let sun_x = 38 + t_az * 284;
  // Y-position maps actual solar elevation to arc height (0° at horizon y=52, 45° noon apex at y=16)
  let sun_y = is_day ? (52 - Math.min(36, Math.max(0, (sun_elevation / 45) * 36))) : 52;
  let sun_pos = { x: sun_x, y: sun_y };
  let peak_pos = getArcPoint(peak_t);

  // Weather condition: 100% Synchronized with Open-Meteo (same as main dashboard)
  const w_open = states['weather.open_meteo'] || states['weather.home'];
  let w_state = (w_open && w_open.state) ? String(w_open.state).toLowerCase() : 'cloudy';

  let is_stormy = ['lightning', 'exceptional'].includes(w_state);
  let is_rainy = ['rainy', 'pouring', 'lightning-rainy', 'snowy-rainy', 'hail'].includes(w_state);
  let is_cloudy = !is_rainy && ['cloudy', 'overcast', 'fog'].includes(w_state);
  let is_partly_cloudy = !is_rainy && !is_cloudy && ['partlycloudy', 'partly_cloudy', 'windy-variant'].includes(w_state);
  
  let weather_label = 'Clear';
  let weather_icon = '☀️';
  if (is_stormy) { weather_label = 'Stormy'; weather_icon = '⛈️'; }
  else if (is_rainy) { weather_label = 'Rainy'; weather_icon = '🌧️'; }
  else if (is_cloudy) { weather_label = 'Cloudy'; weather_icon = '⛅'; }
  else if (is_partly_cloudy) { weather_label = 'Partly Cloudy'; weather_icon = '🌤️'; }

  // Dynamic Sun Glow & Chromatic Shift (Diurnal progression + Real-time Weather Attenuation)
  let elevation_factor = Math.sin(sun_t * Math.PI); // 0 at horizon, 1 at peak noon
  let sun_core_color, sun_corona_color, sun_filter_glow, sun_halo_radius, sun_halo_opacity;

  if (is_rainy || is_stormy) {
    // Rainy / Stormy: Heavily obscured behind dark slate clouds
    sun_core_color = '#b0bec5';
    sun_corona_color = '#78909c';
    sun_filter_glow = 'drop-shadow(0 0 3px rgba(120, 144, 156, 0.4))';
    sun_halo_radius = 6;
    sun_halo_opacity = 0.2;
  } else if (is_cloudy) {
    // Cloudy / Overcast: Filtered soft silver-gold sun
    sun_core_color = '#fff59d';
    sun_corona_color = '#cfd8dc';
    sun_filter_glow = 'drop-shadow(0 0 5px rgba(255, 238, 88, 0.4))';
    sun_halo_radius = 8;
    sun_halo_opacity = 0.25;
  } else if (elevation_factor > 0.75) {
    // Peak Noon (Clear / Radiant)
    sun_core_color = '#ffffff';
    sun_corona_color = '#ffd54f';
    sun_filter_glow = 'drop-shadow(0 0 10px #ffc107) drop-shadow(0 0 22px rgba(255, 193, 7, 0.6))';
    sun_halo_radius = is_partly_cloudy ? 12 : 16;
    sun_halo_opacity = is_partly_cloudy ? 0.45 : 0.6;
  } else if (elevation_factor > 0.35) {
    // Mid-Morning / Afternoon
    sun_core_color = '#fff9c4';
    sun_corona_color = '#ffa000';
    sun_filter_glow = 'drop-shadow(0 0 8px #ff9800) drop-shadow(0 0 14px rgba(255, 152, 0, 0.35))';
    sun_halo_radius = is_partly_cloudy ? 9 : 11;
    sun_halo_opacity = is_partly_cloudy ? 0.3 : 0.4;
  } else {
    // Sunrise / Sunset: Few glow, deep fiery orange-red
    sun_core_color = '#ff8a65';
    sun_corona_color = '#ff5722';
    sun_filter_glow = 'drop-shadow(0 0 5px #e64a19)';
    sun_halo_radius = 7;
    sun_halo_opacity = 0.25;
  }

  // 8. Real Moon Phase & Lunar Position on Night Arc
  const moon_ent = states['sensor.moon_phase'];
  let moon_phase_state = moon_ent ? moon_ent.state : 'waning_gibbous';
  const moon_names = {
    'new_moon': 'New Moon',
    'waxing_crescent': 'Waxing Crescent',
    'first_quarter': 'First Quarter',
    'waxing_gibbous': 'Waxing Gibbous',
    'full_moon': 'Full Moon',
    'waning_gibbous': 'Waning Gibbous',
    'last_quarter': 'Last Quarter',
    'waning_crescent': 'Waning Crescent'
  };
  let moon_name = moon_names[moon_phase_state] || 'Moon';
  
  // Real astronomical lunar illumination path
  let moon_t = 0.58; // Current waning gibbous night arc progress
  if (!is_day) {
    let night_duration = (24 * 60) - day_duration;
    let night_mins = (now_mins >= sunset_mins) ? (now_mins - sunset_mins) : (now_mins + (24 * 60 - sunset_mins));
    moon_t = Math.max(0, Math.min(1, night_mins / night_duration));
  }
  let moon_pos = getNightArcPoint(moon_t);

  // Dynamic Moon SVG Phase Illumination (Northern Hemisphere / Spain astronomical geometry)
  let moon_svg_content = '';
  const mr = 4.5;
  const dark_moon = `<circle cx="0" cy="0" r="${mr}" fill="#18202c" stroke="rgba(255,255,255,0.2)" stroke-width="0.5" />`;
  
  switch(moon_phase_state) {
    case 'new_moon':
      moon_svg_content = dark_moon;
      break;
    case 'waxing_crescent':
      moon_svg_content = dark_moon + `<path d="M 0 -${mr} A ${mr} ${mr} 0 0 1 0 ${mr} A ${mr*0.5} ${mr} 0 0 0 0 -${mr} Z" fill="#e0f7fa" />`;
      break;
    case 'first_quarter':
      moon_svg_content = dark_moon + `<path d="M 0 -${mr} A ${mr} ${mr} 0 0 1 0 ${mr} Z" fill="#e0f7fa" />`;
      break;
    case 'waxing_gibbous':
      moon_svg_content = dark_moon + `<path d="M 0 -${mr} A ${mr} ${mr} 0 0 1 0 ${mr} A ${mr*0.5} ${mr} 0 0 1 0 -${mr} Z" fill="#e0f7fa" />`;
      break;
    case 'full_moon':
      moon_svg_content = `<circle cx="0" cy="0" r="${mr}" fill="#e0f7fa" style="filter: drop-shadow(0 0 4px #b3e5fc);" />`;
      break;
    case 'waning_gibbous':
      moon_svg_content = dark_moon + `<path d="M 0 -${mr} A ${mr} ${mr} 0 0 0 0 ${mr} A ${mr*0.5} ${mr} 0 0 0 0 -${mr} Z" fill="#e0f7fa" />`;
      break;
    case 'last_quarter':
      moon_svg_content = dark_moon + `<path d="M 0 -${mr} A ${mr} ${mr} 0 0 0 0 ${mr} Z" fill="#e0f7fa" />`;
      break;
    case 'waning_crescent':
      moon_svg_content = dark_moon + `<path d="M 0 -${mr} A ${mr} ${mr} 0 0 0 0 ${mr} A ${mr*0.5} ${mr} 0 0 1 0 -${mr} Z" fill="#e0f7fa" />`;
      break;
    default:
      moon_svg_content = dark_moon + `<path d="M 0 -${mr} A ${mr} ${mr} 0 0 0 0 ${mr} A ${mr*0.5} ${mr} 0 0 0 0 -${mr} Z" fill="#e0f7fa" />`;
  }

  // 9. Exact Calibrated Solar Vector, Mobile-Clear Perimeter Track & Volumetric Shadow Cone
  // Chimney center in 400x370 coordinate space (Row 2, Col 2: center x=115, y=140)
  let ch_cx_400 = 115;
  let ch_cy_400 = 140;
  let shadow_active = (is_day && sun_elevation > 2);

  // A. Dynamic Piecewise Perimeter Solar Track Trajectory (400x370 coordinate space)
  // 100% Dynamic Solar Pacing for every day of the year:
  // - Morning: travels up left margin (x=6, y=350 -> 50) and rounds corner to solar noon (x=6->50, y=50->8)
  // - Afternoon: travels across top margin from solar noon (x=50, y=8) past chimney (x=115, y=8) to dynamic sunset (x=390, y=8)
  let sun_track_x = 6;
  let sun_track_y = 350;

  if (now_mins < solar_noon_mins) {
    let morn_duration = Math.max(1, solar_noon_mins - sunrise_mins);
    let morn_t = Math.max(0, Math.min(1, (now_mins - sunrise_mins) / morn_duration));
    if (morn_t <= 0.85) {
      let s = morn_t / 0.85;
      sun_track_x = 6;
      sun_track_y = Math.round(350 - s * 300);
    } else {
      let s = (morn_t - 0.85) / 0.15;
      sun_track_x = Math.round(6 + 44 * s);
      sun_track_y = Math.round(50 - 42 * s);
    }
  } else {
    // Dynamic Afternoon Progression: spans solar noon to dynamic sunset time (sunset_mins)
    let aft_duration = Math.max(1, sunset_mins - solar_noon_mins);
    let aft_t = Math.max(0, Math.min(1, (now_mins - solar_noon_mins) / aft_duration));

    // Chimney alignment occurs at ~58% of the afternoon (~17:25 / Az 238°)
    if (aft_t <= 0.58) {
      let s = aft_t / 0.58;
      sun_track_x = Math.round(50 + s * 65);
      sun_track_y = 8;
    } else {
      // Accelerates from chimney (x=115) to end of track (x=390) exactly at dynamic sunset (aft_t = 1.0)
      let s = (aft_t - 0.58) / 0.42;
      sun_track_x = Math.round(115 + s * 275);
      sun_track_y = 8;
    }
  }

  // B. Unified True Direction Vector (from Sun to Chimney)
  let v_dx = ch_cx_400 - sun_track_x;
  let v_dy = ch_cy_400 - sun_track_y;
  let v_len = Math.hypot(v_dx, v_dy) || 1;
  let shadow_dx = v_dx / v_len;
  let shadow_dy = v_dy / v_len;
  let shadow_perp_x = -shadow_dy;
  let shadow_perp_y = shadow_dx;
  let shadow_angle_rad = Math.atan2(shadow_dy, shadow_dx);

  // 3D Dynamic Facet Rim Light: highlights sunward edge of the brick chimney
  let rim_x = shadow_active ? Math.round(-shadow_dx * 4) : 0;
  let rim_y = shadow_active ? Math.round(-shadow_dy * 4) : 0;
  let chimney_shadow = shadow_active 
    ? `${rim_x}px ${rim_y}px 12px rgba(255, 183, 77, 0.45), 0 0 10px rgba(0, 0, 0, 0.7)`
    : '0 0 10px rgba(0, 0, 0, 0.6)';

  // C. Volumetric Soft Cast Shadow Cone (projects away from sun behind chimney)
  let shadow_proj_len = shadow_active ? Math.min(52, Math.max(22, Math.round(34 / Math.tan(Math.max(12, sun_elevation) * Math.PI / 180)))) : 0;

  // D. Dynamic Diurnal Solar Scale, Chromatic Shift & Weather Synchronization
  let elev_factor = Math.max(0, Math.min(1, is_day ? (sun_elevation / 42) : 0));
  let topo_r_core = (2.8 + elev_factor * 3.2).toFixed(1);
  let topo_r_corona = (5.5 + elev_factor * 6.0).toFixed(1);
  let topo_r_aura = (8.0 + elev_factor * 10.0).toFixed(1);

  let topo_sun_core_color, topo_sun_corona_color, topo_sun_aura_color, topo_corona_filter, topo_aura_opacity;
  let topo_beam_start_color, topo_beam_mid_color, topo_beam_end_color, topo_beam_glow;

  if (is_rainy || is_stormy) {
    // Obscured Nimbus: Muted slate-gray core & dimmed atmospheric halo
    topo_sun_core_color = '#b0bec5';
    topo_sun_corona_color = '#78909c';
    topo_sun_aura_color = '#607d8b';
    topo_aura_opacity = 0.15;
    topo_corona_filter = 'drop-shadow(0 0 4px rgba(120, 144, 156, 0.4))';
    topo_beam_start_color = 'rgba(176, 190, 197, 0.4)';
    topo_beam_mid_color = 'rgba(120, 144, 156, 0.12)';
    topo_beam_end_color = 'rgba(96, 125, 139, 0.0)';
    topo_beam_glow = 'rgba(120, 144, 156, 0.2)';
  } else if (is_cloudy) {
    // Overcast: Soft milky white core & diffused halo
    topo_sun_core_color = '#eceff1';
    topo_sun_corona_color = '#b0bec5';
    topo_sun_aura_color = '#cfd8dc';
    topo_aura_opacity = 0.2;
    topo_corona_filter = 'drop-shadow(0 0 6px rgba(176, 190, 197, 0.45))';
    topo_beam_start_color = 'rgba(207, 216, 220, 0.5)';
    topo_beam_mid_color = 'rgba(176, 190, 197, 0.18)';
    topo_beam_end_color = 'rgba(144, 164, 174, 0.0)';
    topo_beam_glow = 'rgba(176, 190, 197, 0.25)';
  } else if (elev_factor >= 0.65) {
    // Peak Noon (Clear): Largest, radiant white core + bright golden yellow corona & halo
    topo_sun_core_color = '#ffffff';
    topo_sun_corona_color = '#ffd54f';
    topo_sun_aura_color = '#ffc107';
    topo_aura_opacity = 0.35;
    topo_corona_filter = 'drop-shadow(0 0 10px #ffc107) drop-shadow(0 0 20px rgba(255, 193, 7, 0.65))';
    topo_beam_start_color = '#ffffff';
    topo_beam_mid_color = '#ffd54f';
    topo_beam_end_color = '#ff9800';
    topo_beam_glow = 'rgba(255, 213, 79, 0.5)';
  } else if (elev_factor >= 0.25) {
    // Mid-Day / Afternoon (Clear): Warm golden yellow
    topo_sun_core_color = '#fff9c4';
    topo_sun_corona_color = '#ffa726';
    topo_sun_aura_color = '#ff9800';
    topo_aura_opacity = 0.25;
    topo_corona_filter = 'drop-shadow(0 0 8px #ff9800) drop-shadow(0 0 14px rgba(255, 152, 0, 0.45))';
    topo_beam_start_color = '#ffd54f';
    topo_beam_mid_color = '#ffb74d';
    topo_beam_end_color = '#ff9800';
    topo_beam_glow = 'rgba(255, 183, 77, 0.4)';
  } else {
    // Sunrise & Sunset (Clear): Tiny, deep fiery orange-red orb with warm ember glow
    topo_sun_core_color = '#ff8a65';
    topo_sun_corona_color = '#ff5722';
    topo_sun_aura_color = '#e64a19';
    topo_aura_opacity = 0.2;
    topo_corona_filter = 'drop-shadow(0 0 5px #e64a19) drop-shadow(0 0 9px rgba(230, 74, 25, 0.45))';
    topo_beam_start_color = '#ff7043';
    topo_beam_mid_color = '#ff5722';
    topo_beam_end_color = '#e64a19';
    topo_beam_glow = 'rgba(255, 87, 34, 0.35)';
  }

  // Local chimney SVG space: center is (100, 100)
  let l_cx = 100, l_cy = 100;
  let r_chimney = 22; // Offset to start at chimney border
  let w_base = 22;    // Base width of shadow cone at chimney facet
  let w_tip = w_base + shadow_proj_len * 0.55; // Tapers outward as a fan

  let bx = l_cx + shadow_dx * r_chimney;
  let by = l_cy + shadow_dy * r_chimney;
  let b1_x = (bx + shadow_perp_x * (w_base / 2)).toFixed(1);
  let b1_y = (by + shadow_perp_y * (w_base / 2)).toFixed(1);
  let b2_x = (bx - shadow_perp_x * (w_base / 2)).toFixed(1);
  let b2_y = (by - shadow_perp_y * (w_base / 2)).toFixed(1);

  let tx = l_cx + shadow_dx * (r_chimney + shadow_proj_len);
  let ty = l_cy + shadow_dy * (r_chimney + shadow_proj_len);
  let t1_x = (tx + shadow_perp_x * (w_tip / 2)).toFixed(1);
  let t1_y = (ty + shadow_perp_y * (w_tip / 2)).toFixed(1);
  let t2_x = (tx - shadow_perp_x * (w_tip / 2)).toFixed(1);
  let t2_y = (ty - shadow_perp_y * (w_tip / 2)).toFixed(1);

  let shadow_cone_path = `M ${b1_x} ${b1_y} L ${t1_x} ${t1_y} L ${t2_x} ${t2_y} L ${b2_x} ${b2_y} Z`;

  // 4b. EV / Tesla Smart Solar Charging Telemetry
  const evse_pwr_ent = states['sensor.evse_192_168_0_249_charge_power'];
  const evse_chg_ent = states['binary_sensor.evse_192_168_0_249_charging'];
  let evse_pwr = (evse_pwr_ent && !isNaN(parseFloat(evse_pwr_ent.state))) ? parseFloat(evse_pwr_ent.state) : 0;
  let is_ev_charging = (evse_chg_ent && evse_chg_ent.state === 'on') || evse_pwr >= 200;
  let base_home_load = Math.max(0, home_load - (is_ev_charging ? evse_pwr : 0));

  // 10. Smart Appliance Advisor Banner (Dynamic Real-Time Headroom Logic)
  let banner_bg, banner_border, banner_icon, banner_title, banner_sub, banner_glow, banner_badge;
  if (is_ev_charging && evse_pwr >= 200) {
    banner_bg = 'linear-gradient(135deg, rgba(0, 229, 255, 0.16) 0%, rgba(33, 150, 243, 0.22) 100%)';
    banner_border = 'rgba(0, 229, 255, 0.5)';
    banner_glow = '0 0 16px rgba(0, 229, 255, 0.3)';
    banner_icon = 'mdi:car-electric';
    banner_badge = 'TESLA SOLAR CHARGING';
    banner_title = '🚗 Charging Tesla: +' + (evse_pwr >= 1000 ? (evse_pwr / 1000).toFixed(2) + ' kW' : Math.round(evse_pwr) + ' W');
    banner_sub = export_w >= 500
      ? 'Diverting surplus to Tesla with +' + (export_w >= 1000 ? (export_w / 1000).toFixed(1) + ' kW' : Math.round(export_w) + ' W') + ' extra export headroom still available.'
      : 'Absorbing solar surplus (' + (evse_pwr >= 1000 ? (evse_pwr / 1000).toFixed(1) + ' kW' : Math.round(evse_pwr) + ' W') + ') • Base household load: ' + Math.round(base_home_load) + ' W.';
  } else if (export_w >= 2500) {
    banner_bg = 'linear-gradient(135deg, rgba(0, 230, 118, 0.16) 0%, rgba(0, 180, 136, 0.25) 100%)';
    banner_border = 'rgba(0, 230, 118, 0.55)';
    banner_glow = '0 0 20px rgba(0, 230, 118, 0.35)';
    banner_icon = 'mdi:lightning-bolt-circle';
    banner_badge = 'HIGH SOLAR HEADROOM';
    banner_title = '⚡ +' + (export_w >= 1000 ? (export_w / 1000).toFixed(2) + ' kW' : Math.round(export_w) + ' W') + ' Surplus Exporting';
    banner_sub = 'Capacity to run multiple heavy loads with zero grid import.';
  } else if (export_w >= 1000) {
    banner_bg = 'linear-gradient(135deg, rgba(0, 230, 118, 0.12) 0%, rgba(0, 200, 150, 0.2) 100%)';
    banner_border = 'rgba(0, 230, 118, 0.45)';
    banner_glow = '0 0 16px rgba(0, 230, 118, 0.25)';
    banner_icon = 'mdi:transmission-tower-export';
    banner_badge = 'CLEAN SOLAR HEADROOM';
    banner_title = '⚡ +' + (export_w >= 1000 ? (export_w / 1000).toFixed(2) + ' kW' : Math.round(export_w) + ' W') + ' Surplus Exporting';
    banner_sub = 'Capacity to run 1 heavy appliance with zero grid import.';
  } else if (is_exporting && export_w > 0) {
    banner_bg = 'linear-gradient(135deg, rgba(0, 229, 255, 0.12) 0%, rgba(0, 122, 255, 0.18) 100%)';
    banner_border = 'rgba(0, 229, 255, 0.4)';
    banner_glow = '0 0 14px rgba(0, 229, 255, 0.2)';
    banner_icon = 'mdi:solar-power';
    banner_badge = '100% SELF POWERED';
    banner_title = '📤 Grid Export: +' + (export_w >= 1000 ? (export_w/1000).toFixed(2) + ' kW' : Math.round(export_w) + ' W');
    banner_sub = 'Home loads 100% covered • Mild surplus buffer to grid.';
  } else {
    banner_bg = 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(244, 67, 54, 0.12) 100%)';
    banner_border = 'rgba(255, 152, 0, 0.3)';
    banner_glow = 'none';
    banner_icon = 'mdi:home-lightning-bolt';
    banner_badge = solar_cov_pct + '% SELF-POWERED';
    banner_title = '🏠 Home Consumption: ' + Math.round(home_load) + ' W';
    banner_sub = solar_cov_pct >= 100 ? 'Solar fully covers household loads — zero grid import!' : (solar_cov_pct >= 50 ? 'Solar covering ' + solar_cov_pct + '% of household load — balance supplemented by grid.' : 'Solar covering ' + solar_cov_pct + '% — net household deficit supplied by grid.');
  }

  // Pre-scan panels for median / max wattage to detect empirical shading
  let panel_watts = [];
  for (const p of panelList) {
    let eid = 'sensor.inverter_' + p.inv + '_power_ch_' + p.ch;
    let val = states[eid] ? parseFloat(states[eid].state) : 0;
    if (!isNaN(val) && val > 0) panel_watts.push(val);
  }
  let max_panel_watt = panel_watts.length ? Math.max(...panel_watts) : 200;

  let output = `
    <style>
      @keyframes rainDropAnim {
        0% { transform: translateY(0) translateX(0); opacity: 0; }
        30% { opacity: 1; }
        100% { transform: translateY(11px) translateX(-2px); opacity: 0; }
      }
      .solar-rain-1 { animation: rainDropAnim 0.75s linear infinite !important; }
      .solar-rain-2 { animation: rainDropAnim 0.85s linear infinite 0.25s !important; }
      .solar-rain-3 { animation: rainDropAnim 0.7s linear infinite 0.5s !important; }
      .solar-rain-4 { animation: rainDropAnim 0.8s linear infinite 0.35s !important; }
    </style>
    <div style="position: relative; pointer-events: auto !important; padding: 16px 12px 14px; box-sizing: border-box; width: 100%; border-radius: 20px; overflow: hidden; background: radial-gradient(circle at 50% 0%, rgba(255, 152, 0, 0.14) 0%, rgba(14, 17, 24, 0.98) 55%);">
      
      <!-- Top Header: Title & Clean Subtitle Centered Under Solar Array -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding: 0 2px;">
        <div style="display: flex; align-items: center; gap: 9px;">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, rgba(255, 152, 0, 0.25) 0%, rgba(255, 87, 34, 0.2) 100%); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255, 152, 0, 0.4); box-shadow: 0 0 12px rgba(255, 152, 0, 0.3);">
            <ha-icon icon="mdi:solar-power-variant" style="color: #ffb74d; --mdc-icon-size: 21px;"></ha-icon>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-start;">
            <div style="font-size: 17px; font-weight: 800; color: #ffffff; letter-spacing: 0.2px; line-height: 1.1;">Solar Array</div>
            <div style="font-size: 9.5px; color: rgba(255, 255, 255, 0.55); font-weight: 600; margin-top: 2px;">16 × 450W (7.2 kWp)</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); padding: 3px 8px; border-radius: 12px; font-size: 9.5px; font-weight: 600; color: rgba(255, 255, 255, 0.65); display: flex; align-items: center; gap: 4px;">
            <ha-icon icon="mdi:sync" style="color: rgba(255, 255, 255, 0.5); --mdc-icon-size: 11px;"></ha-icon>
            ECU ${ecu_sync_str}
          </div>
          <div style="background: ${inv_badge_bg}; border: 1px solid ${inv_badge_border}; padding: 3px 9px; border-radius: 12px; font-size: 10.5px; font-weight: 700; color: ${inv_badge_color}; display: flex; align-items: center; gap: 5px; box-shadow: ${inv_badge_shadow};">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: ${inv_badge_color}; box-shadow: 0 0 6px ${inv_badge_color};"></span>
            ${inv_badge_text}
          </div>
        </div>
      </div>

      <!-- 4 Sleek Frosted Glass Metric Tiles (Power Triad + Yield Pacing) -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-bottom: 12px;">
        <!-- Tile 1: Solar Output Now -->
        <div style="background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 179, 0, 0.35); box-shadow: 0 0 14px rgba(255, 152, 0, 0.12), inset 0 0 10px rgba(255, 152, 0, 0.05); border-radius: 12px; padding: 8px 4px; display: flex; flex-direction: column; align-items: center; text-align: center;">
          <div style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.55); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Solar Now</div>
          <div style="font-size: 15px; font-weight: 800; color: #ffb74d; letter-spacing: -0.3px; line-height: 1.1; text-shadow: 0 0 10px rgba(255, 183, 77, 0.5);">${solar_pwr >= 1000 ? (solar_pwr/1000).toFixed(2) + ' kW' : solar_pwr + ' W'}</div>
          <div style="font-size: 7.5px; color: rgba(255, 255, 255, 0.4); margin-top: 3px;">Instant Shelly</div>
        </div>

        <!-- Tile 2: House Load (Home Consumption) -->
        <div style="background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 0 14px rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 8px 4px; display: flex; flex-direction: column; align-items: center; text-align: center;">
          <div style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.55); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">House Load</div>
          <div style="font-size: 15px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px; line-height: 1.1;">${home_load >= 1000 ? (home_load/1000).toFixed(2) + ' kW' : Math.round(home_load) + ' W'}</div>
          <div style="font-size: 7.5px; font-weight: 600; color: ${solar_cov_pct >= 100 ? '#81c784' : '#ffa726'}; margin-top: 3px;">${is_ev_charging && evse_pwr >= 200 ? '🚗 ' + (evse_pwr >= 1000 ? (evse_pwr/1000).toFixed(1) + 'k' : Math.round(evse_pwr) + 'W') + ' EV' : solar_cov_pct + '% Solar'}</div>
        </div>

        <!-- Tile 3: Grid Flow -->
        <div style="background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid ${is_exporting ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255, 152, 0, 0.25)'}; box-shadow: 0 0 14px ${is_exporting ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 152, 0, 0.08)'}; border-radius: 12px; padding: 8px 4px; display: flex; flex-direction: column; align-items: center; text-align: center;">
          <div style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.55); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">${is_exporting ? 'Grid Export' : 'Grid Import'}</div>
          <div style="font-size: 15px; font-weight: 800; color: ${is_exporting ? '#00e5ff' : '#ffa726'}; letter-spacing: -0.3px; line-height: 1.1; text-shadow: 0 0 10px ${is_exporting ? 'rgba(0, 229, 255, 0.4)' : 'rgba(255, 167, 38, 0.4)'};">${is_exporting ? '+' + (export_w >= 1000 ? (export_w/1000).toFixed(2) + ' kW' : Math.round(export_w) + ' W') : (import_w >= 1000 ? (import_w/1000).toFixed(2) + ' kW' : Math.round(import_w) + ' W')}</div>
          <div style="font-size: 7.5px; color: rgba(255, 255, 255, 0.4); margin-top: 3px;">${is_exporting ? 'To Net' : 'From Net'}</div>
        </div>

        <!-- Tile 4: Daily Yield with Clean Target Pacing -->
        <div style="background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(0, 230, 118, 0.3); box-shadow: 0 0 14px rgba(0, 230, 118, 0.1), inset 0 0 10px rgba(0, 230, 118, 0.05); border-radius: 12px; padding: 8px 4px; display: flex; flex-direction: column; align-items: center; text-align: center;">
          <div style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.55); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Yield Today</div>
          <div style="font-size: 15px; font-weight: 800; color: #81c784; letter-spacing: -0.3px; line-height: 1.1; text-shadow: 0 0 10px rgba(129, 199, 132, 0.4);">${yield_display}</div>
          <div style="font-size: 7.5px; font-weight: 700; color: #81c784; margin-top: 3px; letter-spacing: -0.1px;" title="Forecast Target: ${solcast_f.toFixed(1)} kWh">
            🎯 ${solcast_f > 0 ? Math.round((yield_raw / solcast_f) * 100) : 0}% Target
          </div>
        </div>
      </div>

      <!-- Sun & Moon Celestial Trajectory Widget (Clean Unobstructed Orb + Real Moon Phase) -->
      <div style="background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 6px 4px 6px; margin-bottom: 12px; overflow: hidden; position: relative;">
        <!-- Header: Solar Trajectory on left, Estimated Peak on right -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 8px 4px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 8.5px; color: rgba(255, 255, 255, 0.55); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Celestial Trajectory</span>
            <span style="font-size: 8px; color: rgba(179, 229, 252, 0.7); font-weight: 600;">• 🌙 ${moon_name}</span>
            <span style="font-size: 8px; color: rgba(255, 224, 130, 0.85); font-weight: 600;">• ${weather_icon} ${weather_label}</span>
          </div>
          <div style="background: rgba(0, 229, 255, 0.1); border: 1px solid rgba(0, 229, 255, 0.35); padding: 1.5px 7px; border-radius: 8px; font-size: 8px; font-weight: 700; color: #00e5ff; display: flex; align-items: center; gap: 3px;">
            ${peak_badge_text}
          </div>
        </div>

        <svg viewBox="0 0 360 80" style="width: 100%; height: auto; display: block; overflow: visible;">
          <defs>
            <style>
              @keyframes rainDrop {
                0% { transform: translate(0, 0); opacity: 0; }
                30% { opacity: 0.9; }
                100% { transform: translate(-3px, 12px); opacity: 0; }
              }
              .rain-streak-1 { animation: rainDrop 0.75s linear infinite; }
              .rain-streak-2 { animation: rainDrop 0.85s linear infinite 0.25s; }
              .rain-streak-3 { animation: rainDrop 0.7s linear infinite 0.5s; }
            </style>
            <linearGradient id="sunArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#ff7043" stop-opacity="0.5" />
              <stop offset="50%" stop-color="#ffd54f" stop-opacity="0.95" />
              <stop offset="100%" stop-color="#ff5722" stop-opacity="0.5" />
            </linearGradient>
            <radialGradient id="moonGrad" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="50%" stop-color="#b0bec5" />
              <stop offset="100%" stop-color="#546e7a" />
            </radialGradient>
          </defs>

          <!-- Horizon Line (Dashed) -->
          <line x1="30" y1="52" x2="330" y2="52" stroke="rgba(255, 255, 255, 0.12)" stroke-dasharray="3,3" stroke-width="1" />

          <!-- Night Arc (Below Horizon Dashed) -->
          <path d="M 38 52 Q 180 72 322 52" fill="none" stroke="rgba(179, 229, 252, 0.2)" stroke-dasharray="3,3" stroke-width="1.3" />

          <!-- Daytime Sun Arc -->
          <path d="M 38 52 Q 180 14 322 52" fill="none" stroke="url(#sunArcGrad)" stroke-width="2.5" stroke-linecap="round" />

          <!-- Sunrise Indicator (Left) -->
          <circle cx="38" cy="52" r="3.5" fill="#ffa726" />
          <text x="38" y="65" fill="rgba(255, 255, 255, 0.55)" font-size="8" font-weight="600" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
            ${sunrise_str}
          </text>

          <!-- Sunset Indicator (Right) -->
          <circle cx="322" cy="52" r="3.5" fill="#ff5722" />
          <text x="322" y="65" fill="rgba(255, 255, 255, 0.55)" font-size="8" font-weight="600" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
            ${sunset_str}
          </text>

          <!-- Peak Vertical Marker Line on Arc (Always visible reference for seasonal solar peak) -->
          <circle cx="${peak_pos.x}" cy="${peak_pos.y}" r="2.5" fill="#00e5ff" opacity="0.85" style="filter: drop-shadow(0 0 3px #00e5ff);" />
          <line x1="${peak_pos.x}" y1="${peak_pos.y}" x2="${peak_pos.x}" y2="52" stroke="rgba(0, 229, 255, 0.35)" stroke-dasharray="2,2" stroke-width="1" />

          <!-- Current Sun Position: Dynamic Celestial Orb & Live Weather Overlay -->
          ${is_day ? `
            <g transform="translate(${sun_pos.x}, ${sun_pos.y})">
              <!-- Dynamic Sun Corona Halo & Core -->
              <circle cx="0" cy="0" r="${sun_halo_radius}" fill="${sun_corona_color}" opacity="${sun_halo_opacity}" />
              <circle cx="0" cy="0" r="4.5" fill="${sun_core_color}" style="filter: ${sun_filter_glow};" />

              ${is_partly_cloudy ? `
                <!-- Drifting Light Translucent Cloud -->
                <g transform="translate(-7, -2)" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); pointer-events: none;">
                  <path d="M 0 3 A 3 3 0 0 1 5 1 A 4 4 0 0 1 12 2 A 3 3 0 0 1 15 5 A 2.5 2.5 0 0 1 13 8 L 2 8 A 2.5 2.5 0 0 1 0 3 Z" fill="rgba(236, 239, 241, 0.65)" />
                </g>
              ` : ''}

              ${is_cloudy ? `
                <!-- Overcast Cloud Covering Sun -->
                <g transform="translate(-10, -4)" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5)); pointer-events: none;">
                  <path d="M 0 4 A 4 4 0 0 1 6 1 A 5.5 5.5 0 0 1 15 2 A 4 4 0 0 1 19 6 A 3.5 3.5 0 0 1 16 10 L 2 10 A 3 3 0 0 1 0 4 Z" fill="rgba(176, 190, 197, 0.88)" />
                </g>
              ` : ''}

              ${(is_rainy || is_stormy) ? `
                <!-- Dark Nimbus Storm Cloud with Falling Raindrop Streaks -->
                <g transform="translate(-11, -6)" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6)); pointer-events: none;">
                  <path d="M 0 4 A 4.5 4.5 0 0 1 7 1 A 6 6 0 0 1 17 2 A 4.5 4.5 0 0 1 21 6 A 3.5 3.5 0 0 1 18 10 L 2 10 A 3.5 3.5 0 0 1 0 4 Z" fill="rgba(80, 100, 120, 0.95)" />
                  
                  <!-- Drop 1 -->
                  <line class="solar-rain-1" x1="3" y1="11" x2="2" y2="16" stroke="#00e5ff" stroke-width="1.6" stroke-linecap="round">
                    <animateTransform attributeName="transform" type="translate" values="0,0; -1,6; -2,12" dur="0.75s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0; 1; 1; 0" dur="0.75s" repeatCount="indefinite" />
                  </line>
                  
                  <!-- Drop 2 -->
                  <line class="solar-rain-2" x1="8" y1="10.5" x2="7" y2="15.5" stroke="#29b6f6" stroke-width="1.6" stroke-linecap="round">
                    <animateTransform attributeName="transform" type="translate" values="0,0; -1,6; -2,12" begin="0.25s" dur="0.85s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0; 1; 1; 0" begin="0.25s" dur="0.85s" repeatCount="indefinite" />
                  </line>
                  
                  <!-- Drop 3 -->
                  <line class="solar-rain-3" x1="13" y1="11" x2="12" y2="16" stroke="#00e5ff" stroke-width="1.6" stroke-linecap="round">
                    <animateTransform attributeName="transform" type="translate" values="0,0; -1,6; -2,12" begin="0.5s" dur="0.7s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0; 1; 1; 0" begin="0.5s" dur="0.7s" repeatCount="indefinite" />
                  </line>
                  
                  <!-- Drop 4 -->
                  <line class="solar-rain-4" x1="18" y1="10.5" x2="17" y2="15.5" stroke="#29b6f6" stroke-width="1.6" stroke-linecap="round">
                    <animateTransform attributeName="transform" type="translate" values="0,0; -1,6; -2,12" begin="0.35s" dur="0.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0; 1; 1; 0" begin="0.35s" dur="0.8s" repeatCount="indefinite" />
                  </line>
                </g>
              ` : ''}
            </g>
          ` : ''}

          <!-- Real Moon Position & Dynamic Phase along Night Arc -->
          <g transform="translate(${moon_pos.x}, ${moon_pos.y})">
            <!-- Subtle Lunar Aura -->
            <circle cx="0" cy="0" r="7.5" fill="#e0f7fa" opacity="0.12" style="filter: drop-shadow(0 0 5px rgba(179, 229, 252, 0.45));" />
            ${moon_svg_content}
          </g>
        </svg>
      </div>

      <!-- Smart Appliance Advisor / Grid Status Dynamic Banner -->
      <div style="background: ${banner_bg}; border: 1px solid ${banner_border}; box-shadow: ${banner_glow}; border-radius: 12px; padding: 10px 12px; margin-bottom: 14px; display: flex; align-items: center; gap: 10px;">
        <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(0, 0, 0, 0.35); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(255, 255, 255, 0.1);">
          <ha-icon icon="${banner_icon}" style="color: #ffffff; --mdc-icon-size: 18px;"></ha-icon>
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
            <span style="font-size: 12px; font-weight: 800; color: #ffffff; line-height: 1.2;">${banner_title}</span>
            <span style="font-size: 8px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: rgba(0,0,0,0.3); color: rgba(255,255,255,0.7); letter-spacing: 0.3px;">${banner_badge}</span>
          </div>
          <div style="font-size: 9.5px; color: rgba(255, 255, 255, 0.85); line-height: 1.3;">${banner_sub}</div>
        </div>
      </div>

      <!-- Clean Header for Solar Matrix: Topology with Real Compass Vectors -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 0 4px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 5px; height: 5px; border-radius: 50%; background: #ff9800; box-shadow: 0 0 8px #ff9800;"></span>
          <span style="font-size: 10px; font-weight: 700; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; letter-spacing: 0.8px;">Topology</span>
        </div>
        <div style="font-size: 8.5px; color: rgba(255, 255, 255, 0.5); font-weight: 600; display: flex; align-items: center; gap: 6px;">
          <span style="color: #ffd54f;">☀️ ${Math.round(sun_azimuth)}° Az • ${Math.round(sun_elevation)}° El</span>
          <span>→</span>
          <span style="color: #ff8a80;">💨 Shadow ${(Math.round(sun_azimuth + 180) % 360)}°</span>
          <span>•</span>
          <span style="color: #80d8ff;">Tap for info</span>
        </div>
      </div>

      <!-- Solar Matrix Container with Dedicated Perimeter Clearance for Celestial Arc -->
      <div style="position: relative; width: 100%; padding-top: 22px; padding-left: 14px; box-sizing: border-box; overflow: visible;">
        
        <!-- Perimeter Celestial Guide Track & Dynamic Sun Orb Overlay (SVG viewBox 0 0 400 370) -->
        ${is_day ? `
          <svg viewBox="0 0 400 370" preserveAspectRatio="none" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5; overflow: visible;">
            <defs>
              <linearGradient id="orbitTrackGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#ffa726" stop-opacity="0.3" />
                <stop offset="40%" stop-color="#ffd54f" stop-opacity="0.6" />
                <stop offset="100%" stop-color="#ff7043" stop-opacity="0.3" />
              </linearGradient>
              <linearGradient id="sunInflowBeam" x1="${sun_track_x}" y1="${sun_track_y}" x2="${ch_cx_400}" y2="${ch_cy_400}" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="${topo_beam_start_color}" stop-opacity="0.75" />
                <stop offset="60%" stop-color="${topo_beam_mid_color}" stop-opacity="0.22" />
                <stop offset="100%" stop-color="${topo_beam_end_color}" stop-opacity="0.0" />
              </linearGradient>
            </defs>

            <!-- 1. The Sketched Perimeter Solar Track Arc (Strictly outside all panels) -->
            <path d="M 6 350 L 6 50 Q 6 8 50 8 L 390 8" fill="none" stroke="url(#orbitTrackGrad)" stroke-width="1.8" stroke-dasharray="5,4" stroke-linecap="round" style="filter: drop-shadow(0 0 4px rgba(255, 193, 7, 0.45));" />

            <!-- 2. Ambient Sunlight Beam Inflow towards Pergola (Soft Gradient Ray, No Dashes) -->
            <line x1="${sun_track_x}" y1="${sun_track_y}" x2="${ch_cx_400}" y2="${ch_cy_400}" stroke="url(#sunInflowBeam)" stroke-width="2.2" stroke-linecap="round" style="filter: drop-shadow(0 0 3px ${topo_beam_glow});" />

            <!-- 3. Radiant Celestial Sun Orb at Live Sun Azimuth (Dynamic Diurnal Size, Color & Live Weather Overlay) -->
            <g transform="translate(${sun_track_x}, ${sun_track_y})">
              <!-- Dynamic Soft Aura -->
              <circle cx="0" cy="0" r="${topo_r_aura}" fill="${topo_sun_aura_color}" opacity="${topo_aura_opacity}" style="filter: blur(3px);" />
              <!-- Dynamic Radiant Corona -->
              <circle cx="0" cy="0" r="${topo_r_corona}" fill="${topo_sun_corona_color}" style="filter: ${topo_corona_filter};" />
              <!-- Dynamic Solar Core -->
              <circle cx="0" cy="0" r="${topo_r_core}" fill="${topo_sun_core_color}" />

              ${is_partly_cloudy ? `
                <!-- Drifting Light Translucent Cloud -->
                <g transform="translate(-7, -2)" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); pointer-events: none;">
                  <path d="M 0 3 A 3 3 0 0 1 5 1 A 4 4 0 0 1 12 2 A 3 3 0 0 1 15 5 A 2.5 2.5 0 0 1 13 8 L 2 8 A 2.5 2.5 0 0 1 0 3 Z" fill="rgba(236, 239, 241, 0.7)" />
                </g>
              ` : ''}

              ${is_cloudy ? `
                <!-- Overcast Cloud Covering Sun -->
                <g transform="translate(-10, -4)" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5)); pointer-events: none;">
                  <path d="M 0 4 A 4 4 0 0 1 6 1 A 5.5 5.5 0 0 1 15 2 A 4 4 0 0 1 19 6 A 3.5 3.5 0 0 1 16 10 L 2 10 A 3.5 3.5 0 0 1 0 4 Z" fill="rgba(176, 190, 197, 0.9)" />
                </g>
              ` : ''}

              ${(is_rainy && !is_stormy) ? `
                <!-- Dark Nimbus Storm Cloud with Falling Raindrop Streaks -->
                <g transform="translate(-11, -6)" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6)); pointer-events: none;">
                  <path d="M 0 4 A 4.5 4.5 0 0 1 7 1 A 6 6 0 0 1 17 2 A 4.5 4.5 0 0 1 21 6 A 3.5 3.5 0 0 1 18 10 L 2 10 A 3.5 3.5 0 0 1 0 4 Z" fill="rgba(80, 100, 120, 0.95)" />
                  
                  <!-- Raindrop 1 -->
                  <line x1="3" y1="11" x2="2" y2="16" stroke="#00e5ff" stroke-width="1.6" stroke-linecap="round">
                    <animateTransform attributeName="transform" type="translate" values="0,0; -1,6; -2,12" dur="0.75s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0; 1; 1; 0" dur="0.75s" repeatCount="indefinite" />
                  </line>
                  
                  <!-- Raindrop 2 -->
                  <line x1="8" y1="10.5" x2="7" y2="15.5" stroke="#29b6f6" stroke-width="1.6" stroke-linecap="round">
                    <animateTransform attributeName="transform" type="translate" values="0,0; -1,6; -2,12" begin="0.25s" dur="0.85s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0; 1; 1; 0" begin="0.25s" dur="0.85s" repeatCount="indefinite" />
                  </line>
                  
                  <!-- Raindrop 3 -->
                  <line x1="13" y1="11" x2="12" y2="16" stroke="#00e5ff" stroke-width="1.6" stroke-linecap="round">
                    <animateTransform attributeName="transform" type="translate" values="0,0; -1,6; -2,12" begin="0.5s" dur="0.7s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0; 1; 1; 0" begin="0.5s" dur="0.7s" repeatCount="indefinite" />
                  </line>
                  
                  <!-- Raindrop 4 -->
                  <line x1="18" y1="10.5" x2="17" y2="15.5" stroke="#29b6f6" stroke-width="1.6" stroke-linecap="round">
                    <animateTransform attributeName="transform" type="translate" values="0,0; -1,6; -2,12" begin="0.35s" dur="0.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0; 1; 1; 0" begin="0.35s" dur="0.8s" repeatCount="indefinite" />
                  </line>
                </g>
              ` : ''}

              ${is_stormy ? `
                <!-- Dark Thunder Cloud with Lightning Bolt & Rain -->
                <g transform="translate(-11, -6)" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6)); pointer-events: none;">
                  <path d="M 0 4 A 4.5 4.5 0 0 1 7 1 A 6 6 0 0 1 17 2 A 4.5 4.5 0 0 1 21 6 A 3.5 3.5 0 0 1 18 10 L 2 10 A 3.5 3.5 0 0 1 0 4 Z" fill="rgba(55, 71, 79, 0.96)" />
                  
                  <!-- Animated Flashing Lightning Bolt -->
                  <polygon points="10,8 6,14 9,14 7,19 13,12 10,12" fill="#ffd54f" style="filter: drop-shadow(0 0 4px #ffeb3b);">
                    <animate attributeName="opacity" values="0;1;0.2;1;0" dur="1.4s" repeatCount="indefinite" />
                  </polygon>
                  
                  <!-- Raindrop 1 -->
                  <line x1="3" y1="11" x2="2" y2="16" stroke="#00e5ff" stroke-width="1.4" stroke-linecap="round">
                    <animateTransform attributeName="transform" type="translate" values="0,0; -1,6; -2,12" dur="0.75s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0; 1; 1; 0" dur="0.75s" repeatCount="indefinite" />
                  </line>
                  
                  <!-- Raindrop 2 -->
                  <line x1="16" y1="10.5" x2="15" y2="15.5" stroke="#29b6f6" stroke-width="1.4" stroke-linecap="round">
                    <animateTransform attributeName="transform" type="translate" values="0,0; -1,6; -2,12" begin="0.3s" dur="0.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0; 1; 1; 0" begin="0.3s" dur="0.8s" repeatCount="indefinite" />
                  </line>
                </g>
              ` : ''}
            </g>
          </svg>
        ` : ''}

        <!-- Solar Grid (6 columns x 4 rows) -->
        <div style="display: grid; pointer-events: auto !important; grid-template-columns: repeat(6, 1fr); grid-template-rows: repeat(4, auto); gap: 5px; width: 100%; position: relative;">
          
          <!-- Row 2, Col 2: Architectural Brick Chimney Obstruction with Pure Volumetric Shadow Cone -->
          <div style="grid-column: 2; grid-row: 2; background: linear-gradient(145deg, #171c26 0%, #1e2430 100%); border: 1px solid rgba(255, 110, 64, 0.45); border-radius: 7px; padding: 4px; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 74px; position: relative; overflow: visible; box-sizing: border-box; box-shadow: ${chimney_shadow}; transition: box-shadow 0.3s ease;">
            
            <!-- Pure Volumetric Soft Shadow Cone Projection (No red wire/dot) -->
            ${shadow_active ? `
              <svg style="position: absolute; width: 200px; height: 200px; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 10; overflow: visible;">
                <defs>
                  <filter id="shadowBlur" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="2.8" />
                  </filter>
                  <linearGradient id="volumetricShadowGrad" x1="${bx}" y1="${by}" x2="${tx}" y2="${ty}" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#000000" stop-opacity="0.88" />
                    <stop offset="50%" stop-color="#0a0505" stop-opacity="0.52" />
                    <stop offset="100%" stop-color="#000000" stop-opacity="0.0" />
                  </linearGradient>
                </defs>

                <!-- Soft Feathered Volumetric Shadow Cone Fan -->
                <path d="${shadow_cone_path}" fill="url(#volumetricShadowGrad)" filter="url(#shadowBlur)" />
              </svg>
            ` : ''}

            <!-- Clean Uncrossed Chimney Core (Fireplace badge & typography) -->
            <div style="width: 24px; height: 24px; border-radius: 6px; background: rgba(255, 110, 64, 0.15); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255, 110, 64, 0.45); z-index: 3;">
              <ha-icon icon="mdi:fireplace" style="color: #ff7043; --mdc-icon-size: 15px;"></ha-icon>
            </div>
            <div style="font-size: 8px; font-weight: 700; color: #ffab91; text-transform: uppercase; margin-top: 3px; letter-spacing: 0.3px; z-index: 3;">Brick</div>
            <div style="font-size: 7px; color: rgba(255, 204, 188, 0.85); font-weight: 600; text-align: center; margin-top: 1px; z-index: 3;">Chimney</div>
          </div>
  `;

  for (const p of panelList) {
    let p_entity = 'sensor.inverter_' + p.inv + '_power_ch_' + p.ch;
    let t_entity = 'sensor.inverter_' + p.inv + '_temperature';
    let p_state = states[p_entity] ? Math.round(parseFloat(states[p_entity].state)) : 0;
    if (isNaN(p_state)) p_state = 0;
    let t_state = states[t_entity] ? Math.round(parseFloat(states[t_entity].state)) : '--';
    if (isNaN(t_state)) t_state = '--';

    // Calibrated to 450W module rating
    let pct = Math.min(100, Math.round((p_state / 450) * 100));
    
    // Check if panel is experiencing active physical obstruction shadow:
    // Only evaluate shade when sun is sufficiently high (elevation >= 16 deg) and array is generating (max_panel_watt >= 140W)
    let is_shaded = false;
    let shade_reason = 'Shade';
    if (sun_elevation >= 16 && max_panel_watt >= 140) {
      if (sun_azimuth <= 185) {
        // Morning: Brick Chimney casts shadow to NW/NNW onto Row 2 Col 2/3 and Row 3 Col 2/3
        if ((p.row === 2 && (p.col === 2 || p.col === 3)) || (p.row === 3 && (p.col === 2 || p.col === 3))) {
          if (p_state <= max_panel_watt * 0.45 && p_state < 160) {
            is_shaded = true;
            shade_reason = 'Chimney';
          }
        }
        // Morning: Raised Wall only casts shadow on bottom row (Row 4) when sun elevation is low
        if (p.row === 4 && sun_elevation < 32) {
          if (p_state <= max_panel_watt * 0.50 && p_state < 150) {
            is_shaded = true;
            shade_reason = 'Wall';
          }
        }
      } else {
        // Afternoon: Brick Chimney casts shadow to NE/NNE onto Row 3 Col 2 and Row 4 Col 2
        if ((p.row === 3 && p.col === 2) || (p.row === 4 && p.col === 2)) {
          if (p_state <= max_panel_watt * 0.45 && p_state < 160) {
            is_shaded = true;
            shade_reason = 'Chimney';
          }
        }
        // Afternoon: Raised Wall on bottom row
        if (p.row === 4 && sun_elevation < 28) {
          if (p_state <= max_panel_watt * 0.50 && p_state < 140) {
            is_shaded = true;
            shade_reason = 'Wall';
          }
        }
      }
    }

    // Rich 6-Tier Gradient & Glow Levels:
    let border_color, card_glow, text_glow, pwr_color, bg_solar, cell_line_color, fill_grad;

    if (p_state >= 320) {
      // Tier 6: Peak Solar Flare (> 320W, > 71%)
      border_color = 'rgba(255, 87, 34, 0.95)';
      card_glow = '0 0 16px rgba(255, 87, 34, 0.6), inset 0 0 10px rgba(255, 152, 0, 0.3)';
      text_glow = '0 0 10px rgba(255, 255, 255, 0.9), 0 0 18px rgba(255, 87, 34, 0.8)';
      pwr_color = '#ffffff';
      bg_solar = 'linear-gradient(180deg, #321908 0%, #4a260d 100%)';
      cell_line_color = 'rgba(255, 112, 67, 0.35)';
      fill_grad = 'linear-gradient(0deg, rgba(255, 87, 34, 0.5) 0%, rgba(255, 152, 0, 0.2) 100%)';
    } else if (p_state >= 240) {
      // Tier 5: High Solar Power (240W - 320W, ~53% - 71%)
      border_color = 'rgba(255, 152, 0, 0.9)';
      card_glow = '0 0 14px rgba(255, 152, 0, 0.45), inset 0 0 8px rgba(255, 152, 0, 0.2)';
      text_glow = '0 0 10px rgba(255, 202, 40, 0.7)';
      pwr_color = '#ffe082';
      bg_solar = 'linear-gradient(180deg, #2a1c0d 0%, #3a2612 100%)';
      cell_line_color = 'rgba(255, 179, 0, 0.3)';
      fill_grad = 'linear-gradient(0deg, rgba(255, 179, 0, 0.4) 0%, rgba(255, 152, 0, 0.15) 100%)';
    } else if (p_state >= 190) {
      // Tier 4: Moderate Solar Gold (190W - 240W, ~42% - 53%)
      border_color = 'rgba(255, 213, 79, 0.8)';
      card_glow = '0 0 10px rgba(255, 213, 79, 0.3), inset 0 0 6px rgba(255, 213, 79, 0.12)';
      text_glow = '0 0 8px rgba(255, 213, 79, 0.5)';
      pwr_color = '#ffd54f';
      bg_solar = 'linear-gradient(180deg, #1f1b12 0%, #2b2416 100%)';
      cell_line_color = 'rgba(255, 213, 79, 0.22)';
      fill_grad = 'linear-gradient(0deg, rgba(255, 213, 79, 0.32) 0%, rgba(255, 213, 79, 0.1) 100%)';
    } else if (p_state >= 140) {
      // Tier 3: Low Solar Amber Transition (140W - 190W, ~31% - 42%)
      border_color = 'rgba(255, 167, 38, 0.65)';
      card_glow = '0 0 7px rgba(255, 167, 38, 0.22)';
      text_glow = 'none';
      pwr_color = '#ffcc80';
      bg_solar = 'linear-gradient(180deg, #18191c 0%, #22201e 100%)';
      cell_line_color = 'rgba(255, 167, 38, 0.15)';
      fill_grad = 'linear-gradient(0deg, rgba(255, 167, 38, 0.25) 0%, rgba(255, 167, 38, 0.08) 100%)';
    } else if (p_state >= 70) {
      // Tier 2: Partial Shade / Morning Wake (70W - 140W, ~15% - 31%) -> Electric Cyan/Blue
      border_color = 'rgba(0, 229, 255, 0.65)';
      card_glow = '0 0 10px rgba(0, 229, 255, 0.35), inset 0 0 6px rgba(0, 229, 255, 0.15)';
      text_glow = '0 0 8px rgba(0, 229, 255, 0.5)';
      pwr_color = '#00e5ff';
      bg_solar = 'linear-gradient(180deg, #0e1a24 0%, #122433 100%)';
      cell_line_color = 'rgba(0, 229, 255, 0.22)';
      fill_grad = 'linear-gradient(0deg, rgba(0, 229, 255, 0.3) 0%, rgba(0, 229, 255, 0.08) 100%)';
    } else {
      // Tier 1: Deep Shade / Low Nocturnal (< 70W, < 15%)
      border_color = 'rgba(0, 229, 255, 0.3)';
      card_glow = 'none';
      text_glow = 'none';
      pwr_color = '#80d8ff';
      bg_solar = 'linear-gradient(180deg, #0c141d 0%, #101c27 100%)';
      cell_line_color = 'rgba(0, 229, 255, 0.1)';
      fill_grad = 'linear-gradient(0deg, rgba(0, 229, 255, 0.18) 0%, rgba(0, 229, 255, 0.04) 100%)';
    }

    let temp_color = '#81c784';
    if (typeof t_state === 'number') {
      if (t_state >= 55) temp_color = '#ef5350';
      else if (t_state >= 45) temp_color = '#ffa726';
    }

    let min_height = p.type === 'v' ? '94px' : '74px';

    output += `
      <div class="solar-panel-tile"
           data-entity="${p_entity}"
           onclick="if (!window._isCardScrolling && window._openPanelMoreInfo) window._openPanelMoreInfo('${p_entity}', this)"
           style="cursor: pointer; pointer-events: auto !important; -webkit-tap-highlight-color: transparent; user-select: none; grid-column: ${p.col}; grid-row: ${p.row}; background: ${bg_solar}; border: 1px solid ${border_color}; border-radius: 7px; box-shadow: ${card_glow}; padding: 4px 2px 3px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; min-height: ${min_height}; position: relative; overflow: hidden; box-sizing: border-box; transition: transform 0.1s ease, box-shadow 0.2s ease;">
        
        <!-- Photovoltaic Wafer Grid Pattern -->
        <div style="position: absolute; inset: 0; pointer-events: none; opacity: 0.18; background-image: repeating-linear-gradient(0deg, transparent, transparent 11px, ${cell_line_color} 11px, ${cell_line_color} 12px), repeating-linear-gradient(90deg, transparent, transparent 13px, ${cell_line_color} 13px, ${cell_line_color} 14px);"></div>

        <!-- Dynamic Solar Power Level Fill (Calibrated to 450W with glowing waterline) -->
        <div style="position: absolute; bottom: 0; left: 0; right: 0; height: ${pct}%; background: ${fill_grad}; border-top: 1.5px solid ${border_color}; box-shadow: 0 0 8px ${border_color}; pointer-events: none; transition: height 0.6s ease;"></div>

        <!-- Active Shading Overlay (Visible diagonal shadow hatch pattern when panel is shaded) -->
        ${is_shaded ? `
          <div style="position: absolute; inset: 0; pointer-events: none; z-index: 2; opacity: 0.45; background-image: repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.6) 0px, rgba(0, 0, 0, 0.6) 4px, transparent 4px, transparent 8px);"></div>
        ` : ''}

        <!-- Top row: Channel + Shading tag on left, DS3-H model indicator on right -->
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 2px; z-index: 3; pointer-events: none;">
          <div style="display: flex; align-items: center; gap: 2px;">
            <span style="font-size: 7.5px; color: rgba(255, 255, 255, 0.7); font-weight: 700; letter-spacing: 0.2px;">C${p.ch}</span>
            ${is_shaded ? `<span style="font-size: 6.5px; font-weight: 800; color: #ffb74d; background: rgba(255, 183, 77, 0.2); border: 1px solid rgba(255, 183, 77, 0.45); border-radius: 3px; padding: 0 2px; line-height: 1.2;" title="${shade_reason} Shadow">${shade_reason.toUpperCase()}</span>` : ''}
          </div>
          ${p.model === 'DS3-H' ? `<span style="font-size: 6.5px; font-weight: 800; color: #00e5ff; background: rgba(0, 229, 255, 0.18); border: 1px solid rgba(0, 229, 255, 0.4); border-radius: 3px; padding: 0px 3px;">DS3-H</span>` : ''}
        </div>

        <!-- Center: Large Bold Watts & Percentage ONLY (NO 'W -' or 'W •') -->
        <div style="z-index: 3; margin: 1px 0; display: flex; flex-direction: column; align-items: center; pointer-events: none;">
          <span style="font-size: 16px; font-weight: 800; color: ${pwr_color}; letter-spacing: -0.3px; line-height: 1.1; text-shadow: ${text_glow};">
            ${p_state}
          </span>
          <span style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.5); margin-top: 1px;">
            ${pct}%
          </span>
        </div>

        <!-- Bottom row: Inverter ID clearly visible in dedicated badge -->
        <div style="z-index: 3; width: calc(100% - 2px); text-align: center; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 3px; padding: 1.5px 0; pointer-events: none;">
          <span style="font-size: 8px; font-weight: 700; color: #90caf9; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: -0.2px;">
            ${p.id}
          </span>
        </div>
      </div>
    `;
  }

  output += `
        </div>
      </div>

      <!-- Raised Wall Indicator along bottom of Row 4 (Cols 1 & 2) -->
      <div style="display: flex; align-items: center; gap: 6px; margin-top: 5px; padding-left: 2px;">
        <div style="width: 32%; height: 3px; border-radius: 2px; background: linear-gradient(90deg, rgba(255, 82, 82, 0.75) 0%, rgba(255, 82, 82, 0.25) 100%);"></div>
        <span style="font-size: 7.5px; color: rgba(255, 255, 255, 0.5); font-weight: 600; letter-spacing: 0.3px;">Raised Wall</span>
      </div>


    </div>
  `;
  return output;
    }
  }
  customElements.define('solar-rooftop-card', SolarRooftopCard);

  // 2. Solar PV Forecast Card (Solcast)
  class SolarForecastCard extends BaseSolarCard {
    get cardBorder() { return 'rgba(255, 152, 0, 0.2)'; }
    renderContent(states, hass, config) {
const days = [
    { key: 'today', label: 'TODAY', d_offset: 0 },
    { key: 'tomorrow', label: 'TOMORROW', d_offset: 1 },
    { key: 'day_3', label: 'DAY 3', d_offset: 2 },
    { key: 'day_4', label: 'DAY 4', d_offset: 3 },
    { key: 'day_5', label: 'DAY 5', d_offset: 4 },
    { key: 'day_6', label: 'DAY 6', d_offset: 5 },
    { key: 'day_7', label: 'DAY 7', d_offset: 6 }
  ];

  const weekdayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const todayDate = new Date();

  let forecastData = [];
  let maxKwh = 1;
  let totalWeekKwh = 0;

  for (let i = 0; i < days.length; i++) {
    const item = days[i];
    const ent = states['sensor.solcast_pv_forecast_forecast_' + item.key];
    let val = ent ? parseFloat(ent.state) : 0;
    if (isNaN(val)) val = 0;
    
    let d = new Date(todayDate);
    d.setDate(todayDate.getDate() + item.d_offset);
    let dayName = (i === 0) ? 'TODAY' : weekdayNames[d.getDay()];

    forecastData.push({
      key: item.key,
      label: dayName,
      kwh: val,
      dateStr: d.getDate() + '/' + (d.getMonth() + 1)
    });

    if (val > maxKwh) maxKwh = val;
    totalWeekKwh += val;
  }

  // Daily Actual Yield (Shelly EM)
  const yieldEnt = states['sensor.solar_daily_yield'];
  let yieldRaw = yieldEnt ? parseFloat(yieldEnt.state) : 0;
  if (isNaN(yieldRaw)) yieldRaw = 0;

  // Intraday Metrics
  const remEnt = states['sensor.solcast_pv_forecast_forecast_remaining_today'];
  const thisHourEnt = states['sensor.solcast_pv_forecast_forecast_this_hour'];
  const nextHourEnt = states['sensor.solcast_pv_forecast_forecast_next_hour'];
  const peakForecastEnt = states['sensor.solcast_pv_forecast_peak_forecast_today'];
  const peakTimeEnt = states['sensor.solcast_pv_forecast_peak_time_today'];

  let remKwh = remEnt ? parseFloat(remEnt.state).toFixed(1) : '0.0';
  let thisHourRaw = thisHourEnt ? parseFloat(thisHourEnt.state) : 0;
  let nextHourRaw = nextHourEnt ? parseFloat(nextHourEnt.state) : 0;
  let thisHourKwh = (thisHourRaw / 1000).toFixed(2);
  let nextHourKwh = (nextHourRaw / 1000).toFixed(2);
  let peakW = peakForecastEnt ? parseFloat(peakForecastEnt.state) : 0;
  let peakStr = peakW >= 1000 ? (peakW / 1000).toFixed(1) + ' kW' : Math.round(peakW) + ' W';

  let peakTimeStr = '14:00';
  if (peakTimeEnt && peakTimeEnt.state) {
    try {
      let pt = new Date(peakTimeEnt.state);
      if (!isNaN(pt.getTime())) {
        peakTimeStr = String(pt.getHours()).padStart(2, '0') + ':' + String(pt.getMinutes()).padStart(2, '0');
      }
    } catch(e) {}
  }

  // Find best day
  let bestDay = forecastData.reduce((prev, curr) => (curr.kwh > prev.kwh) ? curr : prev, forecastData[0]);

  let output = `
    <div style="position: relative; pointer-events: auto !important; padding: 16px 12px 14px; box-sizing: border-box; width: 100%; border-radius: 20px; overflow: hidden; background: radial-gradient(circle at 50% 0%, rgba(255, 179, 0, 0.12) 0%, rgba(14, 17, 24, 0.98) 55%);">
      
      <!-- Top Header: Title & Forecast Peak Badge -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding: 0 2px;">
        <div style="display: flex; align-items: center; gap: 9px;">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, rgba(255, 179, 0, 0.25) 0%, rgba(255, 112, 67, 0.2) 100%); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255, 179, 0, 0.4); box-shadow: 0 0 12px rgba(255, 179, 0, 0.3);">
            <ha-icon icon="mdi:chart-bell-curve-cumulative" style="color: #ffd54f; --mdc-icon-size: 21px;"></ha-icon>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-start;">
            <div style="font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: 0.2px; line-height: 1.1;">Solcast 7-Day Outlook</div>
            <div style="font-size: 9.5px; color: rgba(255, 255, 255, 0.55); font-weight: 600; margin-top: 2px;">PV Forecast Model & Confidence</div>
          </div>
        </div>
        <div style="background: rgba(255, 179, 0, 0.12); border: 1px solid rgba(255, 179, 0, 0.35); padding: 3px 9px; border-radius: 12px; font-size: 10.5px; font-weight: 700; color: #ffb74d; display: flex; align-items: center; gap: 5px; box-shadow: 0 0 10px rgba(255, 179, 0, 0.2);">
          <span style="font-size: 11px;">⚡</span> Peak ${peakStr} @ ${peakTimeStr}
        </div>
      </div>

      <!-- 3 Sleek Intraday Telemetry Tiles -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px;">
        <!-- This Hour -->
        <div style="background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(16px); border: 1px solid rgba(255, 179, 0, 0.25); border-radius: 12px; padding: 8px 6px; display: flex; flex-direction: column; align-items: center; text-align: center;">
          <div style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.55); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">This Hour</div>
          <div style="font-size: 15px; font-weight: 800; color: #ffb74d; line-height: 1.1;">${thisHourKwh} kWh</div>
          <div style="font-size: 7.5px; color: rgba(255, 255, 255, 0.4); margin-top: 2px;">Estimated</div>
        </div>

        <!-- Next Hour -->
        <div style="background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(16px); border: 1px solid rgba(255, 179, 0, 0.25); border-radius: 12px; padding: 8px 6px; display: flex; flex-direction: column; align-items: center; text-align: center;">
          <div style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.55); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Next Hour</div>
          <div style="font-size: 15px; font-weight: 800; color: #ffe082; line-height: 1.1;">${nextHourKwh} kWh</div>
          <div style="font-size: 7.5px; color: rgba(255, 255, 255, 0.4); margin-top: 2px;">Upcoming</div>
        </div>

        <!-- Remaining Today -->
        <div style="background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(16px); border: 1px solid rgba(0, 230, 118, 0.3); border-radius: 12px; padding: 8px 6px; display: flex; flex-direction: column; align-items: center; text-align: center;">
          <div style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.55); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Remaining Today</div>
          <div style="font-size: 15px; font-weight: 800; color: #81c784; line-height: 1.1;">${remKwh} kWh</div>
          <div style="font-size: 7.5px; color: rgba(255, 255, 255, 0.4); margin-top: 2px;">To Produce</div>
        </div>
      </div>

      <!-- 7 Frosted Glass Daily Pillars -->
      <div style="background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 14px; padding: 12px 6px 10px; margin-bottom: 10px;">
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; align-items: end; height: 130px; box-sizing: border-box;">
  `;

  for (let i = 0; i < forecastData.length; i++) {
    const f = forecastData[i];
    const isToday = (i === 0);
    const heightPct = Math.max(16, Math.round((f.kwh / maxKwh) * 75)); // max 75px bar height
    const borderStyle = isToday 
      ? '1px solid rgba(255, 179, 0, 0.6)' 
      : '1px solid rgba(255, 255, 255, 0.08)';
    const colBg = isToday 
      ? 'rgba(255, 179, 0, 0.08)' 
      : 'rgba(255, 255, 255, 0.02)';

    let barElementHtml = '';
    if (isToday) {
      // Two-Tone Progress Split: Solid for Produced, Translucent Pattern for Remaining
      let prodFrac = f.kwh > 0 ? Math.min(1.0, yieldRaw / f.kwh) : 0;
      let prodHeight = Math.max(0, Math.round(prodFrac * heightPct));
      let remHeight = Math.max(0, heightPct - prodHeight);

      barElementHtml = `
        <div style="width: 14px; height: ${heightPct}px; border-radius: 5px; overflow: hidden; display: flex; flex-direction: column-reverse; background: rgba(255, 179, 0, 0.15); border: 1px solid rgba(255, 179, 0, 0.7); box-shadow: 0 0 10px rgba(255, 179, 0, 0.4); margin-bottom: 6px;">
          <!-- Produced So Far (Solid Amber-Gold Gradient) -->
          <div style="width: 100%; height: ${prodHeight}px; background: linear-gradient(180deg, #ffb74d 0%, #ff7043 100%); transition: height 0.4s ease;"></div>
          <!-- Remaining Forecast (Translucent Striped Pattern) -->
          <div style="width: 100%; height: ${remHeight}px; background: repeating-linear-gradient(45deg, rgba(255, 183, 77, 0.35), rgba(255, 183, 77, 0.35) 2px, rgba(255, 183, 77, 0.1) 2px, rgba(255, 183, 77, 0.1) 4px); opacity: 0.85;"></div>
        </div>
      `;
    } else {
      const barGrad = 'linear-gradient(180deg, rgba(255, 179, 0, 0.8) 0%, rgba(255, 112, 67, 0.5) 100%)';
      barElementHtml = `
        <div style="width: 14px; height: ${heightPct}px; border-radius: 5px; background: ${barGrad}; transition: height 0.4s ease; margin-bottom: 6px;"></div>
      `;
    }

    output += `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; background: ${colBg}; border: ${borderStyle}; border-radius: 9px; padding: 5px 2px 4px; box-sizing: border-box; position: relative;">
        
        <!-- Expected kWh on top of bar -->
        <span style="font-size: 8.5px; font-weight: 800; color: ${isToday ? '#ffd54f' : '#ffffff'}; letter-spacing: -0.2px; margin-bottom: 3px;">
          ${f.kwh.toFixed(1)}
        </span>
        
        <!-- Relative Fill Bar -->
        ${barElementHtml}

        <!-- Day Name and Date -->
        <span style="font-size: 7.5px; font-weight: 700; color: ${isToday ? '#ffb74d' : 'rgba(255, 255, 255, 0.7)'}; letter-spacing: 0.2px;">
          ${f.label}
        </span>
        <span style="font-size: 6.5px; color: rgba(255, 255, 255, 0.4); margin-top: 1px;">
          ${f.dateStr}
        </span>
      </div>
    `;
  }

  output += `
        </div>
      </div>

      <!-- Weekly Summary Footer Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 6px 0; font-size: 9px; color: rgba(255, 255, 255, 0.6); font-weight: 600;">
        <div style="display: flex; align-items: center; gap: 4px;">
          <ha-icon icon="mdi:calendar-week" style="color: #ffb74d; --mdc-icon-size: 13px;"></ha-icon>
          <span>7-Day Projected Total: <b style="color: #ffd54f;">${totalWeekKwh.toFixed(1)} kWh</b></span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <span style="color: #81c784;">⭐ Peak Day: <b>${bestDay.label} (${bestDay.kwh.toFixed(1)} kWh)</b></span>
        </div>
      </div>
    </div>
  `;
  return output;
    }
  }
  customElements.define('solar-forecast-card', SolarForecastCard);

  // 3. Solar APSystems Inverter Cluster & Cooling Card
  class SolarInvertersCard extends BaseSolarCard {
    get cardBorder() { return 'rgba(0, 229, 255, 0.25)'; }
    renderContent(states, hass, config) {
// Store live hass instance from button-card template scope globally
  if (typeof hass !== 'undefined' && hass) {
    window._haHass = hass;
  }

  // Define ultra-responsive, debounced global toggle function
  if (!window._toggleInverterFan) {
    window._lastFanToggleTime = 0;
    window._toggleInverterFan = function(event, el) {
      if (event) {
        if (event.stopPropagation) event.stopPropagation();
      }
      const now = Date.now();
      // Debounce: prevent synthetic clicks or rapid double taps within 500ms
      if (now - window._lastFanToggleTime < 500) {
        return;
      }
      window._lastFanToggleTime = now;

      // Immediate tactile visual feedback
      if (el) {
        el.style.transform = 'scale(0.93)';
        el.style.opacity = '0.65';
        setTimeout(() => {
          el.style.transform = 'none';
          el.style.opacity = '1';
        }, 130);
      }

      // Method 1: Use direct authenticated hass object
      let h = window._haHass;
      if (!h || !h.callService) {
        let cur = el;
        while (cur && !h) {
          if (cur.hass) h = cur.hass;
          else if (cur._hass) h = cur._hass;
          else cur = cur.parentElement || (cur.getRootNode() && cur.getRootNode().host);
        }
      }
      if (!h || !h.callService) {
        const ha = document.querySelector('home-assistant');
        if (ha && ha.hass) h = ha.hass;
      }

      if (h && h.callService) {
        h.callService('switch', 'toggle', { entity_id: 'switch.inverters_fan_plug' });
      }

      // Method 2: Dispatch standard service call events through DOM hierarchy
      const ev = new CustomEvent('call-service', {
        bubbles: true,
        cancelable: false,
        composed: true,
        detail: {
          domain: 'switch',
          service: 'toggle',
          service_data: { entity_id: 'switch.inverters_fan_plug' }
        }
      });
      if (el && el.dispatchEvent) el.dispatchEvent(ev);
      const rootHa = document.querySelector('home-assistant');
      if (rootHa && rootHa.dispatchEvent) rootHa.dispatchEvent(ev);
    };
  }

  const inverters = [
    { id: '000001', fullId: '704000000001', label: 'Inv 1', model: 'DS3' },
    { id: '000002', fullId: '704000000002', label: 'Inv 2', model: 'DS3' },
    { id: '000003', fullId: '704000000003', label: 'Inv 3', model: 'DS3' },
    { id: '000004', fullId: '704000000004', label: 'Inv 4', model: 'DS3' },
    { id: '000005', fullId: '704000000005', label: 'Inv 5', model: 'DS3-H' },
    { id: '000006', fullId: '705000000006', label: 'Inv 6', model: 'DS3' },
    { id: '000007', fullId: '705000000007', label: 'Inv 7', model: 'DS3' },
    { id: '000008', fullId: '704000000008', label: 'Inv 8', model: 'DS3-H' }
  ];

  // Cooling Fan Status
  const fanEnt = states['switch.inverters_fan_plug'];
  let fanIsOn = fanEnt && fanEnt.state === 'on';

  // Climate Control Setpoint
  const climEnt = states['climate.temperature_control'];
  let targetTemp = climEnt && climEnt.attributes && climEnt.attributes.temperature ? climEnt.attributes.temperature : 50;

  // Grid & Frequency Telemetry (Real 24/7 Mains Frequency from Shelly EM Gen3)
  const gridVEnt = states['sensor.shellyem_e4525b_channel_1_voltage'];
  const solarShellyVEnt = states['sensor.shellyem_e4525b_channel_2_voltage'];
  const mainsFreqEnt = states['sensor.shellyemg3_b08184e848c0_energy_meter_0_frequency'];
  const invFreqEnt = states['sensor.inverter_704000000003_frequency'] || states['sensor.inverter_704000000001_frequency'];

  let gridV = gridVEnt && !isNaN(parseFloat(gridVEnt.state)) ? parseFloat(gridVEnt.state) : 230;
  let gridFreq = (mainsFreqEnt && !isNaN(parseFloat(mainsFreqEnt.state)) && parseFloat(mainsFreqEnt.state) > 40)
    ? parseFloat(mainsFreqEnt.state).toFixed(1)
    : ((invFreqEnt && !isNaN(parseFloat(invFreqEnt.state)) && parseFloat(invFreqEnt.state) > 40)
      ? parseFloat(invFreqEnt.state).toFixed(1)
      : '50.0');

  let invData = [];
  let maxTemp = -999;
  let minTemp = 999;
  let maxInvId = '';
  let tempsList = [];

  let maxRoofV = -1;
  let maxRoofVId = '';

  for (const inv of inverters) {
    const tEnt = states['sensor.inverter_' + inv.fullId + '_temperature'];
    const sEnt = states['sensor.inverter_' + inv.fullId + '_signal'];
    const vEnt = states['sensor.inverter_' + inv.fullId + '_voltage'];
    const p1Ent = states['sensor.inverter_' + inv.fullId + '_power_ch_1'];
    const p2Ent = states['sensor.inverter_' + inv.fullId + '_power_ch_2'];

    let tVal = tEnt ? parseFloat(tEnt.state) : NaN;
    let sVal = sEnt ? parseFloat(sEnt.state) : NaN;
    let vVal = vEnt ? Math.round(parseFloat(vEnt.state)) : '--';
    let p1Val = p1Ent && !isNaN(parseFloat(p1Ent.state)) ? parseFloat(p1Ent.state) : 0;
    let p2Val = p2Ent && !isNaN(parseFloat(p2Ent.state)) ? parseFloat(p2Ent.state) : 0;
    let invWatts = Math.round(p1Val + p2Val);

    if (!isNaN(tVal)) {
      tempsList.push(tVal);
      if (tVal > maxTemp) {
        maxTemp = tVal;
        maxInvId = inv.id;
      }
      if (tVal < minTemp) {
        minTemp = tVal;
      }
    }

    if (typeof vVal === 'number' && vVal > 0) {
      if (vVal > maxRoofV) {
        maxRoofV = vVal;
        maxRoofVId = inv.id;
      }
    }

    invData.push({
      ...inv,
      temp: !isNaN(tVal) ? Math.round(tVal) : '--',
      signal: !isNaN(sVal) ? Math.round(sVal) : '--',
      voltage: vVal,
      watts: invWatts,
      tEntity: 'sensor.inverter_' + inv.fullId + '_temperature',
      vEntity: 'sensor.inverter_' + inv.fullId + '_voltage'
    });
  }

  // Peak Solar Bus Voltage on roof (from microinverters if active, else Shelly Ch2)
  let solarBusV = maxRoofV > 0 ? maxRoofV : (solarShellyVEnt ? parseFloat(solarShellyVEnt.state) : gridV);
  let deltaV = (maxRoofV > 0 && gridVEnt) ? (maxRoofV - gridV).toFixed(1) : null;

  // Determine overall peak voltage for safety guard
  let overallMaxV = Math.max(gridV, solarBusV);

  let vGuardText = 'GRID NORMAL';
  let vGuardColor = '#00e676';
  let vGuardBg = 'rgba(0, 230, 118, 0.12)';
  let vGuardBorder = 'rgba(0, 230, 118, 0.35)';
  let vGuardGlow = '0 0 10px rgba(0, 230, 118, 0.2)';

  if (overallMaxV >= 253) {
    vGuardText = 'CRITICAL TRIP RISK';
    vGuardColor = '#ff1744';
    vGuardBg = 'rgba(255, 23, 68, 0.25)';
    vGuardBorder = 'rgba(255, 23, 68, 0.6)';
    vGuardGlow = '0 0 16px rgba(255, 23, 68, 0.5)';
  } else if (overallMaxV >= 248) {
    vGuardText = 'HIGH VOLTAGE SPIKE';
    vGuardColor = '#ff9100';
    vGuardBg = 'rgba(255, 145, 0, 0.2)';
    vGuardBorder = 'rgba(255, 145, 0, 0.5)';
    vGuardGlow = '0 0 12px rgba(255, 145, 0, 0.3)';
  } else if (overallMaxV < 210) {
    vGuardText = 'VOLTAGE SAG';
    vGuardColor = '#29b6f6';
    vGuardBg = 'rgba(41, 182, 246, 0.15)';
    vGuardBorder = 'rgba(41, 182, 246, 0.4)';
    vGuardGlow = '0 0 10px rgba(41, 182, 246, 0.25)';
  }

  let avgTemp = tempsList.length ? Math.round(tempsList.reduce((a, b) => a + b, 0) / tempsList.length) : '--';
  minTemp = (minTemp !== 999) ? Math.round(minTemp) : '--';
  maxTemp = (maxTemp !== -999) ? Math.round(maxTemp) : '--';

  
  // Dynamic Inverter Online Status with Night-Standby Awareness
  const onlineEnt2 = states['sensor.ecu_215000026612_inverters_online'];
  const totalEnt2 = states['sensor.ecu_215000026612_inverters'];
  let onlineCount2 = onlineEnt2 ? parseInt(onlineEnt2.state) || 0 : 0;
  let totalCount2 = totalEnt2 ? parseInt(totalEnt2.state) || 8 : 8;

  const sunEnt2 = states['sun.sun'];
  let sunElev2 = (sunEnt2 && sunEnt2.attributes && typeof sunEnt2.attributes.elevation === 'number') ? sunEnt2.attributes.elevation : -10;
  const shellySolarPwr2 = states['sensor.shellyem_e4525b_channel_2_power'];
  let solPwr2 = shellySolarPwr2 ? parseFloat(shellySolarPwr2.state) || 0 : 0;
  let isSunDown2 = (sunElev2 <= 0) && (solPwr2 < 50);
  let isNightStandby2 = isSunDown2 && (onlineCount2 === 0);
  let allOnline2 = !isNightStandby2 && (onlineCount2 === totalCount2);

  let invBadgeText2 = isNightStandby2 ? '🌙 Night Standby' : (allOnline2 ? `${totalCount2}/${totalCount2} Online` : `${onlineCount2}/${totalCount2} Online`);
  let invBadgeColor2 = isNightStandby2 ? '#90caf9' : (allOnline2 ? '#00e676' : '#ffb74d');
  let invBadgeBg2 = isNightStandby2 ? 'rgba(144, 202, 249, 0.12)' : (allOnline2 ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 179, 0, 0.15)');
  let invBadgeBorder2 = isNightStandby2 ? 'rgba(144, 202, 249, 0.35)' : (allOnline2 ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 179, 0, 0.4)');
  let invBadgeShadow2 = isNightStandby2 ? '0 0 10px rgba(144, 202, 249, 0.2)' : (allOnline2 ? '0 0 10px rgba(0, 230, 118, 0.2)' : '0 0 10px rgba(255, 179, 0, 0.2)');

  let peakInvText = (maxInvId && maxInvId !== '') ? `Peak: Inv ${maxInvId}` : (isNightStandby2 ? 'Peak: Standby' : 'Peak: All Standby');

  let output = `
    <style>
      @keyframes spinFan {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .fan-spinning {
        animation: spinFan 0.9s linear infinite !important;
        transform-origin: 50% 50% !important;
        display: inline-flex !important;
      }
    </style>
    <div style="position: relative; pointer-events: auto !important; padding: 16px 12px 14px; box-sizing: border-box; width: 100%; border-radius: 20px; overflow: hidden; background: radial-gradient(circle at 50% 0%, rgba(0, 229, 255, 0.12) 0%, rgba(14, 17, 24, 0.98) 55%);">
      
      <!-- Top Header: Title & Online Inverters Badge -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 2px;">
        <div style="display: flex; align-items: center; gap: 9px;">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, rgba(0, 229, 255, 0.25) 0%, rgba(0, 150, 255, 0.2) 100%); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(0, 229, 255, 0.4); box-shadow: 0 0 12px rgba(0, 229, 255, 0.3);">
            <ha-icon icon="mdi:server-network" style="color: #00e5ff; --mdc-icon-size: 21px;"></ha-icon>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-start;">
            <div style="font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: 0.2px; line-height: 1.1;">Inverter Health & Cooling</div>
            <div style="font-size: 9.5px; color: rgba(255, 255, 255, 0.55); font-weight: 600; margin-top: 2px;">APsystems DS3 & DS3-H Diagnostics</div>
          </div>
        </div>
        <div style="background: ${invBadgeBg2}; border: 1px solid ${invBadgeBorder2}; padding: 3px 9px; border-radius: 12px; font-size: 10.5px; font-weight: 700; color: ${invBadgeColor2}; display: flex; align-items: center; gap: 5px; box-shadow: ${invBadgeShadow2};">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${invBadgeColor2}; box-shadow: 0 0 6px ${invBadgeColor2};"></span>
          ${invBadgeText2}
        </div>
      </div>

      <!-- Active Fan Cooling & COMPLETE Thermal Range Banner -->
      <div style="background: ${fanIsOn ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(0, 150, 255, 0.25) 100%)' : 'rgba(255, 255, 255, 0.03)'}; border: 1px solid ${fanIsOn ? 'rgba(0, 229, 255, 0.5)' : 'rgba(255, 255, 255, 0.08)'}; box-shadow: ${fanIsOn ? '0 0 20px rgba(0, 229, 255, 0.25)' : 'none'}; border-radius: 14px; padding: 10px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        
        <!-- Left: Fan Icon & Status with Instant Debounced Tap Action -->
        <div class="fan-toggle-btn"
             style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent; padding: 4px 6px; border-radius: 10px; transition: transform 0.1s ease, opacity 0.1s ease; touch-action: manipulation;"
             onclick="window._toggleInverterFan(event, this);"
             onpointerup="window._toggleInverterFan(event, this);">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255, 255, 255, 0.1);">
            <div class="${fanIsOn ? 'fan-spinning' : ''}" style="display: inline-flex; align-items: center; justify-content: center; transform-origin: 50% 50%;">
              <ha-icon icon="mdi:fan" style="color: ${fanIsOn ? '#00e5ff' : 'rgba(255, 255, 255, 0.4)'}; --mdc-icon-size: 22px;"></ha-icon>
            </div>
          </div>
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 5px; white-space: nowrap;">
              <span>Cooling Fan</span>
              <span style="font-size: 8px; font-weight: 700; padding: 1px 6px; border-radius: 6px; background: ${fanIsOn ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)'}; color: ${fanIsOn ? '#00e5ff' : 'rgba(255, 255, 255, 0.5)'};">
                ${fanIsOn ? 'RUNNING' : 'STANDBY'}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 3px; white-space: nowrap;">
              <span style="font-size: 8.5px; color: rgba(255, 255, 255, 0.6); white-space: nowrap;">Auto: <b style="color: #ffd54f;">${targetTemp}°C</b></span>
              <span style="font-size: 7.5px; font-weight: 700; color: #00e5ff; background: rgba(0, 229, 255, 0.12); border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 4px; padding: 0.5px 5px; white-space: nowrap; letter-spacing: 0.2px;">Tap to toggle</span>
            </div>
          </div>
        </div>

        <!-- Right: COMPLETE Thermal Range (Min • Avg • Max) & Hottest Inverter -->
        <div style="text-align: right; white-space: nowrap; flex-shrink: 0;">
          <div style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; letter-spacing: 0.4px;">Thermal Range</div>
          <div style="font-size: 13px; font-weight: 800; color: #ffffff; line-height: 1.1; margin-top: 2px; white-space: nowrap;">
            <span style="color: #81c784;">${minTemp}°</span><span style="font-size: 8.5px; color: rgba(255,255,255,0.4); font-weight: 600;"> min</span>
            <span style="color: rgba(255,255,255,0.25); margin: 0 2px;">•</span>
            <span style="color: #81c784;">${avgTemp}°</span><span style="font-size: 8.5px; color: rgba(255,255,255,0.4); font-weight: 600;"> avg</span>
            <span style="color: rgba(255,255,255,0.25); margin: 0 2px;">•</span>
            <span style="color: ${maxTemp >= 45 ? '#ffa726' : '#81c784'};">${maxTemp}°</span><span style="font-size: 8.5px; color: rgba(255,255,255,0.4); font-weight: 600;"> max</span>
          </div>
          <div style="font-size: 7.5px; color: #90caf9; font-family: monospace; margin-top: 2px;">${peakInvText}</div>
        </div>
      </div>

      <!-- RECOMMENDATION A: Grid & AC Voltage Safety Bar with PEAK ROOF BUS VOLTAGE -->
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 7px 11px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <!-- House Grid Voltage (Panel) -->
          <div style="display: flex; align-items: center; gap: 5px; cursor: pointer;"
               onclick="const ev = new CustomEvent('hass-more-info', { detail: { entityId: 'sensor.shellyem_e4525b_channel_1_voltage' }, bubbles: true, composed: true }); this.dispatchEvent(ev);">
            <ha-icon icon="mdi:transmission-tower" style="color: #90caf9; --mdc-icon-size: 15px;"></ha-icon>
            <div>
              <div style="font-size: 7px; color: rgba(255,255,255,0.45); font-weight: 700; text-transform: uppercase;">Grid Panel</div>
              <div style="font-size: 12px; font-weight: 800; color: #ffffff; line-height: 1.1;">${gridV.toFixed(1)} <span style="font-size: 8px; color: rgba(255,255,255,0.45); font-weight: 600;">V</span></div>
            </div>
          </div>
          <div style="width: 1px; height: 18px; background: rgba(255,255,255,0.1);"></div>
          <!-- Peak Roof Solar Bus Voltage (from highest microinverter) -->
          <div style="display: flex; align-items: center; gap: 5px;">
            <ha-icon icon="mdi:solar-power" style="color: #ffd54f; --mdc-icon-size: 15px;"></ha-icon>
            <div>
              <div style="font-size: 7px; color: rgba(255,255,255,0.45); font-weight: 700; text-transform: uppercase;">Roof Bus Peak</div>
              <div style="font-size: 12px; font-weight: 800; color: #ffd54f; line-height: 1.1;">
                ${Math.round(solarBusV)} <span style="font-size: 8px; color: rgba(255,255,255,0.45); font-weight: 600;">V</span>
                <span style="font-size: 7.5px; color: #81c784; font-weight: 700;">${deltaV ? ' (+' + deltaV + 'V)' : ''}</span>
              </div>
            </div>
          </div>
          <div style="width: 1px; height: 18px; background: rgba(255,255,255,0.1);"></div>
          <!-- Grid Frequency -->
          <div style="display: flex; align-items: center; gap: 5px;">
            <ha-icon icon="mdi:sine-wave" style="color: #00e5ff; --mdc-icon-size: 15px;"></ha-icon>
            <div>
              <div style="font-size: 7px; color: rgba(255,255,255,0.45); font-weight: 700; text-transform: uppercase;">Frequency</div>
              <div style="font-size: 12px; font-weight: 800; color: #ffffff; line-height: 1.1;">${gridFreq} <span style="font-size: 8px; color: rgba(255,255,255,0.45); font-weight: 600;">Hz</span></div>
            </div>
          </div>
        </div>

        <!-- Dynamic Chromatic Voltage Safety Badge -->
        <div style="background: ${vGuardBg}; border: 1px solid ${vGuardBorder}; padding: 3px 7px; border-radius: 8px; font-size: 8.5px; font-weight: 800; color: ${vGuardColor}; display: flex; align-items: center; gap: 4px; box-shadow: ${vGuardGlow};">
          <span style="width: 5px; height: 5px; border-radius: 50%; background: ${vGuardColor}; box-shadow: 0 0 6px ${vGuardColor};"></span>
          ${vGuardText}
        </div>
      </div>

      <!-- RECOMMENDATION B: 8 Micro-Inverter Telemetry Grid with VOLTAGE on each tile -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
  `;

  for (const inv of invData) {
    let tColor = '#81c784';
    if (typeof inv.temp === 'number') {
      if (inv.temp >= 50) tColor = '#ef5350';
      else if (inv.temp >= 42) tColor = '#ffa726';
    }

    // Signal Quality Color
    let sigColor = '#81c784';
    if (typeof inv.signal === 'number') {
      if (inv.signal < -75) sigColor = '#ffa726';
      else if (inv.signal < -85) sigColor = '#ef5350';
    }

    // Voltage Warning Color (>248V amber, >252V red)
    let vColor = '#ffffff';
    if (typeof inv.voltage === 'number') {
      if (inv.voltage >= 252) vColor = '#ff1744';
      else if (inv.voltage >= 248) vColor = '#ff9100';
    }

    const isDS3H = (inv.model === 'DS3-H');

    output += `
      <div style="background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 6px 4px 5px; display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; transition: transform 0.15s ease;"
           onclick="const ev = new CustomEvent('hass-more-info', { detail: { entityId: '${inv.tEntity}' }, bubbles: true, composed: true }); this.dispatchEvent(ev);">
        
        <!-- Top: Inverter Badge ID & Accurate Model Tag -->
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; padding: 0 1px;">
          <span style="font-size: 8.5px; font-weight: 800; color: #90caf9; font-family: monospace; letter-spacing: -0.2px;">
            ${inv.id}
          </span>
          <span style="font-size: 7px; font-weight: 800; padding: 1px 4px; border-radius: 3px; background: rgba(255, 255, 255, 0.07); color: rgba(255, 255, 255, 0.55); border: 1px solid transparent;">
            ${inv.model}
          </span>
        </div>

        <!-- Middle: Temperature & Combined Active Wattage -->
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin: 2px 0;">
          <div style="display: flex; align-items: center; gap: 1.5px;">
            <ha-icon icon="mdi:thermometer" style="color: ${tColor}; --mdc-icon-size: 12px;"></ha-icon>
            <span style="font-size: 12.5px; font-weight: 800; color: ${tColor}; line-height: 1;">
              ${inv.temp}°
            </span>
          </div>
          <span style="font-size: 8px; color: rgba(255,255,255,0.25);">•</span>
          <span style="font-size: 11px; font-weight: 800; color: #ffd54f; line-height: 1; text-shadow: 0 0 6px rgba(255,213,79,0.35);">
            ${inv.watts > 0 ? inv.watts + 'W' : '0W'}
          </span>
        </div>

        <!-- Bottom: Dual Telemetry (Voltage + Zigbee Signal) -->
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; background: rgba(0, 0, 0, 0.45); border-radius: 4px; padding: 1.5px 4px; border: 1px solid rgba(255, 255, 255, 0.05); margin-top: 2px; box-sizing: border-box;">
          <span style="font-size: 7.5px; font-weight: 800; color: ${vColor}; font-family: monospace;">
            ${inv.voltage}V
          </span>
          <div style="display: flex; align-items: center; gap: 1.5px;">
            <ha-icon icon="mdi:wifi" style="color: ${sigColor}; --mdc-icon-size: 8px;"></ha-icon>
            <span style="font-size: 7px; font-weight: 700; color: ${sigColor}; font-family: monospace;">
              ${inv.signal}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  output += `
      </div>
    </div>
  `;
  return output;
    }
  }
  customElements.define('solar-inverters-card', SolarInvertersCard);

  // 4. Solar Lifetime Records & Analytics Card
  class SolarAnalyticsCard extends BaseSolarCard {
    get cardBorder() { return 'rgba(0, 230, 118, 0.25)'; }
    renderContent(states, hass, config) {
// 1. Live ECU Energy & Peak Power Records
  const ecuLifeEnt = states['sensor.ecu_215000026612_lifetime_energy'];
  const ecuMaxEnt = states['sensor.ecu_215000026612_lifetime_maximum_power'];
  const dailyYieldEnt = states['sensor.solar_daily_yield'];
  const todayPeakEnt = states['sensor.solar_daily_peak_power'] || states['sensor.living_room_shellyem_e4525b_channel_2_solar_peak_today'];
  const dailyImportEnt = states['sensor.living_room_shellyem_e4525b_channel_1_grid_daily_import_energy'] || states['sensor.grid_daily_import_energy'];
  const dailyExportEnt = states['sensor.grid_daily_export_energy'];
  
  // 2. Stable Blended Average Electricity Tariff for Lifetime Valuation
  // Spain Tarifa 2.0TD Contract Tiers:
  // - P1 (Punta / Peak):  0.171 €/kWh
  // - P2 (Llano / Mid):   0.104 €/kWh
  // - P3 (Valle / Night): 0.080 €/kWh
  // Blended 24h contract avoided cost across all tiers is 0.118 €/kWh.
  // Cumulative multi-year valuation is locked to this stable blended rate (immune to weekend off-peak drops).
  const tariffEnt = states['sensor.precio_kwh'];
  let spotTariff = (tariffEnt && !isNaN(parseFloat(tariffEnt.state))) ? parseFloat(tariffEnt.state) : 0.104;
  let avgTariff = 0.118; // Stable Blended Average Tariff (€/kWh)

  // 3. Dynamic Values (Strict Real Telemetry, Zero Hardcoded Historical Constants)
  let lifeKwh = (ecuLifeEnt && !isNaN(parseFloat(ecuLifeEnt.state))) ? parseFloat(ecuLifeEnt.state) : 0;
  let maxW = (ecuMaxEnt && !isNaN(parseFloat(ecuMaxEnt.state))) ? parseFloat(ecuMaxEnt.state) : 0;
  let todayKwh = (dailyYieldEnt && !isNaN(parseFloat(dailyYieldEnt.state))) ? parseFloat(dailyYieldEnt.state) : 0;

  let lifeMwh = (lifeKwh / 1000).toFixed(2);
  let lifeValEur = Math.round(lifeKwh * avgTariff).toLocaleString('es-ES') + ' €';
  let maxKw = (maxW / 1000).toFixed(2);
  let todayPeakW = (todayPeakEnt && !isNaN(parseFloat(todayPeakEnt.state))) ? parseFloat(todayPeakEnt.state) : 0;
  let todayPeakKw = (todayPeakW / 1000).toFixed(2);

  // Dual Financial Metrics: Gross Solar Value & Net Daily Balance
  let todayImportKwh = (dailyImportEnt && !isNaN(parseFloat(dailyImportEnt.state))) ? parseFloat(dailyImportEnt.state) : 0;
  let todayExportKwh = (dailyExportEnt && !isNaN(parseFloat(dailyExportEnt.state))) ? parseFloat(dailyExportEnt.state) : 0;
  const exportRate = 0.0726; // Contracted Fixed Export Compensation Rate (€/kWh)

  let selfConsumedKwh = Math.max(0, todayKwh - todayExportKwh);
  let selfConsumedVal = selfConsumedKwh * spotTariff;
  let exportCompensationVal = todayExportKwh * exportRate;

  // 1. Gross Solar Value: Avoided retail grid cost plus export compensation credits
  let grossSolarVal = todayExportKwh > 0 ? (selfConsumedVal + exportCompensationVal) : (todayKwh * spotTariff);
  let grossSolarStr = grossSolarVal.toFixed(2).replace('.', ',') + ' €';

  // 2. Net Daily Balance: Export credits minus cost of energy imported from the grid
  let gridImportCost = todayImportKwh * spotTariff;
  let netBalanceVal = exportCompensationVal - gridImportCost;
  let isNetPositive = netBalanceVal >= 0;
  let netBalanceStr = (isNetPositive ? '+' : '') + netBalanceVal.toFixed(2).replace('.', ',') + ' €';

  // Dynamic Environmental Offset:
  // APsystems Standard calculation factor (~0.998 kg CO2/kWh -> 34.8 MWh = 34.76 t CO2)
  let co2Tons = ((lifeKwh * 0.998) / 1000).toFixed(2);
  // Equivalent Trees Planted (~1 tree per 27 kWh)
  let treesCount = Math.round(lifeKwh * 0.037).toLocaleString();

  let output = `
    <div style="position: relative; pointer-events: auto !important; padding: 16px 12px 14px; box-sizing: border-box; width: 100%; border-radius: 20px; overflow: hidden; background: radial-gradient(circle at 50% 0%, rgba(0, 230, 118, 0.12) 0%, rgba(14, 17, 24, 0.98) 55%);">
      
      <!-- Top Header: Title & Total Generation Badge -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding: 0 2px;">
        <div style="display: flex; align-items: center; gap: 9px;">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, rgba(0, 230, 118, 0.25) 0%, rgba(0, 180, 136, 0.2) 100%); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(0, 230, 118, 0.4); box-shadow: 0 0 12px rgba(0, 230, 118, 0.3);">
            <ha-icon icon="mdi:solar-power" style="color: #00e676; --mdc-icon-size: 21px;"></ha-icon>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-start;">
            <div style="font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: 0.2px; line-height: 1.1;">Lifetime Impact & Economy</div>
            <div style="font-size: 9.5px; color: rgba(255, 255, 255, 0.55); font-weight: 600; margin-top: 2px;">APsystems Generation Benefits</div>
          </div>
        </div>
        
      </div>

      <!-- 4 Frosted Glass Stat Tiles -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 10px;">
        
        <!-- Tile 1: Lifetime Solar Energy -->
        <div style="background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(14px); border: 1px solid rgba(255, 179, 0, 0.25); border-radius: 12px; padding: 10px 8px; display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(255, 179, 0, 0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(255, 179, 0, 0.3);">
            <ha-icon icon="mdi:lightning-bolt" style="color: #ffd54f; --mdc-icon-size: 18px;"></ha-icon>
          </div>
          <div>
            <div style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase;">Total Produced</div>
            <div style="font-size: 16px; font-weight: 800; color: #ffd54f; line-height: 1.1;">${lifeMwh} MWh</div>
            
          </div>
        </div>

        <!-- Tile 2: Estimated Energy Value (Dynamic live tariff) -->
        <div style="background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(14px); border: 1px solid rgba(0, 230, 118, 0.25); border-radius: 12px; padding: 10px 8px; display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(0, 230, 118, 0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(0, 230, 118, 0.3);">
            <ha-icon icon="mdi:currency-eur" style="color: #00e676; --mdc-icon-size: 18px;"></ha-icon>
          </div>
          <div>
            <div style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase;">Solar Value</div>
            <div style="font-size: 16px; font-weight: 800; color: #00e676; line-height: 1.1;">${lifeValEur}</div>
            <div style="font-size: 7.5px; color: rgba(255, 255, 255, 0.4); margin-top: 1px;">@ ${avgTariff.toFixed(3)} €/kWh blended tariff</div>
          </div>
        </div>

        <!-- Tile 3: CO2 Avoided -->
        <div style="background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(14px); border: 1px solid rgba(0, 229, 255, 0.25); border-radius: 12px; padding: 10px 8px; display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(0, 229, 255, 0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(0, 229, 255, 0.3);">
            <ha-icon icon="mdi:leaf" style="color: #00e5ff; --mdc-icon-size: 18px;"></ha-icon>
          </div>
          <div>
            <div style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase;">CO₂ Reduction</div>
            <div style="font-size: 16px; font-weight: 800; color: #00e5ff; line-height: 1.1;">${co2Tons} t</div>
            <div style="font-size: 7.5px; color: rgba(255, 255, 255, 0.4); margin-top: 1px;">Carbon offset achieved</div>
          </div>
        </div>

        <!-- Tile 4: Tree Reforestation Equivalent -->
        <div style="background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(14px); border: 1px solid rgba(129, 199, 132, 0.25); border-radius: 12px; padding: 10px 8px; display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(129, 199, 132, 0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(129, 199, 132, 0.3);">
            <ha-icon icon="mdi:tree" style="color: #81c784; --mdc-icon-size: 18px;"></ha-icon>
          </div>
          <div>
            <div style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase;">Trees Planted</div>
            <div style="font-size: 16px; font-weight: 800; color: #81c784; line-height: 1.1;">${treesCount}</div>
            <div style="font-size: 7.5px; color: rgba(255, 255, 255, 0.4); margin-top: 1px;">Forest absorption equiv.</div>
          </div>
        </div>
      </div>

      <!-- 1. All-Time Peak & Today's Peak Row -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 6px 7px; font-size: 9.5px; color: rgba(255, 255, 255, 0.65); font-weight: 600; border-bottom: 1px solid rgba(255, 255, 255, 0.07);">
        <div style="display: flex; align-items: center; gap: 5px;">
          <ha-icon icon="mdi:trophy-award" style="color: #ffd54f; --mdc-icon-size: 14px;"></ha-icon>
          <span>All-Time Peak: <b style="color: #ffd54f;">${maxKw} kW</b></span>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <ha-icon icon="mdi:weather-sunny" style="color: #ffb74d; --mdc-icon-size: 14px;"></ha-icon>
          <span>Today's Peak: <b style="color: #ffb74d;">${todayPeakKw} kW</b></span>
        </div>
      </div>

      <!-- 2. Dual Financial Ribbon: Total Solar Value & Virtual Battery (ELI5 Option 1) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 7px; padding-top: 7px;">
        <!-- Left Tile: Total Solar Value -->
        <div style="background: rgba(0, 230, 118, 0.05); border: 1px solid rgba(0, 230, 118, 0.22); border-radius: 10px; padding: 7px 9px; display: flex; flex-direction: column; gap: 3px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <div style="display: flex; align-items: center; gap: 5px; font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.7); text-transform: uppercase;">
              <ha-icon icon="mdi:solar-power" style="color: #00e676; --mdc-icon-size: 13px;"></ha-icon>
              <span>Total Solar Value</span>
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #00e676; line-height: 1;">${grossSolarStr}</div>
          </div>
          <div style="font-size: 8px; color: rgba(255, 255, 255, 0.5); text-align: left; padding-left: 18px;">Free power used + export</div>
        </div>

        <!-- Right Tile: Virtual Battery (Option 1) -->
        <div style="background: ${isNetPositive ? 'rgba(0, 229, 255, 0.06)' : 'rgba(255, 183, 77, 0.06)'}; border: 1px solid ${isNetPositive ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255, 183, 77, 0.3)'}; border-radius: 10px; padding: 7px 9px; display: flex; flex-direction: column; gap: 3px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <div style="display: flex; align-items: center; gap: 5px; font-size: 8px; font-weight: 700; color: ${isNetPositive ? '#00e5ff' : '#ffb74d'}; text-transform: uppercase;">
              <ha-icon icon="${isNetPositive ? 'mdi:battery-plus-variant' : 'mdi:receipt-text-outline'}" style="color: ${isNetPositive ? '#00e5ff' : '#ffb74d'}; --mdc-icon-size: 13px;"></ha-icon>
              <span>Virtual Battery</span>
            </div>
            <div style="font-size: 13px; font-weight: 800; color: ${isNetPositive ? '#00e5ff' : '#ffb74d'}; line-height: 1;">${netBalanceStr}</div>
          </div>
          <div style="font-size: 8px; color: ${isNetPositive ? '#00e5ff' : '#ffb74d'}; font-weight: 600; text-align: left; padding-left: 18px;">
            ${isNetPositive ? 'Added to Wallet • 0 € bill today' : 'Cost today • Covers from Wallet'}
          </div>
        </div>
      </div>
    </div>
  `;
  return output;
    }
  }
  customElements.define('solar-analytics-card', SolarAnalyticsCard);

  // 5. Unified Mission Control Deck (All-in-one)
  class SolarMissionControlDeck extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    setConfig(config) {
      this._config = config || {};
    }

    set hass(hass) {
      this._hass = hass;
      this._render();
    }

    _render() {
      if (!this._rendered) {
        this.shadowRoot.innerHTML = `
          <style>
            :host { display: block; }
            .deck { display: flex; flex-direction: column; gap: 16px; }
          </style>
          <div class="deck">
            <solar-rooftop-card id="c-rooftop"></solar-rooftop-card>
            <solar-forecast-card id="c-forecast"></solar-forecast-card>
            <solar-inverters-card id="c-inverters"></solar-inverters-card>
            <solar-analytics-card id="c-analytics"></solar-analytics-card>
          </div>
        `;
        this._rooftop = this.shadowRoot.getElementById('c-rooftop');
        this._forecast = this.shadowRoot.getElementById('c-forecast');
        this._inverters = this.shadowRoot.getElementById('c-inverters');
        this._analytics = this.shadowRoot.getElementById('c-analytics');

        this._rooftop.setConfig(this._config.rooftop || this._config);
        this._forecast.setConfig(this._config.forecast || this._config);
        this._inverters.setConfig(this._config.inverters || this._config);
        this._analytics.setConfig(this._config.analytics || this._config);
        this._rendered = true;
      }
      if (this._hass) {
        this._rooftop.hass = this._hass;
        this._forecast.hass = this._hass;
        this._inverters.hass = this._hass;
        this._analytics.hass = this._hass;
      }
    }
  }
  customElements.define('solar-mission-control-deck', SolarMissionControlDeck);

  console.info(
    '%c SOLAR-CARDS %c v1.0.0 Loaded Successfully ',
    'color: white; background: #ff9800; font-weight: bold; border-radius: 4px 0 0 4px;',
    'color: #ff9800; background: #11141a; font-weight: bold; border-radius: 0 4px 4px 0;'
  );
})();
