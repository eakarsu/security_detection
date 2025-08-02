import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Tab,
  Tabs
} from '@mui/material';
import {
  Security,
  Notifications,
  Storage,
  Api,
  Shield,
  Settings as SettingsIcon,
  Edit,
  Delete,
  Add,
  Save,
  Refresh
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [openApiDialog, setOpenApiDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState({ name: '', key: '', service: '' });

  // Settings state
  const [settings, setSettings] = useState({
    security: {
      enableMFA: true,
      sessionTimeout: 30,
      passwordPolicy: 'strong',
      enableAuditLog: true,
      enableThreatDetection: true,
      autoBlockSuspiciousIPs: false
    },
    notifications: {
      emailAlerts: true,
      smsAlerts: false,
      slackIntegration: true,
      alertThreshold: 'medium',
      enableRealTimeAlerts: true,
      digestFrequency: 'daily'
    },
    system: {
      logLevel: 'info',
      dataRetention: 90,
      enableMetrics: true,
      enableBackups: true,
      backupFrequency: 'daily',
      maxConcurrentUsers: 100
    },
    ml: {
      enableAutoTraining: true,
      modelUpdateFrequency: 'weekly',
      confidenceThreshold: 0.8,
      enableFeatureEngineering: true,
      maxModelVersions: 5
    }
  });

  const [apiKeys] = useState([
    { id: 1, name: 'OpenRouter API', service: 'OpenRouter', status: 'active', lastUsed: '2025-08-02' },
    { id: 2, name: 'Slack Webhook', service: 'Slack', status: 'active', lastUsed: '2025-08-01' },
    { id: 3, name: 'Email Service', service: 'SendGrid', status: 'inactive', lastUsed: '2025-07-30' }
  ]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSettingChange = (category: string, setting: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleAddApiKey = () => {
    setOpenApiDialog(false);
    setNewApiKey({ name: '', key: '', service: '' });
    // Add API key logic here
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure system settings, security, and integrations
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSaveSettings}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

      {saveStatus === 'saved' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Settings saved successfully!
        </Alert>
      )}

      {saveStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to save settings. Please try again.
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab icon={<Security />} label="Security" />
            <Tab icon={<Notifications />} label="Notifications" />
            <Tab icon={<SettingsIcon />} label="System" />
            <Tab icon={<Shield />} label="ML & AI" />
            <Tab icon={<Api />} label="API Keys" />
          </Tabs>
        </Box>

        {/* Security Settings */}
        <CustomTabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Authentication" />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.security.enableMFA}
                        onChange={(e) => handleSettingChange('security', 'enableMFA', e.target.checked)}
                      />
                    }
                    label="Enable Multi-Factor Authentication"
                  />
                  <Box sx={{ mt: 2 }}>
                    <Typography gutterBottom>Session Timeout (minutes)</Typography>
                    <Slider
                      value={settings.security.sessionTimeout}
                      onChange={(e, value) => handleSettingChange('security', 'sessionTimeout', value)}
                      min={5}
                      max={120}
                      step={5}
                      marks
                      valueLabelDisplay="auto"
                    />
                  </Box>
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Password Policy</InputLabel>
                    <Select
                      value={settings.security.passwordPolicy}
                      onChange={(e) => handleSettingChange('security', 'passwordPolicy', e.target.value)}
                    >
                      <MenuItem value="basic">Basic</MenuItem>
                      <MenuItem value="strong">Strong</MenuItem>
                      <MenuItem value="enterprise">Enterprise</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Threat Detection" />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.security.enableThreatDetection}
                        onChange={(e) => handleSettingChange('security', 'enableThreatDetection', e.target.checked)}
                      />
                    }
                    label="Enable Real-time Threat Detection"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.security.autoBlockSuspiciousIPs}
                        onChange={(e) => handleSettingChange('security', 'autoBlockSuspiciousIPs', e.target.checked)}
                      />
                    }
                    label="Auto-block Suspicious IPs"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.security.enableAuditLog}
                        onChange={(e) => handleSettingChange('security', 'enableAuditLog', e.target.checked)}
                      />
                    }
                    label="Enable Audit Logging"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CustomTabPanel>

        {/* Notifications Settings */}
        <CustomTabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Alert Channels" />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.emailAlerts}
                        onChange={(e) => handleSettingChange('notifications', 'emailAlerts', e.target.checked)}
                      />
                    }
                    label="Email Alerts"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.smsAlerts}
                        onChange={(e) => handleSettingChange('notifications', 'smsAlerts', e.target.checked)}
                      />
                    }
                    label="SMS Alerts"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.slackIntegration}
                        onChange={(e) => handleSettingChange('notifications', 'slackIntegration', e.target.checked)}
                      />
                    }
                    label="Slack Integration"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.enableRealTimeAlerts}
                        onChange={(e) => handleSettingChange('notifications', 'enableRealTimeAlerts', e.target.checked)}
                      />
                    }
                    label="Real-time Alerts"
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Alert Configuration" />
                <CardContent>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Alert Threshold</InputLabel>
                    <Select
                      value={settings.notifications.alertThreshold}
                      onChange={(e) => handleSettingChange('notifications', 'alertThreshold', e.target.value)}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="critical">Critical Only</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>Digest Frequency</InputLabel>
                    <Select
                      value={settings.notifications.digestFrequency}
                      onChange={(e) => handleSettingChange('notifications', 'digestFrequency', e.target.value)}
                    >
                      <MenuItem value="hourly">Hourly</MenuItem>
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="never">Never</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CustomTabPanel>

        {/* System Settings */}
        <CustomTabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="System Configuration" />
                <CardContent>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Log Level</InputLabel>
                    <Select
                      value={settings.system.logLevel}
                      onChange={(e) => handleSettingChange('system', 'logLevel', e.target.value)}
                    >
                      <MenuItem value="debug">Debug</MenuItem>
                      <MenuItem value="info">Info</MenuItem>
                      <MenuItem value="warn">Warning</MenuItem>
                      <MenuItem value="error">Error</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="Data Retention (days)"
                    type="number"
                    value={settings.system.dataRetention}
                    onChange={(e) => handleSettingChange('system', 'dataRetention', parseInt(e.target.value))}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Max Concurrent Users"
                    type="number"
                    value={settings.system.maxConcurrentUsers}
                    onChange={(e) => handleSettingChange('system', 'maxConcurrentUsers', parseInt(e.target.value))}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Monitoring & Backup" />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.system.enableMetrics}
                        onChange={(e) => handleSettingChange('system', 'enableMetrics', e.target.checked)}
                      />
                    }
                    label="Enable Metrics Collection"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.system.enableBackups}
                        onChange={(e) => handleSettingChange('system', 'enableBackups', e.target.checked)}
                      />
                    }
                    label="Enable Automated Backups"
                  />
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Backup Frequency</InputLabel>
                    <Select
                      value={settings.system.backupFrequency}
                      onChange={(e) => handleSettingChange('system', 'backupFrequency', e.target.value)}
                      disabled={!settings.system.enableBackups}
                    >
                      <MenuItem value="hourly">Hourly</MenuItem>
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CustomTabPanel>

        {/* ML & AI Settings */}
        <CustomTabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Machine Learning" />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.ml.enableAutoTraining}
                        onChange={(e) => handleSettingChange('ml', 'enableAutoTraining', e.target.checked)}
                      />
                    }
                    label="Enable Automatic Model Training"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.ml.enableFeatureEngineering}
                        onChange={(e) => handleSettingChange('ml', 'enableFeatureEngineering', e.target.checked)}
                      />
                    }
                    label="Enable Feature Engineering"
                  />
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Model Update Frequency</InputLabel>
                    <Select
                      value={settings.ml.modelUpdateFrequency}
                      onChange={(e) => handleSettingChange('ml', 'modelUpdateFrequency', e.target.value)}
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="AI Configuration" />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom>Confidence Threshold</Typography>
                    <Slider
                      value={settings.ml.confidenceThreshold}
                      onChange={(e, value) => handleSettingChange('ml', 'confidenceThreshold', value)}
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      marks
                      valueLabelDisplay="auto"
                    />
                  </Box>
                  <TextField
                    fullWidth
                    label="Max Model Versions"
                    type="number"
                    value={settings.ml.maxModelVersions}
                    onChange={(e) => handleSettingChange('ml', 'maxModelVersions', parseInt(e.target.value))}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CustomTabPanel>

        {/* API Keys */}
        <CustomTabPanel value={tabValue} index={4}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">API Keys & Integrations</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenApiDialog(true)}
            >
              Add API Key
            </Button>
          </Box>

          <Card>
            <List>
              {apiKeys.map((apiKey, index) => (
                <React.Fragment key={apiKey.id}>
                  <ListItem>
                    <ListItemText
                      primary={apiKey.name}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {apiKey.service} • Last used: {apiKey.lastUsed}
                          </Typography>
                          <Chip
                            label={apiKey.status}
                            color={apiKey.status === 'active' ? 'success' : 'default'}
                            size="small"
                          />
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" aria-label="edit">
                        <Edit />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete">
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < apiKeys.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Card>
        </CustomTabPanel>
      </Paper>

      {/* Add API Key Dialog */}
      <Dialog open={openApiDialog} onClose={() => setOpenApiDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New API Key</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={newApiKey.name}
            onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Service</InputLabel>
            <Select
              value={newApiKey.service}
              onChange={(e) => setNewApiKey({ ...newApiKey, service: e.target.value })}
            >
              <MenuItem value="openrouter">OpenRouter</MenuItem>
              <MenuItem value="slack">Slack</MenuItem>
              <MenuItem value="email">Email Service</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="API Key"
            type="password"
            fullWidth
            variant="outlined"
            value={newApiKey.key}
            onChange={(e) => setNewApiKey({ ...newApiKey, key: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApiDialog(false)}>Cancel</Button>
          <Button onClick={handleAddApiKey} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
