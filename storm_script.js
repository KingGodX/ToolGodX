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
        const file = files[0];
        if (file.type.match('text.*') || file.name.endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                inputText.value = e.target.result;
                updateLineCount();
            };
            reader.readAsText(file);
        } else {
            alert('กรุณาลากไฟล์ Text หรือ CSV เท่านั้น');
        }
    }

    // New Parsing Logic: Extract Sections and Combos
    function parseSections(text) {
        const lines = text.split(/\r\n|\r|\n/);
        const sections = [];
        let currentSectionName = "Uncategorized"; // Default if no header found first
        let currentCombos = [];

        // Regex to match CSV line: "PC","Combo",... -> Header
        // Regex to match Data line: "GodX...","...","..."
        const dataLineRegex = /^"[^"]+","([^"]+)",/;
        const headerLineRegex = /^PC,Combo,Username/;

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return; // Skip empty lines

            // Check if it's a data line
            const match = trimmedLine.match(dataLineRegex);
            if (match && match[1]) {
                // It's a combo line
                if (match[1].includes(':')) {
                    currentCombos.push(match[1]);
                }
            } else if (trimmedLine.match(headerLineRegex)) {
                // It's a CSV header line (PC,Combo,...), ignore
            } else {
                // Valid Section Header? (e.g., "100k (35) 315บาท")
                // If we have accumulated combos for previous section, save them
                if (currentCombos.length > 0) {
                    sections.push({ name: currentSectionName, items: currentCombos });
                    currentCombos = []; // Reset
                }
                currentSectionName = trimmedLine; // Start new section
            }
        });

        // Push the last section if any
        if (currentCombos.length > 0) {
            sections.push({ name: currentSectionName, items: currentCombos });
        }

        return sections;
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

    // Split Logic
    splitBtn.addEventListener('click', () => {
        const sections = updateLineCount();

        if (sections.length === 0) {
            alert('ไม่พบข้อมูล Combo หรือกลุ่มข้อมูลในข้อความที่วาง');
            return;
        }

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
    });

    function createResultCardElement(title, items, index) {
        const content = items.map(item => item === '' ? '' : item).join('\n');

        const card = document.createElement('div');
        card.className = 'result-card';
        // Limit animation delay for better performance
        card.style.animationDelay = `${Math.min(index * 0.05, 0.5)}s`;

        // Pink border/glow for Storm theme
        card.style.borderColor = 'rgba(236, 72, 153, 0.3)';

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
