import { Injectable } from '@nestjs/common';
import { SecurityNode } from '../interfaces/security-node.interface';

export interface FileHashConfig {
  hashTypes: ('md5' | 'sha1' | 'sha256' | 'sha512')[];
  enableVirusTotalLookup: boolean;
  enableHybridAnalysisLookup: boolean;
  enableLocalDatabase: boolean;
  malwareThreshold: number;
  trustThreshold: number;
  enableYaraRules: boolean;
  enablePEAnalysis: boolean;
  quarantineOnDetection: boolean;
}

export interface FileHashInput {
  files: Array<{
    filename: string;
    filepath?: string;
    size: number;
    hashes?: {
      md5?: string;
      sha1?: string;
      sha256?: string;
      sha512?: string;
    };
    fileContent?: string; // Base64 encoded
    metadata?: {
      created: Date;
      modified: Date;
      accessed: Date;
      permissions?: string;
      owner?: string;
    };
  }>;
  scanMode: 'quick' | 'deep' | 'comprehensive';
}

export interface FileHashResult {
  analysisId: string;
  scanTime: Date;
  summary: {
    totalFiles: number;
    scannedFiles: number;
    maliciousFiles: number;
    suspiciousFiles: number;
    cleanFiles: number;
    unknownFiles: number;
  };
  fileResults: Array<{
    filename: string;
    filepath?: string;
    size: number;
    hashes: {
      md5: string;
      sha1: string;
      sha256: string;
      sha512?: string;
    };
    reputation: {
      overall: 'clean' | 'suspicious' | 'malicious' | 'unknown';
      confidence: number;
      sources: Array<{
        source: string;
        verdict: 'clean' | 'malicious' | 'suspicious';
        details?: string;
        lastUpdate: Date;
      }>;
    };
    virusTotalResults?: {
      detectionRate: string; // "5/67"
      engines: Array<{
        engine: string;
        result: string;
        version: string;
        update: string;
      }>;
      permalink: string;
      scanDate: Date;
      totalVotes: { harmless: number; malicious: number; suspicious: number; };
    };
    hybridAnalysisResults?: {
      verdict: string;
      threatScore: number;
      environmentDescription: string;
      submitTime: Date;
      analysisTime: number;
      capabilities: string[];
    };
    yaraMatches?: Array<{
      rule: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      tags: string[];
      strings: string[];
    }>;
    peAnalysis?: {
      architecture: string;
      compiler: string;
      entryPoint: string;
      imports: string[];
      exports: string[];
      sections: Array<{
        name: string;
        virtualSize: number;
        rawSize: number;
        characteristics: string[];
      }>;
      anomalies: string[];
    };
    fileType: {
      mime: string;
      extension: string;
      category: 'executable' | 'document' | 'archive' | 'image' | 'script' | 'other';
      isPacked: boolean;
      isEncrypted: boolean;
    };
    riskFactors: Array<{
      factor: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }>;
    recommendations: string[];
  }>;
  globalThreats: Array<{
    threatFamily: string;
    affectedFiles: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    indicators: string[];
    mitigation: string[];
  }>;
  recommendations: string[];
  quarantinedFiles: string[];
}

@Injectable()
export class FileHashAnalysisNode extends SecurityNode {
  id = 'file-hash-analysis';
  type = 'analysis';
  category = 'core' as const;
  name = 'File Hash Analysis';
  description = 'Comprehensive file hash analysis using multiple threat intelligence sources';
  version = '2.2.0';

  getSchema() {
    return {
      inputs: [
        {
          name: 'file_list',
          type: 'array' as const,
          required: true,
          description: 'List of files to analyze'
        },
        {
          name: 'scan_mode',
          type: 'string' as const,
          required: false,
          description: 'Analysis depth mode'
        }
      ],
      outputs: [
        {
          name: 'analysis_results',
          type: 'object' as const,
          description: 'Comprehensive file analysis results'
        },
        {
          name: 'malicious_files',
          type: 'array' as const,
          description: 'List of files identified as malicious'
        },
        {
          name: 'threat_count',
          type: 'number' as const,
          description: 'Number of threats detected'
        },
        {
          name: 'risk_score',
          type: 'number' as const,
          description: 'Overall risk score (0-100)'
        }
      ],
      config: [
        {
          name: 'hashTypes',
          type: 'array' as const,
          required: false,
          default: ['md5', 'sha1', 'sha256'],
          description: 'Hash types to calculate and analyze'
        },
        {
          name: 'enableVirusTotalLookup',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Enable VirusTotal threat intelligence lookup'
        },
        {
          name: 'enableHybridAnalysisLookup',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Enable Hybrid Analysis lookup'
        },
        {
          name: 'enableLocalDatabase',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Use local threat intelligence database'
        },
        {
          name: 'malwareThreshold',
          type: 'number' as const,
          required: false,
          default: 5,
          description: 'Minimum detections to classify as malware'
        },
        {
          name: 'trustThreshold',
          type: 'number' as const,
          required: false,
          default: 0.7,
          description: 'Confidence threshold for classifications'
        },
        {
          name: 'enableYaraRules',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Enable YARA rule matching'
        },
        {
          name: 'enablePEAnalysis',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Enable PE (Portable Executable) analysis'
        },
        {
          name: 'quarantineOnDetection',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Automatically quarantine malicious files'
        }
      ]
    };
  }

  async execute(input: FileHashInput, config: FileHashConfig): Promise<FileHashResult> {
    const analysisId = `file_hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`Starting file hash analysis ${analysisId} for ${input.files.length} files`);
      
      const result: FileHashResult = {
        analysisId,
        scanTime: new Date(),
        summary: {
          totalFiles: input.files.length,
          scannedFiles: 0,
          maliciousFiles: 0,
          suspiciousFiles: 0,
          cleanFiles: 0,
          unknownFiles: 0
        },
        fileResults: [],
        globalThreats: [],
        recommendations: [],
        quarantinedFiles: []
      };

      // Process each file
      for (const file of input.files) {
        try {
          const fileResult = await this.analyzeFile(file, config, input.scanMode);
          result.fileResults.push(fileResult);
          result.summary.scannedFiles++;

          // Update summary counts
          switch (fileResult.reputation.overall) {
            case 'malicious':
              result.summary.maliciousFiles++;
              if (config.quarantineOnDetection) {
                await this.quarantineFile(file.filename);
                result.quarantinedFiles.push(file.filename);
              }
              break;
            case 'suspicious':
              result.summary.suspiciousFiles++;
              break;
            case 'clean':
              result.summary.cleanFiles++;
              break;
            default:
              result.summary.unknownFiles++;
          }
        } catch (error) {
          console.error(`Failed to analyze file ${file.filename}:`, error.message);
        }
      }

      // Analyze global threats and patterns
      result.globalThreats = await this.identifyGlobalThreats(result.fileResults);
      result.recommendations = this.generateRecommendations(result, config);

      console.log(`File hash analysis ${analysisId} completed. Malicious: ${result.summary.maliciousFiles}, Suspicious: ${result.summary.suspiciousFiles}`);
      return result;

    } catch (error) {
      throw new Error(`File hash analysis failed: ${error.message}`);
    }
  }

  private async analyzeFile(file: FileHashInput['files'][0], config: FileHashConfig, scanMode: string) {
    // Calculate hashes if not provided
    const hashes = file.hashes || await this.calculateHashes(file, config.hashTypes);
    
    // Initialize file result
    const fileResult = {
      filename: file.filename,
      filepath: file.filepath,
      size: file.size,
      hashes: {
        md5: hashes.md5 || '',
        sha1: hashes.sha1 || '',
        sha256: hashes.sha256 || '',
        sha512: hashes.sha512
      },
      reputation: {
        overall: 'unknown' as const,
        confidence: 0,
        sources: []
      },
      fileType: await this.analyzeFileType(file),
      riskFactors: [],
      recommendations: []
    };

    // Threat intelligence lookups
    if (config.enableVirusTotalLookup) {
      fileResult.virusTotalResults = await this.lookupVirusTotal(hashes.sha256 || hashes.md5);
    }

    if (config.enableHybridAnalysisLookup) {
      fileResult.hybridAnalysisResults = await this.lookupHybridAnalysis(hashes.sha256 || hashes.sha1);
    }

    if (config.enableLocalDatabase) {
      const localResults = await this.lookupLocalDatabase(hashes);
      fileResult.reputation.sources.push(...localResults);
    }

    // YARA rule matching
    if (config.enableYaraRules && file.fileContent) {
      fileResult.yaraMatches = await this.runYaraRules(file.fileContent, file.filename);
    }

    // PE analysis for executables
    if (config.enablePEAnalysis && fileResult.fileType.category === 'executable') {
      fileResult.peAnalysis = await this.analyzePE(file);
    }

    // Calculate overall reputation
    fileResult.reputation = this.calculateReputation(fileResult, config);
    
    // Identify risk factors
    fileResult.riskFactors = this.identifyRiskFactors(fileResult);
    
    // Generate file-specific recommendations
    fileResult.recommendations = this.generateFileRecommendations(fileResult);

    return fileResult;
  }

  private async calculateHashes(file: FileHashInput['files'][0], hashTypes: string[]) {
    // Simulate hash calculation
    const hashes = {};
    
    if (hashTypes.includes('md5')) {
      hashes['md5'] = this.generateMockHash(32);
    }
    if (hashTypes.includes('sha1')) {
      hashes['sha1'] = this.generateMockHash(40);
    }
    if (hashTypes.includes('sha256')) {
      hashes['sha256'] = this.generateMockHash(64);
    }
    if (hashTypes.includes('sha512')) {
      hashes['sha512'] = this.generateMockHash(128);
    }

    return hashes;
  }

  private async analyzeFileType(file: FileHashInput['files'][0]) {
    const extension = file.filename.split('.').pop()?.toLowerCase() || '';
    
    const executableExts = ['exe', 'dll', 'msi', 'scr', 'com', 'bat', 'cmd', 'ps1'];
    const documentExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
    const scriptExts = ['js', 'vbs', 'py', 'pl', 'sh'];

    let category: 'executable' | 'document' | 'archive' | 'image' | 'script' | 'other' = 'other';
    
    if (executableExts.includes(extension)) category = 'executable';
    else if (documentExts.includes(extension)) category = 'document';
    else if (archiveExts.includes(extension)) category = 'archive';
    else if (imageExts.includes(extension)) category = 'image';
    else if (scriptExts.includes(extension)) category = 'script';

    return {
      mime: this.getMimeType(extension),
      extension,
      category,
      isPacked: Math.random() > 0.9, // 10% chance of being packed
      isEncrypted: Math.random() > 0.95 // 5% chance of being encrypted
    };
  }

  private async lookupVirusTotal(hash: string) {
    // Simulate VirusTotal lookup
    const engines = [
      'Avast', 'AVG', 'Bitdefender', 'ClamAV', 'ESET', 'Kaspersky', 'McAfee', 'Microsoft', 'Norton', 'Sophos'
    ];
    
    const detections = Math.floor(Math.random() * 15); // 0-14 detections
    const totalEngines = engines.length + Math.floor(Math.random() * 57); // 67 total engines like VT
    
    return {
      detectionRate: `${detections}/${totalEngines}`,
      engines: engines.slice(0, Math.min(detections, engines.length)).map(engine => ({
        engine,
        result: Math.random() > 0.5 ? 'Trojan.Generic' : 'Malware.Generic',
        version: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}`,
        update: new Date().toISOString().split('T')[0]
      })),
      permalink: `https://www.virustotal.com/gui/file/${hash}`,
      scanDate: new Date(),
      totalVotes: {
        harmless: Math.floor(Math.random() * 100),
        malicious: detections > 5 ? Math.floor(Math.random() * 50) : 0,
        suspicious: Math.floor(Math.random() * 10)
      }
    };
  }

  private async lookupHybridAnalysis(hash: string) {
    // Simulate Hybrid Analysis lookup
    const verdicts = ['whitelisted', 'no specific threat', 'suspicious', 'malicious'];
    const verdict = verdicts[Math.floor(Math.random() * verdicts.length)];
    
    return {
      verdict,
      threatScore: verdict === 'malicious' ? Math.floor(Math.random() * 40) + 60 : Math.floor(Math.random() * 30),
      environmentDescription: 'Windows 10 64-bit',
      submitTime: new Date(),
      analysisTime: Math.floor(Math.random() * 300) + 60, // 1-5 minutes
      capabilities: verdict === 'malicious' ? ['network', 'persistence', 'evasion'] : []
    };
  }

  private async lookupLocalDatabase(hashes: any) {
    // Simulate local database lookup
    const sources = [];
    
    if (Math.random() > 0.8) { // 20% chance of being in local database
      sources.push({
        source: 'Local Threat Intel',
        verdict: Math.random() > 0.5 ? 'malicious' as const : 'clean' as const,
        details: 'Previously analyzed sample',
        lastUpdate: new Date()
      });
    }
    
    return sources;
  }

  private async runYaraRules(fileContent: string, filename: string) {
    // Simulate YARA rule matching
    const matches = [];
    
    if (Math.random() > 0.7) { // 30% chance of YARA match
      matches.push({
        rule: 'Suspicious_Strings',
        description: 'Contains suspicious string patterns',
        severity: 'medium' as const,
        tags: ['suspicious', 'strings'],
        strings: ['CreateProcess', 'WriteFile', 'RegSetValue']
      });
    }

    if (filename.toLowerCase().includes('invoice') && Math.random() > 0.8) {
      matches.push({
        rule: 'Phishing_Invoice',
        description: 'Potential phishing document with invoice theme',
        severity: 'high' as const,
        tags: ['phishing', 'social-engineering'],
        strings: ['invoice', 'payment', 'urgent']
      });
    }

    return matches;
  }

  private async analyzePE(file: FileHashInput['files'][0]) {
    // Simulate PE analysis
    return {
      architecture: Math.random() > 0.5 ? 'x86' : 'x64',
      compiler: 'Microsoft Visual C++',
      entryPoint: '0x00401000',
      imports: ['kernel32.dll', 'user32.dll', 'ntdll.dll'],
      exports: Math.random() > 0.7 ? ['DllMain', 'GetVersion'] : [],
      sections: [
        { name: '.text', virtualSize: 8192, rawSize: 8192, characteristics: ['executable', 'readable'] },
        { name: '.data', virtualSize: 4096, rawSize: 4096, characteristics: ['writable', 'readable'] },
        { name: '.rsrc', virtualSize: 2048, rawSize: 2048, characteristics: ['readable'] }
      ],
      anomalies: Math.random() > 0.8 ? ['Unusual section alignment', 'High entropy in .text section'] : []
    };
  }

  private calculateReputation(fileResult: any, config: FileHashConfig) {
    let confidence = 0;
    let overallVerdict = 'unknown';
    const sources = fileResult.reputation.sources.slice();

    // Add VirusTotal results
    if (fileResult.virusTotalResults) {
      const detectionRate = parseInt(fileResult.virusTotalResults.detectionRate.split('/')[0]);
      const totalEngines = parseInt(fileResult.virusTotalResults.detectionRate.split('/')[1]);
      
      if (detectionRate >= config.malwareThreshold) {
        sources.push({
          source: 'VirusTotal',
          verdict: 'malicious',
          details: `${detectionRate}/${totalEngines} engines detected malware`,
          lastUpdate: fileResult.virusTotalResults.scanDate
        });
      } else if (detectionRate > 0) {
        sources.push({
          source: 'VirusTotal',
          verdict: 'suspicious',
          details: `${detectionRate}/${totalEngines} engines flagged file`,
          lastUpdate: fileResult.virusTotalResults.scanDate
        });
      } else {
        sources.push({
          source: 'VirusTotal',
          verdict: 'clean',
          details: 'No malware detected',
          lastUpdate: fileResult.virusTotalResults.scanDate
        });
      }
      
      confidence += 0.4; // VirusTotal adds significant confidence
    }

    // Add Hybrid Analysis results
    if (fileResult.hybridAnalysisResults) {
      const verdict = fileResult.hybridAnalysisResults.verdict === 'malicious' ? 'malicious' : 
                     fileResult.hybridAnalysisResults.verdict === 'suspicious' ? 'suspicious' : 'clean';
      
      sources.push({
        source: 'Hybrid Analysis',
        verdict,
        details: `Threat score: ${fileResult.hybridAnalysisResults.threatScore}`,
        lastUpdate: fileResult.hybridAnalysisResults.submitTime
      });
      
      confidence += 0.3;
    }

    // Factor in YARA matches
    if (fileResult.yaraMatches?.length > 0) {
      const highSeverityMatches = fileResult.yaraMatches.filter(m => m.severity === 'high' || m.severity === 'critical');
      if (highSeverityMatches.length > 0) {
        sources.push({
          source: 'YARA Rules',
          verdict: 'malicious',
          details: `${highSeverityMatches.length} high-severity rule matches`,
          lastUpdate: new Date()
        });
      }
      confidence += 0.2;
    }

    // Calculate overall verdict
    const maliciousCount = sources.filter(s => s.verdict === 'malicious').length;
    const suspiciousCount = sources.filter(s => s.verdict === 'suspicious').length;
    const cleanCount = sources.filter(s => s.verdict === 'clean').length;

    if (maliciousCount > 0 && confidence >= config.trustThreshold) {
      overallVerdict = 'malicious';
    } else if (suspiciousCount > 0 || maliciousCount > 0) {
      overallVerdict = 'suspicious';
    } else if (cleanCount > 0 && confidence >= config.trustThreshold) {
      overallVerdict = 'clean';
    }

    return {
      overall: overallVerdict as 'clean' | 'suspicious' | 'malicious' | 'unknown',
      confidence: Math.min(confidence, 1.0),
      sources
    };
  }

  private identifyRiskFactors(fileResult: any) {
    const riskFactors = [];

    // File type risks
    if (fileResult.fileType.category === 'executable') {
      riskFactors.push({
        factor: 'Executable File',
        severity: 'medium' as const,
        description: 'Executable files can contain malicious code'
      });
    }

    if (fileResult.fileType.isPacked) {
      riskFactors.push({
        factor: 'Packed Executable',
        severity: 'high' as const,
        description: 'File appears to be packed, often used to evade detection'
      });
    }

    // PE-specific risks
    if (fileResult.peAnalysis?.anomalies?.length > 0) {
      riskFactors.push({
        factor: 'PE Anomalies',
        severity: 'high' as const,
        description: `PE structure anomalies detected: ${fileResult.peAnalysis.anomalies.join(', ')}`
      });
    }

    // Size-based risks
    if (fileResult.size > 100 * 1024 * 1024) { // 100MB
      riskFactors.push({
        factor: 'Large File Size',
        severity: 'low' as const,
        description: 'Unusually large file size may indicate bloated malware'
      });
    }

    return riskFactors;
  }

  private generateFileRecommendations(fileResult: any): string[] {
    const recommendations = [];

    if (fileResult.reputation.overall === 'malicious') {
      recommendations.push('Quarantine file immediately');
      recommendations.push('Scan system for related threats');
      recommendations.push('Review file origin and distribution method');
    }

    if (fileResult.reputation.overall === 'suspicious') {
      recommendations.push('Isolate file for further analysis');
      recommendations.push('Monitor system behavior if file was executed');
    }

    if (fileResult.fileType.isPacked) {
      recommendations.push('Unpack file for deeper analysis');
      recommendations.push('Use behavioral analysis in sandboxed environment');
    }

    if (fileResult.yaraMatches?.length > 0) {
      recommendations.push('Review YARA rule matches for IOCs');
      recommendations.push('Check for related file patterns');
    }

    return recommendations;
  }

  private async identifyGlobalThreats(fileResults: any[]) {
    const threats = [];
    
    // Group malicious files by family
    const maliciousFiles = fileResults.filter(f => f.reputation.overall === 'malicious');
    
    if (maliciousFiles.length > 1) {
      threats.push({
        threatFamily: 'Multiple Malware Detections',
        affectedFiles: maliciousFiles.map(f => f.filename),
        severity: 'high' as const,
        description: `${maliciousFiles.length} malicious files detected in batch`,
        indicators: maliciousFiles.map(f => f.hashes.sha256).filter(Boolean),
        mitigation: [
          'Quarantine all affected files',
          'Perform full system scan',
          'Review file sources and distribution vectors'
        ]
      });
    }

    // Check for document-based threats
    const maliciousDocuments = maliciousFiles.filter(f => f.fileType.category === 'document');
    if (maliciousDocuments.length > 0) {
      threats.push({
        threatFamily: 'Malicious Documents',
        affectedFiles: maliciousDocuments.map(f => f.filename),
        severity: 'high' as const,
        description: 'Document-based malware detected',
        indicators: ['macro-enabled documents', 'phishing themes'],
        mitigation: [
          'Disable macros in office applications',
          'Implement document sandboxing',
          'User awareness training'
        ]
      });
    }

    return threats;
  }

  private generateRecommendations(result: FileHashResult, config: FileHashConfig): string[] {
    const recommendations = [];

    if (result.summary.maliciousFiles > 0) {
      recommendations.push('Immediate investigation required for malicious files');
      recommendations.push('Review file handling and security policies');
    }

    if (result.summary.suspiciousFiles > 0) {
      recommendations.push('Additional analysis recommended for suspicious files');
      recommendations.push('Consider behavioral analysis in sandboxed environment');
    }

    if (result.summary.unknownFiles > result.summary.totalFiles * 0.5) {
      recommendations.push('Consider expanding threat intelligence sources');
      recommendations.push('Implement default-deny policy for unknown files');
    }

    if (result.quarantinedFiles.length > 0) {
      recommendations.push(`${result.quarantinedFiles.length} files automatically quarantined`);
      recommendations.push('Review quarantine logs and disposal procedures');
    }

    return recommendations;
  }

  private async quarantineFile(filename: string): Promise<void> {
    // Simulate file quarantine
    console.log(`Quarantining malicious file: ${filename}`);
    // In production, move file to secure quarantine location
  }

  // Helper methods
  private generateMockHash(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getMimeType(extension: string): string {
    const mimeTypes = {
      'exe': 'application/x-msdownload',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'zip': 'application/zip',
      'jpg': 'image/jpeg',
      'js': 'application/javascript',
      'txt': 'text/plain'
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }

  configure(config: Partial<FileHashConfig>) {
    const errors: string[] = [];
    
    if (config.malwareThreshold !== undefined && config.malwareThreshold < 1) {
      errors.push('malwareThreshold must be at least 1');
    }
    
    if (config.trustThreshold !== undefined && (config.trustThreshold < 0 || config.trustThreshold > 1)) {
      errors.push('trustThreshold must be between 0.0 and 1.0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}