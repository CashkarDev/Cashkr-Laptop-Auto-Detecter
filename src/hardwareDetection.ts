import os from 'os';
import { exec } from 'child_process';
import { StringDecoder } from 'string_decoder';

// ─── Interfaces ───────────────────────────────────────────────

export interface StorageInfo {
    type: string;
    size: number | string;
}

export interface HardwareSpecs {
    processor: string;
    ram: number;
    storage: StorageInfo;
    gpu: string;
    model: string;
}

interface PhysicalDisk {
    MediaType: number | string;
    Size: number;
}

// ─── Helpers ──────────────────────────────────────────────────

function execPromise(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, _stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

// ─── Detection Functions ──────────────────────────────────────

function getCpu(): string {
    const cpus = os.cpus();
    if (cpus && cpus.length > 0) {
        return cpus[0].model;
    }
    return "Unknown Processor";
}

function getRam(): number {
    const totalMemBytes = os.totalmem();
    const totalMemGb = totalMemBytes / (1024 * 1024 * 1024);
    return Math.ceil(totalMemGb); // Return practical GBs
}

async function getStorage(): Promise<StorageInfo> {
    try {
        // ─── macOS ────────────────────────────────────────
        if (process.platform === 'darwin') {
            const result = await execPromise('diskutil info disk0');

            // Get disk size
            const sizeMatch = result.match(/Disk Size:\s+[\d.]+ GB \((\d+) Bytes\)/i)
                || result.match(/Disk Size:\s+([\d.]+) GB/i);
            let sizeGb = 0;
            if (sizeMatch) {
                if (sizeMatch[1].length > 6) {
                    // It's in bytes
                    sizeGb = Math.round(parseInt(sizeMatch[1]) / (1000 * 1000 * 1000));
                } else {
                    sizeGb = Math.round(parseFloat(sizeMatch[1]));
                }
            }

            // Check if SSD
            const isSSD = result.includes('Solid State: Yes') || result.includes('SSD');
            const typeStr = isSSD ? 'SSD' : 'HDD';

            return { type: typeStr, size: sizeGb || 'Unknown' };
        }

        // ─── Windows ──────────────────────────────────────
        if (process.platform === 'win32') {
            const psCommand = `powershell -NoProfile -Command "Get-PhysicalDisk | Select-Object MediaType, Size | ConvertTo-Json"`;
            const result = await execPromise(psCommand);

            if (!result) return { type: 'Unknown', size: 'Unknown' };

            let disks: PhysicalDisk[] = [];
            try {
                const parsed = JSON.parse(result);
                disks = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                console.warn("Failed to parse disk data", e);
                return { type: 'Unknown', size: 'Unknown' };
            }

            let mainDisk = disks.find(
                (d) => d.MediaType === 4 || (d.MediaType && d.MediaType.toString().toLowerCase() === "ssd")
            );
            if (!mainDisk) {
                mainDisk = disks[0];
            }

            if (!mainDisk) return { type: 'Unknown', size: 'Unknown' };

            const typeStr =
                (mainDisk.MediaType === 4 || (mainDisk.MediaType && mainDisk.MediaType.toString().toLowerCase() === "ssd"))
                    ? "SSD"
                    : (mainDisk.MediaType === 3 || (mainDisk.MediaType && mainDisk.MediaType.toString().toLowerCase() === "hdd"))
                        ? "HDD"
                        : "Unknown";

            const sizeGb = Math.round(mainDisk.Size / (1024 * 1024 * 1024));
            return { type: typeStr, size: sizeGb };
        }

        return { type: 'Unknown', size: 'Unknown' };

    } catch (err) {
        console.error("Storage Error:", err);
        return { type: 'Error', size: 0 };
    }
}

async function getGpu(): Promise<string> {
    try {
        // ─── macOS ────────────────────────────────────────
        if (process.platform === 'darwin') {
            const result = await execPromise('system_profiler SPDisplaysDataType');
            const match = result.match(/Chipset Model:\s*(.+)/i)
                || result.match(/Chip:\s*(.+)/i);
            return match ? match[1].trim() : 'Unknown GPU';
        }

        // ─── Windows ──────────────────────────────────────
        if (process.platform === 'win32') {
            const command = `powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController).Name"`;
            const result = await execPromise(command);
            return result || "Unknown GPU";
        }

        return "Unknown GPU";

    } catch (err) {
        console.error("GPU Error:", err);
        return "Error checking GPU";
    }
}

async function getModel(): Promise<string> {
    try{
        if(process.platform ===  'win32'){
            const command = `powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystem).Model"`;
            const result = await execPromise(command);
            return result || "Unknown Model";
        }
        return "Unknown Model"
    } catch(error){
        console.log("Model Error:", error);
        return "Error checking Model"
    }
}

// ─── Main Export ──────────────────────────────────────────────

export async function getHardwareSpecs(): Promise<HardwareSpecs> {
    const processor = getCpu();
    const ram = getRam();

    const storage = await getStorage();
    const gpu = await getGpu();
    const model = await getModel();

    return {
        processor,
        ram,
        storage,
        gpu,
        model,
    };
}
