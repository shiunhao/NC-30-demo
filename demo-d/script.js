/* script.js - Final Demo Version (V75 - Edit Logic Fixed) */

let currentSystemMode = null; 
let currentUserRole = 'admin'; 
let currentOutputMode = 'Single'; 
let maxDecResolution = 2160; 
let ndiSearchGroups = ['Public', 'Studio A', 'Conference Room']; 

// Initial Data
let sourcesData = [
    { 
        id: 'src_01', name: 'Device name12314_1', ip: '192.168.1.101', group: 'Studio A', remark: 'Main stage view', status: 'online', thumb: 'https://picsum.photos/id/64/100/56',
        resHeight: 1080, resolution: '1920x1080@60p', channel: 'Device Channel',
        presets: { 1: 'https://picsum.photos/id/65/160/90', 2: 'https://picsum.photos/id/66/160/90' }
    },
    { 
        id: 'src_02', name: 'Device name12314_2', ip: '192.168.1.102', group: 'Studio B', remark: '', status: 'unsupported_ndi', thumb: '',
        resHeight: 1080, resolution: 'Resolution', channel: 'Device Channel',
        presets: { 1: 'https://picsum.photos/id/2/160/90' }
    },
    { 
        id: 'src_03', name: 'Device name12314_3', ip: '192.168.1.103', group: 'OBS', remark: 'Direct feed', status: 'unsupported_res', 
        errorMsg: 'Input Resolution Not Supported',
        thumb: '', resHeight: 3000, resolution: 'Resolution', channel: 'Device Channel', presets: {} 
    },
    { id: 'src_04', name: 'Device name12314_4', ip: 'IP Address', group: 'Outdoor', remark: '', status: 'offline', thumb: '', resHeight: 720, resolution: 'Resolution', channel: 'Device Channel', presets: {} }
];

let editingSourceId = null;
let currentAddSourceTab = 'ndi';
let networkConfig = {
    dhcp: true,
    hostname: 'Hostname',
    ip: '10.100.10.10',
    netmask: '255.255.255.0',
    gateway: '10.100.10.254',
    dns: '10.100.10.1'
};
let ndiConfig = {
    localName: 'AVer NC30',
    groupName: 'Public',
    reliableUdp: false,
    connectionMode: 'RUDP',
    discoveryServer: false,
    discoveryServerIp: '10.10.10.100',
    multicast: false,
    multicastIp: '239.255.0.1',
    multicastMask: '255.255.255.0',
    multicastTtl: 1
};
let selectedAutoSearchIp = null;
let sourceToRemoveId = null;
let pendingRebootMode = null; 
let presetHoverTimer = null; 
let onboardingSelectedMode = null;
let systemConfig = {
    adminUser: 'Admin',
    adminPass: 'adminpassword',
    userUser: 'Admin',
    userPass: 'userpassword',
    language: 'English',
    allowAnonymous: false
};
let decoderSettings = {
    maxInputRes: '1080p/60',
    videoOutputRes: '1080p/60',
    framerate: '30',
    bitrate: '20Mbps',
    rateControl: 'VBR',
    vopInterval: 3,
    audioInputSource: 'NDI',
    audioAnalog: 'MIC In',
    audioVolume: 5,
    audioDelay: 0
};
let encoderSettings = {
    streamOutputRes: '1920 X 1080',
    framerate: '30',
    ndiHxVersion: 'HEX3',
    bitrate: '20Mbps',
    rateControl: 'CBR',
    encodingType: 'H.264',
    vopInterval: 3,
    audioInputSource: 'HDMI',
    audioAnalog: 'MIC In',
    audioVolume: 5,
    audioDelay: 0
};

document.addEventListener('DOMContentLoaded', () => {
    generateSourceTourOverlay();
    if(document.getElementById('view-decoder').style.display !== 'none' || document.getElementById('view-encoder').style.display !== 'none') {
        renderSourceList();
        updateLiveHeader();
    }
});

window.onclick = function(event) {
    if (!event.target.matches('.btn-combo-toggle') && !event.target.matches('.form-input')) {
        const dropdowns = document.getElementsByClassName("combobox-dropdown");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('show')) {
                dropdowns[i].classList.remove('show');
            }
        }
    }
}

function doLogin() {
    const btn = document.querySelector('#page-login .btn-primary');
    btn.innerHTML = "Logging in...";
    setTimeout(() => { 
        document.getElementById('page-login').style.display = 'none'; 
        performSwitch('decoder');
    }, 800);
}

function startOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    overlay.style.display = 'flex'; 
    nextOnboardingStep(1);
}

function closeOnboarding() {
    localStorage.setItem('nc30_onboarding_v75', 'true');
    document.getElementById('onboarding-overlay').style.display = 'none';
    if (!currentSystemMode) performSwitch('decoder');
}

function nextOnboardingStep(step) {
    document.querySelectorAll('.onboarding-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step-dot').forEach(el => el.classList.remove('active'));
    const stepEl = document.getElementById('step-' + step);
    if(stepEl) stepEl.classList.add('active');
    for(let i=1; i<=step; i++) { document.getElementById('dot-' + i).classList.add('active'); }
}

function finishOnboarding() { closeOnboarding(); }

// ... (Account Functions)
function toggleAccountMenu() { document.getElementById('accountMenu').classList.toggle('show'); }
function actionAdminMode() { if (currentUserRole === 'admin') return; document.getElementById('accountMenu').classList.remove('show'); document.getElementById('modal-admin-auth').style.display = 'flex'; }
function confirmAdminLogin() { document.getElementById('modal-admin-auth').style.display = 'none'; currentUserRole = 'admin'; document.getElementById('current-user-label').innerText = 'Admin'; document.getElementById('role-admin').classList.add('active'); document.getElementById('role-user').classList.remove('active'); showToast("Switched to Admin", "success"); }
function actionUserMode() { currentUserRole = 'user'; document.getElementById('current-user-label').innerText = 'User'; document.getElementById('role-user').classList.add('active'); document.getElementById('role-admin').classList.remove('active'); toggleAccountMenu(); showToast("Switched to User", "success"); }
function actionLogout() { document.getElementById('accountMenu').classList.remove('show'); document.getElementById('modal-logout-confirm').style.display = 'flex'; }
function confirmLogout() { document.getElementById('modal-logout-confirm').style.display = 'none'; document.getElementById('app-shell').style.display = 'none'; document.getElementById('view-encoder').style.display = 'none'; document.getElementById('view-decoder').style.display = 'none'; document.getElementById('page-login').style.display = 'flex'; document.querySelector('#page-login .btn-primary').innerHTML = "LOGIN"; currentSystemMode = null; }

function loadDefaultSource() {
    const slot = document.getElementById('slot-1');
    if(!slot) return;
    if(sourcesData.length === 0) { checkEmptyState(); return; }
    const firstOnline = sourcesData.find(s => s.status === 'online' && s.resHeight <= maxDecResolution);
    if (firstOnline) { applySourceToSlot(slot, firstOnline); } else { clearSlot(slot); }
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
        updatePTZPanelInfo(windowNum, data.name);
        setPTZPanelState(true);
        updatePTZPresets(data);
    }
    slot.classList.add('active-slot');
    selectSlot(slot.id);
    renderSourceList();
}

function clearSlot(slot) {
    delete slot.dataset.sourceId;
    slot.classList.remove('active-slot', 'offline-state');
    const windowNum = slot.id.split('-')[1];
    slot.innerHTML = `<div class="slot-label">Window ${windowNum}</div><div class="slot-content" style="text-align:center;"><div class="slot-name" style="color:#555;">[ Drag Source Here ]</div></div>`;
    selectSlot(slot.id);
    renderSourceList();
}

function checkEmptyState() {
    const layout = document.getElementById('outputLayout');
    if(sourcesData.length === 0 && currentSystemMode === 'decoder') {
        layout.innerHTML = `<div class="empty-state-wrapper"><div class="empty-icon-placeholder">📷</div><div class="empty-text-title">You have not set up any source.</div><div class="empty-text-desc">Please go to Add.</div><button class="empty-btn-primary" onclick="openFullSettings('source', true)">Go to Settings</button></div>`;
        selectSlot('none'); 
    } else {
        if(!document.getElementById('slot-1')) switchOutputMode(currentOutputMode === 'Single' ? 1 : 4);
    }
}

function refreshSourceList() {
    const btn = document.getElementById('btn-refresh-list');
    if(btn) { btn.innerText = "..."; btn.disabled = true; }
    const listContainer = document.getElementById('right-panel-list-container');
    if(listContainer) listContainer.innerHTML = '<div style="height:100%; display:flex; align-items:center; justify-content:center; padding:40px;"><div class="loading-spinner-container"><div class="spinner-ring"></div><div style="margin-top:10px; color:#888; font-size:13px;">Updating sources...</div></div></div>';
    setTimeout(() => {
        if(listContainer) listContainer.innerHTML = `<table class="source-list-table" id="right-panel-table"><colgroup><col style="width: 40px;"><col style="width: 98px;"><col><col style="width: 120px;"></colgroup><thead class="source-list-header"><tr><th style="text-align:center; padding-left:10px; padding-right:10px; box-sizing:border-box;"></th><th style="padding-left:10px; padding-right:10px; box-sizing:border-box;">Preview</th><th style="padding-left:10px; padding-right:10px; box-sizing:border-box;">Details</th><th style="text-align:right; padding-right:15px; box-sizing:border-box;">Status</th></tr></thead><tbody id="source-list-body"></tbody></table>`;
        renderSourceList(); 
        if(document.getElementById('modal-large-settings').style.display !== 'none' && document.getElementById('tab-source').classList.contains('active')) { switchSettingsTab('source'); }
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

function setMaxVideoInput(val) { maxDecResolution = parseInt(val); renderSourceList(); }

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
    // Target display removed per request
}

function setPTZPanelState(enabled) {
    const panel = document.querySelector('.embedded-ptz-panel');
    if(panel) { 
        if(enabled) { panel.classList.remove('disabled-ui'); panel.style.opacity = '1'; } else { panel.classList.add('disabled-ui'); panel.style.opacity = '0.5'; } 
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
            btn.onmouseenter = (e) => { presetHoverTimer = setTimeout(() => { showPresetTooltip(e.target, imgUrl, `Preset ${i}`); }, 2000); };
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

function renderSourceList() {
    const tbody = document.getElementById('source-list-body');
    if(!tbody) return;
    const slot = document.getElementById('slot-1');
    const activeSourceId = slot ? slot.dataset.sourceId : null;
    tbody.innerHTML = '';
    sourcesData.forEach(src => {
        const tr = document.createElement('tr');
        const isActive = src.id === activeSourceId;
        
        let isUnsupported = src.status === 'unsupported_ndi' || src.status === 'unsupported_res' || src.resHeight > maxDecResolution;
        tr.className = `source-row ${src.status === 'offline' ? 'offline' : ''} ${isActive ? 'active-source-row' : ''}`;
        tr.draggable = !isUnsupported && src.status !== 'offline';
        tr.ondragstart = (event) => { event.dataTransfer.setData("application/json", JSON.stringify(src)); };
        
        let statusHtml = '';
        if(src.status === 'online') {
            statusHtml = `<span style="color:#30d158; font-weight:bold; font-size:13px; padding-right:15px;">Online</span>`;
        } else if(src.status === 'unsupported_ndi') {
            statusHtml = `<span style="color:#8e8e93; font-size:12px; padding-right:15px; text-align:right; display:block; line-height:1.2;">Unsupported<br>Full NDI</span>`;
        } else if(src.status === 'unsupported_res') {
            statusHtml = `<span style="color:#8e8e93; font-size:12px; padding-right:15px; text-align:right; display:block; line-height:1.2;">Unsupported<br>Resolution</span>`;
        } else if(src.status === 'offline') {
            statusHtml = `<span style="color:#555; font-size:13px; padding-right:15px;">Offline</span>`;
        }
        
        let thumbHtml = '';
        if (src.status === 'online' && src.thumb) {
            thumbHtml = `
            <div class="thumb-box" style="width: 78px; height: 44px; border-radius: 4px; border: 1px solid #333; overflow: hidden; background: #000;">
                <img src="${src.thumb}" style="width:100%; height:100%; object-fit:cover;">
            </div>`;
        } else {
            // Draw stylized camera icon matching user's crop
            const showWarning = src.status === 'unsupported_ndi' || src.status === 'unsupported_res';
            thumbHtml = `
            <div class="thumb-box" style="width: 78px; height: 44px; border-radius: 4px; border: 1px solid #222; overflow: hidden; background: #141414; opacity: ${src.status==='offline'?0.4:1};">
                <svg viewBox="0 0 100 56" style="width:100%; height:100%; display:block;" fill="none">
                    <!-- Camera Base Rounded Rect -->
                    <rect x="25" y="25" width="28" height="15" rx="3" stroke="#555" stroke-width="1.5" fill="none"></rect>
                    <!-- Three Circles Inside Base -->
                    <circle cx="30" cy="32.5" r="1.5" fill="#555"></circle>
                    <circle cx="39" cy="32.5" r="1.5" fill="#555"></circle>
                    <circle cx="48" cy="32.5" r="1.5" fill="#555"></circle>
                    <!-- Neck -->
                    <rect x="36" y="20" width="6" height="5" stroke="#555" stroke-width="1.5" fill="none"></rect>
                    <!-- Dome Head -->
                    <circle cx="39" cy="16" r="3.5" stroke="#555" stroke-width="1.5" fill="none"></circle>
                    
                    ${showWarning ? `
                    <!-- Warning Triangle -->
                    <path d="M62 36l7-12 7 12z" stroke="#d48a04" stroke-width="1.5" fill="none" stroke-linejoin="round"></path>
                    <line x1="69" y1="28" x2="69" y2="32" stroke="#d48a04" stroke-width="1.5" stroke-linecap="round"></line>
                    <circle cx="69" cy="34" r="0.8" fill="#d48a04"></circle>
                    ` : ''}
                </svg>
            </div>`;
        }

        tr.innerHTML = `
            <td class="drag-col" style="text-align:center; padding-left:10px; padding-right:10px; box-sizing:border-box;">
                <div style="display:flex; flex-direction:column; gap:2px; align-items:center; width:8px; opacity:${isUnsupported||src.status==='offline'?0.3:1}; margin:0 auto;">
                    <span style="color:#555; font-size:10px; line-height:3px;">••</span>
                    <span style="color:#555; font-size:10px; line-height:3px;">••</span>
                    <span style="color:#555; font-size:10px; line-height:3px;">••</span>
                    <span style="color:#555; font-size:10px; line-height:3px;">••</span>
                </div>
            </td>
            <td class="thumb-col" style="padding:5px 10px; box-sizing:border-box;">${thumbHtml}</td>
            <td class="info-col" style="padding:5px 10px 5px 10px; box-sizing:border-box;">
                <div class="src-name" style="${src.status==='offline'?'color:#555':'color:#fff'}; font-size:12px; font-weight:bold; margin-bottom:1px;">${src.name}</div>
                <div style="font-size:10px; color:#888; margin-bottom:1px;">${src.channel || 'Device Channel'}</div>
                <div style="font-size:10px; color:#888; margin-bottom:1px;">${src.resolution || 'Resolution'}</div>
                <div style="font-size:10px; color:#888;">${src.ip}</div>
            </td>
            <td style="text-align:right; vertical-align:middle; padding-right:15px; box-sizing:border-box;">${statusHtml}</td>
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
    if (tab === 'source' && currentSystemMode === 'encoder') tab = 'av-settings';
    document.getElementById('modal-large-settings').style.display = 'flex'; 
    switchSettingsTab(tab); 
    if(autoAdd && tab === 'source') { setTimeout(() => showModal('Add Manual Device'), 300); } 
}

function switchSettingsTab(tabId) {
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    
    const bodyEl = document.getElementById('settings-body-content');
    const titleEl = document.getElementById('settings-title');
    const headerRight = document.querySelector('.settings-header-right');
    if(headerRight) headerRight.innerHTML = `<span class="settings-close-btn" onclick="closeSpecificModal('modal-large-settings')">✕</span>`;

    if(tabId === 'source') {
        const headerEl = document.querySelector('.settings-header');
        headerEl.innerHTML = `<span class="settings-title">Device List</span><div class="settings-header-right"><span class="settings-help-icon" onclick="startSourceTour()">🎓 Quick Setup Tour</span><span class="settings-close-btn" onclick="closeSpecificModal('modal-large-settings')">✕</span></div>`;
        
        if (currentSystemMode === 'encoder') {
            bodyEl.innerHTML = `<div style="background:#332b00; border:1px solid #d4b106; color:#ffeeba; padding:10px; border-radius:4px;">⚠️ Source management is only available in <a href="#" onclick="switchSettingsTab('av-settings')" style="color:#FF9500; font-weight:bold;">Decoder Mode</a>.</div>`;
        } else {
             // Added Edit and Delete handlers
             bodyEl.innerHTML = `<div style="display:flex; justify-content:flex-end; margin-bottom:20px;"><button class="btn btn-primary" onclick="showModal('Add Manual Device')">+ Add Device</button></div>
             <div style="background-color: #0a0a0a; width: fit-content; margin: 0 auto; padding: 20px; border-radius: 8px;">
             <table class="source-list-table" style="width: auto; min-width: 800px;"><thead class="source-list-header"><tr><th>Preview</th><th>Name & IP</th><th>Type</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead>
             <tbody>${sourcesData.map(s => `<tr><td style="padding:10px;"><div class="thumb-box"><img src="${s.thumb}"></div></td><td style="padding:10px;"><div style="color:#fff;">${s.name}</div><div style="font-size:12px;color:#888; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${s.ip}">${s.ip}</div></td><td style="padding:10px;color:#ddd;font-weight:500;">${(s.type || 'ndi').toUpperCase()}</td><td style="padding:10px;color:${s.status==='online'?'#4CAF50':'#888'}">${s.status.toUpperCase()}</td><td style="text-align:right;padding:10px;"><button class="btn btn-outline btn-sm" onclick="editSource('${s.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="askRemoveSource('${s.id}')">Delete</button></td></tr>`).join('')}</tbody></table>
             </div>`;
        }
    } 
    else if(tabId === 'av-settings') {
        const title = currentSystemMode === 'encoder' ? "Encoder Settings" : "Decoder Settings";
        const headerEl = document.querySelector('.settings-header');
        headerEl.innerHTML = `<span class="settings-title">${title}</span><span class="settings-close-btn" onclick="closeSpecificModal('modal-large-settings')">✕</span>`;
        
        const opModeHtml = `
        <div class="settings-subsection" style="margin-bottom:25px; border-bottom:none;">
            <div class="settings-group-title" style="font-size:16px; color:#aaa; margin-bottom:15px; font-weight:normal;">Operation Mode</div>
            <div class="mode-switch-container" style="display:flex; gap:10px;">
                <div class="mode-switch-btn" style="flex:1; display:flex; flex-direction:row; align-items:center; justify-content:center; gap:8px; padding:10px 15px; border-radius:6px; border:none; cursor:pointer; background:${currentSystemMode==='decoder'?'#007AFF':'#3a3a3c'}; color:#fff; font-weight:bold;" onclick="showRebootWarning('decoder')">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                        <path d="M12 7l-3 3 3 3"></path>
                        <path d="M17 10H9"></path>
                    </svg>
                    Decoder Mode
                </div>
                <div class="mode-switch-btn" style="flex:1; display:flex; flex-direction:row; align-items:center; justify-content:center; gap:8px; padding:10px 15px; border-radius:6px; border:none; cursor:pointer; background:${currentSystemMode==='encoder'?'#007AFF':'#3a3a3c'}; color:${currentSystemMode==='encoder'?'#fff':'#aaa'}; font-weight:bold;" onclick="showRebootWarning('encoder')">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                        <path d="M12 7l3 3-3 3"></path>
                        <path d="M7 10h8"></path>
                    </svg>
                    Encoder Mode
                </div>
            </div>
        </div>
        <hr style="border:none; border-top:1px solid #333; margin: 15px 0 20px 0;">
        `;

        if (currentSystemMode === 'encoder') {
            const e = encoderSettings;
            bodyEl.innerHTML = opModeHtml + `
            <div class="settings-subsection" style="margin-bottom:20px; border-bottom:none;">
                <div class="settings-group-title" style="font-size:18px; color:#fff; margin-bottom:20px; font-weight:normal;">Encoder Settings</div>
                
                <!-- Stream Output Group -->
                <div style="margin-bottom:25px;">
                    <div style="color:#aaa; font-size:14px; margin-bottom:12px;">Stream Output</div>
                    
                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Stream Output Resolution</label>
                        <select id="enc-streamOutputRes" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;">
                            <option value="1920 X 1080" ${e.streamOutputRes==='1920 X 1080'?'selected':''}>1920 X 1080</option>
                            <option value="3840 X 2160" ${e.streamOutputRes==='3840 X 2160'?'selected':''}>3840 X 2160</option>
                            <option value="1280 X 720" ${e.streamOutputRes==='1280 X 720'?'selected':''}>1280 X 720</option>
                        </select>
                    </div>
                    
                    <hr style="border:none; border-top:1px solid #2a2a2a; margin: 20px 0;">
                    
                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Framerate</label>
                        <select id="enc-framerate" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;">
                            <option value="30" ${e.framerate==='30'?'selected':''}>30</option>
                            <option value="60" ${e.framerate==='60'?'selected':''}>60</option>
                            <option value="50" ${e.framerate==='50'?'selected':''}>50</option>
                            <option value="25" ${e.framerate==='25'?'selected':''}>25</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">NDI HX Version</label>
                        <select id="enc-ndiHxVersion" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;">
                            <option value="HEX3" ${e.ndiHxVersion==='HEX3'?'selected':''}>HEX3</option>
                            <option value="HEX2" ${e.ndiHxVersion==='HEX2'?'selected':''}>HEX2</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Bitrate</label>
                        <select id="enc-bitrate" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;">
                            <option value="20Mbps" ${e.bitrate==='20Mbps'?'selected':''}>20Mbps</option>
                            <option value="16Mbps" ${e.bitrate==='16Mbps'?'selected':''}>16Mbps</option>
                            <option value="12Mbps" ${e.bitrate==='12Mbps'?'selected':''}>12Mbps</option>
                            <option value="8Mbps" ${e.bitrate==='8Mbps'?'selected':''}>8Mbps</option>
                            <option value="AUTO" ${e.bitrate==='AUTO'?'selected':''}>AUTO</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Rate Control</label>
                        <select id="enc-rateControl" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;">
                            <option value="CBR" ${e.rateControl==='CBR'?'selected':''}>CBR</option>
                            <option value="VBR" ${e.rateControl==='VBR'?'selected':''}>VBR</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Encoding Type</label>
                        <select id="enc-encodingType" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;">
                            <option value="H.264" ${e.encodingType==='H.264'?'selected':''}>H.264</option>
                            <option value="H.265" ${e.encodingType==='H.265'?'selected':''}>H.265</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">I-VOP Interval (S)</label>
                        <div style="display:flex; gap:12px; align-items:center;">
                            <span style="color:#aaa; font-size:12px; min-width:10px; text-align:center;">1</span>
                            <input type="range" id="enc-vopInterval" class="ptz-range" min="1" max="10" value="${e.vopInterval}" style="flex:1;" oninput="updateEncSliderVal(this.value)">
                            <span style="color:#aaa; font-size:12px; min-width:15px; text-align:center;">10</span>
                            <span id="enc-vop-val-box" style="background:#2a2a2c; color:#fff; padding:6px 12px; border-radius:4px; font-size:12px; min-width:25px; text-align:center;">${e.vopInterval}S</span>
                        </div>
                    </div>
                </div>

                <!-- Audio Settings Group -->
                <div style="margin-bottom:25px;">
                    <div style="color:#aaa; font-size:14px; margin-bottom:12px;">Audio Settings</div>

                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Input Source Select</label>
                        <select id="enc-audioSource" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;" onchange="updateEncAudioSourceLinkage()">
                            <option value="HDMI" ${e.audioInputSource==='HDMI'?'selected':''}>HDMI</option>
                            <option value="Analog" ${e.audioInputSource==='Analog'?'selected':''}>Analog</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Analog</label>
                        <select id="enc-audioAnalog" class="form-select" style="width:100%; box-sizing:border-box; padding:10px 12px; border-radius:4px; height:40px; ${e.audioInputSource==='HDMI'?'background:transparent; color:#555; border-color:#222; cursor:not-allowed;':'background:#0e0e0e; color:#fff; border-color:#333; cursor:pointer;'}" ${e.audioInputSource==='HDMI'?'disabled':''}>
                            <option value="MIC In" ${e.audioAnalog==='MIC In'?'selected':''}>MIC In</option>
                            <option value="Line In" ${e.audioAnalog==='Line In'?'selected':''}>Line In</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Volume</label>
                        <div style="display:flex; gap:12px; align-items:center;">
                            <span style="color:#aaa; font-size:18px; min-width:15px; text-align:center; font-weight:bold; cursor:pointer;" onclick="adjustEncSliderVal('vol', -1)">—</span>
                            <input type="range" id="enc-volume" class="ptz-range" min="1" max="10" value="${e.audioVolume}" style="flex:1;" oninput="updateEncAudioSliderVal('vol', this.value)">
                            <span style="color:#aaa; font-size:18px; min-width:15px; text-align:center; font-weight:bold; cursor:pointer;" onclick="adjustEncSliderVal('vol', 1)">＋</span>
                            <span id="enc-vol-val-box" style="background:#2a2a2c; color:#fff; padding:6px 12px; border-radius:4px; font-size:12px; min-width:25px; text-align:center;">${e.audioVolume}</span>
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Audio Delay</label>
                        <div style="display:flex; gap:12px; align-items:center;">
                            <span style="color:#aaa; font-size:12px; min-width:45px; text-align:center;">-500ms</span>
                            <input type="range" id="enc-audioDelay" class="ptz-range" min="-500" max="500" value="${e.audioDelay}" style="flex:1;" oninput="updateEncAudioSliderVal('delay', this.value)">
                            <span style="color:#aaa; font-size:12px; min-width:45px; text-align:center;">500ms</span>
                            <span id="enc-delay-val-box" style="background:#2a2a2c; color:#fff; padding:6px 12px; border-radius:4px; font-size:12px; min-width:25px; text-align:center;">${e.audioDelay}ms</span>
                        </div>
                    </div>
                </div>

                <!-- Confirm Button -->
                <div style="display:flex; justify-content:flex-end; margin-top:20px;">
                    <button class="btn" style="width:120px; padding:10px; background:#4a4a4a; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:14px;" onclick="saveEncSettings()">Confirm</button>
                </div>
            </div>
            `;
        } else {
            const s = decoderSettings;
            bodyEl.innerHTML = opModeHtml + `
            <div class="settings-subsection" style="margin-bottom:20px; border-bottom:none;">
                <div class="settings-group-title" style="font-size:18px; color:#fff; margin-bottom:20px; font-weight:normal;">Decoder Settings</div>
                
                <!-- Stream Input Group -->
                <div style="margin-bottom:25px;">
                    <div style="color:#aaa; font-size:14px; margin-bottom:12px;">Stream Input</div>
                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Maximum Input Resolution</label>
                        <select id="dec-maxInputRes" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;">
                            <option value="1080p/60" ${s.maxInputRes==='1080p/60'?'selected':''}>1080p/60</option>
                            <option value="1080p/50" ${s.maxInputRes==='1080p/50'?'selected':''}>1080p/50</option>
                            <option value="720p/60" ${s.maxInputRes==='720p/60'?'selected':''}>720p/60</option>
                        </select>
                    </div>
                </div>

                <!-- Video Output Group -->
                <div style="margin-bottom:25px;">
                    <div style="color:#aaa; font-size:14px; margin-bottom:12px;">Video Output</div>
                    
                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Video Output Resolution</label>
                        <select id="dec-videoOutputRes" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;">
                            <option value="1080p/60" ${s.videoOutputRes==='1080p/60'?'selected':''}>1080p/60</option>
                            <option value="1080p/50" ${s.videoOutputRes==='1080p/50'?'selected':''}>1080p/50</option>
                            <option value="720p/60" ${s.videoOutputRes==='720p/60'?'selected':''}>720p/60</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Framerate</label>
                        <select id="dec-framerate" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;">
                            <option value="60" ${s.framerate==='60'?'selected':''}>60</option>
                            <option value="50" ${s.framerate==='50'?'selected':''}>50</option>
                            <option value="30" ${s.framerate==='30'?'selected':''}>30</option>
                            <option value="25" ${s.framerate==='25'?'selected':''}>25</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Bitrate</label>
                        <select id="dec-bitrate" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;">
                            <option value="20Mbps" ${s.bitrate==='20Mbps'?'selected':''}>20Mbps</option>
                            <option value="16Mbps" ${s.bitrate==='16Mbps'?'selected':''}>16Mbps</option>
                            <option value="12Mbps" ${s.bitrate==='12Mbps'?'selected':''}>12Mbps</option>
                            <option value="8Mbps" ${s.bitrate==='8Mbps'?'selected':''}>8Mbps</option>
                            <option value="AUTO" ${s.bitrate==='AUTO'?'selected':''}>AUTO</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Rate Control</label>
                        <select id="dec-rateControl" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;">
                            <option value="VBR" ${s.rateControl==='VBR'?'selected':''}>VBR</option>
                            <option value="CBR" ${s.rateControl==='CBR'?'selected':''}>CBR</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">I-VOP Interval (S)</label>
                        <div style="display:flex; gap:12px; align-items:center;">
                            <span style="color:#aaa; font-size:12px; min-width:10px; text-align:center;">1</span>
                            <input type="range" id="dec-vopInterval" class="ptz-range" min="1" max="10" value="${s.vopInterval}" style="flex:1;" oninput="updateDecSliderVal('vop', this.value)">
                            <span style="color:#aaa; font-size:12px; min-width:15px; text-align:center;">10</span>
                            <span id="vop-val-box" style="background:#2a2a2c; color:#fff; padding:6px 12px; border-radius:4px; font-size:12px; min-width:25px; text-align:center;">${s.vopInterval}S</span>
                        </div>
                    </div>
                </div>

                <!-- Audio Settings Group -->
                <div>
                    <div style="color:#aaa; font-size:14px; margin-bottom:12px;">Audio Settings</div>

                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Input Source Select</label>
                        <select id="dec-audioSource" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;" onchange="updateDecAudioSourceLinkage()">
                            <option value="NDI" ${s.audioInputSource==='NDI'?'selected':''}>NDI</option>
                            <option value="Analog" ${s.audioInputSource==='Analog'?'selected':''}>Analog</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Analog</label>
                        <select id="dec-audioAnalog" class="form-select" style="width:100%; box-sizing:border-box; padding:10px 12px; border-radius:4px; height:40px;" ${s.audioInputSource==='NDI'?'disabled':''}>
                            <option value="MIC In" ${s.audioAnalog==='MIC In'?'selected':''}>MIC In</option>
                            <option value="Line In" ${s.audioAnalog==='Line In'?'selected':''}>Line In</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom:15px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Volume</label>
                        <div style="display:flex; gap:12px; align-items:center;">
                            <span style="color:#aaa; font-size:18px; min-width:15px; text-align:center; font-weight:bold; cursor:pointer;" onclick="adjustDecSliderVal('vol', -1)">—</span>
                            <input type="range" id="dec-volume" class="ptz-range" min="1" max="10" value="${s.audioVolume}" style="flex:1;" oninput="updateDecSliderVal('vol', this.value)">
                            <span style="color:#aaa; font-size:18px; min-width:15px; text-align:center; font-weight:bold; cursor:pointer;" onclick="adjustDecSliderVal('vol', 1)">＋</span>
                            <span id="vol-val-box" style="background:#2a2a2c; color:#fff; padding:6px 12px; border-radius:4px; font-size:12px; min-width:25px; text-align:center;">${s.audioVolume}</span>
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom:25px;">
                        <label class="form-label" style="display:block; margin-bottom:6px; color:#888; font-size:12px;">Audio Delay</label>
                        <div style="display:flex; gap:12px; align-items:center;">
                            <span style="color:#aaa; font-size:12px; min-width:45px; text-align:center;">-500ms</span>
                            <input type="range" id="dec-audioDelay" class="ptz-range" min="-500" max="500" value="${s.audioDelay}" style="flex:1;" oninput="updateDecSliderVal('delay', this.value)">
                            <span style="color:#aaa; font-size:12px; min-width:45px; text-align:center;">500ms</span>
                            <span id="delay-val-box" style="background:#2a2a2c; color:#fff; padding:6px 12px; border-radius:4px; font-size:12px; min-width:25px; text-align:center;">${s.audioDelay}</span>
                        </div>
                    </div>
                </div>

                <!-- Confirm Button -->
                <div style="display:flex; justify-content:flex-end; margin-top:20px;">
                    <button class="btn" style="width:120px; padding:10px; background:#4a4a4a; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:14px;" onclick="saveDecSettings()">Confirm</button>
                </div>
            </div>

            <style>
                #modal-large-settings .form-select[disabled] {
                    background: #1b1b1b !important;
                    color: #555 !important;
                    border-color: #2a2a2a !important;
                    cursor: not-allowed;
                }
            </style>
            `;
        }
    } 
    else if (tabId === 'ndi') {
        const headerEl = document.querySelector('.settings-header');
        headerEl.innerHTML = `<span class="settings-title">NDI Settings</span><div class="settings-header-right"><span class="settings-close-btn" onclick="closeSpecificModal('modal-large-settings')">✕</span></div>`;
        
        const c = ndiConfig;
        bodyEl.innerHTML = `
        <div class="settings-subsection" style="margin-bottom:25px;">
            <div class="settings-group-title" style="font-size:18px; color:#fff; margin-bottom:20px; font-weight:normal;">General</div>
            
            <div class="form-group" style="margin-bottom:20px;">
                <label class="form-label" style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Local Device Name</label>
                <input type="text" id="ndi-localName" class="form-input" value="${c.localName}" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px;">
            </div>

            <div class="form-group" style="margin-bottom:20px;">
                <label class="form-label" style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Group Name</label>
                <input type="text" id="ndi-groupName" class="form-input" value="${c.groupName}" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px;">
            </div>

            <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <label class="form-label" style="margin:0; font-size:14px; color:#fff;">Reliable UDP</label>
                <label class="switch" style="width: 44px; height: 24px;">
                    <input type="checkbox" id="ndi-reliableUdp" ${c.reliableUdp ? 'checked' : ''}>
                    <span class="slider" style="border-radius: 24px;"></span>
                </label>
            </div>
        </div>

        <div class="settings-subsection" style="margin-bottom:0; border-bottom:none;">
            <div class="settings-group-title" style="font-size:18px; color:#fff; margin-bottom:20px; font-weight:normal;">Advanced</div>

            <div class="form-group" style="margin-bottom:20px;">
                <label class="form-label" style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Connection Mode</label>
                <select id="ndi-connectionMode" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;">
                    <option value="RUDP" ${c.connectionMode==='RUDP'?'selected':''}>RUDP</option>
                    <option value="TCP" ${c.connectionMode==='TCP'?'selected':''}>TCP</option>
                </select>
            </div>

            <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <label class="form-label" style="margin:0; font-size:14px; color:#fff;">Discovery Server</label>
                <label class="switch" style="width: 44px; height: 24px;">
                    <input type="checkbox" id="ndi-discoveryServer" ${c.discoveryServer ? 'checked' : ''} onchange="toggleNdiAdvFields()">
                    <span class="slider" style="border-radius: 24px;"></span>
                </label>
            </div>

            <div class="form-group" style="margin-bottom:20px;">
                <label class="form-label" style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Discovery Server Address</label>
                <input type="text" id="ndi-discoveryServerIp" class="form-input" value="${c.discoveryServerIp}" style="width:100%; box-sizing:border-box; padding:10px 12px; border-radius:4px;" ${c.discoveryServer ? '' : 'readonly'}>
            </div>

            <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <label class="form-label" style="margin:0; font-size:14px; color:#fff;">Multicast</label>
                <label class="switch" style="width: 44px; height: 24px;">
                    <input type="checkbox" id="ndi-multicast" ${c.multicast ? 'checked' : ''} onchange="toggleNdiAdvFields()">
                    <span class="slider" style="border-radius: 24px;"></span>
                </label>
            </div>

            <div class="form-group" style="margin-bottom:20px;">
                <label class="form-label" style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Multicast Address</label>
                <input type="text" id="ndi-multicastIp" class="form-input" value="${c.multicastIp}" style="width:100%; box-sizing:border-box; padding:10px 12px; border-radius:4px;" ${c.multicast ? '' : 'readonly'}>
            </div>

            <div class="form-group" style="margin-bottom:20px;">
                <label class="form-label" style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Multicast Mask</label>
                <input type="text" id="ndi-multicastMask" class="form-input" value="${c.multicastMask}" style="width:100%; box-sizing:border-box; padding:10px 12px; border-radius:4px;" ${c.multicast ? '' : 'readonly'}>
            </div>

            <div class="form-group" style="margin-bottom:25px;">
                <label class="form-label" style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Multicast TTL</label>
                <select id="ndi-multicastTtl" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;" ${c.multicast ? '' : 'disabled'}>
                    <option value="1" ${c.multicastTtl===1?'selected':''}>1</option>
                    <option value="2" ${c.multicastTtl===2?'selected':''}>2</option>
                    <option value="3" ${c.multicastTtl===3?'selected':''}>3</option>
                </select>
            </div>

            <div style="display:flex; justify-content:flex-end; margin-top:20px;">
                <button class="btn" style="width:120px; padding:10px; background:#4a4a4a; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:14px;" onclick="saveNdiSettings()">Confirm</button>
            </div>
        </div>

        <style>
            #modal-large-settings input:checked + .slider { background-color: #007AFF !important; }
            #modal-large-settings .slider:before { height: 18px; width: 18px; left: 3px; bottom: 3px; }
            #modal-large-settings input:checked + .slider:before { transform: translateX(20px); }
            
            #modal-large-settings .form-input[readonly], #modal-large-settings .form-select[disabled] {
                background: #1b1b1b !important;
                color: #555 !important;
                border-color: #2a2a2a !important;
                cursor: not-allowed;
            }
        </style>
        `;
    }
    else if (tabId === 'network') { 
        const headerEl = document.querySelector('.settings-header');
        headerEl.innerHTML = `<span class="settings-title">Network Settings</span><div class="settings-header-right"><span class="settings-close-btn" onclick="closeSpecificModal('modal-large-settings')">✕</span></div>`;
        
        const c = networkConfig;
        bodyEl.innerHTML = `
        <div class="settings-subsection" style="margin-bottom:0; border-bottom:none;">
            <div class="settings-group-title" style="font-size:18px; color:#fff; margin-bottom:20px; font-weight:normal;">IP Configuration</div>
            
            <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px;">
                <label class="form-label" style="margin:0; font-size:14px; color:#fff;">DHCP</label>
                <label class="switch" style="width: 44px; height: 24px;">
                    <input type="checkbox" id="network-dhcp" ${c.dhcp ? 'checked' : ''} onchange="toggleNetworkDHCP()">
                    <span class="slider" style="border-radius: 24px;"></span>
                </label>
            </div>

            <div class="form-group" style="margin-bottom:20px;">
                <label class="form-label" style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Hostname</label>
                <input type="text" id="network-hostname" class="form-input" value="${c.hostname}" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px;">
            </div>

            <div class="form-group" style="margin-bottom:20px;">
                <label class="form-label" style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">IP Address</label>
                <input type="text" id="network-ip" class="form-input" value="${c.ip}" style="width:100%; box-sizing:border-box; padding:10px 12px; border-radius:4px;" ${c.dhcp ? 'readonly' : ''}>
            </div>

            <div class="form-group" style="margin-bottom:20px;">
                <label class="form-label" style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Netmask</label>
                <input type="text" id="network-netmask" class="form-input" value="${c.netmask}" style="width:100%; box-sizing:border-box; padding:10px 12px; border-radius:4px;" ${c.dhcp ? 'readonly' : ''}>
            </div>

            <div class="form-group" style="margin-bottom:20px;">
                <label class="form-label" style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Gateway</label>
                <input type="text" id="network-gateway" class="form-input" value="${c.gateway}" style="width:100%; box-sizing:border-box; padding:10px 12px; border-radius:4px;" ${c.dhcp ? 'readonly' : ''}>
            </div>

            <div class="form-group" style="margin-bottom:25px;">
                <label class="form-label" style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">DNS</label>
                <input type="text" id="network-dns" class="form-input" value="${c.dns}" style="width:100%; box-sizing:border-box; padding:10px 12px; border-radius:4px;" ${c.dhcp ? 'readonly' : ''}>
            </div>

            <div style="display:flex; justify-content:flex-end; margin-top:20px;">
                <button class="btn" style="width:120px; padding:10px; background:#4a4a4a; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:14px;" onclick="saveNetworkSettings()">Confirm</button>
            </div>
        </div>
        
        <style>
            #modal-large-settings input:checked + .slider { background-color: #007AFF !important; }
            #modal-large-settings .slider:before { height: 18px; width: 18px; left: 3px; bottom: 3px; }
            #modal-large-settings input:checked + .slider:before { transform: translateX(20px); }
            
            #modal-large-settings .form-input[readonly] {
                background: #1b1b1b !important;
                color: #555 !important;
                border-color: #2a2a2a !important;
                cursor: not-allowed;
            }
        </style>
        `;
    }
    else if (tabId === 'system') { 
        const headerEl = document.querySelector('.settings-header');
        headerEl.innerHTML = `<span class="settings-title">System Information</span><div class="settings-header-right"><span class="settings-close-btn" onclick="closeSpecificModal('modal-large-settings')">✕</span></div>`;
        
        const c = systemConfig;
        bodyEl.innerHTML = `
        <!-- Subsection: NC30 Information -->
        <div class="settings-subsection" style="margin-bottom:20px; border-bottom:none;">
            <div class="settings-group-title" style="font-size:16px; color:#aaa; margin-bottom:12px; font-weight:normal;">NC30 Information</div>
            <div style="background:#1e1e1e; border:1px solid #333; border-radius:6px; padding:15px 20px; font-size:14px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                    <span style="color:#aaa;">Model Name</span>
                    <span style="color:#fff;">NC30</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                    <span style="color:#aaa;">IP Address</span>
                    <span style="color:#fff;">10.100.105.25</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                    <span style="color:#aaa;">Serial Number</span>
                    <span style="color:#fff;">5100425400002</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                    <span style="color:#aaa;">PoE+MAC Address</span>
                    <span style="color:#fff;">00:18:1A:0C:96:98</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                    <span style="color:#aaa;">Ethernet MAC Address</span>
                    <span style="color:#fff;">00:18:1A:0C:96:99</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                    <span style="color:#aaa;">Firmware Version</span>
                    <span style="color:#fff;">0.1.0003.60</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span style="color:#aaa;">MCU Firmware Version</span>
                    <span style="color:#fff;">36357235</span>
                </div>
            </div>
        </div>

        <!-- Subsection: Upgrade Firmware -->
        <div class="settings-subsection" style="margin-bottom:30px; border-bottom:none;">
            <div class="settings-group-title" style="font-size:16px; color:#aaa; margin-bottom:12px; font-weight:normal;">Upgrade Firmware</div>
            <div style="display:flex; align-items:center; background:#1e1e1e; border:1px solid #333; border-radius:6px; padding:8px 12px; gap:12px;">
                <span id="firmware-file-status" style="color:#aaa; font-size:14px; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">No file chosen</span>
                <button class="btn" style="background:#4a4a4a; color:#fff; padding:8px 16px; border-radius:4px; font-size:13px; cursor:pointer; border:none;" onclick="triggerFirmwareChoose()">Choose File</button>
                <button id="btn-upgrade-fw" class="btn" style="background:#2a2a2a; color:#666; padding:8px 16px; border-radius:4px; font-size:13px; cursor:not-allowed; border:none;" onclick="startFirmwareUpgrade()" disabled>Upgrade</button>
                <input type="file" id="firmware-file-input" style="display:none;" onchange="onFirmwareFileSelected(event)">
            </div>
        </div>

        <hr style="border:none; border-top:1px solid #333; margin: 20px 0 25px 0;">

        <!-- Subsection: Schedule -->
        <div class="settings-subsection" style="margin-bottom:30px; border-bottom:none;">
            <div class="settings-group-title" style="font-size:16px; color:#aaa; margin-bottom:12px; font-weight:normal;">Schedule</div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; background:#1e1e1e; border:1px solid #333; border-radius:6px; padding:12px 20px; margin-bottom:12px;">
                <span style="color:#fff; font-size:14px;">Date / Time</span>
                <button class="btn" style="background:#4a4a4a; color:#fff; padding:8px 24px; border-radius:4px; font-size:13px; cursor:pointer; border:none;" onclick="showToast('Date & Time Sync Triggered', 'success')">Set</button>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; background:#1e1e1e; border:1px solid #333; border-radius:6px; padding:12px 20px;">
                <span style="color:#fff; font-size:14px;">Power Schedule</span>
                <button class="btn" style="background:#4a4a4a; color:#fff; padding:8px 24px; border-radius:4px; font-size:13px; cursor:pointer; border:none;" onclick="showToast('Power Schedule Modal Triggered', 'success')">Set</button>
            </div>
        </div>

        <hr style="border:none; border-top:1px solid #333; margin: 20px 0 25px 0;">

        <!-- Subsection: Account -->
        <div class="settings-subsection" style="margin-bottom:30px; border-bottom:none;">
            <div class="settings-group-title" style="font-size:16px; color:#aaa; margin-bottom:20px; font-weight:normal;">Account</div>
            
            <!-- Admin Account -->
            <div style="margin-bottom:25px;">
                <div style="color:#fff; font-size:14px; margin-bottom:15px; font-weight:bold;">Admin Account</div>
                
                <div class="form-group" style="margin-bottom:12px;">
                    <label class="form-label" style="display:block; margin-bottom:6px; color:#aaa; font-size:12px;">Username</label>
                    <input type="text" id="system-admin-user" class="form-input" value="${c.adminUser}" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px;">
                </div>

                <div class="form-group" style="margin-bottom:12px;">
                    <label class="form-label" style="display:block; margin-bottom:6px; color:#aaa; font-size:12px;">Password</label>
                    <input type="password" id="system-admin-pass" class="form-input" value="${c.adminPass}" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px;">
                </div>

                <div style="display:flex; justify-content:flex-end;">
                    <button class="btn" style="background:#4a4a4a; color:#fff; padding:8px 20px; border-radius:4px; font-size:13px; cursor:pointer; border:none;" onclick="changeAccount('admin')">Change</button>
                </div>
            </div>

            <!-- User Account -->
            <div style="margin-bottom:15px;">
                <div style="color:#fff; font-size:14px; margin-bottom:15px; font-weight:bold;">User Account</div>
                
                <div class="form-group" style="margin-bottom:12px;">
                    <label class="form-label" style="display:block; margin-bottom:6px; color:#aaa; font-size:12px;">Username</label>
                    <input type="text" id="system-user-user" class="form-input" value="${c.userUser}" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px;">
                </div>

                <div class="form-group" style="margin-bottom:12px;">
                    <label class="form-label" style="display:block; margin-bottom:6px; color:#aaa; font-size:12px;">Password</label>
                    <input type="password" id="system-user-pass" class="form-input" value="${c.userPass}" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px;">
                </div>

                <div style="display:flex; justify-content:flex-end;">
                    <button class="btn" style="background:#4a4a4a; color:#fff; padding:8px 20px; border-radius:4px; font-size:13px; cursor:pointer; border:none;" onclick="changeAccount('user')">Change</button>
                </div>
            </div>
        </div>

        <hr style="border:none; border-top:1px solid #333; margin: 20px 0 25px 0;">

        <!-- Subsection: General -->
        <div class="settings-subsection" style="margin-bottom:30px; border-bottom:none;">
            <div class="settings-group-title" style="font-size:16px; color:#aaa; margin-bottom:20px; font-weight:normal;">General</div>
            
            <div class="form-group" style="margin-bottom:20px;">
                <label class="form-label" style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Language</label>
                <select id="system-language" class="form-select" style="width:100%; box-sizing:border-box; background:#0e0e0e; border:1px solid #333; color:#fff; padding:10px 12px; border-radius:4px; height:40px;" onchange="changeLanguage()">
                    <option value="English" ${c.language==='English'?'selected':''}>English</option>
                    <option value="繁體中文" ${c.language==='繁體中文'?'selected':''}>繁體中文</option>
                </select>
            </div>

            <div class="form-group" style="margin-bottom:20px;">
                <label class="form-label" style="display:block; margin-bottom:8px; color:#aaa; font-size:13px;">Help Us Improve</label>
                <div style="display:flex; justify-content:space-between; align-items:center; background:#1e1e1e; border:1px solid #333; border-radius:6px; padding:12px 20px;">
                    <label style="display:flex; align-items:center; gap:10px; color:#fff; font-size:14px; cursor:pointer;">
                        <input type="checkbox" id="system-allow-anonymous" ${c.allowAnonymous ? 'checked' : ''} onchange="toggleAnonymousCheckbox()" style="accent-color:#007AFF; width:16px; height:16px;">
                        Allow anonymous usage data
                    </label>
                    <span style="color:#aaa; font-size:18px; cursor:pointer;" onclick="showToast('Anonymous usage data helps us optimize performance and track system metrics.', 'info')">ⓘ</span>
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; background:#1e1e1e; border:1px solid #333; border-radius:6px; padding:12px 20px; margin-bottom:12px;">
                <span style="color:#fff; font-size:14px;">Factory Default</span>
                <button class="btn" style="background:#4a4a4a; color:#fff; padding:8px 16px; border-radius:4px; font-size:13px; cursor:pointer; border:none;" onclick="showToast('Resetting to factory default...', 'warning')">Reset to Factory Default</button>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; background:#1e1e1e; border:1px solid #333; border-radius:6px; padding:12px 20px;">
                <span style="color:#fff; font-size:14px;">Reboot System</span>
                <button class="btn" style="background:#4a4a4a; color:#fff; padding:8px 24px; border-radius:4px; font-size:13px; cursor:pointer; border:none;" onclick="showRebootWarning(currentSystemMode)">Reboot</button>
            </div>
        </div>

        <hr style="border:none; border-top:1px solid #333; margin: 20px 0 25px 0;">

        <!-- Subsection: Export/Import Settings -->
        <div class="settings-subsection" style="margin-bottom:0; border-bottom:none;">
            <div class="settings-group-title" style="font-size:16px; color:#aaa; margin-bottom:20px; font-weight:normal;">Export/Import Settings</div>

            <div style="display:flex; justify-content:space-between; align-items:center; background:#1e1e1e; border:1px solid #333; border-radius:6px; padding:12px 20px; margin-bottom:12px;">
                <span style="color:#fff; font-size:14px;">Import Settings</span>
                <button class="btn" style="background:#4a4a4a; color:#fff; padding:8px 24px; border-radius:4px; font-size:13px; cursor:pointer; border:none;" onclick="importSettings()">Import</button>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; background:#1e1e1e; border:1px solid #333; border-radius:6px; padding:12px 20px; margin-bottom:12px;">
                <span style="color:#fff; font-size:14px;">Export Settings</span>
                <button class="btn" style="background:#4a4a4a; color:#fff; padding:8px 24px; border-radius:4px; font-size:13px; cursor:pointer; border:none;" onclick="exportSettings()">Export</button>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; background:#1e1e1e; border:1px solid #333; border-radius:6px; padding:12px 20px;">
                <span style="color:#fff; font-size:14px;">Save debug files</span>
                <button class="btn" style="background:#4a4a4a; color:#fff; padding:8px 24px; border-radius:4px; font-size:13px; cursor:pointer; border:none;" onclick="downloadDebugFiles()">Save</button>
            </div>
        </div>
        `;
    }
    else if (tabId === 'help') {
        const headerEl = document.querySelector('.settings-header');
        headerEl.innerHTML = `<span class="settings-title">Help</span><div class="settings-header-right"><span class="settings-close-btn" onclick="closeSpecificModal('modal-large-settings')">✕</span></div>`;
        bodyEl.innerHTML = `<div class="help-nav"><div class="help-tab-item active">Manual</div><div class="help-tab-item">About</div><div class="help-tab-item">Privacy Policy</div></div><div class="help-content"><div class="help-content-title">User Manual</div><div class="help-content-row"><span style="color:#ccc; font-size:13px;">Online Software User Manual</span><button class="btn btn-outline btn-sm">Read</button></div></div>`;
    }
}

// ... (Standard Modals)
function closeModal(e) { 
    if(!e || e.target.id === 'modalOverlay' || e.target.classList.contains('modal-close-x')) {
        document.getElementById('modalOverlay').style.display = 'none'; 
        const container = document.getElementById('modalContentBox');
        if (container) {
            container.style.height = '';
            container.style.display = '';
            container.style.flexDirection = '';
            container.style.boxSizing = '';
        }
    }
}
function closeSpecificModal(id) { document.getElementById(id).style.display = 'none'; }
function showToast(msg, type) { const div = document.createElement('div'); div.className = 'toast'; div.innerHTML = `<span>${msg}</span>`; let container = document.getElementById('toast-container'); if(!container) { container = document.createElement('div'); container.id='toast-container'; document.body.appendChild(container); } container.appendChild(div); setTimeout(() => div.remove(), 3000); }

// === MODIFIED: showModal with Limit Check & Reset Edit ID ===
function showModal(t){
    if(t==='Add Manual Device'){
        if (sourcesData.length >= 4) {
            document.getElementById('modal-alert').style.display = 'flex';
            return;
        }
        editingSourceId = null; // Important reset
        renderSourceModal('Add Device','','','','');
    }
}

// === NEW: Edit Source Function ===
function editSource(id) {
    const src = sourcesData.find(s => s.id === id);
    if(src) {
        editingSourceId = id; // Set global flag
        renderSourceModal('Edit Source', src.name, src.ip, src.group, src.remark);
    }
}

function renderSourceModal(t,n,i,g,r){
    const container = document.getElementById('modalContentBox');
    const groupValue = g || (ndiSearchGroups.length > 0 ? ndiSearchGroups[0] : '');

    let type = 'ndi';
    let rtspUser = '';
    let rtspPass = '';
    let channelVal = '';
    if (editingSourceId) {
        const src = sourcesData.find(s => s.id === editingSourceId);
        if (src) {
            channelVal = src.channel || '';
            if (src.type === 'rtsp') {
                type = 'rtsp';
                rtspUser = src.username || '';
                rtspPass = src.password || '';
            }
        }
    }
    currentAddSourceTab = type;
    
    // Set container constraints to keep absolute fixed height and layout
    container.style.height = '560px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.boxSizing = 'border-box';
    
    container.innerHTML=`
    <div class="modal-header-row" style="position:relative; justify-content:center; padding: 20px 20px 10px; border-bottom:none;">
        <h3 style="margin:0; color:#fff; font-size:18px; font-weight:normal;">${t}</h3>
        <span class="modal-close-x" style="position:absolute; right:20px; top:20px; font-size:16px; color:#aaa; cursor:pointer;" onclick="closeModal()">✕</span>
    </div>

    <div class="modal-body-add-source" style="padding: 0 30px 20px; flex:1;">
        <!-- Type Dropdown Select -->
        <div class="form-group" style="margin-bottom:15px; position:relative;">
            <select id="selectSourceType" class="form-input" style="width:100%; box-sizing:border-box; background:#111113; color:#fff; border:1px solid #333; border-radius:6px; height:40px; padding:0 15px; appearance:none; -webkit-appearance:none; font-size:14px;" onchange="switchSourceTab(this.value)">
                <option value="ndi" ${type==='ndi'?'selected':''}>Streaming via NDI</option>
                <option value="rtsp" ${type==='rtsp'?'selected':''}>Streaming via RTSP</option>
            </select>
            <svg style="position:absolute; right:15px; top:50%; transform:translateY(-50%); width:12px; height:12px; fill:#aaa; pointer-events:none;" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
        </div>

        <!-- NDI Group (NDI only) -->
        <div id="group-field-wrapper" class="form-group" style="margin-bottom:15px; display:${type==='ndi'?'block':'none'};">
            <label class="form-label" style="display:block; margin-bottom:8px; color:#ddd; font-size:13px;">NDI Group</label>
            <input type="text" id="inputSrcGroup" class="form-input" value="${groupValue}" placeholder="Classroom" style="width:100%; box-sizing:border-box; background:#111113;" oninput="validateSourceForm()">
        </div>
        
        <!-- IP Address (both) -->
        <div class="form-group" style="margin-bottom:15px; position:relative; display:flex;">
            <input type="text" id="inputSrcIP" class="form-input" value="${i}" placeholder="IP Address" style="width:100%; box-sizing:border-box; padding-right:${type==='ndi'?'100px':'15px'}; background:#111113;" oninput="validateSourceForm()">
            <button id="btnAutoSearch" class="btn" style="position:absolute; right:5px; top:5px; bottom:5px; background:#4a4a4a; color:#ddd; border:none; border-radius:4px; padding:0 15px; font-size:12px; cursor:pointer; display:${type==='ndi'?'block':'none'};" onclick="openAutoSearch()">Auto Search</button>
        </div>
        
        <!-- Device Channel (NDI only) -->
        <div id="channel-field-wrapper" class="form-group" style="margin-bottom:15px; display:${type==='ndi'?'block':'none'};">
            <input type="text" id="inputSrcChannel" class="form-input" value="${channelVal}" placeholder="Device Channel(Device ID)" style="width:100%; box-sizing:border-box; background:#111113;" oninput="validateSourceForm()">
        </div>
        
        <!-- Username (RTSP only) -->
        <div id="username-field-wrapper" class="form-group" style="margin-bottom:15px; position:relative; display:${type==='rtsp'?'block':'none'};">
            <input type="text" id="inputSrcUser" class="form-input" value="${rtspUser}" placeholder="RTSP Account" style="width:100%; box-sizing:border-box; padding-right:45px; background:#111113;" oninput="validateSourceForm()">
            <svg style="position:absolute; right:15px; top:50%; transform:translateY(-50%); width:16px; height:16px; fill:#888;" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        </div>
        
        <!-- Password (RTSP only) -->
        <div id="password-field-wrapper" class="form-group" style="margin-bottom:15px; position:relative; display:${type==='rtsp'?'block':'none'};">
            <input type="password" id="inputSrcPass" class="form-input" value="${rtspPass}" placeholder="RTSP Password" style="width:100%; box-sizing:border-box; padding-right:45px; background:#111113;" oninput="validateSourceForm()">
            <svg style="position:absolute; right:15px; top:50%; transform:translateY(-50%); width:16px; height:16px; fill:#888;" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
        </div>

        <!-- Device Name (both) -->
        <div id="name-field-wrapper" class="form-group" style="margin-bottom:25px; position:relative;">
            <input type="text" id="inputSrcName" class="form-input" value="${n}" placeholder="Device Name" style="width:100%; box-sizing:border-box; padding-right:${type==='rtsp'?'45px':'15px'}; background:#111113;" oninput="validateSourceForm()">
            <span id="name-icon-container" style="display:${type==='rtsp'?'block':'none'};">
                <svg style="position:absolute; right:15px; top:50%; transform:translateY(-50%); width:16px; height:16px; fill:#888;" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 4h5v2h-5V7zm0 4h5v2h-5v-2zm-9 8c0-1.66 1.34-3 3-3s3 1.34 3 3H5zm3-5c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>
            </span>
        </div>
    </div>
    <div class="modal-footer" style="display:flex; justify-content:center; gap:15px; padding: 0 30px 30px; border-top:none; margin-top:auto;">
        <button class="btn" style="flex:1; padding:12px; background:#4a4a4a; color:#fff; border:none; border-radius:6px; cursor:pointer;" onclick="closeModal()">Cancel</button>
        <button id="btnSaveSource" class="btn" style="flex:1; padding:12px; background:#2a2a2a; color:#666; border:none; border-radius:6px; cursor:not-allowed;" onclick="saveSourceData()" disabled>Save</button>
    </div>
    <div id="modal-add-group" class="modal-overlay" style="display:none; z-index:3200;" onclick="if(event.target===this) closeAddGroupModal()">
        <div class="modal-box" style="width:300px;">
            <h3 style="color:#fff; margin-bottom:15px;">Create New Group</h3>
            <input type="text" id="new-group-name" class="form-input" placeholder="Enter group name...">
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;"><button class="btn btn-outline" onclick="closeAddGroupModal()">Cancel</button><button class="btn btn-primary" onclick="confirmAddGroup()">Create</button></div>
        </div>
    </div>`;
    document.getElementById('modalOverlay').style.display='flex';
    validateSourceForm();
}

window.switchSourceTab = function(tab) {
    currentAddSourceTab = tab;
    
    const selectEl = document.getElementById('selectSourceType');
    if (selectEl) selectEl.value = tab;
    
    const groupField = document.getElementById('group-field-wrapper');
    const channelField = document.getElementById('channel-field-wrapper');
    const userField = document.getElementById('username-field-wrapper');
    const passField = document.getElementById('password-field-wrapper');
    const searchBtn = document.getElementById('btnAutoSearch');
    const ipInput = document.getElementById('inputSrcIP');
    const nameIcon = document.getElementById('name-icon-container');
    const nameInput = document.getElementById('inputSrcName');
    
    if (groupField) groupField.style.display = tab === 'ndi' ? 'block' : 'none';
    if (channelField) channelField.style.display = tab === 'ndi' ? 'block' : 'none';
    if (userField) userField.style.display = tab === 'rtsp' ? 'block' : 'none';
    if (passField) passField.style.display = tab === 'rtsp' ? 'block' : 'none';
    
    if (searchBtn) searchBtn.style.display = tab === 'ndi' ? 'block' : 'none';
    if (ipInput) ipInput.style.paddingRight = tab === 'ndi' ? '100px' : '15px';
    
    if (nameIcon) nameIcon.style.display = tab === 'rtsp' ? 'block' : 'none';
    if (nameInput) nameInput.style.paddingRight = tab === 'rtsp' ? '45px' : '15px';
    
    validateSourceForm();
};

window.validateSourceForm = function() {
    const saveBtn = document.getElementById('btnSaveSource');
    if (!saveBtn) return;
    
    const name = document.getElementById('inputSrcName')?.value.trim() || '';
    const ip = document.getElementById('inputSrcIP')?.value.trim() || '';
    
    let isValid = false;
    if (currentAddSourceTab === 'ndi') {
        isValid = (name !== '' && ip !== '');
    } else {
        const user = document.getElementById('inputSrcUser')?.value.trim() || '';
        const pass = document.getElementById('inputSrcPass')?.value.trim() || '';
        isValid = (name !== '' && ip !== '' && user !== '' && pass !== '');
    }
    
    if (isValid) {
        saveBtn.disabled = false;
        saveBtn.style.background = '#4a4a4a';
        saveBtn.style.color = '#fff';
        saveBtn.style.cursor = 'pointer';
    } else {
        saveBtn.disabled = true;
        saveBtn.style.background = '#2a2a2a';
        saveBtn.style.color = '#666';
        saveBtn.style.cursor = 'not-allowed';
    }
};

function toggleCombobox(e) { e.stopPropagation(); document.getElementById('group-dropdown').classList.toggle('show'); }
function selectComboboxItem(val) { document.getElementById('inputSrcGroup').value = val; document.getElementById('group-dropdown').classList.remove('show'); }
function deleteSearchGroup(grpName, event) {
    event.stopPropagation();
    if(confirm(`Are you sure you want to delete group "${grpName}"?`)) {
        ndiSearchGroups = ndiSearchGroups.filter(g => g !== grpName);
        const currentInput = document.getElementById('inputSrcGroup');
        if(currentInput.value === grpName) currentInput.value = 'Public';
        const dropdown = document.getElementById('group-dropdown');
        dropdown.innerHTML = ndiSearchGroups.map(grp => `<div class="combobox-item" onclick="selectComboboxItem('${grp}')"><span>${grp}</span>${grp !== 'Public' ? `<span class="group-delete-btn" onclick="deleteSearchGroup('${grp}', event)">×</span>` : ''}</div>`).join('') + `<div class="combobox-footer" onclick="openAddGroupModal()">+ Create new</div>`;
    }
}
function openAddGroupModal() { document.getElementById('group-dropdown').classList.remove('show'); document.getElementById('modal-add-group').style.display = 'flex'; document.getElementById('new-group-name').value = ''; document.getElementById('new-group-name').focus(); }
function closeAddGroupModal() { document.getElementById('modal-add-group').style.display = 'none'; }
function confirmAddGroup() {
    const newName = document.getElementById('new-group-name').value.trim();
    if(newName) {
        if(!ndiSearchGroups.includes(newName)) ndiSearchGroups.push(newName);
        document.getElementById('inputSrcGroup').value = newName;
        const dropdown = document.getElementById('group-dropdown');
        dropdown.innerHTML = ndiSearchGroups.map(grp => `<div class="combobox-item" onclick="selectComboboxItem('${grp}')"><span>${grp}</span>${grp !== 'Public' ? `<span class="group-delete-btn" onclick="deleteSearchGroup('${grp}', event)">×</span>` : ''}</div>`).join('') + `<div class="combobox-footer" onclick="openAddGroupModal()">+ Create new</div>`;
    }
    closeAddGroupModal();
}

// === MODIFIED: saveSourceData (Handle Create/Update) ===
function saveSourceData() { 
    let type = currentAddSourceTab;
    const name = document.getElementById('inputSrcName')?.value.trim() || '';
    const ip = document.getElementById('inputSrcIP')?.value.trim() || '';
    let channel = document.getElementById('inputSrcChannel')?.value.trim() || '';
    if (type === 'rtsp') {
        channel = '';
    }
    
    let groupVal = '', rtspUser = '', rtspPass = '';
    if (type === 'ndi') {
        groupVal = document.getElementById('inputSrcGroup')?.value.trim() || '';
        if(groupVal && !ndiSearchGroups.includes(groupVal)) ndiSearchGroups.push(groupVal);
    } else {
        groupVal = 'RTSP'; 
        rtspUser = document.getElementById('inputSrcUser')?.value.trim() || '';
        rtspPass = document.getElementById('inputSrcPass')?.value.trim() || '';
    }

    if(name && ip) {
        if (type === 'rtsp' && (!rtspUser || !rtspPass)) {
            return; // Block save if RTSP credentials are missing
        }
        
        if (editingSourceId) {
            const index = sourcesData.findIndex(s => s.id === editingSourceId);
            if (index !== -1) {
                sourcesData[index].type = type;
                sourcesData[index].name = name;
                sourcesData[index].ip = ip;
                sourcesData[index].group = groupVal;
                sourcesData[index].channel = channel;
                sourcesData[index].username = rtspUser;
                sourcesData[index].password = rtspPass;
                showToast("Source Updated", "success");
            }
        } else {
            const newId = 'src_' + Date.now();
            sourcesData.push({ 
                id: newId, type: type, name: name, ip: ip, group: groupVal, 
                channel: channel, username: rtspUser, password: rtspPass,
                status: 'online', thumb: 'https://picsum.photos/200/112', 
                resHeight: 1080, resolution: '1920x1080', presets: {} 
            });
            showToast("Source Added", "success");
        }
        closeModal(); 
        refreshSourceList(); 
        editingSourceId = null; 
    }
}

function showRebootWarning(targetMode) { pendingRebootMode = targetMode; document.getElementById('modal-reboot-warning').style.display = 'flex'; }
function executeReboot() { document.getElementById('modal-reboot-warning').style.display = 'none'; document.getElementById('modal-large-settings').style.display = 'none'; document.getElementById('reboot-overlay').style.display = 'flex'; setTimeout(() => { document.getElementById('reboot-overlay').style.display = 'none'; performSwitch(pendingRebootMode); pendingRebootMode = null; }, 2000); }
function performSwitch(mode) { currentSystemMode = mode; enterView(mode); }
function enterView(mode) { document.getElementById('app-shell').style.display = 'grid'; document.getElementById('view-encoder').style.display = (mode === 'encoder') ? 'flex' : 'none'; document.getElementById('view-decoder').style.display = (mode === 'decoder') ? 'block' : 'none'; document.getElementById('current-mode-badge').innerText = mode.charAt(0).toUpperCase() + mode.slice(1) + ' Mode'; document.documentElement.style.setProperty('--theme-color', mode === 'encoder' ? '#007AFF' : '#FF9500'); if(mode === 'decoder') { renderSourceList(); loadDefaultSource(); selectSlot('slot-1'); } }

let currentSearchDevices = [];
let selectedSearchIndex = -1;

function openAutoSearch() {
    const modal = document.getElementById('modal-auto-search');
    const list = document.getElementById('search-list-content');
    const titleEl = document.getElementById('auto-search-title');
    const doneBtn = document.getElementById('btn-done-search');
    
    selectedSearchIndex = -1;
    if (doneBtn) {
        doneBtn.disabled = true;
        doneBtn.style.background = '#333';
        doneBtn.style.color = '#777';
        doneBtn.style.cursor = 'not-allowed';
    }

    const isRTSP = (currentAddSourceTab === 'rtsp');
    if (titleEl) {
        titleEl.innerText = isRTSP ? 'Auto Search (RTSP)' : 'Auto Search';
    }

    const currentScope = document.getElementById('inputSrcGroup')?.value || "Public";
    
    list.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; height:100%; color:#aaa; font-size:14px; padding:40px 20px; box-sizing:border-box;">
        <div class="spinner-ring" style="margin-bottom:20px; width:40px; height:40px; border:4px solid rgba(255,149,0,0.1); border-top-color:#FF9500; border-radius:50%; animation: spin 1s linear infinite;"></div>
        <div style="color:#fff; font-weight:bold; margin-bottom:5px; font-size:16px;">Scanning...</div>
        <div style="font-size:12px; color:#888;">
            ${isRTSP ? 'Scanning for RTSP streams on the network...' : `Searching for NDI sources in ${currentScope}...`}
        </div>
    </div>
    <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
    `;
    
    modal.style.display = 'flex';

    setTimeout(() => {
        if (isRTSP) {
            currentSearchDevices = [
                { ip: '10.100.90.11', name: 'RTSP Stream31312312345343...', channel: 'RTSP Stream31312312345343...' },
                { ip: '10.100.90.12', name: 'AVer RTSP', channel: 'AVer RTSP' },
                { ip: '10.100.90.13', name: 'RTSP Name', channel: 'RTSP Name' }
            ];
        } else {
            currentSearchDevices = [
                { ip: '10.100.90.1', name: 'Device Channel31312312345343...', channel: 'Device Channel31312312345343...' },
                { ip: '10.100.90.2', name: 'AVer MT', channel: 'AVer MT' },
                { ip: '10.100.90.3', name: 'Name', channel: 'Name' }
            ];
        }

        const headerChannelName = isRTSP ? 'RTSP Stream' : 'Device Channel';

        let html = `
        <table style="width:100%; border-collapse:collapse; color:#eee; font-size:14px; text-align:left; table-layout: fixed;">
            <thead>
                <tr style="background:#181818; border-bottom:1px solid #333;">
                    <th style="padding:15px 10px 15px 20px; font-weight:normal; color:#888; width:15%; text-align:left;">Item</th>
                    <th style="padding:15px 10px; font-weight:normal; color:#888; width:55%;">${headerChannelName}</th>
                    <th style="padding:15px 20px 15px 10px; font-weight:normal; color:#888; width:30%;">IP Address</th>
                </tr>
            </thead>
            <tbody>
        `;

        currentSearchDevices.forEach((dev, idx) => {
            const itemNum = String(idx + 1).padStart(2, '0');
            const bgClass = idx % 2 === 0 ? '#242424' : '#181818';
            
            html += `
                <tr id="search-row-${idx}" style="background:${bgClass}; border-bottom:1px solid #333; cursor:pointer;" onclick="selectSearchDevice(${idx})">
                    <td style="padding:15px 10px 15px 20px; color:#aaa; text-align:left;">${itemNum}</td>
                    <td style="padding:15px 10px; color:#eee; font-weight:normal; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${dev.channel}">${dev.channel}</td>
                    <td style="padding:15px 20px 15px 10px; color:#eee; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${dev.ip}">${dev.ip}</td>
                </tr>
            `;
        });

        html += `
            </tbody>
        </table>
        `;
        list.innerHTML = html;
    }, 1200);
}

window.selectSearchDevice = function(idx) {
    selectedSearchIndex = idx;
    
    currentSearchDevices.forEach((dev, i) => {
        const row = document.getElementById(`search-row-${i}`);
        if (row) {
            if (i === idx) {
                row.style.background = '#4c4c4c';
            } else {
                row.style.background = (i % 2 === 0) ? '#242424' : '#181818';
            }
        }
    });

    const doneBtn = document.getElementById('btn-done-search');
    if (doneBtn) {
        doneBtn.disabled = false;
        doneBtn.style.background = '#4a4a4a';
        doneBtn.style.color = '#fff';
        doneBtn.style.cursor = 'pointer';
    }
};

function closeAutoSearch() { 
    document.getElementById('modal-auto-search').style.display = 'none'; 
}

function confirmAutoSearch() {
    if (selectedSearchIndex >= 0 && selectedSearchIndex < currentSearchDevices.length) {
        const dev = currentSearchDevices[selectedSearchIndex];
        
        const ipInput = document.getElementById('inputSrcIP');
        const nameInput = document.getElementById('inputSrcName');
        const channelInput = document.getElementById('inputSrcChannel');
        
        if (ipInput) ipInput.value = dev.ip;
        if (nameInput) nameInput.value = dev.name;
        if (channelInput) channelInput.value = dev.channel;
        
        closeAutoSearch();
        validateSourceForm();
    }
}
function renderSlotMenu(slotId) { return `<button class="slot-menu-btn" onclick="toggleSlotMenu('${slotId}', event)">•••</button><div class="slot-dropdown" id="menu-${slotId}"><button class="slot-action danger" onclick="removeSource('${slotId}')">Clear</button></div>`; }
function toggleSlotMenu(slotId, event) { event.stopPropagation(); document.querySelectorAll('.slot-dropdown').forEach(el => el.classList.remove('show')); const menu = document.getElementById(`menu-${slotId}`); if(menu) menu.classList.add('show'); }
function askRemoveSource(id) { sourceToRemoveId = id; document.getElementById('modal-remove-confirm').style.display = 'flex'; }
function confirmRemoveSource() { if(sourceToRemoveId) { removeSource(null, sourceToRemoveId); sourcesData = sourcesData.filter(s => s.id !== sourceToRemoveId); refreshSourceList(); showToast("Source Removed", "success"); document.getElementById('modal-remove-confirm').style.display = 'none'; sourceToRemoveId = null; if(document.getElementById('modal-large-settings').style.display !== 'none') switchSettingsTab('source'); } }
function cancelRemoveSource() { document.getElementById('modal-remove-confirm').style.display = 'none'; sourceToRemoveId = null; }
function removeSource(slotId, targetSourceId = null) { if (targetSourceId) { const slot = document.querySelector(`.preview-slot[data-source-id="${targetSourceId}"]`); if (slot) slotId = slot.id; else return; } const slot = document.getElementById(slotId); if(slot) { delete slot.dataset.sourceId; slot.classList.remove('active-slot', 'offline-state'); slot.innerHTML = `<div class="slot-label">Window ${slotId.split('-')[1]}</div><div class="slot-content" style="text-align:center;"><div class="slot-name" style="color:#555;">[ Drag Source Here ]</div></div>`; updateLiveHeader(); selectSlot(slotId); renderSourceList(); } }
function togglePTZ() { console.log("PTZ is embedded now"); }
function switchEncTab(tabName) { document.querySelectorAll('.enc-tab').forEach(t => t.classList.remove('active')); document.getElementById('enc-tab-video').style.display = 'none'; document.getElementById('enc-tab-audio').style.display = 'none'; event.target.classList.add('active'); document.getElementById('enc-tab-' + tabName).style.display = 'block'; }
function generateSourceTourOverlay() { const div = document.createElement('div'); div.id = 'source-tour-overlay'; div.className = 'modal-overlay'; div.style.display = 'none'; div.innerHTML = `<div class="onboarding-box"><span class="onboarding-close-x" onclick="closeSourceTour()">✕</span><div class="source-tour-step" id="tour-step-1" style="display:block;"><div class="onboarding-icon">➕</div><h2>1. Add a New Source</h2><p>Click the <strong>"+ Add Source"</strong> button to manually enter an IP address or use Auto Search to find NDI sources on your network.</p><div class="onboarding-actions"><button class="btn btn-primary" onclick="nextSourceTour(2)">Next</button></div></div><div class="source-tour-step" id="tour-step-2" style="display:none;"><div class="onboarding-icon">🖱️</div><h2>2. Manage Sources</h2><p>In <strong>Decoder Mode</strong>, simply drag and drop any source from the list on the right into the preview window to start monitoring.</p><div class="onboarding-actions"><button class="btn btn-outline" onclick="nextSourceTour(1)">Back</button><button class="btn btn-primary" onclick="nextSourceTour(3)">Next</button></div></div><div class="source-tour-step" id="tour-step-3" style="display:none;"><div class="onboarding-icon">🔄</div><h2>3. Switch Modes</h2><p>Need to transmit? Go to the <strong>"Video & Audio"</strong> tab in Settings to switch this device to <strong>Encoder Mode</strong>.</p><div class="onboarding-actions"><button class="btn btn-outline" onclick="nextSourceTour(2)">Back</button><button class="btn btn-primary" onclick="closeSourceTour()">Finish</button></div></div></div>`; document.body.appendChild(div); }
function startSourceTour() { document.getElementById('source-tour-overlay').style.display = 'flex'; nextSourceTour(1); }
function nextSourceTour(step) { document.querySelectorAll('.source-tour-step').forEach(el => el.style.display = 'none'); document.getElementById('tour-step-' + step).style.display = 'block'; }
function closeSourceTour() { document.getElementById('source-tour-overlay').style.display = 'none'; }

window.toggleNetworkDHCP = function() {
    const dhcp = document.getElementById('network-dhcp').checked;
    const ip = document.getElementById('network-ip');
    const netmask = document.getElementById('network-netmask');
    const gateway = document.getElementById('network-gateway');
    const dns = document.getElementById('network-dns');
    
    if (ip && netmask && gateway && dns) {
        ip.readOnly = dhcp;
        netmask.readOnly = dhcp;
        gateway.readOnly = dhcp;
        dns.readOnly = dhcp;
    }
};

window.saveNetworkSettings = function() {
    const dhcp = document.getElementById('network-dhcp');
    const hostname = document.getElementById('network-hostname');
    const ip = document.getElementById('network-ip');
    const netmask = document.getElementById('network-netmask');
    const gateway = document.getElementById('network-gateway');
    const dns = document.getElementById('network-dns');
    
    if (dhcp) networkConfig.dhcp = dhcp.checked;
    if (hostname) networkConfig.hostname = hostname.value;
    if (ip) networkConfig.ip = ip.value;
    if (netmask) networkConfig.netmask = netmask.value;
    if (gateway) networkConfig.gateway = gateway.value;
    if (dns) networkConfig.dns = dns.value;
    
    showToast("Settings saved successfully", "success");
};

window.toggleNdiAdvFields = function() {
    const ds = document.getElementById('ndi-discoveryServer').checked;
    const dsIp = document.getElementById('ndi-discoveryServerIp');
    
    if (dsIp) {
        dsIp.readOnly = !ds;
    }
    
    const mc = document.getElementById('ndi-multicast').checked;
    const mcIp = document.getElementById('ndi-multicastIp');
    const mcMask = document.getElementById('ndi-multicastMask');
    const mcTtl = document.getElementById('ndi-multicastTtl');
    
    if (mcIp && mcMask && mcTtl) {
        mcIp.readOnly = !mc;
        mcMask.readOnly = !mc;
        mcTtl.disabled = !mc;
    }
};

window.saveNdiSettings = function() {
    const localName = document.getElementById('ndi-localName');
    const groupName = document.getElementById('ndi-groupName');
    const reliableUdp = document.getElementById('ndi-reliableUdp');
    const connectionMode = document.getElementById('ndi-connectionMode');
    const discoveryServer = document.getElementById('ndi-discoveryServer');
    const discoveryServerIp = document.getElementById('ndi-discoveryServerIp');
    const multicast = document.getElementById('ndi-multicast');
    const multicastIp = document.getElementById('ndi-multicastIp');
    const multicastMask = document.getElementById('ndi-multicastMask');
    const multicastTtl = document.getElementById('ndi-multicastTtl');
    
    if (localName) ndiConfig.localName = localName.value;
    if (groupName) ndiConfig.groupName = groupName.value;
    if (reliableUdp) ndiConfig.reliableUdp = reliableUdp.checked;
    if (connectionMode) ndiConfig.connectionMode = connectionMode.value;
    if (discoveryServer) ndiConfig.discoveryServer = discoveryServer.checked;
    if (discoveryServerIp) ndiConfig.discoveryServerIp = discoveryServerIp.value;
    if (multicast) ndiConfig.multicast = multicast.checked;
    if (multicastIp) ndiConfig.multicastIp = multicastIp.value;
    if (multicastMask) ndiConfig.multicastMask = multicastMask.value;
    if (multicastTtl) ndiConfig.multicastTtl = parseInt(multicastTtl.value);
    
    showToast("NDI settings saved successfully", "success");
};

window.triggerFirmwareChoose = function() {
    const input = document.getElementById('firmware-file-input');
    if (input) input.click();
};

window.onFirmwareFileSelected = function(event) {
    const file = event.target.files[0];
    const status = document.getElementById('firmware-file-status');
    const upgradeBtn = document.getElementById('btn-upgrade-fw');
    if (file && status && upgradeBtn) {
        status.innerText = file.name;
        upgradeBtn.disabled = false;
        upgradeBtn.style.background = '#4a4a4a';
        upgradeBtn.style.color = '#fff';
        upgradeBtn.style.cursor = 'pointer';
    }
};

window.startFirmwareUpgrade = function() {
    const upgradeBtn = document.getElementById('btn-upgrade-fw');
    if (upgradeBtn && upgradeBtn.disabled) return;
    
    showToast("Uploading and verifying firmware...", "info");
    if (upgradeBtn) {
        upgradeBtn.disabled = true;
        upgradeBtn.innerText = "Upgrading...";
        upgradeBtn.style.background = '#2a2a2a';
        upgradeBtn.style.color = '#666';
        upgradeBtn.style.cursor = 'not-allowed';
    }
    setTimeout(() => {
        showToast("Firmware upgraded successfully. System rebooting...", "success");
        setTimeout(() => {
            location.reload();
        }, 1500);
    }, 3000);
};

window.changeAccount = function(type) {
    const user = document.getElementById(`system-${type}-user`)?.value.trim() || '';
    const pass = document.getElementById(`system-${type}-pass`)?.value.trim() || '';
    
    if (!user || !pass) {
        showToast("Username and password cannot be empty", "error");
        return;
    }
    
    if (type === 'admin') {
        systemConfig.adminUser = user;
        systemConfig.adminPass = pass;
    } else {
        systemConfig.userUser = user;
        systemConfig.userPass = pass;
    }
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} account updated`, "success");
};

window.changeLanguage = function() {
    const lang = document.getElementById('system-language')?.value || 'English';
    systemConfig.language = lang;
    showToast(`Language changed to ${lang}`, "success");
};

window.toggleAnonymousCheckbox = function() {
    const chk = document.getElementById('system-allow-anonymous')?.checked || false;
    systemConfig.allowAnonymous = chk;
    showToast(`Usage data sharing ${chk ? 'enabled' : 'disabled'}`, "success");
};

window.updateDecSliderVal = function(type, val) {
    if (type === 'vop') {
        const box = document.getElementById('vop-val-box');
        if (box) box.innerText = `${val}S`;
    } else if (type === 'vol') {
        const box = document.getElementById('vol-val-box');
        if (box) box.innerText = val;
        const slider = document.getElementById('dec-volume');
        if (slider) slider.value = val;
    } else if (type === 'delay') {
        const box = document.getElementById('delay-val-box');
        if (box) box.innerText = val;
    }
};

window.adjustDecSliderVal = function(type, delta) {
    if (type === 'vol') {
        const slider = document.getElementById('dec-volume');
        if (slider) {
            let newVal = parseInt(slider.value) + delta;
            if (newVal >= 1 && newVal <= 10) {
                slider.value = newVal;
                window.updateDecSliderVal('vol', newVal);
            }
        }
    }
};

window.updateDecAudioSourceLinkage = function() {
    const src = document.getElementById('dec-audioSource')?.value || 'NDI';
    const analog = document.getElementById('dec-audioAnalog');
    if (analog) {
        if (src === 'NDI') {
            analog.disabled = true;
        } else {
            analog.disabled = false;
        }
    }
};

window.saveDecSettings = function() {
    const maxInputRes = document.getElementById('dec-maxInputRes');
    const videoOutputRes = document.getElementById('dec-videoOutputRes');
    const framerate = document.getElementById('dec-framerate');
    const bitrate = document.getElementById('dec-bitrate');
    const rateControl = document.getElementById('dec-rateControl');
    const vopInterval = document.getElementById('dec-vopInterval');
    const audioSource = document.getElementById('dec-audioSource');
    const audioAnalog = document.getElementById('dec-audioAnalog');
    const volume = document.getElementById('dec-volume');
    const audioDelay = document.getElementById('dec-audioDelay');
    
    if (maxInputRes) decoderSettings.maxInputRes = maxInputRes.value;
    if (videoOutputRes) decoderSettings.videoOutputRes = videoOutputRes.value;
    if (framerate) decoderSettings.framerate = framerate.value;
    if (bitrate) decoderSettings.bitrate = bitrate.value;
    if (rateControl) decoderSettings.rateControl = rateControl.value;
    if (vopInterval) decoderSettings.vopInterval = parseInt(vopInterval.value);
    if (audioSource) decoderSettings.audioInputSource = audioSource.value;
    if (audioAnalog) decoderSettings.audioAnalog = audioAnalog.value;
    if (volume) decoderSettings.audioVolume = parseInt(volume.value);
    if (audioDelay) decoderSettings.audioDelay = parseInt(audioDelay.value);
    
    showToast("Decoder settings saved successfully", "success");
};

window.downloadDebugFiles = function() {
    showToast("Generating debug logs...", "info");
    setTimeout(() => {
        const text = `NC30 Debug Logs\n====================\nTimestamp: ${new Date().toISOString()}\nModel: NC30\nFirmware: 0.1.0003.60\nIP: 10.100.105.25\nStatus: Running\nNo errors detected.`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NC30_debug_logs_${Math.floor(Date.now() / 1000)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Debug files saved successfully", "success");
    }, 1000);
};

window.importSettings = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.bin,.txt';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        showToast("Uploading configuration file...", "info");
        setTimeout(() => {
            showToast("Settings imported successfully. System rebooting...", "success");
            setTimeout(() => {
                location.reload();
            }, 1500);
        }, 1500);
    };
    input.click();
};

window.exportSettings = function() {
    showToast("Generating configuration file...", "info");
    setTimeout(() => {
        const config = {
            version: "NC30_V1.0",
            timestamp: new Date().toISOString(),
            systemConfig: typeof systemConfig !== 'undefined' ? systemConfig : {},
            decoderSettings: typeof decoderSettings !== 'undefined' ? decoderSettings : {},
            encoderSettings: typeof encoderSettings !== 'undefined' ? encoderSettings : {}
        };
        const blob = new Blob([JSON.stringify(config, null, 4)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NC30_config_${Math.floor(Date.now() / 1000)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Settings exported successfully", "success");
    }, 1000);
};

window.updateEncSliderVal = function(val) {
    const box = document.getElementById('enc-vop-val-box');
    if (box) box.innerText = `${val}S`;
};

window.updateEncAudioSourceLinkage = function() {
    const srcEl = document.getElementById('enc-audioSource');
    const analogEl = document.getElementById('enc-audioAnalog');
    if (srcEl && analogEl) {
        if (srcEl.value === 'HDMI') {
            analogEl.disabled = true;
            analogEl.style.background = 'transparent';
            analogEl.style.color = '#555';
            analogEl.style.borderColor = '#222';
            analogEl.style.cursor = 'not-allowed';
        } else {
            analogEl.disabled = false;
            analogEl.style.background = '#0e0e0e';
            analogEl.style.color = '#fff';
            analogEl.style.borderColor = '#333';
            analogEl.style.cursor = 'pointer';
        }
    }
};

window.updateEncAudioSliderVal = function(type, val) {
    if (type === 'vol') {
        const box = document.getElementById('enc-vol-val-box');
        if (box) box.innerText = val;
    } else if (type === 'delay') {
        const box = document.getElementById('enc-delay-val-box');
        if (box) box.innerText = val;
    }
};

window.adjustEncSliderVal = function(type, step) {
    if (type === 'vol') {
        const input = document.getElementById('enc-volume');
        if (input) {
            let val = parseInt(input.value) + step;
            if (val >= 1 && val <= 10) {
                input.value = val;
                updateEncAudioSliderVal('vol', val);
            }
        }
    }
};

window.saveEncSettings = function() {
    const streamOutputRes = document.getElementById('enc-streamOutputRes');
    const framerate = document.getElementById('enc-framerate');
    const ndiHxVersion = document.getElementById('enc-ndiHxVersion');
    const bitrate = document.getElementById('enc-bitrate');
    const rateControl = document.getElementById('enc-rateControl');
    const encodingType = document.getElementById('enc-encodingType');
    const vopInterval = document.getElementById('enc-vopInterval');
    const audioSource = document.getElementById('enc-audioSource');
    const audioAnalog = document.getElementById('enc-audioAnalog');
    const audioVolume = document.getElementById('enc-volume');
    const audioDelay = document.getElementById('enc-audioDelay');
    
    if (streamOutputRes) encoderSettings.streamOutputRes = streamOutputRes.value;
    if (framerate) encoderSettings.framerate = framerate.value;
    if (ndiHxVersion) encoderSettings.ndiHxVersion = ndiHxVersion.value;
    if (bitrate) encoderSettings.bitrate = bitrate.value;
    if (rateControl) encoderSettings.rateControl = rateControl.value;
    if (encodingType) encoderSettings.encodingType = encodingType.value;
    if (vopInterval) encoderSettings.vopInterval = parseInt(vopInterval.value);
    if (audioSource) encoderSettings.audioInputSource = audioSource.value;
    if (audioAnalog) encoderSettings.audioAnalog = audioAnalog.value;
    if (audioVolume) encoderSettings.audioVolume = parseInt(audioVolume.value);
    if (audioDelay) encoderSettings.audioDelay = parseInt(audioDelay.value);
    
    showToast("Encoder settings saved successfully", "success");
};
