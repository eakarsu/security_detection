import { Controller, Get, Post, Param, Body, Query, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MitreIntegrationService, MitreTechniqueDetails, MitreMapping } from '../services/mitre-integration.service';

@ApiTags('MITRE ATT&CK')
@Controller('mitre')
export class MitreController {
  constructor(
    private mitreService: MitreIntegrationService
  ) {}

  @Get('tactics')
  @ApiOperation({ summary: 'Get all MITRE ATT&CK tactics' })
  @ApiResponse({ status: 200, description: 'List of tactics with technique counts' })
  async getAllTactics() {
    const tactics = await this.mitreService.getAllTactics();
    
    return {
      tactics,
      total_tactics: tactics.length,
      total_techniques: tactics.reduce((sum, tactic) => sum + tactic.techniques_count, 0)
    };
  }

  @Get('tactics/:tactic/techniques')
  @ApiOperation({ summary: 'Get techniques for a specific tactic' })
  @ApiParam({ name: 'tactic', description: 'MITRE ATT&CK tactic name' })
  @ApiResponse({ status: 200, description: 'Techniques for the specified tactic' })
  async getTechniquesByTactic(@Param('tactic') tactic: string): Promise<{
    tactic: string;
    techniques: MitreTechniqueDetails[];
    count: number;
  }> {
    const techniques = await this.mitreService.getTechniquesByTactic(tactic);
    
    return {
      tactic,
      techniques,
      count: techniques.length
    };
  }

  @Get('techniques/:techniqueId')
  @ApiOperation({ summary: 'Get detailed information about a specific technique' })
  @ApiParam({ name: 'techniqueId', description: 'MITRE ATT&CK technique ID (e.g., T1190)' })
  @ApiResponse({ status: 200, description: 'Detailed technique information' })
  @ApiResponse({ status: 404, description: 'Technique not found' })
  async getTechniqueDetails(@Param('techniqueId') techniqueId: string): Promise<MitreTechniqueDetails> {
    const technique = await this.mitreService.getTechniqueById(techniqueId);
    
    if (!technique) {
      throw new HttpException(`Technique '${techniqueId}' not found`, HttpStatus.NOT_FOUND);
    }
    
    return technique;
  }

  @Get('techniques/:techniqueId/detection-rules')
  @ApiOperation({ summary: 'Get detection rules for a specific technique' })
  @ApiParam({ name: 'techniqueId', description: 'MITRE ATT&CK technique ID' })
  @ApiResponse({ status: 200, description: 'Detection rules for the technique' })
  async getDetectionRules(@Param('techniqueId') techniqueId: string) {
    const rules = await this.mitreService.getDetectionRulesForTechniques([techniqueId]);
    
    if (rules.length === 0) {
      throw new HttpException(`No detection rules found for technique '${techniqueId}'`, HttpStatus.NOT_FOUND);
    }
    
    return {
      technique_id: techniqueId,
      detection_rules: rules,
      count: rules.length
    };
  }

  @Get('techniques/:techniqueId/mitigations')
  @ApiOperation({ summary: 'Get mitigation strategies for a specific technique' })
  @ApiParam({ name: 'techniqueId', description: 'MITRE ATT&CK technique ID' })
  @ApiResponse({ status: 200, description: 'Mitigation strategies for the technique' })
  async getMitigationStrategies(@Param('techniqueId') techniqueId: string) {
    const mitigations = await this.mitreService.getMitigationStrategies([techniqueId]);
    
    return {
      technique_id: techniqueId,
      mitigations,
      count: mitigations.length
    };
  }

  @Post('map-threat')
  @ApiOperation({ summary: 'Map a threat to MITRE ATT&CK framework' })
  @ApiResponse({ status: 200, description: 'MITRE mapping for the threat' })
  @ApiResponse({ status: 400, description: 'Invalid threat data' })
  async mapThreatToMitre(@Body() threatData: {
    threat_type: string;
    indicators: string[];
    behavior_patterns: string[];
    source_info?: any;
  }): Promise<MitreMapping> {
    if (!threatData.threat_type) {
      throw new HttpException('threat_type is required', HttpStatus.BAD_REQUEST);
    }

    const mapping = await this.mitreService.mapThreatToMitre(threatData);
    
    return mapping;
  }

  @Post('bulk-detection-rules')
  @ApiOperation({ summary: 'Get detection rules for multiple techniques' })
  @ApiResponse({ status: 200, description: 'Detection rules for all specified techniques' })
  async getBulkDetectionRules(@Body() body: { technique_ids: string[] }) {
    if (!body.technique_ids || body.technique_ids.length === 0) {
      throw new HttpException('technique_ids array is required', HttpStatus.BAD_REQUEST);
    }

    const rules = await this.mitreService.getDetectionRulesForTechniques(body.technique_ids);
    
    // Group rules by technique
    const rulesByTechnique = rules.reduce((acc, rule) => {
      if (!acc[rule.technique_id]) {
        acc[rule.technique_id] = [];
      }
      acc[rule.technique_id].push(rule);
      return acc;
    }, {} as Record<string, any[]>);

    return {
      technique_ids: body.technique_ids,
      rules_by_technique: rulesByTechnique,
      total_rules: rules.length
    };
  }

  @Post('bulk-mitigations')
  @ApiOperation({ summary: 'Get mitigation strategies for multiple techniques' })
  @ApiResponse({ status: 200, description: 'Mitigation strategies for all specified techniques' })
  async getBulkMitigations(@Body() body: { technique_ids: string[] }) {
    if (!body.technique_ids || body.technique_ids.length === 0) {
      throw new HttpException('technique_ids array is required', HttpStatus.BAD_REQUEST);
    }

    const mitigations = await this.mitreService.getMitigationStrategies(body.technique_ids);
    
    // Group mitigations by technique
    const mitigationsByTechnique = mitigations.reduce((acc, mitigation) => {
      if (!acc[mitigation.technique_id]) {
        acc[mitigation.technique_id] = [];
      }
      acc[mitigation.technique_id].push(mitigation);
      return acc;
    }, {} as Record<string, any[]>);

    return {
      technique_ids: body.technique_ids,
      mitigations_by_technique: mitigationsByTechnique,
      total_mitigations: mitigations.length
    };
  }

  @Get('attack-matrix')
  @ApiOperation({ summary: 'Get the complete MITRE ATT&CK matrix' })
  @ApiResponse({ status: 200, description: 'Complete attack matrix organized by tactics' })
  async getAttackMatrix() {
    const tactics = await this.mitreService.getAllTactics();
    const matrix = {};

    for (const tactic of tactics) {
      const techniques = await this.mitreService.getTechniquesByTactic(tactic.name);
      matrix[tactic.name] = {
        description: tactic.description,
        technique_count: tactic.techniques_count,
        techniques: techniques.map(t => ({
          id: t.technique_id,
          name: t.name,
          description: t.description.substring(0, 200) + '...'
        }))
      };
    }

    return {
      matrix,
      tactics_count: tactics.length,
      total_techniques: tactics.reduce((sum, t) => sum + t.techniques_count, 0)
    };
  }

  @Post('threat-analysis')
  @ApiOperation({ summary: 'Comprehensive threat analysis with MITRE mapping' })
  @ApiResponse({ status: 200, description: 'Complete threat analysis report' })
  async comprehensiveThreatAnalysis(@Body() analysisData: {
    threat_type: string;
    indicators: string[];
    behavior_patterns: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    source_info?: any;
    include_detection_rules?: boolean;
    include_mitigations?: boolean;
  }) {
    if (!analysisData.threat_type) {
      throw new HttpException('threat_type is required', HttpStatus.BAD_REQUEST);
    }

    // Get MITRE mapping
    const mapping = await this.mitreService.mapThreatToMitre(analysisData);

    const result: any = {
      threat_analysis: {
        threat_type: analysisData.threat_type,
        severity: analysisData.severity || 'medium',
        indicators_count: analysisData.indicators.length,
        behavior_patterns_count: analysisData.behavior_patterns.length
      },
      mitre_mapping: mapping,
      risk_assessment: {
        overall_risk: this.calculateOverallRisk(mapping, analysisData.severity),
        confidence: mapping.confidence,
        threat_actor_attribution: mapping.threat_actors.length > 0
      }
    };

    // Add detection rules if requested
    if (analysisData.include_detection_rules) {
      const detectionRules = await this.mitreService.getDetectionRulesForTechniques(mapping.techniques);
      result.detection_rules = detectionRules;
    }

    // Add mitigations if requested
    if (analysisData.include_mitigations) {
      const mitigations = await this.mitreService.getMitigationStrategies(mapping.techniques);
      result.mitigations = mitigations;
    }

    return result;
  }

  private calculateOverallRisk(mapping: MitreMapping, severity: string): string {
    let riskScore = 0;

    // Base risk from severity
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    riskScore += severityScores[severity] || 2;

    // Add points for number of techniques
    riskScore += Math.min(mapping.techniques.length * 0.5, 3);

    // Add points for confidence
    riskScore += mapping.confidence * 2;

    // Add points for threat actor attribution
    if (mapping.threat_actors.length > 0) {
      riskScore += 1;
    }

    if (riskScore >= 7) return 'critical';
    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }
}