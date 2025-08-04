import React, { useState, useEffect } from 'react';
import {
  Search,
  Star,
  Clock,
  Users,
  Zap,
  Shield,
  Target,
  Eye,
  ChevronRight,
  Filter,
  Download,
  Play
} from 'lucide-react';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  estimated_time: string;
  author: string;
  usage_count: number;
  rating: number;
  rating_count: number;
  is_featured: boolean;
  is_enterprise: boolean;
  tags: string[];
  workflow_definition: any;
}

interface WorkflowTemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: WorkflowTemplate) => void;
}

const complexityColors = {
  beginner: 'bg-green-100 text-green-800 border-green-200',
  intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  advanced: 'bg-red-100 text-red-800 border-red-200'
};

const categoryIcons = {
  'incident-response': Shield,
  'threat-hunting': Target,
  'vulnerability-management': Shield,
  'compliance': Shield,
  'forensics': Eye,
  'monitoring': Zap
};

export const WorkflowTemplateSelector: React.FC<WorkflowTemplateSelectorProps> = ({
  isOpen,
  onClose,
  onSelectTemplate
}) => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WorkflowTemplate[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedComplexity, setSelectedComplexity] = useState('all');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'usage' | 'name'>('rating');
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    filterAndSortTemplates();
  }, [templates, searchTerm, selectedCategory, selectedComplexity, showFeaturedOnly, sortBy]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/v1/workflow-templates');
      const data = await response.json();
      setTemplates(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/v1/workflow-templates/categories');
      const data = await response.json();
      setCategories(data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const filterAndSortTemplates = () => {
    let filtered = templates;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Complexity filter
    if (selectedComplexity !== 'all') {
      filtered = filtered.filter(template => template.complexity === selectedComplexity);
    }

    // Featured filter
    if (showFeaturedOnly) {
      filtered = filtered.filter(template => template.is_featured);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'usage':
          return b.usage_count - a.usage_count;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredTemplates(filtered);
  };

  const handleTemplateSelect = async (template: WorkflowTemplate) => {
    try {
      // Mark template as used
      await fetch(`/api/v1/workflow-templates/${template.id}/use`, {
        method: 'POST'
      });
      
      onSelectTemplate(template);
      onClose();
    } catch (error) {
      console.error('Failed to use template:', error);
    }
  };

  const handlePreview = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={12}
        className={i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}
      />
    ));
  };

  const TemplateCard: React.FC<{ template: WorkflowTemplate }> = ({ template }) => {
    const CategoryIcon = categoryIcons[template.category] || Shield;

    return (
      <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <CategoryIcon size={16} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{template.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                {template.is_featured && (
                  <Star size={12} className="text-yellow-400 fill-current" />
                )}
                {template.is_enterprise && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs rounded">
                    Enterprise
                  </span>
                )}
                <span className={`px-2 py-0.5 text-xs rounded border ${complexityColors[template.complexity]}`}>
                  {template.complexity}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {renderStars(template.rating)}
            <span className="text-xs text-gray-500 ml-1">
              ({template.rating_count})
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {template.description}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Clock size={12} />
              <span>{template.estimated_time}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users size={12} />
              <span>{template.usage_count} uses</span>
            </div>
          </div>
          <span>by {template.author}</span>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="text-xs text-gray-400">
              +{template.tags.length - 3} more
            </span>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => handlePreview(template)}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center justify-center space-x-1"
          >
            <Eye size={14} />
            <span>Preview</span>
          </button>
          <button
            onClick={() => handleTemplateSelect(template)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center space-x-1"
          >
            <Play size={14} />
            <span>Use Template</span>
          </button>
        </div>
      </div>
    );
  };

  const TemplatePreview: React.FC<{ template: WorkflowTemplate }> = ({ template }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{template.name}</h2>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>
            <p className="text-gray-600 mt-2">{template.description}</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Template Details</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Category:</dt>
                    <dd className="text-gray-900">{template.category}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Complexity:</dt>
                    <dd>
                      <span className={`px-2 py-0.5 text-xs rounded ${complexityColors[template.complexity]}`}>
                        {template.complexity}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Estimated Time:</dt>
                    <dd className="text-gray-900">{template.estimated_time}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Usage Count:</dt>
                    <dd className="text-gray-900">{template.usage_count}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Workflow Overview</h3>
                <div className="text-sm space-y-2">
                  <div>
                    <span className="text-gray-500">Nodes:</span>
                    <span className="ml-2 text-gray-900">
                      {template.workflow_definition.nodes.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Connections:</span>
                    <span className="ml-2 text-gray-900">
                      {template.workflow_definition.edges.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Workflow Steps</h3>
              <div className="space-y-2">
                {template.workflow_definition.nodes.map((node, index) => (
                  <div key={node.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                    <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <span className="font-medium text-gray-900">{node.data.label}</span>
                      {node.data.description && (
                        <p className="text-sm text-gray-600">{node.data.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => setSelectedTemplate(null)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={() => handleTemplateSelect(template)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Play size={16} />
              <span>Use This Template</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Workflow Templates</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>
            <p className="text-gray-600 mt-1">
              Choose from pre-built security workflows to get started quickly
            </p>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-200 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedComplexity}
                onChange={(e) => setSelectedComplexity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="rating">Sort by Rating</option>
                <option value="usage">Sort by Usage</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showFeaturedOnly}
                  onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Featured only</span>
              </label>
              
              <div className="text-sm text-gray-500">
                {filteredTemplates.length} of {templates.length} templates
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
                ))}
              </div>
            ) : filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Search size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-500">Try adjusting your search criteria</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTemplate && (
        <TemplatePreview template={selectedTemplate} />
      )}
    </>
  );
};

export default WorkflowTemplateSelector;