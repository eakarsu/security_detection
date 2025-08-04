import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Shield, 
  Zap, 
  Cloud, 
  Brain, 
  Settings,
  Target,
  Info
} from 'lucide-react';

interface NodeMetadata {
  id: string;
  type: string;
  category: 'core' | 'soar' | 'cloud' | 'ai-ml' | 'integration' | 'mitre';
  name: string;
  description: string;
  version: string;
  tags: string[];
  icon?: string;
  enabled: boolean;
  enterprise?: boolean;
}

interface AdvancedNodePanelProps {
  onNodeSelect: (node: NodeMetadata) => void;
  selectedCategory?: string;
}

const categoryIcons = {
  core: Shield,
  integration: Zap,
  mitre: Target,
  'ai-ml': Brain,
  soar: Settings,
  cloud: Cloud
};

export const AdvancedNodePanel: React.FC<AdvancedNodePanelProps> = ({
  onNodeSelect,
  selectedCategory
}) => {
  const [nodes, setNodes] = useState<NodeMetadata[]>([]);
  const [filteredNodes, setFilteredNodes] = useState<NodeMetadata[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNodes();
  }, []);

  useEffect(() => {
    filterNodes();
  }, [nodes, searchTerm]);

  const fetchNodes = async () => {
    try {
      const response = await fetch('/api/v1/nodes');
      const nodeData = await response.json();
      setNodes(nodeData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
      setLoading(false);
    }
  };

  const filterNodes = () => {
    let filtered = nodes;

    if (searchTerm) {
      filtered = filtered.filter(node =>
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNodes(filtered);
  };

  const onDragStart = (event: React.DragEvent, node: NodeMetadata) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: 'custom',
      nodeId: node.id,
      label: node.name,
      category: node.category
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const NodeCard: React.FC<{ node: NodeMetadata }> = ({ node }) => {
    const IconComponent = categoryIcons[node.category] || Shield;
    const isAdvancedNode = ['ai-ml', 'soar'].includes(node.category) || node.name.includes('Analysis') || node.name.includes('Monitor');
    
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e, node)}
        onClick={() => onNodeSelect(node)}
        style={{
          cursor: 'move',
          padding: '16px',
          border: isAdvancedNode ? '2px solid #8b5cf6' : '1px solid #e5e7eb',
          borderRadius: '12px',
          backgroundColor: isAdvancedNode ? '#faf5ff' : '#ffffff',
          marginBottom: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease',
          ':hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{
            padding: '8px',
            background: node.category === 'core' ? '#dbeafe' :
                       node.category === 'integration' ? '#ede9fe' :
                       node.category === 'mitre' ? '#fee2e2' :
                       node.category === 'ai-ml' ? '#d1fae5' :
                       node.category === 'soar' ? '#fef3c7' :
                       node.category === 'cloud' ? '#cffafe' : '#f3f4f6',
            borderRadius: '8px'
          }}>
            <IconComponent size={18} style={{
              color: node.category === 'core' ? '#2563eb' :
                     node.category === 'integration' ? '#7c3aed' :
                     node.category === 'mitre' ? '#dc2626' :
                     node.category === 'ai-ml' ? '#059669' :
                     node.category === 'soar' ? '#d97706' :
                     node.category === 'cloud' ? '#0891b2' : '#6b7280'
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 4px 0',
              lineHeight: '1.2'
            }}>
              {node.name}
            </h4>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: '0 0 12px 0',
              lineHeight: '1.4'
            }}>
              {node.description}
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isAdvancedNode && (
                  <span style={{
                    padding: '4px 8px',
                    background: 'linear-gradient(45deg, #8b5cf6, #6366f1)',
                    color: 'white',
                    fontSize: '11px',
                    borderRadius: '12px',
                    fontWeight: '700'
                  }}>
                    ✨ Enhanced
                  </span>
                )}
                {node.enterprise && (
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: '#fbbf24',
                    color: '#92400e',
                    fontSize: '11px',
                    borderRadius: '12px',
                    fontWeight: '600'
                  }}>
                    💎 Pro
                  </span>
                )}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: '#6b7280'
              }}>
                <Info size={12} />
                <span>v{node.version}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '320px',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Enhanced Header */}
      <div style={{
        padding: '24px',
        borderBottom: '2px solid #e5e7eb',
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        color: 'white'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: 'white',
              margin: '0 0 4px 0'
            }}>
              ✨ Enhanced Security Nodes
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#cbd5e1',
              margin: '0'
            }}>
              Advanced AI-Powered Detection
            </p>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px'
          }}>
            <div style={{
              padding: '4px 12px',
              background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
              color: 'white',
              fontSize: '12px',
              borderRadius: '20px',
              fontWeight: '700'
            }}>
              🚀 ADVANCED UI
            </div>
            <div style={{
              padding: '4px 12px',
              background: 'linear-gradient(45deg, #10b981, #059669)',
              color: 'white',
              fontSize: '12px',
              borderRadius: '20px',
              fontWeight: '600'
            }}>
              ⚡ {nodes.length} Enhanced Nodes
            </div>
          </div>
        </div>
        
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{
            position: 'absolute',
            left: '12px',
            top: '12px',
            color: '#6b7280'
          }} />
          <input
            type="text"
            placeholder="Search enhanced nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '40px',
              paddingRight: '12px',
              paddingTop: '10px',
              paddingBottom: '10px',
              border: '2px solid #374151',
              borderRadius: '12px',
              fontSize: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Node List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        backgroundColor: '#f9fafb'
      }}>
        {filteredNodes.map(node => (
          <NodeCard key={node.id} node={node} />
        ))}

        {filteredNodes.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '32px 0',
            color: '#6b7280'
          }}>
            <Search size={24} style={{ 
              margin: '0 auto 8px auto', 
              opacity: 0.5,
              display: 'block'
            }} />
            <p style={{ fontSize: '14px', margin: 0 }}>No nodes found</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #e5e7eb',
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        color: 'white'
      }}>
        <div style={{
          fontSize: '12px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }}></span>
            Drag & Drop to Build
          </span>
          <span style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '700'
          }}>
            {filteredNodes.length} Active
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedNodePanel;