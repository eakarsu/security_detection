import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { SecurityEvent } from './security.service';

@Injectable()
export class OpenRouterService {
  private readonly apiKey = process.env.OPENROUTER_API_KEY;
  private readonly baseUrl = 'https://openrouter.ai/api/v1';

  async analyzeSecurityEvent(event: SecurityEvent): Promise<any> {
    if (!this.apiKey) {
      console.warn('OpenRouter API key not configured, using fallback analysis');
      return this.getFallbackAnalysis(event);
    }

    try {
      const prompt = this.buildSecurityAnalysisPrompt(event);
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'anthropic/claude-3.5-sonnet',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nodeguard.ai',
            'X-Title': 'NodeGuard AI Security Platform'
          },
          timeout: 30000
        }
      );

      const aiResponse = response.data.choices[0]?.message?.content;
      return this.parseAIResponse(aiResponse);
    } catch (error) {
      console.error('OpenRouter API error:', error.message);
      return this.getFallbackAnalysis(event);
    }
  }

  private buildSecurityAnalysisPrompt(event: SecurityEvent): string {
    return `Given this high-risk security event, generate a structured incident report.

Input: ${JSON.stringify(event, null, 2)}

Provide:
1. Simple summary for security analyst.
2. Key risk/explanation factors.
3. Top MITRE ATT&CK mappings.
4. Prioritized incident response steps in markdown list.
5. JSON output for automation of alert handling.

Please redact sensitive data but be as specific as possible. Format your response as JSON with the following structure:
{
  "summary": "Brief description of the incident",
  "riskFactors": ["factor1", "factor2"],
  "mitreAttackMappings": ["T1234 - Technique Name"],
  "responseSteps": ["step1", "step2"],
  "automationData": {"key": "value"}
}`;
  }

  private parseAIResponse(response: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, create structured response from text
      return {
        summary: response.substring(0, 200) + '...',
        riskFactors: ['AI analysis completed'],
        mitreAttackMappings: ['T1078 - Valid Accounts'],
        responseSteps: ['Review AI analysis', 'Take appropriate action'],
        automationData: { source: 'openrouter', parsed: true }
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return this.getFallbackAnalysis();
    }
  }

  private getFallbackAnalysis(event?: SecurityEvent): any {
    return {
      summary: event ? 
        `Security event detected: ${event.anomalyType} from ${event.srcIp}` :
        'Security event requires investigation',
      riskFactors: [
        'High anomaly score detected',
        'Unusual behavior pattern',
        'Potential credential compromise'
      ],
      mitreAttackMappings: [
        'T1078 - Valid Accounts',
        'T1110 - Brute Force',
        'T1021 - Remote Services'
      ],
      responseSteps: [
        'Investigate source IP and user activity',
        'Check for lateral movement indicators',
        'Review authentication logs',
        'Consider temporary account restrictions',
        'Monitor for additional suspicious activity'
      ],
      automationData: {
        priority: 'high',
        source: 'fallback',
        requiresHumanReview: true
      }
    };
  }
}
