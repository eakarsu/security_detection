import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Activity,
  Zap,
  Timer
} from 'lucide-react';
import { ExecutionContext, ExecutionStep } from '../../../hooks/useWorkflowExecution';

interface ExecutionMonitorProps {
  execution: ExecutionContext | null;
  onStop?: () => void;
  className?: string;
}

export const ExecutionMonitor: React.FC<ExecutionMonitorProps> = ({
  execution,
  onStop,
  className = ''
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!execution) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <Activity size={24} className="mx-auto mb-2 opacity-50" />
          <p>No active execution</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'failed':
        return <XCircle size={16} className="text-red-500" />;
      case 'running':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getCurrentDuration = () => {
    if (!execution.startTime) return 0;
    const endTime = execution.endTime || currentTime;
    return endTime.getTime() - execution.startTime.getTime();
  };

  const getStepDuration = (step: ExecutionStep) => {
    if (step.duration) return step.duration;
    if (step.startTime && !step.endTime && step.status === 'running') {
      return currentTime.getTime() - step.startTime.getTime();
    }
    return 0;
  };

  const completedSteps = execution.steps.filter(s => s.status === 'completed').length;
  const failedSteps = execution.steps.filter(s => s.status === 'failed').length;
  const progressPercentage = (completedSteps / execution.steps.length) * 100;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${
              execution.overallStatus === 'running' ? 'bg-blue-100' :
              execution.overallStatus === 'completed' ? 'bg-green-100' :
              execution.overallStatus === 'failed' ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              {execution.overallStatus === 'running' ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
              ) : execution.overallStatus === 'completed' ? (
                <CheckCircle size={20} className="text-green-600" />
              ) : execution.overallStatus === 'failed' ? (
                <XCircle size={20} className="text-red-600" />
              ) : (
                <Clock size={20} className="text-gray-400" />
              )}
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">
                Workflow Execution
              </h3>
              <p className="text-sm text-gray-500">
                ID: {execution.executionId.slice(-8)}
              </p>
            </div>
          </div>

          {execution.overallStatus === 'running' && onStop && (
            <button
              onClick={onStop}
              className="flex items-center space-x-1 px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              <Square size={14} />
              <span>Stop</span>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{completedSteps}/{execution.steps.length} steps</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                execution.overallStatus === 'failed' ? 'bg-red-500' :
                execution.overallStatus === 'completed' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">
              {formatDuration(getCurrentDuration())}
            </div>
            <div className="text-xs text-gray-500 flex items-center justify-center">
              <Timer size={12} className="mr-1" />
              Duration
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-semibold text-green-600">
              {completedSteps}
            </div>
            <div className="text-xs text-gray-500 flex items-center justify-center">
              <CheckCircle size={12} className="mr-1" />
              Completed
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-semibold text-red-600">
              {failedSteps}
            </div>
            <div className="text-xs text-gray-500 flex items-center justify-center">
              <XCircle size={12} className="mr-1" />
              Failed
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900">
              {Math.round(progressPercentage)}%
            </div>
            <div className="text-xs text-gray-500 flex items-center justify-center">
              <BarChart3 size={12} className="mr-1" />
              Complete
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <Activity size={16} className="mr-2" />
          Execution Steps
        </h4>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {execution.steps.map((step, index) => (
            <div
              key={step.nodeId}
              className={`p-3 rounded-lg border ${getStatusColor(step.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-medium border">
                      {index + 1}
                    </span>
                    {getStatusIcon(step.status)}
                  </div>
                  
                  <div>
                    <div className="font-medium text-sm text-gray-900">
                      {step.nodeName}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {step.status}
                      {step.status === 'running' && (
                        <span className="ml-1">
                          • {formatDuration(getStepDuration(step))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {step.duration && (
                    <div className="text-sm font-medium text-gray-900">
                      {formatDuration(step.duration)}
                    </div>
                  )}
                  {step.startTime && (
                    <div className="text-xs text-gray-500">
                      {step.startTime.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>

              {step.error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <div className="flex items-start space-x-2">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{step.error}</span>
                  </div>
                </div>
              )}

              {step.result && step.status === 'completed' && (
                <div className="mt-2">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                      View Result
                    </summary>
                    <pre className="mt-1 p-2 bg-gray-50 border rounded overflow-x-auto text-gray-700">
                      {JSON.stringify(step.result, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      {execution.overallStatus !== 'running' && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">
              {execution.overallStatus === 'completed' ? 'Completed' : 'Failed'} at{' '}
              {execution.endTime?.toLocaleString()}
            </div>
            <div className="text-gray-900 font-medium">
              Total: {formatDuration(execution.totalDuration || 0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};