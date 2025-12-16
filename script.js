/* script.js - Logic for NC30 Demo (V14.0) */

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
    if(document.getElementById('view-decoder').style.display !== 'none') {
        renderSourceList();
        updateLiveHeader();
    }
});

// === Refresh with Loading ===
function refreshSourceList() {
    const tbody = document.querySelector('#source-list-body');
    const btn = document.getElementById('btn-refresh-list');
    if(btn) { btn.innerText = "Loading..."; btn.disabled = true; }
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px;"><div class="loading-spinner-container"><div class="spinner-ring"></div><div style="margin-top:10px; color:#888; font-size:13px;">Updating sources...</div></div></td></tr>';
    setTimeout(() => {
        renderSourceList(); 
        if(btn) { btn.innerText = "Refresh"; btn.disabled = false; }
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
        const slot =
