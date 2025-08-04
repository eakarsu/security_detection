export interface SecurityNodeConfig {
  [key: string]: any;
}

export interface SecurityEvent {
  event_id: string;
  threat_type: string;
  risk_score: number;
  severity: string;
  source_ip?: string;
  timestamp: string;
  [key: string]: any;
}

export interface SecurityResult {
  success: boolean;
  data: any;
  error?: string;
  metadata?: {
    processing_time: number;
    confidence?: number;
    recommendations?: string[];
  };
}

export interface NodeSchema {
  inputs: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    description: string;
  }[];
  outputs: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
  }[];
  config: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'object' | 'array';
    required: boolean;
    default?: any;
    options?: string[];
    description: string;
  }[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export abstract class SecurityNode {
  abstract id: string;
  abstract type: string;
  abstract category: 'core' | 'soar' | 'cloud' | 'ai-ml' | 'integration' | 'mitre';
  abstract name: string;
  abstract description: string;
  abstract version: string;

  abstract execute(input: SecurityEvent, config: SecurityNodeConfig): Promise<SecurityResult>;
  abstract configure(params: SecurityNodeConfig): ValidationResult;
  abstract getSchema(): NodeSchema;

  // Helper methods
  protected validateConfig(config: SecurityNodeConfig, schema: NodeSchema): ValidationResult {
    const errors: string[] = [];
    
    for (const field of schema.config) {
      if (field.required && !(field.name in config)) {
        errors.push(`Required field '${field.name}' is missing`);
      }
      
      if (field.name in config) {
        const value = config[field.name];
        if (field.type === 'number' && typeof value !== 'number') {
          errors.push(`Field '${field.name}' must be a number`);
        }
        if (field.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Field '${field.name}' must be a boolean`);
        }
        if (field.type === 'select' && field.options && !field.options.includes(value)) {
          errors.push(`Field '${field.name}' must be one of: ${field.options.join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  protected createResult(success: boolean, data: any, metadata?: any): SecurityResult {
    return {
      success,
      data,
      metadata: {
        processing_time: Date.now(),
        ...metadata
      }
    };
  }
}