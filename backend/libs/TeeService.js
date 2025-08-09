const { spawn } = require('child_process');
const path = require('path');

class TeeService {
  constructor(options = {}) {
    this.hostPath = options.hostPath || path.resolve('../../openenclave/enclave/host/trustdoc_host');
    this.simulate = options.simulate !== false; // Default true
    this.useWsl = options.useWsl !== false; // Default true per Windows
    this.timeout = options.timeout || 30000; // 30 secondi timeout
  }

  /**
   * Calcola hash SHA-256 di un buffer usando TEE
   * @param {Buffer} buffer - Buffer del file da hashare
   * @returns {Promise<string>} - Hash SHA-256 in formato esadecimale
   */
  async computeHash(buffer) {
    return new Promise((resolve, reject) => {
      // Prepara argomenti
      const args = [this.hostPath];
      if (this.simulate) {
        args.push('--simulate');
      }
      args.push('-'); // Leggi da stdin

      // Spawna processo
      const child = this.useWsl 
        ? spawn('wsl', args)
        : spawn(this.hostPath, args.slice(1));

      let stdout = '';
      let stderr = '';
      let timeoutId;

      // Timeout di sicurezza
      if (this.timeout > 0) {
        timeoutId = setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error(`TEE operation timed out after ${this.timeout}ms`));
        }, this.timeout);
      }

      // Gestione output
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Gestione chiusura processo
      child.on('close', (code) => {
        if (timeoutId) clearTimeout(timeoutId);

        if (code === 0) {
          const hash = stdout.trim();
          // Validazione hash SHA-256 (64 caratteri esadecimali)
          if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
            reject(new Error(`Invalid hash format received: ${hash}`));
            return;
          }
          resolve(hash);
        } else {
          reject(new Error(`TEE process failed with code ${code}: ${stderr.trim()}`));
        }
      });

      child.on('error', (err) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(new Error(`Failed to start TEE process: ${err.message}`));
      });

      // Invia buffer e chiudi stdin
      try {
        child.stdin.write(buffer);
        child.stdin.end();
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        child.kill('SIGKILL');
        reject(new Error(`Failed to write to TEE process: ${err.message}`));
      }
    });
  }

  /**
   * Calcola hash SHA-256 di un file usando TEE
   * @param {string} filePath - Percorso del file
   * @returns {Promise<string>} - Hash SHA-256 in formato esadecimale
   */
  async computeFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const args = [this.hostPath];
      if (this.simulate) {
        args.push('--simulate');
      }
      args.push(filePath);

      const child = this.useWsl 
        ? spawn('wsl', args)
        : spawn(this.hostPath, args.slice(1));

      let stdout = '';
      let stderr = '';
      let timeoutId;

      if (this.timeout > 0) {
        timeoutId = setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error(`TEE operation timed out after ${this.timeout}ms`));
        }, this.timeout);
      }

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (timeoutId) clearTimeout(timeoutId);

        if (code === 0) {
          const hash = stdout.trim();
          if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
            reject(new Error(`Invalid hash format received: ${hash}`));
            return;
          }
          resolve(hash);
        } else {
          reject(new Error(`TEE process failed with code ${code}: ${stderr.trim()}`));
        }
      });

      child.on('error', (err) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(new Error(`Failed to start TEE process: ${err.message}`));
      });
    });
  }

  /**
   * Verifica se il TEE è disponibile
   * @returns {Promise<boolean>} - True se disponibile
   */
  async isAvailable() {
    try {
      // Testa con un buffer vuoto
      const testBuffer = Buffer.from('test');
      await this.computeHash(testBuffer);
      return true;
    } catch (err) {
      console.error('TEE availability check failed:', err.message);
      return false;
    }
  }
}

module.exports = TeeService;