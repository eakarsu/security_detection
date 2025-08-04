import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Zap, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Activity,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface ExecutionStep {
  id: string;
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
  metrics?: {
    cpuUsage: number;
    memoryUsage: number;
    ioOperations: number;
  };
}

interface RealTimeExecutionMonitorProps {
  workflowId: string;
  isExecuting: boolean;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}

const RealTimeExecutionMonitor: React.FC<RealTimeExecutionMonitorProps> = ({
  workflowId,
  isExecuting,
  onStop,
  onPause,
  onResume
}) => {
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [executionMetrics, setExecutionMetrics] = useState({
    totalDuration: 0,
    completedSteps: 0,
    failedSteps: 0,
    avgStepDuration: 0
  });
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isExecuting && !isPaused) {
      const interval = setInterval(() => {
        // Simulate real-time updates
        updateExecutionState();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isExecuting, isPaused]);

  const updateExecutionState = () => {
    // Simulate execution progress
    setExecutionSteps(prev => {
      const updated = [...prev];
      const runningStep = updated.find(step => step.status === 'running');
      
      if (runningStep && Math.random() > 0.7) {
        // Complete current step
        runningStep.status = 'completed';
        runningStep.endTime = new Date();
        runningStep.duration = runningStep.endTime.getTime() - (runningStep.startTime?.getTime() || 0);
        
        // Start next step
        const nextStepIndex = updated.findIndex(step => step.status === 'pending');
        if (nextStepIndex !== -1) {
          updated[nextStepIndex].status = 'running';
          updated[nextStepIndex].startTime = new Date();
          setCurrentStep(updated[nextStepIndex].id);
        }
      }
      
      return updated;
    });

    // Update metrics
    setExecutionMetrics(prev => ({
      ...prev,
      totalDuration: prev.totalDuration + 1000,
      completedSteps: executionSteps.filter(s => s.status === 'completed').length,
      failedSteps: executionSteps.filter(s => s.status === 'failed').length,
      avgStepDuration: prev.totalDuration / Math.max(1, prev.completedSteps)
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-gray-400" />;
      case 'running':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'failed':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <AlertTriangle size={16} className="text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 border-gray-300';
      case 'running': return 'bg-blue-50 border-blue-300 shadow-md';
      case 'completed': return 'bg-green-50 border-green-300';
      case 'failed': return 'bg-red-50 border-red-300';
      default: return 'bg-yellow-50 border-yellow-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500 rounded-xl">
                <Activity size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Real-Time Execution Monitor</h2>
                <p className="text-slate-300">Workflow ID: {workflowId}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isExecuting && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-medium">
                    {isPaused ? 'Paused' : 'Running'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center space-x-3 mt-4">
            {isPaused ? (
              <button
                onClick={() => { setIsPaused(false); onResume(); }}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium transition-colors"
              >
                <Play size={16} />
                <span>Resume</span>
              </button>
            ) : (
              <button
                onClick={() => { setIsPaused(true); onPause(); }}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg font-medium transition-colors"
              >
                <Pause size={16} />
                <span>Pause</span>
              </button>
            )}
            <button
              onClick={onStop}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
            >
              <Square size={16} />
              <span>Stop</span>
            </button>
          </div>
        </div>

        <div className="flex h-[600px]">
          {/* Execution Steps */}
          <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Zap size={20} className="text-blue-500" />
              <span>Execution Steps</span>
            </h3>
            
            <div className="space-y-3">
              {executionSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${getStatusColor(step.status)}
                    ${step.id === currentStep ? 'ring-2 ring-blue-400' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(step.status)}
                      <div>
                        <h4 className="font-semibold text-gray-800">{step.nodeName}</h4>
                        <p className="text-sm text-gray-600">Node ID: {step.nodeId}</p>
                      </div>
                    </div>
                    {step.duration && (
                      <div className="text-sm text-gray-600">
                        {(step.duration / 1000).toFixed(2)}s
                      </div>
                    )}
                  </div>
                  
                  {step.status === 'running' && step.metrics && (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="bg-white rounded-lg p-2">
                        <div className="text-xs text-gray-600">CPU Usage</div>
                        <div className="text-sm font-bold text-blue-600">{step.metrics.cpuUsage}%</div>
                      </div>
                      <div className="bg-white rounded-lg p-2">
                        <div className="text-xs text-gray-600">Memory</div>
                        <div className="text-sm font-bold text-green-600">{step.metrics.memoryUsage}MB</div>
                      </div>
                      <div className="bg-white rounded-lg p-2">
                        <div className="text-xs text-gray-600">I/O Ops</div>
                        <div className="text-sm font-bold text-purple-600">{step.metrics.ioOperations}</div>
                      </div>
                    </div>
                  )}
                  
                  {step.error && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                      <p className="text-sm text-red-700">{step.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Metrics Panel */}
          <div className="w-80 bg-gray-50 p-6 border-l">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <BarChart3 size={20} className="text-green-500" />
              <span>Execution Metrics</span>
            </h3>
            
            <div className="space-y-4">
              {/* Overall Progress */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-600">
                    {executionMetrics.completedSteps}/{executionSteps.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${(executionMetrics.completedSteps / Math.max(1, executionSteps.length)) * 100}%`
                    }}
                  ></div>
                </div>
              </div>

              {/* Execution Time */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock size={16} className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Total Duration</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.floor(executionMetrics.totalDuration / 60000)}:
                  {String(Math.floor((executionMetrics.totalDuration % 60000) / 1000)).padStart(2, '0')}
                </div>
              </div>

              {/* Success Rate */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp size={16} className="text-green-500" />
                  <span className="text-sm font-medium text-gray-700">Success Rate</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {executionSteps.length > 0 
                    ? Math.round((executionMetrics.completedSteps / executionSteps.length) * 100)
                    : 0
                  }%
                </div>
              </div>

              {/* Average Step Duration */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity size={16} className="text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">Avg Step Duration</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {(executionMetrics.avgStepDuration / 1000).toFixed(1)}s
                </div>
              </div>

              {/* Failed Steps */}
              {executionMetrics.failedSteps > 0 && (
                <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">
                  <div className="flex items-center space-x-2 mb-2">
                    <XCircle size={16} className="text-red-500" />
                    <span className="text-sm font-medium text-gray-700">Failed Steps</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {executionMetrics.failedSteps}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeExecutionMonitor;