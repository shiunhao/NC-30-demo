/* script.js - Final Demo Version (V62 - Golden Fix) */

let currentSystemMode = null; 
let currentUserRole = 'admin'; 
let currentOutputMode = 'Single'; 
let maxDecResolution = 2160; 

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
        const hasOnboarded = localStorage.getItem('nc30_onboarding_v62');
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
    localStorage.setItem('nc30_onboarding_v62', 'true');
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

// FIX: Always render 9 buttons.
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
            btn.disabled = true; // Visibly disabled via CSS
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
        
        // FIX: Drag & Drop (USE JSON)
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

// === Drag and Drop Functions ===
function allowDrop(ev) {
    ev.preventDefault();
}

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
             bodyEl.innerHTML = `<button class="btn btn-primary" onclick="showModal('Add Manual Source')">+ Add Source</button>`;
        }
    } else if(tabId === 'av-settings') {
        titleEl.innerText = "Video & Audio";
        // Encoder Specific
        if (currentSystemMode === 'encoder') {
            htmlContent = `
                <div class="settings-subsection"><div class="settings-group-title">Operation Mode</div>
                    <div class="mode-switch-container"><div class="mode-switch-btn active">Encoder</div><div class="mode-switch-btn" onclick="showRebootWarning('decoder')">Decoder</div></div>
                </div>
                <div class="settings-subsection"><div class="settings-group-title">Video Settings (ENCODER)</div>
                    <div class="form-group"><label class="form-label">Video Source</label><input type="text" class="form-input darker-input" value="HDMI (Auto)" readonly></div>
                    <div class="form-group"><label class="form-label">Resolution</label><select class="form-select"><option>3840x2160</option><option>1920x1080</option></select></div>
                </div>`;
        } else {
            htmlContent = `
                <div class="settings-subsection"><div class="settings-group-title">Operation Mode</div>
                    <div class="mode-switch-container"><div class="mode-switch-btn" onclick="showRebootWarning('encoder')">Encoder</div><div class="mode-switch-btn active">Decoder</div></div>
                </div>
                <div class="settings-subsection"><div class="settings-group-title">Video Settings (DECODER)</div>
                    <div class="form-group"><label class="form-label">Max Input</label><select class="form-select"><option>2160p60</option><option>1080p60</option></select></div>
                    <div class="form-group"><label class="form-label">Output Res</label><select class="form-select"><option>3840x2160</option><option>1920x1080</option></select></div>
                </div>`;
        }
        bodyEl.innerHTML = htmlContent;
    } 
    // === RESTORED SECTIONS ===
    else if (tabId === 'network') { 
        titleEl.innerText = "Network Settings"; 
        bodyEl.innerHTML = `<div class="settings-subsection"><div class="settings-group-title">IP Configuration</div><div class="form-group"><label class="form-label">Mode</label><select class="form-select"><option>DHCP</option><option>Static IP</option></select></div><div class="form-group"><label class="form-label">IP Address</label><input type="text" class="form-input" value="192.168.1.100"></div></div><div class="settings-subsection" style="margin-top:30px; border-top:1px solid #333; padding-top:20px;"><div class="settings-group-title">Advanced NDI</div><div class="form-group"><label class="form-label">Connection Mode</label><select class="form-select"><option>Auto (RUDP)</option><option>TCP</option></select></div></div>`; 
    }
    else if (tabId === 'system') { 
        titleEl.innerText = "System Settings"; 
        bodyEl.innerHTML = `<div class="settings-subsection"><div class="settings-group-title">General</div><div class="form-group"><label class="form-label">Device Name</label><input type="text" class="form-input" value="AVer NC30"></div></div><div class="settings-subsection" style="margin-top:30px; border-top:1px solid #333; padding-top:20px;"><div class="settings-group-title">Account</div><div class="form-group"><label class="form-label">Admin Password</label><input type="password" class="form-input" placeholder="New Password"></div><div class="form-group"><label class="form-label">User Password</label><input type="password" class="form-input" placeholder="User Password"></div><button class="btn btn-primary btn-sm">Update Password</button></div>`; 
    }
}

// ... (Standard Modals)
function closeModal(e) { if(!e || e.target.id === 'modalOverlay' || e.target.classList.contains('modal-close-x')) document.getElementById('modalOverlay').style.display = 'none'; }
function closeSpecificModal(id) { document.getElementById(id).style.display = 'none'; }
function showToast(msg, type) { const div = document.createElement('div'); div.className = 'toast'; div.innerHTML = `<span>${msg}</span>`; let container = document.getElementById('toast-container'); if(!container) { container = document.createElement('div'); container.id='toast-container'; document.body.appendChild(container); } container.appendChild(div); setTimeout(() => div.remove(), 3000); }
function showModal(t){if(t==='Add Manual Source'){renderSourceModal('Add Source','','','')}}
function renderSourceModal(t,n,i,g){document.getElementById('modalContentBox').innerHTML=`<div class="modal-header-row"><h3 style="margin:0;color:#fff;">${t}</h3><span class="modal-close-x" onclick="closeModal()">✕</span></div><div class="modal-body-add-source"><div class="form-group"><label class="form-label">Source Name</label><input type="text" id="inputSrcName" class="form-input" value="${n}"></div><div class="form-group"><label class="form-label">IP Address</label><input type="text" id="inputSrcIP" class="form-input" value="${i}"></div></div><div class="modal-footer"><button class="modal-footer-btn" onclick="closeModal()">Cancel</button><button class="modal-footer-btn" onclick="saveSourceData()">Save</button></div>`;document.getElementById('modalOverlay').style.display='flex';}
function saveSourceData() { showToast("Source Added", "success"); closeModal(); refreshSourceList(); }
function showRebootWarning(targetMode) { pendingRebootMode = targetMode; document.getElementById('modal-reboot-warning').style.display = 'flex'; }
function executeReboot() { document.getElementById('modal-reboot-warning').style.display = 'none'; document.getElementById('modal-large-settings').style.display = 'none'; document.getElementById('reboot-overlay').style.display = 'flex'; setTimeout(() => { document.getElementById('reboot-overlay').style.display = 'none'; performSwitch(pendingRebootMode); pendingRebootMode = null; }, 2000); }
function performSwitch(mode) { currentSystemMode = mode; enterView(mode); }
function enterView(mode) { document.getElementById('app-shell').style.display = 'grid'; document.getElementById('view-encoder').style.display = (mode === 'encoder') ? 'block' : 'none'; document.getElementById('view-decoder').style.display = (mode === 'decoder') ? 'block' : 'none'; document.getElementById('current-mode-badge').innerText = mode.toUpperCase() + ' MODE'; document.documentElement.style.setProperty('--theme-color', mode === 'encoder' ? '#007AFF' : '#FF9500'); if(mode === 'decoder') { renderSourceList(); loadDefaultSource(); selectSlot('slot-1'); } }
