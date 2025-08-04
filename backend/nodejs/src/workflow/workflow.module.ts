import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { WorkflowTriggerService } from './workflow-trigger.service';
import { KafkaWorkflowTriggerService } from './kafka-workflow-trigger.service';
import { WorkflowExecutionService } from './workflow-execution.service';

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowTriggerService, KafkaWorkflowTriggerService, WorkflowExecutionService],
  exports: [WorkflowService, WorkflowTriggerService, KafkaWorkflowTriggerService, WorkflowExecutionService],
})
export class WorkflowModule {}
