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
    this.token = token;
    this.accountId = accountId;
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Harvest-Account-ID': this.accountId,
      'Content-Type': 'application/json',
    };
  }

  async getProjects(): Promise<{ projects: HarvestProject[]; tasksByProject: Record<string, HarvestTask[]> }> {
    try {
      const response = await axios.get(`${this.baseURL}/users/me/project_assignments`, {
        headers: this.headers,
        params: { is_active: true },
      });

      const tasksByProject: Record<string, HarvestTask[]> = {};
      const projects = response.data.project_assignments.map((assignment: ProjectAssignment) => {
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

      return { projects, tasksByProject };
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  async createTimeEntry(entry: TimeEntry): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/time_entries`, {
        project_id: entry.projectId,
        task_id: entry.taskId,
        spent_date: entry.spentDate,
        hours: entry.hours,
        notes: entry.notes,
      }, {
        headers: this.headers,
      });
    } catch (error) {
      console.error('Error creating time entry:', error);
      throw error;
    }
  }
}

export const harvestApi = new HarvestApi(); 