import { WebhookRequest, WebhookResponse } from '../types';

class WebhookService {
  async formatMessages(webhookUrl: string, request: WebhookRequest): Promise<WebhookResponse> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        ...data,
        commits: data.commits.map((commit: any) => ({
          ...commit,
          // If webhook doesn't provide formattedMessage, use original message
          formattedMessage: commit.formattedMessage || commit.message,
          // Keep hours if provided by webhook, otherwise undefined
          hours: commit.hours,
        })),
      } as WebhookResponse;
    } catch (error) {
      console.error('Error calling webhook:', error);
      // If webhook fails, return original request with unformatted messages
      return {
        repositoryName: request.repositoryName,
        branchName: request.branchName,
        commits: request.commits.map(commit => ({
          ...commit,
          formattedMessage: commit.message,
          // No custom hours in case of webhook failure
          hours: undefined,
        })),
      };
    }
  }
}

export const webhookService = new WebhookService(); 