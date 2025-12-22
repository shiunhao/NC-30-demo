/* script.js - Final Demo Version (V52 - Drag & PTZ Disable Fix) */

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

function doLogin() {
    const btn = document.querySelector('#page-login .btn-primary');
    btn.innerHTML = "Logging in...";
    setTimeout(() => { 
        document.getElementById('page-login').style.display = 'none'; 
        const hasOnboarded = localStorage.getItem('nc30_onboarding_v51');
        if (!hasOnboarded) {
            startOnboarding();
        } else {
            performSwitch('encoder');
        }
    }, 800);
}

function loadDefaultSource() {
    const slot = document.getElementById('slot-1');
    if(!slot) return;
    
    if(sourcesData.length === 0) {
        checkEmptyState();
        return;
    }

    const firstOnline = sourcesData.find(s => s.status === 'online' && s.resHeight <= maxDecResolution);
    if (firstOnline) {
        slot.dataset.sourceId = firstOnline.id;
        slot.classList.remove('offline-state');
        slot.innerHTML = `<div class="video-layer" style="background-image: url('${firstOnline.thumb || 'https://picsum.photos/id/237/400/300'}');"></div><div class="video-overlay-gradient"></div><div class="slot-label">Window 1</div><div class="slot-content"><div class="slot-name">${firstOnline.name}</div><div class="slot-meta" style="color:#4CAF50;">● Live</div></div>${renderSlotMenu(slot.id)}`;
        slot.classList.add('active-slot');
        selectSlot(slot.id); 
    } else {
        slot.innerHTML = `<div class="slot-label">Window 1</div><div class="slot-content" style="text-align:center;"><div class="slot-name" style="color:#555;">[ Drag Source Here ]</div></div>`;
        delete slot.dataset.sourceId;
        slot.classList.remove('active-slot');
        selectSlot(slot.id); 
    }
}

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

function refreshSourceList() {
    const btn = document.getElementById('btn-refresh-list');
    if(btn) { btn.innerText = "..."; btn.disabled = true; }
    
    const listContainer = document.getElementById('right-panel-list-container');
    const settingsTbody = document.getElementById('settings-source-list-body');
    const spinnerHtml = '<div style="height:100%; display:flex; align-items:center; justify-content:center; padding:40px;"><div class="loading-spinner-container"><div class="spinner-ring"></div><div style="margin-top:10px; color:#888; font-size:13px;">Updating sources...</div></div></div>';
    
    if(listContainer) listContainer.innerHTML = spinnerHtml;
    if(settingsTbody) settingsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px;"><div class="loading-spinner-container"><div class="spinner-ring"></div><div style="margin-top:10px; color:#888; font-size:13px;">Updating sources...</div></div></td></tr>';

    setTimeout(() => {
        if(listContainer) listContainer.innerHTML = `<table class="source-list-table" id="right-panel-table"><thead class="source-list-header"><tr><th style="width:40px;"></th><th>Source Name</th><th style="width:50px; text-align:right;">Act</th></tr></thead><tbody id="source-list-body"></tbody></table>`;
        
        renderSourceList(); 
        if(document.getElementById('modal-large-settings').style.display !== 'none' && document.getElementById('tab-source').classList.contains('active')) {
            switchSettingsTab('source');
        }
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
    const count = currentOutputMode === 'Single' ? 1 : 4;
    for(let i=1; i<=count; i++) {
        const slot = document.getElementById(`slot-${i}`);
        let name = '-';
        let res = '';
        if(slot) {
            const nameEl = slot.querySelector('.slot-name');
            const text = nameEl ? nameEl.innerText : '';
            if(text && !text.includes('Drag')) {
                name = text;
                res = '<span style="color:#FF9500">1920x1080</span>';
            }
        }
        const block = document.createElement('div');
        block.className = 'header-info-block';
        block.innerHTML = `<div class="info-label">Source${i}</div><div class="info-value-row"><span style="color:#bbb">${name}</span>${res}</div>`;
        container.appendChild(block);
    }
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

// FIX: Always render 9 buttons, disabled if no source
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
    const listContainer = document.getElementById('right-panel-list-container');
    const refreshBtn = document.getElementById('btn-refresh-list');
    
    if (sourcesData.length === 0) {
        if(refreshBtn) refreshBtn.style.display = 'none';
        if(listContainer) {
            listContainer.innerHTML = `
                <div class="empty-list-container">
                    <div class="simple-empty-icon">📁</div>
                    <div>No Source</div>
                </div>
            `;
        }
        checkEmptyState(); 
    } else {
        if(refreshBtn) refreshBtn.style.display = 'flex';
        if(listContainer && !listContainer.querySelector('table')) {
            listContainer.innerHTML = `<table class="source-list-table"><thead class="source-list-header"><tr><th style="width:40px;"></th><th>Source Name</th><th style="width:50px; text-align:right;">Act</th></tr></thead><tbody id="source-list-body"></tbody></table>`;
        }

        const tbody = document.getElementById('source-list-body');
        if(tbody) {
            const slot = document.getElementById('slot-1');
            const activeSourceId = slot ? slot.dataset.sourceId : null;
            tbody.innerHTML = '';
            
            if(document.querySelector('.empty-state-wrapper') && currentSystemMode === 'decoder') {
                 switchOutputMode(currentOutputMode === 'Single' ? 1 : 4);
            }
            
            sourcesData.forEach(src => {
                const tr = document.createElement('tr');
                const isActive = src.id === activeSourceId;
                const isUnsupported = src.resHeight > maxDecResolution;
                tr.className = `source-row ${src.status === 'offline' ? 'offline' : ''} ${isActive ? 'active-source-row' : ''}`;
                
                tr.draggable = !isUnsupported;
                tr.setAttribute('ondragstart', 'drag(event)');
                tr.setAttribute('data-json', JSON.stringify(src));
                
                let statusHtml = `<span style="color:#4CAF50;">Online</span>`;
                if(src.status === 'error') statusHtml = `<span class="src-status-error">${src.errorMsg}</span>`;
                if(src.status === 'offline') statusHtml = `<span style="color:#888;">Offline</span>`;
                
                if(isUnsupported) statusHtml += `<span class="src-status-warning">Input Resolution Not Supported</span>`;
                else if(isActive) statusHtml += ` <span style="color:#007AFF; font-weight:bold; font-size:10px; margin-left:5px;">● PREVIEW</span>`;

                let thumbClass = "thumb-box";
                if(src.status === 'offline') thumbClass += " offline";
                if(isUnsupported) thumbClass += " unsupported";
                let thumbHtml = src.status === 'offline' && !src.thumb ? `<div class="${thumbClass}"><span>Offline</span></div>` : `<div class="${thumbClass}"><img src="${src.thumb}"></div>`;
                
                tr.innerHTML = `
                    <td class="drag-col"><span class="drag-handle-icon" style="opacity:${isUnsupported?0.3:1}">⋮⋮</span></td>
                    <td class="info-col">
                        <div class="src-name" style="${src.status==='offline'?'color:#888':''}">${src.name}</div>
                        <div class="src-meta" style="font-size:10px;">${src.resolution}</div>
                        <div style="font-size:10px; margin-top:2px;">${statusHtml}</div>
                    </td>
                    <td class="action-col" style="white-space:nowrap;"></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
}

// === Drag and Drop Functions (FIXED) ===
function drag(ev) {
    ev.dataTransfer.setData("application/json", ev.currentTarget.getAttribute("data-json"));
}

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
        slot.dataset.sourceId = data.id; 
        const windowNum = slot.id.split('-')[1];
        
        if (data.status === 'offline') {
            slot.classList.add('offline-state');
            slot.innerHTML = `<div class="slot-label">Window ${windowNum}</div><div class="offline-overlay"><div class="offline-icon">⚠️</div><div class="offline-text">Signal Lost</div></div>${renderSlotMenu(slot.id)}`;
        } else {
            slot.classList.remove('offline-state');
            slot.innerHTML = `<div class="video-layer" style="background-image: url('${data.thumb || 'https://picsum.photos/id/237/400/300'}');"></div><div class="video-overlay-gradient"></div><div class="slot-label">Window ${windowNum}</div><div class="slot-content"><div class="slot-name">${data.name}</div><div class="slot-meta" style="color:#4CAF50;">● Live</div></div>${renderSlotMenu(slot.id)}`;
        }
        slot.classList.add('active-slot');
        selectSlot(slot.id);
        updateLiveHeader();
        renderSourceList(); 
    } catch (e) {
        console.error("Drop failed:", e);
    }
}

function switchSettingsTab(tabId) {
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    const activeTab = document.getElementById('tab-' + tabId);
    if(activeTab) activeTab.classList.add('active');
    const titleEl = document.getElementById('settings-title');
    const bodyEl = document.getElementById('settings-body-content');
    let htmlContent = '';

    if (tabId === 'av-settings') {
        titleEl.innerText = "Video & Audio Settings";
        let encBtnClass = currentSystemMode === 'encoder' ? 'mode-switch-btn active' : 'mode-switch-btn';
        let decBtnClass = currentSystemMode === 'decoder' ? 'mode-switch-btn active' : 'mode-switch-btn';
        let encClick = currentSystemMode === 'encoder' ? '' : `onclick="showRebootWarning('encoder')"`;
        let decClick = currentSystemMode === 'decoder' ? '' : `onclick="showRebootWarning('decoder')"`;
        
        htmlContent += `<div class="settings-subsection"><div class="settings-group-title"><div class="settings-group-icon">⚙️</div> Operation Mode</div><div class="mode-switch-container" style="margin-bottom:30px;"><div class="${encBtnClass}" ${encClick}><div class="mode-btn-icon">📡</div><span>Encoder Mode</span></div><div class="${decBtnClass}" ${decClick}><div class="mode-btn-icon">🖥️</div><span>Decoder Mode</span></div></div></div>`;
        htmlContent += `<div class="settings-subsection"><div class="settings-group-title"><div class="settings-group-icon">📺</div> Video Settings (${currentSystemMode.toUpperCase()})</div>`;
        if (currentSystemMode === 'encoder') {
            htmlContent += `<div class="form-group"><label class="form-label">Video Source</label><input type="text" class="form-input darker-input" value="HDMI (Auto detect)" readonly></div><div class="form-group"><label class="form-label">Resolution</label><select class="form-select darker-input"><option>3840 x 2160</option><option>1920 x 1080</option></select></div>`;
        } else {
            htmlContent += `<div class="form-group"><label class="form-label">Maximum Video Input</label><select class="form-select" onchange="setMaxVideoInput(this.value)"><option value="2160" ${maxDecResolution==2160?'selected':''}>2160p60 (4K)</option><option value="1080" ${maxDecResolution==1080?'selected':''}>1080p60</option><option value="720" ${maxDecResolution==720?'selected':''}>720p60</option></select></div><div class="form-group"><label class="form-label">Current Video Input Resolution</label><input type="text" class="form-input darker-input" value="1080p/60" readonly style="color:#888;"></div><div class="form-group"><label class="form-label">Resolution</label><select class="form-select"><option>3840 X 2160</option><option selected>1920 X 1080</option></select></div><div class="form-group"><label class="form-label">Color Space</label><select class="form-select"><option>RGB</option><option>YUV 4:4:4</option></select></div>`;
        }
        htmlContent += `</div><div class="settings-subsection" style="margin-top:30px; border-top:1px solid #333; padding-top:20px;"><div class="settings-group-title"><div class="settings-group-icon">🔊</div> Audio Settings</div><div class="form-group"><label class="form-label">Source Select</label><select class="form-select"><option>Auto</option><option>HDMI</option><option>3.5mm</option></select></div><div class="form-group"><label class="form-label">Volume (Gain)</label><div style="display:flex; align-items:center; gap:10px;"><input type="range" class="ptz-range" min="0" max="100" value="80" style="flex:1;" oninput="document.getElementById('vol-value-disp').innerText = this.value"><span id="vol-value-disp" style="width:30px; text-align:right; font-size:12px; color:#ccc;">80</span></div></div></div>`;
    }
    else if (tabId === 'source') {
        titleEl.innerText = "Source Management";
        
        if (currentSystemMode === 'encoder') {
             let rows = '';
            if(sourcesData.length === 0) rows = '<tr><td colspan="4" class="empty-state">No sources found.</td></tr>';
            else sourcesData.forEach(src => { rows += `<tr class="source-row disabled-content"><td style="padding:10px;"><div class="thumb-box" style="width:80px; height:45px;"><img src="${src.thumb || ''}" style="width:100%; height:100%; object-fit:cover; display:${src.thumb?'block':'none'}"></div></td><td style="padding:10px;"><div style="font-weight:bold; color:#fff;">${src.name}</div><div style="font-size:12px; color:#888;">${src.ip}</div></td><td style="padding:10px; color:#888; font-size:12px;">${src.status.toUpperCase()}</td><td style="padding:10px; text-align:right;"><button class="btn btn-outline btn-sm" disabled>Edit</button> <button class="btn btn-danger btn-sm" disabled>Delete</button></td></tr>`; });
            
            htmlContent = `
                <div style="background:#332b00; border:1px solid #d4b106; color:#ffeeba; padding:10px; border-radius:4px; margin-bottom:20px; font-size:13px;">
                    ⚠️ Source management is only available in 
                    <a href="#" onclick="switchSettingsTab('av-settings'); return false;" style="color:#FF9500; text-decoration:underline; font-weight:bold;">Decoder Mode</a>.
                </div>
                <div style="display:flex; justify-content:flex-end; margin-bottom:20px;"><button class="btn btn-primary" disabled style="opacity:0.5; cursor:not-allowed;">+ Add Source</button></div>
                <div class="source-list-panel" style="border:1px solid #333; border-radius:8px; overflow:hidden;"><table class="source-list-table"><thead class="source-list-header"><tr><th>Preview</th><th>Name & IP</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead><tbody id="settings-source-list-body">${rows}</tbody></table></div>
            `;
        } else {
            let rows = '';
            if(sourcesData.length === 0) {
                rows = `<tr><td colspan="4"><div class="empty-state-wrapper" style="padding:40px;"><div class="empty-icon-placeholder">📷</div><div class="empty-text-title">You have not set up any source.</div><div class="empty-text-desc">Please click the Add Source button.</div></div></td></tr>`;
            } else {
                sourcesData.forEach(src => {
                    let statusColor = src.status === 'online' ? '#4CAF50' : (src.status==='error'?'#888':'#888');
                    rows += `<tr class="source-row"><td style="padding:10px;"><div class="thumb-box" style="width:80px; height:45px;"><img src="${src.thumb || ''}" style="width:100%; height:100%; object-fit:cover; display:${src.thumb?'block':'none'}"></div></td><td style="padding:10px;"><div style="font-weight:bold; color:#fff;">${src.name}</div><div style="font-size:12px; color:#888;">${src.ip}</div></td><td style="padding:10px; color:${statusColor}; font-size:12px;">${src.status.toUpperCase()}</td><td style="padding:10px; text-align:right;"><button class="btn btn-outline btn-sm" onclick="openEditSourceModal('${src.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="askRemoveSource('${src.id}')">Delete</button></td></tr>`;
                });
            }
            htmlContent = `<div style="display:flex; justify-content:flex-end; margin-bottom:20px;"><button class="btn btn-primary" onclick="showModal('Add Manual Source')">+ Add Source</button></div><div class="source-list-panel" style="border:1px solid #333; border-radius:8px; overflow:hidden;"><table class="source-list-table"><thead class="source-list-header"><tr><th>Preview</th><th>Name & IP</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead><tbody id="settings-source-list-body">${rows}</tbody></table></div>`;
        }
    }
    else if (tabId === 'network') { titleEl.innerText = "Network Settings"; htmlContent = `<div class="settings-subsection"><div class="settings-group-title">IP Configuration</div><div class="form-group"><label class="form-label">Mode</label><select class="form-select"><option>DHCP</option><option>Static IP</option></select></div><div class="form-group"><label class="form-label">IP Address</label><input type="text" class="form-input" value="192.168.1.100"></div></div><div class="settings-subsection" style="margin-top:30px; border-top:1px solid #333; padding-top:20px;"><div class="settings-group-title">Advanced NDI</div><div class="form-group"><label class="form-label">Connection Mode</label><select class="form-select"><option>Auto (RUDP)</option><option>TCP</option></select></div></div>`; }
    else if (tabId === 'system') { titleEl.innerText = "System Settings"; htmlContent = `<div class="settings-subsection"><div class="settings-group-title">General</div><div class="form-group"><label class="form-label">Device Name</label><input type="text" class="form-input" value="AVer NC30"></div></div><div class="settings-subsection" style="margin-top:30px; border-top:1px solid #333; padding-top:20px;"><div class="settings-group-title">Account</div><div class="form-group"><label class="form-label">Admin Password</label><input type="password" class="form-input" placeholder="New Password"></div><div class="form-group"><label class="form-label">User Password</label><input type="password" class="form-input" placeholder="User Password"></div><button class="btn btn-primary btn-sm">Update Password</button></div>`; }
    
    bodyEl.innerHTML = htmlContent;
}

// ... (Account Functions)
function toggleAccountMenu() { document.getElementById('accountMenu').classList.toggle('show'); }
function actionAdminMode() { currentUserRole = 'admin'; document.getElementById('current-user-label').innerText = 'Admin'; document.getElementById('role-admin').classList.add('active'); document.getElementById('role-user').classList.remove('active'); toggleAccountMenu(); showToast("Switched to Admin", "success"); }
function actionUserMode() { currentUserRole = 'user'; document.getElementById('current-user-label').innerText = 'User'; document.getElementById('role-user').classList.add('active'); document.getElementById('role-admin').classList.remove('active'); toggleAccountMenu(); showToast("Switched to User", "success"); }
function actionLogout() { document.getElementById('accountMenu').classList.remove('show'); document.getElementById('modal-logout-confirm').style.display = 'flex'; }
function confirmLogout() { document.getElementById('modal-logout-confirm').style.display = 'none'; document.getElementById('app-shell').style.display = 'none'; document.getElementById('view-encoder').style.display = 'none'; document.getElementById('view-decoder').style.display = 'none'; document.getElementById('page-login').style.display = 'flex'; document.querySelector('#page-login .btn-primary').innerHTML = "LOGIN"; }

// ... (Rest of helper functions)
function startOnboarding() { document.getElementById('onboarding-overlay').style.display = 'flex'; nextOnboardingStep(1); }
function nextOnboardingStep(step) { document.querySelectorAll('.onboarding-step').forEach(el => el.classList.remove('active')); document.querySelectorAll('.step-dot').forEach(el => el.classList.remove('active')); document.getElementById('step-' + step).classList.add('active'); for(let i=1; i<=step; i++) { document.getElementById('dot-' + i).classList.add('active'); } }
function finishOnboarding() { localStorage.setItem('nc30_onboarding_v51', 'true'); document.getElementById('onboarding-overlay').style.display = 'none'; performSwitch('encoder'); showToast("Setup Completed!", "success"); }

function showModal(t){if(t==='Add Manual Source'){if (sourcesData.length >= 4) { document.getElementById('modal-alert').style.display = 'flex'; return; }editingSourceId=null;renderSourceModal('Add Source','','','')}}
function openEditSourceModal(id){const s=sourcesData.find(i=>i.id===id);if(s){editingSourceId=id;renderSourceModal('Edit Source',s.name,s.ip,s.group)}}
function renderSourceModal(t,n,i,g){document.getElementById('modalContentBox').innerHTML=`<div class="modal-header-row"><h3 style="margin:0;color:#fff;">${t}</h3><span class="modal-close-x" onclick="closeModal()">✕</span></div><div class="modal-body-add-source"><div class="form-group"><label class="form-label">Source Name</label><input type="text" id="inputSrcName" class="form-input" value="${n}" onkeyup="checkModalValidity()"></div><div class="form-group"><label class="form-label">Group</label><input type="text" id="inputSrcGroup" class="form-input" value="${g}" placeholder="Group"></div><div class="form-group"><label class="form-label">IP Address</label><div style="display:flex; gap:10px;"><input type="text" id="inputSrcIP" class="form-input" value="${i}" placeholder="192.168.x.x" onkeyup="checkModalValidity()"><button class="btn btn-outline" style="padding:0 12px;" onclick="openAutoSearch()">🔍</button></div></div></div><div class="modal-footer"><button class="modal-footer-btn" onclick="closeModal()">Cancel</button><button class="modal-footer-btn" id="btnSaveSource" onclick="saveSourceData()" disabled>Save</button></div>`;document.getElementById('modalOverlay').style.display='flex';checkModalValidity()}
function checkModalValidity(){const n=document.getElementById('inputSrcName').value.trim();const i=document.getElementById('inputSrcIP').value.trim();document.getElementById('btnSaveSource').disabled=!(n&&i)}
function openAutoSearch() { document.getElementById('modal-auto-search').style.display = 'flex'; selectedAutoSearchIp = null; const list = document.getElementById('search-list-content'); list.innerHTML = ''; const devices = [ { ip: '192.168.1.101', name: 'Camera 01' }, { ip: '192.168.1.105', name: 'PTZ Cam' }, { ip: '192.168.1.200', name: 'PC Stream' }, { ip: '192.168.1.205', name: 'Meeting Room' } ]; devices.forEach(d => { const el = document.createElement('div'); el.className = 'search-list-item'; el.innerText = `${d.ip} (${d.name})`; el.onclick = function() { document.querySelectorAll('.search-list-item').forEach(i => i.classList.remove('selected')); el.classList.add('selected'); selectedAutoSearchIp = d.ip; }; list.appendChild(el); }); }
function closeAutoSearch() { document.getElementById('modal-auto-search').style.display = 'none'; }
function confirmAutoSearch() { if(selectedAutoSearchIp) { document.getElementById('inputSrcIP').value = selectedAutoSearchIp; checkModalValidity(); closeAutoSearch(); } else { showToast("Please select an IP first", "error"); } }
function saveSourceData() { const name = document.getElementById('inputSrcName').value; const ip = document.getElementById('inputSrcIP').value; const group = document.getElementById('inputSrcGroup').value; if(editingSourceId) { const idx = sourcesData.findIndex(s => s.id === editingSourceId); if(idx !== -1) { sourcesData[idx].name = name; sourcesData[idx].ip = ip; sourcesData[idx].group = group; updatePreviewLabels(editingSourceId, name); showToast(`Updated: ${name}`, "success"); } } else { const newId = 'src_' + Date.now(); sourcesData.push({ id: newId, name: name, ip: ip, group: group, status: 'online', thumb: 'https://picsum.photos/id/237/100/56', resHeight:1080, resolution:'1920x1080', presets:{} }); showToast(`Added: ${name}`, "success"); } refreshSourceList(); closeModal(); updateLiveHeader(); }
function askRemoveSource(id) { sourceToRemoveId = id; document.getElementById('modal-remove-confirm').style.display = 'flex'; }
function confirmRemoveSource() { if(sourceToRemoveId) { removeSource(null, sourceToRemoveId); sourcesData = sourcesData.filter(s => s.id !== sourceToRemoveId); refreshSourceList(); showToast("Source Removed", "success"); document.getElementById('modal-remove-confirm').style.display = 'none'; sourceToRemoveId = null; } }
function cancelRemoveSource() { document.getElementById('modal-remove-confirm').style.display = 'none'; sourceToRemoveId = null; }
function updatePreviewLabels(id, newName) { document.querySelectorAll('.preview-slot').forEach(slot => { if(slot.dataset.sourceId === id) { const nameEl = slot.querySelector('.slot-name'); if(nameEl) nameEl.innerText = newName; } }); updateLiveHeader(); }
function renderSlotMenu(slotId) { return `<button class="slot-menu-btn" onclick="toggleSlotMenu('${slotId}', event)">•••</button><div class="slot-dropdown" id="menu-${slotId}"><button class="slot-action danger" onclick="removeSource('${slotId}')">Clear</button></div>`; }
function toggleSlotMenu(slotId, event) { event.stopPropagation(); document.querySelectorAll('.slot-dropdown').forEach(el => el.classList.remove('show')); const menu = document.getElementById(`menu-${slotId}`); if(menu) menu.classList.add('show'); }
function removeSource(slotId, targetSourceId = null) { if (targetSourceId) { const slot = document.querySelector(`.preview-slot[data-source-id="${targetSourceId}"]`); if (slot) slotId = slot.id; else return; } const slot = document.getElementById(slotId); if(slot) { delete slot.dataset.sourceId; slot.classList.remove('active-slot', 'offline-state'); slot.innerHTML = `<div class="slot-label">Window ${slotId.split('-')[1]}</div><div class="slot-content" style="text-align:center;"><div class="slot-name" style="color:#555;">[ Drag Source Here ]</div></div>`; updateLiveHeader(); selectSlot(slotId); renderSourceList(); } }
function showRebootWarning(targetMode) { pendingRebootMode = targetMode; document.getElementById('modal-reboot-warning').style.display = 'flex'; }
function executeReboot() { document.getElementById('modal-reboot-warning').style.display = 'none'; document.getElementById('modal-large-settings').style.display = 'none'; document.getElementById('reboot-overlay').style.display = 'flex'; setTimeout(() => { document.getElementById('reboot-overlay').style.display = 'none'; performSwitch(pendingRebootMode); pendingRebootMode = null; }, 2000); }
function performSwitch(mode) { currentSystemMode = mode; enterView(mode); }
function enterView(mode) { document.getElementById('app-shell').style.display = 'grid'; document.getElementById('view-encoder').style.display = (mode === 'encoder') ? 'block' : 'none'; document.getElementById('view-decoder').style.display = (mode === 'decoder') ? 'block' : 'none'; document.getElementById('current-mode-badge').innerText = mode.toUpperCase() + ' MODE'; document.documentElement.style.setProperty('--theme-color', mode === 'encoder' ? '#007AFF' : '#FF9500'); if(mode === 'decoder') { renderSourceList(); loadDefaultSource(); updateLiveHeader(); selectSlot('slot-1'); } }
function switchOutputMode(count) { currentOutputMode = count === 1 ? 'Single' : 'Quad'; document.querySelectorAll('.mode-switch-btn').forEach(btn => btn.classList.remove('active')); if(count === 1) document.getElementById('mode-single').classList.add('active'); else document.getElementById('mode-quad').classList.add('active'); const layout = document.getElementById('outputLayout'); layout.className = count === 1 ? 'output-layout-single' : 'output-layout-quad'; layout.innerHTML = ''; for(let i=1; i<=count; i++) { layout.innerHTML += `<div class="preview-slot" id="slot-${i}" onclick="selectSlot('slot-${i}')" ondrop="drop(event)" ondragover="allowDrop(event)"><div class="slot-label">Window ${i}</div><div class="slot-content" style="text-align:center;"><div class="slot-name" style="color:#555;">[ Drag Source Here ]</div></div></div>`; } selectSlot('slot-1'); updateLiveHeader(); }
function toggleAccountMenu() { document.getElementById('accountMenu').classList.toggle('show'); }
function closeModal(e) { if(!e || e.target.id === 'modalOverlay' || e.target.classList.contains('modal-close-x')) document.getElementById('modalOverlay').style.display = 'none'; }
function closeSpecificModal(id) { document.getElementById(id).style.display = 'none'; }
function showToast(msg, type) { const div = document.createElement('div'); div.className = 'toast'; div.innerHTML = `<span>${msg}</span>`; div.style.borderLeftColor = type === 'success' ? '#4CAF50' : '#007AFF'; let container = document.getElementById('toast-container'); if(!container) { container = document.createElement('div'); container.id='toast-container'; document.body.appendChild(container); } container.appendChild(div); setTimeout(() => div.remove(), 3000); }
function openFullSettings(tab, autoAdd=false) { document.getElementById('modal-large-settings').style.display = 'flex'; switchSettingsTab(tab); if(autoAdd && tab === 'source') { setTimeout(() => showModal('Add Manual Source'), 300); } }
function togglePTZ() { console.log("PTZ is embedded now"); }
function switchEncTab(tabName) { document.querySelectorAll('.enc-tab').forEach(t => t.classList.remove('active')); document.getElementById('enc-tab-video').style.display = 'none'; document.getElementById('enc-tab-audio').style.display = 'none'; event.target.classList.add('active'); document.getElementById('enc-tab-' + tabName).style.display = 'block'; }
