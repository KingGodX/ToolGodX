document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const inputText = document.getElementById('inputText');
    const lineCountDisplay = document.getElementById('lineCount');
    const splitBtn = document.getElementById('splitBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultsArea = document.getElementById('resultsArea');
    const dropZone = document.getElementById('dropZone');

    // Drag & Drop Logic
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
    });

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            handleFiles(files);
        }
    }

    function handleFiles(files) {
        if (files.length === 0) return;

        let processedCount = 0;
        let combinedText = "";

        // Iterate through all files
        Array.from(files).forEach(file => {
            const reader = new FileReader();

            reader.onload = function (e) {
                let textContent = "";

                // Handle Excel Files
                if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    // Get first sheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    // Convert to CSV format to reuse existing parser
                    textContent = XLSX.utils.sheet_to_csv(worksheet);
                }
                // Handle Text/CSV Files
                else if (file.type.match('text.*') || file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
                    textContent = e.target.result; // Text content is directly available here if readAsText used
                    // Wait, readAsArrayBuffer is used for Excel, readAsText for CSV. 
                    // To support both in one loop easily without complex logic, let's just use readAsArrayBuffer for Excel 
                    // AND readAsText for CSV. But we can't switch reader method easily inside loop without separate logic.
                    // Actually, the FileReader instance is unique per file if we create it inside.
                }

                // Append content with a newline separator
                combinedText += textContent + "\n";
                processedCount++;

                // Check if all files are processed
                if (processedCount === files.length) {
                    // Update input text only once at the end
                    // If we already have text in the box, refrain from overwriting? 
                    // Current behavior suggests replacing. Let's append if data exists? 
                    // User probably wants to add to existing or replace. Let's replace for now based on 'handleFiles' usually handling the drop.
                    // Actually, if they drag multiple files, they expect those to be the content.
                    inputText.value = combinedText;
                    updateLineCount();
                }
            };

            // Trigger read based on file type
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                reader.readAsArrayBuffer(file);
            } else {
                // Default to text for CSV/TXT
                reader.readAsText(file);
            }
        });
    }

    // New Parsing Logic: Extract Sections and Combos based on Total Value
    function parseSections(text) {
        const lines = text.split(/\r\n|\r|\n/);
        const sectionsMap = new Map(); // key: fullCategoryName, value: [combos]

        let currentMajorCategory = "Account Normal"; // Default

        // Regex to split CSV even with quotes
        const csvSplitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return; // Skip empty lines

            // Check for Major Category Headers
            // Logic: If line starts with "Account", treat as major category change
            if (trimmedLine.startsWith("Account Normal")) {
                currentMajorCategory = "Account Normal";
                return;
            } else if (trimmedLine.startsWith("Account Locked")) {
                currentMajorCategory = "Account Locked";
                return;
            } else if (trimmedLine.startsWith("Account Banned")) {
                currentMajorCategory = "Account Banned";
                return;
            } else if (trimmedLine.startsWith("Account")) {
                // Fallback for other potential account types
                currentMajorCategory = trimmedLine.split('(')[0].trim();
                return;
            }

            // Skip CSV Headers
            if (trimmedLine.includes('PC,Combo,Username')) return;

            // Split CSV
            let cols = trimmedLine.split(csvSplitRegex);

            // Clean up quotes from columns
            cols = cols.map(col => col.replace(/^"|"$/g, '').trim());

            // Check if valid data line
            // Index 1 (2nd col) = Combo (User:Pass)
            // Index 10 (11th col) = Total
            if (cols.length >= 11 && cols[1].includes(':')) {
                const combo = cols[1];
                const totalText = cols[10]; // "524034"

                // Parse Total
                const total = parseInt(totalText.replace(/,/g, ''), 10) || 0;

                // Categorize Amount
                const amountCategory = getCategoryFromTotal(total);

                // Create Composite Category Key
                const fullCategory = `${currentMajorCategory} - ${amountCategory}`;

                if (!sectionsMap.has(fullCategory)) {
                    sectionsMap.set(fullCategory, []);
                }
                sectionsMap.get(fullCategory).push(combo);
            }
        });

        // Convert Map to Array of Objects
        const sections = [];

        // Sorting Logic:
        // 1. Major Category: Normal -> Locked -> Banned -> Others
        // 2. Amount Category: Under 100k -> 100k ... -> 1m ...
        const sortedKeys = Array.from(sectionsMap.keys()).sort((a, b) => {
            const [majorA, amountA] = a.split(' - ');
            const [majorB, amountB] = b.split(' - ');

            // 1. Compare Major
            if (majorA !== majorB) {
                const majorOrder = ["Account Normal", "Account Locked", "Account Banned"];
                const idxA = majorOrder.indexOf(majorA);
                const idxB = majorOrder.indexOf(majorB);

                // If both are in known list, sort by index
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                // If only A is known, A comes first
                if (idxA !== -1) return -1;
                // If only B is known, B comes first
                if (idxB !== -1) return 1;
                // Both unknown, sort alphabetically
                return majorA.localeCompare(majorB);
            }

            // 2. Compare Amount (Same Major)
            return compareCategories(amountA, amountB);
        });

        sortedKeys.forEach(key => {
            sections.push({ name: key, items: sectionsMap.get(key) });
        });

        return sections;
    }

    function getCategoryFromTotal(total) {
        if (total < 100000) return "Under 100k";

        if (total >= 1000000) {
            const millions = Math.floor(total / 1000000);
            return `${millions}m+`;
        }

        // 100k - 999k range
        const hundredKs = Math.floor(total / 100000); // 1, 2, 3... 9
        return `${hundredKs}00k`;
    }

    function compareCategories(a, b) {
        // Helper to extract value for sorting
        const getVal = (str) => {
            if (!str) return 0;
            if (str === "Under 100k") return 0;
            if (str.endsWith('m+')) return parseFloat(str) * 1000000;
            if (str.endsWith('k')) return parseFloat(str) * 1000;
            return 0;
        };
        return getVal(a) - getVal(b);
    }

    function updateLineCount() {
        const text = inputText.value;
        const sections = parseSections(text);
        let totalCombos = 0;
        sections.forEach(s => totalCombos += s.items.length);

        lineCountDisplay.textContent = `พบ ${sections.length} กลุ่ม | รวม ${totalCombos} รายการ`;
        return sections;
    }

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    inputText.addEventListener('input', debounce(updateLineCount, 300));

    // Clear Logic
    clearBtn.addEventListener('click', () => {
        if (confirm('ต้องการล้างข้อมูลทั้งหมดใช่ไหม?')) {
            inputText.value = '';
            resultsArea.innerHTML = '';
            lineCountDisplay.textContent = 'จำนวนที่พบ: 0 รายการ';
        }
    });

    // Filter Logic
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');
            filterResults(filter);
        });
    });

    function filterResults(category) {
        const cards = document.querySelectorAll('.result-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const cardCategory = card.getAttribute('data-major-category');

            if (category === 'all' || cardCategory === category) {
                card.classList.remove('hidden');
                // Optional: Restart animation
                card.style.animation = 'none';
                card.offsetHeight; /* trigger reflow */
                card.style.animation = 'fadeIn 0.4s ease-out forwards';
                // Add delay stagger for visible cards? Maybe too complex for now.
                visibleCount++;
            } else {
                card.classList.add('hidden');
            }
        });
    }

    // Split Logic
    splitBtn.addEventListener('click', () => {
        const sections = updateLineCount();

        if (sections.length === 0) {
            alert('ไม่พบข้อมูล Combo หรือกลุ่มข้อมูลในข้อความที่วาง');
            return;
        }

        // Show filter buttons if hidden
        const filterGroup = document.getElementById('filterGroup');
        if (filterGroup) filterGroup.style.display = 'flex';

        resultsArea.innerHTML = ''; // Clear previous results
        const mode = document.getElementById('outputMode').value; // cards or single
        const fragment = document.createDocumentFragment();

        if (mode === 'cards') {
            // Create a card for EACH section
            sections.forEach((section, index) => {
                const card = createResultCardElement(section.name, section.items, index);
                fragment.appendChild(card);
            });
        } else {
            // Visual Code Mode: Combine all sections into one block
            let allContent = [];
            sections.forEach(section => {
                allContent.push(...section.items);
                allContent.push(''); // Empty line separator
            });
            const card = createResultCardElement('ALL SECTIONS (Visual Code)', allContent, 0);
            fragment.appendChild(card);
        }

        resultsArea.appendChild(fragment);

        // Scroll to results
        requestAnimationFrame(() => {
            resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        // Default to "All" or check active button
        const activeBtn = document.querySelector('.filter-btn.active');
        if (activeBtn) {
            filterResults(activeBtn.getAttribute('data-filter'));
        } else {
            filterResults('all');
        }
    });

    function createResultCardElement(title, items, index) {
        const content = items.map(item => item === '' ? '' : item).join('\n');

        const card = document.createElement('div');
        card.className = 'result-card';
        // Limit animation delay for better performance
        card.style.animationDelay = `${Math.min(index * 0.05, 0.5)}s`;

        // Pink border/glow for Storm theme
        card.style.borderColor = 'rgba(236, 72, 153, 0.3)';

        // Determine Major Category for Data Attribute
        let majorCategory = 'other';
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('normal')) majorCategory = 'normal';
        else if (lowerTitle.includes('locked')) majorCategory = 'locked';
        else if (lowerTitle.includes('banned')) majorCategory = 'banned';

        card.setAttribute('data-major-category', majorCategory);

        // Use transform instead of other properties for performance
        card.style.willChange = 'opacity, transform';

        card.innerHTML = `
            <div class="result-header" style="border-bottom-color: rgba(236, 72, 153, 0.3);">
                <span class="result-title" style="color: #ec4899;">${title}</span>
                <span class="count-badge">${items.length} รายการ</span>
            </div>
            <div class="result-body">
                <textarea class="result-textarea" readonly>${content}</textarea>
                <button class="copy-btn" onclick="copyToClipboard(this)">
                    📋 คัดลอก
                </button>
            </div>
        `;

        return card;
    }

    // Global function for copy button
    window.copyToClipboard = (btn) => {
        const textarea = btn.previousElementSibling;
        textarea.select();
        textarea.setSelectionRange(0, 99999);

        navigator.clipboard.writeText(textarea.value).then(() => {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ คัดลอกแล้ว!';
            btn.classList.add('copied');

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            btn.innerHTML = '❌ Error';
        });
    };
});
