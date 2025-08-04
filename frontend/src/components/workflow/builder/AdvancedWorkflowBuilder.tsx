import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Panel,
  ReactFlowProvider,
  ConnectionMode,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
  OnInit,
} from 'reactflow';
import 'reactflow/dist/style.css';

import AdvancedNodePanel from './AdvancedNodePanel.tsx';
import NodeConfigurationPanel from './NodeConfigurationPanel.tsx';
import WorkflowTemplateSelector from './WorkflowTemplateSelector.tsx';
import {
  Save,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Settings,
  Layers,
  Zap,
  FileText,
  Grid,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff
} from 'lucide-react';

// Custom node types
const nodeTypes = {
  custom: ({ data, selected }: any) => (
    <div
      className={`px-6 py-4 shadow-2xl rounded-2xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden ${
        selected 
          ? 'border-4 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-blue-200' 
          : 'border-2 border-gray-300 bg-gradient-to-br from-white to-gray-50 hover:shadow-purple-200'
      } ${data.category ? `ring-4 ring-${getCategoryColor(data.category)} ring-opacity-30` : ''}`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent"></div>
        <div className="absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rounded-full bg-blue-400 opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-12 h-12 -ml-6 -mb-6 rounded-full bg-purple-400 opacity-20"></div>
      </div>
      
      <div className="relative z-10 flex items-center space-x-3">
        <div className={`p-3 rounded-xl bg-gradient-to-br from-${getCategoryColor(data.category)}-500 to-${getCategoryColor(data.category)}-600 text-white shadow-lg`}>
          <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full"></div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-800">{data.label}</div>
          {data.description && (
            <div className="text-gray-600 text-sm font-medium">{data.description}</div>
          )}
          <div className="mt-1 flex items-center space-x-2">
            <div className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs rounded-full font-semibold">
              ✨ Enhanced
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
      
      {/* Glow Effect */}
      {selected && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-600 opacity-10 animate-pulse"></div>
      )}
    </div>
  ),
};

const getCategoryColor = (category: string) => {
  const colors = {
    core: 'blue-500',
    integration: 'purple-500',
    mitre: 'red-500',
    'ai-ml': 'green-500',
    soar: 'orange-500',
    cloud: 'cyan-500'
  };
  return colors[category] || 'gray-500';
};

interface AdvancedWorkflowBuilderProps {
  workflowId?: string;
  readonly?: boolean;
}

export const AdvancedWorkflowBuilder: React.FC<AdvancedWorkflowBuilderProps> = ({
  workflowId,
  readonly = false
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<any[]>([]);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [workflowMetadata, setWorkflowMetadata] = useState({
    name: 'New Workflow',
    description: '',
    tags: []
  });

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [workflowId]);

  const loadWorkflow = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/workflows/${id}`);
      const workflow = await response.json();
      
      if (workflow.workflow_data?.nodes) {
        setNodes(workflow.workflow_data.nodes);
      }
      if (workflow.workflow_data?.edges) {
        setEdges(workflow.workflow_data.edges);
      }
      
      setWorkflowMetadata({
        name: workflow.name,
        description: workflow.description,
        tags: workflow.tags || []
      });
    } catch (error) {
      console.error('Failed to load workflow:', error);
    }
  };

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onInit: OnInit = useCallback((instance) => {
    setReactFlowInstance(instance);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type || !reactFlowBounds) {
        return;
      }

      const nodeData = JSON.parse(type);
      const position = reactFlowInstance?.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${nodeData.nodeId}-${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: nodeData.label,
          nodeId: nodeData.nodeId,
          category: nodeData.category,
          config: {}
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setConfigPanelOpen(true);
  }, []);

  const onNodeConfigSave = useCallback((nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, config } }
          : node
      )
    );
  }, [setNodes]);

  const onNodeTest = async (nodeId: string, config: any, testData: any) => {
    try {
      const response = await fetch(`/api/v1/nodes/${nodeId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: testData,
          config,
          workflowId: 'test'
        })
      });
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  const handleTemplateSelect = (template: any) => {
    const { nodes: templateNodes, edges: templateEdges } = template.workflow_definition;
    
    setNodes(templateNodes.map((node: any) => ({
      ...node,
      id: `${node.id}-${Date.now()}` // Ensure unique IDs
    })));
    
    setEdges(templateEdges.map((edge: any) => ({
      ...edge,
      id: `${edge.id}-${Date.now()}`,
      source: `${edge.source}-${Date.now()}`,
      target: `${edge.target}-${Date.now()}`
    })));

    setWorkflowMetadata({
      name: template.name,
      description: template.description,
      tags: template.tags || []
    });
  };

  const executeWorkflow = async () => {
    setIsExecuting(true);
    setExecutionResults([]);

    try {
      // Validate workflow first
      const nodeConfigs = nodes.map(node => ({
        nodeId: node.data.nodeId,
        config: node.data.config || {}
      }));

      const validationResponse = await fetch('/api/v1/nodes/validate-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: nodeConfigs })
      });

      const validation = await validationResponse.json();
      
      if (!validation.valid) {
        alert(`Workflow validation failed: ${validation.errors.join(', ')}`);
        setIsExecuting(false);
        return;
      }

      // Execute workflow (mock execution for now)
      const sampleInput = {
        event_id: `test-${Date.now()}`,
        threat_type: 'SQL Injection',
        risk_score: 8.5,
        severity: 'high',
        source_ip: '192.168.1.100',
        timestamp: new Date().toISOString()
      };

      const results = [];
      for (const node of nodes) {
        try {
          const result = await onNodeTest(node.data.nodeId, node.data.config || {}, sampleInput);
          results.push({
            nodeId: node.id,
            nodeName: node.data.label,
            result
          });
        } catch (error) {
          results.push({
            nodeId: node.id,
            nodeName: node.data.label,
            result: { success: false, error: error.message }
          });
        }
      }

      setExecutionResults(results);
    } catch (error) {
      console.error('Workflow execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const saveWorkflow = async () => {
    try {
      const workflowData = {
        name: workflowMetadata.name,
        description: workflowMetadata.description,
        workflow_data: {
          nodes,
          edges,
          metadata: workflowMetadata
        },
        tags: workflowMetadata.tags
      };

      const url = workflowId ? `/api/v1/workflows/${workflowId}` : '/api/v1/workflows';
      const method = workflowId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });

      if (response.ok) {
        alert('Workflow saved successfully');
      } else {
        throw new Error('Failed to save workflow');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow');
    }
  };

  const exportWorkflow = () => {
    const workflowData = {
      name: workflowMetadata.name,
      description: workflowMetadata.description,
      nodes,
      edges,
      metadata: {
        exported_at: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    const blob = new Blob([JSON.stringify(workflowData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowMetadata.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearWorkflow = () => {
    if (window.confirm('Are you sure you want to clear the workflow?')) {
      setNodes([]);
      setEdges([]);
      setExecutionResults([]);
      setWorkflowMetadata({
        name: 'New Workflow',
        description: '',
        tags: []
      });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`h-screen flex ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`} style={{ height: '100vh', width: '100%' }}>
      <ReactFlowProvider>
        {/* Node Panel */}
        {!panelCollapsed && (
          <AdvancedNodePanel
            onNodeSelect={(node) => {
              setSelectedNode(node as any);
              setConfigPanelOpen(true);
            }}
          />
        )}

        {/* Main Workflow Area */}
        <div className="flex-1 flex flex-col" style={{ height: '100vh', backgroundColor: '#ffffff' }}>
          {/* Toolbar */}
          <div className="h-16 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 border-b-4 border-gradient-to-r from-cyan-400 to-purple-600 flex items-center justify-between px-6 shadow-2xl relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-600"></div>
              <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-20"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 -ml-12 -mb-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 opacity-20"></div>
            </div>
            
            <div className="relative z-10 flex items-center space-x-4">
              <button
                onClick={() => setPanelCollapsed(!panelCollapsed)}
                className="p-2.5 hover:bg-white hover:bg-opacity-20 rounded-xl transition-all duration-200 text-white"
                title={panelCollapsed ? 'Show panel' : 'Hide panel'}
              >
                <Layers size={20} />
              </button>
              
              <div className="h-8 w-px bg-white bg-opacity-30" />
              
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={workflowMetadata.name}
                  onChange={(e) => setWorkflowMetadata(prev => ({ ...prev, name: e.target.value }))}
                  className="font-bold text-xl text-white bg-transparent border-none focus:ring-0 focus:outline-none placeholder-gray-300"
                  disabled={readonly}
                  placeholder="Workflow Name"
                />
                <div className="flex items-center space-x-3">
                  <div className="px-4 py-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white text-sm rounded-full font-bold shadow-lg animate-pulse border border-white border-opacity-30">
                    🚀 ADVANCED UI
                  </div>
                  <div className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm rounded-full font-bold shadow-lg">
                    ⚡ 10 Enhanced Nodes
                  </div>
                  <div className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs rounded-full font-semibold shadow-md">
                    🔥 AI-Powered
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center space-x-3">
              <button
                onClick={() => setTemplateSelectorOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 text-white hover:bg-white hover:bg-opacity-20 rounded-xl transition-all duration-200 font-medium"
                disabled={readonly}
              >
                <FileText size={18} />
                <span>Templates</span>
              </button>

              <div className="h-8 w-px bg-white bg-opacity-30" />

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-2.5 rounded-xl transition-all duration-200 ${
                  showGrid 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
                title="Toggle grid"
              >
                <Grid size={18} />
              </button>

              <button
                onClick={() => setShowMinimap(!showMinimap)}
                className={`p-2.5 rounded-xl transition-all duration-200 ${
                  showMinimap 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
                title="Toggle minimap"
              >
                {showMinimap ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2.5 text-white hover:bg-white hover:bg-opacity-20 rounded-xl transition-all duration-200"
                title="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>

              <div className="h-8 w-px bg-white bg-opacity-30" />

              <button
                onClick={executeWorkflow}
                disabled={isExecuting || readonly || nodes.length === 0}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-bold shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                {isExecuting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    <span>Execute</span>
                  </>
                )}
              </button>

              <button
                onClick={saveWorkflow}
                disabled={readonly}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-bold shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <Save size={18} />
                <span>Save</span>
              </button>

              <div className="relative">
                <button className="p-2.5 text-white hover:bg-white hover:bg-opacity-20 rounded-xl transition-all duration-200">
                  <Settings size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* React Flow */}
          <div className="flex-1 relative" ref={reactFlowWrapper} style={{ height: '100%', width: '100%', backgroundColor: '#f8fafc' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={onInit}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeDoubleClick={onNodeDoubleClick}
              nodeTypes={nodeTypes}
              connectionMode={ConnectionMode.Loose}
              fitView
              style={{ width: '100%', height: '100%' }}
            >
              <Controls 
                position="bottom-left"
                showInteractive={!readonly}
              />
              
              {showMinimap && (
                <MiniMap 
                  position="bottom-right"
                  nodeColor="#93c5fd"
                  maskColor="rgba(0, 0, 0, 0.1)"
                />
              )}
              
              <Background 
                variant={showGrid ? 'dots' : 'lines'}
                gap={20}
                size={showGrid ? 2 : 1}
                color={showGrid ? '#3b82f6' : '#e2e8f0'}
                className="opacity-30"
              />

              {/* Execution Results Panel */}
              {executionResults.length > 0 && (
                <Panel position="top-right" className="bg-white p-4 rounded-lg shadow-lg max-w-sm">
                  <h3 className="font-medium text-gray-900 mb-2">Execution Results</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {executionResults.map((result, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded text-sm ${
                          result.result.success
                            ? 'bg-green-50 border border-green-200 text-green-800'
                            : 'bg-red-50 border border-red-200 text-red-800'
                        }`}
                      >
                        <div className="font-medium">{result.nodeName}</div>
                        <div className="text-xs">
                          {result.result.success ? 'Success' : result.result.error}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
            </ReactFlow>
          </div>
        </div>

        {/* Configuration Panel */}
        <NodeConfigurationPanel
          node={selectedNode}
          isOpen={configPanelOpen}
          onClose={() => {
            setConfigPanelOpen(false);
            setSelectedNode(null);
          }}
          onSave={onNodeConfigSave}
          onTest={onNodeTest}
        />

        {/* Template Selector */}
        <WorkflowTemplateSelector
          isOpen={templateSelectorOpen}
          onClose={() => setTemplateSelectorOpen(false)}
          onSelectTemplate={handleTemplateSelect}
        />
      </ReactFlowProvider>
    </div>
  );
};

export default AdvancedWorkflowBuilder;