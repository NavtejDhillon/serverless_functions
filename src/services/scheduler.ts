import * as cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { executeFunction } from './executor';

// Define the schedule file path
const SCHEDULES_FILE = path.join(process.cwd(), 'schedules.json');

// Define schedule interface
export interface Schedule {
  id: string;
  functionName: string;
  cronExpression: string;
  input?: any;
  active: boolean;
  description?: string;
}

// Active schedules map
const activeSchedules: Map<string, cron.ScheduledTask> = new Map();

/**
 * Initialize the scheduler
 */
export const initScheduler = (): void => {
  console.log('Initializing scheduler...');
  
  // Create schedules file if it doesn't exist
  if (!fs.existsSync(SCHEDULES_FILE)) {
    fs.writeFileSync(SCHEDULES_FILE, JSON.stringify([], null, 2));
    console.log('Created schedules file');
  }
  
  // Load and activate all schedules
  loadSchedules().forEach(schedule => {
    if (schedule.active) {
      activateSchedule(schedule);
    }
  });
  
  console.log(`Scheduler initialized with ${activeSchedules.size} active schedules`);
};

/**
 * Load all schedules from file
 */
export const loadSchedules = (): Schedule[] => {
  try {
    const content = fs.readFileSync(SCHEDULES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading schedules:', error);
    return [];
  }
};

/**
 * Save schedules to file
 */
export const saveSchedules = (schedules: Schedule[]): boolean => {
  try {
    fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving schedules:', error);
    return false;
  }
};

/**
 * Activate a schedule
 */
export const activateSchedule = (schedule: Schedule): boolean => {
  try {
    // Check if schedule is already active
    if (activeSchedules.has(schedule.id)) {
      console.log(`Schedule ${schedule.id} is already active`);
      return true;
    }
    
    // Validate cron expression
    if (!cron.validate(schedule.cronExpression)) {
      console.error(`Invalid cron expression: ${schedule.cronExpression}`);
      return false;
    }
    
    // Schedule the task
    const task = cron.schedule(schedule.cronExpression, async () => {
      console.log(`Executing scheduled function: ${schedule.functionName}`);
      try {
        const result = await executeFunction(schedule.functionName, {
          input: schedule.input
        });
        
        console.log(`Scheduled execution result (${schedule.functionName}):`, { 
          output: result.output.substring(0, 100) + (result.output.length > 100 ? '...' : ''),
          exitCode: result.exitCode,
          error: result.error ? (result.error.substring(0, 100) + (result.error.length > 100 ? '...' : '')) : null
        });
      } catch (error) {
        console.error(`Error executing scheduled function ${schedule.functionName}:`, error);
      }
    });
    
    // Store the active task
    activeSchedules.set(schedule.id, task);
    console.log(`Activated schedule: ${schedule.id} (${schedule.cronExpression}) for ${schedule.functionName}`);
    return true;
  } catch (error) {
    console.error(`Error activating schedule ${schedule.id}:`, error);
    return false;
  }
};

/**
 * Deactivate a schedule
 */
export const deactivateSchedule = (scheduleId: string): boolean => {
  try {
    const task = activeSchedules.get(scheduleId);
    if (task) {
      task.stop();
      activeSchedules.delete(scheduleId);
      console.log(`Deactivated schedule: ${scheduleId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deactivating schedule ${scheduleId}:`, error);
    return false;
  }
};

/**
 * Add a new schedule
 */
export const addSchedule = (schedule: Omit<Schedule, 'id'>): Schedule | null => {
  try {
    const schedules = loadSchedules();
    const newSchedule: Schedule = {
      ...schedule,
      id: Date.now().toString()
    };
    
    schedules.push(newSchedule);
    saveSchedules(schedules);
    
    if (newSchedule.active) {
      activateSchedule(newSchedule);
    }
    
    return newSchedule;
  } catch (error) {
    console.error('Error adding schedule:', error);
    return null;
  }
};

/**
 * Update an existing schedule
 */
export const updateSchedule = (scheduleId: string, updates: Partial<Schedule>): Schedule | null => {
  try {
    const schedules = loadSchedules();
    const index = schedules.findIndex(s => s.id === scheduleId);
    
    if (index === -1) {
      return null;
    }
    
    // Deactivate existing schedule if it's active
    if (activeSchedules.has(scheduleId)) {
      deactivateSchedule(scheduleId);
    }
    
    // Update the schedule
    const updatedSchedule: Schedule = {
      ...schedules[index],
      ...updates
    };
    
    schedules[index] = updatedSchedule;
    saveSchedules(schedules);
    
    // Reactivate if active
    if (updatedSchedule.active) {
      activateSchedule(updatedSchedule);
    }
    
    return updatedSchedule;
  } catch (error) {
    console.error(`Error updating schedule ${scheduleId}:`, error);
    return null;
  }
};

/**
 * Delete a schedule
 */
export const deleteSchedule = (scheduleId: string): boolean => {
  try {
    // Deactivate if active
    if (activeSchedules.has(scheduleId)) {
      deactivateSchedule(scheduleId);
    }
    
    // Remove from schedules file
    const schedules = loadSchedules();
    const filteredSchedules = schedules.filter(s => s.id !== scheduleId);
    
    if (filteredSchedules.length === schedules.length) {
      return false; // Schedule not found
    }
    
    return saveSchedules(filteredSchedules);
  } catch (error) {
    console.error(`Error deleting schedule ${scheduleId}:`, error);
    return false;
  }
}; 