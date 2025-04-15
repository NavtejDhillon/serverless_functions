import express from 'express';
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

/**
 * Get all schedules
 * GET /api/schedules
 */
router.get('/', function(req, res) {
  try {
    const schedules = loadSchedules();
    res.json(schedules);
  } catch (error) {
    console.error('Error retrieving schedules:', error);
    res.status(500).json({ error: 'Failed to retrieve schedules' });
  }
});

/**
 * Create a new schedule
 * POST /api/schedules
 */
router.post('/', function(req, res) {
  try {
    const { functionName, cronExpression, input, active = true, description } = req.body;
    
    if (!functionName || !cronExpression) {
      res.status(400).json({ error: 'Function name and cron expression are required' });
      return;
    }
    
    const newSchedule = addSchedule({
      functionName,
      cronExpression,
      input,
      active,
      description
    });
    
    if (!newSchedule) {
      res.status(500).json({ error: 'Failed to create schedule' });
      return;
    }
    
    res.status(201).json(newSchedule);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

/**
 * Update an existing schedule
 * PATCH /api/schedules/id/:scheduleId
 */
router.patch('/id/:scheduleId', function(req, res) {
  try {
    const scheduleId = req.params.scheduleId;
    const updates = req.body;
    
    if (!scheduleId) {
      res.status(400).json({ error: 'Schedule ID is required' });
      return;
    }
    
    const schedule = updateSchedule(scheduleId, updates);
    
    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }
    
    res.json(schedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

/**
 * Delete a schedule
 * DELETE /api/schedules/id/:scheduleId
 */
router.delete('/id/:scheduleId', function(req, res) {
  try {
    const scheduleId = req.params.scheduleId;
    
    if (!scheduleId) {
      res.status(400).json({ error: 'Schedule ID is required' });
      return;
    }
    
    const success = deleteSchedule(scheduleId);
    
    if (!success) {
      res.status(404).json({ error: 'Schedule not found or could not be deleted' });
      return;
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

/**
 * Activate a schedule
 * POST /api/schedules/id/:scheduleId/activate
 */
router.post('/id/:scheduleId/activate', function(req, res) {
  try {
    const scheduleId = req.params.scheduleId;
    
    if (!scheduleId) {
      res.status(400).json({ error: 'Schedule ID is required' });
      return;
    }
    
    const schedules = loadSchedules();
    const schedule = schedules.find(s => s.id === scheduleId);
    
    if (!schedule) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }
    
    const success = activateSchedule(schedule);
    
    if (!success) {
      res.status(500).json({ error: 'Failed to activate schedule' });
      return;
    }
    
    // Update the schedule to active status in the schedules file
    const updatedSchedule = updateSchedule(scheduleId, { active: true });
    
    res.json(updatedSchedule);
  } catch (error) {
    console.error('Error activating schedule:', error);
    res.status(500).json({ error: 'Failed to activate schedule' });
  }
});

/**
 * Deactivate a schedule
 * POST /api/schedules/id/:scheduleId/deactivate
 */
router.post('/id/:scheduleId/deactivate', function(req, res) {
  try {
    const scheduleId = req.params.scheduleId;
    
    if (!scheduleId) {
      res.status(400).json({ error: 'Schedule ID is required' });
      return;
    }
    
    const success = deactivateSchedule(scheduleId);
    
    if (!success) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }
    
    // Update the schedule to inactive status in the schedules file
    const updatedSchedule = updateSchedule(scheduleId, { active: false });
    
    res.json(updatedSchedule);
  } catch (error) {
    console.error('Error deactivating schedule:', error);
    res.status(500).json({ error: 'Failed to deactivate schedule' });
  }
});

export default router; 