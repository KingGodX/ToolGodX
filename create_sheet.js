document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const stormInput = document.getElementById('stormInput');
    const comboInput = document.getElementById('comboInput');
    const stormStatus = document.getElementById('stormStatus');
    const comboStatus = document.getElementById('comboStatus');
    const mergeBtn = document.getElementById('mergeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultsArea = document.getElementById('resultsArea');
    const dropZoneStorm = document.getElementById('dropZoneStorm');
    const dropZoneCombo = document.getElementById('dropZoneCombo');
    const fileNameInput = document.getElementById('fileNameInput');

    let stormData = [];
    let comboData = {}; // Map: Username -> Full Combo String

    // Setup Drag & Drop
    setupDropZone(dropZoneStorm, stormInput, 'storm');
    setupDropZone(dropZoneCombo, comboInput, 'combo');

    function setupDropZone(zone, input, type) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            zone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            zone.addEventListener(eventName, () => zone.classList.add('drag-over'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            zone.addEventListener(eventName, () => zone.classList.remove('drag-over'), false);
        });

        zone.addEventListener('drop', (e) => handleDrop(e, input, type), false);

        // Also handle manual paste/input
        input.addEventListener('input', () => processInput(input.value, type));
    }

    function handleDrop(e, input, type) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            readFile(files[0], input, type);
        }
    }

    function readFile(file, input, type) {
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const csvData = XLSX.utils.sheet_to_csv(worksheet);
                input.value = csvData;
                processInput(csvData, type);
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = function (e) {
                input.value = e.target.result;
                processInput(e.target.result, type);
            };
            reader.readAsText(file);
        }
    }

    function processInput(text, type) {
        if (type === 'storm') {
            parseStorm(text);
        } else {
            parseCombo(text);
        }
    }

    function parseStorm(text) {
        const lines = text.split(/\r\n|\r|\n/);
        stormData = [];
        let currentMoney = "";
        let count = 0;

        // Regex
        const sectionHeaderRegex = /^(\S+)\s+\(\d+\)/; // Matches "200k (35)" -> "200k"

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Check for Section Header (Money)
            // But skip the "PC,Combo,..." header
            if (trimmed.startsWith('PC,Combo')) return;

            const headerMatch = trimmed.match(sectionHeaderRegex);
            if (headerMatch) {
                currentMoney = headerMatch[1];
                return;
            }

            // Check for Data Line
            // Expected: "PC","Combo","Username",...
            // Combo (Index 1) is User:Pass
            const parts = trimmed.split('","'); // Simple split by quotes

            // Adjust for leading first quote
            if (parts.length > 5) {
                // Remove leading quote from first element data (PC)
                // parts[1] is Combo (User:Pass)
                // parts[2] is Username

                let rawCombo = parts[1];
                let userPass = rawCombo;

                // Construct Row Object
                let row = {
                    money: currentMoney,
                    userPass: userPass,
                    username: parts[2],
                    atm: parts[3],
                    stocker: parts[4],
                    chef: parts[5],
                    fishing: parts[6],
                    farming: parts[7],
                    // Pocket/Bank skipped as requested
                    rawLine: trimmed
                };
                stormData.push(row);
                count++;
            }
        });

        stormStatus.textContent = `✅ Loaded Storm Data: ${count} rows`;
        stormStatus.style.color = '#10b981';
    }

    function parseCombo(text) {
        const lines = text.split(/\r\n|\r|\n/);
        comboData = {};
        let count = 0;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Format: User:Pass:Cookie_String
            // Find 2nd colon to ensure it's a valid combo line

            const firstColon = trimmed.indexOf(':');
            if (firstColon === -1) return;

            const secondColon = trimmed.indexOf(':', firstColon + 1);

            if (secondColon > -1) {
                const user = trimmed.substring(0, firstColon); // Isolate Username
                // Store the WHOLE string as the "Combo" value
                comboData[user] = trimmed;
                count++;
            }
        });

        comboStatus.textContent = `✅ Loaded Combo Data: ${count} entries`;
        comboStatus.style.color = '#10b981';
    }

    mergeBtn.addEventListener('click', () => {
        if (stormData.length === 0) {
            alert('Please load Storm Export file first!');
            return;
        }

        // Merge - Match by Username
        const mergedResults = [];

        stormData.forEach(row => {
            const fullCombo = comboData[row.username];

            if (fullCombo) {
                mergedResults.push({
                    ...row,
                    combo: fullCombo
                });
            }
        });

        if (mergedResults.length === 0) {
            alert('No matching usernames found! Please ensure Storm Export and Combo.txt have matching usernames.');
        }

        displayResults(mergedResults);
    });

    function displayResults(data) {
        resultsArea.innerHTML = '';

        const card = document.createElement('div');
        card.className = 'result-card full-width';
        card.style.borderColor = '#10b981';
        card.style.maxWidth = '500px';
        card.style.width = '100%';

        // Table
        let tableHtml = `
            <div class="result-header" style="border-bottom-color: rgba(16, 185, 129, 0.3);">
                <span class="result-title" style="color: #10b981;">Merged Data (${data.length} matches)</span>
                <div style="display: flex; gap: 0.5rem;">
                     <button class="copy-btn" onclick="exportToExcel()">📊 Download Excel</button>
                </div>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Money</th>
                            <th>User:Pass</th>
                            <th>Username</th>
                            <th>ATM</th>
                            <th>Stocker</th>
                            <th>Chef</th>
                            <th>Fishing</th>
                            <th>Farming</th>
                            <th>Combo</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        let lastMoney = null;

        data.forEach(row => {
            // Add separator if money changes
            if (lastMoney && row.money !== lastMoney) {
                tableHtml += `<tr><td colspan="9" style="background-color: #1e293b; height: 20px;"></td></tr>`;
            }
            lastMoney = row.money;

            tableHtml += `
                <tr>
                    <td>${row.money}</td>
                    <td>${row.userPass}</td>
                    <td>${row.username}</td>
                    <td>${row.atm}</td>
                    <td>${row.stocker}</td>
                    <td>${row.chef}</td>
                    <td>${row.fishing}</td>
                    <td>${row.farming}</td>
                    <td class="token-cell">${row.combo ? row.combo.substring(0, 30) + '...' : ''}</td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table></div>`;
        card.innerHTML = tableHtml;
        resultsArea.appendChild(card);

        // Save for export
        window.lastMergedData = data;
    }

    clearBtn.addEventListener('click', () => {
        stormInput.value = '';
        comboInput.value = '';
        resultsArea.innerHTML = '';
        stormData = [];
        comboData = {};
        stormStatus.textContent = 'สถานะ: รอไฟล์...';
        stormStatus.style.color = '#64748b';
        comboStatus.textContent = 'สถานะ: รอไฟล์...';
        comboStatus.style.color = '#64748b';
    });

    // Exports
    window.exportToExcel = () => {
        if (!window.lastMergedData) return;

        const ws_data = [
            ['Money', 'Username:Password', 'Username', 'ATM', 'Stocker', 'Chef', 'Fishing', 'Farming', 'Combo']
        ];

        let lastMoney = null;

        window.lastMergedData.forEach(row => {
            if (lastMoney && row.money !== lastMoney) {
                ws_data.push([]); // Empty row
            }
            lastMoney = row.money;

            ws_data.push([
                row.money,
                row.userPass,
                row.username,
                row.atm,
                row.stocker,
                row.chef,
                row.fishing,
                row.farming,
                row.combo
            ]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, "Merged Data");

        let fileName = fileNameInput.value.trim() || 'ToolGodX_Merged';
        if (!fileName.endsWith('.xlsx')) fileName += '.xlsx';

        XLSX.writeFile(wb, fileName);
    };

    window.exportToCliboard = () => {
        if (!window.lastMergedData) return;

        let text = "Money\tUsername:Password\tUsername\tATM\tStocker\tChef\tFishing\tFarming\tCombo\n";

        window.lastMergedData.forEach(row => {
            text += `${row.money}\t${row.userPass}\t${row.username}\t${row.atm}\t${row.stocker}\t${row.chef}\t${row.fishing}\t${row.farming}\t${row.combo}\n`;
        });

        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard! You can now Paste (Ctrl+V) directly into Google Sheets.');
        });
    };
});
