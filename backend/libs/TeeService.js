const { spawn } = require('child_process');
const path = require('path');

class TeeService {
  constructor(options = {}) {
    // Percorso assoluto all'executable
    this.hostPath = options.hostPath || path.resolve(__dirname, '../../openenclave/enclave/host/trustdoc_host');
    // Directory dove si trova l'host (per working directory)
    this.hostDir = path.dirname(this.hostPath);
    // Nome dell'executable (per chiamata relativa)
    this.hostExecutable = path.basename(this.hostPath);
    
    this.simulate = options.simulate !== false; // Default true
    this.useWsl = options.useWsl !== false; // Default true per Windows
    this.timeout = options.timeout || 30000; // 30 secondi timeout
    
    // Debug: stampa i percorsi calcolati
    console.log('TEE Service initialized:');
    console.log('- Host path:', this.hostPath);
    console.log('- Host directory:', this.hostDir);
    console.log('- Host executable:', this.hostExecutable);
  }

  /**
   * Calcola hash SHA-256 di un buffer usando TEE
   * @param {Buffer} buffer - Buffer del file da hashare
   * @returns {Promise<string>} - Hash SHA-256 in formato esadecimale
   */
  async computeHash(buffer) {
    return new Promise((resolve, reject) => {
      // Prepara argomenti usando percorso relativo
      const args = [`./${this.hostExecutable}`];
      if (this.simulate) {
        args.push('--simulate');
      }
      args.push('-'); // Leggi da stdin

      // Opzioni per spawn - IMPORTANTE: specifica working directory
      const spawnOptions = {
        cwd: this.hostDir, // Cambia directory di lavoro
        stdio: ['pipe', 'pipe', 'pipe'] // stdin, stdout, stderr
      };

      // Spawna processo
      const child = this.useWsl 
        ? spawn('wsl', args, spawnOptions)
        : spawn(this.hostExecutable, args.slice(1), spawnOptions);

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
   * @param {string} filePath - Percorso del file (può essere relativo o assoluto)
   * @returns {Promise<string>} - Hash SHA-256 in formato esadecimale
   */
  async computeFileHash(filePath) {
    return new Promise((resolve, reject) => {
      // Prepara argomenti
      const args = [`./${this.hostExecutable}`];
      if (this.simulate) {
        args.push('--simulate');
      }
      
      // Converti il percorso file in assoluto se necessario
      const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
      args.push(absoluteFilePath);

      // Opzioni per spawn
      const spawnOptions = {
        cwd: this.hostDir,
        stdio: ['pipe', 'pipe', 'pipe']
      };

      const child = this.useWsl 
        ? spawn('wsl', args, spawnOptions)
        : spawn(this.hostExecutable, args.slice(1), spawnOptions);

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
      // Testa con un buffer piccolo
      const testBuffer = Buffer.from('test');
      const hash = await this.computeHash(testBuffer);
      console.log('TEE availability test successful, hash:', hash);
      return true;
    } catch (err) {
      console.error('TEE availability check failed:', err.message);
      return false;
    }
  }

  /**
   * Ottieni informazioni di debug sul servizio
   * @returns {Object} - Informazioni di configurazione
   */
  getInfo() {
    return {
      hostPath: this.hostPath,
      hostDir: this.hostDir,
      hostExecutable: this.hostExecutable,
      simulate: this.simulate,
      useWsl: this.useWsl,
      timeout: this.timeout
    };
  }
}

module.exports = TeeService;