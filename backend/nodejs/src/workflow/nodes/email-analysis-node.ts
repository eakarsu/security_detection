import { Injectable } from '@nestjs/common';
import { SecurityNode } from '../interfaces/security-node.interface';

export interface EmailAnalysisConfig {
  checkAttachments: boolean;
  checkUrls: boolean;
  checkHeaders: boolean;
  spamThreshold: number;
  phishingThreshold: number;
  enableDKIMValidation: boolean;
  enableSPFValidation: boolean;
  enableDMARCValidation: boolean;
  quarantineAction: 'none' | 'quarantine' | 'delete';
}

export interface EmailAnalysisInput {
  emailId?: string;
  emailContent?: {
    from: string;
    to: string[];
    subject: string;
    body: string;
    headers: Record<string, string>;
    attachments?: Array<{
      filename: string;
      contentType: string;
      size: number;
      hash?: string;
    }>;
    urls?: string[];
  };
  rawEmail?: string;
}

export interface EmailAnalysisResult {
  emailId: string;
  analysisId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isPhishing: boolean;
  isSpam: boolean;
  threats: Array<{
    type: 'phishing' | 'malware' | 'spam' | 'spoofing' | 'suspicious_attachment' | 'malicious_url';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: string[];
    confidence: number;
  }>;
  urlAnalysis: Array<{
    url: string;
    reputation: 'clean' | 'suspicious' | 'malicious';
    categories: string[];
    redirectChain?: string[];
  }>;
  attachmentAnalysis: Array<{
    filename: string;
    fileType: string;
    hash: string;
    reputation: 'clean' | 'suspicious' | 'malicious';
    scanResults: Record<string, any>;
  }>;
  authenticationResults: {
    dkim: { valid: boolean; domain?: string };
    spf: { valid: boolean; result?: string };
    dmarc: { valid: boolean; policy?: string };
  };
  senderReputation: {
    domain: string;
    ipAddress?: string;
    reputation: 'good' | 'neutral' | 'poor' | 'malicious';
    age: number;
    registrar?: string;
  };
  recommendations: string[];
  timestamp: Date;
}

@Injectable()
export class EmailAnalysisNode extends SecurityNode {
  id = 'email-analysis';
  type = 'analysis';
  category = 'core' as const;
  name = 'Email Analysis';
  description = 'Comprehensive email security analysis including phishing, spam, and malware detection';
  version = '1.2.0';

  getSchema() {
    return {
      inputs: [
        {
          name: 'email',
          type: 'object' as const,
          description: 'Email data to analyze'
        }
      ],
      outputs: [
        {
          name: 'analysis_result',
          type: 'object' as const,
          description: 'Comprehensive email analysis results'
        },
        {
          name: 'risk_score',
          type: 'number' as const,
          description: 'Overall risk score (0-100)'
        },
        {
          name: 'is_threat',
          type: 'boolean' as const,
          description: 'Whether email contains threats'
        }
      ],
      config: [
        {
          name: 'checkAttachments',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Analyze email attachments for malware'
        },
        {
          name: 'checkUrls',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Analyze URLs in email content'
        },
        {
          name: 'checkHeaders',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Analyze email headers for spoofing'
        },
        {
          name: 'spamThreshold',
          type: 'number' as const,
          required: false,
          default: 70,
          description: 'Spam detection threshold (0-100)'
        },
        {
          name: 'phishingThreshold',
          type: 'number' as const,
          required: false,
          default: 60,
          description: 'Phishing detection threshold (0-100)'
        },
        {
          name: 'enableDKIMValidation',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Validate DKIM signatures'
        },
        {
          name: 'enableSPFValidation',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Validate SPF records'
        },
        {
          name: 'enableDMARCValidation',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Validate DMARC policies'
        },
        {
          name: 'quarantineAction',
          type: 'select' as const,
          required: false,
          default: 'quarantine',
          options: ['none', 'quarantine', 'delete'],
          description: 'Action to take on malicious emails'
        }
      ]
    };
  }

  async execute(input: EmailAnalysisInput, config: EmailAnalysisConfig): Promise<EmailAnalysisResult> {
    const analysisId = `email_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Extract email data
      const emailData = input.emailContent || this.parseRawEmail(input.rawEmail || '');
      const emailId = input.emailId || `email_${Date.now()}`;

      // Initialize analysis result
      let riskScore = 0;
      const threats: EmailAnalysisResult['threats'] = [];
      const recommendations: string[] = [];

      // 1. Header Analysis
      let authResults = { dkim: { valid: false }, spf: { valid: false }, dmarc: { valid: false } };
      if (config.checkHeaders) {
        authResults = await this.analyzeEmailHeaders(emailData.headers, config);
        if (!authResults.spf.valid) {
          riskScore += 15;
          threats.push({
            type: 'spoofing',
            severity: 'medium',
            description: 'SPF validation failed',
            evidence: ['SPF record validation failed'],
            confidence: 0.7
          });
        }
      }

      // 2. Sender Reputation Analysis
      const senderReputation = await this.analyzeSenderReputation(emailData.from);
      if (senderReputation.reputation === 'malicious') {
        riskScore += 40;
        threats.push({
          type: 'phishing',
          severity: 'high',
          description: 'Email from known malicious sender',
          evidence: [`Sender ${emailData.from} has poor reputation`],
          confidence: 0.9
        });
      }

      // 3. Content Analysis
      const contentAnalysis = await this.analyzeEmailContent(emailData.body, emailData.subject);
      riskScore += contentAnalysis.riskScore;
      threats.push(...contentAnalysis.threats);

      // 4. URL Analysis
      let urlAnalysis: EmailAnalysisResult['urlAnalysis'] = [];
      if (config.checkUrls && emailData.urls && emailData.urls.length > 0) {
        urlAnalysis = await this.analyzeUrls(emailData.urls);
        const maliciousUrls = urlAnalysis.filter(u => u.reputation === 'malicious');
        if (maliciousUrls.length > 0) {
          riskScore += maliciousUrls.length * 25;
          threats.push({
            type: 'malicious_url',
            severity: 'high',
            description: `Found ${maliciousUrls.length} malicious URLs`,
            evidence: maliciousUrls.map(u => u.url),
            confidence: 0.8
          });
        }
      }

      // 5. Attachment Analysis
      let attachmentAnalysis: EmailAnalysisResult['attachmentAnalysis'] = [];
      if (config.checkAttachments && emailData.attachments && emailData.attachments.length > 0) {
        attachmentAnalysis = await this.analyzeAttachments(emailData.attachments);
        const maliciousAttachments = attachmentAnalysis.filter(a => a.reputation === 'malicious');
        if (maliciousAttachments.length > 0) {
          riskScore += maliciousAttachments.length * 30;
          threats.push({
            type: 'malware',
            severity: 'critical',
            description: `Found ${maliciousAttachments.length} malicious attachments`,
            evidence: maliciousAttachments.map(a => a.filename),
            confidence: 0.9
          });
        }
      }

      // Determine risk level and classifications
      const riskLevel = this.calculateRiskLevel(riskScore);
      const isPhishing = riskScore >= config.phishingThreshold || threats.some(t => t.type === 'phishing');
      const isSpam = riskScore >= config.spamThreshold;

      // Generate recommendations
      if (isPhishing) {
        recommendations.push('Quarantine email immediately');
        recommendations.push('Alert security team');
        recommendations.push('Block sender domain if confirmed malicious');
      }
      if (authResults.dkim.valid === false) {
        recommendations.push('Implement DKIM validation');
      }
      if (threats.some(t => t.type === 'malicious_url')) {
        recommendations.push('Block malicious URLs at network level');
      }

      // Execute quarantine action if needed
      if ((isPhishing || riskLevel === 'critical') && config.quarantineAction !== 'none') {
        await this.executeQuarantineAction(emailId, config.quarantineAction);
        recommendations.push(`Email ${config.quarantineAction}d automatically`);
      }

      return {
        emailId,
        analysisId,
        riskScore: Math.min(riskScore, 100),
        riskLevel,
        isPhishing,
        isSpam,
        threats,
        urlAnalysis,
        attachmentAnalysis,
        authenticationResults: authResults,
        senderReputation,
        recommendations,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Email analysis failed: ${error.message}`);
    }
  }

  private parseRawEmail(rawEmail: string): EmailAnalysisInput['emailContent'] {
    // Basic email parsing - in production, use a proper email parsing library
    const lines = rawEmail.split('\n');
    const headers: Record<string, string> = {};
    let body = '';
    let inHeaders = true;

    for (const line of lines) {
      if (inHeaders && line.trim() === '') {
        inHeaders = false;
        continue;
      }
      
      if (inHeaders && line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        headers[key.trim().toLowerCase()] = valueParts.join(':').trim();
      } else if (!inHeaders) {
        body += line + '\n';
      }
    }

    return {
      from: headers['from'] || '',
      to: [headers['to'] || ''],
      subject: headers['subject'] || '',
      body: body.trim(),
      headers,
      urls: this.extractUrls(body)
    };
  }

  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
    return text.match(urlRegex) || [];
  }

  private async analyzeEmailHeaders(headers: Record<string, string>, config: EmailAnalysisConfig) {
    // Simulate email authentication validation
    return {
      dkim: { 
        valid: config.enableDKIMValidation ? Math.random() > 0.3 : true,
        domain: headers['from']?.split('@')[1] 
      },
      spf: { 
        valid: config.enableSPFValidation ? Math.random() > 0.2 : true,
        result: 'pass' 
      },
      dmarc: { 
        valid: config.enableDMARCValidation ? Math.random() > 0.25 : true,
        policy: 'quarantine' 
      }
    };
  }

  private async analyzeSenderReputation(sender: string): Promise<EmailAnalysisResult['senderReputation']> {
    const domain = sender.split('@')[1] || sender;
    
    // Simulate sender reputation lookup
    const reputations = ['good', 'neutral', 'poor', 'malicious'] as const;
    const reputation = reputations[Math.floor(Math.random() * reputations.length)];
    
    return {
      domain,
      reputation,
      age: Math.floor(Math.random() * 3650), // days
      registrar: 'Example Registrar'
    };
  }

  private async analyzeEmailContent(body: string, subject: string) {
    let riskScore = 0;
    const threats: EmailAnalysisResult['threats'] = [];

    // Phishing indicators
    const phishingKeywords = ['urgent', 'verify account', 'click here', 'suspended', 'confirm identity'];
    const phishingMatches = phishingKeywords.filter(keyword => 
      body.toLowerCase().includes(keyword) || subject.toLowerCase().includes(keyword)
    );
    
    if (phishingMatches.length > 0) {
      riskScore += phishingMatches.length * 10;
      threats.push({
        type: 'phishing',
        severity: 'medium',
        description: 'Contains phishing keywords',
        evidence: phishingMatches,
        confidence: 0.6
      });
    }

    // Suspicious patterns
    if (body.includes('<!DOCTYPE html') && body.includes('<script')) {
      riskScore += 15;
      threats.push({
        type: 'suspicious_attachment',
        severity: 'medium',
        description: 'Contains suspicious HTML/JavaScript content',
        evidence: ['HTML with JavaScript detected'],
        confidence: 0.7
      });
    }

    return { riskScore, threats };
  }

  private async analyzeUrls(urls: string[]): Promise<EmailAnalysisResult['urlAnalysis']> {
    return Promise.all(urls.map(async (url) => {
      // Simulate URL reputation check
      const reputations = ['clean', 'suspicious', 'malicious'] as const;
      const reputation = reputations[Math.floor(Math.random() * reputations.length)];
      
      return {
        url,
        reputation,
        categories: reputation === 'malicious' ? ['phishing', 'malware'] : ['legitimate'],
        redirectChain: reputation === 'suspicious' ? [url, 'https://redirect.example.com'] : undefined
      };
    }));
  }

  private async analyzeAttachments(attachments: EmailAnalysisInput['emailContent']['attachments']): Promise<EmailAnalysisResult['attachmentAnalysis']> {
    if (!attachments) return [];
    
    return Promise.all(attachments.map(async (attachment) => {
      // Simulate attachment scanning
      const reputations = ['clean', 'suspicious', 'malicious'] as const;
      const reputation = reputations[Math.floor(Math.random() * reputations.length)];
      
      return {
        filename: attachment.filename,
        fileType: attachment.contentType,
        hash: attachment.hash || `sha256_${Math.random().toString(36)}`,
        reputation,
        scanResults: {
          engines_scanned: 45,
          detections: reputation === 'malicious' ? 12 : 0,
          scan_date: new Date().toISOString()
        }
      };
    }));
  }

  private calculateRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  private async executeQuarantineAction(emailId: string, action: string): Promise<void> {
    // Simulate quarantine action
    console.log(`Executing ${action} action for email ${emailId}`);
    // In production, integrate with email security gateway or mail server
  }

  configure(config: Partial<EmailAnalysisConfig>) {
    const errors: string[] = [];
    
    if (config.spamThreshold !== undefined && (config.spamThreshold < 0 || config.spamThreshold > 100)) {
      errors.push('spamThreshold must be between 0 and 100');
    }
    
    if (config.phishingThreshold !== undefined && (config.phishingThreshold < 0 || config.phishingThreshold > 100)) {
      errors.push('phishingThreshold must be between 0 and 100');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}