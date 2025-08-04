import { Injectable } from '@nestjs/common';
import { SecurityNode } from '../interfaces/security-node.interface';

export interface SandboxConfig {
  sandboxType: 'vm' | 'container' | 'cloud' | 'hybrid';
  environment: 'windows10' | 'windows11' | 'ubuntu' | 'macos' | 'custom';
  analysisTimeout: number; // minutes
  networkEnabled: boolean;
  internetAccess: boolean;
  enableBehaviorMonitoring: boolean;
  enableNetworkCapture: boolean;
  enableFileSystemMonitoring: boolean;
  enableProcessMonitoring: boolean;
  enableRegistryMonitoring: boolean;
  enableAPIHooking: boolean;
  captureScreenshots: boolean;
  captureMemoryDumps: boolean;
  antiEvasionTechniques: boolean;
}

export interface SandboxInput {
  samples: Array<{
    id: string;
    filename: string;
    fileType: string;
    hash: string;
    size: number;
    content?: string; // base64 encoded
    metadata?: Record<string, any>;
  }>;
  analysisProfile?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  customCommands?: string[];
  analysisId?: string;
}

export interface SandboxResult {
  analysisId: string;
  submissionTime: Date;
  completionTime?: Date;
  duration?: number; // seconds
  status: 'queued' | 'running' | 'completed' | 'failed' | 'timeout';
  
  summary: {
    totalSamples: number;
    analyzedSamples: number;
    maliciousSamples: number;
    suspiciousSamples: number;
    cleanSamples: number;
    errorSamples: number;
  };
  
  samples: Array<{
    sampleId: string;
    filename: string;
    hash: string;
    verdict: 'malicious' | 'suspicious' | 'clean' | 'unknown' | 'error';
    confidence: number;
    riskScore: number;
    
    staticAnalysis: {
      fileType: string;
      packer?: string;
      entropy: number;
      strings: string[];
      imports: string[];
      exports: string[];
      sections: Array<{
        name: string;
        size: number;
        entropy: number;
        suspicious: boolean;
      }>;
      certificates?: Array<{
        subject: string;
        issuer: string;
        valid: boolean;
        timestamp: Date;
      }>;
    };
    
    dynamicAnalysis: {
      executionTime: number;
      processesCreated: Array<{
        pid: number;
        name: string;
        commandLine: string;
        parentPid: number;
        createTime: Date;
        terminateTime?: Date;
      }>;
      filesModified: Array<{
        path: string;
        action: 'created' | 'modified' | 'deleted' | 'renamed';
        timestamp: Date;
        size?: number;
      }>;
      registryChanges: Array<{
        key: string;
        value: string;
        action: 'created' | 'modified' | 'deleted';
        timestamp: Date;
      }>;
      networkConnections: Array<{
        protocol: string;
        localAddress: string;
        localPort: number;
        remoteAddress: string;
        remotePort: number;
        state: string;
        timestamp: Date;
      }>;
      dnsQueries: Array<{
        domain: string;
        queryType: string;
        response: string[];
        timestamp: Date;
      }>;
      httpRequests: Array<{
        url: string;
        method: string;
        headers: Record<string, string>;
        userAgent: string;
        timestamp: Date;
      }>;
    };
    
    behaviors: Array<{
      category: 'persistence' | 'evasion' | 'discovery' | 'collection' | 'exfiltration' | 'impact';
      technique: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      evidence: string[];
      mitreId?: string;
    }>;
    
    iocs: Array<{
      type: 'ip' | 'domain' | 'url' | 'file_hash' | 'registry_key' | 'mutex' | 'user_agent';
      value: string;
      description: string;
      confidence: number;
    }>;
    
    signatures: Array<{
      name: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      category: string;
      matched: boolean;
      details: string;
    }>;
    
    screenshots?: Array<{
      timestamp: Date;
      filename: string;
      description: string;
    }>;
    
    memoryAnalysis?: {
      processName: string;
      injectedCode: boolean;
      suspiciousStrings: string[];
      cryptoKeys: string[];
      networkArtifacts: string[];
    };
  }>;
  
  networkAnalysis: {
    totalConnections: number;
    suspiciousConnections: number;
    blockedConnections: number;
    countries: string[];
    topDomains: Array<{ domain: string; count: number }>;
    protocols: Record<string, number>;
  };
  
  recommendations: string[];
  yara: Array<{
    rule: string;
    description: string;
    tags: string[];
    matches: Array<{
      sampleId: string;
      offset: number;
      matchedString: string;
    }>;
  }>;
  
  environment: {
    os: string;
    version: string;
    architecture: string;
    installedSoftware: string[];
    networkConfiguration: Record<string, any>;
  };
}

@Injectable()
export class SandboxAnalysisNode extends SecurityNode {
  id = 'sandbox-analysis';
  type = 'analysis';
  category = 'core' as const;
  name = 'Sandbox Analysis';
  description = 'Dynamic malware analysis in isolated sandbox environments with behavioral monitoring';
  version = '3.0.0';

  getSchema() {
    return {
      inputs: [
        {
          name: 'samples',
          type: 'array' as const,
          description: 'File samples to analyze in sandbox'
        },
        {
          name: 'analysis_profile',
          type: 'string' as const,
          description: 'Predefined analysis profile'
        },
        {
          name: 'priority',
          type: 'string' as const,
          description: 'Analysis priority level'
        }
      ],
      outputs: [
        {
          name: 'analysis_results',
          type: 'object' as const,
          description: 'Comprehensive sandbox analysis results'
        },
        {
          name: 'verdict',
          type: 'string' as const,
          description: 'Overall analysis verdict'
        },
        {
          name: 'risk_score',
          type: 'number' as const,
          description: 'Combined risk score (0-100)'
        },
        {
          name: 'iocs',
          type: 'array' as const,
          description: 'Indicators of Compromise extracted'
        },
        {
          name: 'behaviors',
          type: 'array' as const,
          description: 'Malicious behaviors detected'
        }
      ],
      config: [
        {
          name: 'sandboxType',
          type: 'select' as const,
          required: false,
          default: 'vm',
          options: ['vm', 'container', 'cloud', 'hybrid'],
          description: 'Type of sandbox environment to use'
        },
        {
          name: 'environment',
          type: 'select' as const,
          required: false,
          default: 'windows10',
          options: ['windows10', 'windows11', 'ubuntu', 'macos', 'custom'],
          description: 'Operating system environment'
        },
        {
          name: 'analysisTimeout',
          type: 'number' as const,
          required: false,
          default: 15,
          description: 'Maximum analysis time in minutes'
        },
        {
          name: 'networkEnabled',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Enable network connectivity in sandbox'
        },
        {
          name: 'internetAccess',
          type: 'boolean' as const,
          required: false,
          default: false,
          description: 'Allow internet access (high risk)'
        },
        {
          name: 'enableBehaviorMonitoring',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Monitor behavioral patterns'
        },
        {
          name: 'enableNetworkCapture',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Capture network traffic'
        },
        {
          name: 'enableFileSystemMonitoring',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Monitor file system changes'
        },
        {
          name: 'enableProcessMonitoring',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Monitor process creation and termination'
        },
        {
          name: 'enableRegistryMonitoring',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Monitor Windows registry changes'
        },
        {
          name: 'enableAPIHooking',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Hook API calls for detailed analysis'
        },
        {
          name: 'captureScreenshots',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Capture periodic screenshots'
        },
        {
          name: 'captureMemoryDumps',
          type: 'boolean' as const,
          required: false,
          default: false,
          description: 'Capture memory dumps for analysis'
        },
        {
          name: 'antiEvasionTechniques',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Enable anti-evasion techniques'
        }
      ]
    };
  }

  async execute(input: SandboxInput, config: SandboxConfig): Promise<SandboxResult> {
    const analysisId = input.analysisId || `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const submissionTime = new Date();
    
    try {
      console.log(`Starting sandbox analysis ${analysisId} for ${input.samples.length} samples`);
      
      // Initialize result structure
      const result: SandboxResult = {
        analysisId,
        submissionTime,
        status: 'running',
        summary: {
          totalSamples: input.samples.length,
          analyzedSamples: 0,
          maliciousSamples: 0,
          suspiciousSamples: 0,
          cleanSamples: 0,
          errorSamples: 0
        },
        samples: [],
        networkAnalysis: {
          totalConnections: 0,
          suspiciousConnections: 0,
          blockedConnections: 0,
          countries: [],
          topDomains: [],
          protocols: {}
        },
        recommendations: [],
        yara: [],
        environment: {
          os: config.environment,
          version: this.getOSVersion(config.environment),
          architecture: 'x64',
          installedSoftware: this.getInstalledSoftware(config.environment),
          networkConfiguration: {
            gateway: '192.168.1.1',
            dns: ['8.8.8.8', '8.8.4.4'],
            subnet: '192.168.1.0/24'
          }
        }
      };

      // Process each sample
      for (const sample of input.samples) {
        try {
          const sampleResult = await this.analyzeSample(sample, config);
          result.samples.push(sampleResult);
          result.summary.analyzedSamples++;

          // Update summary counts
          switch (sampleResult.verdict) {
            case 'malicious': result.summary.maliciousSamples++; break;
            case 'suspicious': result.summary.suspiciousSamples++; break;
            case 'clean': result.summary.cleanSamples++; break;
            default: result.summary.errorSamples++; break;
          }

          // Aggregate network analysis
          result.networkAnalysis.totalConnections += sampleResult.dynamicAnalysis.networkConnections.length;
          result.networkAnalysis.suspiciousConnections += sampleResult.dynamicAnalysis.networkConnections.filter(
            conn => this.isSuspiciousConnection(conn.remoteAddress)
          ).length;

        } catch (error) {
          console.error(`Failed to analyze sample ${sample.id}:`, error.message);
          result.summary.errorSamples++;
        }
      }

      // Generate YARA matches
      result.yara = await this.runYaraAnalysis(result.samples);
      
      // Generate recommendations
      result.recommendations = this.generateSandboxRecommendations(result);
      
      // Finalize analysis
      result.completionTime = new Date();
      result.duration = Math.round((result.completionTime.getTime() - submissionTime.getTime()) / 1000);
      result.status = 'completed';

      console.log(`Sandbox analysis ${analysisId} completed. Malicious: ${result.summary.maliciousSamples}, Suspicious: ${result.summary.suspiciousSamples}`);
      return result;

    } catch (error) {
      throw new Error(`Sandbox analysis failed: ${error.message}`);
    }
  }

  private async analyzeSample(sample: SandboxInput['samples'][0], config: SandboxConfig) {
    console.log(`Analyzing sample: ${sample.filename} (${sample.hash})`);
    
    // Static Analysis
    const staticAnalysis = await this.performStaticAnalysis(sample);
    
    // Dynamic Analysis (simulate sandbox execution)
    const dynamicAnalysis = await this.performDynamicAnalysis(sample, config);
    
    // Behavior Analysis
    const behaviors = await this.analyzeBehaviors(dynamicAnalysis, staticAnalysis);
    
    // Extract IOCs
    const iocs = await this.extractIOCs(dynamicAnalysis, staticAnalysis);
    
    // Run signature matching
    const signatures = await this.matchSignatures(sample, dynamicAnalysis, behaviors);
    
    // Calculate verdict and risk score
    const verdict = this.calculateVerdict(behaviors, signatures, staticAnalysis);
    const confidence = this.calculateConfidence(behaviors, signatures, dynamicAnalysis);
    const riskScore = this.calculateSampleRiskScore(verdict, behaviors, iocs);

    return {
      sampleId: sample.id,
      filename: sample.filename,
      hash: sample.hash,
      verdict,
      confidence,
      riskScore,
      staticAnalysis,
      dynamicAnalysis,
      behaviors,
      iocs,
      signatures,
      screenshots: config.captureScreenshots ? await this.generateScreenshots() : undefined,
      memoryAnalysis: config.captureMemoryDumps ? await this.analyzeMemory(sample) : undefined
    };
  }

  private async performStaticAnalysis(sample: SandboxInput['samples'][0]) {
    // Simulate static analysis
    const strings = [
      'CreateFile', 'WriteFile', 'RegSetValue', 'CreateProcess',
      'VirtualAlloc', 'LoadLibrary', 'GetProcAddress'
    ];
    
    const imports = [
      'kernel32.dll!CreateFileA', 'advapi32.dll!RegSetValueExA',
      'user32.dll!MessageBoxA', 'wininet.dll!InternetOpenA'
    ];

    return {
      fileType: this.identifyFileType(sample.filename),
      packer: Math.random() > 0.8 ? 'UPX' : undefined,
      entropy: Math.random() * 8,
      strings: strings.slice(0, Math.floor(Math.random() * strings.length) + 1),
      imports: imports.slice(0, Math.floor(Math.random() * imports.length) + 1),
      exports: Math.random() > 0.7 ? ['DllMain', 'ServiceMain'] : [],
      sections: [
        { name: '.text', size: 8192, entropy: 6.5, suspicious: false },
        { name: '.data', size: 4096, entropy: 3.2, suspicious: false },
        { name: '.rsrc', size: 2048, entropy: 7.8, suspicious: Math.random() > 0.8 }
      ],
      certificates: Math.random() > 0.6 ? [{
        subject: 'CN=Sample Software Inc.',
        issuer: 'CN=VeriSign Class 3 Code Signing CA',
        valid: Math.random() > 0.3,
        timestamp: new Date()
      }] : undefined
    };
  }

  private async performDynamicAnalysis(sample: SandboxInput['samples'][0], config: SandboxConfig) {
    // Simulate dynamic execution monitoring
    const processCount = Math.floor(Math.random() * 5) + 1;
    const processes = [];
    
    for (let i = 0; i < processCount; i++) {
      processes.push({
        pid: 1000 + i,
        name: i === 0 ? sample.filename : `child_process_${i}.exe`,
        commandLine: i === 0 ? sample.filename : `cmd.exe /c child_process_${i}.exe`,
        parentPid: i === 0 ? 500 : 1000,
        createTime: new Date(Date.now() - Math.random() * 60000),
        terminateTime: Math.random() > 0.3 ? new Date() : undefined
      });
    }

    const filesModified = [
      { path: 'C:\\Windows\\Temp\\malware.tmp', action: 'created' as const, timestamp: new Date(), size: 1024 },
      { path: 'C:\\Users\\User\\Documents\\data.txt', action: 'modified' as const, timestamp: new Date() }
    ];

    const registryChanges = [
      { 
        key: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\\Malware', 
        value: 'C:\\Windows\\Temp\\malware.exe', 
        action: 'created' as const, 
        timestamp: new Date() 
      }
    ];

    const networkConnections = [];
    if (config.networkEnabled) {
      const connectionCount = Math.floor(Math.random() * 10);
      for (let i = 0; i < connectionCount; i++) {
        networkConnections.push({
          protocol: 'TCP',
          localAddress: '192.168.1.100',
          localPort: 50000 + i,
          remoteAddress: this.generateRandomIP(),
          remotePort: Math.random() > 0.5 ? 80 : 443,
          state: 'ESTABLISHED',
          timestamp: new Date(Date.now() - Math.random() * 30000)
        });
      }
    }

    return {
      executionTime: Math.floor(Math.random() * config.analysisTimeout * 60),
      processesCreated: processes,
      filesModified,
      registryChanges,
      networkConnections,
      dnsQueries: [
        { domain: 'malware-c2.com', queryType: 'A', response: ['192.168.1.50'], timestamp: new Date() },
        { domain: 'update.example.com', queryType: 'A', response: ['203.0.113.10'], timestamp: new Date() }
      ],
      httpRequests: [
        {
          url: 'http://malware-c2.com/beacon',
          method: 'POST',
          headers: { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json' },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          timestamp: new Date()
        }
      ]
    };
  }

  private async analyzeBehaviors(dynamicAnalysis: any, staticAnalysis: any) {
    const behaviors = [];

    // Persistence behavior
    if (dynamicAnalysis.registryChanges.some((change: any) => change.key.includes('Run'))) {
      behaviors.push({
        category: 'persistence' as const,
        technique: 'Registry Run Keys',
        description: 'Modifies registry run keys for persistence',
        severity: 'high' as const,
        evidence: ['Registry key modification in Run location'],
        mitreId: 'T1547.001'
      });
    }

    // Network behavior
    if (dynamicAnalysis.networkConnections.length > 0) {
      const suspiciousConnections = dynamicAnalysis.networkConnections.filter(
        (conn: any) => this.isSuspiciousConnection(conn.remoteAddress)
      );
      
      if (suspiciousConnections.length > 0) {
        behaviors.push({
          category: 'exfiltration' as const,
          technique: 'Exfiltration Over C2 Channel',
          description: 'Communicates with suspicious external hosts',
          severity: 'critical' as const,
          evidence: suspiciousConnections.map((conn: any) => `Connection to ${conn.remoteAddress}:${conn.remotePort}`),
          mitreId: 'T1041'
        });
      }
    }

    // Process injection behavior
    if (dynamicAnalysis.processesCreated.length > 1) {
      behaviors.push({
        category: 'evasion' as const,
        technique: 'Process Injection',
        description: 'Creates multiple processes, potential injection',
        severity: 'medium' as const,
        evidence: [`Created ${dynamicAnalysis.processesCreated.length} processes`],
        mitreId: 'T1055'
      });
    }

    return behaviors;
  }

  private async extractIOCs(dynamicAnalysis: any, staticAnalysis: any) {
    const iocs = [];

    // Network IOCs
    dynamicAnalysis.networkConnections.forEach((conn: any) => {
      if (this.isSuspiciousConnection(conn.remoteAddress)) {
        iocs.push({
          type: 'ip' as const,
          value: conn.remoteAddress,
          description: 'Suspicious network connection',
          confidence: 0.8
        });
      }
    });

    // Domain IOCs
    dynamicAnalysis.dnsQueries.forEach((query: any) => {
      if (query.domain.includes('malware') || query.domain.includes('c2')) {
        iocs.push({
          type: 'domain' as const,
          value: query.domain,
          description: 'Suspicious domain query',
          confidence: 0.9
        });
      }
    });

    // File IOCs
    dynamicAnalysis.filesModified.forEach((file: any) => {
      if (file.action === 'created' && file.path.includes('Temp')) {
        iocs.push({
          type: 'file_hash' as const,
          value: `sha256_${Math.random().toString(36)}`,
          description: 'Dropped file in temp directory',
          confidence: 0.7
        });
      }
    });

    // Registry IOCs
    dynamicAnalysis.registryChanges.forEach((change: any) => {
      iocs.push({
        type: 'registry_key' as const,
        value: change.key,
        description: 'Modified registry key',
        confidence: 0.6
      });
    });

    return iocs;
  }

  private async matchSignatures(sample: any, dynamicAnalysis: any, behaviors: any[]) {
    const signatures = [];

    // Behavior-based signatures
    if (behaviors.some(b => b.category === 'persistence')) {
      signatures.push({
        name: 'Persistence_Registry_Modification',
        description: 'Modifies registry for persistence',
        severity: 'high' as const,
        category: 'persistence',
        matched: true,
        details: 'Registry Run key modification detected'
      });
    }

    if (dynamicAnalysis.networkConnections.length > 5) {
      signatures.push({
        name: 'High_Network_Activity',
        description: 'Unusual network activity detected',
        severity: 'medium' as const,
        category: 'network',
        matched: true,
        details: `${dynamicAnalysis.networkConnections.length} network connections`
      });
    }

    // File-based signatures
    if (sample.filename.toLowerCase().includes('invoice') || sample.filename.toLowerCase().includes('payment')) {
      signatures.push({
        name: 'Suspicious_Filename_Pattern',
        description: 'Filename matches phishing patterns',
        severity: 'medium' as const,
        category: 'social_engineering',
        matched: true,
        details: 'Filename contains invoice/payment keywords'
      });
    }

    return signatures;
  }

  private calculateVerdict(behaviors: any[], signatures: any[], staticAnalysis: any): 'malicious' | 'suspicious' | 'clean' | 'unknown' {
    const criticalBehaviors = behaviors.filter(b => b.severity === 'critical').length;
    const highSeveritySignatures = signatures.filter(s => s.severity === 'high' && s.matched).length;
    
    if (criticalBehaviors > 0 || highSeveritySignatures > 1) {
      return 'malicious';
    }
    
    if (behaviors.length > 2 || highSeveritySignatures > 0) {
      return 'suspicious';
    }
    
    if (behaviors.length === 0 && signatures.filter(s => s.matched).length === 0) {
      return 'clean';
    }
    
    return 'unknown';
  }

  private calculateConfidence(behaviors: any[], signatures: any[], dynamicAnalysis: any): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on evidence
    confidence += behaviors.length * 0.1;
    confidence += signatures.filter(s => s.matched).length * 0.05;
    confidence += Math.min(dynamicAnalysis.networkConnections.length * 0.02, 0.2);
    
    return Math.min(confidence, 1.0);
  }

  private calculateSampleRiskScore(verdict: string, behaviors: any[], iocs: any[]): number {
    let score = 0;
    
    // Base score by verdict
    switch (verdict) {
      case 'malicious': score = 80; break;
      case 'suspicious': score = 50; break;
      case 'clean': score = 10; break;
      default: score = 30; break;
    }
    
    // Add behavior scores
    behaviors.forEach(behavior => {
      switch (behavior.severity) {
        case 'critical': score += 15; break;
        case 'high': score += 10; break;
        case 'medium': score += 5; break;
        case 'low': score += 2; break;
      }
    });
    
    // Add IOC scores
    score += Math.min(iocs.length * 2, 20);
    
    return Math.min(score, 100);
  }

  private async runYaraAnalysis(samples: any[]) {
    // Simulate YARA rule matching
    const yaraRules = [
      {
        rule: 'Trojan_Generic',
        description: 'Generic trojan behavior patterns',
        tags: ['trojan', 'malware'],
        matches: samples
          .filter(() => Math.random() > 0.7)
          .map(sample => ({
            sampleId: sample.sampleId,
            offset: Math.floor(Math.random() * 1000),
            matchedString: 'CreateProcess'
          }))
      },
      {
        rule: 'Persistence_Registry',
        description: 'Registry persistence mechanisms',
        tags: ['persistence', 'registry'],
        matches: samples
          .filter(sample => sample.behaviors.some((b: any) => b.category === 'persistence'))
          .map(sample => ({
            sampleId: sample.sampleId,
            offset: Math.floor(Math.random() * 1000),
            matchedString: 'Software\\Microsoft\\Windows\\CurrentVersion\\Run'
          }))
      }
    ];

    return yaraRules.filter(rule => rule.matches.length > 0);
  }

  private generateSandboxRecommendations(result: SandboxResult): string[] {
    const recommendations = [];

    if (result.summary.maliciousSamples > 0) {
      recommendations.push('Quarantine all malicious samples immediately');
      recommendations.push('Block network IOCs at perimeter defenses');
      recommendations.push('Hunt for similar samples in environment');
    }

    if (result.summary.suspiciousSamples > 0) {
      recommendations.push('Further investigate suspicious samples');
      recommendations.push('Monitor related network activity');
    }

    if (result.networkAnalysis.suspiciousConnections > 5) {
      recommendations.push('Review firewall rules for suspicious destinations');
      recommendations.push('Implement DNS filtering for malicious domains');
    }

    const persistenceBehaviors = result.samples.some(s => 
      s.behaviors.some(b => b.category === 'persistence')
    );
    if (persistenceBehaviors) {
      recommendations.push('Audit system startup locations and registry keys');
      recommendations.push('Implement application whitelisting');
    }

    return recommendations;
  }

  private async generateScreenshots() {
    // Simulate screenshot capture
    const screenshots = [];
    const screenshotCount = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < screenshotCount; i++) {
      screenshots.push({
        timestamp: new Date(Date.now() - Math.random() * 300000), // Last 5 minutes
        filename: `screenshot_${i + 1}.png`,
        description: `Desktop activity at ${new Date().toLocaleTimeString()}`
      });
    }
    
    return screenshots;
  }

  private async analyzeMemory(sample: any) {
    // Simulate memory analysis
    return {
      processName: sample.filename,
      injectedCode: Math.random() > 0.7,
      suspiciousStrings: ['CreateRemoteThread', 'VirtualAllocEx', 'WriteProcessMemory'],
      cryptoKeys: Math.random() > 0.8 ? ['AES_KEY_12345'] : [],
      networkArtifacts: ['192.168.1.50:80', 'malware-c2.com']
    };
  }

  // Helper methods
  private identifyFileType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'exe': 'Portable Executable',
      'dll': 'Dynamic Link Library', 
      'pdf': 'PDF Document',
      'doc': 'Microsoft Word Document',
      'zip': 'ZIP Archive'
    };
    return typeMap[extension || ''] || 'Unknown';
  }

  private getOSVersion(environment: string): string {
    const versions: Record<string, string> = {
      'windows10': '10.0.19042',
      'windows11': '10.0.22000',
      'ubuntu': '20.04.3 LTS',
      'macos': '12.0.1'
    };
    return versions[environment] || '1.0.0';
  }

  private getInstalledSoftware(environment: string): string[] {
    if (environment.startsWith('windows')) {
      return ['Microsoft Office 2019', 'Adobe Reader DC', 'Chrome 96.0', 'Firefox 95.0'];
    } else if (environment === 'ubuntu') {
      return ['LibreOffice 7.2', 'Firefox 95.0', 'Thunderbird 91.0'];
    } else if (environment === 'macos') {
      return ['Safari 15.1', 'Pages 11.2', 'Numbers 11.2'];
    }
    return [];
  }

  private generateRandomIP(): string {
    // Generate IPs that might be suspicious
    const suspiciousRanges = ['192.168.1', '10.0.0', '203.0.113'];
    const range = suspiciousRanges[Math.floor(Math.random() * suspiciousRanges.length)];
    return `${range}.${Math.floor(Math.random() * 254) + 1}`;
  }

  private isSuspiciousConnection(ip: string): boolean {
    // Simple heuristic for suspicious IPs
    return ip.startsWith('203.0.113') || // TEST-NET-3
           ip.includes('malware') ||
           Math.random() > 0.8; // Random suspicion
  }

  configure(config: Partial<SandboxConfig>) {
    const errors: string[] = [];
    
    if (config.analysisTimeout !== undefined && config.analysisTimeout < 1) {
      errors.push('analysisTimeout must be at least 1 minute');
    }
    
    if (config.analysisTimeout !== undefined && config.analysisTimeout > 60) {
      errors.push('analysisTimeout cannot exceed 60 minutes');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}