/* script.js - Final Fixed V18 */

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

document.addEventListener('DOMContentLoaded', () => {
    // Wait for login
});

function doLogin() {
    document.querySelector('#page-login .btn-primary').innerHTML = "Logging in...";
    setTimeout(() => {
        document.getElementById('page-login').style.display = 'none';
        document.getElementById('app-shell').style.display = 'grid'; 
        performSwitch('decoder'); // Init Default Mode
    }, 800);
}

// === Mode Switch Logic (Fixed) ===
function performSwitch(mode) {
    currentSystemMode = mode;
    updateModeSwitcherUI(mode); // Update Top Bar Buttons
    enterView(mode);
}

function updateModeSwitcherUI(mode) {
    // Remove active from all top buttons
    document.querySelectorAll('.mode-switch-item').forEach(btn => btn.classList.remove('active'));
    // Add active to current
    if (mode === 'encoder') {
        const btn = document.getElementById('top-btn-enc');
        if(btn) btn.classList.add('active');
    } else {
        const btn = document.getElementById('top-btn-dec');
        if(btn) btn.classList.add('active');
    }
}

function checkModeSwitch(targetMode) {
    if (!currentSystemMode) { performSwitch(targetMode); return; }
    if (currentSystemMode === targetMode) return; // Already in mode
    showRebootWarning(targetMode);
}

function showRebootWarning(targetMode) {
    const box = document.getElementById('modalContentBox');
    const overlay = document.getElementById('modalOverlay');
    box.style.background = "#1a1a1a"; 
    box.style.border = "1px solid #333"; 
    box.style.width = "400px"; 
    box.style.textAlign = "center";
    
    box.innerHTML = `
        <h3 style="color:#fff; margin-bottom:20px; font-size:18px;">Reboot Required</h3>
        <p style="color:#ccc; font-size:13px; margin-bottom:25px;">Switching modes requires a system reboot.</p>
        <div style="display:flex; justify-content:center; gap:15px;">
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-danger" style="background:transparent; border:1px solid #D32F2F;" onclick="confirmReboot('${targetMode}')">Reboot</button>
        </div>
    `;
    overlay.style.display = 'flex';
}

function confirmReboot(targetMode) {
    closeModal();
    document.getElementById('reboot-overlay').style.display = 'flex';
    setTimeout(() => {
        document.getElementById('reboot-overlay').style.display = 'none';
        performSwitch(targetMode);
    }, 2000);
}

function enterView(mode) {
    const badge = document.getElementById('current-mode-badge');
    
    document.getElementById('view-encoder').style.display = 'none';
    document.getElementById('view-decoder').style.display = 'none';

    if (mode === 'encoder') {
        document.documentElement.style.setProperty('--theme-color', '#007AFF');
        document.getElementById('view-encoder').style.display = 'block';
        if(badge) { badge.innerText = 'ENCODER MODE'; badge.style.color = '#007AFF'; badge.style.borderColor = '#007AFF'; }
    } else {
        document.documentElement.style.setProperty('--theme-color', '#FF9500'); 
        document.getElementById('view-decoder').style.display = 'block';
        if(badge) { badge.innerText = 'DECODER MODE'; badge.style.color = '#FF9500'; badge.style.borderColor = '#FF9500'; }
        
        // Refresh Lists
        renderSourceList();
        updateLiveHeader();
        updatePTZButtonState();
        // Default select slot 1 if nothing selected
        if(!document.querySelector('.preview-slot.selected-slot')) {
            selectSlot('slot-1');
        }
    }
}

// === List & PTZ Logic ===
function refreshSourceList() {
    const tbody = document.querySelector('#source-list-body');
    const btn = document.getElementById('btn-refresh-list');
    if(btn) { btn.innerText = "Loading..."; btn.disabled = true; }
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;"><div class="loading-spinner-container"><div class="spinner-ring"></div><div style="margin-top:10px; color:#888; font-size:13px;">Updating sources...</div></div></td></tr>';
    setTimeout(() => {
        renderSourceList(); 
        if(btn) { btn.innerText = "Refresh"; btn.disabled = false; }
        showToast("Source list refreshed", "success");
    }, 1000);
}

function updateLiveHeader() {
    const container = document.getElementById('live-header-info');
    if(!container) return;
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

function selectSlot(slotId) { 
    document.querySelectorAll('.preview-slot').forEach(el => el.classList.remove('selected-slot')); 
    const el = document.getElementById(slotId); 
    if(el) { 
        el.classList.add('selected-slot'); 
        
        const headerBtn = document.getElementById('btn-ptz-ctrl');
        const sourceId = el.dataset.sourceId;
        const windowNum = slotId.split('-')[1];
        
        if (!sourceId) {
            if(headerBtn) headerBtn.disabled = true;
            updatePTZPanelInfo(windowNum, null);
            setPTZPanelState(false);
        } else {
            const sourceObj = sourcesData.find(s => s.id === sourceId);
            if (sourceObj && (sourceObj.status === 'offline' || sourceObj.status === 'error')) {
                if(headerBtn) headerBtn.disabled = false;
                updatePTZPanelInfo(windowNum, null, true); 
                setPTZPanelState(false); 
            } else {
                if(headerBtn) headerBtn.disabled = false;
                updatePTZPanelInfo(windowNum, sourceObj ? sourceObj.name : "Unknown", false);
                setPTZPanelState(true); 
            }
        }
    } 
}

function updatePTZButtonState() {
    const selectedSlot = document.querySelector('.preview-slot.selected-slot');
    if (selectedSlot) selectSlot(selectedSlot.id);
    else {
        const btn = document.getElementById('btn-ptz-ctrl');
        if(btn) btn.disabled = true;
    }
}

function updatePTZPanelInfo(windowNum, sourceName, isError = false) {
    const info = document.getElementById('ptz-target-info');
    if(!info) return;
    if (isError) {
        info.innerText = `Target: Unavailable (Signal Lost)`;
        info.style.color = "#D32F2F"; 
    } else if(sourceName) {
        info.innerText = `Target: Window ${windowNum} (${sourceName})`;
        info.style.color = "#007AFF"; 
    } else {
        info.innerText = `Target: None`;
        info.style.color = "#888"; 
    }
}

function setPTZPanelState(enabled) {
    const wrapper = document.getElementById('ptz-controls-wrapper');
    if(!wrapper) return;
    if(enabled) wrapper.classList.remove('disabled-ui');
    else wrapper.classList.add('disabled-ui');
}

function savePreset() {
    const wrapper = document.getElementById('ptz-controls-wrapper');
    if(wrapper && wrapper.classList.contains('disabled-ui')) {
        showToast("Cannot save preset: Source unavailable", "error");
        return;
    }
    showToast("Preset Saved", "success");
}

function renderSourceList() {
    const tbody = document.querySelector('#source-list-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    sourcesData.forEach(src => {
        const tr = document.createElement('tr');
        tr.className = `source-row ${src.status === 'offline' ? 'offline' : ''}`;
        tr.draggable = true;
        tr.setAttribute('ondragstart', 'drag(event)');
        tr.setAttribute('data-json', JSON.stringify(src));
        
        let statusHtml = `<span style="color:#4CAF50;">Online</span>`;
        if(src.status === 'error') statusHtml = `<span class="src-status-error">${src.errorMsg}</span>`;
        if(src.status === 'offline') statusHtml = `<span style="color:#888;">Offline</span>`;
        let thumbHtml = src.status === 'offline' ? `<div class="thumb-box offline"><span>Offline</span></div>` : `<div class="thumb-box"><img src="${src.thumb}"></div>`;
        
        tr.innerHTML = `
            <td class="drag-col"><span class="drag-handle-icon">⋮⋮</span></td>
            <td class="thumb-col">${thumbHtml}</td>
            <td class="info-col">
                <div class="src-name" style="${src.status==='offline'?'color:#888':''}">${src.name}</div>
                <div class="src-meta">
                    ${src.ip} <span style="color:#555; margin:0 5px;">|</span> 
                    ${src.group} <span style="color:#555; margin:0 5px;">|</span> 
                    ${statusHtml}
                </div>
            </td>
            <td class="preset-col">${src.id === 'src_01' ? '<span class="preset-badge">1</span>' : ''}</td>
            <td class="action-col">
                <button class="btn-icon-action" onclick="openEditSourceModal('${src.id}')" title="Edit">✎</button>
                <button class="btn-icon-action danger" onclick="askRemoveSource('${src.id}')" title="Remove">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ... (Rest of standard helper functions: Modal, Drag, Toast, etc.) ...
function showModal(type) { if(type === 'Add Manual Source') { editingSourceId = null; renderSourceModal('Add Source', '', '', ''); } }
function openEditSourceModal(id) { const src = sourcesData.find(s => s.id === id); if(!src) return; editingSourceId = id; renderSourceModal('Edit Source', src.name, src.ip, src.group); }
function renderSourceModal(title, name, ip, group) {
    const box = document.getElementById('modalContentBox'); document.getElementById('modalOverlay').style.display = 'flex';
    box.innerHTML = `<div class="modal-header-row"><h3 style="margin:0; color:#fff; font-size:16px;">${title}</h3><span class="modal-close-x" onclick="closeModal()">✕</span></div><div class="modal-body-add-source"><div class="form-group"><label class="form-label">Source Name</label><input type="text" id="inputSrcName" class="form-input" value="${name}" placeholder="Camera Name" onkeyup="checkModalValidity()"></div><div class="form-group"><label class="form-label">Group</label><input type="text" id="inputSrcGroup" class="form-input" value="${group}" placeholder="Group"></div><div class="form-group"><label class="form-label">IP Address</label><div style="display:flex; gap:10px;"><input type="text" id="inputSrcIP" class="form-input" value="${ip}" placeholder="192.168.x.x" onkeyup="checkModalValidity()"><button class="btn btn-outline" style="padding:0 12px;" onclick="openAutoSearch()">🔍</button></div></div></div><div class="modal-footer"><button class="modal-footer-btn" onclick="closeModal()">Cancel</button><button class="modal-footer-btn" id="btnSaveSource" onclick="saveSourceData()" disabled>Save</button></div>`;
    checkModalValidity();
}
function checkModalValidity() { const n = document.getElementById('inputSrcName').value.trim(); const i = document.getElementById('inputSrcIP').value.trim(); const b = document.getElementById('btnSaveSource'); if(n && i) { b.disabled = false; b.style.opacity = 1; b.style.cursor = 'pointer'; } else { b.disabled = true; b.style.opacity = 0.5; b.style.cursor = 'not-allowed'; } }
function openAutoSearch() { document.getElementById('modal-auto-search').style.display = 'flex'; selectedAutoSearchIp = null; const l = document.getElementById('search-list-content'); l.innerHTML = ''; const d = [{ip:'192.168.1.101',name:'Camera 01'},{ip:'192.168.1.105',name:'PTZ Cam'},{ip:'192.168.1.200',name:'PC Stream'},{ip:'192.168.1.205',name:'Meeting Room'}]; d.forEach(dev => { const el = document.createElement('div'); el.className = 'search-list-item'; el.innerText = `${dev.ip} (${dev.name})`; el.onclick = function() { document.querySelectorAll('.search-list-item').forEach(i => i.classList.remove('selected')); el.classList.add('selected'); selectedAutoSearchIp = dev.ip; }; l.appendChild(el); }); }
function closeAutoSearch() { document.getElementById('modal-auto-search').style.display = 'none'; }
function confirmAutoSearch() { if(selectedAutoSearchIp) { document.getElementById('inputSrcIP').value = selectedAutoSearchIp; checkModalValidity(); closeAutoSearch(); } else { showToast("Please select an IP", "error"); } }
function saveSourceData() { const n = document.getElementById('inputSrcName').value; const i = document.getElementById('inputSrcIP').value; const g = document.getElementById('inputSrcGroup').value; if(editingSourceId) { const idx = sourcesData.findIndex(s => s.id === editingSourceId); if(idx !== -1) { sourcesData[idx].name = n; sourcesData[idx].ip = i; sourcesData[idx].group = g; updatePreviewLabels(editingSourceId, n); showToast(`Updated: ${n}`, "success"); } } else { const id = 'src_' + Date.now(); sourcesData.push({ id: id, name: n, ip: i, group: g, status: 'online', thumb: 'https://picsum.photos/id/237/100/56' }); showToast(`Added: ${n}`, "success"); } renderSourceList(); closeModal(); updateLiveHeader(); }
function askRemoveSource(id) { sourceToRemoveId = id; document.getElementById('modal-remove-confirm').style.display = 'flex'; }
function confirmRemoveSource() { if(sourceToRemoveId) { removeSource(null, sourceToRemoveId); sourcesData = sourcesData.filter(s => s.id !== sourceToRemoveId); renderSourceList(); showToast("Source Removed", "success"); document.getElementById('modal-remove-confirm').style.display = 'none'; sourceToRemoveId = null; } }
function cancelRemoveSource() { document.getElementById('modal-remove-confirm').style.display = 'none'; sourceToRemoveId = null; }
function drag(ev) { ev.dataTransfer.setData("application/json", ev.currentTarget.getAttribute("data-json")); }
function allowDrop(ev) { ev.preventDefault(); ev.currentTarget.classList.add('drag-over'); }
function drop(ev) { ev.preventDefault(); const s = ev.currentTarget; s.classList.remove('drag-over'); const d = JSON.parse(ev.dataTransfer.getData("application/json")); s.dataset.sourceId = d.id; const w = s.id.split('-')[1]; 
if(d.status === 'offline') { s.classList.add('offline-state'); s.innerHTML = `<div class="slot-label">Window ${w}</div><div class="offline-overlay"><div class="offline-icon">⚠️</div><div class="offline-text">Signal Lost</div></div>${renderSlotMenu(s.id)}`; } else { s.classList.remove('offline-state'); s.innerHTML = `<div class="video-layer" style="background-image: url('${d.thumb || 'https://picsum.photos/id/237/400/300'}');"></div><div class="video-overlay-gradient"></div><div class="slot-label">Window ${w}</div><div class="slot-content"><div class="slot-name">${d.name}</div><div class="slot-meta" style="color:#4CAF50;">● Live</div></div>${renderSlotMenu(s.id)}`; } s.classList.add('active-slot'); selectSlot(s.id); updateLiveHeader(); }
function renderSlotMenu(sid) { return `<button class="slot-menu-btn" onclick="toggleSlotMenu('${sid}', event)">•••</button><div class="slot-dropdown" id="menu-${sid}"><button class="slot-action danger" onclick="removeSource('${sid}')">Clear</button></div>`; }
function toggleSlotMenu(sid, e) { e.stopPropagation(); document.querySelectorAll('.slot-dropdown').forEach(el => el.classList.remove('show')); const m = document.getElementById(`menu-${sid}`); if(m) m.classList.add('show'); }
function removeSource(sid, srcId) { if(srcId) { const s = document.querySelector(`.preview-slot[data-source-id="${srcId}"]`); if(s) sid = s.id; else return; } const slot = document.getElementById(sid); if(slot) { delete slot.dataset.sourceId; slot.classList.remove('active-slot', 'offline-state'); slot.innerHTML = `<div class="slot-label">Window ${sid.split('-')[1]}</div><div class="slot-content" style="text-align:center;"><div class="slot-name" style="color:#555;">[ Drag Source Here ]</div></div>`; updateLiveHeader(); selectSlot(sid); } }
function switchOutputMode(c) { currentOutputMode = c === 1 ? 'Single' : 'Quad'; document.querySelectorAll('.mode-switch-btn').forEach(b => b.classList.remove('active')); if(c === 1) document.getElementById('mode-single').classList.add('active'); else document.getElementById('mode-quad').classList.add('active'); const l = document.getElementById('outputLayout'); l.className = c === 1 ? 'output-layout-single' : 'output-layout-quad'; l.innerHTML = ''; for(let i=1; i<=c; i++) { l.innerHTML += `<div class="preview-slot" id="slot-${i}" onclick="selectSlot('slot-${i}')" ondrop="drop(event)" ondragover="allowDrop(event)"><div class="slot-label">Window ${i}</div><div class="slot-content" style="text-align:center;"><div class="slot-name" style="color:#555;">[ Drag Source Here ]</div></div></div>`; } selectSlot('slot-1'); updateLiveHeader(); }
function toggleAccountMenu() { document.getElementById('accountMenu').classList.toggle('show'); }
function closeModal(e) { if(!e || e.target.id === 'modalOverlay' || e.target.classList.contains('modal-close-x')) document.getElementById('modalOverlay').style.display = 'none'; }
function closeSpecificModal(id) { document.getElementById(id).style.display = 'none'; }
function showToast(msg, type) { const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = `<span>${msg}</span>`; d.style.borderLeftColor = type === 'success' ? '#4CAF50' : '#007AFF'; let c = document.getElementById('toast-container'); if(!c) { c = document.createElement('div'); c.id='toast-container'; document.body.appendChild(c); } c.appendChild(d); setTimeout(() => d.remove(), 3000); }
function openFullSettings(t) { document.getElementById('modal-large-settings').style.display = 'flex'; switchSettingsTab(t); }
function switchEncTab(t) { document.querySelectorAll('.enc-tab').forEach(x => x.classList.remove('active')); document.getElementById('enc-tab-video').style.display = 'none'; document.getElementById('enc-tab-audio').style.display = 'none'; event.target.classList.add('active'); document.getElementById('enc-tab-' + t).style.display = 'block'; }
function switchSettingsTab(t) { document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active')); const a = document.getElementById('tab-' + t); if(a) a.classList.add('active'); const h = document.getElementById('settings-title'); const b = document.getElementById('settings-body-content'); h.innerText = t.toUpperCase() + " Settings"; b.innerHTML = `<div style="padding:20px; color:#aaa;">Content for ${t} settings...</div>`; }
const ptzPanel = document.getElementById("ptz-panel"); const ptzHeader = document.getElementById("ptz-panel-header"); let isDragging = false, startX, startY, initialLeft, initialTop; ptzHeader.onmousedown = (e) => { isDragging = true; startX = e.clientX; startY = e.clientY; initialLeft = ptzPanel.offsetLeft; initialTop = ptzPanel.offsetTop; e.preventDefault(); }; document.onmousemove = (e) => { if(isDragging) { ptzPanel.style.left = (initialLeft + e.clientX - startX) + "px"; ptzPanel.style.top = (initialTop + e.clientY - startY) + "px"; } }; document.onmouseup = () => isDragging = false; function togglePTZ() { if(ptzPanel.style.display === 'flex') ptzPanel.style.display = 'none'; else { ptzPanel.style.display = 'flex'; if(!ptzPanel.style.top) { ptzPanel.style.top = '100px'; ptzPanel.style.left = 'calc(50% - 130px)'; } } } window.onclick = function(e) { if(!e.target.matches('.slot-menu-btn')) document.querySelectorAll('.slot-dropdown').forEach(el => el.classList.remove('show')); if(!e.target.matches('#btn-account-avatar')) document.getElementById('accountMenu').classList.remove('show'); }
function actionLogout() { document.getElementById('modal-logout-confirm').style.display = 'flex'; document.getElementById('accountMenu').classList.remove('show'); }
function confirmLogout() { document.getElementById('modal-logout-confirm').style.display = 'none'; document.getElementById('app-shell').style.display = 'none'; document.getElementById('page-login').style.display = 'flex'; currentSystemMode = null; currentUserRole = 'admin'; document.getElementById('page-login').style.opacity = '1'; }
