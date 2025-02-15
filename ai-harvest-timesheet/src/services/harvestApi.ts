import axios from 'axios';
import { TimeEntry, HarvestProject, HarvestTask } from '../types';

interface ProjectAssignment {
  project: {
    id: string;
    name: string;
  };
  client: {
    name: string;
  };
  task_assignments: {
    task: {
      id: string;
      name: string;
    };
  }[];
}

class HarvestApi {
  private token: string = '';
  private accountId: string = '';
  private baseURL = 'https://api.harvestapp.com/v2';

  setCredentials(token: string, accountId: string) {
    console.log('[HarvestApi] Setting credentials', { accountId, hasToken: !!token });
    this.token = token;
    this.accountId = accountId;
  }

  private get headers() {
    const hasToken = !!this.token;
    const hasAccountId = !!this.accountId;
    console.log('[HarvestApi] Preparing headers', { hasToken, hasAccountId });
    return {
      'Authorization': `Bearer ${this.token}`,
      'Harvest-Account-ID': this.accountId,
      'Content-Type': 'application/json',
    };
  }

  async getProjects(): Promise<{ projects: HarvestProject[]; tasksByProject: Record<string, HarvestTask[]> }> {
    console.log('[HarvestApi] Fetching projects');
    try {
      const response = await axios.get(`${this.baseURL}/users/me/project_assignments`, {
        headers: this.headers,
        params: { is_active: true },
      });
      console.log('[HarvestApi] Received projects response', {
        totalProjects: response.data.project_assignments.length,
      });

      const tasksByProject: Record<string, HarvestTask[]> = {};
      const projects = response.data.project_assignments.map((assignment: ProjectAssignment) => {
        console.log('[HarvestApi] Processing project', {
          projectId: assignment.project.id,
          projectName: assignment.project.name,
          taskCount: assignment.task_assignments.length,
        });

        // Store tasks for this project
        tasksByProject[assignment.project.id] = assignment.task_assignments.map(ta => ({
          id: ta.task.id,
          name: ta.task.name,
        }));

        // Return project info
        return {
          id: assignment.project.id,
          name: assignment.project.name,
          client: {
            name: assignment.client.name,
          },
        };
      });

      console.log('[HarvestApi] Processed all projects', {
        projectCount: projects.length,
        projectIds: projects.map(p => p.id),
      });

      return { projects, tasksByProject };
    } catch (error) {
      console.error('[HarvestApi] Error fetching projects:', error);
      if (axios.isAxiosError(error)) {
        console.error('[HarvestApi] Response details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
      }
      throw error;
    }
  }

  async createTimeEntry(entry: TimeEntry): Promise<void> {
    console.log('[HarvestApi] Creating time entry', {
      projectId: entry.projectId,
      taskId: entry.taskId,
      date: entry.spentDate,
      hours: entry.hours,
    });

    try {
      const payload: any = {
        project_id: entry.projectId,
        task_id: entry.taskId,
        spent_date: entry.spentDate,
        hours: entry.hours,
        notes: entry.notes,
      };

      if (entry.external_reference) {
        payload.external_reference = entry.external_reference;
      }

      console.log('[HarvestApi] Sending time entry request', { payload });

      const response = await axios.post(`${this.baseURL}/time_entries`, payload, {
        headers: this.headers,
      });

      console.log('[HarvestApi] Time entry created successfully', {
        status: response.status,
        entryId: response.data?.id,
      });
    } catch (error) {
      console.error('[HarvestApi] Error creating time entry:', error);
      if (axios.isAxiosError(error)) {
        console.error('[HarvestApi] Response details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
      }
      throw error;
    }
  }

  async getTodayTimeEntries(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    console.log('[HarvestApi] Fetching time entries for date:', today);

    try {
      const response = await axios.get(`${this.baseURL}/time_entries`, {
        headers: this.headers,
        params: {
          from: today,
          to: today,
        }
      });

      console.log('[HarvestApi] Received time entries response', {
        totalEntries: response.data.time_entries.length,
        date: today,
      });

      // Calculate total hours from all entries
      const totalHours = response.data.time_entries.reduce(
        (total: number, entry: any) => total + (entry.hours || 0),
        0
      );

      console.log('[HarvestApi] Calculated total hours', {
        totalHours,
        date: today,
        entriesCount: response.data.time_entries.length,
      });

      return totalHours;
    } catch (error) {
      console.error('[HarvestApi] Error fetching time entries:', error);
      if (axios.isAxiosError(error)) {
        console.error('[HarvestApi] Response details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
      }
      return 0; // Return 0 on error
    }
  }
}

export const harvestApi = new HarvestApi(); 