import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Eye,
  EyeOff,
  Copy,
  RotateCcw
} from 'lucide-react';

interface NodeConfigField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  default?: any;
  options?: string[];
  description: string;
}

interface NodeSchema {
  inputs: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  outputs: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  config: NodeConfigField[];
}

interface NodeMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  schema: NodeSchema;
}

interface NodeConfigurationPanelProps {
  node: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, config: any) => void;
  onTest?: (nodeId: string, config: any, testData: any) => void;
}

export const NodeConfigurationPanel: React.FC<NodeConfigurationPanelProps> = ({
  node,
  isOpen,
  onClose,
  onSave,
  onTest
}) => {
  const [metadata, setMetadata] = useState<NodeMetadata | null>(null);
  const [config, setConfig] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testData, setTestData] = useState('{\n  "event_id": "test-123",\n  "threat_type": "SQL Injection",\n  "risk_score": 8.5,\n  "severity": "high",\n  "source_ip": "192.168.1.100",\n  "timestamp": "2024-01-01T00:00:00Z"\n}');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'test' | 'docs'>('config');

  useEffect(() => {
    if (node && isOpen) {
      fetchNodeMetadata();
      initializeConfig();
    }
  }, [node, isOpen]);

  useEffect(() => {
    validateConfig();
  }, [config, metadata]);

  const fetchNodeMetadata = async () => {
    try {
      const response = await fetch(`/api/v1/nodes/${node.data.nodeId}`);
      const nodeMetadata = await response.json();
      setMetadata(nodeMetadata);
    } catch (error) {
      console.error('Failed to fetch node metadata:', error);
    }
  };

  const initializeConfig = () => {
    if (node.data.config) {
      setConfig(node.data.config);
    } else if (metadata?.schema?.config) {
      const defaultConfig = {};
      metadata.schema.config.forEach(field => {
        if (field.default !== undefined) {
          defaultConfig[field.name] = field.default;
        }
      });
      setConfig(defaultConfig);
    }
  };

  const validateConfig = () => {
    if (!metadata?.schema?.config) return;

    const newErrors: Record<string, string> = {};
    
    metadata.schema.config.forEach(field => {
      const value = config[field.name];
      
      if (field.required && (value === undefined || value === '')) {
        newErrors[field.name] = `${field.name} is required`;
      }
      
      if (value !== undefined && value !== '') {
        if (field.type === 'number' && isNaN(Number(value))) {
          newErrors[field.name] = `${field.name} must be a number`;
        }
        
        if (field.type === 'select' && field.options && !field.options.includes(value)) {
          newErrors[field.name] = `${field.name} must be one of: ${field.options.join(', ')}`;
        }
      }
    });

    setErrors(newErrors);
    setIsValid(Object.keys(newErrors).length === 0);
  };

  const handleConfigChange = (fieldName: string, value: any) => {
    setConfig(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSave = () => {
    if (isValid) {
      onSave(node.id, config);
      onClose();
    }
  };

  const handleTest = async () => {
    if (!onTest) return;
    
    setTesting(true);
    try {
      const parsedTestData = JSON.parse(testData);
      const result = await onTest(node.data.nodeId, config, parsedTestData);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      });
    }
    setTesting(false);
  };

  const resetToDefaults = () => {
    if (metadata?.schema?.config) {
      const defaultConfig = {};
      metadata.schema.config.forEach(field => {
        if (field.default !== undefined) {
          defaultConfig[field.name] = field.default;
        }
      });
      setConfig(defaultConfig);
    }
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
  };

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const renderConfigField = (field: NodeConfigField) => {
    const value = config[field.name];
    const error = errors[field.name];
    const isPassword = field.name.toLowerCase().includes('password') || 
                      field.name.toLowerCase().includes('key') ||
                      field.name.toLowerCase().includes('secret');

    return (
      <div key={field.name} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {field.name}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        <div className="space-y-1">
          {field.type === 'string' && (
            <div className="relative">
              <input
                type={isPassword && !showPasswords[field.name] ? 'password' : 'text'}
                value={value || ''}
                onChange={(e) => handleConfigChange(field.name, e.target.value)}
                placeholder={field.default}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {isPassword && (
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility(field.name)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords[field.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
            </div>
          )}
          
          {field.type === 'number' && (
            <input
              type="number"
              value={value || ''}
              onChange={(e) => handleConfigChange(field.name, parseFloat(e.target.value))}
              placeholder={field.default?.toString()}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
            />
          )}
          
          {field.type === 'boolean' && (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => handleConfigChange(field.name, e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable</span>
            </label>
          )}
          
          {field.type === 'select' && field.options && (
            <select
              value={value || ''}
              onChange={(e) => handleConfigChange(field.name, e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select an option</option>
              {field.options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          )}
          
          {field.description && (
            <p className="text-xs text-gray-500">{field.description}</p>
          )}
          
          {error && (
            <p className="text-xs text-red-600 flex items-center">
              <AlertCircle size={12} className="mr-1" />
              {error}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen || !node) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-lg border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Node Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {metadata && (
          <div className="mt-2">
            <h4 className="font-medium text-gray-900">{metadata.name}</h4>
            <p className="text-sm text-gray-600">{metadata.description}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                {metadata.category}
              </span>
              <span className="text-xs text-gray-500">v{metadata.version}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-4">
          {['config', 'test', 'docs'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'config' && (
          <div className="p-4 space-y-4">
            {metadata?.schema?.config?.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Configuration</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={copyConfig}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Copy configuration"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={resetToDefaults}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Reset to defaults"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
                
                {metadata.schema.config.map(renderConfigField)}
                
                <div className="flex items-center space-x-2 text-sm">
                  {isValid ? (
                    <>
                      <CheckCircle size={16} className="text-green-500" />
                      <span className="text-green-700">Configuration is valid</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} className="text-red-500" />
                      <span className="text-red-700">Please fix configuration errors</span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Settings size={24} className="mx-auto mb-2 opacity-50" />
                <p>No configuration required</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'test' && (
          <div className="p-4 space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Test Configuration</h4>
              <p className="text-sm text-gray-600 mb-4">
                Test your node configuration with sample data
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Input Data (JSON)
                  </label>
                  <textarea
                    value={testData}
                    onChange={(e) => setTestData(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="Enter test data in JSON format"
                  />
                </div>
                
                <button
                  onClick={handleTest}
                  disabled={!onTest || testing || !isValid}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {testing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Testing...</span>
                    </>
                  ) : (
                    <span>Run Test</span>
                  )}
                </button>
                
                {testResult && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Test Result</h5>
                    <div className={`p-3 rounded-md ${
                      testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <pre className="text-sm overflow-x-auto">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="p-4 space-y-4">
            {metadata && (
              <>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-700">{metadata.description}</p>
                </div>
                
                {metadata.schema.inputs.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Inputs</h4>
                    <div className="space-y-2">
                      {metadata.schema.inputs.map(input => (
                        <div key={input.name} className="border border-gray-200 rounded p-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm">{input.name}</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {input.type}
                            </span>
                            {input.required && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-xs rounded">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{input.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {metadata.schema.outputs.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Outputs</h4>
                    <div className="space-y-2">
                      {metadata.schema.outputs.map(output => (
                        <div key={output.name} className="border border-gray-200 rounded p-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm">{output.name}</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {output.type}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{output.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {activeTab === 'config' && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Save size={16} />
              <span>Save</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeConfigurationPanel;