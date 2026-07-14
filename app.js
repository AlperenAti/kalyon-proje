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
    const savedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (savedProjects) {
        projects = JSON.parse(savedProjects);
    } else {
        projects = [];
    }
    
    // Load default project if empty and available
    if (projects.length === 0 && typeof DEFAULT_PROJECT_B64 !== 'undefined') {
        try {
            const binString = atob(DEFAULT_PROJECT_B64);
            const bytes = new Uint8Array(binString.length);
            for (let i = 0; i < binString.length; i++) {
                bytes[i] = binString.charCodeAt(i);
            }
            const decoder = new TextDecoder('utf-8');
            const jsonStr = decoder.decode(bytes);
            
            const imported = JSON.parse(jsonStr);
            if (imported.project && imported.data) {
                projects.push(imported.project);
                localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
                localStorage.setItem(`kalyon_boq_data_${imported.project.id}`, JSON.stringify(imported.data));
            }
        } catch(e) {
            console.error("Failed to load default project", e);
        }
    }

    // Migrate old data if no projects exist
    if (projects.length === 0) {
        const legacyData = localStorage.getItem('kalyon_boq_data');
        if (legacyData) {
            const parsed = JSON.parse(legacyData);
            if (parsed.length > 0) {
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

const DEFAULT_PROJECT_B64 = "eyJwcm9qZWN0Ijp7ImlkIjoiMTc4Mzk1MDAyOTA2MiIsIm5hbWUiOiJCYXlyYW0gw4dvYmFuIHZlIEhpc3NlZGFybGFyxLHwn6SvIiwiZGVzY3JpcHRpb24iOiJhbHBlcmVuIiwiaW1hZ2UiOiJkYXRhOmltYWdlL2pwZWc7YmFzZTY0LC85ai80QUFRU2taSlJnQUJBUUFBQVFBQkFBRC80Z0hZU1VORFgxQlNUMFpKVEVVQUFRRUFBQUhJQUFBQUFBUXdBQUJ0Ym5SeVVrZENJRmhaV2lBSDRBQUJBQUVBQUFBQUFBQmhZM053QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQVFBQTl0WUFBUUFBQUFEVExRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFsa1pYTmpBQUFBOEFBQUFDUnlXRmxhQUFBQkZBQUFBQlJuV0ZsYUFBQUJLQUFBQUJSaVdGbGFBQUFCUEFBQUFCUjNkSEIwQUFBQlVBQUFBQlJ5VkZKREFBQUJaQUFBQUNoblZGSkRBQUFCWkFBQUFDaGlWRkpEQUFBQlpBQUFBQ2hqY0hKMEFBQUJqQUFBQUR4dGJIVmpBQUFBQUFBQUFBRUFBQUFNWlc1VlV3QUFBQWdBQUFBY0FITUFVZ0JIQUVKWVdWb2dBQUFBQUFBQWI2SUFBRGoxQUFBRGtGaFpXaUFBQUFBQUFBQmltUUFBdDRVQUFCamFXRmxhSUFBQUFBQUFBQ1NnQUFBUGhBQUF0czlZV1ZvZ0FBQUFBQUFBOXRZQUFRQUFBQURUTFhCaGNtRUFBQUFBQUFRQUFBQUNabVlBQVBLbkFBQU5XUUFBRTlBQUFBcGJBQUFBQUFBQUFBQnRiSFZqQUFBQUFBQUFBQUVBQUFBTVpXNVZVd0FBQUNBQUFBQWNBRWNBYndCdkFHY0FiQUJsQUNBQVNRQnVBR01BTGdBZ0FESUFNQUF4QURiLzJ3QkRBQVlFQlFZRkJBWUdCUVlIQndZSUNoQUtDZ2tKQ2hRT0R3d1FGeFFZR0JjVUZoWWFIU1VmR2hzakhCWVdJQ3dnSXlZbktTb3BHUjh0TUMwb01DVW9LU2ovMndCREFRY0hCd29JQ2hNS0NoTW9HaFlhS0Nnb0tDZ29LQ2dvS0Nnb0tDZ29LQ2dvS0Nnb0tDZ29LQ2dvS0Nnb0tDZ29LQ2dvS0Nnb0tDZ29LQ2dvS0Nnb0tDai93QUFSQ0FKWUFjUURBU0lBQWhFQkF4RUIvOFFBSEFBQUFRVUJBUUVBQUFBQUFBQUFBQUFBQWdFREJBVUdBQWNJLzhRQVJ4QUFBZ0VEQXdJRUF3VUdCUU1EQWdVRkFRSURBQVFSQlJJaE1VRVRJbEZoQm5HQkZES1JvYkVISTBKU3dkRVZZbkxoOERORGdpUlQ4WktpRmlVMFk3TENOV1IwMHYvRUFCb0JBQU1CQVFFQkFBQUFBQUFBQUFBQUFBQUJBZ01FQlFiL3hBQXlFUUFDQWdJQ0FRUUJCQUVFQWdFRkFBQUFBUUlSQXlFU01VRUVFeUpSTWdWaGNZRkNVcEdoc1NOREZETml3ZEh3LzlvQURBTUJBQUlSQXhFQVB3RDFHa05LYUd2b2p4anFXaHBjME1hT0pwSzd2WEdpZ3NTdXJxNDBERFJDM05PWVdNZTlOZUlRTVVCT2VhVldPeDFwU2FiNjBsTFFsUVdLSzZ1RmRRTVEwSkZIaWtJcG9RMmV0QWFkTkJWQ0c4VjFHUlE0cGdObWtOT1lwTVZSSTNRa1U1aWhJcWtBMmFRMFpGQ1JURUFhUTBab0RURUNhRTBab2FBQnBDS0kwaHBpWUJvYUkwTk5BampTR2xwS1lBbWhZMFJvVFRFSWFRVjFkM3BnY2E3dlhWVS9GVi8vQUlkb2R4S2gvZXVQRFQySjcvUVpQMHBTa29weWZnY1k4bWtqS1dzbytKUDJpZUtSdXNkTVVtTUh1M1RQNC9wVytQdldTL1pwcHYyVFEydkpGeEpldHZYUFhZT0IrUEordGF3MWo2WlBoemwyOWw1bXVWTHBDR2hwYVExMEl5T3BEeFMwalV4Q1VocnE2Z1RPcEtVME5NUWxkU21rb0E0MGxMU1UwQU9hNmxJcnFZRzZJcE1VZUtFMTVpT2dRMGxMUW1tQjFMU0NsRkFIWXpYRVVRcnFBQU5KaW5NVW0ya1VCWFVXMnVJcERFRktLNERKb3RvRkZqUUpvVFJraWdOQ0JnTWFHaWFrRlVJRTF4RkZpa3FoQW1rbzhVbUtxeEFFVWhGSGlzejhRZkZFZG1UQllCWlpqd1pPcXFmNm1weVpZNDQ4cE12SGpsbGZHS0xMV2RUdHRMdHk4N1prSThrWVBtYjVVMW9XcHg2dFlDZEFGa1VsWkVCKzQzcFhtOXkxemZ6dGNQS3pNY2hwWFBUbnQrRldud3ZmUTZiZExLak40RWg4T2JQYm43eC9HdlBoK284c2kxOFR1bjZHTWNkWDhqME5oUUVVNGNIcGdqMm9TSzlVOHNhSW9hY1BXZ05NQVRRbWlOQWV0TkNFUFNob3FHcVFoRFhVcHBLWUFtaE5FYUUwQUpRMHBwS0FGckMvdEVra3Y3N1RkRXREKzl1WEFiSFVLVDVqK0EvT3QydFluNFJpL3dBWStKdFYrSW41Z0RtMnRNL3lqcXcvNTNOWWVvdWRZMTUvNk5zTDQzUDZOaEJFbHZCSERFTVJ4cUVVZWdBd0tVMHA2MG1LNkVxMGpDd1RYR2xOQ2FhRWRRdFJVbE1BYTZsTkpRQWhycVdocDBJNDBsZFhVQ09wS1drcGdJYTZscnFZRytJb0NLY3h6UXNNVjVhWjBqZUtURkhpaFlVd0JBd2FJRE5jQlJnY1VOaUJ4WFlwY1YxQXdhNmlycVF4TVV1TVV0SWFRd1diMG9UelJFVU9NVXdFb1RSVWhGTUFNWnJoUzF5ak5NRHE0aWpDMTIzSjRwZ0Jpb21wWDFycHR1WnIyVVJwMkhkdllEdlZUOFEvRk5ycHU2QzF4Y1huM2NLZktoOXovU3NGY05kNnJjTmMzazVkUC9jZmhWOWdLNVBVZXNqaTFIYk96MC9vcFpQbFBVUzExLzRrdTlRbDhDMzNRMng0Mm9mTTN6L3RWV1k0N1REWERCbkF3c1E3Zk9temN4VzZGTEpTV3p6TS9VK3VQU29nR1d5Y2tudjYxNCtUSkxJK1dSbm9KeGhIaGpWSVNhNU13Q3FNS09Bb0dBS0cwWXJQKzh5STJHMWgvV24wakdlbFJyaHl1N1l1Y2RoVXBrOUhwUHdsZW1ldyt5em45L2I4QS96TDJQOEFUOEt1bUZlWTZEcVVsb1lMbmt2QWNTTC9BRHAveitsZW5SU0pQREhMRXdhTndHVWowTmU5NkxQN3NLZmFQTDlYaTRTNUxwalpGQWFlWVUwd3J1T1FiTkMxRWV0SVJtcUFIdFFtaXBEVFFnRFhHbFBXa05NUUpvVFJHa05BZ0RTVVJydW9vQXBQakc0bmgrSHA0N0lFM2R5UmJSWTY1ZmduOE0xTjBiVDQ5SzBtMXNZZ05rS0JlTzU3bjhhaFhibTUrSjdhMkM3a3M0ek0vczdjTCtYUDRWY25tc2NmeW01ZjBheTFGUi9zUTBsS2FTdWd6WUpwRFJHaE5BaEs2dU5kVEVEU1VWSWFCQ0drcFRTVXhDVWxLYVNtQnhwS1drb0E2dXJxNm1CNkZpaElwd2loSXJ5VWRRM2loeG1uRFhBWnAyS2dBdk5GaWp4U1lvc2REWkhOSlRoRklSUllxQnJzWW9xNmdhQnBNVWVLNDBBQmloSW96MW9XcGpHNkZxSTBMR3FBRTBhRE5OaXE3WE5jaDBXM0RPaGxuZmlPTWZxZlFVcFNVVmNpb3hsSjhZclpaM2x6QlpXN1QzVWl4UkwxWmovek5lZmZFbnhYY1gzN2pUdzhOcTNCYkhuZit3cXIxSzh2ZFZ1UEh1NWd5OXM4SkdQWWY4TlJWdUZpQlczSkxFNU1yRDlLOG5QNjF6K01OTDdQVHhlbWppK1U5djZPVlk3S0xOMnVaT3F4anI4ejZWRHViaVc0WWJnRmpVY0lPQUtjWWhnZStlNTVKcGdrNUlQTmNLcGRHMHBPYnRpZmV4NzBaWUpnOGNlOVIyM0NRQ0laejFIcFRpeEVuTDhuc0tRaHdUbHdSZ2hmV2xBUTR4aWhJd04yTWxlM3JRcmpQc2VSOHFBSEJKNGNna0F5Qnd3OVIzcmJmQmQ4RkRhZkpKbFNQRmdKN2c5UVAxL0dzT1NDQ0tmMG01YTNuVkZiRWtSOFNJL3FLNlBUNW5pbXBJakpCWklPRFBXV0hGTk1LNnl1WTcyeml1SWp3NHlSNkh1S0p4elgwa1dtclI0amk0dW1NTU9hR25XRk5IclZva0VpaE5HYUUxUWdLUTBWRFRFQ2FRMHBwRFRBUTAzTk5GYjI4czg1eEZFaGR6NkFETk9WbnZqaTlOdHBNVnRENXJpNmJLcHp5cWtjZlZpZy9HczgyVDI0T1Jwamp6a29oL0Nva3VJcnpVWjEyelhjeE8zT2RvSGI2ZFBwVjJhWjAyMEZocDF2YTd0eGlRS3pIK0k5ejlUbW5qUmhod2drd3lTNVNiRXBLV2tyUXpFTklhV3VwZ3dUU1VwcEtZaERTVVZEUUlTa3BUU1ZRaERTVVZEU0E2a3BhUTB3T3JxNnVwaVBSeXRBUnpUekNnSXJ4MHpzb2F4UnF0RXEwZUtHd29iSTRvY1U2VnBDdENZeG5GSVJUeFdnSXBwaUc4VjNTaUlwTVZRQ1YxTGloTkFIRVVCNlU1UU1LYUFhTkEyQmtuZ0RrbWh2N3VDeHR6UGRTQ09NZmlUNkQxcnozNGgrSkxuVTJhM3RFYUcyUEJBKzlJUGYrMVlaL1V3d3JlMzlHK0QwODh6MTBXK3YvRmtkc1dnMHNDYVljR1FqeXI4dlUxa0RLYnAydWRRbGtjdnlBVHkveTlCVGFySEJndUJMUC9ML0FBcjg2Ym1kNVhMeUhMZE9CajZEMnJ4OHVlZVYzTi8wZW5DRU1TckgzOWkzVXhuVlYyaElrKzZnN2ZQMXBuT2V0Y2VBT2MrOU43d2VCMXJOdXdEUGxYamowcVBJTnpoc2tBZW5la002bVR3d1RrZHowK2xFRDZjbWtOSVZQTDFPQlRoYkM1WUVEcG5GV1dsNmZ1YnhMb2Y2VVA2bXAxK3NmMmFTTlkvRlk5dlQzRkt4MFp6ZmtVMnY4dlBtT1YrZnBWclphWEhOR0hlUjJMRDdvNEE5cXFaZ043eDdnd1ZpTWltaEJBbkZOek1RVmREaVJTQ0RSN2k2aC80dWpEMzlmclF0NXNZcGttMCtEZFZXT2RiZVU0anVQdStpdU9vLzU3VnRIV3ZHbHVUYmtaT0l5d0pZZFVQWTE2cm9Hby80bnB5eU9SNDZlV1VEMTlmclhzL3ArZmt2YmY4QVJ3K3N4ZjhBc1g5a3BoVFJGUHVLYVlWNmlQUEdqUW1qTkllbFdTTnNLUTBSb1RUQUUwTkZTR2dRbU04RHJXWHZFT3BmSFN3akRRMkF5N0E1QUtFZ0QvNnk1LzhBRVZyYmRsamN5eU50U0ZXbFkrZ1VFLzByTS9CTVROcGt1b1NLVmErazhVQmpraEJ3bjVjL1d1WE12Y3l4eCtGdG5SamZDRXBmMGFBMEZHYUN1dzVqalEwVkpTUUFta0pvalFtbWhzRTBsRlNHbUk2aHBhUTBFc1EwbExTVTBCMUlhV2tOTURxUTExY2FBRXJxNnVwaVBUaUtiSXFTeTVvTnZOZUdtZDFEYXJUaFVVYXJTbGVLR3hwREpHQlFFVThSaWh4VFRCakpGQ3d4VDdMVGJDcVRKb1pOSlRoV2h4VldJYklycWN4VGN6eHdSdEpNNnh4cU1sbU9BS2QwRkNZT2NDcUxYdmlPMjB3bUdNQ2U2L2tVOEtmOHgvcFZMci94Uzg1YTIwd3NrUjRhWG96Zkwwck5OQ2tRemNzV1k4K0dPdjFOY0dmMXYrT1AvYzdzWHBhK1dUL1k2K3ZMdlU1WG11NWNBSEc0L2RYMkFxSkk0QlpZQnRVakJmOEFpYit3bzVYTWorYnAyQTZBVTAxZVpKdHUzMmQxNnBhUTFqSEFHQlFIZ1pQRk9PNEFwbHdUdFpzblBRQ29zSXg1YVEzSTRDNXp4Nm1vaGNTYmd2QXBaaElKTnIrWW43cEhjVWx6WlhOdEI0N0tNZFNLYWFZVTBNU2dsZytRTURwVTdScnVPTzVRT0FTM0FQY0dxNFRoaVBRMUVkMmd1UEVYQkFxNnNFejBBeVlHQ2NDbWZHQ0hIWWNWQjBlN2sxR0hBQUxMakpQQStlYW5tUzN0aVIvMVpRTTlNZ2Y4OTZ6YSt5bHNsV3R1enlseVNrYmNuUFUvSVZVL0VGa3lFeVJxTnk4a2orSWV0SmUzc3hmL0FLckpNeEtvZ1BRKzlkZVNYVi9venJHU0x1SVpLZ1lKWHVQK2Vob2pKZUJ5eHVLVFpSUnpCSHkzM1c0WWYxcDFnVWNxYXJBdTJQeDVnenJ4Z0w2bnRWeFBDWTdXR1QrWVpxbE5OMEtXSnhqWXpJcXVySS9Lc01WZi9CK3JDeXZrRE1WandJcHM5Q096ZlQrOVo0TmtVc01vaW4zdWNJNDJNZlFldjQxcmptOGNsSkdUU2FhZlRQYW5ISnBwaFZYOEs2Z0x5dzhDVnMzRnZoV0hxdlkrOVd6Q3Zwc1dSWklxYThuaTVjYnh5Y1dSelFtamNVSnJaR1RHeUtRMFpvVFRFQlNHaU5KZ0U4bkE3bjBGTzYydzdLWDRvbmtTeWhzb09IdjVQQkxEUEM5eDlmMEJxMWlpU0dGSW9sQ3hvb1ZWSFlEb0txTE9WZFoxdHI1VzMybGlyUVFFZERLZnZrZjZRQXVmOVJxNU5ZWUU1TjVINS82TmN0SktDOEFtaG9xU3Vrd0VwRFM1cERRQWxDYUtoTkNBU2twYVEwd09vVFJVaG9Fd2FRMFJvYWFFZFNHbHBEVEFTdXJxNmdSMWRYVjFBSHFyRG1reFR1SzRDdkJzOUNnRkZLUnhUZ1dpd0tWamFJMnlrMlZKSTRwTnRISVZFWXBUYkxVbGxOTk10V21JamxhSGJUNzRWU3hJQUhKSjdWbGRjK0praExRYWNRN2pocHV5bjI5YVU4MGNhdVJVTWNwdW9scHEycDIrbVJicGp1a1AzWWdlVC9ZVmdkVnZycldKUzB6YlkxKzdHT0ZYKzlNM0x0STVsdVhabWJuTEhMTlVlYVl1TWNLZzZLT2xlZG05UkxML0FBZWhpd3h4YlcyTkZsZ0pFT0MzL3VFZnBVVjhrbGllZlgxcDUyNDZZRk15TmhjK3Rjek5XcjJ4c25qMHBobnlkcWo2MDU0THlrbnQzUFlDZ3VaNDdWQ1VZRGo3NS9wVWo0L1l2aGJEeU54eHlQZWx1bzNDandndTBEa24wcnRObHpiTEt3SkQ1UFBYcWY4QWFndTJhU0ZtVjlzWXlTQjM5cXpsMmRPTlVySytCakc2RWVZQStYUHBVNjVKdklIUjEvZHNNQVo1elVGZHBRRlB1K3RQYWRGY1N6YlZVbEcrOGV5bjUwUlRzZVNLYXN6SDd5SzVhM1pXTEE0QUE1UHBWN2FhR1BDRXVyTVk0ODVFSVBuUHo5UDFxNlg3TGJUNXM0MWU1UERUdDIvdDlLWWtScHJqTHR1WEdjbjE3MXBMSWwvSmxEQzUvd0FEalRza01TV3NTd3dnNEFVZEJpamdqd3c0OHhPU1BXbVpWZEV4SGhwQzY0VTlseU0vbG1yRzJpa3VOa2tLL2VBNXpnQVZsdWJPaW80MFY5NjBNYmtTRE16ZVZENmU5U1lGbFdPSzUvN3lERDQvaXEwdUxDenRVOGZVSkZMQUVESS9UOEtnc0JIQWtrVEZvcGZNTTlPbU1WcThNb3JrekJaMWtmRW85YmpsaXVGbHRvNDN0bjVWZTRmdVA2Ly9BQlQxdkdKdFBDU1BseDVnQnpoc2NqOWFtK0NKVm1nSjJ4VEE3Ry9sYjEvNTcxRTA2M052QTBEbmRkeHQ1ejY5Y0gvbnRVUHEwYTQxL2l5cm1UdzN3Q1NEVFpHVklQU3JiVUlHa0R2c3dRd3pqNWRmNlZVdGtuQSt0YlJkbzVaeDR1aTYrR2RVZXp1a2xKSmFBYlhIODhmOXgvYXZVa2tTYUpKWW1EUnVOeWtkeFhpSWxrdDVVbGpHNWdjRUh1RDFGZWpmQStvaVNCckZtM0tCNGtKUG9lcS9UKzllcCtuNStNdmJsMC8remk5WGk1dzVMdGY5R2tjVTJhZllVMHdyMmtlVXhzMEpvelFHcVFnY1ZuL2l6VVhqaFRTYkZ3TlIxRDkyaEhXTkNjTTM0WittYXZibWVLMHRKN200YmJCQWhrYyt3N2ZNOUI4NnhQd0JiVDZycUY3OFU2a3Y3MjZKanRnVDkyUHBrZmdBUGtmV3NNc3JheEx0L3dEUnJqVko1SDROZFlXY09uV0VGbmJLRmloVUtQZjFKOXoxcDQwUm9UWFFra3FSazNld2FFMFJvYXNrU2tORWFTaGdKU0dscE8xQ0FHdU5MaWtvQVNrTkxYVUNCTkNhSTBocG9RbGRYVjJLWUNVbEthU2dSMWRYVjFJUjY4RXBkdFBoT0tFaXZuT1I2dERXMnV4VG0ydTIwN0NodkZLQnhUZ1d1Mkgwb3NWRERDcS9WTCsyMCtFU1hMNHo5MVJ5emZJVkUxM1hvN01QRGFiWmJudWY0VS91YXhGNUpOY3lHYTdrWm1idWYwRlpUejhkUjdOc2ZwM0xjdEllMXZXN25WTjBhQXhXdy9nQis5L3FOVWI3UUR0OHorL1FWSmt5M2xIbFQ4elRKWEF4WEpLVGJ0OW5hb3BLbzZSRWRTeHllcHB0a3gxcVc1QXFPNnRKd0toc2FqZWlLNXljS0NUUUZFak9aeVN4NktLY25tU0FPcXNBdzZrMVV5ZU5jdDVNcWhQTG5xYUVyQ1h4RHY4QVVWalVxbUNSMFVkUHJWWENwdXBOOGpCM0gzVVBRZTlTTHF3VkVMUk9XWWZ3bjBxdGlrTUUrU09Ed2F0SkphSWRzMVZxcDhGU2V5OXFqWHNNS3dtUkdiY1Nka2ZkbXp6VXVCZ1lZekY1Z1ZHVCtIOUtOSkJiRVNLZ01oNDNIcUs1bTluWkZOUjBSSU5PQVJaTDRtSkIwakI4eCtmcFR6VGxzUXdLSXJkUm5BNzBTK0pJNU1tU1R5UGw3VXpKSVk0UDNhWjZrRDE2NHFYTnZTS1VQTWdNSkVyS01aemhlM1drdHpKdlpZVUxTZmRISE5XTmpwY2s3TExKNVVHYzU2bjVVOXFPcVdHaVpSRkR6bm5hdkpKOXpXbVBBNWJla1RrOVRHR283SFlOS1RjSmJnakNBK1hPQVBtZnBVZlV2aUMydEkvQnNRc2pBWUJBOGkvM3JOMzJyM3VvQStKTDRjUi83YWNENit0UkkwZWVSSW9WTHlOMEFycFRqQlZBNDVjcHU1c2R1YjJXN2N5WFVqRi9VbnBVN1E3M0xtd3VIR3gvTkd4L2hiMG9qOE9UQ3phV2FRZU50M0NKUm5QdFdYTjlQWTNBbWkyaGdwVVpHU0NhU2xiMkRWRzVrWEsrRS9ESWZYdi9BTXdhY2dJbVJwVEdCT25sazQrOE94L1Q2ZktvdW5Ya2VzYWF0MEJpNWpBU2NEZ2dqbzJLSVRQdmkyRElrOHBJN2QvNkdzY2tPRHJ3ZFdPZk5LWGxEZXBUQ0NMeE51UWNiaDZqT0NLcXIrTlE0a2pPVWZrRWR4NjFaNitqUG9sMzRXQk1pTTM0YzFuOUZ2b3RSc01JU1JqS2p1RDNXbERTc1dYYkY3MVlhTGVTV2t5bUZpSll6NHNYdmo3eS9VZjFxQVJna0hIenBQTUdES2NGVGtIM3JhTXFkbzUyajJld3VvNyt4aHVZZVVrWFB5UGNVYmlzWjhFNnVrZHd0cytGZ3VENWZSWmZUNjl2cFcyY1l6WDBmcHN5elE1ZVR4L1VZdmJuWGdqdDFvQ0tkWWMxRjFDN1N3c0xtN21VdEhCR1hLamd0am92MVBGZERhaXJaZ2xicEdjK015ZFdtcy9obTBseEpPZnRHb09weVlvQjkxVDd0eng2WTlhME1NTWR2QkhCQWdTS05RaXFPd0hBcW8rRk5MbHM3V1c5dnhuVTc5dkd1U1I5MG5vZzlBQlYyYXp3dzd5UHRsNUpMVVYwZ0dvRFJOMW9UWFFaQ0docFRTVXhDR3VycTZtQWxkWFVocEFJYVNsTkpUQVN1cmpYVUNFcEtXa29FSlhWeHJxWWhPb3BNVVZJYUJIVjFKWFVBZTFsY1VCRlQyZzRCcGxvcStXVTBlMDRORVVMU2hUVWtSSDBxczFmVmJmVFVJYjk1T2VrYS8xOUtibWhLTGVrUFhNMFZyQTB0dzRqalhxVFdLMXo0a212QVlMRU5GQWVyL3hzUDZWRDFXOHVOUm5NdHkzbC9oVWZkVWV3cXQzWU9GSC9BSlZ6enl0OUhSREZGYmZZeS9rQnlNdDZlbE1sbVluZDFOU3RvcHFSY0RqcldmTlBUS2RrWnhpb3NyOGtEclV0bFordkE5YVF3S29KeHlPdEo2Tkk3SVlqM1pMQSsyZWhwc3F6RVk0SXFhNEF4NkhwVE1nQUJZY1lCL0NzM3RtNlNTTXRyREswL3Z6bWhnbUppMjVBeHhUbDFFOXpjbElrTE9lQUFNbXJTdzBLSzBYN1JxYmdrYytFRHg5Zlg1VnRWUjJZU2JjaUZaYWZQZWcrQ05rUSs5SzNRZjNxWDRHbldxUGJ4V3kzRHlEYkpLNDYvTDBxWmQzYnorU0xLUXFNQUFZelVNUmlJcytTMmNjVmk4bjBiUXhYdGcyNVJCR29CQUFDajMrZE11NmVPWWs1YzVKUHB6VDJDek1EZ1o2WTdVN3A5Z0djRnNvdU9mVW1vVVhONk5aVGpqVzJNZ1N5WlNGV2RzZ0hGV2R2WXgyaS9hYjJSUUZHVGs4Q21OVDEydzBaSGlqVGZQOEF5cDIrWnJBYXpyRjNxalpsa0lpemtJT0FLM2hDR1B2Yk9lV1dXVFMwalE2MzhWc2Q4VmcyeE00M0g3ekQyOUt6cXQ5cS9tZDJPVGpKT2FxeWdZbVFaTGQ2MG53WHFOdkJLOEVzVVlsWTVXVEhtUHRWeWs1S3lGRkxvbVdmdzllelJySkk2UkllZ0p5ZndxWGFXaTZSY0sxd2Q3U0RDbFI5MzYxZUdiMCs2ZnhxTmNoSllqR2NZNmpQT0t5VmxVSlphaXNsN0xibHg0MFdNZzl3ZTQ5cXpQeGhZL1lyOFh5eEs5ck45OWY0VmIzK2ZXcDdUMnkzWmFhTW01Z0gvVnhnN2U0K1ZXaXp4WHRpVlpWbGdrWG9Sa01DS3JvVFI1OW8ycU5wT29wSW8zeHRoWkVCKzh2KzFicTVVd0dDVzB5MGJrTmdqK0U5dnBtdk85WXNYMDIvYTNZZVg3OFQ1NFpjOXEwUHdocXZpTTJuM0VtTi9tZ1pqbkRlbjFyWnJuSGovc1JHWENWbW92SXpORExHT3NpRWZpSzhuMHk4T2xhcGd0dGdtYmsveU42MTZ0RTVHN1AzKy9zYXlldS9EMXRlYVZOYjIwSVM3akplT1RxenR6NVQ4eDA5OFZoamFWcG5SbVQwMFRadHM4QzNFWUhvNEhacVlQU3FENFMxaElXRnRmeUZTaDhOODkxN0g2Vm9ibU13U2JXR0FhZFU2TTN0V0xaek5ETVYzYlZjOE4vS3c2R3ZXTkR2L3dERXRNamxiaVpSc2xYMFlkZng2MTQvTDVsT0QxclRmQnVzTmJYeWVLK1lwTVF6QTltL2hiL252WGQ2SFA3V1NuMHptOVJpOTJGTHRkSG9yQ3FyVXBFbjFLMTB4Y3Q0YWk3dWZUL0luLzhBVWZtS3Q1V2poU1NXY040VWFsMkM5U0IySHVlZytkWnY0VDhTN2h2TlZ1bEMzTjVNY3FEa0txOEJSN0E1SHl4WHM1SHluSEd2NVo1Y0Z4aTVsMmFBMDR3cHNpdW93QU5DYU0wRk5DQk5EUkdocGdJYTZsTkNhRUIxSlMxMU1BRFhVVkQzb0V4SzZ1TmRRSTZob3FHZ1FocnU5S2FTbUIxSWFXa05BZ2E2bE5kVEErZ0FweGdtdUlSRkxNUUZISkpxSnFPcFc5aXVKR3pJZWlEcWFwYmk2bXZqaVJzUlp5RkhUL2V2aTNLajZXT05zZTFmV1R0TVZqeG5neVkvU3NmZDdRU1g4em5uL3dDYTBFOXVRdUZHUGVxZTZnMms4VTFKTHNTZzBVZHlTVC9Tb2I4YzRxNG1qVHVLaVNRNTZDamttTkpJcml4N1VMTUFNc1NmYXBFMjFBZG8rdFZkMlh3U09CVU9La0YwUzRwZCs0bkdPZ0FwSmVtVHg3VkdzanR0d2VoeWNVNUllbU9UM3FXam94cFVOeWpPQVBTZ1MyTXFNR1lJcEdNOXo4cWVRWkJKSEsweHMzdXdVNFU5Y2RhWFJiV3RDSkpiMktzdHRHR2tZK1p1cFB6UDlLaVRPMHBMU2tsczhEc0tmYTMyRWhRTTlldUtqU0VsMTI1SVBHQjNOUzIyT01GRUVPdmlBbnYzOUthVlRLV1JGNDlUMEZQZlo4RGRQNVY3ak5ScGJsMTNDM3dxSEF5Ui93QTlhdU9LdHpJbGx2VU5raytGYkxsOE00NzFuZFMxcVV4TWxzU2tXVHY5YWtNWDNTdXpibU9BTTgxVWFoSWpCREFGMktkcm5IYzk2SlpQRWRJSTRFNmxQYks0R1cvTWlSUlBJeW5KS2pKSHpxSGZXMDlpNFM2aVpDM1BQY2VvclVmRDEzRlo1dDlpSXpjN2h3VytkU3RkdDAxS3lhSHlySUJ1alk5ajZmS29VdGc0MW93TXMyeC9MMUhVZGlLYmVUWklzMGJGVDJQZGFZbjhTQ2RvWmwyT3B3UWUxTXBJVmJQUFBXdWhHVFBSTkoxNzdWREVHVDk4b3c0SGYzcVRMcUVjTjBzRTF5ck5KLzAwNm5OZWJKZHkycFpvSldUY01BZzg0TmF6UUxFWDFuRkxvdG5tNE9WZTV1Q2RzUnhnblBjL0toeDhpc3Y3dG9oQVpaaXNENDZzUVBwODZyNTlhdUxUU1d1bHNaNUxkV0NDWURDSDVIMDl4VmhGcE9sNlQ0Y3VvU3ZxdDZ2UXplWkZQc3A0L0dyQmRhUzduTnBmVy83dTRURzFqbkkvcFVXazZLVVpOV2xvODR1NXJ6V1hqYWNDT0ZNbFZ4MC9yVXkwU0t6OE5GQldkeUFDZXVTZXRXK3AyWTB5OHdBV2pZNVJqM0dPUHJVQzZ1YmVPUU83Wmt4akpYSkh5cUc1UDlqZUVZSi9aclUzc0k1T1BGMkR4QjYrOVJydkxFdEJqZU1aNDZqL0FHcG14bWxqOENZOHlSNURxUDRscWFRZ3VDNjRNTWhMUm4rbFZQNXJtdS9KTVZ3ZkI5UG93L3hib1JHcXc2amJiUkRjQXJLUU9GZnJuNjQvR3RQY3hDNXNVbGp3VHRCQnoyeC84MU1hM2h1SVpMSzR5WVpVMjhkUi92M3B1MGoreDJTUVA1aEVQRHo2K2hxWlNiU1lRalZ3Wm50MlZaZWhwcTF1MHQ3ckc3Q041WDQ5Nm02dGJHR1VPQmxXOUtnTkNoSEkvS3JUdlpnN2k2WjZKZGF3Ymo0SkZySVhiVVozOENFZ245NXRLWUo5ZVhRLytKOWExTmpaUjZkWVc5bkR5a0VheGcrdUIxcno4U2pUSS9oVkpGTDRSNzEwUDhLYnlGeDc4NStncjBsWFNhTlpJbURSdUF5c09oRmU3K255NTNLVDNyL1k4ejFzZU5VdERUVUJweHFiTmVtanp3RFFHbkNLQnFwQ0FOQ2FNMEJwZ0lhRTBSb1RUQTRWMWRYVW1BbmFrTkZRbWdRaHBLV2twaU9wQ0tXa3BpQnJxSTBKb0E2aEpvcVJxWWdhNnVycVl6MFl3c2JneVhEbDNQSkpQSnFmYmtMZ2tqQTZDbzA0QVlrTm1nVTU2dGdWOE00dXVWNlBwcFphZWk5UlVuajRJSkZVdXBRc203QzgwNWJ5eVFTQjFPWXoxTlhCaVM5aHl1QTJPdFZHVVZwa3lpM3RNd2x4NWM1NitsVlZ4ZVl5QldsMWl4YUVPZS9RMWpycUxFaDVxcnA3RzRLclRFYWJkMHptbUpzSHR6VGtGdkpNMkkrZzZzZWdxWkxheEltM2V6U2RjaWszWFFKV1F4SHRqVWRNZHFRakhIclQ3ak9DZXROT1FvOVNLeGRzNlZvWkIybkJQem9Ha1ZGWUFBQW1nbFl0a0lDU1JRalpGNXBDTTlxcU9KeTJFc2tZL3dBanAzU2xTUnNIWTlhYW51SUlYaFNKTWxlb3orcHBtNXVXZFFDMnhBT2FwYi9VNDBSaERqaitKdWxhSnFPb21VcmwrZjhBc1Q3eVR4TVBjekE5d0IwSDA3OWFyTE9aYnErMmY5clp1Q25xUmtkZnhxaThacjkyU09mYS9VRmh5ZmxWaHBFYldVVXZtTFNOeXpaenp6VVNiNzhsUWR0THdUNTRpbVdjakRkS3oxM01uaUJMWUtZQ0Nya2V0WGNoYVdJdEtlR3lCOHF6OG9TS1V4UURmQ1Z6dUhZNU9hdzdaM0o2b1l1UEs0S055T2h6VTFkWGtXejNDTHhwUVF1QXdVOStmeXF1M0ErVjhpbXJaQytvUWdBazVPQU8vQnFvclpua2ltckgvaUsxRjlZcGVvb2puVkF6RThibHgwK1lyTVdrTXQ5TkhCWnd5VFR1Y0xHZ3lUVzRzdmh5K3ZvWXpyVW4yS3pIbThGZitxdzk4OEw5ZndxOHQ1N0xUVWUzMGUyU01ZOHpLT3Z6YnFhMjVLQzJjbkZ5NktYUS9oS3owNUJQcndXYWJJS3dCOG92K3JIVSszU3JpZlZIbFJZclJWamdYaFFGMmdEMkhhb2NqeVNFU3luYytlRDZVVnVuN3NrWTIxaThybDBkVVBUeGp1UTVJaXNuaUlRU3VTdkhVNHFCRUptWVMzSGxsR1hRZTNjZnBVeDI4TkZkZ2NBOU04a2ZLb1BqZjRqY0xKSGxmQis2RC9FRDEvcFFhUnF2MkxTNHRrMXV4U0NWOWs4TWdramM5aUR5RDdFWkg0SHRXZTFGSVVmWmVEQmlQTzcxK1ZYZHF3aGtMb2VNOURTNjdZeGFuYUM0VlFXUWZ2QURqY3ZyOU8vdFduYTJjN1NoTFhUSXRqTkw0Q1N1UFFxZjVrSTRQNFlxeGpkZGpSOC9leU0vd2s4MVhXTWl2YXhxUXBpaXdpc09tM3QvYjZVTi9lZlk0STdnNXg0Z1dWY2Z3a0hCK1lJRlBIS3BEeXE0MnkzVUNXUERBcEtDYyt6ZXRjcm03dDlwNGxpUFQ5Ui9XZ2prV2VJUEczbkNqY2ZVZG1yaEdUSXM2WVNROHRqdlNsSGk2OE1tTXVhdGRvYW1WYm16ZFNNY2NleEZaOVVjeUNQR1dKd0I2azFwcGNlR051TWRXK1pOUXk2NmROSnFtMVNiQmZGMms0M1BuRVk5OHR0L0Ewc2ZkQ3pSdGNoZmpxZU52aVNTQzFZTkhwa2NWZ2pBanplRXUxdW4rYmRXcitCTlhqdWJZMk80a3Bsb1MzWGIzVSs0TmVaUUs2UXI0amw1Vzh6dVRrc3g1SlB6TldPaVhVdG5lQjRHeElHRXFmNmgxSDFGZDJEUDdXVGt1djhBOEhGa3hySkJ3ZjhBL005a1lZTk5FVU5oZHgzOWpEY3cvY2tHY2VoN2o2R25HRmZTeGttclI0Y291THBqWjZVMmFjTkExVWlSczBKb3lLRTFRQWtVTkVhU2dRSnJxV2tvWUNWeHBhU2dBY1Vob2pTR21TRFhVdElhWUhab2FMRkpUQVNrTkthNm1JSEZkUlYxQUhwbHhhdWlaVUZxZ1liT09hMWRyT3JjTW1SOHFHNGh0Sk9xN0dOZkVOeWJwSStuWEZQYUtPemNyNVhYS21yS0hkYm5mRTJZejJIYXVlRkUrN2dpbXhJRTc4ZDZ3dW5UUnI4WHVBL3FFQXVvU1J5VDJyRmFoby9odVdtenR6OTBWckk3dndud2g4bWVjMTExQWwyaFplVGl0b3pYVE1tbjNSZ1pjanlJQXFEMHFPU0FlTTV6ajUxcGJ6VFNoWWJjVlhOcGJzQ1JnRDFOSjdacEZGTXpkdTlDME80WmtiQ25zS3NwTFB3ODdGM04wcXN2TGVUYU41eHpqZ2NDclNpdGlsSnZTSWNzZ1RPd2pIVEpIRlZWNWRSeDU4MjUvblZuY1c3RjhITHBqSzhjVmp0WkVuall3d0JHYWFrNVBZdmI0cTBPeVR5WGNqQVBoVjlPZy92UVhGdkU4TEkvT1IxNy9Pb05uY0JNd3ZsU1R3ZlducG53UE1jK2xOMGhKR2Z2b3BMS1ZTSHlPcXN0WG53OWRmYklwV2NIZXVGUG9ldFJMcmJNQ2pEY3BITlNQaCsyV0hUN3ZEN2kwaENnOXVCalA0MW5rZXJOTVMrUk9tVnBFOEVzTm1OZ1BvT2xVZDRVZ3VHdDRzc3FnRUhQdHpWMklqS2l4cklzYnNBdmlIT0Y5Nmt4UjJHa25laW01dWxYQWRobkh1QjIvV3VaYmRzN1pQaXFXMlVtbjZEYzNZYVc1emJXeE9kei9lWWV3L3IwcTRoTmxwUzdkUGp6UDNtYmxqOWV3K1ZOM2wxY1hPMHU1QVkvY0hwZzlmeXBqd2NQMEpHTTRIYWg1YS9FVWNMay9tUFRUTmNSN3BaQ3hKQjJqb0tid1RqQkNnRG9EMnB4VUNnS1FCbmpBb1FRSm1WdXA1QXo4cXlWczIrRUZRMnlsWTFkUWNsZ2NlMmVmeXpUa2J1TnlMeVN6SEFHVHlTY1ZJZzB1NXVKeStQQ2dXUUZkM1Vyc3hnRDVrMWZRUVd1blc3U1NiRXdmdkU4bXVySGduTHZTT1hONnFFZXRzejlwcHB1V2RyZ3RHZ1lqSGVtcDBqZ2wyd1I3QXA0SkdNLzdVVjNxc3JYVXh0ZkxHMGhJZGgyK1ZScmhSSWQ3UG1YSUlmUC9PSzNTaGowY2tzbVRJN2JPTzFtWGJ3MzhRTlNyT2Z3cEF4SktmZFpUMHFLakNWQVl4a2hjRUR0UXRJU0FHUFBVbW9uSGk5RytPYXlScDlrcWEwV3hqSXRsSXRueVZHYzdja2tyOU8zdFZMOFNNVjBDN2t4dUtZZkhxQWVmNjFlTGNNYldTTlNOakFFSzNVVkJ1WWhMYTNVQkFPNkp0bzdaeFVLWHlORW53YVpVZkNlc3F5eFFrN3dPWXo2cjNXdFdkeGVNeEhkRTNRKzFlTld0eDlpMUFRQTdWSkR4bnVyVjZoOFBha0w2ekNsc0hQbS93QWovd0JqWFRLTjZPS0U2Mlc3Z3VHNDV6ejcxU2ZHTjRrR3BhYnBoSFRiZDNLZHlTUElwK1FPN0grYXRSbzhCdk5WdDdac0JjNWtKNkJWeXpFL1FHc1I4VEt1b1dHdGE5QW0xcExuN1JBRDFNYXR0eWZUY0N6WTk2d3h4cmIvQUlPaks3VlIva2tYVVNwSURIa3h2NWxQcm1vNXlyWlVrTU9RUjJORm9sNG1wV01ZU1FONU14ZzlRTzQrWXJueXJFRWNpcVd0SE8xNU56OEJhcGlRMnNyQUpPZHlBL3d5ZHg5YTJyREJyeGF4bk1FNDh4VU1SNXY1V0hRMTY1bzJvRFV0UFNicE12bGxYK1ZoL3dBelh0L3B2cU9VZmFmam84MzEyTC8yTCt5UWFCaFRob1RYckhuRFpGQWFjTkNhWWhzME5HYUdtQU5JYUtrTk1RbElhV2tOSVlocEtXa3BpRXJxV2tOVUk2aG9xUTB4Q0drcGE0MEFKWFYxZFFCN3FzQ011WStLaFg5dXpESlhwNlZLOEtTRnN4c2ZrYVptdlNCaVJhK0duRitHZlQ0NVB5VWtwWkJnc1FLaVNTT1B1bklxL1AyYTVCM1lCcXJ2ZFAyT1dpT1JRNTdTbVBWM0FyWG5JKytvRlBXZDhVY0VjZzBEd2Y4QXU4VkN1RVplSWZMeDFweXdScnNJNW5kTkdoTFc4eVpMZ1NIc2FyTDJHUlNRQmxSL0x6VkExeEpBY0JpU2U1cVd1b1NkQzNXc1hLY2ZpK2pSUWpMYVowczRRWUtZcUhQUEU0M04xL0tucFp4SUNldFZ0eW5CNTRweHRGVW4yTlRQQ0ZibmtDc2pxL2dTVE9kbnk1cTJ2bWY3TXd5VmJPRFdMdTVwRE93QlppellBSFd0b3VWa1RTWFJBMWVOVndWNHpVYXpubHVaa3Q5anlTdHdvVVpKclNXK2lTU0tHMUp2QWhQYnE1OXZhckcybXNkT2hkTEMzMkhvVDNiNW5xYXVVMGx2c1VVMzBWMWo4UGdJSk5RZmJqL3RLZjFiK2dxS0lvck81bGppbFY3WmlYMjQ1WGdjWnFWZjNNbHkwUkw0enp0QnFNc1lET0NNYmhuNTVybG5sdlZIWmh3UDhtUFlYSG4yN0c1L3RUYmdaWUtNS2VTS1J4d25RYzV3YTRZQ0huTEFnbjJyQm5VbFFjQ0w5MlRqam44YUl6QlkyVkZ3Y25yNlpxVlphZk5lTUhSUUZ6Z3N3cTd0dEx0N1ErTkpocEIvRy9iNVZyandUbnZwR0diMU1JYWUyWit6MDI3dTFSc2VDdlhlNDZudmdWZDIrbVdsaWl5dGhtMm5Nai9Lb2VvL0V0dERJMFZwaTRsNXdSd0YrdFpPOXY3eStZTGRTc1F2L2I2TGl1cExIaTYyeno1enlabnZTTlJxWHhGQXY3dXlYeFR5QzNSUjlhejExZFNYY25pWExsajI3QmZrS2dRaDNmRUVKSjZZWG5QMHE4MHZSSnJsUkpjYm9ZdXdJOHgrbmFvbGtjaFJ4cUpYYmdxODB5am5ERndkbVFBUU9ocTgvd0FKZ2h2UkhQTXpoeis3VWQvVUgzcTB2cklYVnFMYU1MREFPd1hrSDJxYktabDBuV0k3OGpweWZXcEU2Q1NIeG96NVNQOEFuOXF6bHhIS3QwME53V1dWUDREME9POVRORnZaYlNVUnlEZGJ5SEI3bERqOUsxalRYRmtXNHk1SXViZEZiamp5ak5MSkhuYjZ0elN2RXNWMUdxazdIR2V2VGltcFJ0bVZRM0FiQUpybmFjWFRPK01sTldtZUszME1wdjU0c004aVNNcFBmZzQvcFdoK0dOWWswKzdReWpiSUJ0ZFcvaVU5NjIrb2ZEZHJjVzl3MXNDTDEyTCtKSVFCbnFGeDZIcG12TnA0bU9wcEhMR1ZtVi9ES25nNTZZcnRqSlNSNXJUaXoyZDlRYy9Ecm14SmFmVTgyU1NyL0REZ05LM3oyZ0wvQU9WUmIyQ0tUUzViWmVFTUxJbzZZR01BVk11N09MVHBiQ3h0dk0ybDJpMjhyWnlESzNubEErUklIL2o3VTI0VjJVakhoT1BLZlQxRlpaZHExNDdPbkZTZFB5ZVI2ZmNhaDhQWGRzYm0za2hndVR1VlhHRDdrZmlPUGV0NlpWdXJWYnVISlJ1b0k1RlA2M3BVZDlaemFmUGdNLzd5MWtiK0dUMHovd0E0TlJQaFVJTEs2MDZSR1NhM2JEcXc1VW50K0lOVE9hYTVJbUdKOG5BQnNzcDdDdFI4SGF3MWxkcDRyaG8zSWptejZmd3YvUTFuWllqSElVUHJTMjdyRE1IWVpYb3c5VlBYKzlYaXlPRWxPUGd6bEZTVGpJOXJjZHgwcHNpcXI0VzFBM2xqNEVyYnBvUU1OL09oKzYzNFZiSGcxOVhpeUxMQlRqNVBuOHVONDVPTEd5S0VpbkNLQWl0VVpEYlVCcHdpZ0lwZ0RTR2xyaUtZQW11b3NVSm9BVEZJYUtrb1FBMTFMaWtxaENHdXBUU1V3RU5KUlVob0VEWFZ4cnFBUGRKcHl1Y25yVlZOKzhKOUtuU3dtUWxjMUNtVjdjNEkzZTFmRFVsdG4xSEt2eDdJVXNicTJWUEZkNDhpcmhTR1BRMDQ4b2xRcXd3VDJxc25rTVRFTGtEcFU4M1ZKRlVwN2xwblR6cm45NTk2b3JGWnVOd29KSFNUT2FZZFIvQWNVMDliWVMxcEN6YWZ1ZFdCemc5S3I3bUFveHhuajBxZEZLNnNjbklGRzBzVGtodXBxRzMvQUpHa05HZmtaZ3g1eFRMeU1jNUo0cTJ1b0VjVlZ5MjVYb2VLVGFMN0lseEI0eTRKQ1pPZlUvaFVIN1BiYWV4K3pMdW1QOFg4WDQxS3VQRUpQbXhqcWZXb2JsVUs0SG14Z21yOXlsU0Y3YlpYWFR6U3R2bE9DRGdDb2pSbE54ZmlyR1Vja2tER2MxVjNraGNubnZqMnJLVXJPbkhEajBSeDk3Qnh3Yy9UTkFUbU1PM1ZUbkZQeHdtYWVPS0h6T3h3YXVyRFRJYmRnMHgzdnoxNmZoVHg0WlQyR1gxRWNldTJVOFZuUGN6WlJEd3VTVDB4VnRZNlRIQTNpVDRjZ0ZzSHBTWGVzMjl0STZRS3M3aFF2bE9GQjl6MDcvT3NocU91WGVwU01KaVVpQkk4Sk9CL3ZYUW80OGY3czRwWnNtWDlrYSs4K0lyUFRoNE5zUEhuNmJVKzZ2c1RXUzFUVTcvVUNSZFRCWS8vQUdrNFhGUTQxeWRzV1hKNXdCa2ozcExpUlo0OEt5aGgwUHJTbGxjaVZCUkk0S1FyM0NEb2M5RFY1b2VtblZHOFV5S2tVWnd3Qjg0ck5PdTRuSXpqN3kwNURjeXdvVmlrZEF3eGxUakk5RFVNbzlMaEZ2WlJDRzFRdXlqZ0tNayt1VC9lb04xQlBmTisrbk1VUVA4QTA0dXArWnJKL0QydXlXZHlzVjA1TnUzSFA4Sko2NTlLMnBsRHFHUXJ0UElLbW82QVpndFk3Y0FRcnN4MWJxVDlUVE41ZXRwN3BNNHphc2RzdlVsZlJ2NzFKTCtwcXQxcTl0N1d4bE55Y3E0S2hmNWpqcFRURTBNL0V1bi9BT0p3UjNOcVY4ZU1FcVFmdmpzS3hpWGJNUVdHMWh3VnF3MDdXNXJPMmNKNXhnNFZqOTArbzlxb29USlBJeFJDek14SndPQnpWcC9ZcXMyT2k2Z0x1M1dDVng0cURodTdEMStsT09KRmthTTRMcWNqSGNWbVlzV0VzWUpjemJnUWM4TG4vd0NhMU1KZTZ0OXJoVnUwR1FRZnZMVnRyS3Rkb3FGNEhiNlkyMGpiRm14dWxqUG1HT0NEL3dERk0zSHcvWXlheGIvRWZHMjBJa2VFY0NhVWY5TS9JSGx2OHFtblJQNUg0NUlBK29xVmZXL2hhSllMSTRWTCtkenRPYytHb0FQOVIvNSsxUmlsVEx6d3Rja1ZQdy9lUGVpOG1sY3V6ekZpVDFPN3YrVldzTEFNNk5nbzV5cDdCaC9lcXFHd09tYXM4TUtzTEdXUGZFL29RZVZQdU0vVVZZQlhHSStDeCs5NmV0RGJqS3lrbE9DUkttak4xYlBIblpMRWNxU09ocUhEYXU4aHZWQThaa0NUZ2R5cHdHcVZESVhqeDBrakdHSDg2ZXZ6Rk15eU5aeUxjeEFNdlJ3VHhqMXhVeWp4ZGVHSk52ZmxEZW93NXhJT21NZlgvbUtxRzYxcHBnR1VxbzNJMkNENlZuNXdCdGRCNUg2ZXg3aWlEclJHWlcrUzhsdjhOYWsxbFBHd0ozUTVJWFAzby80bCtuV3ZVSTNTZUZKb21EUnVvWlNPNE5lS1Jsb21ESWNNRGtWNko4RDZxazBEV2JIQnh2aUJPY2Z6TDlEK1ZleittK280eTl0OU04ejFtTG5EbXUxLzBhWWlrTkd3b0RYdW5qc2JJb1dGT0VVQnFrQTJSU0dpTkQzb0FTa0lvcVNtQU5kU21rcGdEWFV0SWFCQ0d1cnE2bUFsZFhWMUFnVFhWeHhYVXdQYUpwZ3h5clk3MUN1SkRua2sxRmxjNU8xcWFNMGlmZUdWcjRiaSt6NnVMaXV5WDRTeUprSEJxbnVRUVNyMVl4VHJ0TzAxSHVOa3YzU00rOVl4eS9MWU5Nb2J3RWNvY1ZYL0FHdDBPR3E4bmlMNVFwejJQYXE2NDA2TlF4a2NrbnNPQUsxVWs5U0lXMEpCY1ppM0huSm9KWkJtbVl2S2hqend2UTBNaWx1UWFuVjBieFRvTnBBTWM4MHhJMjZNazlhWmxKVkR4VVo1bUpJYklCN1ZEVGp0RlJidW1KUG54QndOdUNQclZaY29NTWM1SXFZMDRkY0t3WEZSOEFrbHprQTVxb1JjeXBTakFxNXhKSXdDam9PZlNvLzJNQnlKY3NldU93cDI2MVFlTzhWcEcwcEdCbGVGK3AvdFZjZkh1bi85UTVLRnNNaURDbm52NjFyV09IN3N6Y3NtVDlrVEZ2bzdXN0JnUVRPRklJVThBOGQ2Z3lOZVhrcW1kMSt5a2Y4QVNRa0hPVDE5UnhRelg5b2x5a0VmblpzSUZYN3EvV2pSOXJLemdrRE8wZ2V0UlBMSmxZc01XNzdJOXhwc2tyN295RWhqVm41T1JuNWZTcXBJUEdpZHNrRUVISXExdXRSbVhkREVnQ2JEdWJxU0QrbFE3VWdRT0Y0SUo0UFExaGRkSFFvMzJYbWlTMnNOc0Z0a0FjZmV6eTJmYzFRL0V0cTBWNmJtS0pGZ2ZCYloyYnVUNlVvbGt0NVRKRndlNDlxbVNheGI3RVNVTm1RRTdkdVJ4MXpUaEw3TWNtUGlabVZnMldCdzFScE1GRHRKSFBtQXF5MWl6TUVabXRVM1JaSkk3cC9jVlROSVdLa0FaeDlDSzJXK2pCNkNPUzRWc0hQUWp2V3IrRzlUalN6TnZLeVJMRjkzSnhrR3NrSDNZVkFRVzR3QjBOUFMybHc2K2NCUmtEY2UrYW1RMGFiV05mOEFCQlN3S09jY3lIa0QrOVV1b1g4dXJxTnlFQk9tM3BuMXB1R3lTS1BjekdVZjV1M3lGVG1SRVpDZmZLam44cXhlVDZPaU9EL1VWMEZrUEw0cjd3QnlPbFROUHd6cnNUQ2htUWdkc2NVNjZLdUhDL2VBOG8rZis5TXBxTWFYS1JJd01qbmJqclRYS1k1T0dQb2xYTU1JWnBaY0JoMEo3VWNYak0wRTZGbHVJZHdDNXdHejFVL2dLcjlRdHR4QU1ubU9keCt0WGVsWFZyUGw1aVFsdDU3bkE1MnFNa2ozT09LMHgydWlaMDFVZ1daZFJFY3RrRzhTUndoaUhKRFp4ajU1NHF6K0tKb3A5VVZJVHVnc1lWc1l6MUJLWjNzUG01YjZBVm5maHE2bXRJNWRSZ0JpdXJvczZiZiswVGtCZ1BVQTVIdmlySXdMYldjTWtMYjRUNWZYQnJvbWswNVI3OG5Qams0dFJsMTRKVmhNSmtlM3VlaEdOM2NlNG9KNDVZNTFCSUVpOVQyWWR2eXBtRUsyQ0NSSURrVWJ6eVBqeE1aeHg2Zkt1ZHlSdkdEVGRkQytMNFUvakJzYk9NSGpQYit1S2x6UktZeE5IekJPZHUxdjRHSFVWVDZ0RTgrblhTcU1sbzJBOSs5TmZCdXRKZWFlYmU3azNGY0Y4bnQwRC8zclRHdWNYRm1lVjhKcG91bGtIaGdrYlRqcDYvOEFNVm1vYnBQOFR2YkdVbFNKTXI3WjVCK1I2ZlN0Tk9HVW1OK0NnSXlQZXNCOGVPK242MVpYeWRIaThLUmY1c0gvQUhxSUw1Y1dYbWFjT1NMbVdaSW0yU041K21POVN0S3Y1N1M4U1NKTm5tQlZqMmJ0OUQwcUZZWGNXcFdndW9RQzZlVnpqQjlqVHZEZ2c4ZzF0R1RUdEhLMVI3TnB0Nm1vV01WeWd4dkdHWCtWaDFGUG1zRDhCYXkwVncxbmN2NUpDQmtuby9yOVIrWXJmc01WOVI2WE9zK05TOCtUd3ZVNGZhblM2OEFHZ05HMU50WFdqbUFOQ2FJMGxNQktTbE5KUUFsSWFXa05NUWhwRFM5cVEwQUpYVjFJYUFPTkRSVU5NUnhycVROZFRBOU1lUlFjU2NaNkdtVEtVSkI4eSt0Vmh1VzVWK1JRSmNsRGhtSlUxOEY4bDJmV3lpcElrM0xIZVBBem51S2NqYnk1bUlCOUJVUjdzRElpQTZWR2VUeE9XSnlPMVcycEswVEZ5VDJXNXV3VjJxQVFhaFhNSWNsZ2FpTE9WT0NhZldVWXpuT2UxUkozMmFlM3gyaUpQQ3kvZEhIclVhUml2WThIRldFa3VSZzhZcURONWcyN2hSM29qQnNVNXFKRG5sQk8wTHlhcm5CWTU2ZWxQenN3TG1GZHg1NXp4VldETzhiTktRUjJVSEFGYUpRaVovT1FUelJJdTJOUzhtU2ZZSDUxVTNydmNLd2tjdXY4aThDdTFQVTRiY2JWSmVRRCtIZ2ZqV1p1Wjd2VUcyRjlrUDhBS09CL3ZUZHk3NkxqVVBGc20zT3JRMnJNa0lFakFZOHA0L0dxajdUTnFNcGpNeUlPcFFISDVkNlMvd0JOY3dLOXMrNWw2cVRqZDhxcGttMnVDTXE2SEl6NjFLVkxSVGs1ZG1tdE5NaTNaWldrZFFjWk9NbkZXbHlTMDJBdkE1NHFwMFBVL3RkMFZLRlhRWjY4RWRLdUhaVlptd1RnWlBXc3B2ZXpvd0s5ak9vU1J5YWJMYnhGVmtZRE8zdmdnOG1vRmt1SWw4VGtrbjlhbGFoRXNGazkwRllPN0RBYmpBSjlLaklTWVZiczJEVVBhTlZwblM0S05qZzQvR29Wb002cXE0NlJOejc0cVMrNEU1NVhOZFk3V3YxT01rSzR6OUtJeDJUa3JpVXR4cTA2UmlNQUJzWXllZUtySTRDL25aeXE5eDNOU3AvREx3Wnh6d2ZwVDZvSGRzY2NkZTFWZGRHWHRKdXl5MDZ6UlkwZFVPV0F5eDVxZHFWc3AwNlFuakdNZmlLbDJNTHlyR3NhbHlVSENqTldjMmpHUzFhTzhuRUt0MVZmTTM5aFduSFZzNWVXekV5ejRmMUJ6bkhUclYxcDJnM3Qwbml5SWxzaDd5NUIvRHFhdFlXMDdUbkEwNjFEektlSlc4ekQ2OUI5S0JyaTV2SFl6U25QVW9PZS9YOHF5VGhIcmJONVBKUGZTSU92ZkQ2alRDdWtUdkxkeDh1cElBazlsSFlqNTgxNTVhNSszUXUyZHdjZnJXOGFXZUhVM2FKWENZQUI3RWordFFQaWJTeGN4LzRyWVI1bVVicDQxNnNCL0VCNitvK3RkR09Ta3FmWmhLRGc3R3J2Y1lONHg1UmtuTlQ5T2lodHZoaSt2RzR1dFFQK0d3ci9BSmM3cEhIeVhBK2Jpb2tibFUzeXNuaG55NFBTclBWWURiNmpwMERzakxiMm8zSW8vd0NtOG5uT2ZmR3o4S2lHclp2bDI2UkZ1NFVFU2dMandsREFyMng2Vlk2SmMyNkt5dGlTMHVqdTNkbFA5T2FyN3dsbGxYSXlvQjY5UldmMGpVMXNybVdDVHpXYnVRZjhoNlpyVEhKcDJqUEtrOVBvMTJzd0hUSmtlVTRoUEN2MjlzMDBvRFJGbGJqUEFQWDVWWldQaGF6cHMybGFqSUczSVJFNDY0eHdjK28vU3E5TFo3RW0zdWgrOFZGVWtIZ24xSHo2MUdYSFh6aDB5OE9UL0NYYS93Q1FJcmtGRU9Namc0UHRYbVZ2UEpvM3hEY1FBK2FLVnRub1Z6OTM4SzlNOHBVUmdjcVR6NjE1ZDhlN28vaU9WaHdXQ3lLM2ZwaitsR0YyNkY2bGFUUjYxcFY5SHFkaEZMRmplRng4eDZIM0ZWUHhGbzlyckVVQnYybEVVVDVQZzR6ZzhkKzNTc244QWFyY203TWNZT3hoa25QQVlZNS9DdlJaVjNSbDRnREUzYjBPZVJWWkZ2a3UwUmoydUw2WmwvaG0wK3dYVTloT2R5N014dUI5OVFlRCtIWDVVNHZEc29QM1NWcTZpdGcwc1czUDJpRmlVejNVOEZmK2R4VlZxQThPOGFUR0VPTncvclV4ZTcrd3lMNFY1UVVCOEtVTXhPM0dEanJqMStsZXIvRDJvalU5TlNSbUJuUWJKUjdnZGZyMXJ5Nk5NcmxxMXY3UDVzWGR6QWY0b3dRZlVBLzcxNmY2ZG00WmVQaG5uZXJncFkyL28yalVEVVpvRFgwaDRvQm9UUk5RbW1nRU5KWFYxQUNVbEVhSHZURWRTWXBhNmdBY1Vob2pRbWdZaHBNVVJwS1lBNHJxNnVvRlJwUys0WnpTRmdSeDFxQXNwWHFlS05aUTV4bkJBelh3U3RhWjlmd3I1UkhpNVhJb1RLRkJ5YWFUYytBQnhqcWFNUXFoQmtPU0JubnBWcURidEV5eVJYWWNZZVU1VWNZcDhLc2ZMTndCelVYN2VrU2JZUnZQcjBGUVpacEpwU1hiSUg4STZab2tveElUbEovU0prOTJ1L2JHTSsvYW9jMXd6RUNVNVRQUWRLRGVHSUF3QVBXbUp0NnNjN2RtT1BVK3RDblpUaHgzMk90SXV4MU9NZWdxazFWUTFvd0JPV2I4S2x5RWs3d0NCM3FtK0k3eDRMWXF4QUcwc2FWSzlHbW1qQWFwZnpMTXdEbk9jVTVwZDY1aXpMTVdZbm9lMVV0K3pQS1dISzB4SEtVYmNod2E2T09qQ3pZRzdCSExjbnZWZHFNTWR3TnlZU1VjN2gzK2RWME4rQ1BNZHA3aWtudmxYN25uUHo0RlJWRHN1dmc2Q1E2aGNtVWJUSEdCejBPVC90V3FDYjBkVGpHTVZtZmc2ZHA0YjEyd0NySmdqNU5uOVJXZ1ZnRkFMRmk1eVFPd3JESnVSMlluV095dnZEY09YTnhrdzd0cUZ1QWY5NmFsbUt3cXFnbkE2RDBIL3dBVkorSXBJcjJ5OEtDVk55SGNjRGcrMmFxVkx5ZUZIRUdhVWphcWprazBLTm9GSmo3VEJ5U25Ub2ZhajB4Ly9YajA4Tnlmd3FkcGZ3emZUYmpkRmJTRW5kbVRsaUQ2S1A2NHE5dDdUU3RISm1pak05d3FrYjVUdTQ5bDZmclRTVVhiTTV6VGp4WFpodFAwRy8xTmthMHRpWXU4c25sUWMrcC9wV2tpK0hOT3NXMzZwZG1jL3dEdFIrUlQ4ejFQNVZOdk5SdXJpTElQaHhuQUFIQnhuOHFoTkVHWkZZTVd6eVNNMURtdkNORmprL3lkRTl0VzJSaUxUNEZpaFVZQVViUngvd0E3MVd5eVhGeE5pV1VzT3VCd090Y1FRU1Z5QURnQTAzdUVrZ1YyNUF6eWNWRnVYWnJIRkNLMGlRVThKSHpnWWI3b1ByNzFIdkluUzNiN0tTSldaZUZ6eno2MUxrZGZDMkJjRTR5QlVXS1JSZHlQS1FBQWNnOEFZd1IrdEphWU5OeDJSQkhMYkhiT3k3Mkc4QUhkemlrdExreDNiZUh1Q0VnOC9yU1hWeUwzVUlIVE95SnZEWWRDUTNHUlNReFl2QXFkUTNHZVNhMDhXWXRMb2xYbHBibThpdWZDQmlYRXMwVzNnZGNISG9TTWUyYXFZcnVlZlVieTV1NVdrdUx5UXlNeEdPZWUzYlBwMjZWWVIzVG5VcmlWdktwY1J0L0VDQU1iVDdEN3YwcGk1MDlvcjRTeGdteVlia0k1Mk1EOTBuOUNldGF5ZHJSaEJVMXkvb2RsaExrRk1kTTRJejlLOC8xa2l6MVc0S0hNYlNNR1grdGVreHF6QlhkdzJlTWpnRWRxODgrTVlESDhRWEhkWEtzRGpqa0NsaWV5c3kxWmZmQzJwbGJpS0tTVG5yRTN2NlZ1YnBFMWF6U1ZjQzRpeHVBN2dkdjdWNG1rczFsS0ZKSVhPVllkQlc5MFBYWkdqamZJYTRRZ1NLRC9BTlJTZXRiUmZIK0djenQxOXJyL0FQUlprcWsyT2c0QndLekh4VjhOdnJXcHd6eFR4d3hyRnNiY0NTV0JKNkR0elc1MUdCSjdkYiszNURETHJqODZwYmhkNElCS04yWWZ3bXNKSjRablVuNytQUjUxOE15M1dsNnI5a1pOcGpuSGk1SFFIQVA1VjZ0YXpLZ1pTY1JQeWZZK3RaZld0T045RTExWmhGMUJGMnNQNXdPM3o2NC9DcnZUSkZ1Tk5oYVFZWmtYY0QyUC93QTFVcFUxSkU0NHB4Y1dXTTdNcTcxeHZUSitmdFJRNlZOcmQzR3Rzc1Jka0xPSGJBSHFUK05NMjBuaUlZLzQwSEE5UjZWTzBLNFd6MW0ybFo5aUJ3RzlDRHgvV3F4eGo3a1Uvd0FXUms1U2hLdnlSZVdQd1RCRmhyMjRhUWYrM0dOcS9qMXJRV21uMmxrbTIwZ1NMakdSeVQ4ejFxeGtHQ2ZhbVdyNnJENlhGaTNGYlBtNTVwNVB5WXlSUW1uR3B0cTZrWXNCcUNqSW9TS1lnVFNVVmRRQU5Kam1peFNHbll4S0UwUnBLTEFRMGxGU1lwMkFPS1RGSGlrSXBXQUJGZFJWMUZnVFZWcFRoUVNQWHRVbUswVkFDNTUvQVV3K29SUmp3N2RkMjBkZWkxRG51aXk3cFhHM1B5RmZHZkdQN3MrbWJsTGZTTENlOVJCdGlHNDR4bnRVQ2U2M0F0TStjY1k3VldYZW9BakVTbmQ2L3dDMVFnSnBqNWlWR2VyZGFsdHZzYTRyclpaWEYrZ1hhdko5K0JVaFpDQW1jSGp6R3FWcmZOekZ0YktsZ0Rtck9SOEVoandLemw5RzJMZTJQRnZNY0RPYWFsbXdWUDN2WDJwcDJ5b3d4MmtkdTFSbWNZSSs2TTU1NzFGVWFqMDhybFR2SUdlZnBXTitOcDFOaElRVHZJSDVtdEJMY0J3cHpsUWVvTll2NHhteURHRG56N2Z3cThmWkUvMk1tc3BVNFBOTXpPQ2Nya1U4K0NQZW8wcHdENjF1cEhPNDBKdTQ1b1MzY0dyM1J2aEhWOVZSWlZnK3kyeC83OXdDaWtlcTkyK2xiSFR2aERSTktWR3ZOK3FYSjlmSkdQOEF4SFg2bjZVMjB1eElxL2dHSGZwRnhLcEc0ejdRcEhVQWRhMFgyWXF4amxZTHVjQUtlcHppbDB4TGFKNXY4T3Q0b0k5eFlvRzhpTWZUMDZkS0JEa2hpcGFSY2VZbmdtdWFUVjJqcWhiaW9vazIzdzNweVFMTmQzVWhKSG1DTmdFK21lMVBpN3RkTlR3OUp0VmlMY0Z3UE45VDFxdGRUTWdsV01MdktsaU9CMjYrdEJjdXpKKzdIQXo1dW1mcFVTbTYwVkRIeWV5VTE1Y3pPVmRzOU1BQ214SElpbUp1Qys0azU2QUh2K05NS3JJNnlPM0FPU1Q3Vkp1bVkvdmllQU9CM0lKck96VjQ2ZWdVVE1tSGZlRndRTVk1L3dDQ2lobExTbFY1T1Njam4wNzFCSWxsa3dvT1R5MmVPUGVrekpBMjd5N0ZHVDZINWZoVDNSVFNIcG8yRE1Od0NxTnpaUFhKcU5JbUdhVUxsRlVITkt5WEY1ZEpKQkM4bUhWZkl1QUJubXJ5MzBjelJySEkyRlBWVnJWWXBQb3ovd0RrUldtVnNiSGxzakxZeU9wOUtjdXJHZTVCQ3hlVWpxVHp6VjNGWVJ4UEdNS010am41VlBXQlZZRWZkSUhVOVBwV3NmVGVaTTU1K3MvMG93OXpwRWxyS3l4Rm1kbDM5TVorWDQwTmxtRVRhbExJcS9abHlnWWN5VE53aWdldWVUN0thMnplRTF6SENXVWtLUitZck1hdmJMZXVYMC9EV2xySTNDOUpKZWpNUGtNZ2RlcDk2dVdGSldqS0hxSExVaWpqajJ4S203bFIxUGMvNzFOZ3V2czBiaVpDOFdNTWc2a1ZESjgrM2FTTUFtbjVuREFOejVPbzlhNXJkMmRjb3FTb2tXd1FGb1ZiZEgySjlLeVB4aEg0ZDlFVzUzeGRjZHdUV3J0L0tnQjdIT2ZhczU4ZkQvMHRyY0tUdTNzaHorTkVIOGljc2ZpWkI1TjRNY3FqMjlEVi93RERSaFNDRVl6STI1YzQ3NTQvcFdWSkpKemx2VFBhdEo4TUtyUkV1Y0dPUVZyUG93eDltNTBtOU52Y2JaT2JTVTRkVy9oOS93QzlIckZxTFc1WGFEOW5jWkI5RDZWVlJzZkVKQjRKK2RXMWl3dVlsczdnbG9qOXhzK1pQVEZFYXlSOXVYOURsZUtYdVI2OGxQY1E4K0lqN0pFSXd3RlRvVVVRQ1NIT003aU8zSjYvalhYVUxXN2VGSnk2RWM0NFlldE1Xb2VHWGNDZkQ1QlFESXJIY2JqSTJhNVZrZ1J0WnZaTlBlMHZBRDRYaWJKQ091RDMraEg1MWQ3bHViZFhVRHcySFVkTS93QmpWRjhTeFNUL0FBOWN4UTRaa0hpcG4vTHppcTM0RDExSm9Qc2twSVVqeTVQYnV2ekhhdGNmeWpUTWNyY01pYVBZZmhMWFpyOXBMVy9jTmNETEszVGNPNHJSTlhsZStXeG1XZTNZNzFmZWplMWVrYVRxQ2FwcDhkd25EZEhYK1Z1NHI2RDlOOVU4a1hpbitTUEY5ZjZkUWZ1UTZaSU5BYU0wQnIxa2VlQ2FFaWlOQ2FZaEtTbHBLUUNHa05GaWt4VEFDdXhSNHJzVVdBRmRpanhYRVVXTUFpa05FYUUwQUNhNmlycUFJTjVKNFVidW9HVkJ3S29aYnlSMk9TQ2ZlcmZWYmhGaFVEa3NlVFdmWTdpVzlhK0tqTFZNK3BucGpvbUpPYzgwOHQ4Y0VPVDg2clpXd091S1llYlBESG4xb3NqajlHaXM1VE5MNU9SanI2VllxUE9XWTljOTZwdmhuT0pXZitJNEgwNy9BSjFhS1JIdVpBR0lQZW9mZEcyUFMyRk5uYVFoOGdQV29yeWJXRFlPVC96clN5WEhteHUrOXpqMHFMUE1NRkZIUFdvYk5LWTFQTGc3UW1NWVkvMnJBYTRaYnU1aGpoUjVabjNOdFJTeEp6NkN2Um9ZclF4TkxPN3ZJQmd4eDRYSHpKcU1sNUhiZ3g2ZGJ4MnlnWUxJUE1mbTU1TlZHU2p0a1N0L0dKazlPK0NMMlVMSnFVMGRraC9nUG1rL0FkUHFhMDJuNmRvdWk3VnRMUVQzUTZTellkai9BRUg0VTNMT3pRNWt5V0IvSDYxeW5ZZHhPMGJld3BQSy93REVJNEcveUR1NzJXNm5jeUZpb1BLazlLWkFhWmdNY2RBcS9yUndiUzdsbElCSEhOT0NZUm9kb0hIQUhUTlpYZlpzOGFXb2dzdXgvREFBWEdPT2VjMXprUnNxcU9TQ2Nqa25wUUE3NFJ3UUYvRGluR0Nwc1poZzhEUFBORGZndU1lTHNialYzWndXWVpQQTduajhxS05OZ2VMQUNvQWNuMzk2ZWdqTzd4Qmc4Y0E5T2FjU0IzdU1ScVhCWWtnZE9sRjNvUHRvakx0bHNralVrUHprRWRCazBPd2s3WkdKQ1lxNWcwcVV6ZVlnYmdCZ2Rxc2JmVElVSkpRWkhmdldzY0VtYzgvVXBPbHNwN2VDU2FNRUtTcDZNM3pOU3JQUUZUYWJqOTRmUTlLdWxqUk93SE5RTlIxbTB0V3daQTBuUUtuSnJvamhoSGJPYVdlY3RMUk10clpJaXdBQVgwRkROTEJiTVdra1NOZXZKeCtGWm02MSs3bmtZUTdZWXlNZE1zUGVxaVlzWExYTEdWRDBkamtpaDVvclNNMWpiN05CZmFwRkpNcjJxTyswazdtNEI0eC9Xb3N0NWRUWjN6TXFub3FjQVZCc2Z0RGtxc1RQR09qbi9lcDBscGRCVGdSLzZRZWNWazhrbWFxQ1JWU0pKWnROZW96U01Cc2lCYnE3Y1p5ZlFaUDBxLzhBaG04Z3VOUGp0QXF4dkF1MHA2KzQrcHJPenpKTE9STGhJWUNZMTNIbDJQM2o5TUJmb2ZXb0VmaVFYdmoyMGhVSEczSnB3eVBHeFNoeVJvdGIwa3dPWjdjRHdpRHZVRDh4NlZuUVQ0bzlEeG10eG9tclJhbmJtS1FCTGhQdktUMTl4Vk5yK2tOYnUxeGJqTVBKWkIvRDh2YXRNdUpTL3dESkF2Qm1yNFRLNUFDaEE0WUdvdW9ReEUvdllJN2tBN2tXVVpDbjF4M3AyMGNPZU9NOUQvYXBFMEFsWUxJY0U1MmtkK09LNWJwNk9weHRVekpmRStpTGMycmFscDZScTZETnhCRU9BUDVsSGIzSDFyUGFQRkpPWklveUFjYmprMXZvWlpiS2M0QXdmdlovV3FQVjlNK3dYVGFwcGlLYmR3VmxpeC8wMlBjZjVUK1hUMHJWUzVMOXpucHdkTXRyWm1pQVNRQWtZR1I2WW93NWh1QjVpSXlDTWp0NkdvZWtUbThzMVovdmdjNDl1S3NJeXVNeUtDQVNyQStoL3BXVkd6NkxPRUhVN1pVY2o3WEh5RDJjZC8wL0dxMkluWStHSUpiQkh2NlV5bDhMSytoZ1J0aFlFeE4vbUI1VS9NWXEydklsdkxkcjYxWGJLZy9mUmQ4K3VQOEFuRmRFNCs3RzEyditUbnh6OXFYRi9pLytDdUMrTkcwYllIaUtVNTkrSzhmMC93QWUzMW1TMkRsSFYyWDVFR3ZZV0pHellPUjVxd0d1NkxkeDY3YzZ0QkV2MlVTQ1FnTnpnamtnZWdPYXl3K1ViZXBqK01qMG15bUU5ckhHeFhleUs2WVB0eUszL3dBR3ZDK2hxSWxBZEhLU2NZSlBYbjZFVjQ5REs4K2lCb20yeXhaS2tmNWVSWHBIN005VWp2N2VmWmdNNERNdm93NEordkZlbCtsNVAvTHYrRHovQU5SZzFqcit6WXRRRVU2d29NVjlMWjRORFpGQ1Z6VHBGQ1JSWVVONHBNVTRWcnR0RmpvYnhYYmFjSXBLTENnTnRkaWlwRFFBSm9UUkdob0VKaWtJb3FURk1BTVYxRml1b0hSbWRSa2phSkZQM2dQWDFxb1ppdWFrYXF6ZmFuY25JWmowOXFodElDdld2aVVmVXlWbk93SU9haFROaklwMVJKTEtJb1VhU1E5RlVaSnF4bCtHZFNlMGFZSWlNT2tSYnpIK240MDZKV2lkb1pFZWx4bHZ2TVNjKzJha3lsOHVTM2xJKzc2MDBrSWd0WWdUZzdRTUR0aW5oSUZoUlNQTTJNbnFhemIyZENTb2hLWFVuT0JuazVQcFErUnBWUEpZOHNlM3lycG16Skp0QmMrblUwNUxJelJydDJvaTlRQjBQU3BMZjdETFFsdHpFaFIyNDdVMWRRamFuQlBPY25yVWhIWm14RXVCMlBZK3RjeUZrSmxPRG5QSDk2aGxRc2FqdHdjbVFuYU9lS2RLckpBY0hHVndQWEg5S1JuZFdCUVpVZGZRNG9zWmJiMVp1U09nQW9STTN1aGxZekdFd0NXZkh2aWxtaExTQm5JQ2dBWVhrMUoreU5NcmlKV1luSG1QQXhVNnkwYzR4TTRLNUdRdmVyaGpjdWljbVpRM1pTcUZNN3hvaDI0enQ2bmsxSXQ5S3U1WmNoQXFrOEZ6eml0SkJad3dzZGtTZ2pra0RyVWxwSW9sTHlzcVJqa3N4eGl0NCtuUy9JNW42dVhVU25pMGRDcStLN3VCanZpcmFHRUttRkFSUnhnVldYdnhOcDhJS3dTTE8vYkJ3TSs1ck5hdnJsemNuWXpyQ244c1o3KzU5SzB1RU5JeXVjK3paM045YTJhbHBwa2pYM1BKclAzL0FNWFJ4czR0SVMvK2R1QldVOE4vTTJCS3ArOXp6OUtqenFRQzBUSEg4cC9TczVabStpbGlYa3RQOGFuMUo4WFZ3ZjhBU2h3bytsZElxQ1BLS053NTNWU0xJdUNGUUszeTYxTGp1SklzQ1JjcnhqbXNtMnk2U0xTMHNudUpsTFA0Zkc3ZmduSTlCVjlCWndRTGdLSFBxL09LckxIV1lHaFdPNEFoY25ISDNmcDZWYTd3cStZajUxSXc1SHdwRzBFR21KZkU4Qi9zKzBUbnlvV1BBSklHZnBuUDBwd3R4ODZwdFZ2bmh1VnQ3ZFdLRk1TYmZNY3VjQUQvQU1RLzQwMTJESHRTMHUzdTdTM1cyM3EwUytSMlBMRDNIcjNyS3lNOXRNMEZ5cFNZZDI2SDNGYk5KWlpmUDRaaTlOM1VqNWRxcjllanNudDkxNHlCeDkxaWNNRDdDaTc3QklvclY1bG1TV003SlZPVllkNjJ1amEzRnFKTnRkQlk3bitIdUdIdDcrMWVmaTdFTEdPV1FFRDdyWXhrVTJiOFJ6Sk1HS3NubkIrUjYxZVBJNFBSTThmSTJPczZLYk9Veld5NXR0d0xLbys1ejI5cXJ4TUpnVTNFYk9hMVdnYXdtcTJ5Q1VlSE95YmluWmdlNDlhcFBpRFNEWlhRdWJjSHdINFpSL0QvQUxWcmt4cVM5eUJXTEswL2JuMlZkL0dOL3FHR2NnOTZoMnJlRGNPcmdORVFRZDNJd2UyUFNwa2pBeEs1NnFjNXBtWkFBWFVibFBVZWc5YTUxM2FPaVN0VWN0bWxvUTl1RDluYmpIWGJ6MHpSK0VETXdIM2M0cHUzdVhobVdMSytHZktFSSs4T3RTaHNMTVVCQXlBQTNYSG9hYit5SVcxUmx2akZsdExhMWtQbGpXYmFXN3FUMFA1VmEvQ3V1UEpKdllBM0NLRmtYdElucjg2WStPYlJMbjRhdXkvQmpDdVBtRFhubWhhcEpZem91N0JYL3BzZi93Q05hWTIwclJ6NWU5bnMrcDJxVzRTNWdHNjFsNVhuN3A2NC9XcVc2UmtYeG9pQ2M4akF3UjZWSTBMWFlMaXpsOFZTOXE1QW1SZisyZjVoN2NjL2pVblU3WjdPWXhNUXlFSERlbzdHbGxoL25FMnd5NUwyNS8wVTl2WnJBSnhFMmJhVWJsQS9oUFFpdDErem40T24wWjExS2EvV1R4azhzTVE4dTA5TWs5Nng4WlNFK0hKeEcvR1IyTmVxL0JVM2ovRGx1dVFXaExSbkI5OGo4aUs5SDlMVUpaVzJ0bkQrb1NsSEhSYXNPYURGUE1wb2NWOURaNFkzdHBNVTVpa0lvc1kyUnhRbWpOQ1JSWWdEU1lvOFVoRk1BS0U5YVBGSVJUUWdEU1lvalNVd0V4WFlwY1YyS0FCeFhVV0s2aXhubk1LWHVvVDdiZUZwR1FjbkdBUG1lZ3E3dE5BZ2dVUzZ0Y0RucEhGeCtMZjJxd04rN3c3WUl4SEdPZ0F4VVdiOTQ2bVZzbnFjMThUTEl2QjlWSEc1ZGt1Ty90TFJURnBsdXFsdXJLTVorWjZtbzczVTgyODNCQVVIeWdkRFRTb2lJU3B3YzV4aWhqdzdNZHBQcmlzMjJ6Vlk0cnNkR054Y0RKQXhrOUtqdmxVYVNUQllkQjcxSWFUYUVWc0FFNEdEMTk2aVQrWW5iampvVHdLa3ZTR1FHaWthV1ViQTNkdTVvMGRaTGNzb0xIUGZuSitWYzdveklyWmM1d0IyL3dCNmNXMnVMZzdJazJvQjhoVkpYMEp5cnNiaGNtNXkrRDFVWTVJT2FjdVVIaXJIQ0dZc0Rudm1yRzAwY29ZMm1ZRWdkQjBxMWp0MGp4aFY2Y210STRKUGJNSitwaXZ4MlVkdnA4MHNZamtIaGdESEk1QXF6dGRLdDRpcmJTN0hxV09hY3ZiKzBzbzkwMHFybnNUVlhjNis3WVd5dHl4eDk1L0tNZnJXcWhqeDluTzhtVEk5RisyeU1BSENnZHFwNTlhdExhZVZWYmZKdUhrVHpFOGZsVkhOTGMzZVd1cmxqLzhBdHA1Vkg0Y21rekNza2FveUtBeDNZSEhROWFtWHFQRVVhUjlLNjVUZEVxKzF1K2x5dHBHbHVwYkJhUTVZQTk4RDVWRkVTWFVvKzF0TmNjaGkwamNIMnhVaTZ0eWl4eWgvSXhBUEhJNjg0K3RRZFEvZFJMSkM3RHpiY2tkcXhsT2JlemFHS0ZYRXptdnlnYXJMYjIwY2FCQ01rRG5HT1JVclJSWk80VzZKYVU5QTMzZitmT2l1WWtuUGllR0JjRHEvT1dHT2hxUEVpdEhKczI0UHA2MU01ZlExanZzMXlDM1dQWWthQmNZd0J4VkpxZW1pTUdTSS91aHlWUEpGUWJYVkpiUmhITUM4ZnIzV3J1SzlobEM3WlU4M1FFMGs3SWxIaXpNTmI0WTRQME5CSVNCNW01NllGWHQvYXh6Qm5oSUVuY2R2blZGY0w0Y2hTWlNyK3ZZMWFaREdSS3lPTVkyWXE5MFc5bHZmRnRwSmd3SytVdWM0N1k5Nno4dTNnZEQyQTV6VHNOamR1QXlSYmUrU2NZcHNScDU0b1VBTThzdTZQSTJ2SmpjUGFtdFF2TFhTYjFralV5U1JvRktMeHNZakp5ZllZSDQxbUlibC90SGpYTWpQNFNibFFqSU9EZ0E1NmM0cVRwY0Vja0x6WFFIamIvTVhQSkp3U2ZxU2FtVWxGV2FSZzVTbzZYWDcyK25Ld29WVWNZVCs5TWl6bnUxTHp5NEdPM0xmaWFzYmZ3SXR6QkQ0aFk0T01BODlxYS9mSWhVRUtHQlBUcCtOWXZJMzBkRU1LNmV5SllXcWlPM21ZczI5TStibkI0NmZuUTN0bzE5SW4yYmFRb0laaWU5UDJhckhNc083S0loMmc5dWFudk10bEFKSklaQkdUZ01Cd1Q4L1dqNVhhMlhVWXJpOUVpd2NKYXhRcklWdTdmdXZVZWhGYSt3MUJMKzM4RzVWVm5DK1lkbUhxS3htbGdYY3d2RnlJWlV4endRYy93QzFXRUxNZG1DeXlJUEt5OVJYUmh6UEgyYzJiQ3NtMExyZWxQWWw1STh0Yms1NS9oelZYRXlzZU03U01aOUsxeTNVZDdBMXZNcWlkUUdLbm80ejFIL09Lb05ZMHhySW1TMzNmWnllZlZEL0FHelcrVEduODRHT0xJMThKOWxhcXFKTU9QdW5JLzJxUkdNU1o2NUErdjhBdlRhNGVNT29HN29mZWpBRzREUGxIYXVZNmg3VTdVWGVtWEVEY3JKR3kvOEEybkg1MTRBN01IeXg1VTlxK2dUSVZBeU1vVGpJcnd2WHJjMitzWHNKVXJzbVlZUHpyYkdjMmRkTTlMK0JvdkR0cmlQZnVEN1pRQ1BhdGhiU0c1QnNibkpZZ20zbFBiajdoL3BYbTM3UDVwMnU3ZVE1TVJqTVJ5ZlQvd0NLMzBtZG9KUGZPNGNFSDFwS1hHV3g4T2NkYUlrc0pSM2drWERJY0VIOHEzUDdNNXdzbC9hZHlGbC9vZjZWbWMvNHhhUEx0VmI2RUFPRlAvVVgxRlI3YStuc3BSUFpTTkRLUnRKSHAzSDVWdmhtdlRaVlB3UmxpL1VZbkgvSTlsZGVhYksxQitHOVdqMXJUbG5YaWRQTEt2b2ZYNUdySmhYMHVPYW5GU2owejU2Y0hGdE1ZSW9UVHJDbXlLdEVnVUpGT1lvVFRFQmloSW96U0VWU1lnTVVKRk9FVU9LWURaRmRpbk1WMktkZ040cGFVZzEyS0FCTmRSWXJxQm1kWE93SzNQYkFwbVVGc0VLQmpubnRScVQ1TXRrWXhYRjFETXdHU3B4ejNOZkR2WjlkME11QWZLaExIalBGTEpPQ3hUN294ODgwNnR2ZFN5RXhJQUNPcDRxVEhvMFlUeEptWnlEajBCcW80NU1tV2FLN0tibWFSVmhSbUtuRzdyVXROSm51WnpKSXl4eDR3QW81eFZ4cDBNTU51QXFJb1hQQUZOemF0YW9XamlZeXlEcUVHYTFXS0szSTUzNmlUZFFRbHBwa052enNMT1QxTlRHYUtFbG5aVVVjY21xRjlWdTVoa0lMZFFRQm56czM5QlVLK1JKMzhhVXV3QjZNNTRwdkpHUDRrdkZPZTVGeGM2OUNoMldxUE8vcW93bytwNHFxdWJ5K3VwR0RTK0JHT2dqR1QrSi90UXlxSUVMdTZjRGdBOWFoWE43Ym9XVFBESFBMWUpGWnVjNWZzV29ZNC91T0h3bzVBejlTY2xtT1NUOCt0UHFZZkJhVXlrTWVBdU1aeFZITGR2S3gydVFoR0NCeHhYRjhyak9CNkNvNHBiN0xlVjlMUkwxQyt0MGdVS0VqSUhtM0hoajhxYjBpUjVyK0ZkcXNOMlFUd09sVTE1cDBjbVhqZGc1NU9Ua0dqK0QyZTMxbDFuM0JFakxjak9Ea0FZL0dtN29sZktXemN0SHVYdzVINVBPRjU3ME1NS3JjRUhhMjArWEtnNDRvTGh0MHFlRkprRUVkTWU5UWRTbm1qZFlvV1lNNEpiWjE5S3hiOEhXbFJWM0RGdFZ1MFppcXFXQXdNWXFCREMwY3dEQXFTTUUrdFQ1ajRqRXlLUklCZzFIQ2xJY05uY000cFNZNHF5c3VwRlptVEJYYWNacHpSWS8vQU13QlBUdzN6K1ZKUEMwa3p0Z0VIbmluOUVYT3BrZi9BTEQvQU5LY2RzbkorTHNwdjhYdXd3Z1RDTmpoKytLQlVsbWtKbmtaeVRuT2FhSS85U2hIWUVHckdKZHB6ak9hcVRyU00xQldYZWsyNkMxaWNJQXhVWmJISnEwaWpEWkFIdFRXbEptemgrWDBxeWhpRzdnRE9lM2Vxakd6Q1RwbUxlSXgyclpqSmFXVE83SFJVSjRIekxEOEtkMnFFVmpnbk9TVDg2UFdiaU8zdlpvdkVMUkp3U25ja2s0ejI2MVRYV3V4UWVSTUFnZmRHU2FIamN0R3l6S1BndjNaVzI0QmZIT2M0QSt0TVhFc0M0TWtvQUF4Z2Ntc2xjNi9LeE94ZVBVbW9wMUV5OHlNd1BwVlJ3cEdjczhtL28yRm5lV3N1clc2Um9OM1BMY0FZR2ZyVmxyQ3ZldytBc29JeUNDRjRGWUxTcnovQVBOclViZXNnRmJXVzdGdEVHTU1yQVlHZHVCMTk2bktuSG92RHhsdVhaTTBzUjJVQ1dSWWxzN2tKNzFQWk1STUFRcE9RcDc1cW8wMlVhbE40OGFsUkFSd2VwQkIvdFZxTUdNc0dMZWZCR2Z1L3dEQldTT2pYZ2pRelBkUXgrTUNseEVBRHhoZ2ZXcjNUNzRYcU5hM1lBblVkUjBrSHFQZjFGWS9YWlo3UFVMZVVOaktiUjdnSG9hdGJXWkwyTkpJc3BJTUhoaHVScTZvVDQ3UnhaSUtYeGZmMkpxbW5TMkV6VFFETnNUa2pQM2FZdDhTbmNwNFBZK2xhYU5wR2srejNKVGM0d0c2Q1FmMzlSVkRxT2xUYWRLMHNYTnFPdnR6MHE4bU8xemlHTEs3NFM3T0dCNU04QTVJUGFzTnIvd2hMckd2WGx4SGVXOFBpZ0dKR3psMkNqcWNZQUpIV3R0RUJNeXVwKzl4dHh5YWd6V01rc1BpcDk5SE9BZTNOWXFYRjJhNUk4bFI1MThLM04xcDE5SGFTeE5ISkhjYlpFWmVWendhOVRsMjVKUDNBVG1xZWJUeGYrSmRCczZoRWdVNFhCbEFQQVArWWRqM0hGWGxnWTdpMWpuQ25CVExESFBYbjYwNTcyaWNUcFV5cXRyODJ1c2VCSGhaRTVVbm82a2REVmpxa2FTS3Q5QW1JbkdKVi84QWJhc2I4YWs2WmZXVjRqL3VXeWprZGVPaC9XdEJvR3VRT0ZlUWlTS1Jka3llcWtkYXVOTmNaZE16Y25HVnJ0ZjhsdjhBRE9wM0dqNnJGSkNwZU9UQ3ZHT2Q0UDhBV3ZZQVE4YXV1ZHJESXlNR3ZHYm1PVFNkUmdudHlYdHdSTEZKMjRPY0d2YVZrV2FHT1ZNYlhVTVBrUm12Vy9USEtNWlFsNE9EOVJVVzFrajVHU0tiSzA4UlFFVjZ5WjVnMFJRRVU2MUJURUFSU0VVUjYwaHBpQklvY1Vab1RWSmdJUlNVV0s0aW1BQnJzVVpGSmlnQWE2anhYVXJBb29yRnkySkhDS09jTDFKcVlsckZFMjRJQ2V1VHlRYWlTNmtpYlJFak9ldWVncXRtdnJpZGdQRjJBOVZRWXdQblh5SEtFTkkrazQ1Y25aZDNGM0RCOTV3RzZCUWVmd3BpOHVKSllraWdRamdsbmJvRFZNc01rYkZRaEJkdVNlVFZrMGhKRWJJeUVEalBIeW9jMjExUUxGRk9yc3FaakpJbXllVHhJdnVnRGdINkRyVWFXVXJLZ2pBQnh3cW5IRk9sVENURVpIY0kyQWNjbW1MdTF2Qk5ITEQ0U0p0SWN5Y24yNlZrOTltelhGZkZFcTJSSHRHbVp3UU1sUUQxTkZxQWlnMG01ZHpod2hLNFBPZU1VRUVlMVFqdnZVTGtnOGU5UU5USmpzQ1hVaHBBQ01qbkI1L3BVcDEwWFRrdG1Qdk5RdWZGZUlTbkJIM3VwL0dxd3d6by9pUnVXYnJuUE5CZTNCTjlNeW5nTmdmU3VXNkE3MXFqbGEyVDdYVldHRnVGSVljRWlyRkwxSEdWWUVHczNQTWo5c3RUQ3p5Ui9kYkZQaUt6VnRkNEJ5Y1ZaZkNjaTNzMTlzWmN4eHJ5ZmRzOGZoV0UrMGx2dnNmcWVLMjM3TjJYRjRkcFVzUXUvdGdBbit0WjVJMUd6VEU3bWpVZUdQS1E3YndPZUJqTldPbnlNRkpIbU9PZG83RDNxdFlFWEVtR0czQU9XNE5RcnE2bFJyaUdOampnNFhQcDFQNG1zSXJaMnplaXFXZVR4bkRrOVQ1VDEvNXpTeS92TnBkVHlPTVUvZU1iaGhPZG9rNEJKSEpIdjYxRnVmM1lSTWdqMUZPUzJURjZvak0yd3NEbkdjWit0T2FML3dEM0tZOXpidjhBcUtZbWZhZVNmWElxVG81LzlkY3Qvd0Q0ckVWV05mSkVaWDhUTWpJa2pKN2MxWVJTQjl4R1FWT09mbFVkRUx5SXBBK2RUWW9vVW1VSGdNQ1c1NzhZcFNISFd6VTZLTTZmQm4wUDZtcldOTXEyR0NFS1czSCtIQXptcXJTM1JMR0lzNnFtU0FTY2R6VTJhWHhKRnMwR1ZZYjV6NkxuaGZxZnlIdlhUR09rY01udG1KbHRaRU0zaTdkeE9HQTlUL3pIMHJIYXduaGFoSXA5QWE5QjFYZUx5NnhqQWNISHJXTitKNGwveFJ1dktnMFE3WnBOS2tVdWFIR2FKMUsvZUh5cmhXaG1UTk5uaWp2YmRzYldFaW5QMXIwUzhZWE1KaFE1Y2dqcHdQclhtQTRkVzlDRFhwWWtBSWVJRnNqUEhjVmpsVnRVYllta25ZV2tSZjRVVzhWOXduSVhnZmRQT1AxcTdqL2RNR1g3b085bHgxN0dzNUhmcHFNdmdXb085ZlB1YnB4MnJTM1JHZkVqT1F5ZzhkL1d1ZW41T25rbTlHTS9hQktFZ2dlRm1ZTTVVQW5oY1k2ZmhWYm9XdWlKWTFkR2p1QXdKYkhEVmUvR2NJZlRrbHdDVWtHNzZnaXNRL1FuTmJ3cVVUbHlLcEhxOXJxME9wMjNtVXJJaDNxQWVRYzlRYXN0UDFJM0NOYlhTS1hPUU53NGtCSDYrMWVSNmJyRDJyamMrMWgvRWVuMXJXVzJxVzJwMklEbmJNV3dWQklPUnpsU1BhdEl6Y0haazRLZW4yWEYvYVNhWkl6d2dOQmtFWi9ocUxjT3pSL3VXKzhkekFmblZwcDk4WlFiRFVSNGpNQ0lwVC8zQjZIL0FERDg2cnByYzJNemhzdEN4d3A5T0tNbU5TWE9IUnBpeXRmREoyaURjSkxCSjlvUWd1dlFkTWlyU0NUeDdZeXEyWkNjdGpqUHFmblVKMk1qbEdPZXY0VTNhcVZYQzhCeGpOWXhkYU5YRzNhS1g5b1ZwNC93M0pJQVQ0TExJUGxuSDZHc2g4RXZJMTlGeis3amNCZ1QyTmVtYTNiRzkwaTV0UVZEeXhNb3o2NHJ5VDRidURCcUpVRWdzcEhIcU9hMWowMFp6WHlUUFk3UytqVURUTDF6NE53ZjNMbi9BTGIrbnlyMVg0VGxraytIclZMaGNTd0F3bkhRaGVBZnd4WGlVMXRMcWNGdDlsamVTWThoRkdXWSsxZXVmczhqMWFIU0hoMXUxZUJ3d01iT1JsaGp1T3g0cjB2MDZVbTlyK3pnOWZGSmEvazBob0dwMXFiTmV3anlodHFBaW5DTTBtS29RMFJTWXB6RkppbWdvREZKaW5NVjJLWVVONHJpS09rTk1BQ0s3RkZYWW9BVEZkUzExS3dNSlBjS05ydG5PRGtIZ0QwcUZKZS91bUNuekVnakhHS3lCdnBuYmM4ckUrb1A5S2VUVkhWY01BdzlSMXI1RGpSOUk1TjltNCtHSjVadFVlUzRrWmxSQ0FPMlRVKytsTFRQTHZ5ek5nZklWU2ZCMXdKSW5sS0JsY2tjOFl4LzgxYXliU1h5QmpPQU00cE42b3VFYTJNSHpTaGlBQ3g0NDRwVEdvamJ4WkMzSFFjRE5kTXdsTVN4a0VBSEI5YWFtVHpxcEp4MXhtc216b1NzSzBDNVpnblFlYnZnVlc2M0lzMFRLRzNFUHZKSjdBWXhWaTBrb2llRkVJRXE0d0YrOEt6ZnhPcjJ5c3NtQVVqSlBJSnllbEVmMklhYU1GS2Q4MGo1Kzh4UDUwMjN0VG5VWnB0K0JXNWd4b25Ccml3b1NhVDNIV21qTm9QQlljQTE2TCt6YTJQK0V5eUZ3cXRNd3lPdlFWNXg0cFZUdTVyMUg5bnpvbnd3anN4UXRJN1l4MTV4MStsWjVuOFRUQ3ZrWEU2UmgzS0YySTRKSnhuRmRObE5ObklKM0NJbjB5Y2V2ZW0wRGJpcHdWSkp6akhYbXFQVUxtYVMva0JjN0ZPQUJuQUZjL1oyZ1doTDJxUElTWExZUFBQRk5YVWhhUWphUUIzUGVucEhCUUJjSEhRaW9jNzdRUTNJSTdjMWRXWkoxb2J1b2MyNWtSeUd4MFBTcGVseXJ2dWUrMjFJT09jVkNSeVltWE9SMnoycHpSZkxKcUpQWDdPZjYxZU5mSWpOK0pWeG5FNERINUVVOENYbVlEc1FGQy9JVlhNMjJaQ3JrZ2pvYTEzd05ZV1Y1TmRmNGpKc2hhRnRzaXQ1MVlFZEFBVHlNanArSFdrb1d5bkpSQ2hnam4wNndzN2lVckhjUzRCUTVKWlNXNjlnTVpKcTEweVdHUkpwSVpsbTNTTVdjSHJ6eDh1TWNWWS80RmJIVG50N2RKYmRaRGlTZTcybzdKbjdxcU9WQndPZUNRS2J0ckRSZExqTVMzQTY1MlJER1Q4K1NhNmsxSHRuQzdrOUdTMWJMM2QyVlA4QUdNZmhWQnJPaTZycW1xcWROc1pwbDhOUVgyNFFISi9pUEZlbmk2c0lXMzI5bEVyTWYrbzRCSlAxelRkN3F0eThXSXBBbzloMHJCNVl4Yi9jMzR5bWtrdWpGV1A3TWRUbUN0cW1wV2xtaDVLcCs5YkgwNC9PdTEzOW5hUXdidEJ2Wkx5V05jdkZNRlZuUGNwajlEeld0dDBrdTFpa2tkM1psemtucFZNcnp3NjFkVzhMWUNISytuWTRvam50OUE4TFNzOHFsUjQzWkpGWkhVNFpXR0NENkVWNlZiM0VEV01BV1JQR1pFTzBjbnBUK3NXRmg4UmpGN20yMUZSdEZ3RjVQczQvaUh2MXFzV3puMFlRUTNhQU1vVUIxNVY4ZHdlOVhPcGJpTEhwdE1jMDZ4T20zWDJ5WWdvQ1J0SFVBOFZvSVpZcG95MEVnZFFTRCt2NkdxU1hVSUpsTnRraWFRaEFwSGNuSFdyT3pEUlF4SytBOFl3dy9MbXVlVGZrNlkxNElIeGRHdjhBZ045SXVjcnNiLzdnSzgxYWJJNFVuM3IwL1dRbHhwbDdFK1ZsOEZtQTlRT2E4dlpjZ0gyclRHNlJsbFd4c08yOEhnYzF1ZmhPTkkxa1FES3R0a080NTJrWkdSNlZoRzRyV2ZDMXpJMnRHSGQ1V2hPMWUzQXpUbnZvVUdrelh5YldpalU5TTV5RHlEbjFxZHBzeG5sZTB2ZHBhUlJ0ZitmSHQ2MUI4SXlUS29PSDI4alBCT0s1d3ZreUR0N1k2cVIzb3haWGpkank0MWtYN2ptcDJ3MCs1Vlc1Uno1RDlPbFJZWThRb0EyY2ZsVjFCUEZxTVFzNzlWZHhoa2ZIMy9mMmFxNi90bXNXWWpMUkU0ejZWcmt4cXVjT2pMSGtwOEo5alVoT0FEeWUxYUhYUGdQUUl2MmRYZW9hUGJMSHFDd0xkaVZtTE1vVWhuQUh5RENzOHo0WGIvRXBGTU5jWFZ2Y2J4Y1NyQklqUXN1ZU5yREJIeUlKb3dabGpUVFYyUDFHS1UwbkI5RGZ3bGZmWlRZM01UZWEzbEJ6NmpQUDVHdmZuYmNBM3J6WHp2WldSMCtTV05DV2dsQU1aeHlENkgzcjNqNGZ1dnQyZzJGd3g4N3dxRy8xQVlQNWl2Ui9UWmZsQTRmMUdLYWpORWxxYklwNWhUWnIxa2VYUUJGQ1JUaEZKaXFFQml1eFI0cENLTEFBaWt4VG1LUWloTVkyUnpTRVVlS1RGVllnQ0s0MGVLUWlnQWNWMUZpdW9DajUyZmdaSFgxcUxJNTc4MUptNlZHalh4cGtqR2Nzd1VmVTE4Z21mU3RIcVB3MWFpMzBHeVZTd2xkUVdQcGs1eFZoYzI1TTZNZ0FUcHZidWFQU2dVdGNFN2hHQWlqR2NZSGF1eEo5bERBNENua0hxS1QyaXZORU1RdERKKzhkU0ZHQnRGT3pTUlF4cktWUU54eVRuL2FtSnlWYllSa3R6azhZcG9ORWtTNVlHUTlBZXRaTjBicFdHYjEvdHJUM0FkbFpRaUhIQk9lZVB3ckQvRjF4SWJpOWtZNFYyQ2dlbU9NZmxXMEx2TXlrTG1OQWNrbnZ4L3ZYbmZ4UGRlUHR3ZXJsdUtxRHRrenBJcEZlaGZ6R3VITkN4NXJkbzVnWEF4VGZTbkc2VXl6ZGFTQVJqazRyMWY0VWlhTDRWc2hnOHg3ODlPcEovclhreERGR1lBbFZIbUlIVDUxN0pwTWtTL0QxbkZFNmtDM1FBRHZ4V2VaYVJwaDdCQmR5Q0NWREFISHArTkpxb1MyMHVka3dId0RucWV2clRzTVc5VmZkZ2M4WXowOTZTMTB5L3dCWnMwZWVXMHQ3S1Fad3piaitBL3FheGpHMmRFNXhpak1SdTd3Q1VuSlBYdFRBbXk3ZGNFY0FWdElOQTBhMEhoeVhWeGRFZFFQSXZ5NHlhbVEzV242Y0QvaDFsREUrTTd0b0xmaWNtdGJVZXpuNWN2eFJpZFAwaldMd2JyYXhsWkNPSFliRi9FNHJSYVg4S3lXM2p5YWplUVErTEdFMlIrY2o2OENwczJwM2w1S056dUZmdVR6VFVzWkxxSFlzQ2VjK2xSN3lUMGluam5KVXlQRm92dzVZU0tXaWU3a0hRek5rZmdPS2R1TlYyTFBIWlFMREQ0WUcxRUNqQTNjNEZGSmJ4WUdRQUJ5U2FyNytVV2htdVluL0FIY2RySTJSMExmZFg4Mm9oT1UzUThtSlJqYkxEVUcrMnlSc0RLc0pBd3JOZ25qT1RUYldrY2ZoQkZYTzcwL3lta2hkamJ3bGVQS00rL0ZPYlBIaFh4Q1NCbmdISHQyck9idDJhd2pTcERMb0k1RjNiUmtqQW8yUXpLeVFobmZwbkdGSDFOT1djYVJXNVJjbmF4WEo1SjU3bW5vanREN2pqbkp6OGhVdGxwdDZLNjUxR2JTVml0L0JqWTdPR0RFNS9LbzFtUE5IcURGbUxoaklPK2NubW5kYnRIMUNXMk50c2NCV0JZOHFLYVdSTEsyTnBjdWlTaFQxUERaUEZhSmtPTmRoM1VVVnorOGpQQnhoMTZnLzBwcU9hUzJWN2ErVVhGdWVvYmpIdVA1VDcwaVNHT2EyalFoVExIdVBvY0FVN2R1a2ttQ0NybFRrSC9uTmFSYmk3UmpPQ2tVMm82TEw5c2l2dE96Y1dxc0hjQWpmSGdqaGgvVVZvWnpIY0R4NG1CRExrTUtwYlc0bXRaQk5hdXhDakp4MkhmNlZOanViV1MyYVcwVHdKQzREb0I1RGs5UU8zWHBWenFhdnlUQnVENHNkbmdFc0RLNmpjMFRvQ0I3ZHE4bGJLRGFjY2NWN0hEbjdQUEV3S3Nwejh2Y1Y1QmVJVnU3aE1IS3lNUHpOVGo2SGtkc2l0V3ErR3BFaWExazRCT1ZMZC9UcldUbE9GOUtsYWROS2h0cEUzTXNNb1lxUFk1cTJpSTlucUFrUGpwSU9veGcrdEtQM2twQjRKSG1GT3lqL0FOUWRnOGpBTXBIWVlwMkNOZkV4Mks4RTljNHJMeWFsWmF5eFc3aXprZkRBQXBrOGdkaDlLMGxuZExjeHJiM20xbmZveDZOL3ZYbW43UlpXczd6VDdrWkN0dWpMcjE3SGlyWDRjMWVPZTNqdDNrM0RIbE9lL3NhM3h6Y2RuTGtpcE54Wm90U3NqYVRnY2xEd0Q2ZTFRR1ZtVmxKQkRET00xZXgzeTNCRnBkbjk0VnpISmpodlkrLzYxQTFTeE5zNFpSKzdQM1c2WTlqUmx4cHJuRG8wdzVXbjdjK3l1dHBGdHpza3kwTEhqUDZWNnArenFaVzBTYTNSOXkyOHgybjJibis5ZVZPRktGU3VWUEJGYlQ5bDk2SWRWdWJSM0FTZUxjQ3h3TXFmN0d0L1FaT09WTDdNL1hZYnhObzlHYW0ycDloNmRLYksxOUNtZUFOa1YyQU90T2JjaXFLWFVKSGsxS3kyTWJtRUNTTUp5U3Z2NmRxTEdsWmM0NXBDS2gvRDk2TlIwbUdaam1aY3h5NDdPdkJxeDIwSjNzR3FHc1VoRlBiS1VSRmpnQTA3RVI5dElSUjNVa1ZxbSs1bGpoWDFrWUtLQ0NXSzVnU2Eya1NXRnhsWFU1Qkh0UXBMcE1kQTRwTUduQ0tURlZZSURGZFJZcnFBbyticGowcXgrRHJkYnY0bXNZMlhjcVA0amNaNFVacXBrUFBKNlZvUGdXUGZmWEZ3TjNrVUtDT3hKL3NLK1NhUG8rM1I2ZkkwVVYyNFNQYWNCY1k3OWFoM0V4V1B3bEdHSnlUMkZEY1NoWFZzRjFIOFEvM3FEZFNzWm5PNWdHQXh6MEZUSjZvMGhEWTdPRndqdnRMbmpOUmQ4WWt3blhHTnFqbWxrUGlXbTk4RmgwTlI0WmxqbEx1V2JBd01EUFg1Vml6b2lnbG1OdnBOd0dRQ1hiSVNNanlzZWVmb1JYbCtxeUh4VlZzWkFyMWU5MFc0bXM1VW5taHR2R0pQbU81Z0NSL0N2c0txWVBoUFFZWnZGdnByaS9ib0V6NFNEOE10K2xid2lvOW5MbHlYcUo1aHV3UVBYcFY1cGZ3anJ1cUR4TGJUWjFpLzkyVmZEVDhXeFhwdHBjMkduTGpTOU50YmNyME1jWUxEL3dBbXlhWXV0VnZid2hta0lVSG5xVGltOHNJa3h4emtabXovQUdjc0FIMVhWb0lVemxrdGxNcmZqd00valZ6YmFEOExXQkgyZlQ1YjZjZFh2SlNWL3dEb1hBcVMwcGtPWkRLeUhIWDNwWTBWWkM0VUFuZ2R1S3llZCtORnJCZmJIUHRzaTJ6MjF0Yld0dmFIaG9vNFZSUHFNYy9Xb01hSElaRWpSUU1ZVVlBeDJBcVVpanhIVUhBUEp5YzUvR2hkb2trYkxMbmpBenorRlp5bTMyemZIalVYYUVna2Q0U29DcXZJOHgvb0toMnRtSUJFTFoyOExKRGh2NHNjWngwN1ZOVjhvdUZiekVqYVJ0L1dtWUlaU1ZqM0FIaytRWlBYM3FVNjZLY1ZKN0g0bFdXSEx1eDh2U21vNUk0N2Njb0NZOFk2azhlMUpLbmdUcW0rUXI0ZjNXT1IxNCt0TXlLeHZvd3ZDTEd4SUE3MGtyZE1kcUswVG9pemlKa1FiTVo1T01BaW5nalNiV2RqN0JSZ1VFTjNDSVVTTVBJd1VBaFZ6ZzQ5ZWxGRzh2Z3I1QWpnWXc1eno5S0dxR202R0ZWSGhWMkdTUjM1cW4rTHBWaStFOE8yMXBKRmp6akp3Q1dJL0lWY1F3SEpTV1ZtMjQrNk50Wno5b2NZZzBlSkV6c00yN2trL3dBSUhldGNDVHlJeTlRNnhzdTlMZnhMS01xR2JDL0x2VTZ4Z2ttTG9kc1FUbko4eElKTkphc0Jid2NqL3dEVHhuUHBSMnQzRkRjU3N6bGdWSDNCdTduMCtkWnRybFJhVDQyRkphTEJjUnhOSkkrOVdjOGdjZ2owSHZRVHhSZ3hFSU1sem44RFMzRnc4MHlTUjI3Z0lyRGRJd0djNCt2YW8xcE8rbzJ5T3BFU3NBNmxlVGdqUGY1MCsyVGZ4MzJTclJQRGdWYzhEUDZtczlyWlZ2aUcyVTdXeWdCSFhQVVZNMTJKN1MwamVPYVp0eEtuTGRmS1QweDYxQzBlQkxteXVQRlVDVkpBWTI3ZzdSL1h0VktPeE9lcURleGY3WkZjUVBsWVFSNFI5RHh3YWtudzU0enV5U0d6ZzlRYTVKakNSNDVDaGdQT09tZjZVanJ1UkdVNE9QdkNySjBWeVFOYWFqSVMyNkF4N1NPL0o3MCt0cTAxd3lwSVFyeERieGtFZy8ycnJyZnVSbjRCNDNEcG1wYm9JWk44ZkhHNHFPaDlhT1RCeFFrMGdaaXBCVmdCbFQxSFA2VmpkUStHcExuVWJtYU83dG9vNUhMS0pHd2MraEE2VnNWOE83WGF3d3lqb2VDS3JiaXozYjVBU3BCSDd6c2Y5US9yVGkrUFpNNHVTMGVZYXZhM0duM0xXOTNHMGNxL3dudVBVZW85NmwvQ3N5aGJ0Q3dCM0J3U2EzVjJiQzZ0eFlheEU3UjRJVjF3WGlQcWpmMDZHc1RxM3d4ZGFQSXM4UkYzcHM1eEhjeER2bjdyRCtFK3g2OXMxdFNtdmljOFpjWmJQVExjaWV3dDU0MkRaWEhCNjA3SHUyNDU5Q0QxSEZRZmc0R1g0YXRvMkcyYUZXWGEzSFE5eDZWYnk3V2lESXBWMWJEQStuOXF4Y2FOMHpIZnRLdHhOOE1tWGJreFNLL0hic2Yxcnk3VHRUbHM1VjhObUtFNUl6ajZpdmF2aW0xKzE2QmZ3TDE4SmowNzR6WGdwSFBGYTR0cW1ZWmw4a3oyYjRSMUp0WGpkWC9nQkRLNTVQQXdSOWEzRnZjbzBjZHZlRU1KUEtqdDNQb2Zldk1QMmRYTVN6b3VSdmxqNkRxQ0s5QzhMZEZ0T0NPVGoxcHh5UEd4eXhLY0VpQnFkazlqY0ZRQzBMSGh6K2hxS3lub2hLc09oQnJRMjl3c3NmMmU3WVBFL0NTSHVmNVQ3K2hxbHZyV2Exa084WlU1dzMvTzlHVEhybkFyRmxmL0FOUEoyZWdmQVh4UXQwa2VtYWcyTGhjTEU3SDczK1grMWJreEhISUlyd20yRUxYY0VzN3NrSWtVdkluM2xIZkgwcVo4Y2ZFbncvZFdBWFJOUTF5N3VUTU44MTA3Q0xiamtCUmpIYXV6QitvT0VPTTFadytwOUQ4N2hwSHNBdXJNM0syNHU3YzNEWjJ4Q1VGemdaNlp6VlRxVm9JOWZ0YmhWY3hUSVlwZ25mMHpqNmZoWGhmd3hyOXpvV3ZmYjRySzJuMnFRb1lGYzU3ayt0YUsvd0QycDY5S0hOdkphVys1c2dDTU1VWDBIKzlYTDlTZmlKbEgwVmRzMzJnNjVwZGhxbHpwZ3VvOTBzd0VTcndBM1FqMjZacWQ4WWZGZGo4TzJSbFNheXZMZ3VGTnZIY0JuQTljQ3ZuKzVtajFPU2FhUm0rMmx5K1I1ZkVKNU5RbFR6WkVLQnZWeVNheGw2L00rdEdxOUhEenM5YzBuOXFwZlZsT3AycVFhZUVZbmFwWTV4NWUrZXVLeTN4YjhVL0VHcDZ4UGNhZHFGeEZwc3pmdVZqUGg3VTdBZ2ZXc2xLeDJZWjQxOWNBVU5wZWlOdnMwa2l2QktRR0JQVDNGWWU5a2s3azdOZll4cndYVXZ3enFrZ1c5MUUzTEk1QytMSU9QTjB5V1BBOStsZXovczYweWJTL2hpTzJtdVlybFZkbVF4bmRzQi9oSkhCK2xlVmFOSXRyTktMcTZsa01hS0k0bmlNcU1tUmtybklVZ2V2RmV0ZkR0MTlsMjI3ck9MZVE1V1c1ZUdQbnR0UlRubXZVOUU0L2tqajlRbWx4TDdiU0Zha01vN1pvR1d2U3M0aGpGZFRoRmRRRkh5MjhvT1IzUHJXMytCSW5qMGVhWkZkbmxrUDNSbklBL3dEbXJGOU8rSExXTXgyMm5DZkl3WlpaQzdmMkZXWHd3TGV3aGxTQlZqaS9oUW5KNXI1UnlpMVNaOUZCTlBsUWF4enpRamJHVjJubmRTZjRjM2ovQUwrUThqUGxIOTZseVhheFc4aFBsSS9lRXR3QU0weTg4a3lpVlcyZ3I1Y0RubW9scFdieGU2RmtqaWp0cFdLanlLY0Z1ZTFWTWhYN1BIR2daeURqcVQycVo0S2lVbDJabEhabXpUVFNJQkx0eXpra3FvNTdlMVpwbWpYa2dQNHdqd054QVBRdHR4VXUxdDVSMTJMa1o0R2YxcHFQeFR0VVJra0VFNUFBL09wQmFTU1B4eVZBMitVWXozcVhzZElZYUlReU92aUVqZ2tIbm5yU3JnV3hBNWNnOUtja2hVeW9aTWxuT1RrKzNvS2tLc2FONVJnQVl3T0JReHFXdEF5c0pHVUl1RURkZW5IMTVwWXY1MEc0WUo1R2FiWlZrRWtmTzFnUVFNajg2RzMzZlpCQ2ZLVlVMZ3RudDdVcW9qdGkzVVlPWFluZHdPdlRuMEZGY3BIR2liQnp2WG9NZEtiWkRMRnVPZXVTUngwUCsxYzI0Mm9kZ0Mrek9UeWM0b2JHbUJNNm9VZmFjS2NuYUN4NlYzNzRNSkZpVlZIQjN2eWNuMEdha01xUTJXRGpJUURKUGVtNVpUT3JMQWhkZ1ZKQ2pIZlBVOGRxWGt2d05hc2txMnNseEU1VmtBVmNLTzdBZC9uVWlDQ01Ld1lGaUQxWTVKNEIvclRWMDdURjdieUlGMk94TGJqMXpqQStYclRDM0VqYTZ0cUd4QVlES3d4em5JQTU5S3ByNk0wL3NuS3FSN2hHb1ZjanlqanRVUjdpZVBVakVJR2UyS0FpUWRtOURuNVZNYkVjMElISlpqejlLNmZrb00veFo2MUpleHRUTjRtZkRWUTVBRzVzNC9Dcy93REg2ZjhBNVJidGNEZis5UENlWEhBK2RYbHhjUlJPbTk4YldCT0tvL2p1WmJqUW9tUU50RTU2akhhdC9UcXBwblA2aVZ3TFcwamliVGJhVUp1YndVSUxuY2VncVRjRnZBZFJ3TWR1S2dhZjQwbWtXZ1VyR25oTHl3M0hnQ3BzbHVKVkt5U093YkJJSGwvU2oySnRzYTlUQ0tva1N6SkhndTZLbURrc2VsVmVpWGtWbmJ3ZmFkK0RHZ0FWU2VpZ1ZQamlpakdGakJBNlpHZjFycFl3N2dsUmdjK2xhTDAxZHN4bDZxK2tWK3ZYcDFHS0tLMGhaQXJGaXpqSGIwcUxZVG0xOFJKcmZkRWVTVjRiUFRQcFZzeURleDJnNDZDaHVrakRnZ0hrWVBGYlJ4Uk1IbWtWeVRMSkJDVzRQUWcvSTA3QmJxOGNuMmR0akkrTnArNjNwOHV2YW85M1ppUk1ya0ZUbGNkUlIyVXoyNk9KU1dHZURqUDQxTXNEaWFMTXBkOWpxUGlUd1psMnZubEc5UFgzRkhzQ0JnTWxlZ1hQVDVVM2RiWjVneC9seXJEcVBrYVVlS29PY3lxY0hJNmo2ZDZ3YTNvNlU3R0dBQlVna05qT2M0SzRvNFhLSXpzQ3lNTUVqcFhUS2s0ZkhCendRZWVhQ0Q5MUZMSEx3cCs2M2IvYWtON1FOenBzVWtiTkdvS01OM2hqams5d2UxUUlwYmpUb3h0L2VSSHlrRWNIMmRhc3JWbldVS25LNTRYUDZVZHhDczB6WU8xajYvMW9UYWR4TTVRVXV4M1NaYmU1dEhXMVBoVEFFckVUbkdlb1U5eDdVOEcvZG9KUUZMRWhUNy8zcWdTeFJMdmVRMFpCeUFqWUI5d2V4NjFlWGhrTVFEN3BBRzNCeHoyNy93QjZ1VWxJVUZLT21CSXY3cVpXR042c005anhpdm55L3R6YlhjOEI2eHV5ZmdjVjlES3hJTzhia0hQdVA3MTR2KzBHMVcxK0tyMFJqRWNoRXE0NmVZQS9yVHhQWk9kYVRMSDluc2JpL3Nyc01vU09YdzJCUEp6L0FQTmV0bFN2QVBldkN2aDNVcGJLS1ZJdHYzdzR6NjE3cFpYQXZMT0NmN3JQR0grZVFQNzA1TFk0Tk9KVlhsM0ZwOTZzRXludzV4bko2WnorVlhNTWlQQXNVN0dTTitFazcvSSsvb2F4L3dDMU5YaDBxM3ZvRHRlR1FCbDlRY2orMVYzd2w4WFFHSklwM3dPRjJzZW5yelZRYmp0R1U2YnBteHVMTTJqaU1ndkMzOFI5YXhGNDdhYnFOeGJ0NW9XUDNSZ2RlNHIwV0s0amJ3YmU3SkhpWkNPL2YwQlByV0YrUHRQYXgxYUY1bmtFRXd3R1VkTWRjL2lLVW9hNVI2R3NqYTR6N0syWHc0OENSOTJSbFdQT2ZxVFRCbWg4aXh5TVhPZHd6eDlNVkFlN2pUeXVxTkIxNTgzMXBKTGk0aFAvQUZBcXQ5d3h4NEJGU2tKc3NFbmRYUm9vSEd3N3M3Y0Q4Nm0zL2h6c2trYTVsMkF5SytRTTQ1SUE2MVdSMkszOFVkeEpQTVNSZ3J1NzFOMXNTUjZYYTN0c3c4YTFjd3N4K1hINVpxdUpQSWlpNGd6anhFYkhhS0grcHB2eDQyWGlDUnNkMklVVjA4TWNsdkhkeGtzSlB2b0NmSzN5SFkwekdZbE9mQ3orbENRTmx6cEdwZytMQzgzaFNFYlltVTlNOXZyV3kwTFVZdEx1SUpKNXpzaGdLUGNwWmIyRDV6dFlQeGtkbUZlYnlEYkVqcXVDU1Jqc0NPUldyMGJXSkxtMTJsWGRvV1hNQ3Z4THh3Y2REMjdWdmpsN2NyWGt5bkhtcVo3aG92eE8rb2FkRzFycFdwWExBWUx1RVRkL21QT0JtdERHWGtoUjVJbWlaaGtveEJLKzJSWGsvd0FKemFoby93QVVXNzNOcjRMM1VlSE1oYUJObVJ3cXRoU1I2MTdJOFlaRlpHM0kzSUk1QitWZXppbmEzMmVka2hUMFFpT2E2bnpIWFZ0eU02UEpyWFNyZUZXZU9ObVJSMWRpYyt2RlRHQ1IrR0J0WEE1VURucFQ4TnFoTzJSbXdPUUNldjBwaTRsaVRjaXNPVHdPOWZJdFVyWjlRbmJwSEVwTTNoQkdkU3ZPZVA4QW5XZ2p0bjI3WkpWMnBqaU1mMVA5cVdCMlNjYllpZDR3Q2VNVWNrRXhMQjVFVU55ZG95YVhnS1ZqYndKR0ZZNVptSUJKT2VLanl6SWsrME12bFRBVlR6ayt3K1ZQU1FoNDFaeXo4NEdXL3RVYlVtaXQ0NDFVQmR6Wk8zeTBoakFuMnJKbEdESEpHUnorZFNEdXVMTlJHZGkvNWhucDdDb0N0dW1mYkd4SENxY0U1K3YxcVl2anJBSXRvVm1VOVc0SDRVbWlrcUduVWtJeE1tNFlBT2NmcFR5TXNjcXNwODdaenRGQWxvNVg5NUkyUjNRWTdkT2MwMUdrTFJaa1hlVG5HNGs5NlkwMCtpUXNxdmN1ZHk4QUFET1RublBUNlVqU0ZBU1kzRzV2VEg2MDQrMktIYnlGQkFJKzZEVEZ3NHpHU0J0QkxIQnoycFZmUkxhdloyOXZBU0VBQmprc1I1czgvd0M5S3BMeWVGSU1xRjc4ZnBUTHpsbXlpT0ZBSkpQR0tpcmNzSlhhRk03dUJ2T2NlcHExamsvQkx5NDQ5c3NFQWp1R0NxcWdJdWRvNjlldE9od0JNek1vNUgzajdWV0tzcnltUjVXTzdnaGVCN1ZMaHRZd2hZS01rOVR6L3dBNlZhd085c3psNm1OZkZEUWZiYzNjMjBtTnlnVXF1YzRYKythalJpNi94azNnaUlqTUFpQ3YxNjV6VnFXSmoycmdZOXFYWXh4M0dLMFdGZVRCK29rK2lKY3JQTVkyTGlNb1NRRk9lTVVLV1FrWVNTeVBKSXYzUjBxd1NCQW9CL0tuVVhiMDZqbkZhckhGZURLV1NVdTJRREVZNUFkbm1JQUdCMXFpK09VTWVocHU2bVhPUFRpcHVyYS9CWlhVbHVZcFpYVEdjRUFkS3pXdmF3ZFd0MGdOdUlZd2MvZkpOWEdOT3lleldhSHRPaTJlOWhud2dQclZoamhTQVMzeXJBRFd0UmlzSW9MQlUvY2dBQlUzRnVlK2ZhdFkrdDNESXBqdHduSDhSNzRwT1NqMkNUWmJwSEpua0d1ZE1ISktqSHFhenI2cGV2Z0dVSU9nQzFIbFNhY2p4R21kbjduT0RVUEt2QlNnelJTM3RwQVR2bVZpT3luTlFMdlZyV1NWTm04QWRUamlvRGFiS2hJQ29TQnhsczFBdVdrVnRqZ2gvd0RUZ1ZQdXZ3VjdhTkt3RTBhRkNDQ2VvNzBOeGF2dXlzWlZUeGpQV3MxYXkzZHMyNk5tSzV6dEk0TmFPeTF4SkRFbDJvanh4eWVEOWE2SVpsTFRNcFFhNkk3MlR4czBrUklJWE9EM3JyYThVWVNWZGpZeHowTlg4UWlsUXNoREE5czFYYWpweU1DRlVldWFKNG96SERMS0g4RlhEQ0dkaWgyT2VwQSs5ODZkeWNnU3J0eno3SDVVMTlsdXJjaGw4NkwvQUFlM3pweUc1U1ZObU1TY2hrYnJpdVNlT1VlenJobGpMb0pZZkNsM3dEQVY4N1NlQjhxT1NhT2VOSGlienF4SG9SVEU4cHRpTm1XaVlaSVBVSDUwN1lSeFRUU3JJbUgybkIvaVVqLzVxRWpSdWhIVXJNcW5vUVBOMUJ6NjA5RTd3dkxFd0xLaDR4MVVZNmU5THRlUFpJd3lxbkJZZW51S2ZhSkJ1a1Rrc01kY2cwNjBGK1NNSmNzWFFjRW5JNlY1bCsxbTFWTlZ0THBFQThhTXF4SGRnZS8wSXIwdVZRWE9EZzg1QjcvT3FuWDdXenZqYkc4c1Z1Wkk5eFZXWWpqdmpIWDVVUWFUMlJsVngwZVIvRGZoL3dDS3hwSUFWY0VBSG9UWHR1Z1lrMFcyWkRrSWZESTlNZEt4ZXFmQmtGOTRXb2ZEb0VOd3ZNbG1UZ0gzUW5vZjhwcTgvWjU0OE9tWGxwZHJKSElrMjlRNDU1R0NQeEg1MXJOZVVaWW40TEw0MHN4ZWZEVjlFbzNFUmxsOWlPUlhpL3crRU9vZUhLcXNHR1JucG12ZkcyelJORXcrK0NyRDFydzYwdFk3UFduQVp4SkJLUVZZY0VBNDYwb2VSNU8wZXh6VFF6YUdacGlBcVIrSUdKeGoxcksvR091MmVvL0RzVnVaUEZ1SW1EeHNlY2pvUm52V2orSDFYVS9oK1cxY2dOeW1UejFQY1Y1UmNTeVFYYzl2ZnhNMEt5RkcyTGhVYko2QURBK1ZLTDNvV1dQUW0zeGRQVjlweXBNYmVuUElwTEs1UGhyQmNETVJIREhrb1I2VS9hVytiYTdXTmdZeXZpeHNvNjdUeUtnU0hNakE4NFBIZnJWMFoyYWJRTUdDU0lQdUlPNWNEdDZpclh3bG1zTCt6ZGVaSS9FWDVyL3NUV1UrSGIxcmZVVmdmL3BuS0RJNUJyWDI3Q0s3aWtIODJHejNCNE5YRkVTTXhhcTFoRk5JbUhDZ0k2a2NGU2V0ZGV3UEhNQUpDOFREY2g1SUkvR3JhU3lDYWpQYXQ5eVFORUQ3OWpWVHBqSVdheHVDcWhpV1ZtL2dJcVpLaHhkb0pWQWh3QUFSNWpnRE5MQk05cmRySWhZN0NHNmNFZjhBRFNnN1dVS1NjOWNDbEVidEdZeW9CQnhrL2gvV2lMVFEybWowSFNrbjFHMVRVSTdxVEJ3a2k0UW1IK1Vndm5qMXhqNTE2WCt6cDlNdUpXZ1NHNVRVck1mZWtuWjFjSHF3QU8zSFhpdkJORTFCck5nSTl2aURCRGsvZFlIcit0YS80VzE3Vk5WMXJldXI3THFBRXFaaVZWaDNDNEhQMHJxd1orTHF0bUdYRmF0SDBNd080NXJxWjB1NiszMk1VeDJieU1PRnpqZDN4bm11cjFGSTgvclI1aWpZd2R6bkk4M1BCK2xjSklJbzJDN0F6bnQxcUxJZzI0M01TZXVUVDFnSW9SSkt3Q2pwazE4dHl2UjlNNDBJWmlKUVZqZHR2YytYbnAzcHcrTzdrS1kwNDc1WTB6TEtyR01ETFpJSklGRjQ4bmprSkNXSUE2bkZOUWs5VUtXU0s4a2F5am5lRWZieXl5QS9jUTRBb1o0NHhhRmlQTTRDNVBYekhIV3BFaTNUNUg3dU5XL2xHU0tqRFRONmo3Uks4bU1ZM0dxOWlUNzBRL1V3WDdoelRKSElnQnljazR6bm9LR09hVjMzN1NjakE0NHFTTFdGRkFDZ0FWSlZBRkdBTnZZVnBIMDY4bVV2VlB3aUVJNVdBenhucmc1cDJ5MCtFRHpnbFZ3TUU1cVZHbjBwM1lBY25JRmFySEZlREY1cHk4a09lQlMyTm94bmdDaWpnWEI4dlFacVVVM3l0anR6VFUwOE1DTnZsUmVPY3RWMGtSYlpRVGhwaTZMNVFNbjUwdG9nMnBoT1NPYWJOOWJoTUt4bGJ2Z2RLYmJWQ0J1aGhDNEdQT2NWbTVKRkpNc1pJbEcwWTlEeFQwSlV3Z2NaNzFRTmYzTTdlUmxIdEd1ZnpvZGs3TGhuT0Q2dFV2SXZCWEIrUyttdWJlRWZ2SFJmbWFpdHF0c3YzU3ovQU9sYXJJck1ObmN3QjlWQlA2MCtMQVlPWkhKOThERkwzR3g4Qjk5YWNMaUdEdjFjMUNtMVc3azZ5Skhuc2d5YVp1TEprUGtrTWc3alBTb3pSckg5ODQ5c1ZMbklhaWtNM0Vkdk5NWmJvTzhoNEo5YVoxT0dKTklsa3RvMWpaSkZHN0dTUVFmWDVWS1kyNEdTV0o5emltdFFhS1RRcnZ3Z09KRXpqNjA0TnRwQktrckovd0FPSkhMcEZ1N3MwamhjTUJ4MzcxWWkzaTNuTUhCL21hc3ZwVjg5dllRSkZ1RHFPd0hQTlc5dnE1WWYrb1FyMjNMUSt3WFJadWhRQll2RFZmOEFUMHBvMjZ5Y3M4bmkvd0F5dVIrVkNMMjJ3UDNzZjQwek5xdHRId1pSOGh6U0hZN0hIUGFLUkM1bFRPU3JmZUh5TkxIS3R3cC9kc0FPQ0dYRlY4bXNSRC9weHl2NllHS1ptMWVab2YzY2FSc2Y1am5GQURsODhLa2haZ0hISGhnbm1xNXJrOU5xMDFjVHpUZ0c0dUVJSG91S2h5U3hidUpIWStnRktnTFd6MU82czVESkZKdFh1cmREV3BzZmlDMXZZMFNSaEZJMzhKUDZHc0VKWXdPSUdJL3pHbDhhUWpFY0tZOXExaGtjVE9VRXowNGtNTThFSHY3VlYzdW5pYVlOSDVXUWNFVmxiSFY3KzA0SkR4RHFqdGtqNVZvZEoxdTJ2U1I0dTJYT0NHNEpOZE1jc1pLakZ3YUk4MXZkUndreUswcWdZR0I1dmxVbUJsbDg2bkRxQnlEaGg3ZjdWYlJ4bmNDeEJ5YzlhcmIvQUV4ZkhaNFN5VEwxWlRqNmU5UlBBbnVKcEQxRFdwYlFrTjZZbFpKVkxGVzRaUjFIdlVqQk1HWUdYYUFUZ2RPdFZuaHpJVDR3K2JMbkgxcDIwWXErSTVOb2s0SnhrR3VTVVpSMUk3SXlqTDhXVFR0bGd5eWhYQU9BVHpqMnBveEk4U3BNTnlOMzk4L2xRRncrMUg0MmtnOCs5U1VWb2d5azdsVDE2NHFkTXZhS2k0czVJcDkxdXpkTWx2OEEvcis5VGJDOWdtbnhjcnR1Q0FESU9wSHY2ajM2MCszSi9kOGpIUUhyNjAxSFlSdktreWdCNDI1VTlEL2FtbTBSS0Y3Ukt1MGUzWXNvOFJkd0kyNFBCOVBXdklmanl6K3cvRmt6Sm5aTHRsQlB1UDhBYXZYVE12aWpHQVR5VlBZMTUxKzFTSE45WnpsVy9lSVl4anNRYzFjWHNpYStKZmZzL3UvRThhSElMT2djRDNIV3NmOEFHQ3ZwL3dBU1hhbUZURklmRlpHSnhLQ2NqSXE1K0I3cGJlNnR0eDNFZ3BsZWhCRlBmdGJ0MDhmVFpuQjhLU05rWndPUmprRDh6U2o4WkJOM0JNeFdqM1JpMUtOZnV3eUhZVTZaendLUjR0cnljWUM3a0lQVUVkS2dMQkxHeXlvcEs3c293OVJWcHJDRmJuN1JHTUIyU2JKOUdBeitkYW1DSWNVdmh0RTRBWThNRG51RFc2alBpUXJJdlFnTUt4aGpNMFVqSW84aE81UWNZejNBclI2Rk40bW1SZ3VDVUczUHlxNGZSRXlmcktsWlZtR1FjSy85UDZWU2FwQnR2SkhYQ3EvbVhBOWVhME40MGM5dEV1Y25ZUi9UK2xWbDJqeTJsdXlvUzZlVWpINTFVbzJLRG9yZFBEWEZzYlo1R0VrZm1pMmpCYm5rR3BKaHk1Ym5EZ01NbnAyTlJZdFB2NDdsWkVqYmh0d0p4V2dlQlptaUNSc3JFa2JTQnpucVB4ck5RYWZSbzNaVFJ1TFc1U1lxQ2hQbkhVYzlmMXJYNkxKOW12NFVoWExPd2VHYVBPOER1QWZ5Tlo5dFB1SkZZUjI4cmdrRUVJVHpuNWU1L0NyYlJ0TzFTYUlLTFY0NFkzSVdYb1ZmK1hyeFZLTWxKU1NKNUpwcHM5VTBEV2lMYWN6K0tnTXpiQkhzQUs0QXllRHprR3VxQkg4Qi9GbHhHcnlSV1VSeGphWFFuOHMxMWVpc2txNk9Od2o5a0oxbU9ESkt3SFRDOUtrV050RVVMYlNjZXA3MHJvQkg1eUZBOWE2Ty9zb29rRHpvU0R5QWMxNXRSUzBkcm5LWGJMSUlGa0FBNEM5S2FBekpJZS9Ua2RhZzNHdld5U01ZNDVwUFRDNEg0bW9MNi9NeGJ3NEVVbitaczRwdWFFb3N2OW03bjBGTk50R1NlQU9wck92cWw3SU1CeXVmL2JYRlJKNVoyNWxMbi9VU2FoNUVVc2JOSkxjV3l0NTUwVWY2cWJrMW0wV01CSFp5UDVWckxDVmNuZGdEMUFydkhpL213S2g1WDRIN1plWEd1eU5rV3NCVWtqQmNqOUtoM090NmtraktvakdPUEtNbjg2aG9NOHJ5dnFXNmZoU3ZFR1lrdWZwUzV5WlNpaHVlNTFLN1ZqNDVYSjZNKzBmbFVjUmtBaDd1TGQvRnlUVDBsdU9xazU5VFVQN1BkUXV4dHhIejF3T3Z6cWRqcEQ0dDRDK1E3czNzcEg1MGsxcXpNdmdzVlh1SkRtbXZ0ZHduRThLSDY0Tk9DL1RIS3V2c1JtaWdPamdualBMREgrUTRxUUwxN2VMektTQjNZWi9Pb3o2bENvR043RTlSdDZVdzJvNC82Y1p4N21oSUNhbXRReUhEdXluMXh4VWxiaEg1V1FFZTFaNjR1bW15Q0ZVZTFRV0RaNGtQNFZWQWExcmxGUExMajNOTXkzOXA0RWhNOFFjRVlYR2VLeXV6SEpPVDcwWWpRakxNQitWRkNMQzV2N1ZnZHFObnNWR0IrZEpiVExOb21wcHdNTkhnRC95cXVXTlhPMVdRNDdacXl0WWhIb2VwWkk2eDlQbWF1UDVJVXVoblNGZWEySThSa1ZQTGtDbjNzSFptRWtybkE0eHhVajRhanpaTWZVMWFORno3bisxWnp2a3h4Nk01SnB4aUc1V1lzQndHNUZRUHRzNnMyK1Bhb0djZ1ZzWkxjR1BERGdESnFtdW9COW1meWdncU9EOHFGMEhrcklKWjdrNFJrUHNXcWRIcHN6cjU1UXZ5cXVHbTRjaU1CV0EzQXJ3YWxKUGMyOFNiV012cXJkYVhKR250c25RYVRHZy9lU2xqL3dBNzArbW4yaU5rbG0rWnF0YlYxR0Q0YkxuanpISE5FdW9UeThRcEVUN3ZpbUtpME50YkJTRVJlZnhxdHU3RnM1dGl3OVZhbkZhOFpSdmtqaittYUl3eU9SNGx3emV3b0UwVlQyN3F4V1ZteU92TkNZOGpHOHFCL0wxcTFObkR0RzRTSFBmT0tKdFBnWmNCU0I2NTVwVjVFSHAzeEpjMnE3SnN6cUFRQ2VDUGZQZXRMWjZ6YlgwSWNTb3NyRHpLeHdSV0d2ZFBlSWt4YldRRFBtT0RWZU54KytWQjlBTTF0RE5LUFpsUEVwZEhySWpKNElIcjhxaHkyeWVLSGk4ajQ3ZE0rOVpUUmZpZTV0WFNLNmNUd2R5UjVoOGozclVhYnFOdGVrbUNRUG5vT2pDdXBUamtWTXhjWlFkb1lrTEpJVnVFeHU1eU9WUDFwd1N1Z0lZRndWeHllZnhxYklnZENwSUk5eFZiUEE4U2I3Y2tvdldOdWgrUjdWejVNRmJpZE1QVTMrWTdacXBkaW1RU2MvOEFCVDIvYXdESGE0UFVkRHpWZEJkeFRUN0kyS3pwa0dOdUdGVFk1Y2tDWEdmWHRYUFRXbWRLa250QjdmRUpXUVkya1ljVkMxMndodjRvbHViYUtjd25kSHZ6am5yVW9NWTVtNTNvMzVVKzV5a2J4NDRQSW9YMmlYOU16QjBTRHhVbjBvTGJUUmtNMXMzQ2svNWVlRDdkRFUvNDYwNDZ0OFBjUjdibUYxZFFUajJOVDVyVkhBYUh5dU1uUGNaLzUwbzkwOXhwc3NjckswcW5BOVJqcFRVN2V5WEdsUzZQTWJINGF2MWhlSjVFU0p5RGpra2ZLclgvQVBEWmxnaGpsa0xlR216T09vemtaclR5V2Q3c0dKSXNEdG1vdHROQXpzbHhjbEQwNU5hODRJNTZrVWcrRjdlRXR2TDlnVHVGV0VPbDIxdUR0S0FIazFZekRTdzJYdWQyT2NGOGlvRStxV2NibUtFbVRKd3UxQ2FQZFM2UWNYNVlTQzFnWTRaVGtjWlhOUFIyM2pIY3NNN3Iyd21CVVNXZVc0NDhBOGRHTlRMSDRndnBGV0h3WTFmb0dZNG85NStFTGdqcDdXNVJDeHNjS09tVHpVYTVrdWJXTVNQYStHZXFraXJhUzZ2cE1DUzZ0WWMvSW1vc2xzYmxHUzcxSnBVN0txWkZEeVNIeFJydEd2azFiUWxGdXFxREM0a3dlVmNIY1AxYy9Xb09uM054QnIxOWJydEVOekdsemcvd3NlQ1I5ZjByTzZXN2FMZE02Tzh0czQyelJuamN2clY3Zi9aNHIvUkwxWEQydHlYdFhZZGZEZmdaK1JZMTJZczNKSlBzNXNtT202UGR0SXVsdnRLdExnY2w0eG5IcU9EK2xkV1MrQU5XajB6UlpiSzhkQVlMaGtqR01ZWENuOVMxZFhYYk9lanlRU05QSUJJU1h4a2IyelJvaTV5MGlEL1R6UXp3UVpKeVI4elRCbDhJZVM0WEk3R3ZCN1BYSlRSeU5ud3dTQjEzY1VKZWVQbEkxYjVWQU9xTURnc3JlL05JMnFMM1JpZlkwMGhrb2FsSWpiWklaa1BydDRwVnZZcEc1Zm4vQURacXVmVldPY0orSnFETGVtUnNPbUQ3TFRFelQ1dDJBeXlBbjN5S2czRU5zLzhBMUJHUGRXeG1xTU1DUEtmem9HeTZrRWtmS2xRSXRXUzFYaU9mSHNEUXBkU0lmTE1TQjZuTlVqb0FNZzVINTBETUYrNngrUk5DWU5OR2diVUpTU0F5ajAyaW1YdVpXUG1rWS9XcVlYRWc3QTA2TDJNWUQ4ZTlNQ3czK3ZORHU1NUhIeXFMNHNUY3JMajUxeHUyVDdreUUrZ29FU1h0aElPSXpnK25GSXRxMFNiVkorUmJOTUpxVW0zRHg1K1ZHZFFPT0l5Qi9tTk1BWFFweTRPUFlVaVRXbzRZdUQvbW9IdXA1ZjhBcHRFbzk2QTI3eWVhV1VIMkZNQ1lzdHVSbFNtUG5URTExQ2NncnUrUXBoN09IL05uMXpUTFc1VGxKd1BaOEdtQU1qeGs0amhZZlhwVnRva3M2YVhxbUR0SVZNZi9BRkdxZzNMUkVBK0ZKN29jVmM2Vk1KdEoxSUtwVTdVeVQvcU5WSHRFeTZMVDRZM1MyTFNTc1dKYm5pcmpHU1BJUVAwcXQrRHNIU200L2lJL00xZkVjY0FVbkhiSlRJektTNEEyZ0hPZmVxdTR0aWJaOERCMkFqL24wcTZsMjdVM2djNUhOUUo0V0NNcXRoZG4zUno2MGNkQmV6UFc2bFhlVWx0aDR3ZWR0Q29WblBIUGI4YWx3Z1BieWJUeHo3R2d1WXdKQXdQTzNqc2Z4cmxaNktSV01ySGNKVVVvZXVlYzFBdXJmYUY4RTdDMzNRVGdHcmVSU0hBT1RqNkUvd0JLR2UzamxqUkpWeVZHY0hnMDFJaHdUS3VPNHVZa0FKY0RIWTVGSGJhbGNOaERLb3ovQUJPT2xTWkl4NGU1UjVzY1pxRmRXa1RSc3pvUVFjWlUxZlA3TTNpK21XOFVOMU9OejNRQytrZk5PSmFKMGVXZC93RHk0cktKSE9qcUxhNUtxekVBZERTVFQ2aEl4U1dTWEs5ZmFxdXpKcHJzMksyRnBuTzNQdTdacDBXdGtPc01lZmxtc2FzdDQzQnZYLzhBRTgwNkh1Z01MYzNUWjY5YUVpV3krdk5JaVlsclJ0aDY0MkVqL2FxMW83dXdrVm1aNG03RWNZcUlMYWQwNVM1YlBjay8xTkt1bVM0M0MxbFkrcGFuUWkvc3ZpMmVEYWwycXpxT3JadzFhbXcxS3gxTzNiN0pPQzRYY1l6MUIrVllTMzBPOGJ6Q0NGYy96UDhBMnFMZFc5N1pURHhJRmlJNlNBOWZxSzBqbGt1ek9XTmVEWjZwcDRZelRaSUpYS251RFZiWTZwY3h5cEZkRHhsTEJRNDRZZlAxcUhaZkVsd3FMSGVxazBXMHJ2NlBqK3RUTkZsczcyNExGbFYxQ3Nvazh2SXJvdUdRelRuakw2T1JaQ0JFL2ZCOUFlNE5ISk1DU0FTSEJ5RFUyYTNqVmpoUjk3T1IzcUpLb2lud1ZMbzR5U2UxWVN3T0wxMGRFYzZsMzJQd1NEYVBGSVU0NGJ0bW41UHZFL2RKSnd3cUJCdUVvQU81TUhBUHBVMk0rWmpHZW5WZlN1ZG01VFhXbHhUYmxta21SeXhLdnZPeHZZanRXZDFPQVdwZUNXR1NLVWNnczRIMUI3aXQ0b1FzeW5sU09WUGF2UDhBNDB2TG1QVVVzNUp0dHF2bmpPekpYNjFVWGJwbU00MXRGZFk2bDRFbmhYSWkyLzhBdU11NGlyZEwrSlFHRXh4alBrakEvV3Mrc0J1RTNDU1dVRHVxOFVnaGEzQk4xR1dqNkFNM1N0S003TnJCc25qamtRa2dqSTk2ajY5NGNOdmJYSThtU1kyeDZqcFhmRDh5VDJDcWlxQkh4aFRuRlROU3RoZGFUZHc0TzVRSmx4N2RhRkVHeXV0TlJMUXJzaWpQUDNpbkpxeGp1NW5BMkpPeS93Q1ZRS3o5dUJIWlNNV3dJbURjOU1IaisxV09tYWxET2pEY2Q2bkdRU1IrRktnTEs1YTRLN3pESUZVWXk1elRWbGNlSGJYRmhka20wbjVYQXo0VCt2eXAxWlhtakt3Vzhqc2VEbGY3MHhKYnlvcDhVS29QSFBXaUw0c0dyMHpWYW1aakxES3JmOWFKWkRqdWVoL01HdXFpMDdVa3RMZndieU9hVmxQa0tub3ZwK09hNnZRajZxTmJPVjRIWmpudUx5TTVNaEl4bm5tbXhxY3VNbFEzNVZaVEl1RHhtb1R4S29HQjN6WG5JN3JDVzlZZ01VQzVyamVxNDU0K2xSWjhzeEhwaW83SmdrMGFLU2JMTDdTcFBIUHlOQzF5aDZxMzQxVnNDQ2U0eHhUVzlsNzgwMGhGdUowSFFsZmVyRFNvamRyS1MrRlQxSFdzdDR6K3RhYjRmdVVpMHh5K2ZFY2s4RHQwcUpxbG92R3Jsc0NSUUNkdlE5S2pPblFpcGhHUXg0NmNWSDI4ZDZsSXUvc2J3TUdtM1JkdWNxMU9NY2RBRDg2YkFBVGtDbWdic2FYSUJ4elNNU093cC9HMEVBZGFaUFRCcWt5T0lJbGtqKzZ4NXA1citVSU42b2ZtS1p3Q1FLYm1HZlNuWkxRY2wzNG5aQjdBVUhpbkhVaW91NWR4eUQ5RGluRk1aNUVtd2pzd3pWRWpwbFlqcVQ5YWFaeWVuSDUwNGswaDZLSDkxV25UY1JnQXRHd1BwaWdDTUpYWG93SHNBQlY3OFB5RnRNMVhjU1RpUEg0bXF0VWxuSjIyOGJaN2cvMnExMHExbHQ3Sy9ETHpJcWJWR1RuRGYycW85a3k2Tk44RStiVFpsOUpEV2hLNUZaMzRNRFc5cVk3a2VBODBoMmVKeHVOYUdHYU9acEJFNGs4S1Jvbks5QXluQkZXNDdNckdybEIrNzc0Tk1ScnRWZ0FPUmpQclVtNTgyMFo3MDFFaDJoV1BhamlGbVNVK2JCeVJuR0NLTXFReVlMWVljZzhqL2FpVUVOSjRiRUZUMm9zbFdpRWlnOFp5RGcxeHRIcElaa0MrSVF4SUhZOVJTdmlRZVRhK1U0R2FkblZURHV4bnpkK0RYZUdzbHBHTThqZ0hIUDQxTFE3SU1xN2k2eFpWZ01ZN2ZoUXp4T2JlU1BhR2RzYmNlMVRGdHlvWGErNHQzY1pwdVZKRW1pTExtTStiS25PUDYwcUR3VWxuQ0JQRVhYQkQ0NStkVGIyM1czdldBUWtPUHdwK05WOFJpbjhKSndSNzFPMWxOc3NFaEdRK1J3S3BLMFpTMUpGSGNXQ0YzYUVsSC9tVTRwcGIrK3R2SXlSenFCd1NNR3JJUktaV0ErNmZRL2xRWE51SUpjQnNxT25IdFNVbWkvYlRBdDlVbG1YZzJVTGZ5dVczRDZZcVVKN3Q4QVR3ai9UQzUvV3F4NGtCM1RxTnZYTFZIMUZMeUpBYmU0a0tqL3RrMVNtbVl5eHRkRjRZN3FSc3RldkdSMldNQ2lsc25uVXBjNmcwa0xkVk9BVFdlZzFaYlU3YjZ6MzdlcEpKTlBQOFMyWUg3alQ4L0lWUkg3QjM2YWRIQ0JaeVRQT0R5alJuSDQ5S2doWkNSbVBhUFgwcVVQaWFSMENyWlFZSFFHdXR2aUc3ajNJc2NTcXh6allXSDZVOWswVzJrZkVEMlpTTzRrTXR2akdDZVI4cTFOcGYydCt5U1cwcXlMdXdSM0ZlZlNKSmNzMGpLaWpybFl6eCtWSWxycUZ1UlBCNG1CeUdWU0syaG1hN01wWWsrajBxYXpJbnpHU3JMbkh2VGJ1eXNET0RHeDZNT2hyUDZaOFR6NUF2b1MyT3NpZGZuaXRURmNXdW9XMjYza1NVRWREMUI5eFduR0dUcnNtT1NlTCtBWTVNcnpqMDNDczU4WFJwTmJ3NzRXbGNNUmhCMUZYd3R5a0xiQ2VDUVZ6eFVEVTdDTy9zM2lRdEhPTU1vQnhraXNKWXBRZXpvOTJNNDBZWmJXNGdrYVNLMlpJZ01sSkNQMHpVbTFXZThCV043V0lkQ0dVQTFvckt5dXdSQmMyaE13UDNsNFg4Y0dwcy93QUYzZDZOOFZxMFVoT2Q2YjJKL0xGWFRmZ3hLYlJiQjlPa21acFVkWk1jS0NNVmRXamdUQU1QSzJWUHlQRlRMWDRVMTliYVV6NlRjTEhFaFl6R0k5QU91YXBYa08wWVBQdFZKTmRpdlJXR0FKUGNXcmdZYmRFYy9sK1lGUXZoOENLNGtpY2ZlSEhIUWlyaldoaThTNFQvQUx5Sy93QlJ3ZnpGVmQxdGcxTHhBTUpKaVg4ZW8vV2h4R21hclI3aEptOEZwSWZGSFE3YzVINDFiZll2SGlaWGRCMndBQitsZWQ2UEg5azF3QjMycVdLYmdlY0d2VUV2N3VHTlVTS0xLakc0b0NUV0VueE5ZUjVGUTJra00yYnBSendBakhIdG5GZFZxMnFYMmZOZ24yV3VxT1QraTNCcnllZHlGc0FrY2RUVE1uSkhCQXhVdVRuQU5OeVpFVEhpdGFvelJXU1lMc1IwcU5JM2JGUHVRcHh3U2Zlb3pESnBlVGRQUURNUFNtV0dSa2Q2ZWFQY0R6aW12YjBxa1N4a2pIRmFhd2dlT3doWmx3aEdjbjNyT01PdnVjVnQ5VElYVG9Ja09lRi9TcGtWQkZmTDVZK0RrRTAxTVNxamFBUmlpTHFneVFTQjJvQzRKT2VnR2NWTkFyc1ljOWVSd085REdOdzVwSlpGTEFCZUNLY1h5alByUVBzRE9NbGpnVTBRQ01qazk2ZGtIa0lvRkcxQ1RRSmc3TUEvbFVXWTRIV3BFZzZjOUthNDV5TzNlcVFpSVFNOUtCbDRKby9ldVBTcUlKbW15M0NXWThLRU11VDVzMUlMR1R5enpSeDU3UEhWV25pQmVIS2pPT0RpbjRaSFFaSVYvd0RXTTBtQ1JvWUxrUTJzU3BQSGhSanlrQ25JVDlxV2RoT3BNUzcyNVBJeUJWR2J5QWdDU3pqSjZlVGlyYlEzamx0OVRFUVpjVzJkdWNnZWRhcFNsMVluRkxaYzZEWkxxYVBKTE94RVRlVUp5QitOYWF3czRyS0YwaUI4N3RLeFBVc3h5VFZEOERZK3lYSzhnZUoyK1ZhUEFWUU1uak5ieGljOG1OT2N1bjFvOERlTng3VUhtYVNNSmpjTTlhV1lPSHlZOTNCeGp0VlVLekprbU9XWWdCbFlrWVBGTk5NckVLY3FVT0czRGpvTzlQek1yVFRScm5LdVR0S2tFVTJjRmlSMHoxQnJnbHFUUFRnN1FWdEp2VlZ4bGNuQkhJbzQweXhqNVZSbmdHbTJqY3NHUUw1VG5QU2x5MGJ1d0xBQTg1NXptcGFHM1FLU3R2Vk1IS1pHZWxMUElyb29CWWtEbks5UHJYUlJTS3haUURrbm9jL2xTbFVWWFZ5RmNydDU4dk5GSUwrZ1BCV1cwY3R3UXdKeFUzV0J1c2JlUkZ6Z3FTYWpDT09TNmpCSERnWnp6VTY1QVhTVkpaVjhQSEpQR000cTRSMDBZNUh0TXBpaXVqc3BCWUJzRUhucm5yU1N3dlBGdVVCbUE1SFRJSFg4cTVYaVI5aktDeHdENjR6VWdzWXBXU01EdzhrQUgzOSt0Wk5HcVl3ckk3S3J4a0ZlUTNZKzM1Vkh1VVJ6KzdreWR4eU0rOVNON2NnUnNUSHdRT2Ntbk4wSkxPUXBrQkh6R1RTYUduZlJXeVdxeXlLam9IRHFSbjN4L3RWZk5wUVhpMzJSeURqN3ZCcS90MU1sM0dHT09hQllsa3U3Z0FzckkvQU5HMHJKcE9WU0syd3VwYkNWb3JuVDRwb2xBTzRLTTFvTkwxaUc2Q2lKYldCajBFallQNlZFTURlTVdLNUlISUhjVlc2cFp4U1JvNFFBSzJjZTFKVDNzSll0V2pieHRKbnozZGlnOXVUUVNTeEpHUWRVZ1QwQVFZL1dzME5LVzEwdjdiY1JySGFtVHdoUElUdDNZenR6OHF1UGhpU3kxblY3YlRiRzNzWjNrOG9DRHEzYmtuaXROM1J6M1pEbnQ5TW5SbW52VVM1N01pK1UvU3F5SWZaYnJkYVRsbVhrUEdEeld6YTRzb1BpeHZoeHJPTk5UV1h3V1JnQW9ianZqcHlLOUtoL1pkcnNpQWc2ZGJNZlZpMlB3V3FqR1QyaVhKSGpla2E0NlRPdDc1MFljTW81Qjk2dW9iaUM0a2ptdDNWbmpZTUFSNmUxZWduOWgxOWN5Nzd6VkxKTTlSREEzUDVpcGR2K3dxMmlZTk5yOC9IOGtBSC9BUFZYVkNVMTJZVFVmQjZScDV0WjlPdGJtM3RvVlNhSkhHeU1EcU0rbFNBeFhwaFI2RGlnK0g5TVhSdEV0OU5GMUpkaUJkcXl5S0FjZW5GVFFJaWVlYTE1R0RSR2JNa1VxRmlRNkZjZk1WOGw2M0I5azFlOXRzWThPVmg5TTE5ZmdKa2JSWHpUKzEzUkxuUy9paWE1a3QyanRibDJNVG5vMktoN2FMaHBNeFZ6KzkwMUdQV0Y4ZlEvNzFWMzZsN2FKeC8yeVVQeVBJcTJ0c09acmZQRXFFRDVqcFVCUFBGTkdlckprZk1WZkVxeXZ1dWZzODRHVGphZjlRcmR3WGN0eFp3VHBLMkhVRTgxaFZQaVdjeWZ4S1JJdjZIOWEwbndqY0NiVDVMWmpsb215UDhBU2Y4QWZOY25xSS9HMTRPdjBrbDdsTlhacWJHSnBvZHpTbklPT3RkVVdPVm9odFU0RmRYUERNcVIwejlIY20wWXAzODU5aFRGMDJJQVBVMDg0TE14SFUxR3U4aDhOOTN0WFUwY2NleURJUjZjVXkyS2ZsMjQ0cU93elVvMk95Q0RURGZmeG1uTTQ0b0c3bk5NUU1ZeXlqR2NtdEpGZ2dCemdkc21xZlJvUkxxY0N1TXJuSkI5cTBHcUZST2dSVkdBTThWRW5zcUt2WkViRzl1aEhGTk9NaGllTzFHTm0xeVFOeDZVeE0rMFk5KzFIRUwyTnlJTithN3BTYnc3Y0Vpa0s0T2MwRFllUVZOQVR1R0s3SXdlMUJqeWpIV25Ra2NjQTR3YzB4T3g2QTA0NUlQTkF4RzA1SGFnVEl5aXVmb2NkYVVOeFFrZ0hKNlZSRkN3anlJQ2VlOU9JZktSam9NME1YVUVISU5HQU9hVExSd0dlZU90WHZ3dVAzZXEvd0QrcWY4QStRcW1DOGZJMWQvQy93QjNWQWU5cVQvOXlqK3RDZTBFdnhaZS9CVWdTMnVBYzU4VHNQYXIyZTdRSDdqRmg2OFZRL0JmTnRjcVRnZUwvU3JkclpudVM0WTRIV3V5Snd2c2NzN3N6WE1mN3ZhTW5uUHRWa2VWejM1RlZHbnVGdXhDUnlNNU5XN01yWVRQSjdWUWpIMzRDNnJPT25tNjVwa0JXY0FBYmR4OWpVclViZFA4U25PMDhzT1FlYVpTTEt1UVZPeitZWU5jR1JmSm5wWW44VU5UcSs4cXBZZTVwSkdZckpuSE9CNWYxb1RLek1DcXR3UFhOY3h4RXdiQVluSTNBaW9SWkxna1JZMjdvU01FakhORGNnU0Z3bWNPUVNBY2ltcmNneGhTcHh1NUlOU1BEak11Y2crYkF5TVk0b1pEUUtwR0VSc0RkdDR5TUVFR25wQ1pOS25qYnpIRDlmeG9JbzNaRklQM1J4em44cW4yME9MZWRTZDNKT2Nlb3E4YU04dlZtWW13SUE0SG1BVmdjWnhVa3FmM1VnWW54RnljNDYwRjRzWWNZeUErM0pGT1NLRlJlVGxBQ0IxSEovMnJMdEd5N0pDYmZ0RE5zT1d4a2V0TlpRei9BSER3Y0VrRUE4KzlPQU51UnlWR0JrRG52UnhrZU5LQ01JM1BJcE5EME0yOGFEY3k1REx5RGowcVJlaU1TdVpBQnVPNVQ3RVUxREdnbmNNeEhHT0tuNmxiS3NWbkxFcDJZMk5ubkhGTlJ1TElrNm1tUVNoTCtWaVIwRk51TUIwTWU3QUp4OCtLZTJnTzIwNHdQV2dUZDRtN2NEazdmeHJIaWRGMlgxM0N1cWZzVStJYmNxV2F5bWh2azlRZnVIOVJYbVg3TmRTL3dyNHJzNTkreFZkV1AwSU5laDZmYzNGdnB0N2F4eWJZYmdHR1pNWkRLZWNIUDBxb2wwaXdqVWJMV0JHSFFyWGNwS2t6eTVSYWt5Ni9iYkVkSy9iUkRxTU9GUzlpaXVFWWR5UmduOFFLK3NORjFLRyswZXp1eElnV2FKWDVJSFVWOGpYVzYrYU43MlZybG8wQ0kwcmJ0cWpvQm1sM3lDTUlMaVVJb3dBSkRnZlNxNUtxSlVXZlhVMnFhZEZueHIrMVEvNXBsSDlhZzNQeEhvTUF6THE5aUI3VEtmME5mSmttdy9mbXovcUpvQUl5U1FNajJXbHlGeFo5UlhIeDc4SXdqejZ6YjhmeWhqK2dxdG4vQUdwL0NFSU9MeVNUL1JDeHI1dVlxbklSc2ZMRk5MY3hPK3daQjl5S09hK3hjRDZGbi9iTjhNUWpNVnZxRW96amlFRDlUV0QvQUdzL0h1bGZHT2h3V2xqWlhrZHpETUpFZVFLQmpvUWNHdlBTeWhjQUlmOEFVNHhURTE0a0M1azhFZjZXelJ6WDJQMjJSWUlwNHA0NVJHZHlISTVweGJkek9KVkFVRnl4VTloVGd2R0pCQ3JqNUhtdSsyUXBueHJtT0J1dTFsUE5WN3lId1pFajBzcks1amNFY2pCOURSMk52Y2FiTThrRWlrbGRwQkhGU2xrUThwY1NNdnFzZENXVXkvOEFVdUd6MEFRQ3BlVlBUS2pHU2RvbVIzdDJRVElxWnoyRmRWWksxMHI0VVNFZHVsZFVWaStqYm5sK3hpUWVsVjl5eDM4ODFNWWRUdDR4bXE2WnN0bnBXa3VpSUsyTWxza2pHS0VwU0d1SnFPalZqTEx6UXNNRHJtbldHZXBwa3NOd0FPYVlySitoTVZ2R2NZeXFIODZ0TGh2R2xMTUNUN1ZEK0hZRE1iaGd3VURBK3RQdktJblhjZVNlUjZWTFZzcFNwREpIbjV5TURGQTY1VTgrMUVTV1ptWThNY2dVZ0k2SHBRME5EVzBMME9hNXV1S1E1NWJIZWtjNUhGSUdoR3ptaXlNVUtkT2FROUtZQU1jSGltWjJOUDhBR00weE1NNUk2VUlsMk1xS0dVYmdSUkFZR2FSamhjK2xVS3c0TUxFbzdqT2FjUVpWajdjVTJuS2c5anpSbzIxaG51S2xsb2VUYnRKejNxNytGaHViVVZYSkp0V3dBUGNIK2xVVVl4V2crRTJhTzV1OWpGWCt5dWNnNFBha3UwRXZ4TGY0U1ZsdDdrRldVN3dlUmlyOVpDQVFlT2NWbnZoR1IyTjRXZG1iZU9TYzFmRmQ1NDVCUE5kMGVqejI5alZxTWFrR0pCeWF1RlVlSnVHT1RpcVdIRU44bzlUL0FIcTRVOVBuVmlNcnE2azZyT2dHM3BodDJLWk1valNWUEVDaHY1aHdmclVyV3dUcWpLT3BBTlFpcXV4R0RuUFN2UHlxcHM5TEZ1Q0dTTU1tTUVOeHh4VGM0QUVmM2htbnJaUWtjd0dNNTZNS0tWZkVkUXdQQkJBQnhVSXB0dWg1WWttakFJUnVNNXhnL2pVU0tRcktvZHBBR1BHR3pSd2xvUXlZT0Y0QVB2VFFkaTVUeUFyeG5ZZng2MFVOOUZqRVhZZnVtM3I5MEZsNzFLMGw1TGdTQWVRcmdFZFFlb3BpS1VyYnNCR2RwUEJWdTQ5cWthSyticVVBTUF5aGhuNTFwalh5TVo3Um5iR0JCZWxNYldSbVZUMHhVcVNFdUdCY2hoZ2RNNUJvZFVZVytwWEhoaHd5dVNNRElCUFA5YWFlZVJXV2JJSWJDbFdHMzN6bXNVbmRHcmVsSmtnU3NWampWTXNveG5QSFdudzZtTnVNbmhlbmVvOE53RUJad1FHSXh0RzduUGVubGJEazdTRlBuQkNtcmNKZlJLbkYrUjFHVjdkeDFkU2UxV0kybjRlVmh1UGh5SElKempKLzNxQ1pvSm9oNGNpRVo1d2UvdlUreWhsL3d5K2lqQVlrQjhudC93QXhSalZ0b1dUU1QvY3AzOHNwOHZibW0yZ1NXSGF6TUJ1Qk9HeDBOU2dmM3FzL1VIcFMzSVZ3cFBIcUt3TjdIWW1ZdGVxVkdRb0l6MFBHYXo3YThpdGg0NEJqdXFnMWUybzIzc2JBa3JKKzdQcGdpdkxOV2dlMTFLN2hCSTJTTU9QVFBGYlZjVWNrMVUyYkp0YnQyYmNKR1ZoL0tvQW9XK0lHQTh0emtlbU9hOC9hNGxUUG55S1JaSFBMY2U0bzRJazNFdXZwS0NzbTQ1NjVOUm4xaU5SaU11cC8xVmxFbWtCKzlsZmVtWkx5UmVvQnBxSW1hNy9HNXVoVUVldVRUTW1ydko1UUFEN1ZraGZTL3dBSjIrMUsxN0l3d1NQcFZjQ2VScGY4UXVVKzYvQjdHbXBkVWt4NXh6NjFuUHREL3dBeHBETzVCQmFqaWgyZXVhQTY2aG90dk9DTnd5cmM5eFVqVU5QVzV0anVSV0k1QjcxbnYyVjNJbWd2Yk5tKzZ3a1VmUGcxdWZCeGxPemNWRW9iMFVwYlJqL0N1YlkrRGJNWFRxVWZ0OGpSdzNoWmdseE10dkwvQUN1bjlhdEdqS3R5T1FlYWZuc29icVJQRWlWZ2Y1aHpXUEpyczZwWTA5b3J4SXBBL3dEV3AvOEFSWFZiSmFUVzZpTzM4Rm8rM2lqSkh0OHE2bjdpSjlxUm5yaHRzYi9LcWh5U01Od2FzcnRzeEhIR2VLckhJVWtObXUzSnAwYytOYXNITkNYM0Q1VURNbWU5SnVCNkdzeW14VFREakQ1N1U1dXhUVW0vSnlEaW1oTTAzd3pKSERZU3U3S056RTlmUVZDbFJtZDJ6eDFwaTEvL0FFeUFkY1o2VTdFUTBiQWRUU3JaWExRYk1SK0EvU2czWkkrZGRKeEtGYkl3dk9lS2JQQnlmblJSZGptN0xFZHFhUEZjeENxQ0Rrbm9CU2RUanQzelFBUWJqclFrZzBMeUtDUU9vb0l5enNRcU1jZGNETkFyOENzZXdxTks1d1JUcjUzN1R3ZmNWR2t6Z21taVhZUWJJRkpKa29SNjBFUWQrRVZtUCtVWm9uM1IvZlZsSHVNVUNIWWN0RW9CNEZPWXdBZS9TbHQ3ZWVXTGZEREk2ZnpLcEkvR2trQlVrT0NwSEJ6MnFUVkR5WjI0UDQxZWZDdk4vY0QxdFpSK0F6L1NxWVdzd2p5MFVvSGNsRFZ0OEsrWFVaUGUzbEg0cWFsZGlmVExUNFZid252RjdobC9PdEVyanhISGNWbC9obkF1WjFjOEVxZjFyU0Znc2toWWJSM05laEhxenpwTFl4QzVHclJoeDE3L0FGcTUzWVpSeGpOVW5pcTEvR1U1d2Y2MWVIT1NOdjFxOUMva3pYeEFOdC92MmpjVTRPS3FOUEx6T2R6T3ZmS252Vng4VGMzVU9janlrWng3MVZXTVhnTzVrWk1FWUEzZ0VtdUROcVRzOUhEdUNBZ25mN1hoM0pHU1NTQnpVaGJxU1NRcklpY0hIbHlCVU5QRWp1d1dWdG1UakhQV25ZcGtXNlFNd1VNNXp2QkE3OTZ5TlcwT3pTQXluSEFJd2ZQMC9LdWpTU1JtTVlMSGc0R0RtdXVHamU2S3h0RXdQQXdSelQybGpaZEVGU3A1SFdtaGVCVE15eEFQNVFIN3JqSXF3MFdTSTNLcUdYZVVJd0QyOWFaakt1cWtrbk83bFRrR2xqYlpyZHFjOHNtT3Z6clNQNUl5bHVMSVd1WVhXTGdGZUhWWEJ4d1RWZHFZRDJvWGprSGowcS8xMVFMdFc1R1ZHY2ZPcTR4K0xNbVZHM3c1RTh3NXlNWS9yV1VsODJYRnYyMGpQUXh5cDl4aUNPZURpcVdENHIxdXptYUNPNzNEZHRJa1hQZXJzRjl2bGJKRllyVkZhTFVwUVR5Sk0vbm1xaEoyYzg0bzlDK0hiNjR2b1p6TjRTdUd3NFJjQWpIWEZhejRWM1EzOTFidmdneDR6Nm5BSVAxeldIK0RHelBLcWtGbngxSHpyWjZNeGgxeUhJQkVnQ1o1endLY0gvNURXVVdzZEVTUm5rS2dKeXgyblBRSG4rMVB5a05iS3BCeU85U24wNlNPNnVOa2cybVZtQ250azV4VFpzcmhvanRWVC81VmpKVTZOb3p0SWFzR1RmRjRtTnl6S0I4aldEL2FEYUMxK0pydmJrTEppUVo5eC90VzFtV1JTSEVSeWhCeUI2VlRmdFdoM1hXbjNRNlN4YlQ4eFdrZHcvZ3d5YW5mMmViekRpdVErVVU1T3ZCcG1QcFRKNllaNk1BZVQycUpPQjI1RlMrNHowcGlVTHlGcG9KZEVMRkhtaGJyU2pwVm1RV2E0aWtwVFFOR20vWjFmZll2aVdCV0pDVGd4SDlSK2xleFRLeThqcURYejNhVE5iM1VNeW5CUnczNEd2b0Mya0YxWlFUcXhLeW9yOEgxRkpvR1FiNVNzeGJPQTQzQWZyUlFuZEdDQ1I3bnVhZHZZZDFzRzQ4aHdNbnBtbUxRa2hoa25IT090WVRqczZjYzdpV2tEZnV4a2MxMU1KTXVQTWNmSTExWWNFZENtVWQ5SnBWdE90dU5PbXVzamNaUkpnQ3E2M2kwMmE1Q1NXa3F4NUJKTDlzMW9UOE9YR00rSW9HTTV4UVIvREYxSmx2RVFiaHhYZTV0dmFPUGpGTFRKMXBvZWd3WERzRVZnNkFnTStRTTBSK0h2aDJLN2ptUkZRQnM3ZCtRZm5tcTl2aHE3VjJUZkdkcHdldGNmaG05NEJlUEJHUVBTcWVTTFg0bWZELzdpdzFENGYwSzZEU2hoNHE4OE9BUHdxWnFPbGFMcVZsaTZrQWJZQURHUXVDQnh3S292L3czZkJOd01mYnZRdjhBRDEvR2pPM2g3VjdnMVBMSDlGY0hYNUZ4OFA2WHBsdllNc3dBeWVCdTVJb2JmVGRFaTFSSklBRTIrYkxNU1BUb2Fxby9oL1VBb0tnRUgvTlRLYURxRHNkcWpJT09YcHFjRjBpZUwvMUdnMXEwMEdTQ1NSa1Y1ZVNXQjh3QUJQOEFTc2t2eERac0UremFjVVFMc0FrVUU4ZXZ2VTZUUXRRVnRwanlTTS9lcUJxZG5jV2NscWx4R0FDNEtxRDE1cUpPTFdrWEdMVDNJdXZoOUlwYm1ZVDIwRnJMSkdRSDJqdjZVZW82RllxeXR0amRtYkgzem5wMU9LcDROS3Y3Z3NSR1MzSis5MDVvNU5IMUZHVldpYmMzVExVdmk5dERwK0dYRW1oYU1GajhOSUNXWEJ5M09jVS9vTm5aeDJNOXNxd3dCbUIzamxqOVRWRzJnNmlvTEdFampydXB1MzBYVVpVM3BFeEhYTzZseGcrN0RmaG91dFIrSGRMbHVVM01ydkxqYzI3bmp2VnAvaG1rSmFSMmFsUkNvNFVZeno2bXNtTkkxTkpnUkUyNGNqTGRxV1RSTlZrbE1qd3Q1aHg1dTFWY0xxdENjWk5ma1hPa2FKcFZsZVhJdFhlUGNRdTR2bmltOVgwZXluc1pubGVHVXhuS2t0a21xRWFUcU1ybFVnY2xUZythdWwwYlVvRWQ1SUdDZC9OVGF4dDNRUlVscXh1L3ZtMEo1TEMxczFNVGhXOFpYYkE0elNhR0xLL2t1WjcrSkd3eW5ibmtqRkdkQzFXWUhiQVdYSDgxTXRvZW94T0VOb3lsdlFqbWxGUVR1aW1tOWNqYlFXbWwzRVN5U1RMS3AvaEQ0QUhweFVTRFRyQ0VhZzlpWW81Q3JSb001NHdPOVprYUpxUWp6OW1mQjlEVDJuMkY3YStQY3pRT3NNY1RxekhIWEdQNjFVWENxU00zR1hmSWsvRGRuQTl4ZHJkVG9qY0ZjTnpWcGJSd3ZFdmkzLzhBM0NUdVlkQjBGWTYyZ251cjN3NFUzU3NOd1VkeFQ2NlJmekRLV3pIa2pHYWMrUFVrRWUrU2RHd3RvdE9hMXVKSG1LemViYXl1QjB6amo2VXpvOXRheVFpVzkxT1YzWlFTclRZeFdVZlJkUkFPNjBjQWM5YVloMDY4bk9ZNEdZL3JWeHlSaXFTSmxpYmR1UnVkYVhTekRDRm1CS3lBTVJKbklvMWgrSFpFS3ptSGNEd1ROZy9yV0VtMGErampMU1c3aFI3MEMvRCtwWEc0eDJ4WWpxTTBQSkQvQUVoN2JYK1FmeG5xRXVtYXRIYjZPNlBaRkZaM0Iza2VvelVyUWRjczlUdkRaM3RoQVM2aFluVWJTVDZzVFZOZjZMcUZoQVpibTNNY09jWnlPdFFyTFRHdXBENFRwdjhBdkJXYkIrbGN1UktTK2phQy9zM2R4b2xwYVhPK0lJSlYzTXA1NDR4MHA2T0tONHQ1Q0VsTWc0NzFVNlEycG9IRjR3a2lDNFZtd1dCOURVbDU1b21VcGdwamFRVjlhbkhialRacTFYU0hYZ0hoYm9tVmRxWndEakhOU0VpVk5RUmlGSlFvUVNlbWFnR1owa1dKc0hlUWg4dnFhbVhnTWMvalpCWU1xRUVkZ2V2NTFwSFRUSmsvQkorSTRsYTR0SFlEQkRMK2xWQk8xR2tqY3JLQm5BTlhmeEdvTnZidHlDSDRQME5VYXhzYmQzTEh3emhSOWV0R1ZWTjBHSGNTSWJLSmQ2T3gzWjVPZnJXSitLSUJGcTBpdHd1QWMvU3Q2MGlGMldYZ2pyNWZicldMK013djIyR1FueXVuUDBOS0habE1zdmc0cytyMmtjUndzeWtBa2R4elcrdFkzRjdhWEJaVlRlR3p6NjgxNTE4TlNxOS9wOXpidTZHSjl1M0hCSFN2UVJNQmJncGw0MWtKd1JqRlU5U1ROWXU0bC9xSmxoMUY0MFJYVndycVNjY2Y4Rkt3a2dmdzJVWlBtSE5PYWd5ejNObGRRc052aERBWUhuT0RVYTV1WGNSa0t1NVJnNVkrdExNcWt5Y1g0b2pOQkxHanZJcWlNN3NZYk5VUHg5QjlvK0ZMTzRLa3ZDNEJQcG5pdFUwb25qQ01GQkF4amQycUpxcWk1K0U3KzNRZ0dMellQb0tXTGRvV2J3enhDVlNWUEJ4VUVERDQ3WnJSTExFNlJxckw0S2hnNEo2K2hwbEFzcnFxYmZETVpCSHVLYUpaV1RRdEZJWTJBQlgwcUxOaXRBTmpTbHdSNGpScWVNSEo5czFXYWlpSkk3ZUd5cTNZOVFhWTJpbmtITkFEVHpJY0hPS2FJd2FzeVlRNXBhRmFLZ2FFejF6WHMvN09iMXJ6NFhnUjJ5OERHSS9McVB5TmVMbXZRLzJSWHhXNnZMTmlQT29rVUU5eDFvRXowYWVJU3JKSC9NcEErZFpENGZ2WjQ5Vmt0Ym1SbWRTeTg5ZUsyVG5DaGgxQnpXTDE2Mit5ZkYwTjREc0RqZDdHcG12SldOK0RWS3U3T2RvcnFPTnlVQjhwejYxMVk3T2hJdFd1MThLVGtIQU5UTEo5M2grblUxMWRYcFNpbG84Mk1uWWl5Ym1MZHlTYWRrZkRuL0tNVjFkVThVVlloYjkycStyZnBRM3I0dDhmekVDdXJxbWtGanF5YlVBOUJVWFRwQVUzSHFTVCtkZFhVNlFXeHlXWUdVLzZQNjFqL2k2VHhkYzAyUEo4cEhUM1ArMWRYVXBSVkZ3YnMwV25zb0xZNEdPbFNKWlFkUWpHZnVwL1d1cnFhaXFKdDJTN21VQ0dRanNocHF3Y0MzUURqeS8wcnE2amlnc1VFZUl4R09GQXFSdTNlSGs4OFYxZFJ4UUVLeFllSk13QTVrYWwxWS8ramJJSExMK3RkWFVjVWtCSVFLZzJxQUtqWEovOVhFZlkxMWRTcFVGc2V4aUlkTTFWNnBnL0R1cGRPLzhBU3VycUVrRnV6Ry9CYjUrS3JjZXNiai83VC9hdDNwdTB4OERwSWE2dXFxVEI5a3FmR0d6Nkg5S3F2aDlWTmxFUU94L1d1cnEwY1ZveUpldEJScDgzQTZqOVJVcXpDcThuQXlVV3VycVhGRFRNOSswZGxYNFlBSUc1cGxBUDQxNTE4Tkk2MzViRzdHUWE2dXJtelJYSm83TURhaWFpR1lFeUJSSVMzQXd0RWpnUWtPOHU4bnk0V3VycXdTcEhSSjdHYmhaSm1MUnJKdVZsYmtkY0VFMDlQTTl4QTVqRG5PR0dmcFhWMU5FRnhyckQvREZZZ0h6cjlNMVFzanFuZ0xzSTZaeVJ6WFYxVm1Yekp4UFF3OWpjU2p4dDhhcGdFZ2s1L1NxWFZ0QWwxVHdOazZKc3p5Um5JTmRYVm1uUm9vS1QyRm8vdzNjV1NxNXVvU1VmSXdENjFwWTJjV1V5bkIzTUNNZGE2dXB0Mk5SVVhTTklwZUxSYkZsd1dqRzA1OXYvQUlxSkk4ckV1cW9NOXNtdXJxck4yWjR2SVllWUVNeW9lM1duTFJET0w2QjF3a2tlTVo5cTZ1cWNQNUJuL0E4UmxReFN2R3d3VllyVER6U3hqQ3ZoYTZ1cWlCdEc1cHcvZHhqajBycTZnb2pGUXdMRHYycUxLdURYVjFOR2JCRkxYVjFVU2dXTlhud1BlL1lmaWV5bEp3ck5zYjVHdXJxRU5udVRqRG45S3pmeHpwczJwYVphTmFERnhHNVhPYTZ1cHovRW1EK1NKV25OTkhaUkpjcUJNcWdOazExZFhWaWRGbi8vMlE9PSIsImNyZWF0ZWRBdCI6IjIwMjYtMDctMTNUMTI6NTM6MDIuMjUwWiJ9LCJkYXRhIjpbeyJpZCI6IjE3ODM5NTQwNjQ2NjM2MW9pYyIsImNhdGVnb3J5IjoiWkHEsCIsInB5cENvZGUiOiIyMS1BMDk3LUQtWkHEsC0wMDItMDEiLCJwb3pObyI6IjE1LjEyMC4xMTAxIiwiZGVzY3JpcHRpb24iOiJNYWtpbmUgaWxlIGhlciBkZXJpbmxpayB2ZSBoZXIgZ2VuacWfbGlrdGUgeXVtdcWfYWsgdmUgc2VydCB0b3ByYWsga2F6xLFsbWFzxLEgKGRlcmluIGthesSxKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMyIsInRlbmRlclF1YW50aXR5IjozMDAwLCJ1bml0TWFuSG91ciI6MC4wMjIsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MCwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjozNTY0LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjY2LCJ0b3RhbERpcmVjdENvc3QiOjEwNjkyMDAwLCJ0b3RhbEl0ZW1Db3N0IjoxMDY5MjAwMCwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODM5NTQwNjQ2NjMxczc4MiIsImNhdGVnb3J5IjoiWkHEsCIsInB5cENvZGUiOiIyMS1BMDk3LUQtWkHEsC0wMDItMDEiLCJwb3pObyI6IjE1LjEyMC4xMDEzIiwiZGVzY3JpcHRpb24iOiJFbCBpbGUgeXVtdcWfYWsgdmUgc2VydCB0b3ByYWsga2F6xLFsbWFzxLEgKGRlcmluIGthesSxKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMyIsInRlbmRlclF1YW50aXR5IjoxNTAsInVuaXRNYW5Ib3VyIjoxLCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjAsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MTA3OS4zNiwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoxNTAsInRvdGFsRGlyZWN0Q29zdCI6MTYxOTAzLjk5OTk5OTk5OTk3LCJ0b3RhbEl0ZW1Db3N0IjoxNjE5MDMuOTk5OTk5OTk5OTcsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzgzOTU0MDY0NjYzeWt3aXIiLCJjYXRlZ29yeSI6IlpBxLAiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELVpBxLAtMDAyLTAyIiwicG96Tm8iOiIxNS4xMjUuMTAwOCIsImRlc2NyaXB0aW9uIjoiMzJtbSd5ZSBrYWRhciBrxLFybWF0YcWfIHRlbWluIGVkaWxlcmVrLCBtYWtpbmUgaWxlIHNlcm1lLCBzdWxhbWEgdmUgc8Sxa8SxxZ90xLFybWEgeWFwxLFsbWFzxLEiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibTMiLCJ0ZW5kZXJRdWFudGl0eSI6MTIwLCJ1bml0TWFuSG91ciI6MC4wMTcsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MCwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0Ijo3NTkuNDUsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6Mi4wNCwidG90YWxEaXJlY3RDb3N0Ijo5MTEzNCwidG90YWxJdGVtQ29zdCI6OTExMzQsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzgzOTU0MDY0NjYzc2Q2eXIiLCJjYXRlZ29yeSI6IlpBxLAiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELVpBxLAtMDAyLTAyIiwicG96Tm8iOiIxNS4xMjUuMTAwMyIsImRlc2NyaXB0aW9uIjoiT2NhayB0YcWfxLEgdmV5YSBrdW0tw6dha8SxbCBpbGUgbWFraW5leWxlIGRvbGd1IHlhcMSxbG1hc8SxIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6Im0zIiwidGVuZGVyUXVhbnRpdHkiOjQwMCwidW5pdE1hbkhvdXIiOjAuMDE3LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjAsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MjkzLjE1LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjYuODAwMDAwMDAwMDAwMDAxLCJ0b3RhbERpcmVjdENvc3QiOjExNzI1OS45OTk5OTk5OTk5OSwidG90YWxJdGVtQ29zdCI6MTE3MjU5Ljk5OTk5OTk5OTk5LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4Mzk1NDA2NDY2MzEwYXFmIiwiY2F0ZWdvcnkiOiJaQcSwIiwicHlwQ29kZSI6IjIxLUEwOTctRC1aQcSwLTAwMi0wMSIsInBvek5vIjoiMDcuMDA1LzEgKE5ha2xpeWUpIiwiZGVzY3JpcHRpb24iOiJLYXrEsWRhbiDDp8Sxa2FuIG1hbHplbWVuaW4gdGHFn8SxdGxhcmEgecO8a2xlbm1lc2ksIGJvxZ9hbHTEsWxtYXPEsSB2ZSB0YcWfxLFubWFzxLEgKEhhZnJpeWF0IGTDtmvDvG0gc2FoYXPEsW5hIG5ha2xpeWUpLSgxIGttKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMyIsInRlbmRlclF1YW50aXR5IjozMTUwLCJ1bml0TWFuSG91ciI6MCwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoyNTAsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MjUwLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjAsInRvdGFsRGlyZWN0Q29zdCI6Nzg3NTAwLCJ0b3RhbEl0ZW1Db3N0Ijo3ODc1MDAsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExMTg2NTQyZndiZWUiLCJjYXRlZ29yeSI6IllBUCIsInB5cENvZGUiOiIyMS1BMDk3LUQtWUFQLTAwMy0wMSIsInBvek5vIjoiMTUuMjQ1LjEwMDIiLCJkZXNjcmlwdGlvbiI6IjI1MGdyL20yIEdlb3Rla3N0aWwga2XDp2Ugc2VyaWxtZXNpICIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5Ijo4MDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC4xNSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjowLCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjY0LjgxLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjEyMCwidG90YWxEaXJlY3RDb3N0Ijo1MTg0OCwidG90YWxJdGVtQ29zdCI6NTE4NDgsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExMTg2NTQyNG1iMjIiLCJjYXRlZ29yeSI6IllBUCIsInB5cENvZGUiOiIyMS1BMDk3LUQtWkHEsC0wMDMtMDUiLCJwb3pObyI6IjE1LjUzMC4xMjAyIiwiZGVzY3JpcHRpb24iOiJQVkMgdmV5YSBIRFBFIGVzYXNsxLEsIGRlbGlrbGksIGRyZW5haiBib3J1bGFyxLFuxLFuIGTDtsWfZW5tZXNpICjDmDE1MCBtbSkiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibSIsInRlbmRlclF1YW50aXR5IjoxNDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MS42LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjAsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MjE4OS43MywiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoyMjQsInRvdGFsRGlyZWN0Q29zdCI6MzA2NTYyLjIsInRvdGFsSXRlbUNvc3QiOjMwNjU2Mi4yLCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTE4NjU0MnRsanRsIiwiY2F0ZWdvcnkiOiJZQVAiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELVlBUC0wMDEtMDIiLCJwb3pObyI6IjE1LjE1MC4xMDAzIiwiZGVzY3JpcHRpb24iOiJDMTYvMjAgQmV0b24gacWfbGVyaSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMyIsInRlbmRlclF1YW50aXR5Ijo4MCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjUxLCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjAsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MzcwMy44OSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo0MC44LCJ0b3RhbERpcmVjdENvc3QiOjI5NjMxMS4yLCJ0b3RhbEl0ZW1Db3N0IjoyOTYzMTEuMiwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTExODY1NDJoem5taiIsImNhdGVnb3J5IjoiWUFQIiwicHlwQ29kZSI6IjIxLUEwOTctRC1ZQVAtMDAzLTAxIiwicG96Tm8iOiIxNS4yNTUuMTAwNCIsImRlc2NyaXB0aW9uIjoiIDMgbW0ga2FsxLFubMSxa3RhIHBsYXN0b21lciBlc2FzbMSxICgtNSDCsEMgc2/En3VrdGEgYsO8a8O8bG1lbGkpIHBvbHllc3RlciBrZcOnZSB0YcWfxLF5xLFjxLFsxLEgcG9saW1lciBiaXTDvG1sw7wgw7ZydMO8bGVyIGlsZSBpa2kga2F0IHN1IHlhbMSxdMSxbcSxIHlhcMSxbG1hc8SxIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6Im0yIiwidGVuZGVyUXVhbnRpdHkiOjEyMDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC42LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjAsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6ODkyLjY1LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjcyMCwidG90YWxEaXJlY3RDb3N0IjoxMDcxMTgwLCJ0b3RhbEl0ZW1Db3N0IjoxMDcxMTgwLCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTE4NjU0MmZsZWRwIiwiY2F0ZWdvcnkiOiJZQVAiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELVlBUC0wMDMtMDEiLCJwb3pObyI6IjE1LjIwMC4xMDAyIiwiZGVzY3JpcHRpb24iOiJNZW1icmFuIGtvcnV5dWN1IHRhYmFrYSAoSXPEsSB5YWzEsXTEsW0gbGV2aGFzxLEvZHJlbmFqIGxldmhhc8SxKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5Ijo0MDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC4yNSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjowLCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjE1NS4wMywiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoxMDAsInRvdGFsRGlyZWN0Q29zdCI6NjIwMTIsInRvdGFsSXRlbUNvc3QiOjYyMDEyLCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTE4NjU0MnU3YTd1IiwiY2F0ZWdvcnkiOiJZQVAiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELVlBUC0wMDEtMDQiLCJwb3pObyI6IjE1LjE4MC4xMDAzIiwiZGVzY3JpcHRpb24iOiJQbHl3b29kIGlsZSBkw7x6IHnDvHpleWxpIGJldG9uYXJtZSBrYWzEsWLEsSB5YXDEsWxtYXPEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5IjoxMDEzMywicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjoyLjk1LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjAsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MTE1NS4wNiwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoyOTg5Mi4zNTAwMDAwMDAwMDIsInRvdGFsRGlyZWN0Q29zdCI6MTE3MDQyMjIuOTc5OTk5OTk5LCJ0b3RhbEl0ZW1Db3N0IjoxMTcwNDIyMi45Nzk5OTk5OTksImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExMTg2NTQycjV5NmYiLCJjYXRlZ29yeSI6IllBUCIsInB5cENvZGUiOiIyMS1BMDk3LUQtWUFQLTAwMS0wMyIsInBvek5vIjoiMTUuMTYwLjEwMDEiLCJkZXNjcmlwdGlvbiI6Ik5lcnbDvHJsw7wgw6dlbGlrIGhhc8SxcmxhciIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJ0b24iLCJ0ZW5kZXJRdWFudGl0eSI6MTAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6NDAsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MCwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0Ijo1MDA5MC41LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjQwMCwidG90YWxEaXJlY3RDb3N0Ijo1MDA5MDUsInRvdGFsSXRlbUNvc3QiOjUwMDkwNSwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTExODY1NDJxc3B2ZiIsImNhdGVnb3J5IjoiWUFQIiwicHlwQ29kZSI6IjIxLUEwOTctRC1ZQVAtMDAxLTA0IiwicG96Tm8iOiIxNS4xNjAuMTAwMyIsImRlc2NyaXB0aW9uIjoiw5ggOCAtIMOYIDEyIG1tIG5lcnbDvHJsw7wgYmV0b24gw6dlbGlrIMOndWJ1xJ91LCDDp3VidWtsYXLEsW4ga2VzaWxtZXNpLCBiw7xrw7xsbWVzaSB2ZSB5ZXJpbmUga29udWxtYXPEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJ0b24iLCJ0ZW5kZXJRdWFudGl0eSI6NDgsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6NTAsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MCwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0Ijo1MjI2OS40MywiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoyNDAwLCJ0b3RhbERpcmVjdENvc3QiOjI1MDg5MzIuNjQsInRvdGFsSXRlbUNvc3QiOjI1MDg5MzIuNjQsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExMTg2NTQydndjcHMiLCJjYXRlZ29yeSI6IllBUCIsInB5cENvZGUiOiIyMS1BMDk3LUQtWUFQLTAwMS0wNCIsInBvek5vIjoiMTUuMTYwLjEwMDQiLCJkZXNjcmlwdGlvbiI6IsOYIDE0IC0gw5ggMjggbW0gbmVydsO8cmzDvCBiZXRvbiDDp2VsaWsgw6d1YnXEn3UsIMOndWJ1a2xhcsSxbiBrZXNpbG1lc2ksIGLDvGvDvGxtZXNpIHZlIHllcmluZSBrb251bG1hc8SxLiIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJ0b24iLCJ0ZW5kZXJRdWFudGl0eSI6ODkuNSwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjo0NCwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjowLCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjUwMjQ3LjQzLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjM5MzgsInRvdGFsRGlyZWN0Q29zdCI6NDQ5NzE0NC45ODUsInRvdGFsSXRlbUNvc3QiOjQ0OTcxNDQuOTg1LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTE4NjU0Mmo1eGFrIiwiY2F0ZWdvcnkiOiJZQVAiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELVlBUC0wMDEtMDEiLCJwb3pObyI6IjE1LjE1MC4xMDA1IiwiZGVzY3JpcHRpb24iOiJCZXRvbiBzYW50cmFsaW5kZSDDvHJldGlsZW52ZXlhc2F0xLFuIGFsxLFuYW4gdmUgYmV0b24gcG9tcGFzxLF5bGEgYmFzxLFsYW4sQzI1LzMwIGJhc8SxbsOnIGRheWFuxLFtIHPEsW7EsWbEsW5kYSxncmkgcmVua3RlLG5vcm1hbGhhesSxcmJldG9uZMO2a8O8bG1lc2koYmV0b25uYWtsaWRhaGlsKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMyIsInRlbmRlclF1YW50aXR5IjoxMzc1LCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjAuNTEsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MCwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjozOTg1Ljc1LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjcwMS4yNSwidG90YWxEaXJlY3RDb3N0Ijo1NDgwNDA2LjI1LCJ0b3RhbEl0ZW1Db3N0Ijo1NDgwNDA2LjI1LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTE4NjU0MmhmMGgxIiwiY2F0ZWdvcnkiOiJZQVAiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELVlBUC0wMDEtMDUiLCJwb3pObyI6IjE1LjE4NS4xMDA1IiwiZGVzY3JpcHRpb24iOiLDh2VsaWsgYm9ydWRhbiBrYWzEsXAgaXNrZWxlc2kgKDAuMDAtNC4wMG0pICIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMyIsInRlbmRlclF1YW50aXR5IjozNjE5LCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjAuMjQ0LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjAsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MTQzLjg5LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjg4My4wMzYsInRvdGFsRGlyZWN0Q29zdCI6NTIwNzM3LjkxLCJ0b3RhbEl0ZW1Db3N0Ijo1MjA3MzcuOTEsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExMTg2NTQyaDloNzgiLCJjYXRlZ29yeSI6IllBUCIsInB5cENvZGUiOiIyMS1BMDk3LUQtWUFQLTAwMy0wMSIsInBvek5vIjoiMTUuNDQwLjEwMDgiLCJkZXNjcmlwdGlvbiI6IjMwIGNtIGdlbmnFn2xpa3RlLCBtaW4uIDEgbW0ga2FsxLFubMSxa3RhIGRpbGF0YXN5b24geWFsxLF0xLFtIGJhbnRsYXLEsSBpbGUgZGlsYXRhc3lvbmxhcmRhIHN1IHlhbMSxdMSxbcSxIHlhcMSxbG1hc8SxIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6MzAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC42LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjAsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6ODAzLjgxLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjE4LCJ0b3RhbERpcmVjdENvc3QiOjI0MTE0LjMsInRvdGFsSXRlbUNvc3QiOjI0MTE0LjMsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExMTg2NTQyYnA4cmoiLCJjYXRlZ29yeSI6IllBUCIsInB5cENvZGUiOiIyMS1BMDk3LUQtWUFQLTAwMy0wMSIsInBvek5vIjoiMTUuNDQwLjEwMDQiLCJkZXNjcmlwdGlvbiI6IkthcGxhbWEgYWx0xLEgZGlsYXRhc3lvbiBwcm9maWxpIGlsZSAoa2F1w6d1ayBmaXRpbGxpLCBhbMO8bWlueXVtIGV0IGthbMSxbmzEscSfxLEgbWluLiAyIG1tLCArLy0gNCBtbSBoYXJla2V0IGthcGFzaXRlbGksIHByb2ZpbCB5w7xrc2VrbGnEn2kgbWluLiAzNSBtbSwga2FuYXQgZ2VuaXNsacSfaSBtaW4uIDQ1IG1tKSB6ZW1pbmRlIGRpbGF0YXN5b24gZnVnYXPEsSB5YXDEsWxtYXPEsSAoNTAgbW0gZ2VuacWfbGlrdGUgZGlsYXRhc3lvbmxhciBpw6dpbikgKHlheWEgecO8a8O8bmUgZGF5YW7EsWtsxLEpIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6MTUsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MS4yLCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjAsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6OTk5LjAxLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjE4LCJ0b3RhbERpcmVjdENvc3QiOjE0OTg1LjE1LCJ0b3RhbEl0ZW1Db3N0IjoxNDk4NS4xNSwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTEzMjAzMTk1cm43cSIsImNhdGVnb3J5IjoiQ0VQIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjE1LjE4NS4xMDIxIiwiZGVzY3JpcHRpb24iOiLDlm4gWWFwxLFtbMSxIEJpbGXFn2VubGVyZGVuIE9sdcWfYW4gVGFtIEfDvHZlbmxpa2xpIETEscWfIENlcGhlIMSwc2tlbGVzaSBZYXDEsWxtYXPEsSAoMywwMS01MSwwMCBtIGFyYXPEsSkgLSBHZW5pxZ9saWsgU8SxbsSxZsSxIDYwLTkwIGNtIEFyYXPEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5IjoxODMwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjAuMDMsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MjIyLjA1LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjIyMi4wNSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo1NC45LCJ0b3RhbERpcmVjdENvc3QiOjQwNjM1MS41LCJ0b3RhbEl0ZW1Db3N0Ijo0MDYzNTEuNSwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTEzMjAzMTl1bmV1dyIsImNhdGVnb3J5IjoiQ0VQIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjE1LjE4NS4xMDMxIiwiZGVzY3JpcHRpb24iOiLDlm4gWWFwxLFtbMSxIEJpbGXFn2VubGVyZGVuIE9sdcWfYW4gVGFtIEfDvHZlbmxpa2xpIFRhdmFubGFyIMSww6dpbiDEsMWfIMSwc2tlbGVzaSBZYXDEsWxtYXPEsS4oMywwMS0yMSw1IG0gYXJhc8SxKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5Ijo4ODgsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC4wMywiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoyNjkuMywibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoyNjkuMywiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoyNi42NCwidG90YWxEaXJlY3RDb3N0IjoyMzkxMzguNDAwMDAwMDAwMDIsInRvdGFsSXRlbUNvc3QiOjIzOTEzOC40MDAwMDAwMDAwMiwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTEzMjAzMTlzNTlhbCIsImNhdGVnb3J5IjoiQ0VQIiwicHlwQ29kZSI6IjIxLUEwOTctRC1EQ8OHLTAwMi0wOCIsInBvek5vIjoiMTUuMzMwLjEwMDQiLCJkZXNjcmlwdGlvbiI6IkXEn2ltbGkgw6dhdMSxbGFyZGEsIMOnYXTEsSDDtnJ0w7xzw7wgYWx0xLFuYSwgMyBtbSBrYWzEsW5sxLFrdGEgcGxhc3RvbWVyIGVzYXNsxLEsIGNhbSB0w7xsw7wgdGHFn8SxecSxY8SxbMSxIHBvbGltZXIgYml0w7xtbMO8IMO2cnTDvCAoLTEwIMKwQyBzb8SfdWt0YSBiw7xrw7xsbWVsaSkgaWxlIHN1IHlhbMSxdMSxbcSxIHlhcMSxbG1hc8SxIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6Im0yIiwidGVuZGVyUXVhbnRpdHkiOjc0MCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjYsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6NTEyLjM0LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjUxMi4zNCwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo0NDQsInRvdGFsRGlyZWN0Q29zdCI6Mzc5MTMxLjYwMDAwMDAwMDAzLCJ0b3RhbEl0ZW1Db3N0IjozNzkxMzEuNjAwMDAwMDAwMDMsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExMzIwMzE5dmwzMHgiLCJjYXRlZ29yeSI6IkNFUCIsInB5cENvZGUiOiIyMS1BMDk3LUQtREPDhy0wMDItMDgiLCJwb3pObyI6IjE1LjM0MS40MDAxIiwiZGVzY3JpcHRpb24iOiLDh2F0xLEgYXJhc8SxbmEgZMO2xZ9lbWUgw7x6ZXJpbmUgdXlndWxhbWFsYXIgacOnaW4sIDAsMDM1IOKJpCBJc8SxbCBpbGV0a2VubGnEn2kgPCAwLDA0MFcvKG0uSykgb2xhbiwgOCBjbSBrYWzEsW5sxLFrdGEga2FwbGFtYXPEsXogY2FtecO8bsO8IMWfaWx0ZSB2ZSDDvHplcmluZSBzdSBidWhhcsSxIGdlw6dpxZ9pbmUgYcOnxLFrIHN1IHlhbMSxdMSxbSDDtnJ0w7xzw7wgc2VyaWxtZXNpIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6Im0yIiwidGVuZGVyUXVhbnRpdHkiOjYxNywicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjMsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MzczLjU5LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjM3My41OSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoxODUuMSwidG90YWxEaXJlY3RDb3N0IjoyMzA1MDUuMDMsInRvdGFsSXRlbUNvc3QiOjIzMDUwNS4wMywiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTEzMjAzMTl3NzAwMiIsImNhdGVnb3J5IjoiQ0VQIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjE1LjMwMC4xMDAyIiwiZGVzY3JpcHRpb24iOiJBaMWfYXB0YW4gb3R1cnRtYSDDp2F0xLEgeWFwxLFsbWFzxLEgKMOnYXTEsSDDtnJ0w7xzw7xuw7xuIGFsdMSxIE9TQi8zIGthcGxhbWFsxLEpIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6Im0yIiwidGVuZGVyUXVhbnRpdHkiOjc0MCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjoyLjAxNCwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoxNzY3LjA1LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjE3NjcuMDUsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6MTQ5MC4zNiwidG90YWxEaXJlY3RDb3N0IjoxMzA3NjE3LCJ0b3RhbEl0ZW1Db3N0IjoxMzA3NjE3LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTMyMDMxOXhxdXo3IiwiY2F0ZWdvcnkiOiJDRVAiLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMTUuMzA1LjEwMDUiLCJkZXNjcmlwdGlvbiI6Ik1haHlhIGtpcmVtaXRsZXJpIGlsZSBtYWh5YSB5YXDEsWxtYXPEsSAoU8SxemTEsXJtYXpsxLFrIFPEsW7EsWbEsTogR3J1cCAxKSAoMTUwIGRvbm1hLcOnw7Z6w7xsbWUgw6dldnJpbWluZSBkYXlhbsSxa2zEsSkiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibXQiLCJ0ZW5kZXJRdWFudGl0eSI6NjAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC4zLCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjYzOC42LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjYzOC42LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjE4LCJ0b3RhbERpcmVjdENvc3QiOjM4MzE2LCJ0b3RhbEl0ZW1Db3N0IjozODMxNiwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTEzMjAzMTlkajJpYyIsImNhdGVnb3J5IjoiQ0VQIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjE1LjMwNS4xMDAxIiwiZGVzY3JpcHRpb24iOiIgw5xzdCB2ZSBhbHQga2lyZW1pdCAoYWxhdHVya2EpIGlsZSDDp2F0xLEgw7ZydMO8c8O8IHlhcMSxbG1hc8SxIChTxLF6ZMSxcm1hemzEsWsgU8SxbsSxZsSxOiBHcnVwIDEpICgxNTAgZG9ubWEtw6fDtnrDvGxtZSDDp2V2cmltaW5lIGRheWFuxLFrbMSxKSAoMyBMYXRhbMSxIHNpc3RlbSkiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibTIiLCJ0ZW5kZXJRdWFudGl0eSI6NzQwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjIuMiwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoxNzM3Ljc1LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjE3MzcuNzUsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6MTYyOC4wMDAwMDAwMDAwMDAyLCJ0b3RhbERpcmVjdENvc3QiOjEyODU5MzUsInRvdGFsSXRlbUNvc3QiOjEyODU5MzUsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExMzIwMzE5azczdzkiLCJjYXRlZ29yeSI6IkNFUCIsInB5cENvZGUiOiItIiwicG96Tm8iOiIxNS4zMDUuMTIxNCIsImRlc2NyaXB0aW9uIjoiQWzDvG1pbnl1bSBiYXNrxLEgw6fEsXRhc8SxIHZlIHBvbGnDvHJldGFuIG1hc3RpayBpbGUgeWFsxLF0xLFtIGJpdGnFn2xlcmluZGUgc8SxemTEsXJtYXpsxLFrIHNhxJ9sYW5tYXPEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtIiwidGVuZGVyUXVhbnRpdHkiOjcwMCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjQsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MzM3LjU2LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjMzNy41NiwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoyODAsInRvdGFsRGlyZWN0Q29zdCI6MjM2MjkyLCJ0b3RhbEl0ZW1Db3N0IjoyMzYyOTIsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExMzIwMzE5OHUwNDUiLCJjYXRlZ29yeSI6IkNFUCIsInB5cENvZGUiOiIyMS1BMDk3LUQtREPDhy0wMDItMDIiLCJwb3pObyI6IjE1LjMxMC4xMTA0IiwiZGVzY3JpcHRpb24iOiIxMiBubydsdSDDp2lua28gbGV2aGFkYW4gMTMwIG1tIMOnYXDEsW5kYSB5YcSfbXVyIG9sdcSfdSB5YXDEsWxtYXPEsSB2ZSB5ZXJpbmUgdGVzcGl0aS4iLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibSIsInRlbmRlclF1YW50aXR5IjoxNDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MywiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoxNzk4LjMzLCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjE3OTguMzMsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6NDIwLCJ0b3RhbERpcmVjdENvc3QiOjI1MTc2Ni4xOTk5OTk5OTk5OCwidG90YWxJdGVtQ29zdCI6MjUxNzY2LjE5OTk5OTk5OTk4LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTMyMDMxOTl6OWtzIiwiY2F0ZWdvcnkiOiJDRVAiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELURDw4ctMDAyLTAyIiwicG96Tm8iOiIxNS4zMTAuMTAwMiIsImRlc2NyaXB0aW9uIjoiIDEyIG5vJ2x1IMOnaW5rbyBsZXZoYWRhbiAxMjAgbW0gw6dhcMSxbmRhIGTDvMWfZXkgeWHEn211ciBib3J1c3UgeWFwxLFsbWFzxLEgdmUgeWVyaW5lIHRlc3BpdGkuIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6Im0iLCJ0ZW5kZXJRdWFudGl0eSI6MTIwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjMsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MTA4NC42MSwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoxMDg0LjYxLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjM2MCwidG90YWxEaXJlY3RDb3N0IjoxMzAxNTMuMTk5OTk5OTk5OTgsInRvdGFsSXRlbUNvc3QiOjEzMDE1My4xOTk5OTk5OTk5OCwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE0MTQ1MDJ6MW9uMSIsImNhdGVnb3J5IjoiTcSwTSIsInB5cENvZGUiOiIyMS1BMDk3LUQtTcSwTS0wMDEtMDEiLCJwb3pObyI6IjE1LjIyNS4xOTAzIiwiZGVzY3JpcHRpb24iOiIxNSBjbSBrYWzEsW5sxLHEn8SxbmRha2kgdGXDp2hpemF0bMSxIGdhemJldG9uIGR1dmFyIGVsZW1hbmxhcsSxIGlsZSB2aW7DpyBrdWxsYW5hcmFrIGR1dmFyIHlhcMSxbG1hc8SxICgzLDUwIE4vbW3CsiB2ZSA1MDAga2cvbcKzKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5IjoxMzAwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjAuODM3LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjE4ODMuNTEsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MTg4My41MSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoxMDg4LjEsInRvdGFsRGlyZWN0Q29zdCI6MjQ0ODU2MywidG90YWxJdGVtQ29zdCI6MjQ0ODU2MywiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE0MTQ1MDJoNWU0NiIsImNhdGVnb3J5IjoiTcSwTSIsInB5cENvZGUiOiIyMS1BMDk3LUQtTcSwTS0wMDEtMDEiLCJwb3pObyI6IjE1LjIzMC4xMzAyIiwiZGVzY3JpcHRpb24iOiIxMyw1IGNtIGthbMSxbmzEscSfxLFuZGFraSB0ZcOnaGl6YXRsxLEgYmltc2JldG9uIGxlbnRvIHRlbWluaSB2ZSB5ZXJpbmUga29udWxtYXPEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5IjozODQsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC45MywiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoxMTU2LjQzLCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjExNTYuNDMsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6MzU3LjEyLCJ0b3RhbERpcmVjdENvc3QiOjQ0NDA2OS4xMiwidG90YWxJdGVtQ29zdCI6NDQ0MDY5LjEyLCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTQxNDUwMmhmeHZiIiwiY2F0ZWdvcnkiOiJNxLBNIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjE1LjMwNS4yMTAxIiwiZGVzY3JpcHRpb24iOiI2IGNtIGthbMSxbmzEsWt0YSB5w7x6ZXllIGRpayDDp2VrbWUgbXVrYXZlbWV0aSBlbiBheiA3LDVrUGEgKFRSNyw1KSB0YcWfecO8bsO8IGxldmhhbGFyIGlsZSBkxLHFnyBkdXZhcmxhcmRhIGTEscWfdGFuIMSxc8SxIHlhbMSxdMSxbcSxIHZlIMO8emVyaW5lIMSxc8SxIHlhbMSxdMSxbSBzxLF2YXPEsSB5YXDEsWxtYXPEsSAoTWFudG9sYW1hKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5IjozMjAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6Mi40LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjE0NzUuNDUsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MTQ3NS40NSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo3NjgsInRvdGFsRGlyZWN0Q29zdCI6NDcyMTQ0LCJ0b3RhbEl0ZW1Db3N0Ijo0NzIxNDQsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNDE0NTAyZGdueGMiLCJjYXRlZ29yeSI6Ik3EsE0iLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMTUuMzQxLjEwMDIiLCJkZXNjcmlwdGlvbiI6IjYgY20ga2FsxLFubMSxa3RhIHnDvHpleWUgZGlrIMOnZWttZSBtdWthdmVtZXRpIGVuIGF6IDEwMGtQYSAoVFIxMDApIGVrc3BhbmRlIHBvbGlzdHJlbiBsZXZoYWxhciAoRVBTKSBpbGUgZMSxxZ8gZHV2YXJsYXJkYSBkxLHFn3RhbiDEsXPEsSB5YWzEsXTEsW3EsSB2ZSDDvHplcmluZSDEsXPEsSB5YWzEsXTEsW0gc8SxdmFzxLEgeWFwxLFsbWFzxLEgKE1hbnRvbGFtYSkiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibTIiLCJ0ZW5kZXJRdWFudGl0eSI6MTI4MCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjoyLjQsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MTIxOC4zMSwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoxMjE4LjMxLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjMwNzIsInRvdGFsRGlyZWN0Q29zdCI6MTU1OTQzNi43OTk5OTk5OTk4LCJ0b3RhbEl0ZW1Db3N0IjoxNTU5NDM2Ljc5OTk5OTk5OTgsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNDE0NTAyejNtYTUiLCJjYXRlZ29yeSI6Ik3EsE0iLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMTUuNTQwLjE2MjIiLCJkZXNjcmlwdGlvbiI6IklzxLEgeWFsxLF0xLFtIHNpc3RlbWxlcmkgaWxlIGthcGxhbm3EscWfIHnDvHpleWxlcmUsIGFzdGFyIHV5Z3VsYW5hcmFrIEZvdG9rYXRhbGl0aWsgw7Z6ZWxsaWtsaSBzYWYgYXJraWxpayBlc2FzbMSxIHN1IGJhemzEsSBkxLHFnyBjZXBoZSBib3lhc8SxIChWMTpXMzpHMikgeWFwxLFsbWFzxLEgKGTEscWfIGNlcGhlKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5IjoxNjAwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjAuOSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0Ijo0NDcuNjEsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6NDQ3LjYxLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjE0NDAsInRvdGFsRGlyZWN0Q29zdCI6NzE2MTc2LCJ0b3RhbEl0ZW1Db3N0Ijo3MTYxNzYsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNDE0NTAyNDZxZWYiLCJjYXRlZ29yeSI6Ik3EsE0iLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMTUuNDU1LjEwMDIiLCJkZXNjcmlwdGlvbiI6Ik1ldGFsIHRha3ZpeWVsaSBiZXlheiByZW5rbGkgcGxhc3RpayBkb8SfcmFtYSBpbWFsYXTEsSB5YXDEsWxtYXPEsSB2ZSB5ZXJpbmUga29udWxtYXPEsSAoU2VydCBQVkMgZG/En3JhbWEgcHJvZmlsbGVyaW5kZW4gaGVyIMOnZcWfaXQga2FwxLEsIHBlbmNlcmUsIGthcGxhbWEgdmUgYmVuemVyaSBpbWFsYXQpIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImtnIiwidGVuZGVyUXVhbnRpdHkiOjU1MCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjIxLCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjM1OS4zNCwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjozNTkuMzQsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6MTE1LjUsInRvdGFsRGlyZWN0Q29zdCI6MTk3NjM3LCJ0b3RhbEl0ZW1Db3N0IjoxOTc2MzcsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNDE0NTAybHA0bGsiLCJjYXRlZ29yeSI6Ik3EsE0iLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMTUuNDcwLjEyMTYiLCJkZXNjcmlwdGlvbiI6IlBWQyB2ZSBhbMO8bWlueXVtIGRvxJ9yYW1heWEgcHJvZmlsIGlsZSA0KzQgbW0ga2FsxLFubMSxa3RhIDE2IG1tIGFyYSBib8WfbHVrbHUgaWxrIGNhbcSxIMSxc8SxIGtvbnRyb2wga2FwbGFtYWzEsSDDp2lmdCBjYW1sxLEgcGVuY2VyZSDDvG5pdGVzaSB0YWvEsWxtYXPEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5Ijo1NTAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MS4wNSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoyMTAxLjk1LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjIxMDEuOTUsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6NTc3LjUsInRvdGFsRGlyZWN0Q29zdCI6MTE1NjA3Mi41LCJ0b3RhbEl0ZW1Db3N0IjoxMTU2MDcyLjUsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNDE0NTAyMmttNWciLCJjYXRlZ29yeSI6Ik3EsE0iLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMTUuNDEwLjE0MTMiLCJkZXNjcmlwdGlvbiI6IiAzIGNtIGthbMSxbmzEscSfxLFuZGEgcmVua2xpIG1lcm1lciBsZXZoYSBpbGUgZMSxxZ8gZGVuaXpsaWsgeWFwxLFsbWFzxLEgKDMgY20geCAzMC00MC01MCBjbSB4IHNlcmJlc3QgYm95KSAoaG9ubHUgdmV5YSBjaWxhbMSxKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5IjozMDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6OC41LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjQzMjguMzksImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6NDMyOC4zOSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoyNTUwLCJ0b3RhbERpcmVjdENvc3QiOjEyOTg1MTcsInRvdGFsSXRlbUNvc3QiOjEyOTg1MTcsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNDE0NTAyYWxhNDUiLCJjYXRlZ29yeSI6Ik3EsE0iLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMTUuMzA1LjEyMTQiLCJkZXNjcmlwdGlvbiI6IkFsw7xtaW55dW0gYmFza8SxIMOnxLF0YXPEsSB2ZSBwb2xpw7xyZXRhbiBtYXN0aWsgaWxlIHlhbMSxdMSxbSBiaXRpxZ9sZXJpbmRlIHPEsXpkxLFybWF6bMSxayBzYcSfbGFubWFzxLEiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibSIsInRlbmRlclF1YW50aXR5Ijo3MDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC40LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjMzNy41NiwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjozMzcuNTYsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6MjgwLCJ0b3RhbERpcmVjdENvc3QiOjIzNjI5MiwidG90YWxJdGVtQ29zdCI6MjM2MjkyLCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTQxNDUwMm0zbW90IiwiY2F0ZWdvcnkiOiJNxLBNIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjE1LjIyMC4xMDE0IiwiZGVzY3JpcHRpb24iOiIgMTM1IG1tIGthbMSxbmzEscSfxLFuZGEgeWF0YXkgZGVsaWtsaSB0dcSfbGEgKDE5MCB4IDEzNSB4IDE5MCBtbSkgaWxlIGR1dmFyIHlhcMSxbG1hc8SxIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6Im0yIiwidGVuZGVyUXVhbnRpdHkiOjIwMDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MS44OSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0Ijo4OTYuOTEsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6ODk2LjkxLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjM3ODAsInRvdGFsRGlyZWN0Q29zdCI6MTc5MzgyMCwidG90YWxJdGVtQ29zdCI6MTc5MzgyMCwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE0MTQ1MDJnMG80NSIsImNhdGVnb3J5IjoiTcSwTSIsInB5cENvZGUiOiItIiwicG96Tm8iOiIxNS4yMjAuMTAxMSIsImRlc2NyaXB0aW9uIjoiODUgbW0ga2FsxLFubMSxxJ/EsW5kYSB5YXRheSBkZWxpa2xpIHR1xJ9sYSAoMTkwIHggODUgeCAxOTAgbW0pIGlsZSBkdXZhciB5YXDEsWxtYXPEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5IjozMDAwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEuOCwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0Ijo4MTEuOTMsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6ODExLjkzLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjU0MDAsInRvdGFsRGlyZWN0Q29zdCI6MjQzNTc5MCwidG90YWxJdGVtQ29zdCI6MjQzNTc5MCwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE0MTQ1MDJpOG8zciIsImNhdGVnb3J5IjoiTcSwTSIsInB5cENvZGUiOiItIiwicG96Tm8iOiIxNS4yODAuMTAwOSIsImRlc2NyaXB0aW9uIjoiUGVybGl0bGkgc8SxdmEgYWzDp8Sxc8SxIHZlIHNhdGVuIGFsw6fEsSBpbGUga2FwbGFtYSB5YXDEsWxtYXPEsSAoQmV0b24sIHR1xJ9sYSBkdXZhciB2Yi4gecO8emV5bGVyZSkiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibTIiLCJ0ZW5kZXJRdWFudGl0eSI6MTMwMDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MS45LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjc4MS4xOSwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0Ijo3ODEuMTksImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6MjQ3MDAsInRvdGFsRGlyZWN0Q29zdCI6MTAxNTU0NzAsInRvdGFsSXRlbUNvc3QiOjEwMTU1NDcwLCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTQxNDUwMnpyeGkwIiwiY2F0ZWdvcnkiOiJNxLBNIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjE1LjI1MC4xMTExIiwiZGVzY3JpcHRpb24iOiIyLjUgY20ga2FsxLFubMSxxJ/EsW5kYSA0MDAga2cgw6dpbWVudG8gZG96bHUgxZ9hcCB5YXDEsWxtYXPEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5IjozMDUwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEuMjUsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6NDk3LjgxLCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjQ5Ny44MSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjozODEyLjUsInRvdGFsRGlyZWN0Q29zdCI6MTUxODMyMC41LCJ0b3RhbEl0ZW1Db3N0IjoxNTE4MzIwLjUsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNDE0NTAyMmtpamMiLCJjYXRlZ29yeSI6Ik3EsE0iLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMTUuMjcwLjEwMDYiLCJkZXNjcmlwdGlvbiI6IsOHaW1lbnRvIGVzYXNsxLEgcG9saW1lciBtb2RpZml5ZWxpIGlraSBiaWxlc2VubGkga3VsbGFuxLFtYSBoYXrEsXIgeWFsxLF0xLFtIGhhcmPEsSBpbGUgZmlsZSB0YWt2aXllbGkgb2xhcmFrLCAyIGthdCBoYWxpbmRlIHRvcGxhbSAxLjUgbW0ga2FsxLFubMSxa3RhIHN1IHlhbMSxdMSxbcSxIHlhcMSxbG1hc8SxIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6Im0yIiwidGVuZGVyUXVhbnRpdHkiOjMyMCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjoxLjEsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6NjM0LjU0LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjYzNC41NCwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjozNTIsInRvdGFsRGlyZWN0Q29zdCI6MjAzMDUyLjgsInRvdGFsSXRlbUNvc3QiOjIwMzA1Mi44LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTQxNDUwMnc5a2ZvIiwiY2F0ZWdvcnkiOiJNxLBNIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjE1LjQwMC4xMDExIiwiZGVzY3JpcHRpb24iOiJNZXJtZXIgYWdyZWdhbMSxIHRlcnJhem8ga2FybyBpbGUgacOnIG1la2FuIGTDtsWfZW1lIGthcGxhbWFzxLEgeWFwxLFsbWFzxLEgKEvEsXLEsWxtYSBZw7xrw7wgxZ5hcnRsYXLEsSAoU8SxbsSxZiAxKSBZw7x6ZXkgYWxhbsSxIOKJpCAxMTAwIGNtwrIgZWJhdGxhcmRhLCBob25sdSB2ZXlhIGNpbGFsxLEpIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6Im0yIiwidGVuZGVyUXVhbnRpdHkiOjQ1MCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjozLjcsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MTkwMS42MywibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoxOTAxLjYzLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjE2NjUsInRvdGFsRGlyZWN0Q29zdCI6ODU1NzMzLjUsInRvdGFsSXRlbUNvc3QiOjg1NTczMy41LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTQxNDUwMmZ0a3BhIiwiY2F0ZWdvcnkiOiJNxLBNIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjE1LjQwMC4xMjEyIiwiZGVzY3JpcHRpb24iOiJLdXZhcnMtc2lsaXMgKyBtZXJtZXIgYWdyZWdhbMSxIHRlcnJhem8ga2FybyBpbGUgacOnIG1la2FuIGTDtsWfZW1lIGthcGxhbWFzxLEgeWFwxLFsbWFzxLEgKEvEsXLEsWxtYSBZw7xrw7wgxZ5hcnRsYXLEsSAoU8SxbsSxZiAxKSBZw7x6ZXkgYWxhbsSxID4gMTEwMCBjbcKyIGViYXRsYXJkYSwgaG9ubHUgdmV5YSBjaWxhbMSxKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5Ijo0NTAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6My43LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjIyMTMuNzEsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MjIxMy43MSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoxNjY1LCJ0b3RhbERpcmVjdENvc3QiOjk5NjE2OS41LCJ0b3RhbEl0ZW1Db3N0Ijo5OTYxNjkuNSwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE0MTQ1MDJxbmNtOCIsImNhdGVnb3J5IjoiTcSwTSIsInB5cENvZGUiOiItIiwicG96Tm8iOiIxNS40OTAuMTAwMyIsImRlc2NyaXB0aW9uIjoiIExhbWluYXQgcGFya2UgZMO2xZ9lbWUga2FwbGFtYXPEsSB5YXDEsWxtYXPEsSAoQUM0IFPEsW7EsWYgMzIpIChzw7xww7xyZ2VsaWsgZGFoaWwpIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6Im0yIiwidGVuZGVyUXVhbnRpdHkiOjE4NTAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC40NSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0Ijo3NjIsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6NzYyLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjgzMi41LCJ0b3RhbERpcmVjdENvc3QiOjE0MDk3MDAsInRvdGFsSXRlbUNvc3QiOjE0MDk3MDAsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNDE0NTAyNTVsbWwiLCJjYXRlZ29yeSI6Ik3EsE0iLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMTUuNDk1LjEwMDEiLCJkZXNjcmlwdGlvbiI6IiBBaMWfYXB0YW4gc8O8cMO8cmdlbGlrIHlhcMSxbG1hc8SxIHZlIHllcmluZSBrb251bG1hc8SxIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6Im0iLCJ0ZW5kZXJRdWFudGl0eSI6Mjc3NSwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjE2NSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoxNTkuMDQsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MTU5LjA0LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjQ1Ny44NzUsInRvdGFsRGlyZWN0Q29zdCI6NDQxMzM2LCJ0b3RhbEl0ZW1Db3N0Ijo0NDEzMzYsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNDE0NTAyamkwNHoiLCJjYXRlZ29yeSI6Ik3EsE0iLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMTUuNTEwLjExMDMiLCJkZXNjcmlwdGlvbiI6IkxhbWluYXQga2FwbGFtYWzEsSwgaWtpIHnDvHrDvCBvZHVuIGxpZmluZGVuIHlhcMSxbG3EscWfIGxldmhhbGFybGEgKG1kZikgcHJlc2xpLCBrcmFmdCBkb2xndWx1IGnDpyBrYXDEsSBrYW5hZMSxIHlhcMSxbG1hc8SxLCB5ZXJpbmUgdGFrxLFsbWFzxLEiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibTIiLCJ0ZW5kZXJRdWFudGl0eSI6MTc2LCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEuNjgsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MzY1MS44MywibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjozNjUxLjgzLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjI5NS42OCwidG90YWxEaXJlY3RDb3N0Ijo2NDI3MjIuMDgsInRvdGFsSXRlbUNvc3QiOjY0MjcyMi4wOCwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE0MTQ1MDJ2MjF2MCIsImNhdGVnb3J5IjoiTcSwTSIsInB5cENvZGUiOiItIiwicG96Tm8iOiIxNS41NDAuMTUyMCIsImRlc2NyaXB0aW9uIjoiWWVuaSBzxLF2YSB5w7x6ZXlsZXJlIGFzdGFyIHV5Z3VsYW5hcmFrIGlraSBrYXQgU3UgYmF6bMSxIFNpbGlrb25sdSBNYXQgxLDDpyBDZXBoZSBCb3lhc8SxICjDlnJ0w7xjw7xsw7xrIFPEsW7EsWY6MiwgWU9EOlPEsW7EsWYgMiwgUGFybGFrbMSxazpHMykgeWFwxLFsbWFzxLEgKGnDpyBjZXBoZSkiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibTIiLCJ0ZW5kZXJRdWFudGl0eSI6MTMwMDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC41LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjI0MS4zNiwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoyNDEuMzYsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6NjUwMCwidG90YWxEaXJlY3RDb3N0IjozMTM3NjgwLCJ0b3RhbEl0ZW1Db3N0IjozMTM3NjgwLCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTY1MjM5MnA2dXQwIiwiY2F0ZWdvcnkiOiJNRUsiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELU1FSy0wMDEiLCJwb3pObyI6IjI1LjMwNS4yMTAxIiwiZGVzY3JpcHRpb24iOiJQbiAyMCBwb2xpcHJvcGlsZW4gdGVtaXogc3UgYm9ydSAxLzJcIiAyMC8zLDQgbW0gUG9saXByb3BpbGVuIHRlbWl6IHN1IGJvcnVsYXLEsSAiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibSIsInRlbmRlclF1YW50aXR5IjozNTAwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjAuMTMsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MTA5LjIyLCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjEwOS4yMiwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo0NTUsInRvdGFsRGlyZWN0Q29zdCI6MzgyMjcwLCJ0b3RhbEl0ZW1Db3N0IjozODIyNzAsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNjUyMzkyYjJxanAiLCJjYXRlZ29yeSI6Ik1FSyIsInB5cENvZGUiOiIyMS1BMDk3LUQtTUVLLTAwMSIsInBvek5vIjoiMTUuMjAwLjEwMDMiLCJkZXNjcmlwdGlvbiI6IkJvZHJ1bSBwZXJkZWxlcmluZGUgc3UgeWFsxLF0xLFtxLEgdmUgaXpvbGFzeW9uIHBpbWkgaWxlIHV5Z3VsYW5txLHFnyDEsXPEsSB5YWzEsXTEsW3EsSDDvHplcmluZSBIRFBFIGVzYXNsxLEgZHJlbmFqIHZlIGtvcnVtYSBsZXZoYXPEsSB0ZW1pbmkgdmUgeWVyaW5lIGTDtsWfZW5tZXNpICgyNTA8PWJhc8SxbsOnIGRheWFuxLFtxLE8MzUwIEtOL23CsikiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibTIiLCJ0ZW5kZXJRdWFudGl0eSI6MCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjI1LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjE1Ni40LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjE1Ni40LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjAsInRvdGFsRGlyZWN0Q29zdCI6MCwidG90YWxJdGVtQ29zdCI6MCwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE2NTIzOTJjd3dkZiIsImNhdGVnb3J5IjoiTUVLIiwicHlwQ29kZSI6IjIxLUEwOTctRC1NRUstMDAxIiwicG96Tm8iOiIyNS4zMDUuNjMwMy9BICIsImRlc2NyaXB0aW9uIjoiIDExMCDDmCwgMywyIFtExLHFnyDDh2FwIChtbSkgLSBtaW4uIEV0IEthbMSxbmzEscSfxLEgKG1tKSBdLCBTRVMgxLBaT0xFTMSwIFBMQVNUxLBLIFDEsFMgU1UgQk9SVUxBUkkgIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6Im0iLCJ0ZW5kZXJRdWFudGl0eSI6MTUwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjAuMTMsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6NTIzLjAyLCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjUyMy4wMiwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoxOS41LCJ0b3RhbERpcmVjdENvc3QiOjc4NDUzLCJ0b3RhbEl0ZW1Db3N0Ijo3ODQ1MywiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE2NTIzOTJzZzQwdSIsImNhdGVnb3J5IjoiTUVLIiwicHlwQ29kZSI6IjIxLUEwOTctRC1NRUstMDAxIiwicG96Tm8iOiIyNS4zMDUuNjEwMS9BIiwiZGVzY3JpcHRpb24iOiIgU2VydCBQVkMgcGxhc3RpayBwaXMgc3UgYm9ydXN1IChnZcOnbWUgbXVmbHUsIMOnYXA6IDUwLTQwIG1tLCBldCBrYWzEsW5sxLHEn8SxIDMgbW0pICIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtIiwidGVuZGVyUXVhbnRpdHkiOjk2MCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjEzLCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjI0Mi41MiwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoyNDIuNTIsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6MTI0LjgwMDAwMDAwMDAwMDAxLCJ0b3RhbERpcmVjdENvc3QiOjIzMjgxOS4yLCJ0b3RhbEl0ZW1Db3N0IjoyMzI4MTkuMiwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE2NTIzOTJpZXFvZyIsImNhdGVnb3J5IjoiTUVLIiwicHlwQ29kZSI6IjIxLUEwOTctRC1NRUstMDAxIiwicG96Tm8iOiJcbjI1LjE1MC4xMjA5IiwiZGVzY3JpcHRpb24iOiJQcml6bWF0aWsgTW9kw7xsZXIgUGFzbGFubWF6IMOHZWxpayBTdSBEZXBvc3Ug4oaSIDE1LDAgbTMiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoiYWRldCIsInRlbmRlclF1YW50aXR5IjoyLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEwOSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjozNTcxMy45OSwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjozNTcxMy45OSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoyMTgsInRvdGFsRGlyZWN0Q29zdCI6NzE0MjcuOTgsInRvdGFsSXRlbUNvc3QiOjcxNDI3Ljk4LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTY1MjM5MmRieDhnIiwiY2F0ZWdvcnkiOiJNRUsiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELU1FSy0wMDEiLCJwb3pObyI6IjI1LjE2MC4xMjAxIiwiZGVzY3JpcHRpb24iOiLEsGtpIFBvbXBhbMSxIETDvMWfZXkgTWlsbGkgU2FudHJpZsO8aiBQb21wYWzEsSBIaWRyb2ZvciDihpIgRGViaTogMCAtIDEwIG0zIC8gaCBCYXPEsW7DpzogMzAgLSA2MCBtU1MiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoiYWRldCIsInRlbmRlclF1YW50aXR5IjoyLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEyLjUsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6ODkzMDAsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6ODkzMDAsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6MjUsInRvdGFsRGlyZWN0Q29zdCI6MTc4NjAwLCJ0b3RhbEl0ZW1Db3N0IjoxNzg2MDAsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNjUyMzkyaXNkOXciLCJjYXRlZ29yeSI6Ik1FSyIsInB5cENvZGUiOiIyMS1BMDk3LUQtTUVLLTAwMSIsInBvek5vIjoiMjUuMTEyLjExMDEiLCJkZXNjcmlwdGlvbiI6IlRha3JpYmVuIDM1eDU1IGNtIChFa3N0cmEga2FsaXRlKSBLbG96ZXQgdGFrxLFtxLEiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoiYWRldCIsInRlbmRlclF1YW50aXR5Ijo0MCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjoyLCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjEzMTE4LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjEzMTE4LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjgwLCJ0b3RhbERpcmVjdENvc3QiOjUyNDcyMCwidG90YWxJdGVtQ29zdCI6NTI0NzIwLCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTY1MjM5MmZ0d2IxIiwiY2F0ZWdvcnkiOiJNRUsiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELU1FSy0wMDEiLCJwb3pObyI6IjI1LjEzMC4zMzAxIiwiZGVzY3JpcHRpb24iOiIgVGVrIGt1bWFuZGFsxLEsIGJhbnlvIGJhdGFyeWFzxLEsIEJhbnlvIHZlIER1xZ8gYmF0YXJ5YWxhcsSxIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6NDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MS4xLCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjMxODEuMDUsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MzE4MS4wNSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo0NCwidG90YWxEaXJlY3RDb3N0IjoxMjcyNDIsInRvdGFsSXRlbUNvc3QiOjEyNzI0MiwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE2NTIzOTIwamtsZiIsImNhdGVnb3J5IjoiTUVLIiwicHlwQ29kZSI6IjIxLUEwOTctRC1NRUstMDAxIiwicG96Tm8iOiIyNS4xMzAuMzIwMSIsImRlc2NyaXB0aW9uIjoiVGVrIGt1bWFuZGFsxLEgbGF2YWJvIGJhdGFyeWFzxLEiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoiYWRldCIsInRlbmRlclF1YW50aXR5Ijo0MCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjoxLjEsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MzEyNS44MiwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjozMTI1LjgyLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjQ0LCJ0b3RhbERpcmVjdENvc3QiOjEyNTAzMi44LCJ0b3RhbEl0ZW1Db3N0IjoxMjUwMzIuOCwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE2NTIzOTJoY2xkaSIsImNhdGVnb3J5IjoiTUVLIiwicHlwQ29kZSI6IjIxLUEwOTctRC1NRUstMDAxIiwicG96Tm8iOiIyNS4xMzAuMzEwMyIsImRlc2NyaXB0aW9uIjoiIFRlayBrdW1hbmRhbMSxLCB0ZWsgZ8O2dmRlIHNwaXJhbGxpIGV2aXllIGJhdGFyeWFzxLEsIEV2aXllIEJhdGFyeWFsYXLEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjMyLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEuMSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0Ijo1MzQzLjkxLCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjUzNDMuOTEsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6MzUuMiwidG90YWxEaXJlY3RDb3N0IjoxNzEwMDUuMTIsInRvdGFsSXRlbUNvc3QiOjE3MTAwNS4xMiwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE2NTIzOTJkcGd1cSIsImNhdGVnb3J5IjoiTUVLIiwicHlwQ29kZSI6IjIxLUEwOTctRC1NRUstMDAxIiwicG96Tm8iOiIyNS4xMzAuMTIwNCIsImRlc2NyaXB0aW9uIjoiRmlsdHJlbGkgYXJhIG11c2x1aywgcGFzbGFubWF6IMOnZWxpayBmaWx0cmUsIHJvemV0IGRhaGlsLiIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjI4OCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjMsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6NDk2Ljc0LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjQ5Ni43NCwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo4Ni4zOTk5OTk5OTk5OTk5OSwidG90YWxEaXJlY3RDb3N0IjoxNDMwNjEuMTIsInRvdGFsSXRlbUNvc3QiOjE0MzA2MS4xMiwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE2NTIzOTJmdTg0YiIsImNhdGVnb3J5IjoiTUVLIiwicHlwQ29kZSI6IjIxLUEwOTctRC1NRUstMDAxIiwicG96Tm8iOiIyNS4xMzguMTA0MyIsImRlc2NyaXB0aW9uIjoiMzA0IHBhc2xhbm1heiDDp2VsaWsgxLF6Z2FyYWzEsSwgZ8O2dmRlIHBsYXN0aWsgNTAgY20gw5g1MCDDp8Sxa8SxxZ9sxLEgbGluZWVyIHllciBzw7x6Z2VjaSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjQwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjAuNiwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0Ijo4NDYuNzksImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6ODQ2Ljc5LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjI0LCJ0b3RhbERpcmVjdENvc3QiOjMzODcxLjYsInRvdGFsSXRlbUNvc3QiOjMzODcxLjYsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNjUyMzkyMDduaWkiLCJjYXRlZ29yeSI6Ik1FSyIsInB5cENvZGUiOiIyMS1BMDk3LUQtTUVLLTAwMiIsInBvek5vIjoiMjUuMjQ1LjUzMDMiLCJkZXNjcmlwdGlvbiI6IiA5LTExIGHEn8SxemzEsSBrb2xla3TDtnIgZG9sYWLEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjMyLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEuMzIsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6Njc0Mi4wMSwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0Ijo2NzQyLjAxLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjQyLjI0LCJ0b3RhbERpcmVjdENvc3QiOjIxNTc0NC4zMiwidG90YWxJdGVtQ29zdCI6MjE1NzQ0LjMyLCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTY1MjM5Mmh4a3B2IiwiY2F0ZWdvcnkiOiJNRUsiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELU1FSy0wMDIiLCJwb3pObyI6IjI1LjMwNS44NDAxIiwiZGVzY3JpcHRpb24iOiIgUEUtWGIgT2tzaWplbiBCYXJpeWVybGkgQm9ydSAxNngyLDAgbW0gIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6Im0iLCJ0ZW5kZXJRdWFudGl0eSI6NjQwMCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjA2LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjcyLjI4LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjcyLjI4LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjM4NCwidG90YWxEaXJlY3RDb3N0Ijo0NjI1OTIsInRvdGFsSXRlbUNvc3QiOjQ2MjU5MiwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE2NTIzOTJ2dGo3NSIsImNhdGVnb3J5IjoiTUVLIiwicHlwQ29kZSI6IjIxLUEwOTctRC1NRUstMDAyIiwicG96Tm8iOiIyNS4yMjUuNDAwNCIsImRlc2NyaXB0aW9uIjoiIEVrc2VubGVyIGFyYXPEsSBtZXNhZmUgKG1tKTogNDAwLTUwMCBZw7xrc2VrbGlrIChtbSk6IDgwMCwgQmFueW8gVGlwaSBIYXZsdXBhbiBBbMO8bWlueXVtIFJhZHlhdMO2cmxlciIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjQwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEuMywiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjozNzM0LjgxLCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjM3MzQuODEsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6NTIsInRvdGFsRGlyZWN0Q29zdCI6MTQ5MzkyLjQsInRvdGFsSXRlbUNvc3QiOjE0OTM5Mi40LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTY1MjM5MmlpMXF1IiwiY2F0ZWdvcnkiOiJNRUsiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELU1FSy0wMDIiLCJwb3pObyI6IjI1LjIzMC4xNDAxIiwiZGVzY3JpcHRpb24iOiIgMTUgw5ggbW0gKDEvMlwiKSwgS8O2xZ9lIHRpcGkgdGVybW9zdGF0bMSxIHJhZHlhdMO2ciBtdXNsdWtsYXLEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjMyMCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjUsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6ODc4LjUxLCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjg3OC41MSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoxNjAsInRvdGFsRGlyZWN0Q29zdCI6MjgxMTIzLjIsInRvdGFsSXRlbUNvc3QiOjI4MTEyMy4yLCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTY1MjM5MjZvdHAyIiwiY2F0ZWdvcnkiOiJNRUsiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELU1FSy0wMDIiLCJwb3pObyI6IjI1LjIxMi4xMTAzIiwiZGVzY3JpcHRpb24iOiJNaW4gMjguMDAwIGtjYWwvaCdsaWsgSGVybWV0aWssIEVsZWt0cm9uaWssIFlPxJ5VxZ5NQUxJIEtPTULEsCwgRE/EnkFMR0FaIFZFIExQRyBZQUtJVExJLCBHQVpNRVIgT05BWUxJIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6MzIsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MTQsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6NTk2NTQuNTQsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6NTk2NTQuNTQsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6NDQ4LCJ0b3RhbERpcmVjdENvc3QiOjE5MDg5NDUuMjgsInRvdGFsSXRlbUNvc3QiOjE5MDg5NDUuMjgsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNjUyMzkydG1rcXkiLCJjYXRlZ29yeSI6Ik1FSyIsInB5cENvZGUiOiIyMS1BMDk3LUQtTUVLLTAwMiIsInBvek5vIjoiMjUuMzAwLjExMDQgIiwiZGVzY3JpcHRpb24iOiJEaWtpxZ9saSBzaXlhaCBib3J1ICgxIDEvNFwiKSAoTW9udGFqIG1hbHplbWVzaSBiZWRlbGkgaGFyacOnKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtIiwidGVuZGVyUXVhbnRpdHkiOjMwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjAuOSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0Ijo3MDkuOTMsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6NzA5LjkzLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjI3LCJ0b3RhbERpcmVjdENvc3QiOjIxMjk3Ljg5OTk5OTk5OTk5OCwidG90YWxJdGVtQ29zdCI6MjEyOTcuODk5OTk5OTk5OTk4LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTY1MjM5MmdnbWEzIiwiY2F0ZWdvcnkiOiJNRUsiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELU1FSy0wMDIiLCJwb3pObyI6IjI1LjMyMC4zMzAxIiwiZGVzY3JpcHRpb24iOiI2NSDDmCBtbSwgRG/En2FsZ2F6IEvDvHJlc2VsIFZhbmFsYXLEsSAoVFMgOTgwOSkiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoiYWRldCIsInRlbmRlclF1YW50aXR5IjoyLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEuNywiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoxMTQ3OC44OCwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoxMTQ3OC44OCwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjozLjQsInRvdGFsRGlyZWN0Q29zdCI6MjI5NTcuNzYsInRvdGFsSXRlbUNvc3QiOjIyOTU3Ljc2LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTY1MjM5Mnl1MGs4IiwiY2F0ZWdvcnkiOiJNRUsiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELU1FSy0wMDIiLCJwb3pObyI6IjM1LjQyMC4yMTUwIiwiZGVzY3JpcHRpb24iOiIgRGVwcmVtIGhhcmVrZXRpbmkgYWxnxLFsYXlhbiBvdG9tYXRpayBnYXogdmUgZW5lcmppIGtlc21lIGNpaGF6xLEiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoiYWRldCIsInRlbmRlclF1YW50aXR5IjoyLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjQuNSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoxMjA2My42NiwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoxMjA2My42NiwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo5LCJ0b3RhbERpcmVjdENvc3QiOjI0MTI3LjMyLCJ0b3RhbEl0ZW1Db3N0IjoyNDEyNy4zMiwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE2NTIzOTIybzR2aCIsImNhdGVnb3J5IjoiTUVLIiwicHlwQ29kZSI6IjIxLUEwOTctRC1NRUstMDAyIiwicG96Tm8iOiIyNS4xODIuMjIwMyIsImRlc2NyaXB0aW9uIjoiU2VsZW5vaWQgdmFuYSwgYW5tYSDDp2FwxLEgNTAgbW0iLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoiYWRldCIsInRlbmRlclF1YW50aXR5IjoyLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjIsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6NTU5MC4xOSwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0Ijo1NTkwLjE5LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjQsInRvdGFsRGlyZWN0Q29zdCI6MTExODAuMzgsInRvdGFsSXRlbUNvc3QiOjExMTgwLjM4LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTY1MjM5MjMxOXZuIiwiY2F0ZWdvcnkiOiJNRUsiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELU1FSy0wMDIiLCJwb3pObyI6IjI1LjMwMC4xNDExIiwiZGVzY3JpcHRpb24iOiJEaWtpxZ9saSBnYWx2YW5pemxpIGJvcnUgKDZcIikiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibSIsInRlbmRlclF1YW50aXR5IjozMCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjoxLjYsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MjIzMy44NiwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoyMjMzLjg2LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjQ4LCJ0b3RhbERpcmVjdENvc3QiOjY3MDE1LjgsInRvdGFsSXRlbUNvc3QiOjY3MDE1LjgsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNjUyMzkycW5kaWYiLCJjYXRlZ29yeSI6Ik1FSyIsInB5cENvZGUiOiIyMS1BMDk3LUQtTUVLLTAwMiIsInBvek5vIjoiMjUuNzI1LjExMDQiLCJkZXNjcmlwdGlvbiI6IkROIDUwLCBZaXZsaSBTZXJ0IEJvcnUgQmHEn2xhbnTEsSBLZWxlcMOnZXNpIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6MjAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC4yNSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0Ijo3MjMuMTYsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6NzIzLjE2LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjUsInRvdGFsRGlyZWN0Q29zdCI6MTQ0NjMuMTk5OTk5OTk5OTk5LCJ0b3RhbEl0ZW1Db3N0IjoxNDQ2My4xOTk5OTk5OTk5OTksImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNjUyMzkyMGRiMzYiLCJjYXRlZ29yeSI6Ik1FSyIsInB5cENvZGUiOiIyMS1BMDk3LUQtTUVLLTAwMiIsInBvek5vIjoiXG4yNS4zNjUuMTEwMSIsImRlc2NyaXB0aW9uIjoiQm9ydSBib3lhbm1hc8SxLCBzw7xseWVuIGJveWEgaWxlIOKGkiAxNSDDmCBtbS4g4oCTIDUwIMOYIG1tLiAoMS8yXCIgLSAyXCIpIGFyYXPEsSAoMlwiKSBkYWhpbCIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtIiwidGVuZGVyUXVhbnRpdHkiOjMwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjAuMTMsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6OTMuNDksImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6OTMuNDksImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6My45MDAwMDAwMDAwMDAwMDA0LCJ0b3RhbERpcmVjdENvc3QiOjI4MDQuNywidG90YWxJdGVtQ29zdCI6MjgwNC43LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTY1MjM5MnBkdWI3IiwiY2F0ZWdvcnkiOiJNRUsiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELU1FSy0wMDIiLCJwb3pObyI6IjI1LjcwMC4xMjAxIiwiZGVzY3JpcHRpb24iOiJIb3J0dW0gw4dhcMSxIEROIDI1IEhvcnR1bSBVenVubHXEn3UgMjAgbSwgVMO8cGzDvCBNb2RlbCBZYW5nxLFuIERvbGFwbGFyxLEsIFRTLiBFTiA2NzEtMSBOT1JNTEFSSU5EQSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjE2LCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEwLCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjE0Njc2LjM2LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjE0Njc2LjM2LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjE2MCwidG90YWxEaXJlY3RDb3N0IjoyMzQ4MjEuNzYsInRvdGFsSXRlbUNvc3QiOjIzNDgyMS43NiwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE2NTIzOTJoNXd0ZSIsImNhdGVnb3J5IjoiTUVLIiwicHlwQ29kZSI6IjIxLUEwOTctRC1NRUstMDAyIiwicG96Tm8iOiIyNS43MTUuMzEwMSAiLCJkZXNjcmlwdGlvbiI6IkROIDQwLCDEsHpsZW5lYmlsaXIgRmxhbsWfIEFyYXPEsSBTxLFrxLHFn3TEsXJtYWzEsSBLZWxlYmVrIFZhbmEiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoiYWRldCIsInRlbmRlclF1YW50aXR5IjoyLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEwLCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjE1ODI3LjE5LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjE1ODI3LjE5LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjIwLCJ0b3RhbERpcmVjdENvc3QiOjMxNjU0LjM4LCJ0b3RhbEl0ZW1Db3N0IjozMTY1NC4zOCwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE2NTIzOTJuOHR5ZiIsImNhdGVnb3J5IjoiTUVLIiwicHlwQ29kZSI6IjIxLUEwOTctRC1NRUstMDAyIiwicG96Tm8iOiIyNS43MTIuMjAwMiIsImRlc2NyaXB0aW9uIjoiIEROIDY1LCDEsHRmYWl5ZSBLYXQgQmHEn2xhbnTEsSBWYW5hc8SxIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6MiwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjoxLjUsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6NTk3NS4zMywibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0Ijo1OTc1LjMzLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjMsInRvdGFsRGlyZWN0Q29zdCI6MTE5NTAuNjYsInRvdGFsSXRlbUNvc3QiOjExOTUwLjY2LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTY1MjM5MjB1YnZlIiwiY2F0ZWdvcnkiOiJNRUsiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELU1FSy0wMDIiLCJwb3pObyI6IjI1LjcyMC4xMTAxIiwiZGVzY3JpcHRpb24iOiJBbm1hIERlYmlzaSAxMiBtwrMvaCwgQW5tYSBCYXNtYSBZw7xrc2VrbGnEn2kgNjAgbVNTLCBZYXRheSBIYXQgVGlwaSBZYW5nxLFuIFBvbXBhc8SxLCBFbGVrdHJpayBNb3Rvcmx1IiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6MSwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjozOCwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoxMjMwMDMuMjYsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MTIzMDAzLjI2LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjM4LCJ0b3RhbERpcmVjdENvc3QiOjEyMzAwMy4yNiwidG90YWxJdGVtQ29zdCI6MTIzMDAzLjI2LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTY1MjM5MmFkdDJoIiwiY2F0ZWdvcnkiOiJNRUsiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELU1FSy0wMDMiLCJwb3pObyI6IjI1LjQ5MC44MTAxIiwiZGVzY3JpcHRpb24iOiJCYWvEsXIgQm9ydSBHcnVidSAxLzQgXCIgMCw4IG1tICgxMyBtbSDEsHpvKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtIiwidGVuZGVyUXVhbnRpdHkiOjMyMCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjM3NSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0Ijo2MDEuNDksImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6NjAxLjQ5LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjEyMCwidG90YWxEaXJlY3RDb3N0IjoxOTI0NzYuOCwidG90YWxJdGVtQ29zdCI6MTkyNDc2LjgsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNjUyMzkycWY5MWgiLCJjYXRlZ29yeSI6Ik1FSyIsInB5cENvZGUiOiIyMS1BMDk3LUQtTUVLLTAwMyIsInBvek5vIjoiMjUuNDAwLjUwMTIiLCJkZXNjcmlwdGlvbiI6IigzLzRcIikgMjggw5ggbW0gMTMgbW0sIEthdcOndWsgZXNhc2zEsSBwcmVmYWJyaWsgYm9ydSBpbGUgc2/En3VrIGhhdCB5YWzEsXTEsW3EsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtIiwidGVuZGVyUXVhbnRpdHkiOjMyMCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjA5LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjg5LjU1LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjg5LjU1LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjI4Ljc5OTk5OTk5OTk5OTk5NywidG90YWxEaXJlY3RDb3N0IjoyODY1NiwidG90YWxJdGVtQ29zdCI6Mjg2NTYsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNjUyMzkyenE3emQiLCJjYXRlZ29yeSI6Ik1FSyIsInB5cENvZGUiOiIyMS1BMDk3LUQtTUVLLTAwMyIsInBvek5vIjoiMzUuMTQwLjI1MDgiLCJkZXNjcmlwdGlvbiI6IjN4Miw1IG1twrIgTlZWIChOWU0pIHRpcGkga3VyxZ91bnN1eiBQVkMgaXpvbGVsaSBrYWJsb2xhciBpbGUgYmVzbGVtZSBoYXR0xLEgdGVzaXNpOiIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtIiwidGVuZGVyUXVhbnRpdHkiOjMyMCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjIxLCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjE5Ny44NywibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoxOTcuODcsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6NjcuMiwidG90YWxEaXJlY3RDb3N0Ijo2MzMxOC40LCJ0b3RhbEl0ZW1Db3N0Ijo2MzMxOC40LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxMTY1MjM5MjJ3M2V1IiwiY2F0ZWdvcnkiOiJNRUsiLCJweXBDb2RlIjoiMjEtQTA5Ny1ELU1FSy0wMDMiLCJwb3pObyI6IjI1LjMwNS4xMTAzIiwiZGVzY3JpcHRpb24iOiJTZXJ0IFBWQyBpw6dtZSBzdSBib3J1c3UgKHlhcMSxxZ90xLFybWEgbXVmbHUsIMOnYXA6IDMyIG1tLCAxMCBhdMO8KSAoTW9udGFqIG1hbHplbWVzaSBiZWRlbGkgaGFyacOnKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtIiwidGVuZGVyUXVhbnRpdHkiOjMyMCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjE1LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjEzMi45LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjEzMi45LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjQ4LCJ0b3RhbERpcmVjdENvc3QiOjQyNTI4LCJ0b3RhbEl0ZW1Db3N0Ijo0MjUyOCwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE2NTIzOTJocTR2diIsImNhdGVnb3J5IjoiTUVLIiwicHlwQ29kZSI6IjIxLUEwOTctRC1NRUstMDAzIiwicG96Tm8iOiJLVEIuOTguMDAxNiIsImRlc2NyaXB0aW9uIjoiIEtsaW1hIERyZW5haiBQb21wYXPEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjMyLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjIuMDQsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MTY1MjkuNzIsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MTY1MjkuNzIsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6NjUuMjgsInRvdGFsRGlyZWN0Q29zdCI6NTI4OTUxLjA0LCJ0b3RhbEl0ZW1Db3N0Ijo1Mjg5NTEuMDQsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNjUyMzkyMG1mem4iLCJjYXRlZ29yeSI6Ik1FSyIsInB5cENvZGUiOiIyMS1BMDk3LUQtTUVLLTAwMyIsInBvek5vIjoiMjUuNDUwLjMxMDEiLCJkZXNjcmlwdGlvbiI6IiA1LjAwMCBtwrMvaCd5YSBrYWRhciwgQWtzaXlhbCB2YW50aWxhdMO2ciwgMS41MDAgZGV2aXIvZGFraWthJ3lhIGthZGFyIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6NCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjoxMSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0Ijo0MzkwOC4zOSwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0Ijo0MzkwOC4zOSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo0NCwidG90YWxEaXJlY3RDb3N0IjoxNzU2MzMuNTYsInRvdGFsSXRlbUNvc3QiOjE3NTYzMy41NiwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTE2NTIzOTIzNDZsYyIsImNhdGVnb3J5IjoiTUVLIiwicHlwQ29kZSI6IjIxLUEwOTctRC1NRUstMDAzIiwicG96Tm8iOiIyNS40NzUuMTMwMSIsImRlc2NyaXB0aW9uIjoiU2FiaXQga2FuYXRsxLEgbWVuZmV6IDUwMCBjbSd5ZSBrYWRhciIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjQwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MTAwMC43NCwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoxMDAwLjc0LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjQwLCJ0b3RhbERpcmVjdENvc3QiOjQwMDI5LjYsInRvdGFsSXRlbUNvc3QiOjQwMDI5LjYsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDExNjUyMzkyOXYybzEiLCJjYXRlZ29yeSI6Ik1FSyIsInB5cENvZGUiOiIyMS1BMDk3LUQtTUVLLTAwMyIsInBvek5vIjoiMjUuNDcwLjEyMDEiLCJkZXNjcmlwdGlvbiI6IsOYPTE2MCBtbSd5ZSBrYWRhciAwLDUwIG1tLCBLZW5ldGxpIHNwaXJhbCB5b2x1eWxhLCBnYWx2YW5pemxpIHNhY2RhbiBzaWxpbmRpcmlrIGhhdmEga2FuYWzEsSB5YXDEsWxtYXPEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtMiIsInRlbmRlclF1YW50aXR5IjoxMDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6Mi41LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjIxMjQuOSwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoyMTI0LjksImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6MjUwLCJ0b3RhbERpcmVjdENvc3QiOjIxMjQ5MCwidG90YWxJdGVtQ29zdCI6MjEyNDkwLCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxNTQ0MDkxMzcxendhIiwiY2F0ZWdvcnkiOiJFTEsiLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMzUuNzUwLjMwMDIgIiwiZGVzY3JpcHRpb24iOiIgMzB4Myw1IG1tIGViYWTEsW5kYSDFn2FydG5hbWVzaW5lIHV5Z3VuLCBtaW4gNzBsaSDDp2lua28gaWxlIGthcGxhbm3EscWfIGdhbHZhbml6bGkgw6dlbGlrIGxhbWEiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibSIsInRlbmRlclF1YW50aXR5IjoxNDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC4yOCwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjozMDcuOTIsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MzA3LjkyLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjM5LjIsInRvdGFsRGlyZWN0Q29zdCI6NDMxMDguOCwidG90YWxJdGVtQ29zdCI6NDMxMDguOCwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTU0NDA5MTN2eHY2dSIsImNhdGVnb3J5IjoiRUxLIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjM1Ljc1MC40MDAyICIsImRlc2NyaXB0aW9uIjoiVG9wcmFrIGVsZWt0cm9kdSAow6d1YnVrKSBlbGVrdHJvbGl0aWsgYmFrxLFyOiAow5Zsw6fDvDogbSkiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibSIsInRlbmRlclF1YW50aXR5Ijo4LCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEuNSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0Ijo0NDAxLjAzLCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjQ0MDEuMDMsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6MTIsInRvdGFsRGlyZWN0Q29zdCI6MzUyMDguMjQsInRvdGFsSXRlbUNvc3QiOjM1MjA4LjI0LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxNTQ0MDkxM3MyODJiIiwiY2F0ZWdvcnkiOiJFTEsiLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMzUuMTAwLjcwMDAiLCJkZXNjcmlwdGlvbiI6IiBEw7Zrw7xtIGt1dHUgacOnaW5lIHZlIHBhbm9sYXJhIGtvbnVsYWNhayBUU0UgxZ9hcnRsYXLEsW5hIHV5Z3VuIGJha8SxciBiYXJhIHRlbWluIHZlIG1vbnRhasSxIHZlIFRTIEVOIDYwNDQ1J2Rla2kgcmVua2xlcmUgYm95YW5tYXPEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJrZyIsInRlbmRlclF1YW50aXR5Ijo0LCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEuMjUsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MTYyNS4wNCwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoxNjI1LjA0LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjUsInRvdGFsRGlyZWN0Q29zdCI6NjUwMC4xNiwidG90YWxJdGVtQ29zdCI6NjUwMC4xNiwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTU0NDA5MTM5OHI4YSIsImNhdGVnb3J5IjoiRUxLIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjM1Ljc1MC4xMTAwICIsImRlc2NyaXB0aW9uIjoiTWFkZW5pIHlha2FsYW1hIHVjdSwgWUlMRElSSU1EQU4gS09SVU5NQSBURVPEsFNBVEkiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoiYWRldCIsInRlbmRlclF1YW50aXR5IjoyLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjYsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6NzE2My4zMywibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0Ijo3MTYzLjMzLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjEyLCJ0b3RhbERpcmVjdENvc3QiOjE0MzI2LjY2LCJ0b3RhbEl0ZW1Db3N0IjoxNDMyNi42NiwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTU0NDA5MTNzeDlrbCIsImNhdGVnb3J5IjoiRUxLIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjQwLjEyNi4xMTY2IiwiZGVzY3JpcHRpb24iOiLDh2FwxLEgMTYwMCBtbSwgbXVmbHUgYmV0b25hcm1lIGJvcnUgKFPDvGxmYXRhIGRheWFuxLFrbMSxIMOnaW1lbnRvZGFuIHlhcMSxbG3EscWfLCBkb25hdMSxIGJlZGVsaSBoYXJpw6cpIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6Im0iLCJ0ZW5kZXJRdWFudGl0eSI6MjAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6My4wMTQsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MTA5NDIuMDYsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MTA5NDIuMDYsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6NjAuMjc5OTk5OTk5OTk5OTk0LCJ0b3RhbERpcmVjdENvc3QiOjIxODg0MS4xOTk5OTk5OTk5OCwidG90YWxJdGVtQ29zdCI6MjE4ODQxLjE5OTk5OTk5OTk4LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxNTQ0MDkxM3kyY3NkIiwiY2F0ZWdvcnkiOiJFTEsiLCJweXBDb2RlIjoiLSIsInBvek5vIjoiNDMuNTIzLjEwMTIiLCJkZXNjcmlwdGlvbiI6IkTEscWfIMOnYXDEsSAyMDAgbW0sIFBFMTAwIGJvcnUgZMO2xZ9lbm1lc2kgKEJvcnUgdmUgYmHFnyBiYcSfbGFtYSBiZWRlbGkgaGFyacOnKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtIiwidGVuZGVyUXVhbnRpdHkiOjEwMCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjUxNSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoxNTAuOSwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoxNTAuOSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo1MS41LCJ0b3RhbERpcmVjdENvc3QiOjE1MDkwLCJ0b3RhbEl0ZW1Db3N0IjoxNTA5MCwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTU0NDA5MTNnN2YzZyIsImNhdGVnb3J5IjoiRUxLIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjEwLjIwMC4zMDAzICIsImRlc2NyaXB0aW9uIjoiIDAsNSBtbSBzYWNkYW4gbWFtdWwgVFUyOCBwcm9maWxsaSBhbMOnxLEgbGV2aGFsYXIgacOnaW4gU8SxY2FrIGRhbGTEsXJtYSBnYWx2YW5pemxpIHNhYyBwcm9maWwgKFRTIDEyNzYxKSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtIiwidGVuZGVyUXVhbnRpdHkiOjE1MDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6Mi44LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjEzLjU0LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjEzLjU0LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjQyMDAsInRvdGFsRGlyZWN0Q29zdCI6MjAzMTAsInRvdGFsSXRlbUNvc3QiOjIwMzEwLCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxNTQ0MDkxM25zcHo1IiwiY2F0ZWdvcnkiOiJFTEsiLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMzUuMTQwLjMyMjQiLCJkZXNjcmlwdGlvbiI6IjR4MTAgbW3CsiwgMSBrViB5ZXJhbHTEsSBrYWJsb2xhcsSxIGlsZSBrb2xvbiB2ZSBiZXNsZW1lIGhhdHTEsSB0ZXNpc2kgWVZWIChOWVkpIChUUyBJRUMgNjA1MDItMStBMSkiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibSIsInRlbmRlclF1YW50aXR5IjoyMDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC4zMiwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0Ijo1MDkuMSwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0Ijo1MDkuMSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo2NCwidG90YWxEaXJlY3RDb3N0IjoxMDE4MjAsInRvdGFsSXRlbUNvc3QiOjEwMTgyMCwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTU0NDA5MTN6MWYwaSIsImNhdGVnb3J5IjoiRUxLIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjM1LjE1MC4xMTExIiwiZGVzY3JpcHRpb24iOiIyeDM1IG1twrIgUC4zNywgSEZGUiBib3J1IGnDp2luZGUgKEgwN1osIEgwN1oxKSBpbGV0a2VuaSBpbGUga29sb24gdmUgYmVzbGVtZSBoYXR0xLEgdGVzaXNpOiAow5Zsw6fDvDogbSkiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoibSIsInRlbmRlclF1YW50aXR5IjoxNTAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC42LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjkxOC45MiwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0Ijo5MTguOTIsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6OTAsInRvdGFsRGlyZWN0Q29zdCI6MTM3ODM4LCJ0b3RhbEl0ZW1Db3N0IjoxMzc4MzgsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDE1NDQwOTEza21jcGMiLCJjYXRlZ29yeSI6IkVMSyIsInB5cENvZGUiOiItIiwicG96Tm8iOiIzNS4xMDAuMTIwNiAiLCJkZXNjcmlwdGlvbiI6IkVuIMO2bMOnw7xzw7wgZW4gYXogOTAwIG1tIG9sYW4gZ2FsdmFuaXpsaSBkaWtpbGkgdGlwIHNhYyBwYW5vLCBEZXJpbmxpayBlbiBheiA2MDAgbW0gKDEuIHBhbm8pIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6MiwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjoxMywiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0Ijo2MDU5MS45LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjYwNTkxLjksImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6MjYsInRvdGFsRGlyZWN0Q29zdCI6MTIxMTgzLjgsInRvdGFsSXRlbUNvc3QiOjEyMTE4My44LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxNTQ0MDkxM2Z0N3R4IiwiY2F0ZWdvcnkiOiJFTEsiLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMzUuMTAwLjcxMDUiLCJkZXNjcmlwdGlvbiI6IjE2IE90b21hdGlrIHNpZ29ydGFsxLFrLCBIYWxvamVuc2l6IGFsZXYgZ2VjaWt0aXJpY2kgdGlwIHPEsXZhIMO8c3TDvCB0YWJsb2xhciIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjMyLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEuMjU0LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjE2NjEuNjgsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MTY2MS42OCwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo0MC4xMjgsInRvdGFsRGlyZWN0Q29zdCI6NTMxNzMuNzYsInRvdGFsSXRlbUNvc3QiOjUzMTczLjc2LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxNTQ0MDkxMzNrMnUxIiwiY2F0ZWdvcnkiOiJFTEsiLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMzUuMTI1LjMwMDEiLCJkZXNjcmlwdGlvbiI6IiAxIGtvbnRha2zEsSAxIE5BIDE2IEEtS3VtYW5kYSBnZXJpbGltaSAyMzAgViwgVXpha3RhbiBrdW1hbmRhIGRhcmJlIGFrxLFtIGFuYWh0YXLEsSB2ZSBtb250YWrEsSwgVXpha3RhbiBrdW1hbmRhIGRhcmJlIGFrxLFtIGFuYWh0YXLEsSB2ZSBtb250YWrEsSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjY0LCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjAuODUsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MTA4OC4zMywibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoxMDg4LjMzLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjU0LjQsInRvdGFsRGlyZWN0Q29zdCI6Njk2NTMuMTIsInRvdGFsSXRlbUNvc3QiOjY5NjUzLjEyLCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxNTQ0MDkxM2JwYXNkIiwiY2F0ZWdvcnkiOiJFTEsiLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMzUuMTE1LjEwNjAiLCJkZXNjcmlwdGlvbiI6IjR4MjUgQSdlIGthZGFyICgzMDAgbUEpLCBLYcOnYWsgYWvEsW0ga29ydW1hIMWfYWx0ZXJsZXJpIChUUyBFTiA2MTAwOC0xL1RTIEVOIDYxMDA4LTItMSkiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoiYWRldCIsInRlbmRlclF1YW50aXR5IjozNCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjoxLjcsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MjE3MC44OCwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoyMTcwLjg4LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjU3LjgsInRvdGFsRGlyZWN0Q29zdCI6NzM4MDkuOTIsInRvdGFsSXRlbUNvc3QiOjczODA5LjkyLCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxNTQ0MDkxMzYzNm1oIiwiY2F0ZWdvcnkiOiJFTEsiLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMzUuMTg1LjExMDAiLCJkZXNjcmlwdGlvbiI6IkFOQUhUQVJMQVI6ICjDlmzDp8O8OiBBZGV0KSBUUyBFTiA2MDY2OS0xJ2UsIHV5Z3VuIGVuIGF6IDI1MCBWIHZlIDYgQS5lIGRheWFuYWJpbGVjZWsga29udGFrbGFyxLEgdmUgdmlkYWzEsSBiYcSfbGFudMSxIHXDp2xhcsSxIGJ1bHVuYW4sIHlhbm1heWFuIG1hbHplbWVkZW4gZ8O2dmRlbGkgdmUga2FwYWtsxLEgbm9ybWFsIGFuYWh0YXIsIHRlbWluaSwgacWfeWVyaW5lIG5ha2xpLCBrYXNhc8SxIGhlciBuZXZpIHVmYWsgbWFsemVtZSB2ZSBpxZ/Dp2lsaWsgZGFoaSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjI1MCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjY1LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjQ4My41OCwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0Ijo0ODMuNTgsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6MTYyLjUsInRvdGFsRGlyZWN0Q29zdCI6MTIwODk1LCJ0b3RhbEl0ZW1Db3N0IjoxMjA4OTUsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDE1NDQwOTEza3RwMGMiLCJjYXRlZ29yeSI6IkVMSyIsInB5cENvZGUiOiItIiwicG96Tm8iOiIzNS4xOTAuMTcwMSIsImRlc2NyaXB0aW9uIjoiVG9wcmFrbMSxIHByaXogMTYgQS0yNTAgViAoNDV4NDUgbW0pLCBLYWJsbyBLYW5hbCBQcml6bGVyaSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjQwMCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjUsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6NDQyLjA1LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjQ0Mi4wNSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoyMDAsInRvdGFsRGlyZWN0Q29zdCI6MTc2ODIwLCJ0b3RhbEl0ZW1Db3N0IjoxNzY4MjAsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDE1NDQwOTEzM3djaWsiLCJjYXRlZ29yeSI6IkVMSyIsInB5cENvZGUiOiItIiwicG96Tm8iOiIzNS4xNzAuMTc1MSIsImRlc2NyaXB0aW9uIjoiTEVEIGdsb3AgYXJtYXTDvHIgKHBvbGlrYXJib24gZ8O2dmRlbGkpIMSxxZ/EsWsgYWvEsXPEsSBlbiBheiAxODAwIGxtLCBhcm1hdMO8ciDEscWfxLFrc2FsIHZlcmltaSBlbiBheiAxMjAgbG0vdyAoZW4gYXogSVAgNDAga29ydW1hIGRlcmVjZXNpbmUgc2FoaXAgb2xhbikuIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6NjAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC43NywiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoxNjg3LjQ5LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjE2ODcuNDksImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6NDYuMiwidG90YWxEaXJlY3RDb3N0IjoxMDEyNDkuNCwidG90YWxJdGVtQ29zdCI6MTAxMjQ5LjQsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDE1NDQwOTEzMXVnY2EiLCJjYXRlZ29yeSI6IkVMSyIsInB5cENvZGUiOiItIiwicG96Tm8iOiIzNS40NDAuMjEwMiAiLCJkZXNjcmlwdGlvbiI6IjMgc2FhdCBzw7xyZWxpIHRlayB5w7x6bMO8LCBrZXNpbnRpZGUgeWFuYW4gYWNpbCBkdXJ1bSB5w7ZubGVuZGlybWUgYXJtYXTDvHLDvCAoTGVkbGkpIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6MjAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MS4yNSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoyNzM2Ljg4LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjI3MzYuODgsImNvbnRyYWN0TWF0ZXJpYWxDb3N0IjowLCJjb250cmFjdExhYm9yQ29zdCI6MCwiY29udHJhY3RVbml0UHJpY2UiOjAsInRvdGFsTWFuSG91ciI6MjUsInRvdGFsRGlyZWN0Q29zdCI6NTQ3MzcuNjAwMDAwMDAwMDA2LCJ0b3RhbEl0ZW1Db3N0Ijo1NDczNy42MDAwMDAwMDAwMDYsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDE1NDQwOTEzc3VlMjUiLCJjYXRlZ29yeSI6IkVMSyIsInB5cENvZGUiOiItIiwicG96Tm8iOiIzNS40OTEuMTIwNiIsImRlc2NyaXB0aW9uIjoiRG9rdW5tYXRpayBla3JhbmzEsSBkaWppdGFsIHppbCBwYW5lbGksIGthcnQgb2t1eXVjdWx1LCBlbiBheiA3XCIgcmVua2xpIGVrcmFuIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6MiwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjoxLjI1LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjE3OTU0LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjE3OTU0LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjIuNSwidG90YWxEaXJlY3RDb3N0IjozNTkwOCwidG90YWxJdGVtQ29zdCI6MzU5MDgsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDE1NDQwOTEzZTRrMWQiLCJjYXRlZ29yeSI6IkVMSyIsInB5cENvZGUiOiItIiwicG96Tm8iOiIzNS40OTEuMTEwOCIsImRlc2NyaXB0aW9uIjoiIDdcIiBnw7Zyw7xudMO8bMO8IGRpYWZvbiAoZW4gYXogODAweDQ4MCksIGRva3VubWF0aWsgZWtyYW5sxLEiLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoiYWRldCIsInRlbmRlclF1YW50aXR5IjozMiwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjoyLjI1LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjkwNzYuNTgsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6OTA3Ni41OCwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo3MiwidG90YWxEaXJlY3RDb3N0IjoyOTA0NTAuNTYsInRvdGFsSXRlbUNvc3QiOjI5MDQ1MC41NiwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTU0NDA5MTM2c2EwNSIsImNhdGVnb3J5IjoiRUxLIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjM1LjQ4MS4xMjEwIiwiZGVzY3JpcHRpb24iOiJFbiBheiA5MCBjbSBvZnNldCDDp2FuYWsgYW50ZW4iLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoiYWRldCIsInRlbmRlclF1YW50aXR5IjoyLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjUsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6Mzg4OS40MywibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjozODg5LjQzLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjEwLCJ0b3RhbERpcmVjdENvc3QiOjc3NzguODYsInRvdGFsSXRlbUNvc3QiOjc3NzguODYsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDE1NDQwOTEzd2k0ZXIiLCJjYXRlZ29yeSI6IkVMSyIsInB5cENvZGUiOiItIiwicG96Tm8iOiIzNS40ODEuMTM1MCIsImRlc2NyaXB0aW9uIjoiOCDDp8Sxa8SxxZ9sxLEgKG9jdG8pIExOQiIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjQsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC41LCJhY3R1YWxNYW5Ib3VyIjowLCJtYXRlcmlhbENvc3QiOjE5MzUuMjcsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MTkzNS4yNywiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoyLCJ0b3RhbERpcmVjdENvc3QiOjc3NDEuMDgsInRvdGFsSXRlbUNvc3QiOjc3NDEuMDgsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDE1NDQwOTEzOGF1ZmkiLCJjYXRlZ29yeSI6IkVMSyIsInB5cENvZGUiOiItIiwicG96Tm8iOiIzNS40ODEuMTE2NiIsImRlc2NyaXB0aW9uIjoiMTAvNDggbXVsdGlzd2l0Y2giLCJweXBEZXNjMSI6IiIsInB5cERlc2MyIjoiIiwicHlwRGVzYzMiOiIiLCJzY29wZSI6IiIsIm1hdGVyaWFsRGV0YWlsIjoiIiwidGVuZGVyUGFja2FnZSI6IiIsImNvbXBhbnkiOiIiLCJ1bml0IjoiYWRldCIsInRlbmRlclF1YW50aXR5IjoyLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjYuNSwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoxNjA0MS43NCwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoxNjA0MS43NCwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoxMywidG90YWxEaXJlY3RDb3N0IjozMjA4My40OCwidG90YWxJdGVtQ29zdCI6MzIwODMuNDgsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDE1NDQwOTEzbDBiaHkiLCJjYXRlZ29yeSI6IkVMSyIsInB5cENvZGUiOiItIiwicG96Tm8iOiIzNS41MDUuMTAyMiIsImRlc2NyaXB0aW9uIjoiUkcgNi9VLTZBIDc1LCBLb2Frc2l5YWwgS2FibG9sYXIsIFRTRUsgQmVsZ2VsaSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtIiwidGVuZGVyUXVhbnRpdHkiOjE1MDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC4xMiwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoxMzEuMjQsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MTMxLjI0LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjE4MCwidG90YWxEaXJlY3RDb3N0IjoxOTY4NjAsInRvdGFsSXRlbUNvc3QiOjE5Njg2MCwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTU0NDA5MTMwdTdmZyIsImNhdGVnb3J5IjoiRUxLIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjM1LjUwNS4yMDMwIiwiZGVzY3JpcHRpb24iOiIgVXRwIENhdCA2IEthYmxvLCBCQUtJUiBEQVRBIEtBQkxPTEFSSSIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJtIiwidGVuZGVyUXVhbnRpdHkiOjE1MDAsInByb2Nlc3NlZFF1YW50aXR5IjowLCJ1bml0TWFuSG91ciI6MC4xNiwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoxMzAuMzMsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MCwidG90YWxVbml0Q29zdCI6MTMwLjMzLCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjI0MCwidG90YWxEaXJlY3RDb3N0IjoxOTU0OTUuMDAwMDAwMDAwMDMsInRvdGFsSXRlbUNvc3QiOjE5NTQ5NS4wMDAwMDAwMDAwMywiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTU0NDA5MTNkdXk2MCIsImNhdGVnb3J5IjoiRUxLIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjM1LjE5MC4xNzA0ICIsImRlc2NyaXB0aW9uIjoiRGF0YSBwcml6aSBDQVQgNWUgdmV5YSBDQVQgNmUgUkotNDUgKDgga29udGFrbMSxKSAoMjIsNXg0NSBtbSksIEthYmxvIEthbmFsIFByaXpsZXJpIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6MTUwMCwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjowLjUsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6NTMwLjM5LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjUzMC4zOSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo3NTAsInRvdGFsRGlyZWN0Q29zdCI6Nzk1NTg1LCJ0b3RhbEl0ZW1Db3N0Ijo3OTU1ODUsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiIxNzg0MDE1NDQwOTEzMXI0MGsiLCJjYXRlZ29yeSI6IkVMSyIsInB5cENvZGUiOiItIiwicG96Tm8iOiIzNS40MTAuMjAyMCIsImRlc2NyaXB0aW9uIjoiQWRyZXNsaSBvcHRpayBkdW1hbiBkZWRla3TDtnLDvCIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjUwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEuMjUsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6MjMzNC41LCJsYWJvckNvc3QiOjAsImVxdWlwbWVudENvc3QiOjAsInRvdGFsVW5pdENvc3QiOjIzMzQuNSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjo2Mi41LCJ0b3RhbERpcmVjdENvc3QiOjExNjcyNSwidG90YWxJdGVtQ29zdCI6MTE2NzI1LCJjb250cmFjdFRvdGFsQ29zdCI6MCwicmVhbGl6ZWRDb3N0IjowfSx7ImlkIjoiMTc4NDAxNTQ0MDkxMzY4aGJwIiwiY2F0ZWdvcnkiOiJFTEsiLCJweXBDb2RlIjoiLSIsInBvek5vIjoiMzUuNDEwLjI1NjAgIiwiZGVzY3JpcHRpb24iOiJBZHJlc2xpIGvEsXNhIGRldnJlIGl6b2xhdMO2cmzDvCBzxLFmxLFybGFuYWJpbGlyIChyZXNldGxlbmViaWxpcikgeWFuZ8SxbiBpaGJhciBidXRvbnUgKMOWbMOnw7w6IEFkZXQpOiIsInB5cERlc2MxIjoiIiwicHlwRGVzYzIiOiIiLCJweXBEZXNjMyI6IiIsInNjb3BlIjoiIiwibWF0ZXJpYWxEZXRhaWwiOiIiLCJ0ZW5kZXJQYWNrYWdlIjoiIiwiY29tcGFueSI6IiIsInVuaXQiOiJhZGV0IiwidGVuZGVyUXVhbnRpdHkiOjEwLCJwcm9jZXNzZWRRdWFudGl0eSI6MCwidW5pdE1hbkhvdXIiOjEuMjUsImFjdHVhbE1hbkhvdXIiOjAsIm1hdGVyaWFsQ29zdCI6NTM5Mi4wNCwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0Ijo1MzkyLjA0LCJjb250cmFjdE1hdGVyaWFsQ29zdCI6MCwiY29udHJhY3RMYWJvckNvc3QiOjAsImNvbnRyYWN0VW5pdFByaWNlIjowLCJ0b3RhbE1hbkhvdXIiOjEyLjUsInRvdGFsRGlyZWN0Q29zdCI6NTM5MjAuNCwidG90YWxJdGVtQ29zdCI6NTM5MjAuNCwiY29udHJhY3RUb3RhbENvc3QiOjAsInJlYWxpemVkQ29zdCI6MH0seyJpZCI6IjE3ODQwMTU0NDA5MTNxOTljbCIsImNhdGVnb3J5IjoiRUxLIiwicHlwQ29kZSI6Ii0iLCJwb3pObyI6IjM1LjQxNS4xMzAwIiwiZGVzY3JpcHRpb24iOiJLb252YW5zaXlvbmVsIHRla3JhcmxhecSxY8SxIHlhbmfEsW4gaWhiYXIgcGFuZWxpIiwicHlwRGVzYzEiOiIiLCJweXBEZXNjMiI6IiIsInB5cERlc2MzIjoiIiwic2NvcGUiOiIiLCJtYXRlcmlhbERldGFpbCI6IiIsInRlbmRlclBhY2thZ2UiOiIiLCJjb21wYW55IjoiIiwidW5pdCI6ImFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6MiwicHJvY2Vzc2VkUXVhbnRpdHkiOjAsInVuaXRNYW5Ib3VyIjoxMiwiYWN0dWFsTWFuSG91ciI6MCwibWF0ZXJpYWxDb3N0IjoyNzQzNy45MSwibGFib3JDb3N0IjowLCJlcXVpcG1lbnRDb3N0IjowLCJ0b3RhbFVuaXRDb3N0IjoyNzQzNy45MSwiY29udHJhY3RNYXRlcmlhbENvc3QiOjAsImNvbnRyYWN0TGFib3JDb3N0IjowLCJjb250cmFjdFVuaXRQcmljZSI6MCwidG90YWxNYW5Ib3VyIjoyNCwidG90YWxEaXJlY3RDb3N0Ijo1NDg3NS44MiwidG90YWxJdGVtQ29zdCI6NTQ4NzUuODIsImNvbnRyYWN0VG90YWxDb3N0IjowLCJyZWFsaXplZENvc3QiOjB9LHsiaWQiOiJtZWtfcmFkXzE3ODQwMTc4NjUwNjgiLCJjYXRlZ29yeSI6Ik1la2FuaWsgVGVzaXNhdCDEsMWfbGVyaSIsInB5cENvZGUiOiJNRUstRUtTIiwicHlwRGVzYzEiOiJJc8SxdG1hIFRlc2lzYXTEsSIsInBvek5vIjoiWUVOSS1SQUQtMDEiLCJkZXNjcmlwdGlvbiI6IlBLS1AgVGlwIFBhbmVsIFJhZHlhdMO2ciAoT2RhIHZlIFNhbG9ubGFyIMSww6dpbikiLCJ1bml0IjoibXQiLCJ0ZW5kZXJRdWFudGl0eSI6MzIwLCJ1bml0TWFuSG91ciI6MC41LCJtYXRlcmlhbENvc3QiOjAsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MH0seyJpZCI6Im1la19zcHJfMTc4NDAxNzg2NTA2OCIsImNhdGVnb3J5IjoiTWVrYW5payBUZXNpc2F0IMSwxZ9sZXJpIiwicHlwQ29kZSI6Ik1FSy1FS1MiLCJweXBEZXNjMSI6IllhbmfEsW4gVGVzaXNhdMSxIiwicG96Tm8iOiJZRU5JLVNQUi0wMSIsImRlc2NyaXB0aW9uIjoiWWFuZ8SxbiBTcHJpbmtsZXIgQmHFn2zEscSfxLEgKFRhdmFuIFRpcGkgSMSxemzEsSBUZXBraW1lbGkpIiwidW5pdCI6IkFkZXQiLCJ0ZW5kZXJRdWFudGl0eSI6MTYwLCJ1bml0TWFuSG91ciI6MC4yLCJtYXRlcmlhbENvc3QiOjAsImxhYm9yQ29zdCI6MCwiZXF1aXBtZW50Q29zdCI6MH1dfQ==";

