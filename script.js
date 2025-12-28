/* script.js - Final Demo Version (V70 - Source Tour & Default Decoder) */

let currentSystemMode = null; 
let currentUserRole = 'admin'; 
let currentOutputMode = 'Single'; 
let maxDecResolution = 2160; 
let ndiSearchGroups = ['Public', 'Studio A', 'Conference Room']; 

// Initial Data
let sourcesData = [
    { 
        id: 'src_01', name: 'Main Camera 01', ip: '192.168.1.101', group: 'Studio A', remark: 'Main stage view', status: 'online', thumb: 'https://picsum.photos/id/64/100/56',
        resHeight: 2160, resolution: '3840x2160',
        presets: { 1: 'https://picsum.photos/id/65/160/90', 2: 'https://picsum.photos/id/66/160/90' }
    },
    { 
        id: 'src_02', name: 'PTZ Camera 02', ip: '192.168.1.102', group: 'Studio B', remark: '', status: 'online', thumb: 'https://picsum.photos/id/1/100/56',
        resHeight: 1080, resolution: '1920x1080',
        presets: { 1: 'https://picsum.photos/id/2/160/90' }
    },
    { 
        id: 'src_03', name: 'OBS Output', ip: '192.168.1.120', group: 'OBS', remark: 'Direct feed', status: 'error', 
        errorMsg: 'Input Resolution Not Supported',
        thumb: 'https://picsum.photos/id/48/100/56', resHeight: 1080, resolution: '1920x1080', presets: {} 
    },
    { id: 'src_04', name: 'Outdoor Cam', ip: '192.168.1.104', group: 'Outdoor', remark: '', status: 'offline', thumb: '', resHeight: 720, resolution: '1280x720', presets: {} }
];

let editingSourceId = null;
let selectedAutoSearchIp = null;
let sourceToRemoveId = null;
let pendingRebootMode = null; 
let presetHoverTimer = null; 
let onboardingSelectedMode = null;

document.addEventListener('DOMContentLoaded', () => {
    // Generate Source Tour Overlay on load (Hidden)
    generateSourceTourOverlay();
    
    if(document.getElementById('view-decoder').style.display !== 'none' || document.getElementById('view-encoder').style.display !== 'none') {
        renderSourceList();
        updateLiveHeader();
    }
});

// Close Combobox when clicking outside
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

// === Login Logic (Default Decoder) ===
function doLogin() {
    const btn = document.querySelector('#page-login .btn-primary');
    btn.innerHTML = "Logging in...";
    setTimeout(() => { 
        document.getElementById('page-login').style.display = 'none'; 
        const hasOnboarded = localStorage.getItem('nc30_onboarding_v70');
        if (!hasOnboarded) {
            startOnboarding();
        } else {
            performSwitch('decoder');
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
    localStorage.setItem('nc30_onboarding_v70', 'true');
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

// === Source Setup Tour (New) ===
function generateSourceTourOverlay() {
    const div = document.createElement('div');
    div.id = 'source-tour-overlay';
    div.className = 'modal-overlay';
    div.style.display = 'none';
    div.innerHTML = `
        <div class="onboarding-box">
            <span class="onboarding-close-x" onclick="closeSourceTour()">✕</span>
            
            <div class="source-tour-step" id="tour-step-1" style="display:block;">
                <div class="onboarding-icon">➕</div>
                <h2>1. Add a New Source</h2>
                <p>Click the <strong>"+ Add Source"</strong> button to manually enter an IP address or use Auto Search to find NDI sources on your network.</p>
                <div class="onboarding-actions"><button class="btn btn-primary" onclick="nextSourceTour(2)">Next</button></div>
            </div>

            <div class="source-tour-step" id="tour-step-2" style="display:none;">
                <div class="onboarding-icon">🖱️</div>
                <h2>2. Manage Sources</h2>
                <p>In <strong>Decoder Mode</strong>, simply drag and drop any source from the list on the right into the preview window to start monitoring.</p>
                <div class="onboarding-actions"><button class="btn btn-outline" onclick="nextSourceTour(1)">Back</button><button class="btn btn-primary" onclick="nextSourceTour(3)">Next</button></div>
            </div>

            <div class="source-tour-step" id="tour-step-3" style="display:none;">
                <div class="onboarding-icon">🔄</div>
                <h2>3. Switch Modes</h2>
                <p>Need to transmit? Go to the <strong>"Video & Audio"</strong> tab in Settings to switch this device to <strong>Encoder Mode</strong>.</p>
                <div class="onboarding-actions"><button class="btn btn-outline" onclick="nextSourceTour(2)">Back</button><button class="btn btn-primary" onclick="closeSourceTour()">Finish</button></div>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

function startSourceTour() {
    document.getElementById('source-tour-overlay').style.display = 'flex';
    nextSourceTour(1);
}

function nextSourceTour(step) {
    document.querySelectorAll('.source-tour-step').forEach(el => el.style.display = 'none');
    document.getElementById('tour-step-' + step).style.display = 'block';
}

function closeSourceTour() {
    document.getElementById('source-tour-overlay').style.display = 'none';
}

// === Account Functions ===
function toggleAccountMenu() { document.getElementById('accountMenu').classList.toggle('show'); }
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
}

function clearSlot(slot) {
    delete slot.dataset.sourceId;
    slot.classList.remove('active-slot', 'offline-state');
    const windowNum = slot.id.split('-')[1];
    slot.innerHTML = `<div class="slot-label">Window ${windowNum}</div><div class="slot-content" style="text-align:center;"><div class="slot-name" style="color:#555;">[ Drag Source Here ]</div></div>`;
    selectSlot(slot.id);
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
        if(listContainer) listContainer.innerHTML = `<table class="source-list-table" id="right-panel-table"><thead class="source-list-header"><tr><th style="width:40px;"></th><th>Source Name</th><th style="width:50px; text-align:right;">Act</th></tr></thead><tbody id="source-list-body"></tbody></table>`;
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
    const info = document.getElementById('ptz-target-info');
    let text = ""; let color = "";
    if(sourceName) { text = `Target: ${sourceName}`; color = "#007AFF"; } else { text = `Target: Unavailable`; color = "#D32F2F"; }
    if(info) { info.innerText = text; info.style.color = color; }
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
    tbody.innerHTML = '';
    sourcesData.forEach(src => {
        const tr = document.createElement('tr');
        const isUnsupported = src.resHeight > maxDecResolution;
        tr.className = `source-row ${src.status === 'offline' ? 'offline' : ''}`;
        tr.draggable = !isUnsupported;
        tr.ondragstart = (event) => { event.dataTransfer.setData("application/json", JSON.stringify(src)); };
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
    if (tab === 'source' && currentSystemMode === 'encoder') tab = 'av-settings';
    document.getElementById('modal-large-settings').style.display = 'flex'; 
    switchSettingsTab(tab); 
    if(autoAdd && tab === 'source') { setTimeout(() => showModal('Add Manual Source'), 300); } 
}

function switchSettingsTab(tabId) {
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    
    const bodyEl = document.getElementById('settings-body-content');
    const titleEl = document.getElementById('settings-title');
    let htmlContent = '';
    
    // === 1. Source Management ===
    if(tabId === 'source') {
        // Inject "Quick Setup Tour" button here
        titleEl.innerHTML = 'Source Management <span class="settings-help-icon" onclick="startSourceTour()">🎓 Quick Setup Tour</span>';
        
        if (currentSystemMode === 'encoder') {
            bodyEl.innerHTML = `<div style="background:#332b00; border:1px solid #d4b106; color:#ffeeba; padding:10px; border-radius:4px;">⚠️ Source management is only available in <a href="#" onclick="switchSettingsTab('av-settings')" style="color:#FF9500; font-weight:bold;">Decoder Mode</a>.</div>`;
        } else {
             bodyEl.innerHTML = `<div style="display:flex; justify-content:flex-end; margin-bottom:20px;"><button class="btn btn-primary" onclick="showModal('Add Manual Source')">+ Add Source</button></div>
             <table class="source-list-table"><thead class="source-list-header"><tr><th>Preview</th><th>Name & IP</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead>
             <tbody>${sourcesData.map(s => `<tr><td style="padding:10px;"><div class="thumb-box"><img src="${s.thumb}"></div></td><td style="padding:10px;"><div style="color:#fff;">${s.name}</div><div style="font-size:12px;color:#888;">${s.ip}</div></td><td style="padding:10px;color:${s.status==='online'?'#4CAF50':'#888'}">${s.status.toUpperCase()}</td><td style="text-align:right;padding:10px;"><button class="btn btn-outline btn-sm">Edit</button> <button class="btn btn-danger btn-sm">Delete</button></td></tr>`).join('')}</tbody></table>`;
        }
    } 
    // === 2. AV Settings ===
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
    // === 3. Network ===
    else if (tabId === 'network') { 
        titleEl.innerText = "Network Settings"; 
        bodyEl.innerHTML = `<div class="settings-subsection"><div class="settings-group-title">IP Configuration</div><div class="form-group"><div style="display:flex; justify-content:space-between;"><label class="form-label">DHCP</label><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div></div><div class="form-group"><label class="form-label">Hostname</label><input type="text" class="form-input" value="Hostname" readonly></div><div class="form-group"><label class="form-label">IP Address</label><input type="text" class="form-input darker-input" value="10.100.10.10" readonly></div><div class="form-group"><label class="form-label">Netmask</label><input type="text" class="form-input darker-input" value="255.255.255.0" readonly></div><div class="form-group"><label class="form-label">Gateway</label><input type="text" class="form-input darker-input" value="10.100.10.254" readonly></div><div class="form-group"><label class="form-label">DNS</label><input type="text" class="form-input darker-input" value="10.100.10.10" readonly></div></div><div class="settings-subsection"><div class="settings-group-title">NDI Settings</div><div class="form-group"><label class="form-label">Local Device Name</label><input type="text" class="form-input" value="AVer NC30"></div><div class="form-group"><label class="form-label">Group Name</label><input type="text" class="form-input" value="Public"></div><div class="form-group"><label class="radio-custom"><input type="checkbox"> Reliable UDP</label></div></div><div class="settings-subsection"><div class="settings-group-title">Advanced NDI</div><div class="form-group"><label class="form-label">Connection Mode</label><select class="form-select"><option>RUDP</option><option>TCP</option></select></div><div class="form-group"><label class="form-label">Discovery Server</label><label class="radio-custom"><input type="checkbox"> Discovery Server</label></div><div class="form-group"><label class="form-label">Discovery Server Address</label><input type="text" class="form-input" value="10.10.10.100"></div><div class="form-group"><div class="settings-group-title">Multicast</div><label class="radio-custom"><input type="checkbox"> Multicast Server</label></div><div class="form-group"><label class="form-label">Multicast Server Address</label><input type="text" class="form-input" value="10.10.10.100"></div><div class="form-group"><label class="form-label">Multicast Server Mask</label><select class="form-select"><option>255.255.255.0</option></select></div><div class="form-group"><label class="form-label">Multicast TL</label><select class="form-select"><option>10</option></select></div><div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;"><button class="btn btn-outline">Cancel</button><button class="btn btn-primary">Confirm</button></div></div>`; 
    } 
    // === 4. System ===
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

function renderSourceModal(t,n,i,g){
    const container = document.getElementById('modalContentBox');
    const groupValue = g || (ndiSearchGroups.length > 0 ? ndiSearchGroups[0] : '');
    
    container.innerHTML=`<div class="modal-header-row"><h3 style="margin:0;color:#fff;">${t}</h3><span class="modal-close-x" onclick="closeModal()">✕</span></div><div class="modal-body-add-source">
    
    <div class="form-group"><label class="form-label">Search Scope (NDI Group)</label>
        <div class="combobox-container">
            <input type="text" id="inputSrcGroup" class="form-input" value="${groupValue}" readonly placeholder="Select or create group..." onclick="toggleCombobox(event)">
            <div class="btn-combo-toggle" onclick="toggleCombobox(event)">▼</div>
            <div class="combobox-dropdown" id="group-dropdown">
                ${ndiSearchGroups.map(grp => `<div class="combobox-item" onclick="selectComboboxItem('${grp}')">${grp}</div>`).join('')}
                <div class="combobox-footer" onclick="openAddGroupModal()">+ Create new</div>
            </div>
        </div>
    </div>
    
    <div class="form-group"><label class="form-label">Source Name</label><input type="text" id="inputSrcName" class="form-input" value="${n}"></div>
    <div class="form-group"><label class="form-label">IP Address</label><div style="display:flex; gap:10px;"><input type="text" id="inputSrcIP" class="form-input" value="${i}"><button class="btn btn-outline" style="padding:0 12px;" onclick="openAutoSearch()">🔍</button></div></div>
    <div class="form-group"><label class="form-label">Remark</label><textarea id="inputSrcRemark" class="form-input remark-input" placeholder="Optional notes..."></textarea></div>
    
    </div><div class="modal-footer"><button class="modal-footer-btn" onclick="closeModal()">Cancel</button><button class="modal-footer-btn" onclick="saveSourceData()">Save</button></div>
    
    <div id="modal-add-group" class="modal-overlay" style="display:none; z-index:3200;" onclick="if(event.target===this) closeAddGroupModal()">
        <div class="modal-box" style="width:300px;">
            <h3 style="color:#fff; margin-bottom:15px;">Create New Group</h3>
            <input type="text" id="new-group-name" class="form-input" placeholder="Enter group name...">
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                <button class="btn btn-outline" onclick="closeAddGroupModal()">Cancel</button>
                <button class="btn btn-primary" onclick="confirmAddGroup()">Create</button>
            </div>
        </div>
    </div>
    `;
    document.getElementById('modalOverlay').style.display='flex';
}

function toggleCombobox(e) {
    e.stopPropagation();
    document.getElementById('group-dropdown').classList.toggle('show');
}

function selectComboboxItem(val) {
    document.getElementById('inputSrcGroup').value = val;
    document.getElementById('group-dropdown').classList.remove('show');
}

// Group Modal Functions
function openAddGroupModal() {
    document.getElementById('group-dropdown').classList.remove('show');
    document.getElementById('modal-add-group').style.display = 'flex';
    document.getElementById('new-group-name').value = '';
    document.getElementById('new-group-name').focus();
}

function closeAddGroupModal() {
    document.getElementById('modal-add-group').style.display = 'none';
}

function confirmAddGroup() {
    const newName = document.getElementById('new-group-name').value.trim();
    if(newName) {
        if(!ndiSearchGroups.includes(newName)) {
            ndiSearchGroups.push(newName);
        }
        document.getElementById('inputSrcGroup').value = newName;
        const dropdown = document.getElementById('group-dropdown');
        dropdown.innerHTML = ndiSearchGroups.map(grp => `<div class="combobox-item" onclick="selectComboboxItem('${grp}')">${grp}</div>`).join('') + 
                             `<div class="combobox-footer" onclick="openAddGroupModal()">+ Create new</div>`;
    }
    closeAddGroupModal();
}

function saveSourceData() { 
    const groupVal = document.getElementById('inputSrcGroup').value;
    const remarkVal = document.getElementById('inputSrcRemark').value;
    const name = document.getElementById('inputSrcName').value;
    const ip = document.getElementById('inputSrcIP').value;

    if(groupVal && !ndiSearchGroups.includes(groupVal)) ndiSearchGroups.push(groupVal);
    
    if(name && ip) {
        const newId = 'src_' + Date.now();
        sourcesData.push({ id: newId, name: name, ip: ip, group: groupVal, remark: remarkVal, status: 'online', thumb: 'https://picsum.photos/200/112', resHeight: 1080, resolution: '1920x1080', presets: {} });
    }

    showToast("Source Added", "success"); closeModal(); refreshSourceList(); 
}

function showRebootWarning(targetMode) { pendingRebootMode = targetMode; document.getElementById('modal-reboot-warning').style.display = 'flex'; }
function executeReboot() { document.getElementById('modal-reboot-warning').style.display = 'none'; document.getElementById('modal-large-settings').style.display = 'none'; document.getElementById('reboot-overlay').style.display = 'flex'; setTimeout(() => { document.getElementById('reboot-overlay').style.display = 'none'; performSwitch(pendingRebootMode); pendingRebootMode = null; }, 2000); }
function performSwitch(mode) { currentSystemMode = mode; enterView(mode); }
function enterView(mode) { document.getElementById('app-shell').style.display = 'grid'; document.getElementById('view-encoder').style.display = (mode === 'encoder') ? 'block' : 'none'; document.getElementById('view-decoder').style.display = (mode === 'decoder') ? 'block' : 'none'; document.getElementById('current-mode-badge').innerText = mode.toUpperCase() + ' MODE'; document.documentElement.style.setProperty('--theme-color', mode === 'encoder' ? '#007AFF' : '#FF9500'); if(mode === 'decoder') { renderSourceList(); loadDefaultSource(); selectSlot('slot-1'); } }

function openAutoSearch() {
    const modal = document.getElementById('modal-auto-search');
    const list = document.getElementById('search-list-content');
    const currentScope = document.getElementById('inputSrcGroup').value || "Public";
    
    list.innerHTML = `
        <div style="padding:15px; border-bottom:1px solid #333; text-align:center;">
            <div style="color:#fff; font-weight:bold; margin-bottom:5px;">Scanning Scope: <span style="color:#007AFF">${currentScope}</span></div>
            <div style="color:#888; font-size:12px;">Searching for NDI sources in ${currentScope}...</div>
        </div>
        <div id="found-devices-list" style="margin-top:10px;">
            <div style="color:#888; text-align:center; padding:20px;">
                <div class="spinner-ring" style="margin:0 auto 10px auto;"></div>
                Scanning...
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    
    setTimeout(() => {
        const container = document.getElementById('found-devices-list');
        if(container) {
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
                    document.getElementById('inputSrcIP').value = d.ip;
                    document.getElementById('inputSrcName').value = d.name;
                    closeAutoSearch();
                }; 
                container.appendChild(el); 
            });
        }
    }, 1000);
}

function closeAutoSearch() { document.getElementById('modal-auto-search').style.display = 'none'; }
function confirmAutoSearch() { if(selectedAutoSearchIp) { document.getElementById('inputSrcIP').value = selectedAutoSearchIp; checkModalValidity(); closeAutoSearch(); } else { showToast("Please select an IP first", "error"); } }
function checkModalValidity(){const n=document.getElementById('inputSrcName').value.trim();const i=document.getElementById('inputSrcIP').value.trim();document.getElementById('btnSaveSource').disabled=!(n&&i)}
function renderSlotMenu(slotId) { return `<button class="slot-menu-btn" onclick="toggleSlotMenu('${slotId}', event)">•••</button><div class="slot-dropdown" id="menu-${slotId}"><button class="slot-action danger" onclick="removeSource('${slotId}')">Clear</button></div>`; }
function toggleSlotMenu(slotId, event) { event.stopPropagation(); document.querySelectorAll('.slot-dropdown').forEach(el => el.classList.remove('show')); const menu = document.getElementById(`menu-${slotId}`); if(menu) menu.classList.add('show'); }
function removeSource(slotId, targetSourceId = null) { if (targetSourceId) { const slot = document.querySelector(`.preview-slot[data-source-id="${targetSourceId}"]`); if (slot) slotId = slot.id; else return; } const slot = document.getElementById(slotId); if(slot) { delete slot.dataset.sourceId; slot.classList.remove('active-slot', 'offline-state'); slot.innerHTML = `<div class="slot-label">Window ${slotId.split('-')[1]}</div><div class="slot-content" style="text-align:center;"><div class="slot-name" style="color:#555;">[ Drag Source Here ]</div></div>`; updateLiveHeader(); selectSlot(slotId); renderSourceList(); } }
function togglePTZ() { console.log("PTZ is embedded now"); }
function switchEncTab(tabName) { document.querySelectorAll('.enc-tab').forEach(t => t.classList.remove('active')); document.getElementById('enc-tab-video').style.display = 'none'; document.getElementById('enc-tab-audio').style.display = 'none'; event.target.classList.add('active'); document.getElementById('enc-tab-' + tabName).style.display = 'block'; }
