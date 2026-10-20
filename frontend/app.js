// Inisialisasi Lucide Icons
lucide.createIcons();

// State Aplikasi & Simulasi Auth
let currentUser = JSON.parse(localStorage.getItem('bantuyuk_user')) || null;
let mapInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    initCharts();
});

// Fungsi Autentikasi
function switchAuthView(view) {
    const loginView = document.getElementById('loginView');
    const registerView = document.getElementById('registerView');
    if (view === 'register') {
        loginView.classList.add('hidden');
        registerView.classList.remove('hidden');
    } else {
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
    }
}

function togglePassword(fieldId) {
    const input = document.getElementById(fieldId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const role = email.includes('relawan') ? 'Relawan' : 'Donatur';
    
    currentUser = { name: email.split('@')[0], email: email, role: role };
    localStorage.setItem('bantuyuk_user', JSON.stringify(currentUser));
    
    checkAuthState();
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const role = document.getElementById('regRole').value;

    currentUser = { name: name, email: email, role: role };
    localStorage.setItem('bantuyuk_user', JSON.stringify(currentUser));
    
    alert('Akun berhasil dibuat! Mengalihkan ke dashboard...');
    checkAuthState();
}

function handleLogout() {
    localStorage.removeItem('bantuyuk_user');
    currentUser = null;
    checkAuthState();
}

function checkAuthState() {
    const authContainer = document.getElementById('authContainer');
    const appContainer = document.getElementById('appContainer');

    if (currentUser) {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        // Update User UI Info
        document.getElementById('userNameDisplay').textContent = currentUser.name;
        document.getElementById('userRoleDisplay').textContent = currentUser.role;
        document.getElementById('userAvatarText').textContent = currentUser.name.charAt(0).toUpperCase();
        document.getElementById('topAvatar').textContent = currentUser.name.charAt(0).toUpperCase();

        // Trigger map initialization if GIS view is accessed
        setTimeout(() => initMap(), 300);
    } else {
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
}

// Navigasi Tabs
function switchTab(tabId) {
    document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('bg-navy-700', 'text-white'));
    
    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    const activeBtn = document.querySelector(`[data-target="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add('bg-navy-700', 'text-white');

    if (tabId === 'gis' && mapInstance) {
        mapInstance.invalidateSize();
    }
}

// Inisialisasi Grafik (Chart.js)
function initCharts() {
    const trendCtx = document.getElementById('trendChart');
    if (trendCtx) {
        new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'],
                datasets: [{
                    label: 'Tren Donasi (Rp)',
                    data: [350000000, 780000000, 1150000000, 1560000000],
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }

    const catCtx = document.getElementById('categoryChart');
    if (catCtx) {
        new Chart(catCtx, {
            type: 'doughnut',
            data: {
                labels: ['Bencana Alam', 'Kesehatan', 'Pendidikan', 'Kemanusiaan'],
                datasets: [{
                    data: [45, 25, 20, 10],
                    backgroundColor: ['#06b6d4', '#14b8a6', '#3b82f6', '#6366f1'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }
}

// Inisialisasi Peta Leaflet.js
function initMap() {
    if (mapInstance) return;
    
    mapInstance = L.map('gisMap').setView([-2.548926, 118.014863], 5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors & CARTO',
        maxZoom: 18
    }).addTo(mapInstance);

    // Marker Demo Bencana di Indonesia
    const locations = [
        { lat: 3.5952, lng: 98.6722, title: "Banjir Deli Serdang", severity: "Kritis", desc: "Permukiman terendam banjir 1.5 meter." },
        { lat: -6.8324, lng: 107.0543, title: "Gempa Cianjur", severity: "Kritis", desc: "Kerusakan infrastruktur sekolah dan rumah warga." },
        { lat: -0.9471, lng: 100.4172, title: "Longsor Padang", severity: "Sedang", desc: "Akses jalan tertimbun material longsor." }
    ];

    locations.forEach(loc => {
        const color = loc.severity === 'Kritis' ? '#f43f5e' : '#f59e0b';
        const markerHtml = `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color};"></div>`;
        const customIcon = L.divIcon({ html: markerHtml, className: 'custom-gis-marker' });

        L.marker([loc.lat, loc.lng], { icon: customIcon })
            .addTo(mapInstance)
            .on('click', () => {
                document.getElementById('selectedLocTitle').textContent = loc.title;
                document.getElementById('selectedLocStatus').textContent = loc.severity;
                document.getElementById('selectedLocDesc').textContent = loc.desc;
            });
    });
}

// Simulasi Transaksi Donasi
function simulateDonation() {
    const nominal = document.getElementById('donationNominal').value;
    alert(`Simulasi Pembayaran QRIS senilai Rp ${Number(nominal).toLocaleString('id-ID')} berhasil dibuat! Menunggu konfirmasi webhook payment gateway...`);
    switchTab('laporan');
}