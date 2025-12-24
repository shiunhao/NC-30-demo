/* script.js - Final Demo Version (V63 - Group Mgmt & Full Features) */

let currentSystemMode = null; 
let currentUserRole = 'admin'; 
let currentOutputMode = 'Single'; 
let maxDecResolution = 2160; 
let ndiSearchGroups = ['Public']; // Default NDI Group

// Initial Data
let sourcesData = [
    { 
        id: 'src_01', name: 'Main Camera 01', ip: '192.168.1.101', group: 'Studio A', status: 'online', thumb: 'https://picsum.photos/id/64/100/56',
        resHeight: 2160, resolution: '3840x2160',
        presets: { 1: 'https://picsum.photos/id/65/160/90', 2: 'https://picsum.photos/id/66/160/90' }
    },
    { 
        id: 'src_02', name: 'PTZ Camera 02', ip: '192.168.1.102', group: 'Studio B', status: 'online', thumb: 'https://picsum.photos/id/1/100/56',
        resHeight: 1080, resolution: '1920x1080',
        presets: { 1: 'https://picsum.photos/id/2/160/90' }
    },
    { 
        id: 'src_03', name: 'OBS Output', ip: '192.168.1.120', group: 'OBS', status: 'error', 
        errorMsg: 'Input Resolution Not Supported',
        thumb: 'https://picsum.photos/id/48/100/56', resHeight: 1080, resolution: '1920x1080', presets: {} 
    },
    { id: 'src_04', name: 'Outdoor Cam', ip: '192.168.1.104', group: 'Outdoor', status: 'offline', thumb: '', resHeight: 720, resolution: '1280x720', presets: {} }
];

let editingSourceId = null;
let selectedAutoSearchIp = null;
let sourceToRemoveId = null;
let pendingRebootMode = null; 
let presetHoverTimer = null; 
let onboardingSelectedMode = null;

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('view-decoder').style.display !== 'none' || document.getElementById('view-encoder').style.display !== 'none') {
        renderSourceList();
        updateLiveHeader();
    }
});

// === Login Logic ===
function doLogin() {
    const btn = document.querySelector('#page-login .btn-primary');
    btn.innerHTML = "Logging in...";
    setTimeout(() => { 
        document.getElementById('page-login').style.display = 'none'; 
        const hasOnboarded = localStorage.getItem('nc30_onboarding_v63');
        if (!hasOnboarded) {
            startOnboarding();
        } else {
            performSwitch('encoder');
        }
    }, 800);
}

// === Onboarding Functions ===
function startOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    overlay.style.display = 'flex'; 
    nextOnboardingStep(1);
}

function closeOnboarding() {
    localStorage.setItem('nc30_onboarding_v63', 'true');
    document.getElementById('onboarding-overlay').style.display = 'none';
    if (!currentSystemMode) performSwitch('encoder');
}

function nextOnboardingStep(step) {
    document.querySelectorAll('.onboarding-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step-dot').forEach(el => el.classList.remove('active'));
    const stepEl = document.getElementById('step-' + step);
    if(stepEl) stepEl.classList.add('active');
    for(let i=1; i<=step; i++) { 
        const dot = document.getElementById('dot-' + i);
        if(dot) dot.classList.add('active'); 
    }
}

function finishOnboarding() {
    closeOnboarding();
}

// === Account Functions ===
function toggleAccountMenu() { 
    document.getElementById('accountMenu').classList.toggle('show'); 
}

function actionAdminMode() {
    if (currentUserRole === 'admin') return;
    document.getElementById('accountMenu').classList.remove('show');
    document.getElementById('modal-admin-auth').style.display = 'flex';
}

function confirmAdminLogin() {
    document.getElementById('modal-admin-auth').style.display = 'none';
    currentUserRole = 'admin';
    document.getElementById('current-user-label').innerText = 'Admin';
    document.getElementById('role-admin').classList.add('active');
    document.getElementById('role-user').classList.remove('active');
    showToast("Switched to Admin", "success");
}

function actionUserMode() {
    currentUserRole = 'user';
    document.getElementById('current-user-label').innerText = 'User';
    document.getElementById('role-user').classList.add('active');
    document.getElementById('role-admin').classList.remove('active');
    toggleAccountMenu();
    showToast("Switched to User", "success");
}

function actionLogout() {
    document.getElementById('accountMenu').classList.remove('show');
    document.getElementById('modal-logout-confirm').style.display = 'flex';
}

function confirmLogout() {
    document.getElementById('modal-logout-confirm').style.display = 'none';
    document.getElementById('app-shell').style.display = 'none';
    document.getElementById('view-encoder').style.display = 'none';
    document.getElementById('view-decoder').style.display = 'none';
    document.getElementById('page-login').style.display = 'flex';
    document.querySelector('#page-login .btn-primary').innerHTML = "LOGIN";
    currentSystemMode = null;
}

// === Auto Load Source ===
function loadDefaultSource() {
    const slot = document.getElementById('slot-1');
    if(!slot) return;
    if(sourcesData.length === 0) {
        checkEmptyState();
        return;
    }
    const firstOnline = sourcesData.find(s => s.status === 'online' && s.resHeight <= maxDecResolution);
    if (firstOnline) {
        applySourceToSlot(slot, firstOnline);
    } else {
        clearSlot(slot);
    }
}

function applySourceToSlot(slot, data) {
    slot.dataset.sourceId = data.id;
    const windowNum = slot.id.split('-')[1];
    if (data.status === 'offline') {
        slot.classList.add('offline-state');
        slot.innerHTML = `<div class="slot-label">Window ${windowNum}</div><div class="offline-overlay"><div class="offline-icon">⚠️</div><div class="offline-text">Signal Lost</div></div>${renderSlotMenu(slot.id)}`;
        updatePTZPanelInfo(windowNum, null);
        setPTZPanelState(false);
        updatePTZPresets(null);
    } else {
        slot.classList.remove('offline-state');
        slot.innerHTML = `<div class="video-layer" style="background-image: url('${data.thumb || 'https://picsum.photos/id/237/400/300'}');"></div><div class="video-overlay-gradient"></div><div class="slot-label">Window ${windowNum}</div><div class="slot-content"><div class="slot-name">${data.name}</div><div class="slot-meta" style="color:#4CAF50;">● Live</div></div>${renderSlotMenu(slot.id)}`;
    }
    slot.classList.add('active-slot');
    selectSlot(slot.id);
}

function clearSlot(slot) {
    delete slot.dataset.sourceId;
    slot.classList.remove('active-slot', 'offline-state');
    const windowNum = slot.id.split('-')[1];
    slot.innerHTML = `<div class="slot-label">Window ${windowNum}</div><div class="slot-content" style="text-align:center;"><div class="slot-name" style="color:#555;">[ Drag Source Here ]</div></div>`;
    selectSlot(slot.id);
}

// === Check Empty State ===
function checkEmptyState() {
    const layout = document.getElementById('outputLayout');
    if(sourcesData.length === 0 && currentSystemMode === 'decoder') {
        layout.innerHTML = `
            <div class="empty-state-wrapper">
                <div class="empty-icon-placeholder">📷</div>
                <div class="empty-text-title">You have not set up any source.</div>
                <div class="empty-text-desc">Please go to Add.</div>
                <button class="empty-btn-primary" onclick="openFullSettings('source', true)">Go to Settings</button>
            </div>
        `;
        selectSlot('none'); 
    } else {
        if(!document.getElementById('slot-1')) switchOutputMode(currentOutputMode === 'Single' ? 1 : 4);
    }
}

// === Refresh with Loading ===
function refreshSourceList() {
    const btn = document.getElementById('btn-refresh-list');
    if(btn) { btn.innerText = "..."; btn.disabled = true; }
    const listContainer = document.getElementById('right-panel-list-container');
    const settingsTbody = document.getElementById('settings-source-list-body');
    const spinnerHtml = '<div style="height:100%; display:flex; align-items:center; justify-content:center; padding:40px;"><div class="loading-spinner-container"><div class="spinner-ring"></div><div style="margin-top:10px; color:#888; font-size:13px;">Updating sources...</div></div></div>';
    if(listContainer) listContainer.innerHTML = spinnerHtml;
    setTimeout(() => {
        if(listContainer) listContainer.innerHTML = `<table class="source-list-table" id="right-panel-table"><thead class="source-list-header"><tr><th style="width:40px;"></th><th>Source Name</th><th style="width:50px; text-align:right;">Act</th></tr></thead><tbody id="source-list-body"></tbody></table>`;
        renderSourceList(); 
        if(btn) { btn.innerText = "↻"; btn.disabled = false; }
        showToast("Source list refreshed", "success");
    }, 1000);
}

function updateLiveHeader() {
    const container = document.getElementById('live-header-info');
    container.innerHTML = '';
    const modeBlock = document.createElement('div');
    modeBlock.className = 'header-info-block';
    modeBlock.innerHTML = `<div class="info-label">Current Mode</div><div class="info-value">Decoder</div>`;
    container.appendChild(modeBlock);
}

function setMaxVideoInput(val) {
    maxDecResolution = parseInt(val);
    renderSourceList(); 
}

// === PTZ LOGIC ===
function selectSlot(slotId) { 
    if(slotId === 'none') {
        updatePTZPanelInfo(null, null);
        setPTZPanelState(false);
        updatePTZPresets(null); 
        return;
    }
    document.querySelectorAll('.preview-slot').forEach(el => el.classList.remove('selected-slot')); 
    const el = document.getElementById(slotId); 
    if(el) { 
        el.classList.add('selected-slot'); 
        const sourceId = el.dataset.sourceId;
        const windowNum = slotId.split('-')[1];
        if (!sourceId) {
            updatePTZPanelInfo(windowNum, null);
            setPTZPanelState(false);
            updatePTZPresets(null); 
        } else {
            const sourceObj = sourcesData.find(s => s.id === sourceId);
            if (sourceObj && (sourceObj.status === 'offline' || sourceObj.resHeight > maxDecResolution)) {
                updatePTZPanelInfo(windowNum, null);
                setPTZPanelState(false);
                updatePTZPresets(null);
            } else {
                updatePTZPanelInfo(windowNum, sourceObj ? sourceObj.name : "Unknown");
                setPTZPanelState(true);
                updatePTZPresets(sourceObj); 
            }
        }
    } 
}

function updatePTZPanelInfo(windowNum, sourceName) {
    const info = document.getElementById('ptz-target-info');
    let text = ""; let color = "";
    if(sourceName) { text = `Target: ${sourceName}`; color = "#007AFF"; } else { text = `Target: Unavailable`; color = "#D32F2F"; }
    if(info) { info.innerText = text; info.style.color = color; }
}

function setPTZPanelState(enabled) {
    const panel = document.querySelector('.embedded-ptz-panel');
    if(panel) { 
        if(enabled) { 
            panel.classList.remove('disabled-ui'); 
            panel.style.opacity = '1'; 
        } else { 
            panel.classList.add('disabled-ui'); 
            panel.style.opacity = '0.5'; 
        } 
    }
}

function updatePTZPresets(sourceObj) {
    const grid = document.getElementById('ptz-preset-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    for(let i=1; i<=9; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        if (sourceObj && sourceObj.presets && sourceObj.presets[i]) {
            const imgUrl = sourceObj.presets[i];
            btn.onmouseenter = (e) => { 
                presetHoverTimer = setTimeout(() => { showPresetTooltip(e.target, imgUrl, `Preset ${i}`); }, 2000); 
            };
            btn.onmouseleave = () => { clearTimeout(presetHoverTimer); hidePresetTooltip(); };
            btn.onclick = () => { clearTimeout(presetHoverTimer); hidePresetTooltip(); showToast(`Recall Preset ${i}`, "success"); };
        } else {
            btn.disabled = true; 
        }
        grid.appendChild(btn);
    }
}

function showPresetTooltip(targetBtn, imgUrl, label) {
    const tooltip = document.getElementById('presetTooltip');
    const tooltipImg = document.getElementById('presetTooltipImg');
    const tooltipLabel = document.getElementById('presetTooltipLabel');
    if(tooltip && tooltipImg) {
        tooltipImg.src = imgUrl; tooltipLabel.innerText = label;
        const rect = targetBtn.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width/2 - 80) + 'px'; 
        tooltip.style.top = (rect.top - 100) + 'px'; 
        tooltip.style.display = 'block';
    }
}

function hidePresetTooltip() { const tooltip = document.getElementById('presetTooltip'); if(tooltip) tooltip.style.display = 'none'; }
function savePreset() { showToast("Preset Saved", "success"); }

// === Render Source List ===
function renderSourceList() {
    const tbody = document.getElementById('source-list-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    sourcesData.forEach(src => {
        const tr = document.createElement('tr');
        const isUnsupported = src.resHeight > maxDecResolution;
        tr.className = `source-row ${src.status === 'offline' ? 'offline' : ''}`;
        
        tr.draggable = !isUnsupported;
        tr.ondragstart = (event) => {
             event.dataTransfer.setData("application/json", JSON.stringify(src));
        };
        let statusHtml = `<span style="color:#4CAF50;">Online</span>`;
        if(src.status === 'error') statusHtml = `<span class="src-status-error">${src.errorMsg}</span>`;
        if(src.status === 'offline') statusHtml = `<span style="color:#888;">Offline</span>`;
        if(isUnsupported) statusHtml += `<span class="src-status-warning">Input Resolution Not Supported</span>`;
        tr.innerHTML = `
            <td class="drag-col"><span class="drag-handle-icon" style="opacity:${isUnsupported?0.3:1}">⋮⋮</span></td>
            <td class="info-col">
                <div class="src-name" style="${src.status==='offline'?'color:#888':''}">${src.name}</div>
                <div class="src-meta" style="font-size:10px;">${src.resolution}</div>
                <div style="font-size:10px; margin-top:2px;">${statusHtml}</div>
            </td>
            <td class="action-col"></td>
        `;
        tbody.appendChild(tr);
    });
}

function allowDrop(ev) { ev.preventDefault(); }

function drop(ev) {
    ev.preventDefault();
    const slot = ev.currentTarget;
    slot.classList.remove('drag-over');
    try {
        const jsonStr = ev.dataTransfer.getData("application/json");
        if(!jsonStr) return;
        const data = JSON.parse(jsonStr);
        applySourceToSlot(slot, data);
    } catch (e) { console.error("Drop failed:", e); }
}

function openFullSettings(tab, autoAdd=false) { 
    if (tab === 'source' && currentSystemMode === 'encoder') {
        tab = 'av-settings';
    }
    document.getElementById('modal-large-settings').style.display = 'flex'; 
    switchSettingsTab(tab); 
    if(autoAdd && tab === 'source') { 
        setTimeout(() => showModal('Add Manual Source'), 300); 
    } 
}

function switchSettingsTab(tabId) {
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    
    const bodyEl = document.getElementById('settings-body-content');
    const titleEl = document.getElementById('settings-title');
    let htmlContent = '';
    
    if(tabId === 'source') {
        titleEl.innerText = "Source Management";
        if (currentSystemMode === 'encoder') {
            bodyEl.innerHTML = `<div style="background:#332b00; border:1px solid #d4b106; color:#ffeeba; padding:10px; border-radius:4px;">⚠️ Source management is only available in <a href="#" onclick="switchSettingsTab('av-settings')" style="color:#FF9500; font-weight:bold;">Decoder Mode</a>.</div>`;
        } else {
             bodyEl.innerHTML = `<div style="display:flex; justify-content:flex-end; margin-bottom:20px;"><button class="btn btn-primary" onclick="showModal('Add Manual Source')">+ Add Source</button></div>
             <table class="source-list-table"><thead class="source-list-header"><tr><th>Preview</th><th>Name & IP</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead>
             <tbody>${sourcesData.map(s => `<tr><td style="padding:10px;"><div class="thumb-box"><img src="${s.thumb}"></div></td><td style="padding:10px;"><div style="color:#fff;">${s.name}</div><div style="font-size:12px;color:#888;">${s.ip}</div></td><td style="padding:10px;color:${s.status==='online'?'#4CAF50':'#888'}">${s.status.toUpperCase()}</td><td style="text-align:right;padding:10px;"><button class="btn btn-outline btn-sm">Edit</button> <button class="btn btn-danger btn-sm">Delete</button></td></tr>`).join('')}</tbody></table>`;
        }
    } 
    else if(tabId === 'av-settings') {
        titleEl.innerText = currentSystemMode === 'encoder' ? "Encoder Settings" : "Decoder Settings";
        const opModeHtml = `<div class="settings-subsection"><div class="settings-group-title">Operation Mode</div><div class="mode-switch-container"><div class="mode-switch-btn ${currentSystemMode==='encoder'?'active':''}" onclick="showRebootWarning('encoder')">Encoder Mode</div><div class="mode-switch-btn ${currentSystemMode==='decoder'?'active':''}" onclick="showRebootWarning('decoder')">Decoder Mode</div></div></div>`;
        if (currentSystemMode === 'encoder') {
            htmlContent = opModeHtml + `<div class="settings-subsection"><div class="settings-group-title">Video Input</div><div class="form-group"><label class="form-label">Maximum Video Input</label><select class="form-select"><option>2160p/60</option></select></div><div class="form-group"><label class="form-label">Current Video Input Resolution</label><input type="text" class="form-input darker-input" value="1080p/60" readonly></div></div><div class="settings-subsection"><div class="settings-group-title">Video Output</div><div class="form-group"><label class="form-label">Maximum Video Output</label><select class="form-select"><option>2160p/60</option></select></div></div><div class="settings-subsection"><div class="settings-group-title">Stream</div><div class="form-group"><label class="form-label">Maximum Steam Output</label><select class="form-select"><option>2160p/60</option></select></div><div class="form-group"><label class="form-label">Framerate</label><select class="form-select"><option>30</option><option selected>60</option></select></div><div class="form-group"><label class="form-label">Bitrate</label><select class="form-select"><option>20Mbps</option><option>AUTO</option></select></div><div class="form-group"><label class="form-label">Encoding Type</label><select class="form-select"><option>H.264</option><option>H.265</option></select></div><div class="form-group"><label class="form-label">I-VOP Interval(S)</label><div style="display:flex; gap:10px; align-items:center;"><input type="range" class="ptz-range" min="1" max="10" value="3"><span style="color:#ccc; font-size:12px;">3S</span></div></div></div>`;
        } else {
             htmlContent = opModeHtml + `<div class="settings-subsection"><div class="settings-group-title">Video Input</div><div class="form-group"><label class="form-label">Maximum Video Input</label><select class="form-select"><option>2160p/60</option></select></div></div><div class="settings-subsection"><div class="settings-group-title">Video Output</div><div class="form-group"><label class="form-label">Maximum Video Output</label><select class="form-select"><option>2160p/60</option></select></div></div><div class="settings-subsection"><div class="settings-group-title">Stream</div><div class="form-group"><label class="form-label">Rate Control</label><select class="form-select"><option>VBR</option><option>CBR</option></select></div></div><div class="settings-subsection"><div class="settings-group-title">Audio Settings</div><div class="form-group"><label class="form-label">Source Select</label><select class="form-select"><option>2160p/60</option></select></div><div class="form-group"><label class="form-label">Volume</label><div style="display:flex;gap:10px;"><input type="range" class="ptz-range" min="1" max="10" value="5"><span style="color:#ccc;font-size:12px;">5</span></div></div><div class="form-group"><label class="form-label">Audio Delay</label><div style="display:flex;gap:10px;"><input type="range" class="ptz-range" min="-500" max="500" value="250"><span style="color:#ccc;font-size:12px;">250ms</span></div></div></div>`;
        }
        bodyEl.innerHTML = htmlContent;
    } 
    else if (tabId === 'network') { 
        titleEl.innerText = "Network Settings"; 
        bodyEl.innerHTML = `<div class="settings-subsection"><div class="settings-group-title">IP Configuration</div><div class="form-group"><div style="display:flex; justify-content:space-between;"><label class="form-label">DHCP</label><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div></div><div class="form-group"><label class="form-label">Hostname</label><input type="text" class="form-input" value="Hostname" readonly></div><div class="form-group"><label class="form-label">IP Address</label><input type="text" class="form-input darker-input" value="10.100.10.10" readonly></div><div class="form-group"><label class="form-label">Netmask</label><input type="text" class="form-input darker-input" value="255.255.255.0" readonly></div><div class="form-group"><label class="form-label">Gateway</label><input type="text" class="form-input darker-input" value="10.100.10.254" readonly></div><div class="form-group"><label class="form-label">DNS</label><input type="text" class="form-input darker-input" value="10.100.10.10" readonly></div></div><div class="settings-subsection"><div class="settings-group-title">NDI Settings</div><div class="form-group"><label class="form-label">Local Device Name</label><input type="text" class="form-input" value="AVer NC30"></div><div class="form-group"><label class="form-label">Group Name</label><input type="text" class="form-input" value="Public"></div><div class="form-group"><label class="radio-custom"><input type="checkbox"> Reliable UDP</label></div></div><div class="settings-subsection"><div class="settings-group-title">Advanced NDI</div><div class="form-group"><label class="form-label">Connection Mode</label><select class="form-select"><option>RUDP</option><option>TCP</option></select></div><div class="form-group"><label class="form-label">Discovery Server</label><label class="radio-custom"><input type="checkbox"> Discovery Server</label></div><div class="form-group"><label class="form-label">Discovery Server Address</label><input type="text" class="form-input" value="10.10.10.100"></div><div class="form-group"><div class="settings-group-title">Multicast</div><label class="radio-custom"><input type="checkbox"> Multicast Server</label></div><div class="form-group"><label class="form-label">Multicast Server Address</label><input type="text" class="form-input" value="10.10.10.100"></div><div class="form-group"><label class="form-label">Multicast Server Mask</label><select class="form-select"><option>255.255.255.0</option></select></div><div class="form-group"><label class="form-label">Multicast TL</label><select class="form-select"><option>10</option></select></div><div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;"><button class="btn btn-outline">Cancel</button><button class="btn btn-primary">Confirm</button></div></div>`; 
    }
    else if (tabId === 'system') { 
        titleEl.innerText = "NC30 Information"; 
        bodyEl.innerHTML = `<div class="settings-subsection"><div class="settings-group-title">General</div><div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:12px; color:#ccc;"><div>Model Name</div><div style="text-align:right; color:#fff;">Tracking Box</div><div>IP Address</div><div style="text-align:right; color:#fff;">192.168.10.10</div><div>Serial Number</div><div style="text-align:right; color:#fff;">abc123456789</div><div>MAC Address</div><div style="text-align:right; color:#fff;">abc123456789</div><div>Firmware Version</div><div style="text-align:right; color:#fff;">abc123456789</div></div></div><div class="settings-subsection"><div class="settings-group-title">Language</div><select class="form-select"><option>繁體中文</option><option>English</option></select></div><div class="settings-subsection"><div class="settings-group-title">Help us improve</div><label class="radio-custom"><input type="checkbox"> Allow anonymous usage data</label></div><div class="settings-subsection"><div class="settings-group-title">Account</div><div class="form-group"><label class="form-label">Admin account</label><input type="text" class="form-input" value="Admin" readonly></div><div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" value="********" readonly></div><div style="text-align:right; margin-bottom:10px;"><button class="btn btn-outline btn-sm">Change</button></div><div class="form-group"><label class="form-label">User account</label><input type="text" class="form-input" readonly></div><div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" readonly></div><div style="text-align:right;"><button class="btn btn-outline btn-sm">Change</button></div></div><div class="settings-subsection"><div class="settings-group-title">Date & Time</div><div class="form-group" style="display:flex; justify-content:space-between; align-items:center;"><span>Date/Time</span><button class="btn btn-outline btn-sm">Set</button></div><div class="form-group" style="display:flex; justify-content:space-between; align-items:center;"><span>Power Schedule</span><button class="btn btn-outline btn-sm">Set</button></div></div><div class="settings-subsection"><div class="settings-group-title">Maintenance</div><div class="form-group"><label class="form-label">Upload Firmware</label><div style="display:flex; gap:10px;"><input type="text" class="form-input" value="No file chosen" readonly style="flex:1;"><button class="btn btn-outline btn-sm">Choose File</button><button class="btn btn-primary btn-sm" disabled>Upgrade</button></div></div><div class="form-group" style="display:flex; justify-content:space-between; align-items:center;"><span>Factory Default</span><button class="btn btn-outline btn-sm">Reset To Factory Default</button></div><div class="form-group" style="display:flex; justify-content:space-between; align-items:center;"><span>Reboot System</span><button class="btn btn-outline btn-sm" onclick="showRebootWarning(currentSystemMode)">Reboot</button></div><div class="settings-group-title" style="margin-top:10px;">Export/import settings</div><div class="form-group" style="display:flex; justify-content:space-between; align-items:center;"><span>Import Settings</span><button class="btn btn-outline btn-sm">Import</button></div><div class="form-group" style="display:flex; justify-content:space-between; align-items:center;"><span>Export Settings</span><button class="btn btn-outline btn-sm">Export</button></div></div>`; 
    }
}

// ... (Standard Modals)
function closeModal(e) { if(!e || e.target.id === 'modalOverlay' || e.target.classList.contains('modal-close-x')) document.getElementById('modalOverlay').style.display = 'none'; }
function closeSpecificModal(id) { document.getElementById(id).style.display = 'none'; }
function showToast(msg, type) { const div = document.createElement('div'); div.className = 'toast'; div.innerHTML = `<span>${msg}</span>`; let container = document.getElementById('toast-container'); if(!container) { container = document.createElement('div'); container.id='toast-container'; document.body.appendChild(container); } container.appendChild(div); setTimeout(() => div.remove(), 3000); }
function showModal(t){if(t==='Add Manual Source'){renderSourceModal('Add Source','','','')}}
function renderSourceModal(t,n,i,g){document.getElementById('modalContentBox').innerHTML=`<div class="modal-header-row"><h3 style="margin:0;color:#fff;">${t}</h3><span class="modal-close-x" onclick="closeModal()">✕</span></div><div class="modal-body-add-source"><div class="form-group"><label class="form-label">Source Name</label><input type="text" id="inputSrcName" class="form-input" value="${n}"></div><div class="form-group"><label class="form-label">Group</label><input type="text" id="inputSrcGroup" class="form-input" value="${g}" placeholder="Select or type group..." list="group-options"><datalist id="group-options">${ndiSearchGroups.map(grp => `<option value="${grp}">`).join('')}</datalist></div><div class="form-group"><label class="form-label">IP Address</label><input type="text" id="inputSrcIP" class="form-input" value="${i}"></div></div><div class="modal-footer"><button class="modal-footer-btn" onclick="closeModal()">Cancel</button><button class="modal-footer-btn" onclick="saveSourceData()">Save</button></div>`;document.getElementById('modalOverlay').style.display='flex';}
function saveSourceData() { 
    // Logic to save group if it's new
    const groupVal = document.getElementById('inputSrcGroup').value;
    if(groupVal && !ndiSearchGroups.includes(groupVal)) ndiSearchGroups.push(groupVal);
    
    showToast("Source Added", "success"); closeModal(); refreshSourceList(); 
}
function showRebootWarning(targetMode) { pendingRebootMode = targetMode; document.getElementById('modal-reboot-warning').style.display = 'flex'; }
function executeReboot() { document.getElementById('modal-reboot-warning').style.display = 'none'; document.getElementById('modal-large-settings').style.display = 'none'; document.getElementById('reboot-overlay').style.display = 'flex'; setTimeout(() => { document.getElementById('reboot-overlay').style.display = 'none'; performSwitch(pendingRebootMode); pendingRebootMode = null; }, 2000); }
function performSwitch(mode) { currentSystemMode = mode; enterView(mode); }
function enterView(mode) { document.getElementById('app-shell').style.display = 'grid'; document.getElementById('view-encoder').style.display = (mode === 'encoder') ? 'block' : 'none'; document.getElementById('view-decoder').style.display = (mode === 'decoder') ? 'block' : 'none'; document.getElementById('current-mode-badge').innerText = mode.toUpperCase() + ' MODE'; document.documentElement.style.setProperty('--theme-color', mode === 'encoder' ? '#007AFF' : '#FF9500'); if(mode === 'decoder') { renderSourceList(); loadDefaultSource(); selectSlot('slot-1'); } }

// Helper for Auto Search Modal Content (called when user clicks search in manual modal? or direct?) 
// Currently 'openAutoSearch' is called from the header button which you removed, 
// BUT the prompt said "Add Source中使用Auto Search...". 
// I will attach openAutoSearch to a button inside the Manual Source modal to make it flow correctly.
// For now, openAutoSearch is accessible.

function openAutoSearch() {
    // Generate UI for Auto Search
    const modal = document.getElementById('modal-auto-search');
    const list = document.getElementById('search-list-content');
    
    // Header Logic
    // Chips
    const chipsHtml = ndiSearchGroups.map(g => `<span class="group-chip active">${g} <span class="group-chip-remove" onclick="removeSearchGroup('${g}')">×</span></span>`).join('');
    
    list.innerHTML = `
        <div style="padding:10px; border-bottom:1px solid #333;">
            <div class="form-label" style="margin-bottom:5px;">Search Scope (NDI Groups)</div>
            <div class="group-chips-container" id="group-chips">${chipsHtml}</div>
            <div class="group-input-row">
                <input type="text" id="new-group-input" class="form-input" placeholder="Add group...">
                <button class="btn btn-primary btn-sm" onclick="addSearchGroup()">Add</button>
            </div>
            <button class="btn btn-outline btn-sm" style="width:100%;" onclick="simulateSearch()">↻ Rescan</button>
        </div>
        <div id="found-devices-list" style="margin-top:10px;">
            <div style="color:#888; text-align:center; padding:20px;">Scanning...</div>
        </div>
    `;
    
    modal.style.display = 'flex';
    setTimeout(simulateSearch, 500);
}

function addSearchGroup() {
    const val = document.getElementById('new-group-input').value.trim();
    if(val && !ndiSearchGroups.includes(val)) {
        ndiSearchGroups.push(val);
        openAutoSearch(); // Re-render
    }
}

function removeSearchGroup(g) {
    ndiSearchGroups = ndiSearchGroups.filter(x => x !== g);
    openAutoSearch();
}

function simulateSearch() {
    const container = document.getElementById('found-devices-list');
    container.innerHTML = '';
    const devices = [ 
        { ip: '192.168.1.101', name: 'Camera 01' }, 
        { ip: '192.168.1.105', name: 'PTZ Cam' }, 
        { ip: '192.168.1.200', name: 'PC Stream' }, 
        { ip: '192.168.1.205', name: 'Meeting Room' } 
    ]; 
    devices.forEach(d => { 
        const el = document.createElement('div'); 
        el.className = 'search-list-item'; 
        el.innerText = `${d.ip} (${d.name})`; 
        el.onclick = function() { 
            document.querySelectorAll('.search-list-item').forEach(i => i.classList.remove('selected')); 
            el.classList.add('selected'); 
            selectedAutoSearchIp = d.ip; 
        }; 
        container.appendChild(el); 
    });
}
