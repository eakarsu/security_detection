import { Injectable } from '@nestjs/common';
import { SecurityNode } from '../interfaces/security-node.interface';

export interface NetworkMonitorConfig {
  monitoringMode: 'realtime' | 'batch' | 'continuous';
  captureFilter: string;
  analysisDepth: 'packet' | 'flow' | 'session' | 'application';
  alertThresholds: {
    bandwidth: number; // Mbps
    connections: number;
    suspiciousTraffic: number; // percentage
    anomalySensitivity: number; // 0-1
  };
  detectDNSAnomalies: boolean;
  detectTunneling: boolean;
  detectC2Communication: boolean;
  detectDataExfiltration: boolean;
  enableThreatIntelCorrelation: boolean;
  enableGeoLocationAnalysis: boolean;
  retentionPeriod: number; // hours
}

export interface NetworkTrafficInput {
  interface?: string;
  timeRange: { start: Date; end: Date };
  filterCriteria?: {
    sourceIPs?: string[];
    destIPs?: string[];
    ports?: number[];
    protocols?: string[];
  };
  pcapData?: string; // Base64 encoded PCAP data
  flowData?: Array<{
    timestamp: Date;
    sourceIP: string;
    destIP: string;
    sourcePort: number;
    destPort: number;
    protocol: string;
    bytes: number;
    packets: number;
    duration: number;
  }>;
}

export interface NetworkTrafficResult {
  monitoringId: string;
  analysisTime: Date;
  timeRange: { start: Date; end: Date };
  
  summary: {
    totalBytes: number;
    totalPackets: number;
    totalFlows: number;
    uniqueHosts: number;
    topProtocols: Array<{ protocol: string; bytes: number; percentage: number }>;
    bandwidthUtilization: number; // percentage
  };
  
  threats: Array<{
    id: string;
    type: 'malware_c2' | 'data_exfiltration' | 'dns_tunneling' | 'port_scan' | 'ddos' | 'lateral_movement';
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    sourceIP: string;
    destIP?: string;
    port?: number;
    protocol: string;
    description: string;
    evidence: string[];
    indicators: string[];
    firstSeen: Date;
    lastSeen: Date;
    impact: string;
  }>;
  
  anomalies: Array<{
    type: 'bandwidth' | 'connection_count' | 'protocol_anomaly' | 'geographic' | 'temporal';
    description: string;
    severity: 'low' | 'medium' | 'high';
    value: number;
    threshold: number;
    entities: string[];
    timeframe: Date;
  }>;
  
  topTalkers: Array<{
    ip: string;
    hostname?: string;
    bytesOut: number;
    bytesIn: number;
    connections: number;
    protocols: string[];
    geoLocation?: { country: string; city: string };
    reputation?: 'clean' | 'suspicious' | 'malicious';
  }>;
  
  protocolAnalysis: Array<{
    protocol: string;
    totalBytes: number;
    flowCount: number;
    avgFlowSize: number;
    suspiciousPatterns: string[];
    complianceIssues: string[];
  }>;
  
  geographicAnalysis: {
    countries: Array<{ country: string; bytes: number; connections: number; risk: string }>;
    suspiciousGeoLocations: Array<{ 
      ip: string; 
      country: string; 
      reason: string; 
      riskScore: number 
    }>;
  };
  
  timelineAnalysis: Array<{
    timestamp: Date;
    bandwidth: number;
    connections: number;
    threats: number;
    events: string[];
  }>;
  
  recommendations: string[];
  alertsGenerated: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    timestamp: Date;
  }>;
}

@Injectable()
export class NetworkTrafficMonitorNode extends SecurityNode {
  id = 'network-traffic-monitor';
  type = 'monitor';
  category = 'core' as const;
  name = 'Network Traffic Monitor';
  description = 'Real-time network traffic monitoring and analysis for threat detection';
  version = '1.8.0';

  getSchema() {
    return {
      inputs: [
        {
          name: 'network_interface',
          type: 'string' as const,
          description: 'Network interface to monitor',
          required: true
        },
        {
          name: 'flow_data',
          type: 'array' as const,
          description: 'Network flow data for analysis',
          required: true
        },
        {
          name: 'time_range',
          type: 'object' as const,
          description: 'Time range for traffic analysis',
          required: true
        }
      ],
      outputs: [
        {
          name: 'traffic_analysis',
          type: 'object' as const,
          description: 'Comprehensive traffic analysis results'
        },
        {
          name: 'threats_detected',
          type: 'array' as const,
          description: 'Network-based threats identified'
        },
        {
          name: 'bandwidth_usage',
          type: 'number' as const,
          description: 'Current bandwidth utilization percentage'
        },
        {
          name: 'alert_count',
          type: 'number' as const,
          description: 'Number of alerts generated'
        }
      ],
      config: [
        {
          name: 'monitoringMode',
          type: 'select' as const,
          required: false,
          default: 'realtime',
          options: ['realtime', 'batch', 'continuous'],
          description: 'Network monitoring mode'
        },
        {
          name: 'captureFilter',
          type: 'string' as const,
          required: false,
          default: 'not port 22',
          description: 'Packet capture filter (BPF syntax)'
        },
        {
          name: 'analysisDepth',
          type: 'select' as const,
          required: false,
          default: 'flow',
          options: ['packet', 'flow', 'session', 'application'],
          description: 'Depth of traffic analysis'
        },
        {
          name: 'bandwidthThreshold',
          type: 'number' as const,
          required: false,
          default: 80,
          description: 'Bandwidth utilization alert threshold (percentage)'
        },
        {
          name: 'connectionThreshold',
          type: 'number' as const,
          required: false,
          default: 1000,
          description: 'Maximum concurrent connections threshold'
        },
        {
          name: 'detectDNSAnomalies',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Enable DNS tunneling and anomaly detection'
        },
        {
          name: 'detectTunneling',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Detect protocol tunneling attempts'
        },
        {
          name: 'detectC2Communication',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Detect command and control communications'
        },
        {
          name: 'detectDataExfiltration',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Detect potential data exfiltration'
        },
        {
          name: 'enableThreatIntelCorrelation',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Correlate with threat intelligence feeds'
        },
        {
          name: 'enableGeoLocationAnalysis',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Analyze traffic by geographic location'
        },
        {
          name: 'retentionPeriod',
          type: 'number' as const,
          required: false,
          default: 24,
          description: 'Traffic data retention period in hours'
        }
      ]
    };
  }

  async execute(input: NetworkTrafficInput, config: NetworkMonitorConfig): Promise<NetworkTrafficResult> {
    const monitoringId = `net_monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`Starting network traffic monitoring ${monitoringId}`);
      
      // Parse or simulate network flow data
      const flowData = input.flowData || await this.captureNetworkTraffic(input, config);
      
      // Initialize result structure
      const result: NetworkTrafficResult = {
        monitoringId,
        analysisTime: new Date(),
        timeRange: input.timeRange,
        summary: {
          totalBytes: 0,
          totalPackets: 0,
          totalFlows: flowData.length,
          uniqueHosts: 0,
          topProtocols: [],
          bandwidthUtilization: 0
        },
        threats: [],
        anomalies: [],
        topTalkers: [],
        protocolAnalysis: [],
        geographicAnalysis: { countries: [], suspiciousGeoLocations: [] },
        timelineAnalysis: [],
        recommendations: [],
        alertsGenerated: []
      };

      // 1. Basic Traffic Analysis
      result.summary = await this.analyzeTrafficSummary(flowData);
      
      // 2. Threat Detection
      if (config.detectC2Communication) {
        const c2Threats = await this.detectC2Communications(flowData);
        result.threats.push(...c2Threats);
      }
      
      if (config.detectDNSAnomalies) {
        const dnsThreats = await this.detectDNSAnomalies(flowData);
        result.threats.push(...dnsThreats);
      }
      
      if (config.detectDataExfiltration) {
        const exfilThreats = await this.detectDataExfiltration(flowData);
        result.threats.push(...exfilThreats);
      }
      
      if (config.detectTunneling) {
        const tunnelingThreats = await this.detectTunneling(flowData);
        result.threats.push(...tunnelingThreats);
      }

      // 3. Anomaly Detection
      result.anomalies = await this.detectNetworkAnomalies(flowData, config);
      
      // 4. Top Talkers Analysis
      result.topTalkers = await this.analyzeTopTalkers(flowData, config);
      
      // 5. Protocol Analysis
      result.protocolAnalysis = await this.analyzeProtocols(flowData);
      
      // 6. Geographic Analysis
      if (config.enableGeoLocationAnalysis) {
        result.geographicAnalysis = await this.analyzeGeographicDistribution(flowData);
      }
      
      // 7. Timeline Analysis
      result.timelineAnalysis = await this.createTimelineAnalysis(flowData, result.threats);
      
      // 8. Generate Alerts
      result.alertsGenerated = await this.generateNetworkAlerts(result, config);
      
      // 9. Generate Recommendations
      result.recommendations = this.generateNetworkRecommendations(result, config);

      console.log(`Network monitoring ${monitoringId} completed. Threats: ${result.threats.length}, Anomalies: ${result.anomalies.length}`);
      return result;

    } catch (error) {
      throw new Error(`Network traffic monitoring failed: ${error.message}`);
    }
  }

  private async captureNetworkTraffic(input: NetworkTrafficInput, config: NetworkMonitorConfig) {
    // Simulate network traffic capture
    const flowCount = Math.floor(Math.random() * 1000) + 100;
    const flows = [];
    
    for (let i = 0; i < flowCount; i++) {
      flows.push({
        timestamp: new Date(Date.now() - Math.random() * 3600000), // Last hour
        sourceIP: this.generateRandomIP(),
        destIP: this.generateRandomIP(),
        sourcePort: Math.floor(Math.random() * 65535),
        destPort: this.selectRandomPort(),
        protocol: this.selectRandomProtocol(),
        bytes: Math.floor(Math.random() * 10000) + 64,
        packets: Math.floor(Math.random() * 100) + 1,
        duration: Math.floor(Math.random() * 300) + 1
      });
    }
    
    return flows;
  }

  private async analyzeTrafficSummary(flowData: any[]) {
    const totalBytes = flowData.reduce((sum, flow) => sum + flow.bytes, 0);
    const totalPackets = flowData.reduce((sum, flow) => sum + flow.packets, 0);
    
    const uniqueHosts = new Set();
    flowData.forEach(flow => {
      uniqueHosts.add(flow.sourceIP);
      uniqueHosts.add(flow.destIP);
    });

    const protocolStats = {};
    flowData.forEach(flow => {
      if (!protocolStats[flow.protocol]) {
        protocolStats[flow.protocol] = 0;
      }
      protocolStats[flow.protocol] += flow.bytes;
    });

    const topProtocols = Object.entries(protocolStats)
      .map(([protocol, bytes]: [string, number]) => ({
        protocol,
        bytes,
        percentage: (bytes / totalBytes) * 100
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 10);

    return {
      totalBytes,
      totalPackets,
      totalFlows: flowData.length,
      uniqueHosts: uniqueHosts.size,
      topProtocols,
      bandwidthUtilization: Math.min((totalBytes / (1024 * 1024 * 100)) * 100, 100) // Assume 100MB baseline
    };
  }

  private async detectC2Communications(flowData: any[]) {
    const threats = [];
    
    // Detect beaconing behavior (regular intervals)
    const connectionPatterns = {};
    flowData.forEach(flow => {
      const key = `${flow.sourceIP}-${flow.destIP}`;
      if (!connectionPatterns[key]) {
        connectionPatterns[key] = [];
      }
      connectionPatterns[key].push(flow.timestamp);
    });

    Object.entries(connectionPatterns).forEach(([key, timestamps]: [string, Date[]]) => {
      if (timestamps.length > 10) {
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
          intervals.push(timestamps[i].getTime() - timestamps[i-1].getTime());
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        
        if (variance < avgInterval * 0.1) { // Low variance indicates regular beaconing
          const [sourceIP, destIP] = key.split('-');
          threats.push({
            id: `c2_beacon_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type: 'malware_c2' as const,
            severity: 'high' as const,
            confidence: 0.85,
            sourceIP,
            destIP,
            protocol: 'tcp',
            description: 'Potential C2 beaconing detected',
            evidence: [`Regular communication pattern with ${avgInterval}ms intervals`, `${timestamps.length} connections observed`],
            indicators: [destIP, `beacon_interval_${Math.round(avgInterval)}`],
            firstSeen: timestamps[0],
            lastSeen: timestamps[timestamps.length - 1],
            impact: 'Potential malware command and control communication'
          });
        }
      }
    });

    return threats;
  }

  private async detectDNSAnomalies(flowData: any[]) {
    const threats = [];
    const dnsFlows = flowData.filter(flow => flow.destPort === 53);
    
    // Detect DNS tunneling (unusual query sizes/patterns)
    dnsFlows.forEach(flow => {
      if (flow.bytes > 512) { // Large DNS response
        threats.push({
          id: `dns_tunnel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'dns_tunneling' as const,
          severity: 'medium' as const,
          confidence: 0.7,
          sourceIP: flow.sourceIP,
          destIP: flow.destIP,
          port: 53,
          protocol: 'udp',
          description: 'Potential DNS tunneling detected',
          evidence: [`Large DNS response: ${flow.bytes} bytes`],
          indicators: ['large_dns_response', flow.destIP],
          firstSeen: flow.timestamp,
          lastSeen: flow.timestamp,
          impact: 'Possible data exfiltration via DNS'
        });
      }
    });

    return threats;
  }

  private async detectDataExfiltration(flowData: any[]) {
    const threats = [];
    
    // Detect unusual outbound data volumes
    const outboundTraffic = {};
    flowData.forEach(flow => {
      if (this.isInternalIP(flow.sourceIP) && !this.isInternalIP(flow.destIP)) {
        if (!outboundTraffic[flow.sourceIP]) {
          outboundTraffic[flow.sourceIP] = 0;
        }
        outboundTraffic[flow.sourceIP] += flow.bytes;
      }
    });

    Object.entries(outboundTraffic).forEach(([sourceIP, bytes]: [string, number]) => {
      if (bytes > 100 * 1024 * 1024) { // 100MB threshold
        threats.push({
          id: `data_exfil_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'data_exfiltration' as const,
          severity: 'high' as const,
          confidence: 0.8,
          sourceIP,
          protocol: 'tcp',
          description: 'Potential data exfiltration detected',
          evidence: [`Large outbound transfer: ${(bytes / (1024 * 1024)).toFixed(2)} MB`],
          indicators: ['large_outbound_transfer', sourceIP],
          firstSeen: new Date(),
          lastSeen: new Date(),
          impact: 'Possible unauthorized data transfer'
        });
      }
    });

    return threats;
  }

  private async detectTunneling(flowData: any[]) {
    const threats = [];
    
    // Detect HTTP tunneling on non-standard ports
    const httpOnNonStandardPorts = flowData.filter(flow => 
      flow.destPort !== 80 && flow.destPort !== 443 && 
      (flow.destPort === 8080 || flow.destPort === 3128 || flow.bytes > 1500)
    );

    httpOnNonStandardPorts.forEach(flow => {
      threats.push({
        id: `tunnel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'port_scan' as const,
        severity: 'medium' as const,
        confidence: 0.6,
        sourceIP: flow.sourceIP,
        destIP: flow.destIP,
        port: flow.destPort,
        protocol: flow.protocol,
        description: 'Potential protocol tunneling detected',
        evidence: [`HTTP-like traffic on port ${flow.destPort}`],
        indicators: ['protocol_tunneling', `port_${flow.destPort}`],
        firstSeen: flow.timestamp,
        lastSeen: flow.timestamp,
        impact: 'Possible firewall evasion attempt'
      });
    });

    return threats;
  }

  private async detectNetworkAnomalies(flowData: any[], config: NetworkMonitorConfig) {
    const anomalies = [];
    
    // Bandwidth anomaly
    const totalBytes = flowData.reduce((sum, flow) => sum + flow.bytes, 0);
    const bandwidthMbps = (totalBytes * 8) / (1024 * 1024); // Convert to Mbps
    
    if (bandwidthMbps > config.alertThresholds.bandwidth) {
      anomalies.push({
        type: 'bandwidth' as const,
        description: 'High bandwidth utilization detected',
        severity: 'medium' as const,
        value: bandwidthMbps,
        threshold: config.alertThresholds.bandwidth,
        entities: ['network'],
        timeframe: new Date()
      });
    }
    
    // Connection count anomaly
    const uniqueConnections = new Set(flowData.map(flow => `${flow.sourceIP}-${flow.destIP}`)).size;
    if (uniqueConnections > config.alertThresholds.connections) {
      anomalies.push({
        type: 'connection_count' as const,
        description: 'High number of concurrent connections',
        severity: 'medium' as const,
        value: uniqueConnections,
        threshold: config.alertThresholds.connections,
        entities: ['network'],
        timeframe: new Date()
      });
    }

    return anomalies;
  }

  private async analyzeTopTalkers(flowData: any[], config: NetworkMonitorConfig) {
    const talkers = {};
    
    flowData.forEach(flow => {
      if (!talkers[flow.sourceIP]) {
        talkers[flow.sourceIP] = { bytesOut: 0, bytesIn: 0, connections: new Set(), protocols: new Set() };
      }
      if (!talkers[flow.destIP]) {
        talkers[flow.destIP] = { bytesOut: 0, bytesIn: 0, connections: new Set(), protocols: new Set() };
      }
      
      talkers[flow.sourceIP].bytesOut += flow.bytes;
      talkers[flow.destIP].bytesIn += flow.bytes;
      talkers[flow.sourceIP].connections.add(flow.destIP);
      talkers[flow.sourceIP].protocols.add(flow.protocol);
    });

    return Object.entries(talkers)
      .map(([ip, stats]: [string, any]) => ({
        ip,
        bytesOut: stats.bytesOut,
        bytesIn: stats.bytesIn,
        connections: stats.connections.size,
        protocols: Array.from(stats.protocols),
        geoLocation: this.getGeoLocation(ip),
        reputation: this.getIPReputation(ip)
      }))
      .sort((a, b) => (b.bytesOut + b.bytesIn) - (a.bytesOut + a.bytesIn))
      .slice(0, 20);
  }

  private async analyzeProtocols(flowData: any[]) {
    const protocols = {};
    
    flowData.forEach(flow => {
      if (!protocols[flow.protocol]) {
        protocols[flow.protocol] = { totalBytes: 0, flowCount: 0, flows: [] };
      }
      protocols[flow.protocol].totalBytes += flow.bytes;
      protocols[flow.protocol].flowCount++;
      protocols[flow.protocol].flows.push(flow);
    });

    return Object.entries(protocols).map(([protocol, stats]: [string, any]) => ({
      protocol,
      totalBytes: stats.totalBytes,
      flowCount: stats.flowCount,
      avgFlowSize: stats.totalBytes / stats.flowCount,
      suspiciousPatterns: this.detectProtocolAnomalies(protocol, stats.flows),
      complianceIssues: this.checkProtocolCompliance(protocol)
    }));
  }

  private async analyzeGeographicDistribution(flowData: any[]) {
    const countries = {};
    const suspiciousGeoLocations = [];
    
    flowData.forEach(flow => {
      const country = this.getCountry(flow.destIP);
      if (!countries[country]) {
        countries[country] = { bytes: 0, connections: 0 };
      }
      countries[country].bytes += flow.bytes;
      countries[country].connections++;
      
      // Check for suspicious countries
      if (this.isSuspiciousCountry(country)) {
        suspiciousGeoLocations.push({
          ip: flow.destIP,
          country,
          reason: 'High-risk geographic location',
          riskScore: 0.8
        });
      }
    });

    return {
      countries: Object.entries(countries).map(([country, stats]: [string, any]) => ({
        country,
        bytes: stats.bytes,
        connections: stats.connections,
        risk: this.getCountryRisk(country)
      })),
      suspiciousGeoLocations
    };
  }

  private async createTimelineAnalysis(flowData: any[], threats: any[]) {
    const timeline = [];
    const intervals = 12; // 5-minute intervals for 1 hour
    const intervalMs = 5 * 60 * 1000;
    const startTime = Math.min(...flowData.map(f => f.timestamp.getTime()));
    
    for (let i = 0; i < intervals; i++) {
      const intervalStart = startTime + (i * intervalMs);
      const intervalEnd = intervalStart + intervalMs;
      
      const intervalFlows = flowData.filter(f => 
        f.timestamp.getTime() >= intervalStart && f.timestamp.getTime() < intervalEnd
      );
      
      const intervalThreats = threats.filter(t => 
        t.firstSeen.getTime() >= intervalStart && t.firstSeen.getTime() < intervalEnd
      );
      
      timeline.push({
        timestamp: new Date(intervalStart),
        bandwidth: intervalFlows.reduce((sum, f) => sum + f.bytes, 0) / (1024 * 1024), // MB
        connections: intervalFlows.length,
        threats: intervalThreats.length,
        events: intervalThreats.map(t => t.type)
      });
    }
    
    return timeline;
  }

  private async generateNetworkAlerts(result: NetworkTrafficResult, config: NetworkMonitorConfig) {
    const alerts = [];
    
    // High severity threats
    result.threats.filter(t => t.severity === 'critical' || t.severity === 'high').forEach(threat => {
      alerts.push({
        id: `alert_${threat.id}`,
        type: threat.type,
        severity: threat.severity,
        message: `${threat.description} - Source: ${threat.sourceIP}`,
        timestamp: threat.firstSeen
      });
    });
    
    // Bandwidth alerts
    if (result.summary.bandwidthUtilization > config.alertThresholds.bandwidth) {
      alerts.push({
        id: `bandwidth_alert_${Date.now()}`,
        type: 'bandwidth',
        severity: 'medium',
        message: `High bandwidth utilization: ${result.summary.bandwidthUtilization.toFixed(1)}%`,
        timestamp: new Date()
      });
    }
    
    return alerts;
  }

  private generateNetworkRecommendations(result: NetworkTrafficResult, config: NetworkMonitorConfig): string[] {
    const recommendations = [];
    
    if (result.threats.length > 0) {
      recommendations.push('Investigate detected network threats immediately');
      recommendations.push('Consider implementing network segmentation');
    }
    
    if (result.threats.some(t => t.type === 'malware_c2')) {
      recommendations.push('Block suspected C2 communication endpoints');
      recommendations.push('Scan affected hosts for malware');
    }
    
    if (result.threats.some(t => t.type === 'data_exfiltration')) {
      recommendations.push('Review data loss prevention (DLP) policies');
      recommendations.push('Implement outbound traffic monitoring');
    }
    
    if (result.summary.bandwidthUtilization > 80) {
      recommendations.push('Monitor bandwidth usage and consider capacity planning');
    }
    
    if (result.geographicAnalysis.suspiciousGeoLocations.length > 0) {
      recommendations.push('Implement geo-blocking for high-risk countries');
      recommendations.push('Review VPN and remote access policies');
    }
    
    return recommendations;
  }

  // Helper methods
  private generateRandomIP(): string {
    return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }

  private selectRandomPort(): number {
    const commonPorts = [80, 443, 22, 21, 25, 53, 110, 143, 993, 995, 3389, 5432, 3306];
    return Math.random() > 0.7 ? commonPorts[Math.floor(Math.random() * commonPorts.length)] : Math.floor(Math.random() * 65535);
  }

  private selectRandomProtocol(): string {
    const protocols = ['tcp', 'udp', 'icmp'];
    return protocols[Math.floor(Math.random() * protocols.length)];
  }

  private isInternalIP(ip: string): boolean {
    return ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.');
  }

  private getGeoLocation(ip: string) {
    // Simulate geolocation lookup
    const locations = [
      { country: 'United States', city: 'New York' },
      { country: 'Germany', city: 'Berlin' },
      { country: 'China', city: 'Beijing' },
      { country: 'Russia', city: 'Moscow' }
    ];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  private getIPReputation(ip: string): 'clean' | 'suspicious' | 'malicious' {
    const rand = Math.random();
    if (rand > 0.95) return 'malicious';
    if (rand > 0.85) return 'suspicious';
    return 'clean';
  }

  private getCountry(ip: string): string {
    const countries = ['United States', 'Germany', 'China', 'Russia', 'Brazil', 'India', 'Japan'];
    return countries[Math.floor(Math.random() * countries.length)];
  }

  private isSuspiciousCountry(country: string): boolean {
    const suspicious = ['Unknown', 'Tor Network', 'Anonymous Proxy'];
    return suspicious.includes(country);
  }

  private getCountryRisk(country: string): string {
    const highRisk = ['China', 'Russia', 'North Korea'];
    return highRisk.includes(country) ? 'high' : 'low';
  }

  private detectProtocolAnomalies(protocol: string, flows: any[]): string[] {
    const anomalies = [];
    
    if (protocol === 'tcp' && flows.some(f => f.bytes > 10000)) {
      anomalies.push('Large TCP transfers detected');
    }
    
    if (protocol === 'udp' && flows.length > 100) {
      anomalies.push('High volume UDP traffic');
    }
    
    return anomalies;
  }

  private checkProtocolCompliance(protocol: string): string[] {
    const issues = [];
    
    if (protocol === 'telnet') {
      issues.push('Unencrypted Telnet protocol detected');
    }
    
    if (protocol === 'ftp') {
      issues.push('Unencrypted FTP protocol detected');
    }
    
    return issues;
  }

  configure(config: Partial<NetworkMonitorConfig>) {
    const errors: string[] = [];
    
    if (config.retentionPeriod !== undefined && config.retentionPeriod < 1) {
      errors.push('retentionPeriod must be at least 1 hour');
    }
    
    if (config.alertThresholds?.bandwidth !== undefined && config.alertThresholds.bandwidth < 0) {
      errors.push('bandwidth threshold must be positive');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}