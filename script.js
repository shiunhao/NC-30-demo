/* script.js - Final Demo Version (V26 Final Polish) */

let currentSystemMode = null; 
let currentUserRole = 'admin'; 
let currentOutputMode = 'Single'; 
let sourcesData = [
    { id: 'src_01', name: 'Main Camera 01', ip: '192.168.1.101', group: 'Studio A', status: 'online', thumb: 'https://picsum.photos/id/64/100/56' },
    { id: 'src_02', name: 'PTZ Camera 02', ip: '192.168.1.102', group: 'Studio B', status: 'online', thumb: 'https://picsum.photos/id/1/100/56' },
    { id: 'src_03', name: 'OBS Output', ip: '192.168.1.120', group: 'OBS', status: 'error', errorMsg: 'No support 4k▲', thumb: 'https://picsum.photos/id/48/100/56' },
    { id: 'src_04', name: 'Outdoor Cam', ip: '192.168.1.104', group: 'Outdoor', status: 'offline', thumb: '' }
];
let editingSourceId = null;
let selectedAutoSearchIp = null;
let sourceToRemoveId = null;
let pendingRebootMode = null; 

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('view-decoder').style.display !== 'none') {
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
        performSwitch('encoder');
    }, 800);
}

// === Auto Load Source ===
function loadDefaultSource() {
    const slot = document.getElementById('slot-1');
    if(!slot) return;

    const firstOnline = sourcesData.find(s => s.status === 'online');
    
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

// === Refresh with Loading ===
function refreshSourceList() {
    const btn = document.getElementById('btn-refresh-list');
    if(btn) { btn.innerText = "..."; btn.disabled = true; }
    
    const tbdDec = document.getElementById('source-list-body');
    const spinnerHtml = '<tr><td colspan="6" style="text-align:center; padding:40px;"><div class="loading-spinner-container"><div class="spinner-ring"></div><div style="margin-top:10px; color:#888; font-size:13px;">Updating sources...</div></div></td></tr>';
    
    if(tbdDec) tbdDec.innerHTML = spinnerHtml;

    setTimeout(() => {
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

// === PTZ LOGIC ===
function selectSlot(slotId) { 
    document.querySelectorAll('.preview-slot').forEach(el => el.classList.remove('selected-slot')); 
    const el = document.getElementById(slotId); 
    if(el) { 
        el.classList.add('selected-slot'); 
        const sourceId = el.dataset.sourceId;
        const windowNum = slotId.split('-')[1];
        
        if (!sourceId) {
            updatePTZPanelInfo(windowNum, null);
            setPTZPanelState(false);
        } else {
            const sourceObj = sourcesData.find(s => s.id === sourceId);
            if (sourceObj && sourceObj.status === 'offline') {
                updatePTZPanelInfo(windowNum, null);
                setPTZPanelState(false);
            } else {
                updatePTZPanelInfo(windowNum, sourceObj ? sourceObj.name : "Unknown");
                setPTZPanelState(true);
            }
        }
    } 
}

function updatePTZPanelInfo(windowNum, sourceName) {
    const info = document.getElementById('ptz-target-info');
    let text = "";
    let color = "";
    
    if(sourceName) {
        text = `Target: ${sourceName}`;
        color = "#007AFF"; 
    } else {
        text = `Target: Unavailable`;
        color = "#D32F2F"; 
    }
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

function savePreset() {
    showToast("Preset Saved", "success");
}

function renderSourceList() {
    const tbody = document.getElementById('source-list-body');
    if(!tbody) return;
    
    const slot = document.getElementById('slot-1');
    const activeSourceId = slot ? slot.dataset.sourceId : null;

    tbody.innerHTML = '';
    sourcesData.forEach(src => {
        const tr = document.createElement('tr');
        const isActive = src.id === activeSourceId;
        tr.className = `source-row ${src.status === 'offline' ? 'offline' : ''} ${isActive ? 'active-source-row' : ''}`;
        
        tr.draggable = true;
        tr.setAttribute('ondragstart', 'drag(event)');
        tr.setAttribute('data-json', JSON.stringify(src));
        
        let statusHtml = `<span style="color:#4CAF50;">Online</span>`;
        if(src.status === 'error') statusHtml = `<span class="src-status-error">${src.errorMsg}</span>`;
        if(src.status === 'offline') statusHtml = `<span style="color:#888;">Offline</span>`;
        
        if(isActive) statusHtml += ` <span style="color:#007AFF; font-weight:bold; font-size:10px; margin-left:5px;">● PREVIEW</span>`;

        let thumbHtml = src.status === 'offline' ? `<div class="thumb-box offline"><span>Offline</span></div>` : `<div class="thumb-box"><img src="${src.thumb}"></div>`;
        
        tr.innerHTML = `
            <td class="drag-col"><span class="drag-handle-icon">⋮⋮</span></td>
            <td class="info-col">
                <div class="src-name" style="${src.status==='offline'?'color:#888':''}">${src.name}</div>
                <div class="src-meta" style="font-size:10px;">${src.ip}</div>
                <div style="font-size:10px; margin-top:2px;">${statusHtml}</div>
            </td>
            <td class="action-col" style="white-space:nowrap;">
                <button class="btn-icon-action" onclick="openEditSourceModal('${src.id}')" title="Edit" style="width:24px; height:24px; font-size:12px;">✎</button>
                <button class="btn-icon-action danger" onclick="askRemoveSource('${src.id}')" title="Remove" style="width:24px; height:24px; font-size:12px;">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function showModal(type) {
    if(type === 'Add Manual Source') {
        editingSourceId = null;
        renderSourceModal('Add Source', '', '', '');
    }
}

function openEditSourceModal(id) {
    const src = sourcesData.find(s => s.id === id);
    if(!src) return;
    editingSourceId = id;
    renderSourceModal('Edit Source', src.name, src.ip, src.group);
}

function renderSourceModal(title, name, ip, group) {
    const box = document.getElementById('modalContentBox');
    document.getElementById('modalOverlay').style.display = 'flex';
    box.innerHTML = `
        <div class="modal-header-row">
            <h3 style="margin:0; color:#fff; font-size:16px;">${title}</h3>
            <span class="modal-close-x" onclick="closeModal()">✕</span>
        </div>
        <div class="modal-body-add-source">
            <div class="form-group"><label class="form-label">Source Name</label><input type="text" id="inputSrcName" class="form-input" value="${name}" placeholder="Camera Name" onkeyup="checkModalValidity()"></div>
            <div class="form-group"><label class="form-label">Group</label><input type="text" id="inputSrcGroup" class="form-input" value="${group}" placeholder="Group"></div>
            <div class="form-group"><label class="form-label">IP Address</label><div style="display:flex; gap:10px;"><input type="text" id="inputSrcIP" class="form-input" value="${ip}" placeholder="192.168.x.x" onkeyup="checkModalValidity()"><button class="btn btn-outline" style="padding:0 12px;" onclick="openAutoSearch()">🔍</button></div></div>
        </div>
        <div class="modal-footer"><button class="modal-footer-btn" onclick="closeModal()">Cancel</button><button class="modal-footer-btn" id="btnSaveSource" onclick="saveSourceData()" disabled>Save</button></div>
    `;
    checkModalValidity(); 
}

function checkModalValidity() {
    const name = document.getElementById('inputSrcName').value.trim();
    const ip = document.getElementById('inputSrcIP').value.trim();
    const btn = document.getElementById('btnSaveSource');
    if(name && ip) { btn.disabled = false; btn.style.opacity = 1; btn.style.cursor = 'pointer'; } else { btn.disabled = true; btn.style.opacity = 0.5; btn.style.cursor = 'not-allowed'; }
}

function openAutoSearch() {
    document.getElementById('modal-auto-search').style.display = 'flex';
    selectedAutoSearchIp = null;
    const list = document.getElementById('search-list-content');
    list.innerHTML = '';
    const devices = [ { ip: '192.168.1.101', name: 'Camera 01' }, { ip: '192.168.1.105', name: 'PTZ Cam' }, { ip: '192.168.1.200', name: 'PC Stream' }, { ip: '192.168.1.205', name: 'Meeting Room' } ];
    devices.forEach(d => {
        const el = document.createElement('div');
        el.className = 'search-list-item';
        el.innerText = `${d.ip} (${d.name})`;
        el.onclick = function() { document.querySelectorAll('.search-list-item').forEach(i => i.classList.remove('selected')); el.classList.add('selected'); selectedAutoSearchIp = d.ip; }
        list.appendChild(el);
    });
}

function closeAutoSearch() { document.getElementById('modal-auto-search').style.display = 'none'; }
function confirmAutoSearch() { if(selectedAutoSearchIp) { document.getElementById('inputSrcIP').value = selectedAutoSearchIp; checkModalValidity(); closeAutoSearch(); } else { showToast("Please select an IP first", "error"); } }

function saveSourceData() {
    const name = document.getElementById('inputSrcName').value;
    const ip = document.getElementById('inputSrcIP').value;
    const group = document.getElementById('inputSrcGroup').value;
    if(editingSourceId) {
        const idx = sourcesData.findIndex(s => s.id === editingSourceId);
        if(idx !== -1) { sourcesData[idx].name = name; sourcesData[idx].ip = ip; sourcesData[idx].group = group; updatePreviewLabels(editingSourceId, name); showToast(`Updated: ${name}`, "success"); }
    } else {
        const newId = 'src_' + Date.now();
        sourcesData.push({ id: newId, name: name, ip: ip, group: group, status: 'online', thumb: 'https://picsum.photos/id/237/100/56' });
        showToast(`Added: ${name}`, "success");
    }
    renderSourceList();
    closeModal();
    updateLiveHeader();
}

function askRemoveSource(id) {
    sourceToRemoveId = id;
    document.getElementById('modal-remove-confirm').style.display = 'flex';
}

function confirmRemoveSource() {
    if(sourceToRemoveId) {
        removeSource(null, sourceToRemoveId); 
        sourcesData = sourcesData.filter(s => s.id !== sourceToRemoveId);
        renderSourceList();
        showToast("Source Removed", "success");
        document.getElementById('modal-remove-confirm').style.display = 'none';
        sourceToRemoveId = null;
    }
}

function cancelRemoveSource() {
    document.getElementById('modal-remove-confirm').style.display = 'none';
    sourceToRemoveId = null;
}

function updatePreviewLabels(id, newName) {
    document.querySelectorAll('.preview-slot').forEach(slot => {
        if(slot.dataset.sourceId === id) {
            const nameEl = slot.querySelector('.slot-name');
            if(nameEl) nameEl.innerText = newName;
        }
    });
    updateLiveHeader();
}

function drag(ev) { ev.dataTransfer.setData("application/json", ev.currentTarget.getAttribute("data-json")); }
function allowDrop(ev) { ev.preventDefault(); ev.currentTarget.classList.add('drag-over'); }
function drop(ev) {
    ev.preventDefault();
    const slot = ev.currentTarget;
    slot.classList.remove('drag-over');
    const data = JSON.parse(ev.dataTransfer.getData("application/json"));
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
}

function renderSlotMenu(slotId) { return `<button class="slot-menu-btn" onclick="toggleSlotMenu('${slotId}', event)">•••</button><div class="slot-dropdown" id="menu-${slotId}"><button class="slot-action danger" onclick="removeSource('${slotId}')">Clear</button></div>`; }
function toggleSlotMenu(slotId, event) { event.stopPropagation(); document.querySelectorAll('.slot-dropdown').forEach(el => el.classList.remove('show')); const menu = document.getElementById(`menu-${slotId}`); if(menu) menu.classList.add('show'); }
function removeSource(slotId, targetSourceId = null) { 
    if (targetSourceId) { const slot = document.querySelector(`.preview-slot[data-source-id="${targetSourceId}"]`); if (slot) slotId = slot.id; else return; }
    const slot = document.getElementById(slotId);
    if(slot) { 
        delete slot.dataset.sourceId; 
        slot.classList.remove('active-slot', 'offline-state'); 
        slot.innerHTML = `<div class="slot-label">Window ${slotId.split('-')[1]}</div><div class="slot-content" style="text-align:center;"><div class="slot-name" style="color:#555;">[ Drag Source Here ]</div></div>`; 
        updateLiveHeader(); 
        selectSlot(slotId); 
        renderSourceList(); 
    }
}

function showRebootWarning(targetMode) {
    pendingRebootMode = targetMode; 
    document.getElementById('modal-reboot-warning').style.display = 'flex';
}

function executeReboot() {
    document.getElementById('modal-reboot-warning').style.display = 'none';
    document.getElementById('modal-large-settings').style.display = 'none'; 
    
    document.getElementById('reboot-overlay').style.display = 'flex';
    setTimeout(() => { 
        document.getElementById('reboot-overlay').style.display = 'none'; 
        performSwitch(pendingRebootMode); 
        pendingRebootMode = null;
    }, 2000);
}

function performSwitch(mode) { 
    currentSystemMode = mode; 
    enterView(mode); 
}

function enterView(mode) {
    document.getElementById('app-shell').style.display = 'grid';
    document.getElementById('view-encoder').style.display = (mode === 'encoder') ? 'block' : 'none';
    document.getElementById('view-decoder').style.display = (mode === 'decoder') ? 'block' : 'none';
    
    document.getElementById('current-mode-badge').innerText = mode.toUpperCase() + ' MODE';
    document.documentElement.style.setProperty('--theme-color', mode === 'encoder' ? '#007AFF' : '#FF9500');
    
    if(mode === 'decoder') { 
        renderSourceList(); 
        loadDefaultSource(); 
        updateLiveHeader(); 
        selectSlot('slot-1'); 
    }
}

function switchOutputMode(count) { 
    currentOutputMode = count === 1 ? 'Single' : 'Quad'; 
    document.querySelectorAll('.mode-switch-btn').forEach(btn => btn.classList.remove('active'));
    if(count === 1) document.getElementById('mode-single').classList.add('active');
    else document.getElementById('mode-quad').classList.add('active');
    const layout = document.getElementById('outputLayout'); layout.className = count === 1 ? 'output-layout-single' : 'output-layout-quad'; layout.innerHTML = ''; for(let i=1; i<=count; i++) { layout.innerHTML += `<div class="preview-slot" id="slot-${i}" onclick="selectSlot('slot-${i}')" ondrop="drop(event)" ondragover="allowDrop(event)"><div class="slot-label">Window ${i}</div><div class="slot-content" style="text-align:center;"><div class="slot-name" style="color:#555;">[ Drag Source Here ]</div></div></div>`; } 
    selectSlot('slot-1'); 
    updateLiveHeader(); 
}
function toggleAccountMenu() { document.getElementById('accountMenu').classList.toggle('show'); }
function closeModal(e) { if(!e || e.target.id === 'modalOverlay' || e.target.classList.contains('modal-close-x')) document.getElementById('modalOverlay').style.display = 'none'; }
function closeSpecificModal(id) { document.getElementById(id).style.display = 'none'; }
function showToast(msg, type) { const div = document.createElement('div'); div.className = 'toast'; div.innerHTML = `<span>${msg}</span>`; div.style.borderLeftColor = type === 'success' ? '#4CAF50' : '#007AFF'; let container = document.getElementById('toast-container'); if(!container) { container = document.createElement('div'); container.id='toast-container'; document.body.appendChild(container); } container.appendChild(div); setTimeout(() => div.remove(), 3000); }
function openFullSettings(tab) { document.getElementById('modal-large-settings').style.display = 'flex'; switchSettingsTab(tab); }

function togglePTZ() { console.log("PTZ is embedded now"); }

function switchEncTab(tabName) {
    document.querySelectorAll('.enc-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('enc-tab-video').style.display = 'none';
    document.getElementById('enc-tab-audio').style.display = 'none';
    event.target.classList.add('active');
    document.getElementById('enc-tab-' + tabName).style.display = 'block';
}

function switchSettingsTab(tabId) {
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    const activeTab = document.getElementById('tab-' + tabId);
    if(activeTab) activeTab.classList.add('active');

    const titleEl = document.getElementById('settings-title');
    const bodyEl = document.getElementById('settings-body-content');
    let htmlContent = '';

    // === Renamed to Video (was Stream & Mode) ===
    if (tabId === 'video') {
        titleEl.innerText = "Video Settings & Mode";
        
        let encBtnClass = currentSystemMode === 'encoder' ? 'mode-switch-btn active' : 'mode-switch-btn';
        let decBtnClass = currentSystemMode === 'decoder' ? 'mode-switch-btn active' : 'mode-switch-btn';
        
        let encClick = currentSystemMode === 'encoder' ? '' : `onclick="showRebootWarning('encoder')"`;
        let decClick = currentSystemMode === 'decoder' ? '' : `onclick="showRebootWarning('decoder')"`;
        
        htmlContent += `
            <div class="settings-subsection" style="margin-bottom:30px; border-bottom:1px solid #333; padding-bottom:20px;">
                <div class="settings-group-title"><div class="settings-group-icon">⚙️</div> Operation Mode</div>
                <div class="mode-switch-container">
                    <div class="${encBtnClass}" ${encClick}>
                        <div class="mode-btn-icon">📡</div>
                        <span>Encoder Mode</span>
                    </div>
                    <div class="${decBtnClass}" ${decClick}>
                        <div class="mode-btn-icon">🖥️</div>
                        <span>Decoder Mode</span>
                    </div>
                </div>
            </div>
        `;

        if (currentSystemMode === 'encoder') {
            htmlContent += `
                <div class="enc-settings-group no-border" style="margin-top:0;">
                    <div class="enc-group-header"><div class="enc-icon-square">Icon</div> <span style="margin-left:10px;">Input Source</span></div>
                    <div class="form-group"><label class="form-label">Video Source</label><input type="text" class="form-input darker-input" value="HDMI (Auto detect)" readonly></div>
                    <div class="form-group"><label class="form-label">Audio Source</label><select class="form-select darker-input"><option>HDMI</option><option>Analog (3.5mm)</option></select></div>
                </div>
                <div class="enc-tabs-container">
                    <div class="enc-tab active" onclick="switchEncTab('video')">Video</div>
                    <div class="enc-tab" onclick="switchEncTab('audio')">Audio</div>
                    <div class="enc-tab-line"></div>
                </div>
                <div id="enc-tab-video" style="margin-top:20px;">
                    <div class="enc-settings-group no-border">
                        <div class="form-group"><label class="form-label">Resolution</label><select class="form-select darker-input"><option>3840 x 2160</option><option>1920 x 1080</option><option>1280 x 720</option></select></div>
                        <div class="form-group"><label class="form-label">Framerate</label><select class="form-select darker-input"><option>60 FPS</option><option>30 FPS</option><option>24 FPS</option></select></div>
                        <div class="form-group"><label class="form-label">Bitrate</label><select class="form-select darker-input"><option>Auto</option><option>20 Mbps</option><option>10 Mbps</option></select></div>
                        <div class="form-group"><label class="form-label">Rate Control</label><select class="form-select darker-input"><option>CBR</option><option>VBR</option></select></div>
                        <div class="form-group"><label class="form-label">Encoding Type</label><select class="form-select darker-input"><option>H.264</option><option>H.265</option></select></div>
                    </div>
                </div>
                <div id="enc-tab-audio" style="display:none; margin-top:20px;">
                    <div class="enc-settings-group no-border">
                       <div style="height:100px; display:flex; align-items:center; justify-content:center; color:#666;">Audio specific settings here</div>
                    </div>
                </div>
                <div class="enc-settings-group with-border-top">
                    <div class="enc-group-header"><div class="enc-icon-square">Icon</div> <span style="margin-left:10px;">NDI Settings</span></div>
                    <div class="form-group"><label class="form-label">Group Name</label><input type="text" class="form-input darker-input" placeholder="NDI Group Name" value="NDI Group Name"></div>
                </div>
            `;
        } else if (currentSystemMode === 'decoder') {
            htmlContent += `
                <div>
                    <div class="settings-group-title"><div class="settings-group-icon">📺</div> Output Settings</div>
                    <div class="form-group">
                        <label class="form-label">Output Switch Mode</label>
                        <div class="mode-switch-container">
                            <div class="mode-switch-btn ${currentOutputMode === 'Single' ? 'active' : ''}" id="mode-single" onclick="switchOutputMode(1)">
                                <div class="mode-btn-icon">⬛</div><span>High Quality (4K)</span>
                            </div>
                            <div class="mode-switch-btn ${currentOutputMode === 'Quad' ? 'active' : ''}" id="mode-quad" onclick="switchOutputMode(4)">
                                <div class="mode-btn-icon">田</div><span>Multiview - Quad</span>
                            </div>
                        </div>
                    </div>
                    <div class="form-group"><label class="form-label">Resolution</label><select class="form-select"><option>3840 X 2160</option><option selected>1920 X 1080</option></select></div>
                    <div class="form-group"><label class="form-label">Color Space</label><select class="form-select"><option>RGB</option><option>YUV 4:4:4</option></select></div>
                    <div class="form-group"><label class="form-label">Audio output source</label><select class="form-select"><option>HDMI</option><option>Line Out</option></select></div>
                </div>
                <div style="margin-top:20px;">
                    <div class="settings-group-title"><div class="settings-group-icon">🔌</div> USB (Theme Mode)</div>
                    <div class="form-group"><label class="form-label">USB Output</label><div style="display:flex; gap:15px; margin-top:5px;"><label class="radio-custom"><input type="radio" name="usb"><span>On</span></label><label class="radio-custom"><input type="radio" name="usb" checked><span>Off</span></label></div></div>
                </div>
            `;
        }
    }
    
    else if (tabId === 'audio') { titleEl.innerText = "Audio Settings"; htmlContent = `<div class="settings-subsection"><div class="settings-subsection-title">Audio Settings</div><div class="form-group"><label class="form-label">Source Select</label><select class="form-select"><option>Auto</option><option>HDMI</option><option>3.5mm</option></select></div><div class="form-group"><label class="form-label">Volume (Gain)</label><input type="range" class="ptz-range" style="width:100%;"></div></div>`; } 
    else if (tabId === 'network') { titleEl.innerText = "IP Configuration"; htmlContent = `<div class="settings-subsection"><div class="settings-subsection-title">IP Configuration</div><div class="form-group"><label class="form-label">Mode</label><select class="form-select"><option>DHCP</option><option>Static IP</option></select></div><div class="form-group"><label class="form-label">IP Address</label><input type="text" class="form-input" value="192.168.1.100"></div></div>`; }
    else if (tabId === 'ndi') { titleEl.innerText = "Advanced NDI"; htmlContent = `<div class="settings-subsection"><div class="settings-subsection-title">NDI Configuration</div><div class="form-group"><label class="form-label">Connection Mode (傳輸模式)</label><select class="form-select"><option>Auto (RUDP)</option><option>TCP</option><option>Multicast</option></select></div><div class="form-group"><label class="form-label">Discovery Server</label><input type="text" class="form-input" placeholder="IP Address"></div><div class="form-group"><label class="form-label">Multicast Address</label><input type="text" class="form-input" placeholder="e.g. 239.255.0.1"></div></div>`; }
    else if (tabId === 'general') { titleEl.innerText = "General Settings"; htmlContent = `<div class="form-group"><label class="form-label">Device Name</label><input type="text" class="form-input" value="AVer NC30"></div><div class="form-group"><label class="form-label">Location</label><input type="text" class="form-input" value="Studio A"></div><div class="form-group"><label class="form-label">Language</label><select class="form-select"><option>English</option><option>Traditional Chinese</option></select></div>`; }
    else if (tabId === 'account') { titleEl.innerText = "Account"; htmlContent = `<div class="form-group"><label class="form-label">Admin Password</label><input type="password" class="form-input" placeholder="New Password"></div><button class="btn btn-primary" style="margin-top:5px;">Update Password</button>`; }
    else if (tabId === 'datetime') { titleEl.innerText = "Date & Time"; htmlContent = `<div class="form-group"><label class="form-label">Mode</label><select class="form-select"><option>NTP Server</option><option>Manual</option></select></div><div class="form-group"><label class="form-label">NTP Server</label><input type="text" class="form-input" value="pool.ntp.org"></div>`; }
    else if (tabId === 'maintenance') { titleEl.innerText = "Maintenance"; htmlContent = `<div class="settings-subsection"><div class="settings-subsection-title">Firmware</div><button class="btn btn-outline" style="width:100%;">Check for Updates</button></div><div class="settings-subsection"><div class="settings-subsection-title">Config</div><div style="display:flex; gap:10px;"><button class="btn btn-outline" style="flex:1;">Export Settings</button><button class="btn btn-outline" style="flex:1;">Import Settings</button></div></div><div class="settings-subsection"><div class="settings-subsection-title">System</div><div style="display:flex; gap:10px;"><button class="btn btn-danger" style="flex:1;">Reboot</button><button class="btn btn-danger" style="flex:1;">Factory Default</button></div></div>`; }
    else if (tabId === 'system') { switchSettingsTab('general'); return; } // Default jump

    bodyEl.innerHTML = htmlContent;
}

const ptzPanel = document.getElementById("ptz-panel");
const ptzHeader = document.getElementById("ptz-panel-header");
let isDragging = false, startX, startY, initialLeft, initialTop;
ptzHeader.onmousedown = (e) => { isDragging = true; startX = e.clientX; startY = e.clientY; initialLeft = ptzPanel.offsetLeft; initialTop = ptzPanel.offsetTop; e.preventDefault(); };
document.onmousemove = (e) => { if(isDragging) { ptzPanel.style.left = (initialLeft + e.clientX - startX) + "px"; ptzPanel.style.top = (initialTop + e.clientY - startY) + "px"; } };
document.onmouseup = () => isDragging = false;
window.onclick = function(e) { if(!e.target.matches('.slot-menu-btn')) document.querySelectorAll('.slot-dropdown').forEach(el => el.classList.remove('show')); if(!e.target.matches('#btn-account-avatar')) document.getElementById('accountMenu').classList.remove('show'); }

// === MODIFIED LOGOUT ===
function actionLogout() {
    document.getElementById('modal-logout-confirm').style.display = 'flex';
    document.getElementById('accountMenu').classList.remove('show');
}

function confirmLogout() {
    document.getElementById('modal-logout-confirm').style.display = 'none';
    document.getElementById('app-shell').style.display = 'none';
    document.getElementById('page-login').style.display = 'flex';
    document.getElementById('page-login').style.opacity = '1';
    currentSystemMode = null;
    currentUserRole = 'admin';
    document.querySelector('#page-login input[type="text"]').value = 'admin';
    document.querySelector('#page-login input[type="password"]').value = '';
    document.querySelector('#page-login .btn-primary').innerHTML = 'LOGIN';
}
