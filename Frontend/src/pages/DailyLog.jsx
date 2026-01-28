import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, Grid, List, ListItemButton, IconButton, InputAdornment } from '@mui/material';
import { FaCalendar, FaSave, FaHistory, FaTrash, FaSearch } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

const DailyLog = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 1. Read directly from Local Database (Instant load)
  const logs = useLiveQuery(() => db.dailylogs.orderBy('date').reverse().toArray()) || [];

  // 2. Sync Logic: Push pending items to server, then pull latest from server
  const syncData = async () => {
    if (!navigator.onLine) return;

    try {
      // A. Push Local Changes to Server
      const pendingLogs = await db.dailylogs.where('syncStatus').equals('pending_create').toArray();
      for (const log of pendingLogs) {
        try {
          const res = await api.post('/dailylogs', { date: log.date, note: log.note });
          if (res.data.success) {
            await db.dailylogs.update(log.id, { syncStatus: 'synced', serverId: res.data.log._id });
          }
        } catch (err) {
          console.error("Failed to sync log", log);
        }
      }

      const pendingDeletes = await db.dailylogs.where('syncStatus').equals('pending_delete').toArray();
      for (const log of pendingDeletes) {
        if (log.serverId) {
          try {
            await api.delete(`/dailylogs/${log.serverId}`);
            await db.dailylogs.delete(log.id);
          } catch (err) { console.error("Failed to sync delete", log); }
        } else {
          await db.dailylogs.delete(log.id);
        }
      }

      // B. Pull Latest from Server
      const res = await api.get('/dailylogs');
      if (res.data.success) {
        // Clear local synced data and replace with server data (simple sync strategy)
        await db.transaction('rw', db.dailylogs, async () => {
          // Delete only synced items, keep pending ones
          await db.dailylogs.where('syncStatus').equals('synced').delete();
          
          const serverLogs = res.data.logs.map(l => ({
            date: l.date,
            note: l.note,
            serverId: l._id,
            syncStatus: 'synced'
          }));
          await db.dailylogs.bulkAdd(serverLogs);
        });
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  // Monitor Online Status and Sync
  useEffect(() => {
    const handleStatusChange = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) syncData();
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    
    // Initial Sync
    syncData();

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  // Update form when date changes or logs load
  useEffect(() => {
    const selectedLog = logs.find(l => new Date(l.date).toISOString().split('T')[0] === date);
    setNote(selectedLog ? selectedLog.note : '');
  }, [date, logs]);

  const handleSave = async () => {
    if (!note.trim()) {
      toast.error('Please write something to save');
      return;
    }
    setLoading(true);
    try {
      // 1. Save to Local DB first (Optimistic UI)
      const existingLog = logs.find(l => new Date(l.date).toISOString().split('T')[0] === date);
      
      if (existingLog) {
        await db.dailylogs.update(existingLog.id, { 
          note, 
          syncStatus: navigator.onLine ? 'synced' : 'pending_create' 
        });
      } else {
        await db.dailylogs.add({
          date: new Date(date),
          note,
          syncStatus: navigator.onLine ? 'synced' : 'pending_create'
        });
      }

      toast.success(navigator.onLine ? 'Saved!' : 'Saved to device (Offline)');

      // 2. If Online, send to server immediately
      if (navigator.onLine) {
        await api.post('/dailylogs', { date, note });
        syncData(); // Refresh to get server IDs
      }

    } catch (error) {
      console.error(error);
      toast.error('Error saving locally');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this log?')) return;
    try {
      const logToDelete = logs.find(l => l.id === id);
      
      // Mark for deletion locally
      if (logToDelete.serverId) {
        // If it exists on server, mark as pending_delete
        await db.dailylogs.update(id, { syncStatus: 'pending_delete' });
      } else {
        // If it was only local, just delete it
        await db.dailylogs.delete(id);
      }

      toast.success('Deleted');
      
      if (navigator.onLine && logToDelete.serverId) {
        await api.delete(`/dailylogs/${logToDelete.serverId}`);
        await db.dailylogs.delete(id); // Finally remove from local
      }

    } catch (error) {
      toast.error('Error deleting');
    }
  };

  const filteredLogs = logs.filter(log => 
    log.syncStatus !== 'pending_delete' && (
    log.note.toLowerCase().includes(search.toLowerCase()) ||
    new Date(log.date).toLocaleDateString().includes(search))
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FaCalendar /> Daily Diary
          {!isOnline && <Typography variant="caption" sx={{ bgcolor: 'error.main', color: 'white', px: 1, borderRadius: 1 }}>OFFLINE MODE</Typography>}
        </Typography>
        <Button 
          variant="outlined" 
          onClick={() => setDate(new Date().toISOString().split('T')[0])}
        >
          Jump to Today
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Left Side: Input Area */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
               <TextField
                type="date"
                label="Select Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                sx={{ width: 200 }}
                InputLabelProps={{ shrink: true }}
              />
              <Typography variant="h6" color="text.secondary" sx={{ flex: 1, textAlign: 'right' }}>
                {new Date(date).toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Typography>
            </Box>
            
            <TextField
              label="Description / Note"
              multiline
              rows={15}
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              fullWidth
              placeholder="Type your daily activities, purchases, or notes here..."
              sx={{ mb: 3, bgcolor: '#f8fafc' }}
            />

            <Button 
              variant="contained" 
              size="large" 
              startIcon={<FaSave />} 
              onClick={handleSave}
              disabled={loading}
              fullWidth
              sx={{ py: 1.5 }}
            >
              {loading ? 'Saving...' : 'Save Log'}
            </Button>
          </Paper>
        </Grid>

        {/* Right Side: Recent History */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight={600} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FaHistory /> Recent Logs
            </Typography>
            
            <TextField
              size="small"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><FaSearch color="gray" /></InputAdornment>
              }}
            />

            <List sx={{ flex: 1, overflow: 'auto', maxHeight: '60vh' }}>
              {filteredLogs.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <Typography fontStyle="italic">No logs found.</Typography>
                </Box>
            ) : (
                filteredLogs.map((log) => {
                const logDate = new Date(log.date).toISOString().split('T')[0];
                const isSelected = logDate === date;
                return (
                    <Paper 
                      key={log.id} 
                      variant="outlined" 
                      sx={{ 
                        mb: 1.5, 
                        overflow: 'hidden',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected ? '#eff6ff' : 'transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      <ListItemButton 
                        onClick={() => {
                          setDate(logDate);
                          setNote(log.note);
                        }}
                        sx={{ p: 2, display: 'block' }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography fontWeight={700} color={isSelected ? 'primary.main' : 'text.primary'}>
                            {new Date(log.date).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                          </Typography>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={(e) => handleDelete(log.id, e)}
                            sx={{ mt: -0.5, mr: -1 }}
                          >
                            <FaTrash size={14} />
                          </IconButton>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {log.note}
                          {log.syncStatus !== 'synced' && <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>(Pending Sync)</Typography>}
                        </Typography>
                      </ListItemButton>
                    </Paper>
                );
              })
            )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DailyLog;