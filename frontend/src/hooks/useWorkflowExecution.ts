import { useState, useCallback } from 'react';

export interface ExecutionStep {
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  duration?: number;
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  input: any;
  steps: ExecutionStep[];
  overallStatus: 'idle' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  totalDuration?: number;
}

export const useWorkflowExecution = () => {
  const [executions, setExecutions] = useState<Map<string, ExecutionContext>>(new Map());
  const [currentExecution, setCurrentExecution] = useState<string | null>(null);

  const startExecution = useCallback(async (
    workflowId: string,
    nodes: any[],
    input: any,
    mode: 'sequential' | 'parallel' = 'sequential'
  ): Promise<string> => {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const initialSteps: ExecutionStep[] = nodes.map(node => ({
      nodeId: node.id,
      nodeName: node.data.label,
      status: 'pending'
    }));

    const executionContext: ExecutionContext = {
      workflowId,
      executionId,
      input,
      steps: initialSteps,
      overallStatus: 'running',
      startTime: new Date()
    };

    setExecutions(prev => new Map(prev).set(executionId, executionContext));
    setCurrentExecution(executionId);

    // Start execution in background
    executeWorkflow(executionId, nodes, input, mode);

    return executionId;
  }, []);

  const executeWorkflow = async (
    executionId: string,
    nodes: any[],
    input: any,
    mode: 'sequential' | 'parallel'
  ) => {
    try {
      if (mode === 'sequential') {
        await executeSequential(executionId, nodes, input);
      } else {
        await executeParallel(executionId, nodes, input);
      }
    } catch (error) {
      updateExecutionStatus(executionId, 'failed');
    }
  };

  const executeSequential = async (executionId: string, nodes: any[], input: any) => {
    let currentInput = input;

    for (const node of nodes) {
      updateStepStatus(executionId, node.id, 'running', new Date());

      try {
        const result = await executeNode(node, currentInput);
        
        updateStepStatus(executionId, node.id, 'completed', undefined, new Date(), result);
        
        // Chain output to next input
        if (result.success && result.data) {
          currentInput = { ...currentInput, ...result.data };
        }
      } catch (error) {
        updateStepStatus(executionId, node.id, 'failed', undefined, new Date(), undefined, error.message);
        updateExecutionStatus(executionId, 'failed');
        return;
      }
    }

    updateExecutionStatus(executionId, 'completed');
  };

  const executeParallel = async (executionId: string, nodes: any[], input: any) => {
    const promises = nodes.map(async (node) => {
      updateStepStatus(executionId, node.id, 'running', new Date());

      try {
        const result = await executeNode(node, input);
        updateStepStatus(executionId, node.id, 'completed', undefined, new Date(), result);
        return result;
      } catch (error) {
        updateStepStatus(executionId, node.id, 'failed', undefined, new Date(), undefined, error.message);
        throw error;
      }
    });

    try {
      await Promise.all(promises);
      updateExecutionStatus(executionId, 'completed');
    } catch (error) {
      updateExecutionStatus(executionId, 'failed');
    }
  };

  const executeNode = async (node: any, input: any) => {
    const response = await fetch(`/api/v1/nodes/${node.data.nodeId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input,
        config: node.data.config || {},
        workflowId: 'test'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.result?.error || 'Node execution failed');
    }

    return result.result;
  };

  const updateStepStatus = useCallback((
    executionId: string,
    nodeId: string,
    status: ExecutionStep['status'],
    startTime?: Date,
    endTime?: Date,
    result?: any,
    error?: string
  ) => {
    setExecutions(prev => {
      const newExecutions = new Map(prev);
      const execution = newExecutions.get(executionId);
      
      if (execution) {
        const updatedSteps = execution.steps.map(step => {
          if (step.nodeId === nodeId) {
            const updatedStep: ExecutionStep = {
              ...step,
              status,
              ...(startTime && { startTime }),
              ...(endTime && { endTime }),
              ...(result && { result }),
              ...(error && { error })
            };

            if (startTime && endTime) {
              updatedStep.duration = endTime.getTime() - startTime.getTime();
            }

            return updatedStep;
          }
          return step;
        });

        newExecutions.set(executionId, {
          ...execution,
          steps: updatedSteps
        });
      }
      
      return newExecutions;
    });
  }, []);

  const updateExecutionStatus = useCallback((
    executionId: string,
    status: ExecutionContext['overallStatus']
  ) => {
    setExecutions(prev => {
      const newExecutions = new Map(prev);
      const execution = newExecutions.get(executionId);
      
      if (execution) {
        const endTime = new Date();
        const totalDuration = execution.startTime 
          ? endTime.getTime() - execution.startTime.getTime()
          : undefined;

        newExecutions.set(executionId, {
          ...execution,
          overallStatus: status,
          endTime,
          totalDuration
        });
      }
      
      return newExecutions;
    });

    if (status === 'completed' || status === 'failed') {
      setCurrentExecution(null);
    }
  }, []);

  const stopExecution = useCallback((executionId: string) => {
    updateExecutionStatus(executionId, 'failed');
    
    // Update all running steps to failed
    const execution = executions.get(executionId);
    if (execution) {
      execution.steps.forEach(step => {
        if (step.status === 'running') {
          updateStepStatus(executionId, step.nodeId, 'failed', undefined, new Date(), undefined, 'Execution stopped');
        }
      });
    }
  }, [executions, updateExecutionStatus, updateStepStatus]);

  const getExecution = useCallback((executionId: string): ExecutionContext | undefined => {
    return executions.get(executionId);
  }, [executions]);

  const getCurrentExecution = useCallback((): ExecutionContext | undefined => {
    return currentExecution ? executions.get(currentExecution) : undefined;
  }, [currentExecution, executions]);

  const getAllExecutions = useCallback((): ExecutionContext[] => {
    return Array.from(executions.values()).sort((a, b) => 
      (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0)
    );
  }, [executions]);

  const clearExecutions = useCallback(() => {
    setExecutions(new Map());
    setCurrentExecution(null);
  }, []);

  const getExecutionMetrics = useCallback((executionId: string) => {
    const execution = executions.get(executionId);
    if (!execution) return null;

    const completedSteps = execution.steps.filter(s => s.status === 'completed').length;
    const failedSteps = execution.steps.filter(s => s.status === 'failed').length;
    const successRate = execution.steps.length > 0 ? completedSteps / execution.steps.length : 0;
    
    const stepDurations = execution.steps
      .filter(s => s.duration !== undefined)
      .map(s => s.duration!);
    
    const avgStepDuration = stepDurations.length > 0 
      ? stepDurations.reduce((a, b) => a + b, 0) / stepDurations.length
      : 0;

    const slowestStep = execution.steps.reduce((slowest, current) => 
      (current.duration || 0) > (slowest.duration || 0) ? current : slowest,
      execution.steps[0]
    );

    const fastestStep = execution.steps.reduce((fastest, current) => 
      (current.duration || Infinity) < (fastest.duration || Infinity) ? current : fastest,
      execution.steps[0]
    );

    return {
      totalSteps: execution.steps.length,
      completedSteps,
      failedSteps,
      successRate,
      totalDuration: execution.totalDuration,
      avgStepDuration,
      slowestStep: slowestStep.duration ? {
        nodeName: slowestStep.nodeName,
        duration: slowestStep.duration
      } : null,
      fastestStep: fastestStep.duration ? {
        nodeName: fastestStep.nodeName,
        duration: fastestStep.duration
      } : null
    };
  }, [executions]);

  return {
    startExecution,
    stopExecution,
    getExecution,
    getCurrentExecution,
    getAllExecutions,
    clearExecutions,
    getExecutionMetrics,
    currentExecutionId: currentExecution,
    isExecuting: currentExecution !== null
  };
};