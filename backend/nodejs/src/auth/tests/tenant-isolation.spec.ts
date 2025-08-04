import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TenantDataService } from '../services/tenant-data.service';
import { TenantWorkflowRepository } from '../../workflow/repositories/tenant-workflow.repository';
import { TenantThreatIntelRepository } from '../../workflow/repositories/tenant-threat-intel.repository';
import { Workflow } from '../../workflow/entities/workflow.entity';
import { ThreatIntelligence } from '../../workflow/entities/threat-intel.entity';
import { REQUEST } from '@nestjs/core';

describe('TenantIsolationSystem', () => {
  let tenantDataService: TenantDataService;
  let tenantWorkflowRepo: TenantWorkflowRepository;
  let tenantThreatIntelRepo: TenantThreatIntelRepository;
  let mockRequest: any;
  let mockDataSource: Partial<DataSource>;
  let mockWorkflowRepository: Partial<Repository<Workflow>>;
  let mockThreatIntelRepository: Partial<Repository<ThreatIntelligence>>;

  beforeEach(async () => {
    // Mock request with tenant context
    mockRequest = {
      tenant: {
        id: 'tenant-1',
        name: 'Test Tenant',
        subdomain: 'test',
        plan: 'professional',
        features: {
          max_workflows: 100,
          max_users: 20,
          soar_integrations: true,
          ai_features: true
        },
        usage_limits: {
          current_workflows: 5,
          current_users: 3
        }
      },
      user: {
        id: 'user-1',
        role: 'tenant_admin',
        permissions: ['workflows:read', 'workflows:write', 'threat_intel:read']
      }
    };

    // Mock DataSource
    mockDataSource = {
      getRepository: jest.fn(),
      query: jest.fn()
    };

    // Mock repositories
    mockWorkflowRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getOne: jest.fn(),
        getCount: jest.fn()
      })),
      metadata: {
        columns: [
          { propertyName: 'id' },
          { propertyName: 'name' },
          { propertyName: 'tenant_id' }
        ],
        tableName: 'workflows'
      }
    };

    mockThreatIntelRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getOne: jest.fn(),
        getCount: jest.fn()
      })),
      metadata: {
        columns: [
          { propertyName: 'id' },
          { propertyName: 'indicator_value' },
          { propertyName: 'tenant_id' }
        ],
        tableName: 'threat_intelligence'
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantDataService,
        TenantWorkflowRepository,
        TenantThreatIntelRepository,
        {
          provide: REQUEST,
          useValue: mockRequest
        },
        {
          provide: DataSource,
          useValue: mockDataSource
        },
        {
          provide: getRepositoryToken(Workflow),
          useValue: mockWorkflowRepository
        },
        {
          provide: getRepositoryToken(ThreatIntelligence),
          useValue: mockThreatIntelRepository
        }
      ]
    }).compile();

    tenantDataService = module.get<TenantDataService>(TenantDataService);
    tenantWorkflowRepo = module.get<TenantWorkflowRepository>(TenantWorkflowRepository);
    tenantThreatIntelRepo = module.get<TenantThreatIntelRepository>(TenantThreatIntelRepository);
  });

  describe('TenantDataService', () => {
    it('should extract tenant context from request', () => {
      const context = tenantDataService.getTenantContext();
      
      expect(context).toBeDefined();
      expect(context?.tenantId).toBe('tenant-1');
      expect(context?.userId).toBe('user-1');
      expect(context?.userRole).toBe('tenant_admin');
    });

    it('should check user permissions correctly', () => {
      expect(tenantDataService.hasPermission('workflows:read')).toBe(true);
      expect(tenantDataService.hasPermission('workflows:write')).toBe(true);
      expect(tenantDataService.hasPermission('admin:super')).toBe(false);
    });

    it('should check user roles correctly', () => {
      expect(tenantDataService.hasRole('tenant_admin')).toBe(true);
      expect(tenantDataService.hasRole('super_admin')).toBe(false);
    });

    it('should create tenant-scoped query builder', () => {
      const qb = tenantDataService.createTenantQueryBuilder(Workflow);
      
      expect(qb).toBeDefined();
      expect(qb.andWhere).toHaveBeenCalledWith('workflows.tenant_id = :tenantId', { tenantId: 'tenant-1' });
    });

    it('should get tenant usage statistics', async () => {
      (mockDataSource.query as jest.Mock)
        .mockResolvedValueOnce([{ count: '5' }])  // workflows
        .mockResolvedValueOnce([{ count: '12' }]) // threat_intel
        .mockResolvedValueOnce([{ count: '8' }])  // mitre_techniques
        .mockResolvedValueOnce([{ count: '3' }]); // threat_sources

      const stats = await tenantDataService.getTenantUsageStats();

      expect(stats).toEqual({
        workflows: 5,
        threat_intel: 12,
        mitre_techniques: 8,
        threat_sources: 3
      });
    });
  });

  describe('TenantWorkflowRepository', () => {
    it('should automatically add tenant_id when creating workflows', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'Test Description',
        workflow_data: { nodes: [], edges: [] }
      };

      const mockCreatedWorkflow = { ...workflowData, tenant_id: 'tenant-1' };
      (mockWorkflowRepository.create as jest.Mock).mockReturnValue(mockCreatedWorkflow);
      (mockWorkflowRepository.save as jest.Mock).mockResolvedValue(mockCreatedWorkflow);

      const result = await tenantWorkflowRepo.save(workflowData as any);

      expect(result.tenant_id).toBe('tenant-1');
    });

    it('should filter workflows by status within tenant', async () => {
      const mockWorkflows = [
        { id: '1', name: 'Workflow 1', status: 'active', tenant_id: 'tenant-1' },
        { id: '2', name: 'Workflow 2', status: 'active', tenant_id: 'tenant-1' }
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockWorkflows)
      };

      (mockWorkflowRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await tenantWorkflowRepo.findByStatus('active');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('workflow.status = :status', { status: 'active' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('workflow.tenant_id = :tenantId', { tenantId: 'tenant-1' });
      expect(result).toEqual(mockWorkflows);
    });

    it('should get workflow statistics for current tenant only', async () => {
      const mockQueryBuilder = {
        getCount: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis()
      };

      mockQueryBuilder.getCount
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5)  // active
        .mockResolvedValueOnce(3)  // draft
        .mockResolvedValueOnce(1)  // paused
        .mockResolvedValueOnce(1); // archived

      (mockWorkflowRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const stats = await tenantWorkflowRepo.getWorkflowStatistics();

      expect(stats).toEqual({
        total: 10,
        active: 5,
        draft: 3,
        paused: 1,
        archived: 1
      });
    });
  });

  describe('TenantThreatIntelRepository', () => {
    it('should automatically add tenant_id when creating threat intel', async () => {
      const threatIntelData = {
        indicator_value: '192.168.1.1',
        indicator_type: 'ip',
        reputation: 'malicious'
      };

      const mockCreatedThreatIntel = { ...threatIntelData, tenant_id: 'tenant-1' };
      (mockThreatIntelRepository.create as jest.Mock).mockReturnValue(mockCreatedThreatIntel);
      (mockThreatIntelRepository.save as jest.Mock).mockResolvedValue(mockCreatedThreatIntel);

      const result = await tenantThreatIntelRepo.save(threatIntelData as any);

      expect(result.tenant_id).toBe('tenant-1');
    });

    it('should find threat intel by indicator within tenant scope', async () => {
      const mockThreatIntel = [
        { id: '1', indicator_value: '192.168.1.1', indicator_type: 'ip', tenant_id: 'tenant-1' }
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockThreatIntel)
      };

      (mockThreatIntelRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await tenantThreatIntelRepo.findByIndicator('192.168.1.1');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('threat_intel.indicator_value = :indicatorValue', { indicatorValue: '192.168.1.1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('threat_intel.tenant_id = :tenantId', { tenantId: 'tenant-1' });
      expect(result).toEqual(mockThreatIntel);
    });

    it('should get threat intel statistics for current tenant only', async () => {
      const mockQueryBuilder = {
        getCount: jest.fn().mockResolvedValue(25),
        clone: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn()
      };

      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { type: 'ip', count: '15' },
          { type: 'domain', count: '10' }
        ])
        .mockResolvedValueOnce([
          { reputation: 'malicious', count: '20' },
          { reputation: 'suspicious', count: '5' }
        ]);

      (mockThreatIntelRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const stats = await tenantThreatIntelRepo.getThreatIntelStatistics();

      expect(stats).toEqual({
        total: 25,
        by_type: { ip: 15, domain: 10 },
        by_reputation: { malicious: 20, suspicious: 5 },
        recent_count: 25
      });
    });
  });

  describe('Cross-tenant isolation', () => {
    it('should not access data from other tenants', async () => {
      // Simulate a different tenant context
      const otherTenantRequest = {
        ...mockRequest,
        tenant: { ...mockRequest.tenant, id: 'tenant-2' }
      };

      // Create a new service instance with different tenant context
      const otherTenantService = new TenantDataService(mockDataSource as DataSource, otherTenantRequest);

      expect(otherTenantService.getTenantId()).toBe('tenant-2');
      expect(tenantDataService.getTenantId()).toBe('tenant-1');

      // Verify that they would use different tenant IDs in queries
      const tenant1QB = tenantDataService.createTenantQueryBuilder(Workflow);
      const tenant2QB = otherTenantService.createTenantQueryBuilder(Workflow);

      expect(tenant1QB.andWhere).toHaveBeenCalledWith('workflows.tenant_id = :tenantId', { tenantId: 'tenant-1' });
      expect(tenant2QB.andWhere).toHaveBeenCalledWith('workflows.tenant_id = :tenantId', { tenantId: 'tenant-2' });
    });

    it('should validate tenant access correctly', async () => {
      const tenantEntity = { id: '1', name: 'Test', tenant_id: 'tenant-1' };
      const otherTenantEntity = { id: '2', name: 'Other', tenant_id: 'tenant-2' };

      expect(await tenantDataService.validateTenantAccess(tenantEntity)).toBe(true);
      expect(await tenantDataService.validateTenantAccess(otherTenantEntity)).toBe(false);
    });
  });
});