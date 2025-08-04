import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AIWorkflowGeneratorService, WorkflowGenerationRequest } from '../services/ai-workflow-generator.service';
import { NodeRegistryService } from '../services/node-registry.service';
import { TenantDataService } from '../../auth/services/tenant-data.service';
import { WorkflowTemplate } from '../entities/workflow-template.entity';

describe('AIWorkflowGeneratorService', () => {
  let service: AIWorkflowGeneratorService;
  let nodeRegistryService: NodeRegistryService;
  let tenantDataService: TenantDataService;

  const mockWorkflowTemplateRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn()
  };

  const mockNodeRegistryService = {
    getAvailableNodes: jest.fn().mockResolvedValue([
      { id: 'alert-trigger', name: 'Alert Trigger', type: 'trigger', description: 'Triggers workflow on alert' },
      { id: 'threat-intel-lookup', name: 'Threat Intel Lookup', type: 'enrichment', description: 'Look up threat intelligence' },
      { id: 'mitre-attack-mapping', name: 'MITRE ATT&CK Mapping', type: 'analysis', description: 'Map to MITRE framework' },
      { id: 'notification', name: 'Notification', type: 'action', description: 'Send notifications' },
      { id: 'soar-containment', name: 'SOAR Containment', type: 'action', description: 'Automated containment' }
    ])
  };

  const mockTenantDataService = {
    createTenantQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([])
    })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIWorkflowGeneratorService,
        {
          provide: getRepositoryToken(WorkflowTemplate),
          useValue: mockWorkflowTemplateRepository
        },
        {
          provide: NodeRegistryService,
          useValue: mockNodeRegistryService
        },
        {
          provide: TenantDataService,
          useValue: mockTenantDataService
        }
      ]
    }).compile();

    service = module.get<AIWorkflowGeneratorService>(AIWorkflowGeneratorService);
    nodeRegistryService = module.get<NodeRegistryService>(NodeRegistryService);
    tenantDataService = module.get<TenantDataService>(TenantDataService);
  });

  describe('generateWorkflow', () => {
    it('should generate incident response workflow', async () => {
      const request: WorkflowGenerationRequest = {
        description: 'Create an automated incident response workflow for malware detection and containment',
        category: 'incident-response',
        complexity: 'intermediate'
      };

      const result = await service.generateWorkflow(request);

      expect(result).toBeDefined();
      expect(result.name).toContain('Workflow');
      expect(result.category).toBe('incident-response');
      expect(result.complexity).toBe('intermediate');
      expect(result.workflow_definition.nodes.length).toBeGreaterThan(0);
      expect(result.confidence_score).toBeGreaterThan(0);
    });

    it('should generate threat hunting workflow', async () => {
      const request: WorkflowGenerationRequest = {
        description: 'Build a threat hunting workflow to investigate suspicious network activity and identify APT indicators',
        category: 'threat-hunting',
        complexity: 'advanced'
      };

      const result = await service.generateWorkflow(request);

      expect(result).toBeDefined();
      expect(result.category).toBe('threat-hunting');
      expect(result.complexity).toBe('advanced');
      expect(result.workflow_definition.nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nodeId: expect.stringContaining('threat-intel')
          })
        ])
      );
    });

    it('should generate workflow with constraints', async () => {
      const request: WorkflowGenerationRequest = {
        description: 'Simple alert notification workflow',
        constraints: {
          maxNodes: 3
        }
      };

      const result = await service.generateWorkflow(request);

      // Check that maxNodes constraint is respected
      expect(result.workflow_definition.nodes.length).toBeLessThanOrEqual(3);
      expect(result.workflow_definition.nodes.length).toBeGreaterThan(0);
      
      // Check that workflow structure is valid
      expect(result.workflow_definition.edges.length).toBeGreaterThanOrEqual(0);
      expect(result.confidence_score).toBeGreaterThan(0);
    });

    it('should handle phishing detection workflow', async () => {
      const request: WorkflowGenerationRequest = {
        description: 'Detect and respond to phishing emails automatically',
        requirements: ['email analysis', 'url reputation check', 'user notification']
      };

      const result = await service.generateWorkflow(request);

      expect(result).toBeDefined();
      expect(result.description).toContain('phishing');
      expect(result.workflow_definition.nodes.length).toBeGreaterThan(2);
    });
  });

  describe('pattern matching', () => {
    it('should match incident response pattern', async () => {
      const request: WorkflowGenerationRequest = {
        description: 'incident response for security alerts'
      };

      const result = await service.generateWorkflow(request);

      expect(result.category).toBe('incident-response');
      expect(result.confidence_score).toBeGreaterThan(0.5);
    });

    it('should match vulnerability management pattern', async () => {
      const request: WorkflowGenerationRequest = {
        description: 'vulnerability scanning and assessment workflow'
      };

      const result = await service.generateWorkflow(request);

      expect(result.category).toBe('vulnerability-management');
    });

    it('should match forensics pattern', async () => {
      const request: WorkflowGenerationRequest = {
        description: 'digital forensics investigation for malware analysis'
      };

      const result = await service.generateWorkflow(request);

      expect(result.category).toBe('forensics');
    });
  });

  describe('workflow validation', () => {
    it('should validate valid workflow', () => {
      const validWorkflow = {
        name: 'Test Workflow',
        description: 'Test Description',
        category: 'incident-response',
        complexity: 'intermediate' as const,
        workflow_definition: {
          nodes: [
            { id: 'node-1', type: 'trigger', nodeId: 'alert-trigger', position: { x: 100, y: 100 }, config: {}, data: { label: 'Alert' } },
            { id: 'node-2', type: 'action', nodeId: 'notification', position: { x: 300, y: 100 }, config: {}, data: { label: 'Notify' } }
          ],
          edges: [
            { id: 'edge-1', source: 'node-1', target: 'node-2' }
          ],
          metadata: { version: '1.0', author: 'AI', tags: [], complexity: 'intermediate' as const, generation_prompt: 'test prompt' }
        },
        confidence_score: 0.8
      };

      const validation = service.validateWorkflow(validWorkflow);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid workflow with missing nodes', () => {
      const invalidWorkflow = {
        name: 'Test Workflow',
        description: 'Test Description',
        category: 'incident-response',
        complexity: 'intermediate' as const,
        workflow_definition: {
          nodes: [],
          edges: [],
          metadata: { version: '1.0', author: 'AI', tags: [], complexity: 'intermediate' as const, generation_prompt: 'test prompt' }
        },
        confidence_score: 0.8
      };

      const validation = service.validateWorkflow(invalidWorkflow);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Workflow must have at least one node');
    });

    it('should detect invalid edges', () => {
      const invalidWorkflow = {
        name: 'Test Workflow',
        description: 'Test Description',
        category: 'incident-response',
        complexity: 'intermediate' as const,
        workflow_definition: {
          nodes: [
            { id: 'node-1', type: 'trigger', nodeId: 'alert-trigger', position: { x: 100, y: 100 }, config: {}, data: { label: 'Alert' } }
          ],
          edges: [
            { id: 'edge-1', source: 'node-1', target: 'node-2' }
          ],
          metadata: { version: '1.0', author: 'AI', tags: [], complexity: 'intermediate' as const, generation_prompt: 'test prompt' }
        },
        confidence_score: 0.8
      };

      const validation = service.validateWorkflow(invalidWorkflow);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Edge target 'node-2' references non-existent node");
    });
  });

  describe('similarity search', () => {
    it('should find similar workflows', async () => {
      const mockSimilarWorkflows = [
        {
          id: '1',
          name: 'Incident Response Template',
          description: 'Standard incident response workflow',
          category: 'incident-response'
        }
      ];

      mockTenantDataService.createTenantQueryBuilder().getMany.mockResolvedValue(mockSimilarWorkflows);

      const result = await service.findSimilarWorkflows('incident response workflow');

      expect(result).toEqual(mockSimilarWorkflows);
      expect(mockTenantDataService.createTenantQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('natural language processing', () => {
    it('should extract security entities correctly', () => {
      // Test private method through reflection for unit testing
      const extractSecurityEntities = (service as any).extractSecurityEntities;
      
      const text = 'detect malware on endpoints and block suspicious ip addresses';
      const entities = extractSecurityEntities(text);
      
      expect(entities).toContain('malware');
      expect(entities).toContain('ip');
    });

    it('should extract actions correctly', () => {
      const extractActions = (service as any).extractActions;
      
      const text = 'scan the network and analyze logs to detect threats';
      const actions = extractActions(text);
      
      expect(actions).toContain('scan');
      expect(actions).toContain('analyze');
      expect(actions).toContain('detect');
    });

    it('should determine intent correctly', () => {
      const determineIntent = (service as any).determineIntent;
      
      const responseText = 'respond to security incidents and contain threats';
      const responseIntent = determineIntent(responseText, ['respond', 'contain']);
      expect(responseIntent).toBe('response');
      
      const detectionText = 'monitor network traffic and detect anomalies';
      const detectionIntent = determineIntent(detectionText, ['monitor', 'detect']);
      expect(detectionIntent).toBe('detection');
    });
  });
});