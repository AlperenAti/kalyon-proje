// Constants
const PROJECTS_STORAGE_KEY = 'kalyon_projects';
const TAB_NAMES = {
    // DİREKT GİDERLER
    'ZAİ': 'Zemin ve Altyapı İşleri',
    'YAP': 'Yapısal İşler',
    'MİM': 'Mimari İşler',
    'CEP': 'Dış Cephe ve Çatı İşleri',
    'ELK': 'Elektrik Tesisat İşleri',
    'PEY': 'Peyzaj ve Dış Saha İşleri',
    'ICT': 'ICT İşleri',
    'EKP': 'Ekipmanlar ve Özel Sistemler',
    'MEK': 'Mekanik Tesisat İşleri',
    'MAK': 'İş Makineleri Giderleri',
    
    // ENDİREKT GİDERLER
    'MOB': 'Mobilizasyon Giderleri',
    'DEM': 'Demobilizasyon Giderleri',
    'PER': 'Endirekt Personel Ücret Giderleri',
    'HIZ': 'Hizmet Maliyetleri',
    'OFI': 'Ofis Yönetimi Maliyetleri',
    'BAN': 'Banka Masrafları ve Finansal Giderler',
    'VER': 'Vergi Giderleri',
    'TAS': 'Tasarım ve Teknik Danışmanlık',
    'ISG': 'İSG ve Çevre Giderleri',
    'KAL': 'Kalite Güvence ve Kalite Kontrol'
};

// State
let projects = [];
let currentProjectId = null;
let items = [];
let currentTab = 'ZAİ';
let chartInstance = null;

// DOM Elements
const tabNav = document.getElementById('tabNav');
const currentTabTitle = document.getElementById('currentTabTitle');
const kpiTotalBudget = document.getElementById('kpiTotalBudget');
const kpiRealizedBudget = document.getElementById('kpiRealizedBudget');
const kpiTotalContract = document.getElementById('kpiTotalContract');
const kpiDirectCost = document.getElementById('kpiDirectCost');
const kpiManHour = document.getElementById('kpiManHour');
const kpiActualManHour = document.getElementById('kpiActualManHour');
const boqTableBody = document.getElementById('boqTableBody');
const emptyState = document.getElementById('emptyState');

// Drawers and Modals
const addItemModal = document.getElementById('addItemModal');
const importExcelModal = document.getElementById('importExcelModal');
const detailDrawer = document.getElementById('detailDrawer');
const newItemBtn = document.getElementById('newItemBtn');
const importExcelBtn = document.getElementById('importExcelBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeImportModalBtn = document.getElementById('closeImportModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const closeDetailDrawerBtn = document.getElementById('closeDetailDrawerBtn');
const addItemForm = document.getElementById('addItemForm');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const toast = document.getElementById('toast');

const homeView = document.getElementById('homeView');
const projectView = document.getElementById('projectView');
const budgetSummaryView = document.getElementById('budgetSummaryView');
const projectsGrid = document.getElementById('projectsGrid');
const addProjectModal = document.getElementById('addProjectModal');
const addProjectForm = document.getElementById('addProjectForm');
const editProjectModal = document.getElementById('editProjectModal');
const editProjectForm = document.getElementById('editProjectForm');

let pieChartInstance = null;
let barChartInstance = null;
let financialChartInstance = null;
let manHourChartInstance = null;

// Helper: Format Currency
const formatCurrency = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
const formatNumber = (val) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

// Helper: Resize Image
function resizeImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.8));
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

// Data Migration
function migrateData() {
    projects = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY)) || [];
    const legacyData = localStorage.getItem('kalyon_boq_data');
    if (legacyData) {
        const parsed = JSON.parse(legacyData);
        if (parsed.length > 0 && projects.length === 0) {
            const defaultProjectId = Date.now().toString();
            const defaultProject = {
                id: defaultProjectId,
                name: "Mevcut Proje",
                description: "Önceki sürümden aktarılan veriler",
                image: "https://images.unsplash.com/photo-1541888081622-1b151ac529d8?q=80&w=600&auto=format&fit=crop",
                createdAt: new Date().toISOString()
            };
            projects.push(defaultProject);
            localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
            localStorage.setItem(`kalyon_boq_data_${defaultProjectId}`, legacyData);
            localStorage.removeItem('kalyon_boq_data');
        }
    }
}

// Initialization
function init() {
    // Check Authentication
    if (sessionStorage.getItem('kalyon_authenticated') !== 'true') {
        document.getElementById('loginView').classList.remove('hidden');
        document.getElementById('homeView').classList.add('hidden');
    } else {
        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('homeView').classList.remove('hidden');
    }

    migrateData();
    setupEventListeners();
    
    if (sessionStorage.getItem('kalyon_authenticated') === 'true') {
        renderHome();
    }
}

// Theme Initialization
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
}

function setupEventListeners() {
    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('loginUsername').value;
            const pass = document.getElementById('loginPassword').value;
            const err = document.getElementById('loginError');
            
            if (user === 'admin' && pass === 'emrahthemaestro') {
                sessionStorage.setItem('kalyon_authenticated', 'true');
                document.getElementById('loginView').classList.add('hidden');
                document.getElementById('homeView').classList.remove('hidden');
                err.classList.add('hidden');
                renderHome();
            } else {
                err.classList.remove('hidden');
            }
        });
    }

    // Summary Tabs
    document.querySelectorAll('.summary-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.summary-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.summary-tab-content').forEach(c => c.classList.add('hidden'));
            
            e.target.classList.add('active');
            const targetId = e.target.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('hidden');
            
            if(typeof renderBudgetSummary === 'function') renderBudgetSummary();
        });
    });

    // Theme Toggle
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    themeToggleBtn.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            themeToggleBtn.innerHTML = '<i class="ph ph-moon"></i>';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.innerHTML = '<i class="ph ph-sun"></i>';
        }
        
        // Re-render chart if it exists to update colors
        if(chartInstance) {
            chartInstance.update();
        }
    });

    document.getElementById('themeToggleHomeBtn').addEventListener('click', () => {
        document.getElementById('themeToggleBtn').click();
        const themeToggleHomeBtn = document.getElementById('themeToggleHomeBtn');
        let theme = document.documentElement.getAttribute('data-theme');
        themeToggleHomeBtn.innerHTML = theme === 'dark' ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
    });
    
    // Set initial home theme button state
    if (currentTheme === 'dark') {
        document.getElementById('themeToggleHomeBtn').innerHTML = '<i class="ph ph-sun"></i>';
    }

    // Projects & Home
    document.getElementById('newProjectBtn').addEventListener('click', () => {
        addProjectForm.reset();
        addProjectModal.classList.remove('hidden');
    });

    document.getElementById('importKalyonBtn').addEventListener('click', () => {
        document.getElementById('importKalyonInput').click();
    });

    document.getElementById('importKalyonInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const imported = JSON.parse(event.target.result);
                if (imported.project && imported.data) {
                    const newId = Date.now().toString();
                    const newProject = { ...imported.project, id: newId };
                    projects.push(newProject);
                    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
                    localStorage.setItem(`kalyon_boq_data_${newId}`, JSON.stringify(imported.data));
                    renderHome();
                    
                    const toastSpan = toast.querySelector('span');
                    toastSpan.textContent = `Proje başarıyla içe aktarıldı!`;
                    toast.classList.remove('hidden');
                    toast.classList.add('show');
                    setTimeout(() => {
                        toast.classList.remove('show');
                        setTimeout(() => toast.classList.add('hidden'), 300);
                    }, 2000);
                } else {
                    alert("Geçersiz proje dosyası.");
                }
            } catch(err) {
                alert("Dosya okunamadı.");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    document.getElementById('closeProjectModalBtn').addEventListener('click', () => {
        addProjectModal.classList.add('hidden');
    });

    document.getElementById('cancelProjectModalBtn').addEventListener('click', () => {
        addProjectModal.classList.add('hidden');
    });

    addProjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('projectImageFile');
        const defaultImage = document.getElementById('projectImage').value || 'https://images.unsplash.com/photo-1541888081622-1b151ac529d8?q=80&w=600&auto=format&fit=crop';
        
        const saveNewProject = (imageData) => {
            const newProject = {
                id: Date.now().toString(),
                name: document.getElementById('projectName').value,
                description: document.getElementById('projectDesc').value,
                image: imageData,
                createdAt: new Date().toISOString()
            };
            projects.push(newProject);
            localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
            addProjectModal.classList.add('hidden');
            renderHome();
        };

        if (fileInput.files && fileInput.files[0]) {
            resizeImage(fileInput.files[0], saveNewProject);
        } else {
            saveNewProject(defaultImage);
        }
    });

    document.getElementById('closeEditProjectModalBtn').addEventListener('click', () => {
        editProjectModal.classList.add('hidden');
    });

    document.getElementById('cancelEditProjectModalBtn').addEventListener('click', () => {
        editProjectModal.classList.add('hidden');
    });

    document.getElementById('deleteProjectBtn').addEventListener('click', () => {
        const id = document.getElementById('editProjectId').value;
        if(confirm('Bu projeyi ve içindeki tüm verileri silmek istediğinize emin misiniz?')) {
            projects = projects.filter(p => p.id !== id);
            localStorage.removeItem(`kalyon_boq_data_${id}`);
            localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
            editProjectModal.classList.add('hidden');
            renderHome();
        }
    });

    editProjectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('editProjectId').value;
        const projectIndex = projects.findIndex(p => p.id === id);
        if (projectIndex === -1) return;

        const fileInput = document.getElementById('editProjectImageFile');
        const imageUrl = document.getElementById('editProjectImage').value;

        const updateProject = (imageData) => {
            projects[projectIndex].name = document.getElementById('editProjectName').value;
            projects[projectIndex].description = document.getElementById('editProjectDesc').value;
            if (imageData) projects[projectIndex].image = imageData;
            else if (imageUrl) projects[projectIndex].image = imageUrl;
            
            localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
            editProjectModal.classList.add('hidden');
            renderHome();
        };

        if (fileInput.files && fileInput.files[0]) {
            resizeImage(fileInput.files[0], updateProject);
        } else {
            updateProject(null);
        }
    });

    document.getElementById('backToProjectsBtn').addEventListener('click', () => {
        currentProjectId = null;
        items = [];
        renderHome();
    });

    // Global Search
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            render();
        });
    }

    // Sidebar Toggle
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    sidebarToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    // Accordion Logic
    document.querySelectorAll('.nav-group-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            header.classList.toggle('expanded');
            content.classList.toggle('expanded');
        });
    });

    // Tab Switching
    tabNav.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabNav.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            currentTab = target.dataset.tab;
            currentTabTitle.textContent = TAB_NAMES[currentTab];
            render();
        });
    });

    // Drawer / Modal Toggles
    newItemBtn.addEventListener('click', () => {
        addItemForm.reset();
        document.getElementById('totalDirectUnitPrice').value = '0.00';
        addItemModal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', () => {
        addItemModal.classList.add('hidden');
    });

    cancelModalBtn.addEventListener('click', () => {
        addItemModal.classList.add('hidden');
    });
    
    // Import Modal Toggles
    importExcelBtn.addEventListener('click', () => {
        importExcelModal.classList.remove('hidden');
        document.getElementById('excelFileInput').value = '';
        document.getElementById('fileNameDisplay').textContent = 'Seçilen Dosya: Yok';
        document.getElementById('processImportBtn').disabled = true;
    });

    closeImportModalBtn.addEventListener('click', () => {
        importExcelModal.classList.add('hidden');
    });
    
    // Download Template
    document.getElementById('downloadTemplateBtn').addEventListener('click', downloadExcelTemplate);

    // File Input Change
    document.getElementById('excelFileInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        const display = document.getElementById('fileNameDisplay');
        const processBtn = document.getElementById('processImportBtn');
        
        if (file) {
            display.textContent = `Seçilen Dosya: ${file.name}`;
            display.style.color = '#10b981';
            processBtn.disabled = false;
        } else {
            display.textContent = 'Seçilen Dosya: Yok';
            display.style.color = 'var(--text-muted)';
            processBtn.disabled = true;
        }
    });

    // Process Import
    document.getElementById('processImportBtn').addEventListener('click', processExcelImport);

    closeDetailDrawerBtn.addEventListener('click', () => {
        detailDrawer.classList.add('hidden');
    });

    // Auto-calculate Direct Unit Price
    const calcDirectTotal = () => {
        const mat = parseFloat(document.getElementById('materialCost').value) || 0;
        const lab = parseFloat(document.getElementById('laborCost').value) || 0;
        const eq = parseFloat(document.getElementById('equipmentCost').value) || 0;
        document.getElementById('totalDirectUnitPrice').value = formatCurrency(mat + lab + eq).replace('₺', '').trim();
    };

    document.getElementById('materialCost').addEventListener('input', calcDirectTotal);
    document.getElementById('laborCost').addEventListener('input', calcDirectTotal);
    document.getElementById('equipmentCost').addEventListener('input', calcDirectTotal);

    // Form Submission
    addItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Kısım 1: Temel Bilgiler
        const pypCode = document.getElementById('pypCode').value;
        const pozNo = document.getElementById('pozNo').value;
        const description = document.getElementById('description').value;
        const pypDesc1 = document.getElementById('pypDesc1').value;
        const pypDesc2 = document.getElementById('pypDesc2').value;
        const pypDesc3 = document.getElementById('pypDesc3').value;
        const scope = document.getElementById('scope').value;
        const materialDetail = document.getElementById('materialDetail').value;
        const tenderPackage = document.getElementById('tenderPackage').value;
        const company = document.getElementById('company').value;
        const unit = document.getElementById('unit').value;
        const tenderQuantity = parseFloat(document.getElementById('tenderQuantity').value);
        const processedQuantity = parseFloat(document.getElementById('processedQuantity').value) || 0;
        
        if (processedQuantity > tenderQuantity) {
            alert('İşlenen miktar, teklif miktarından büyük olamaz!');
            return;
        }

        const unitManHour = parseFloat(document.getElementById('unitManHour').value) || 0;
        const actualManHour = parseFloat(document.getElementById('actualManHour').value);
        const materialCost = parseFloat(document.getElementById('materialCost').value);
        const laborCost = parseFloat(document.getElementById('laborCost').value);
        const equipmentCost = parseFloat(document.getElementById('equipmentCost').value);
        // Kısım 3: Gelir (Sözleşme) Bilgileri
        const contractMaterialCost = parseFloat(document.getElementById('contractMaterialCost').value);
        const contractLaborCost = parseFloat(document.getElementById('contractLaborCost').value);
        const contractUnitPrice = parseFloat(document.getElementById('contractUnitPrice').value);

        // Hesaplamalar
        const totalManHour = unitManHour * tenderQuantity;
        const totalDirectCost = (materialCost + laborCost + equipmentCost) * tenderQuantity;
        const totalItemCost = totalDirectCost;
        const contractTotalCost = contractUnitPrice * tenderQuantity;

        const newItem = {
            id: Date.now().toString(),
            category: currentTab,
            pypCode,
            pozNo,
            description,
            pypDesc1,
            pypDesc2,
            pypDesc3,
            scope,
            materialDetail,
            tenderPackage,
            company,
            unit,
            tenderQuantity,
            processedQuantity,
            unitManHour,
            actualManHour,
            materialCost,
            laborCost,
            equipmentCost,
            contractMaterialCost,
            contractLaborCost,
            contractUnitPrice,
            totalManHour,
            totalDirectCost,
            totalItemCost,
            contractTotalCost
        };

        items.push(newItem);
        saveData();
        render();

        // Close modal and show toast
        addItemModal.classList.add('hidden');
        addItemForm.reset();
        
        toast.classList.remove('hidden');
        toast.classList.add('show');
        
        // Hide toast after 2 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 300); // Wait for transition
        }, 2000);
    });

    // Excel Export
    exportExcelBtn.addEventListener('click', exportToExcel);

    // Inline Edit
    document.getElementById('boqTableBody').addEventListener('dblclick', (e) => {
        const td = e.target.closest('.editable');
        if (!td) return;
        if (td.querySelector('input')) return;
        
        const field = td.getAttribute('data-field');
        const type = td.getAttribute('data-type');
        const tr = td.closest('tr');
        const itemId = tr.querySelector('.delete').getAttribute('data-id');
        const item = items.find(i => i.id === itemId);
        if (!item) return;
        
        const originalValue = item[field];
        
        const input = document.createElement('input');
        input.type = type === 'text' ? 'text' : 'number';
        if (type === 'number' || type === 'currency') input.step = "any";
        
        input.value = originalValue !== undefined && originalValue !== null ? originalValue : '';
        
        input.style.width = '100%';
        input.style.padding = '0.5rem';
        input.style.border = '2px solid var(--primary)';
        input.style.borderRadius = '4px';
        input.style.boxSizing = 'border-box';
        input.style.backgroundColor = 'var(--bg-main)';
        input.style.color = 'var(--text-main)';
        input.style.outline = 'none';
        
        td.innerHTML = '';
        td.appendChild(input);
        input.focus();
        input.select();
        
        let isSaved = false;
        
        const saveChanges = () => {
            if (isSaved) return;
            isSaved = true;
            let newValue = input.value;
            if (type === 'number' || type === 'currency') {
                newValue = parseFloat(newValue) || 0;
            }
            if (field === 'processedQuantity' && newValue > (item.tenderQuantity || 0)) {
                alert('İşlenen miktar, teklif miktarından büyük olamaz!');
                render();
                return;
            }
            if (field === 'tenderQuantity' && newValue < (item.processedQuantity || 0)) {
                alert('Teklif miktarı, işlenen miktardan küçük olamaz!');
                render();
                return;
            }
            item[field] = newValue;
            saveData();
            render();
        };
        
        input.addEventListener('blur', saveChanges);
        input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') saveChanges();
            else if (ev.key === 'Escape') {
                isSaved = true;
                render();
            }
        });
    });

    document.getElementById('showBudgetSummaryBtn').addEventListener('click', () => {
        if (!currentProjectId) {
            alert('Lütfen önce bir proje seçin.');
            return;
        }
        document.getElementById('projectTableView').classList.add('hidden');
        budgetSummaryView.classList.remove('hidden');
        renderBudgetSummary();
    });

    document.getElementById('backToTableBtn').addEventListener('click', () => {
        budgetSummaryView.classList.add('hidden');
        document.getElementById('projectTableView').classList.remove('hidden');
    });

    // Theme toggle for summary view
    document.getElementById('themeToggleSummaryBtn').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('kalyon_theme', isDark ? 'dark' : 'light');
        
        // Update both icons
        const iconHtml = isDark ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
        document.getElementById('themeToggleSummaryBtn').innerHTML = iconHtml;
        document.getElementById('themeToggleBtn').innerHTML = iconHtml;
        
        // Re-render charts with new theme colors
        renderBudgetSummary();
    });
}

// Hesaplama Motoru
function calculateItem(item) {
    const unitManHour = parseFloat(item.unitManHour) || 0;
    const tenderQuantity = parseFloat(item.tenderQuantity) || 0;
    const processedQuantity = parseFloat(item.processedQuantity) || 0;
    const materialCost = parseFloat(item.materialCost) || 0;
    const laborCost = parseFloat(item.laborCost) || 0;
    const equipmentCost = parseFloat(item.equipmentCost) || 0;
    const contractMaterialCost = parseFloat(item.contractMaterialCost) || 0;
    const contractLaborCost = parseFloat(item.contractLaborCost) || 0;

    const sumCost = materialCost + laborCost + equipmentCost;
    const totalUnitCost = sumCost > 0 ? sumCost : (parseFloat(item.totalUnitCost) || 0);

    const sumContractCost = contractMaterialCost + contractLaborCost;
    const contractUnitPrice = sumContractCost > 0 ? sumContractCost : (parseFloat(item.contractUnitPrice) || 0);

    item.totalManHour = unitManHour * tenderQuantity;
    item.totalUnitCost = totalUnitCost;
    item.totalDirectCost = totalUnitCost * tenderQuantity;
    item.realizedCost = totalUnitCost * processedQuantity;
    item.totalItemCost = item.totalDirectCost;
    item.contractUnitPrice = contractUnitPrice;
    item.contractTotalCost = contractUnitPrice * tenderQuantity;

    return item;
}

// Render UI
function renderHome() {
    homeView.classList.remove('hidden');
    projectView.classList.add('hidden');
    
    projectsGrid.innerHTML = '';
    
    if (projects.length === 0) {
        projectsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-muted);">
                <i class="ph ph-buildings" style="font-size: 4rem; opacity: 0.5;"></i>
                <p style="margin-top: 1rem; font-size: 1.1rem;">Henüz hiç proje eklenmemiş. Yeni bir proje oluşturarak başlayın.</p>
            </div>
        `;
        return;
    }
    
    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="project-card-image" style="background-image: url('${p.image || ''}'); position: relative;">
                ${!p.image ? '<i class="ph ph-buildings"></i>' : ''}
                <div style="position: absolute; top: 0.5rem; right: 0.5rem; display: flex; gap: 0.5rem;">
                    <button class="btn" style="background: rgba(0,0,0,0.5); color: white; border: none; padding: 0.5rem; border-radius: 50%;" onclick="exportProject('${p.id}', event)" title="Projeyi İndir (.kalyon)">
                        <i class="ph ph-download-simple"></i>
                    </button>
                    <button class="btn" style="background: rgba(0,0,0,0.5); color: white; border: none; padding: 0.5rem; border-radius: 50%;" onclick="openEditProject('${p.id}', event)" title="Projeyi Düzenle">
                        <i class="ph ph-gear"></i>
                    </button>
                </div>
            </div>
            <div class="project-card-body">
                <h3 class="project-card-title">${p.name}</h3>
                <p class="project-card-desc">${p.description}</p>
                <div class="project-card-footer">
                    <span class="project-date">${new Date(p.createdAt).toLocaleDateString('tr-TR')}</span>
                    <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="openProject('${p.id}')">Projeye Git <i class="ph ph-arrow-right"></i></button>
                </div>
            </div>
        `;
        projectsGrid.appendChild(card);
    });
}

window.openProject = function(projectId) {
    currentProjectId = projectId;
    const project = projects.find(p => p.id === projectId);
    document.getElementById('currentProjectSubtitle').textContent = `Proje: ${project.name}`;
    document.getElementById('budgetSummarySubtitle').textContent = `Proje: ${project.name} - Maliyet Dağılımları`;
    
    // Load project data
    items = JSON.parse(localStorage.getItem(`kalyon_boq_data_${projectId}`)) || [];
    
    homeView.classList.add('hidden');
    budgetSummaryView.classList.add('hidden');
    document.getElementById('projectTableView').classList.remove('hidden');
    projectView.classList.remove('hidden');
    render();
};

window.openEditProject = function(projectId, event) {
    event.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    document.getElementById('editProjectId').value = project.id;
    document.getElementById('editProjectName').value = project.name;
    document.getElementById('editProjectDesc').value = project.description;
    
    // Check if the image is a URL or a base64 data string
    if (project.image && project.image.startsWith('http')) {
        document.getElementById('editProjectImage').value = project.image;
    } else {
        document.getElementById('editProjectImage').value = '';
    }
    document.getElementById('editProjectImageFile').value = '';
    
    editProjectModal.classList.remove('hidden');
};

window.exportProject = function(projectId, event) {
    event.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const projectData = JSON.parse(localStorage.getItem(`kalyon_boq_data_${projectId}`)) || [];
    const exportObj = {
        project: project,
        data: projectData
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${project.name.replace(/\s+/g, '_')}.kalyon`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

// Render Budget Summary Charts
function renderBudgetSummary() {
    try {
        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#e2e8f0' : '#475569'; // Darker gray for light mode
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    const directKeys = ['ZAİ', 'YAP', 'MİM', 'CEP', 'ELK', 'PEY', 'ICT', 'EKP', 'MEK', 'MAK'];
    const indirectKeys = ['MOB', 'DEM', 'PER', 'HIZ', 'OFI', 'BAN', 'VER', 'TAS', 'ISG', 'KAL'];
    
    const directCategories = {};
    directKeys.forEach(k => directCategories[k] = TAB_NAMES[k]);
    const indirectCategories = {};
    indirectKeys.forEach(k => indirectCategories[k] = TAB_NAMES[k]);

    let totalDirect = 0;
    let totalIndirect = 0;
    let totalRealized = 0;
    let totalManHourAll = 0;
    let totalActualManHourAll = 0;
    
    // Calculate category totals
    const categoryTotals = {};
    for (const key in directCategories) categoryTotals[key] = { label: directCategories[key], total: 0, type: 'direct' };
    for (const key in indirectCategories) categoryTotals[key] = { label: indirectCategories[key], total: 0, type: 'indirect' };

    items.forEach(item => {
        const calculated = calculateItem(item);
        const cost = calculated.totalItemCost || 0;
        totalRealized += (calculated.realizedCost || 0);
        totalManHourAll += (calculated.totalManHour || 0);
        totalActualManHourAll += (calculated.actualManHour || 0);

        if (directCategories[item.category]) {
            totalDirect += cost;
            categoryTotals[item.category].total += cost;
        } else if (indirectCategories[item.category]) {
            totalIndirect += cost;
            categoryTotals[item.category].total += cost;
        }
    });

    const totalBudget = totalDirect + totalIndirect;
    document.getElementById('summaryTotalBudget').textContent = formatCurrency(totalBudget);

    // Update Tracking KPIs
    const elTrackRealized = document.getElementById('trackRealizedBudget');
    if(elTrackRealized) {
        document.getElementById('trackRealizedBudget').textContent = formatCurrency(totalRealized);
        document.getElementById('trackRemainingBudget').textContent = formatCurrency(Math.max(0, totalBudget - totalRealized));
        
        // Define formatNumber locally if not accessible or use generic
        const fmtMH = (val) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(val) + ' Saat';
        document.getElementById('trackActualManHour').textContent = fmtMH(totalActualManHourAll);
        document.getElementById('trackRemainingManHour').textContent = fmtMH(Math.max(0, totalManHourAll - totalActualManHourAll));
    }

    // Empty state check
    if (totalDirect + totalIndirect === 0) {
        if (pieChartInstance) pieChartInstance.destroy();
        if (barChartInstance) barChartInstance.destroy();
        
        const pieCtx = document.getElementById('costPieChart').getContext('2d');
        pieCtx.clearRect(0, 0, 400, 400);
        pieCtx.font = "16px Outfit";
        pieCtx.fillStyle = textColor;
        pieCtx.textAlign = "center";
        pieCtx.fillText("Henüz veri girilmemiş", 200, 200);

        const barCtx = document.getElementById('categoryBarChart').getContext('2d');
        barCtx.clearRect(0, 0, barCtx.canvas.width, barCtx.canvas.height);
        barCtx.font = "16px Outfit";
        barCtx.fillStyle = textColor;
        barCtx.textAlign = "center";
        barCtx.fillText("Henüz veri girilmemiş", barCtx.canvas.width / 2, barCtx.canvas.height / 2);
        return;
    }

    // Pie Chart
    const pieCtx = document.getElementById('costPieChart').getContext('2d');
    if (pieChartInstance) pieChartInstance.destroy();
    
    pieChartInstance = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: ['Direkt Giderler', 'Endirekt Giderler'],
            datasets: [{
                data: [totalDirect, totalIndirect],
                backgroundColor: ['#2563eb', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            }
        }
    });

    // Bar Chart
    const barCtx = document.getElementById('categoryBarChart').getContext('2d');
    if (barChartInstance) barChartInstance.destroy();

    // Filter categories that have > 0 cost
    const activeCategories = Object.values(categoryTotals).filter(c => c.total > 0).sort((a,b) => b.total - a.total);
    const barLabels = activeCategories.map(c => c.label);
    const barData = activeCategories.map(c => c.total);
    const barColors = activeCategories.map(c => c.type === 'direct' ? '#3b82f6' : '#34d399');

    barChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: barLabels,
            datasets: [{
                label: 'Toplam Maliyet',
                data: barData,
                backgroundColor: barColors,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, maxRotation: 45, minRotation: 45 }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            }
        }
    });

    // Tracking Doughnut Charts
    const finCtx = document.getElementById('financialProgressChart');
    if (finCtx) {
        if (financialChartInstance) financialChartInstance.destroy();
        const remainB = Math.max(0, totalBudget - totalRealized);
        financialChartInstance = new Chart(finCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Gerçekleşen Maliyet', 'Kalan Bütçe'],
                datasets: [{
                    data: [totalRealized, remainB],
                    backgroundColor: ['#10b981', '#f1f5f9'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: textColor } },
                    tooltip: { callbacks: { label: (c) => c.label + ': ' + formatCurrency(c.raw) } }
                }
            }
        });
    }

    const mhCtx = document.getElementById('manHourProgressChart');
    if (mhCtx) {
        if (manHourChartInstance) manHourChartInstance.destroy();
        const remainMH = Math.max(0, totalManHourAll - totalActualManHourAll);
        manHourChartInstance = new Chart(mhCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Gerçekleşen A-S', 'Kalan A-S'],
                datasets: [{
                    data: [totalActualManHourAll, remainMH],
                    backgroundColor: ['#3b82f6', '#f1f5f9'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: textColor } },
                    tooltip: { callbacks: { label: (c) => c.label + ': ' + new Intl.NumberFormat('tr-TR').format(c.raw) + ' Saat' } }
                }
            }
        });
    }
    } catch (error) {
        alert("Grafik yüklenirken bir hata oluştu:\n" + error.message);
        console.error(error);
    }
}

function render() {
    const searchInput = document.getElementById('globalSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    let currentItems;
    if (searchTerm) {
        currentItems = items.filter(i => 
            (i.pypCode && i.pypCode.toLowerCase().includes(searchTerm)) ||
            (i.pozNo && i.pozNo.toLowerCase().includes(searchTerm)) ||
            (i.description && i.description.toLowerCase().includes(searchTerm)) ||
            (i.category && i.category.toLowerCase().includes(searchTerm)) ||
            (i.pypDesc1 && i.pypDesc1.toLowerCase().includes(searchTerm)) ||
            (i.tenderPackage && i.tenderPackage.toLowerCase().includes(searchTerm)) ||
            (i.scope && i.scope.toLowerCase().includes(searchTerm))
        ).map(calculateItem);
        document.getElementById('currentTabTitle').textContent = `Arama Sonuçları: "${searchTerm}"`;
    } else {
        currentItems = items.filter(i => i.category === currentTab).map(calculateItem);
        if (typeof TAB_NAMES !== 'undefined') {
            document.getElementById('currentTabTitle').textContent = TAB_NAMES[currentTab];
        }
    }
    
    // Calculate KPIs
    const tabTotalBudget = currentItems.reduce((acc, curr) => acc + curr.totalItemCost, 0);
    const tabRealizedBudget = currentItems.reduce((acc, curr) => acc + (curr.realizedCost || 0), 0);
    const tabTotalContract = currentItems.reduce((acc, curr) => acc + curr.contractTotalCost, 0);
    const tabTotalDirect = currentItems.reduce((acc, curr) => acc + curr.totalDirectCost, 0);
    const tabTotalManHour = currentItems.reduce((acc, curr) => acc + curr.totalManHour, 0);
    const tabActualManHour = currentItems.reduce((acc, curr) => acc + (curr.actualManHour || 0), 0);

    kpiTotalBudget.textContent = formatCurrency(tabTotalBudget);
    if(kpiRealizedBudget) kpiRealizedBudget.textContent = formatCurrency(tabRealizedBudget);
    if(kpiTotalContract) kpiTotalContract.textContent = formatCurrency(tabTotalContract);
    kpiManHour.textContent = formatNumber(tabTotalManHour) + ' Saat';
    kpiActualManHour.textContent = formatNumber(tabActualManHour) + ' Saat';

    // Render Table
    boqTableBody.innerHTML = '';
    
    if (currentItems.length === 0) {
        emptyState.classList.remove('hidden');
        document.querySelector('.table-wrapper').style.display = 'none';
    } else {
        emptyState.classList.add('hidden');
        document.querySelector('.table-wrapper').style.display = 'block';

        currentItems.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="sticky-col sticky-col-1">${index + 1}</td>
                <td class="sticky-col sticky-col-2 editable" data-field="pypCode" data-type="text">${item.pypCode}</td>
                <td class="sticky-col sticky-col-3 editable" data-field="pozNo" data-type="text">${item.pozNo || '-'}</td>
                <td class="sticky-col sticky-col-4 editable" data-field="description" data-type="text">${item.description}</td>
                <td class="editable" data-field="pypDesc1" data-type="text">${item.pypDesc1 || '-'}</td>
                <td class="editable" data-field="pypDesc2" data-type="text">${item.pypDesc2 || '-'}</td>
                <td class="editable" data-field="pypDesc3" data-type="text">${item.pypDesc3 || '-'}</td>
                <td class="editable" data-field="scope" data-type="text">${item.scope || '-'}</td>
                <td class="editable" data-field="materialDetail" data-type="text">${item.materialDetail || '-'}</td>
                <td class="editable" data-field="tenderPackage" data-type="text">${item.tenderPackage || '-'}</td>
                <td class="editable" data-field="company" data-type="text">${item.company || '-'}</td>
                <td class="editable" data-field="unit" data-type="text">${item.unit}</td>
                <td class="editable" data-field="tenderQuantity" data-type="number">${formatNumber(item.tenderQuantity || 0)}</td>
                <td class="editable" data-field="processedQuantity" data-type="number">${formatNumber(item.processedQuantity || 0)}</td>
                <td class="editable" data-field="unitManHour" data-type="number">${formatNumber(item.unitManHour)}</td>
                <td class="editable" data-field="materialCost" data-type="currency">${formatCurrency(item.materialCost)}</td>
                <td class="editable" data-field="laborCost" data-type="currency">${formatCurrency(item.laborCost)}</td>
                <td class="editable" data-field="equipmentCost" data-type="currency">${formatCurrency(item.equipmentCost)}</td>
                <td class="highlight-col" style="color: var(--primary); font-weight: 600;">${formatCurrency(item.totalUnitCost || ((item.materialCost || 0) + (item.laborCost || 0) + (item.equipmentCost || 0)))}</td>
                <td class="highlight-col">${formatNumber(item.totalManHour)}</td>
                <td class="editable highlight-col" data-field="actualManHour" data-type="number">${formatNumber(item.actualManHour || 0)}</td>
                <td class="total-cost-col">${formatCurrency(item.totalItemCost)}</td>
                <td class="editable" data-field="contractMaterialCost" data-type="currency">${formatCurrency(item.contractMaterialCost || 0)}</td>
                <td class="editable" data-field="contractLaborCost" data-type="currency">${formatCurrency(item.contractLaborCost || 0)}</td>
                <td class="editable" data-field="contractUnitPrice" data-type="currency">${formatCurrency(item.contractUnitPrice)}</td>
                <td class="contract-amount-col">${formatCurrency(item.contractTotalCost)}</td>
                <td class="actions">
                    <div class="action-btns">
                        <button class="action-btn delete" data-id="${item.id}" title="Sil"><i class="ph ph-trash"></i></button>
                    </div>
                </td>
            `;

            // Row click for detail
            tr.addEventListener('click', (e) => {
                if(e.target.closest('.delete') || e.target.tagName === 'INPUT') return;
                openDetailDrawer(item);
            });

            // Delete action
            tr.querySelector('.delete').addEventListener('click', (e) => {
                e.stopPropagation();
                items = items.filter(i => i.id !== item.id);
                saveData();
                render();
            });

            boqTableBody.appendChild(tr);
        });
    }
    
    if (typeof applyColumnVisibility === 'function') {
        applyColumnVisibility();
    }
}

function openDetailDrawer(item) {
    const calc = calculateItem(item);
    
    document.getElementById('detCode').textContent = item.pypCode;
    document.getElementById('detailDesc').textContent = item.description;
    document.getElementById('detQty').textContent = formatNumber(item.tenderQuantity) + ' ' + item.unit;
    document.getElementById('detUnitCost').textContent = formatCurrency(item.contractUnitPrice);
    document.getElementById('detTotalCost').textContent = formatCurrency(item.contractTotalCost);

    renderChart(item);

    detailDrawer.classList.remove('hidden');
}

function renderChart(item) {
    const ctx = document.getElementById('budgetDonutChart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    const donutData = {
        labels: ['Malzeme', 'İşçilik', 'Ekipman'],
        datasets: [{
            data: [
                item.materialCost * (item.tenderQuantity || 0),
                item.laborCost * (item.tenderQuantity || 0),
                item.equipmentCost * (item.tenderQuantity || 0)
            ],
            backgroundColor: [
                '#3b82f6', // blue
                '#10b981', // green
                '#f59e0b'  // yellow
            ],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: donutData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f8fafc' : '#1e293b',
                        font: {
                            family: "'Outfit', sans-serif"
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function exportToExcel() {
    const exportData = [];
    
    exportData.push({'PYP KODU': '', 'PYP TANIMI': TAB_NAMES[currentTab] + ' - KEŞİF ÖZETİ'});
    exportData.push({}); 

    const itemsToExport = items.filter(i => i.category === currentTab).map(calculateItem);
    
    itemsToExport.forEach(i => {
        exportData.push({
            'PYP': i.pypCode,
            'PYP TANIMI 1': i.pypDesc1 || '',
            'PYP TANIMI 2': i.pypDesc2 || '',
            'PYP TANIMI 3': i.pypDesc3 || '',
            'KAPSAM': i.scope || '',
            'MALZEME DETAY': i.materialDetail || '',
            'İHALE PAKETİ': i.tenderPackage || '',
            'FİRMA': i.company || '',
            'POZ NO': i.pozNo || '',
            'POZ TANIMI': i.description || '',
            'ÖLÇÜ BİRİMİ': i.unit,
            'TEKLİF MİKTARI': i.tenderQuantity || 0,
            'İŞLENEN MİKTAR': i.processedQuantity || 0,
            'BİRİM ADAM-SAAT': i.unitManHour,
            'TOPLAM ADAM-SAAT': i.totalManHour,
            'GERÇEKLEŞEN ADAM-SAAT': i.actualManHour || 0,
            'MALZEME B.F (Maliyet)': i.materialCost,
            'İŞÇİLİK B.F (Maliyet)': i.laborCost,
            'EKİPMAN B.F (Maliyet)': i.equipmentCost,
            'TOPLAM MALİYET': i.totalItemCost,
            'GERÇEKLEŞEN MALİYET': i.realizedCost || 0,
            'SÖZLEŞME MALZ. B.F': i.contractMaterialCost || 0,
            'SÖZLEŞME İŞÇİLİK B.F': i.contractLaborCost || 0,
            'SÖZLEŞME BİRİM FİYATI': i.contractUnitPrice,
            'SÖZLEŞME TUTARI': i.contractTotalCost
        });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Sütun genişliklerini ayarla (25 karakter genişlik)
    const wscols = [];
    for (let i = 0; i < 30; i++) wscols.push({wch: 25});
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, currentTab);

    // Save
    XLSX.writeFile(workbook, `Sozlesme_Kesfi_${currentTab}.xlsx`);

    // Show toast
    const toastSpan = toast.querySelector('span');
    toastSpan.textContent = `Excel dosyası başarıyla indirildi!`;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 2000);
}

function downloadExcelTemplate() {
    const templateData = [{
        'PYP KODU': 'Örn: 21-A097-D-MRO-SIH-LVB-T1-A01',
        'PYP TANIMI 1': 'SIHHİ VE YAĞMUR TESİSATI',
        'PYP TANIMI 2': 'SIHHİ VE YAĞMUR TESİSATI',
        'PYP TANIMI 3': 'SIHHİ VE YAĞMUR TESİSATI',
        'KAPSAM': 'TAŞERON (MAL+İŞÇİLİK)',
        'MALZEME DETAY': 'Örn: Seramik',
        'İHALE PAKETİ': 'Tesisat İşleri',
        'FİRMA': 'Firma A.Ş.',
        'POZ NO': '1-MRO-SIH-LVB-T1-1',
        'POZ TANIMI': 'LAVABOLAR Aşağıdaki cins ve özelliklerde...',
        'ÖLÇÜ BİRİMİ': 'adet',
        'TEKLİF MİKTARI': 100,
        'İŞLENEN MİKTAR': 50,
        'BİRİM ADAM-SAAT': 2.5,
        'GERÇEKLEŞEN ADAM-SAAT': 0,
        'MALZEME B.F (Maliyet)': 500,
        'İŞÇİLİK B.F (Maliyet)': 300,
        'EKİPMAN B.F (Maliyet)': 50,
        'MALİYET B.F': 0,
        'SÖZLEŞME MALZ. B.F': 600,
        'SÖZLEŞME İŞÇİLİK B.F': 400,
        'SÖZLEŞME BİRİM FİYATI': 1000
    }];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Sütun genişliklerini ayarla (25 karakter genişlik)
    const wscols = [];
    for (let i = 0; i < 30; i++) wscols.push({wch: 25});
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Şablon');
    XLSX.writeFile(workbook, 'Toplu_Ekle_Sablonu.xlsx');
}

function parseExcelNumber(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        // Remove currency symbols, spaces, and non-numeric characters except comma and dot
        let clean = val.replace(/[₺$\sa-zA-Z]/g, '').trim();
        if (!clean) return 0;
        
        // Handle Turkish/European vs US number formats
        if (clean.includes(',') && clean.includes('.')) {
            const lastComma = clean.lastIndexOf(',');
            const lastDot = clean.lastIndexOf('.');
            if (lastDot > lastComma) {
                // e.g. 1,234.56 -> 1234.56
                clean = clean.replace(/,/g, '');
            } else {
                // e.g. 1.234,56 -> 1234.56
                clean = clean.replace(/\./g, '').replace(',', '.');
            }
        } else if (clean.includes(',')) {
            // Only comma, e.g. 15,4 -> 15.4
            clean = clean.replace(',', '.');
        }
        return parseFloat(clean) || 0;
    }
    return 0;
}

function processExcelImport() {
    const fileInput = document.getElementById('excelFileInput');
    const file = fileInput.files[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        
        // Sadece ilk sayfayı oku
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // JSON'a çevir
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        if (json.length === 0) {
            alert("Dosya boş veya okunamadı.");
            return;
        }

        let addedCount = 0;

        json.forEach(row => {
            // Şablondaki kolon isimleriyle eşleştirme yapılıyor
            const pypCode = row['PYP KODU'] || row['PYP'] || '';
            const pozNo = row['POZ NO'] || '';
            const description = row['POZ TANIMI'] || '';
            
            // Eğer temel bilgiler yoksa satırı atla
            if(!pypCode || !description) return;

            const unit = row['ÖLÇÜ BİRİMİ'] || 'm³';
            const tenderQuantity = parseExcelNumber(row['TEKLİF MİKTARI']);
            const processedQuantity = parseExcelNumber(row['İŞLENEN MİKTAR']);
            const unitManHour = parseExcelNumber(row['BİRİM ADAM-SAAT']);
            const actualManHour = parseExcelNumber(row['GERÇEKLEŞEN ADAM-SAAT']);
            const materialCost = parseExcelNumber(row['MALZEME B.F (Maliyet)']);
            const laborCost = parseExcelNumber(row['İŞÇİLİK B.F (Maliyet)']);
            const equipmentCost = parseExcelNumber(row['EKİPMAN B.F (Maliyet)']);
            const excelTotalUnitCost = parseExcelNumber(row['MALİYET B.F']);
            const contractMaterialCost = parseExcelNumber(row['SÖZLEŞME MALZ. B.F']);
            const contractLaborCost = parseExcelNumber(row['SÖZLEŞME İŞÇİLİK B.F']);
            const contractUnitPrice = parseExcelNumber(row['SÖZLEŞME BİRİM FİYATI']);

            const totalManHour = unitManHour * tenderQuantity;
            const totalUnitCost = excelTotalUnitCost > 0 ? excelTotalUnitCost : (materialCost + laborCost + equipmentCost);
            const totalDirectCost = totalUnitCost * tenderQuantity;
            const totalItemCost = totalDirectCost;
            const contractTotalCost = contractUnitPrice * tenderQuantity;

            const newItem = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                category: currentTab, // Aktif sekmeye ekleniyor
                pypCode,
                pozNo,
                description,
                pypDesc1: row['PYP TANIMI 1'] || '',
                pypDesc2: row['PYP TANIMI 2'] || '',
                pypDesc3: row['PYP TANIMI 3'] || '',
                scope: row['KAPSAM'] || '',
                materialDetail: row['MALZEME DETAY'] || '',
                tenderPackage: row['İHALE PAKETİ'] || '',
                company: row['FİRMA'] || '',
                unit,
                tenderQuantity,
                processedQuantity,
                unitManHour,
                actualManHour,
                materialCost,
                laborCost,
                equipmentCost,
                totalUnitCost,
                contractMaterialCost,
                contractLaborCost,
                contractUnitPrice,
                totalManHour,
                totalDirectCost,
                totalItemCost,
                contractTotalCost
            };

            items.push(newItem);
            addedCount++;
        });

        if (addedCount > 0) {
            saveData();
            render();
            
            importExcelModal.classList.add('hidden');
            
            // Toast mesajını güncelle ve göster
            const toastSpan = toast.querySelector('span');
            toastSpan.textContent = `${addedCount} adet poz başarıyla eklendi!`;
            toast.classList.remove('hidden');
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.classList.add('hidden'), 300);
            }, 3000);
        } else {
            alert("Şablona uygun veri bulunamadı. Sütun isimlerini kontrol edin.");
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function saveData() {
    if (currentProjectId) {
        localStorage.setItem(`kalyon_boq_data_${currentProjectId}`, JSON.stringify(items));
    }
}

// Column Visibility Logic
let columnVisibility = JSON.parse(localStorage.getItem('kalyon_col_visibility')) || {};

function initColumnContextMenu() {
    const tableHeaderCells = document.querySelectorAll('#boqTable thead th');
    const columnToggleList = document.getElementById('columnToggleList');
    const boqTable = document.getElementById('boqTable');
    const contextMenu = document.getElementById('columnContextMenu');
    const closeBtn = document.getElementById('closeContextMenuBtn');

    if (!columnToggleList || !contextMenu) return;

    columnToggleList.innerHTML = '';
    
    tableHeaderCells.forEach((th, index) => {
        th.setAttribute('data-col-index', index);
        const colName = th.textContent.trim();
        if(!colName || colName === 'İşlemler') return; // Skip empty or action headers
        
        const item = document.createElement('label');
        item.className = 'column-toggle-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = index;
        checkbox.checked = columnVisibility[index] !== false;
        
        if (!checkbox.checked) {
            th.style.display = 'none';
        }
        
        checkbox.addEventListener('change', (e) => {
            columnVisibility[index] = e.target.checked;
            localStorage.setItem('kalyon_col_visibility', JSON.stringify(columnVisibility));
            applyColumnVisibility();
        });
        
        item.appendChild(checkbox);
        item.appendChild(document.createTextNode(colName));
        columnToggleList.appendChild(item);
    });

    boqTable.querySelector('thead').addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        // Ensure menu stays within viewport
        let posX = e.pageX;
        let posY = e.pageY;
        
        contextMenu.classList.remove('hidden');
        
        if (posX + 250 > window.innerWidth) {
            posX = window.innerWidth - 260;
        }
        
        contextMenu.style.left = `${posX}px`;
        contextMenu.style.top = `${posY}px`;
    });

    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target) && !e.target.closest('thead')) {
            contextMenu.classList.add('hidden');
        }
    });

    closeBtn.addEventListener('click', () => {
        contextMenu.classList.add('hidden');
    });
}

function applyColumnVisibility() {
    document.querySelectorAll('#boqTable thead th').forEach((th, index) => {
        if (columnVisibility[index] === false) {
            th.style.display = 'none';
        } else {
            th.style.display = '';
        }
    });
    document.querySelectorAll('#boqTable tbody tr').forEach(tr => {
        tr.querySelectorAll('td').forEach((td, index) => {
            if (columnVisibility[index] === false) {
                td.style.display = 'none';
            } else {
                td.style.display = '';
            }
        });
    });
}

// Start
init();
setTimeout(initColumnContextMenu, 100);
