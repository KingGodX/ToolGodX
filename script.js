document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const inputText = document.getElementById('inputText');
    const lineCountDisplay = document.getElementById('lineCount');
    const splitCountInput = document.getElementById('splitCount');
    const incBtn = document.getElementById('incBtn');
    const decBtn = document.getElementById('decBtn');
    const splitBtn = document.getElementById('splitBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultsArea = document.getElementById('resultsArea');

    // Update line count on input
    inputText.addEventListener('input', updateLineCount);

    function updateLineCount() {
        const text = inputText.value;
        // Split by newline and filter out empty lines (whitespace only)
        const lines = text.split(/\r\n|\r|\n/).filter(line => line.trim() !== '');
        lineCountDisplay.textContent = `จำนวนทั้งหมด: ${lines.length} รายการ`;
        return lines;
    }

    // Number input controls
    incBtn.addEventListener('click', () => {
        splitCountInput.value = parseInt(splitCountInput.value) + 1;
    });

    decBtn.addEventListener('click', () => {
        if (parseInt(splitCountInput.value) > 1) {
            splitCountInput.value = parseInt(splitCountInput.value) - 1;
        }
    });

    // Clear Logic
    clearBtn.addEventListener('click', () => {
        if (confirm('ต้องการล้างข้อมูลทั้งหมดใช่ไหม?')) {
            inputText.value = '';
            resultsArea.innerHTML = '';
            updateLineCount();
        }
    });

    // Split Logic
    splitBtn.addEventListener('click', () => {
        const lines = updateLineCount();
        const parts = parseInt(splitCountInput.value);

        if (lines.length === 0) {
            alert('กรุณาใส่ข้อมูลก่อนทำการแยก (ไอดี/คุกกี้)');
            return;
        }

        if (parts < 1) {
            alert('จำนวนส่วนต้องมากกว่า 0');
            return;
        }

        // Calculate distribution
        const totalItems = lines.length;
        const baseSize = Math.floor(totalItems / parts);
        const remainder = totalItems % parts;

        resultsArea.innerHTML = ''; // Clear previous results

        const mode = document.getElementById('outputMode').value;
        let singleBlockContent = [];
        let startIndex = 0;

        for (let i = 0; i < parts; i++) {
            // Distribute remainder: first 'remainder' parts get +1 item
            const currentSize = baseSize + (i < remainder ? 1 : 0);

            // Slice the array
            const chunk = lines.slice(startIndex, startIndex + currentSize);
            startIndex += currentSize;

            if (chunk.length > 0) {
                if (mode === 'cards') {
                    // Standard Mode: Create separate cards
                    createResultCard(i + 1, chunk);
                } else {
                    // Single Block Mode: Accumulate
                    singleBlockContent.push(...chunk);
                    // Add empty line between chunks if not the last chunk
                    if (i < parts - 1) {
                        singleBlockContent.push('');
                    }
                }
            }
        }

        if (mode === 'single' && singleBlockContent.length > 0) {
            createResultCard('ALL (Visual Code)', singleBlockContent);
        }

        // Scroll to results
        resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    function createResultCard(index, items) {
        // If items contain empty strings (separators), join carefully
        const content = items.map(item => item === '' ? '' : item).join('\n');

        const card = document.createElement('div');
        card.className = 'result-card';
        card.style.animationDelay = `${index * 0.1}s`;

        card.innerHTML = `
            <div class="result-header">
                <span class="result-title">BOT #${index}</span>
                <span class="count-badge">${items.length} รายการ</span>
            </div>
            <div class="result-body">
                <textarea class="result-textarea" readonly>${content}</textarea>
                <button class="copy-btn" onclick="copyToClipboard(this)">
                    📋 คัดลอก
                </button>
            </div>
        `;

        resultsArea.appendChild(card);
    }

    // Global function for copy button
    window.copyToClipboard = (btn) => {
        const textarea = btn.previousElementSibling;
        textarea.select();
        textarea.setSelectionRange(0, 99999); // For mobile devices

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
