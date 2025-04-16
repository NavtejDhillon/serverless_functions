import express from 'express';
import { v4 as uuid } from 'uuid';
import { 
  loadSchedules, 
  addSchedule, 
  updateSchedule, 
  deleteSchedule, 
  activateSchedule, 
  deactivateSchedule,
  Schedule 
} from '../services/scheduler';

const router = express.Router();

// Helper function to get a schedule by ID
const getScheduleById = (scheduleId: string): Schedule | undefined => {
  const schedules = loadSchedules();
  return schedules.find(schedule => schedule.id === scheduleId);
};

// GET /api/schedules - Get all schedules
router.get('/', (req, res) => {
  try {
    const schedules = loadSchedules();
    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch schedules'
    });
  }
});

// POST /api/schedules - Create a new schedule
router.post('/', (req, res) => {
  try {
    const { name, functionName, cronExpression, input } = req.body;

    // Validate required fields
    if (!name || !functionName || !cronExpression) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, functionName, and cronExpression are required'
      });
    }

    // Create new schedule
    const newSchedule = addSchedule({
      functionName,
      cronExpression,
      input: input || {},
      active: true,
      description: name
    });

    if (!newSchedule) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create schedule'
      });
    }

    res.status(201).json({
      success: true,
      data: newSchedule
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create schedule'
    });
  }
});

// PATCH /api/schedules/:scheduleId - Update a schedule
router.patch('/:scheduleId', (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { name, functionName, cronExpression, input } = req.body;

    const updates: Partial<Schedule> = {};
    
    if (name) updates.description = name;
    if (functionName) updates.functionName = functionName;
    if (cronExpression) updates.cronExpression = cronExpression;
    if (input !== undefined) updates.input = input;

    const updatedSchedule = updateSchedule(scheduleId, updates);

    if (!updatedSchedule) {
      return res.status(404).json({
        success: false,
        error: `Schedule with id ${scheduleId} not found`
      });
    }

    res.json({
      success: true,
      data: updatedSchedule
    });
  } catch (error) {
    console.error(`Error updating schedule:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update schedule'
    });
  }
});

// DELETE /api/schedules/:scheduleId - Delete a schedule
router.delete('/:scheduleId', (req, res) => {
  try {
    const { scheduleId } = req.params;
    const success = deleteSchedule(scheduleId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: `Schedule with id ${scheduleId} not found`
      });
    }

    res.json({
      success: true,
      message: `Schedule ${scheduleId} deleted successfully`
    });
  } catch (error) {
    console.error(`Error deleting schedule:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete schedule'
    });
  }
});

// POST /api/schedules/:scheduleId/activate - Activate a schedule
router.post('/:scheduleId/activate', (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schedule = getScheduleById(scheduleId);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: `Schedule with id ${scheduleId} not found`
      });
    }

    // Update the schedule's active status
    const updatedSchedule = updateSchedule(scheduleId, { active: true });
    
    if (!updatedSchedule) {
      return res.status(500).json({
        success: false,
        error: 'Failed to activate schedule'
      });
    }

    const activated = activateSchedule(updatedSchedule);

    if (!activated) {
      return res.status(500).json({
        success: false,
        error: 'Failed to activate schedule'
      });
    }

    res.json({
      success: true,
      data: updatedSchedule
    });
  } catch (error) {
    console.error(`Error activating schedule:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate schedule'
    });
  }
});

// POST /api/schedules/:scheduleId/deactivate - Deactivate a schedule
router.post('/:scheduleId/deactivate', (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schedule = getScheduleById(scheduleId);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: `Schedule with id ${scheduleId} not found`
      });
    }

    const deactivated = deactivateSchedule(scheduleId);
    
    if (!deactivated) {
      return res.status(500).json({
        success: false,
        error: 'Failed to deactivate schedule'
      });
    }

    // Update the schedule's active status
    const updatedSchedule = updateSchedule(scheduleId, { active: false });
    
    if (!updatedSchedule) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update schedule status'
      });
    }

    res.json({
      success: true,
      data: updatedSchedule
    });
  } catch (error) {
    console.error(`Error deactivating schedule:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate schedule'
    });
  }
});

export default router; 