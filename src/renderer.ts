// Type declaration for the API exposed by preload
interface ElectronAPI {
    detectHardware: () => Promise<{
        processor: string;
        ram: number;
        storage: { type: string; size: number | string };
        gpu: string;
    }>;
    getApiBase: () => Promise<string>;
    closeApp: () => void;
    onUpdateStatus: (callback: (status: string, percent?: number) => void) => void;
}

interface Window {
    api: ElectronAPI;
}

interface PairResponse {
    success: boolean;
    message?: string;
    data?: {
        sessionId: string;
        uploadToken: string;
        expiresAt: string;
    };
}

interface UploadResponse {
    success: boolean;
    message?: string;
}

// Declare lucide global
declare const lucide: { createIcons: () => void };

// ─── Step Progress Helpers ────────────────────────────────────

function setStep(stepNum: number): void {
    const steps = [
        document.getElementById('step1')!,
        document.getElementById('step2')!,
        document.getElementById('step3')!,
    ];
    const lines = [
        document.getElementById('stepLine1')!,
        document.getElementById('stepLine2')!,
    ];

    steps.forEach((step, i) => {
        step.classList.remove('active', 'completed');
        if (i + 1 < stepNum) {
            step.classList.add('completed');
        } else if (i + 1 === stepNum) {
            step.classList.add('active');
        }
    });

    lines.forEach((line, i) => {
        line.classList.toggle('active', i + 1 < stepNum);
    });
}

function showSection(sectionId: string): void {
    const sections = ['formSection', 'statusContainer', 'resultContainer', 'errorContainer'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.toggle('hidden', id !== sectionId);
        }
    });
    // Re-initialize Lucide icons for newly visible sections
    lucide.createIcons();
}

// ─── Auto-Update Overlay Handler ─────────────────────────────

(window as Window & typeof globalThis).api.onUpdateStatus((status, percent) => {
    const overlay = document.getElementById('updateOverlay')!;
    const progressFill = document.getElementById('updateProgressFill')!;
    const percentText = document.getElementById('updatePercent')!;

    const errorMsg = document.getElementById('updateErrorMsg')!;

    if (status === 'available') {
        overlay.classList.remove('hidden');
    } else if (status === 'downloading') {
        overlay.classList.remove('hidden');
        const p = Math.round(percent || 0);
        progressFill.style.width = `${p}%`;
        percentText.innerText = `${p}%`;
    } else if (status === 'ready') {
        progressFill.style.width = '100%';
        percentText.innerText = '100%';
    } else if (status === 'error') {
        overlay.classList.add('hidden');
        errorMsg.innerText = String(percent || 'Update failed');
        errorMsg.classList.remove('hidden');
    }
});

// ─── Main Form Handler ───────────────────────────────────────

document.getElementById('pairForm')!.addEventListener('submit', async (e: Event) => {
    e.preventDefault();

    const pairingCode = (document.getElementById('pairingCode') as HTMLInputElement).value.trim();
    const proceedBtn = document.getElementById('proceedBtn') as HTMLButtonElement;
    const statusText = document.getElementById('statusText')!;

    // Get API base URL from environment
    const apiBase = await (window as Window & typeof globalThis).api.getApiBase();

    // Basic validation
    if (!pairingCode || pairingCode.length !== 6) {
        alert('Please enter a valid 6-digit pairing code.');
        return;
    }

    // Move to Step 2 — Detecting
    proceedBtn.disabled = true;
    setStep(2);
    showSection('statusContainer');
    statusText.innerText = 'Verifying pairing code...';

    try {
        // 1. Get Upload Token
        const pairRes = await fetch(`${apiBase}/pair`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pairCode: pairingCode })
        });

        const pairData: PairResponse = await pairRes.json();

        if (!pairRes.ok || !pairData.success) {
            throw new Error(pairData.message || 'Failed to verify pairing code.');
        }

        const uploadToken = pairData.data?.uploadToken;
        const sessionId = pairData.data?.sessionId;

        if (!uploadToken || !sessionId) {
            throw new Error('Invalid response from server.');
        }

        // 2. Detect Hardware
        statusText.innerText = 'Detecting hardware specifications...';
        const specs = await (window as Window & typeof globalThis).api.detectHardware();

        // 3. Upload Results
        statusText.innerText = 'Uploading results to Cashkr...';

        const uploadRes = await fetch(`${apiBase}/results`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${uploadToken}`,
                'x-qc-session-id': sessionId
            },
            body: JSON.stringify({
                sessionId,
                specs: {
                    cpuModel: specs.processor,
                    ramBytes: specs.ram * 1024 * 1024 * 1024,
                    disks: [{ sizeBytes: Number(specs.storage.size) * 1024 * 1024 * 1024, type: specs.storage.type, isSystemDisk: true }],
                    gpuModels: specs.gpu ? [specs.gpu] : [],
                    osVersion: navigator.userAgent,
                    appVersion: '1.0.0'
                }
            })
        });

        const uploadData: UploadResponse = await uploadRes.json();

        if (!uploadRes.ok) {
            throw new Error(uploadData.message || 'Failed to upload hardware results.');
        }

        // 4. Move to Step 3 — Done
        setStep(3);
        showSection('resultContainer');

        document.getElementById('resCpu')!.innerText = specs.processor || 'Unknown';
        document.getElementById('resRam')!.innerText = specs.ram ? `${specs.ram} GB` : 'Unknown';
        document.getElementById('resStorage')!.innerText = specs.storage
            ? `${specs.storage.size} GB ${specs.storage.type}`
            : 'Unknown';
        document.getElementById('resGpu')!.innerText = specs.gpu || 'Unknown';

    } catch (error) {
        // Show error state
        showSection('errorContainer');
        document.getElementById('errorText')!.innerText = (error as Error).message;
        setStep(1);
        proceedBtn.disabled = false;
        console.error(error);
    }
});

// ─── Retry Button & Close App Handler ────────────────────────────────────

document.getElementById('closeAppBtn')?.addEventListener('click', () => {
    (window as Window & typeof globalThis).api.closeApp();
});

document.getElementById('retryBtn')!.addEventListener('click', () => {
    setStep(1);
    showSection('formSection');
    (document.getElementById('proceedBtn') as HTMLButtonElement).disabled = false;
});
