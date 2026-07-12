import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Table, TableBody, TableCell, TableHead, TableRow, Paper,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Grid, Tabs, Tab, CircularProgress, Tooltip, Alert
} from '@mui/material';
import {
  Add, Delete, Refresh, Launch, FileCopy, CheckCircle, Warning
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { developerService } from '../../services';

const DeveloperConsole: React.FC = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);

  // States
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['*']);
  const [rawKeyDisplay, setRawKeyDisplay] = useState<string | null>(null);

  const [hookDialogOpen, setHookDialogOpen] = useState(false);
  const [hookUrl, setHookUrl] = useState('');
  const [hookEvents, setHookEvents] = useState<string[]>(['*']);

  // API Queries
  const { data: apiKeys = [], isLoading: loadingKeys, refetch: refetchKeys } = useQuery({
    queryKey: ['developerKeys'],
    queryFn: () => developerService.listKeys(),
  });

  const { data: webhooks = [], isLoading: loadingHooks, refetch: refetchHooks } = useQuery({
    queryKey: ['developerWebhooks'],
    queryFn: () => developerService.listWebhooks(),
  });

  const { data: webhookLogs = [], isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['webhookLogs'],
    queryFn: () => developerService.getWebhookLogs(),
    enabled: tab === 2,
  });

  // API Key Mutations
  const generateKeyMutation = useMutation({
    mutationFn: () => developerService.generateKey({ name: keyName, scopes }),
    onSuccess: (data) => {
      setRawKeyDisplay(data.apiKey);
      enqueueSnackbar('API Key generated successfully!', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['developerKeys'] });
    },
    onError: (err: any) => {
      enqueueSnackbar(err.response?.data?.message || 'Failed to generate key', { variant: 'error' });
    }
  });

  const revokeKeyMutation = useMutation({
    mutationFn: (id: number) => developerService.revokeKey(id),
    onSuccess: () => {
      enqueueSnackbar('API Key revoked', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['developerKeys'] });
    }
  });

  // Webhook Mutations
  const createWebhookMutation = useMutation({
    mutationFn: () => developerService.createWebhook({ url: hookUrl, events: hookEvents }),
    onSuccess: () => {
      enqueueSnackbar('Webhook target created successfully', { variant: 'success' });
      setHookDialogOpen(false);
      setHookUrl('');
      queryClient.invalidateQueries({ queryKey: ['developerWebhooks'] });
    },
    onError: (err: any) => {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create webhook', { variant: 'error' });
    }
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: number) => developerService.deleteWebhook(id),
    onSuccess: () => {
      enqueueSnackbar('Webhook target deleted', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['developerWebhooks'] });
    }
  });

  const handleCopyKey = () => {
    if (rawKeyDisplay) {
      navigator.clipboard.writeText(rawKeyDisplay);
      enqueueSnackbar('API Key copied to clipboard!', { variant: 'success' });
    }
  };

  const handleOpenDocs = () => {
    // Open dynamic documentation endpoint in new tab
    const url = `${import.meta.env.VITE_API_URL || '/api'}/developer/docs`;
    window.open(url, '_blank');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Developer Console</Typography>
          <Typography variant="body2" color="text.secondary">Integrate third-party systems using secure REST APIs and Webhook notifications.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Launch />} onClick={handleOpenDocs}>
          API Documentation
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="API Access Keys" />
        <Tab label="Webhook Enpoints" />
        <Tab label="Webhook Delivery Logs" />
      </Tabs>

      {/* ── Tab 0: API Access Keys ── */}
      {tab === 0 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>API Keys</Typography>
              <Box display="flex" gap={1}>
                <IconButton onClick={() => refetchKeys()}><Refresh /></IconButton>
                <Button variant="contained" startIcon={<Add />} onClick={() => { setKeyName(''); setRawKeyDisplay(null); setKeyDialogOpen(true); }}>
                  Generate API Key
                </Button>
              </Box>
            </Box>

            {loadingKeys ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress size={30} /></Box>
            ) : apiKeys.length === 0 ? (
              <Alert severity="info">No active API keys found. Generate a key to begin external integrations.</Alert>
            ) : (
              <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Prefix</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Scopes</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Rate Limit</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Last Used</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {apiKeys.map((key: any) => (
                      <TableRow key={key.id} hover>
                        <TableCell fontWeight={600}>{key.name}</TableCell>
                        <TableCell><code>{key.keyPrefix}****</code></TableCell>
                        <TableCell>
                          {key.scopes.map((s: string) => (
                            <Chip key={s} label={s} size="small" variant="outlined" sx={{ mr: 0.5, fontSize: '0.68rem' }} />
                          ))}
                        </TableCell>
                        <TableCell>{key.rateLimit} req/min</TableCell>
                        <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}</TableCell>
                        <TableCell align="right">
                          {key.revokedAt ? (
                            <Chip label="Revoked" color="error" size="small" variant="outlined" />
                          ) : (
                            <IconButton color="error" onClick={() => revokeKeyMutation.mutate(key.id)} disabled={revokeKeyMutation.isPending}>
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab 1: Webhook Target Setup ── */}
      {tab === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>Webhook Subscriptions</Typography>
              <Box display="flex" gap={1}>
                <IconButton onClick={() => refetchHooks()}><Refresh /></IconButton>
                <Button variant="contained" startIcon={<Add />} onClick={() => setHookDialogOpen(true)}>
                  Create Webhook
                </Button>
              </Box>
            </Box>

            {loadingHooks ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress size={30} /></Box>
            ) : webhooks.length === 0 ? (
              <Alert severity="info">No active webhooks configured. Create a webhook target to receive real-time updates.</Alert>
            ) : (
              <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Endpoint URL</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Events</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Secret Signing Key</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {webhooks.map((hook: any) => (
                      <TableRow key={hook.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}><code>{hook.url}</code></TableCell>
                        <TableCell>
                          {hook.events.map((e: string) => (
                            <Chip key={e} label={e} size="small" color="primary" variant="outlined" sx={{ mr: 0.5, fontSize: '0.68rem' }} />
                          ))}
                        </TableCell>
                        <TableCell><code>{hook.secretKey}</code></TableCell>
                        <TableCell>{new Date(hook.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell align="right">
                          <IconButton color="error" onClick={() => deleteWebhookMutation.mutate(hook.id)} disabled={deleteWebhookMutation.isPending}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab 2: Webhook logs ── */}
      {tab === 2 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>Delivery logs</Typography>
              <IconButton onClick={() => refetchLogs()}><Refresh /></IconButton>
            </Box>

            {loadingLogs ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress size={30} /></Box>
            ) : webhookLogs.length === 0 ? (
              <Alert severity="info">No delivery logs registered yet.</Alert>
            ) : (
              <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Target URL</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Attempts</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Error</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {webhookLogs.map((log: any) => (
                      <TableRow key={log.id} hover>
                        <TableCell fontWeight={600}><code>{log.event}</code></TableCell>
                        <TableCell><code>{log.url}</code></TableCell>
                        <TableCell>
                          <Chip
                            label={log.status}
                            size="small"
                            color={log.status === 'completed' ? 'success' : 'error'}
                          />
                        </TableCell>
                        <TableCell>{log.attempts}</TableCell>
                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell sx={{ color: 'error.main', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.error || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Dialogs ── */}
      {/* 1. Generate Key Dialog */}
      <Dialog open={keyDialogOpen} onClose={() => setKeyDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Generate API Key</DialogTitle>
        <DialogContent>
          {rawKeyDisplay ? (
            <Box sx={{ mt: 1 }}>
              <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
                Copy this key now. For security, it will not be displayed again.
              </Alert>
              <TextField
                fullWidth
                label="API Key"
                value={rawKeyDisplay}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton onClick={handleCopyKey}><FileCopy fontSize="small" /></IconButton>
                  )
                }}
              />
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Key Label Name"
                placeholder="e.g. Third Party POS Integration"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                size="small"
                margin="dense"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          {rawKeyDisplay ? (
            <Button variant="contained" onClick={() => { setKeyDialogOpen(false); setRawKeyDisplay(null); }}>
              Done
            </Button>
          ) : (
            <>
              <Button onClick={() => setKeyDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={() => generateKeyMutation.mutate()} disabled={generateKeyMutation.isPending || !keyName}>
                Generate
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* 2. Create Webhook Dialog */}
      <Dialog open={hookDialogOpen} onClose={() => setHookDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Configure Webhook</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Webhook Destination URL"
              placeholder="https://api.myclient.com/webhooks"
              value={hookUrl}
              onChange={(e) => setHookUrl(e.target.value)}
              size="small"
              margin="dense"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setHookDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => createWebhookMutation.mutate()} disabled={createWebhookMutation.isPending || !hookUrl}>
            Add Webhook
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeveloperConsole;
