#!/usr/bin/env node
/**
 * Serveur MCP local pour Manus AI
 * 
 * Permet aux agents Antigravity (Claude, Codex, etc.) de déléguer
 * des travaux de recherche, comparaison et analyse complexe à Manus.
 * 
 * Ce fichier est 100% autonome (Node 18+, zéro dépendance npm).
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Chargement sécurisé de la clé MANUS_API_KEY depuis .env si non présente dans process.env
function loadEnv() {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '.env'),
    path.join('c:/Users/lenovo/Downloads/studio-prompt/.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch (e) {
        console.error('[manus-mcp] Erreur lecture .env:', e.message);
      }
    }
  }
}

loadEnv();

function getApiKey() {
  const key = process.env.MANUS_API_KEY ? process.env.MANUS_API_KEY.trim() : '';
  if (!key) {
    throw new Error('MANUS_API_KEY introuvable. Ajoutez MANUS_API_KEY=votre_cle dans votre fichier .env ou dans vos variables d’environnement Windows.');
  }
  return key;
}

const MANUS_API_BASE = 'https://api.manus.ai/v2';

async function callManusApi(endpoint, method = 'POST', body = null) {
  const apiKey = getApiKey();
  const url = `${MANUS_API_BASE}${endpoint}`;
  
  const headers = {
    'x-manus-api-key': apiKey,
    'Content-Type': 'application/json'
  };

  const options = {
    method,
    headers
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text };
  }

  if (!res.ok) {
    const errorMsg = json.error?.message || json.message || text || `HTTP ${res.status}`;
    throw new Error(`Erreur API Manus (${res.status}): ${errorMsg}`);
  }

  return json;
}

// Outils MCP proposés à Antigravity
const TOOLS = [
  {
    name: 'manus_create_task',
    description: 'Crée une nouvelle tâche d’analyse, recherche ou travail complexe avec Manus AI. Retourne le task_id pour le suivi.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Consigne détaillée pour Manus : contexte complet, liens web, livrables attendus et contraintes.'
        },
        locale: {
          type: 'string',
          description: 'Langue de réponse souhaitée (ex: "fr").'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'manus_get_task',
    description: 'Vérifie l’état d’avancement d’une tâche Manus (en cours, terminée, en attente de réponse) et récupère les messages et livrables via task.listMessages.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Identifiant unique de la tâche Manus retourné lors de la création.'
        }
      },
      required: ['task_id']
    }
  },
  {
    name: 'manus_send_message',
    description: 'Poursuit une tâche Manus existante en lui envoyant une réponse, une précision ou une nouvelle consigne sans recréer de tâche.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Identifiant de la tâche Manus en cours.'
        },
        message: {
          type: 'string',
          description: 'Message ou réponse à envoyer à Manus.'
        }
      },
      required: ['task_id', 'message']
    }
  }
];

// Exécution des outils
async function handleToolCall(name, args) {
  if (name === 'manus_create_task') {
    const content = args && (args.prompt || args.message || args.content);
    if (!content) throw new Error('Le paramètre "prompt" est obligatoire.');
    
    const result = await callManusApi('/task.create', 'POST', {
      message: {
        content: String(content)
      },
      locale: (args && args.locale) || 'fr'
    });
    
    const taskId = result.task_id || result.id || result.data?.task_id || result.data?.id;
    return {
      success: true,
      task_id: taskId,
      message: 'Tâche Manus créée avec succès.',
      web_link: taskId ? `https://manus.im/app/task/${taskId}` : null,
      details: result
    };
  }

  if (name === 'manus_get_task') {
    if (!args || !args.task_id) throw new Error('Le paramètre "task_id" est obligatoire.');
    let result;
    try {
      result = await callManusApi('/task.listMessages', 'POST', { task_id: args.task_id });
    } catch (err) {
      result = await callManusApi(`/task.get?task_id=${encodeURIComponent(args.task_id)}`, 'GET');
    }
    return {
      task_id: args.task_id,
      web_link: `https://manus.im/app/task/${args.task_id}`,
      status_data: result
    };
  }

  if (name === 'manus_send_message') {
    if (!args || !args.task_id || (!args.message && !args.content)) {
      throw new Error('Les paramètres "task_id" et "message" sont obligatoires.');
    }
    const result = await callManusApi('/task.sendMessage', 'POST', {
      task_id: args.task_id,
      message: {
        content: String(args.message || args.content)
      }
    });
    return {
      success: true,
      task_id: args.task_id,
      result
    };
  }

  throw new Error(`Outil inconnu : ${name}`);
}

// Protocole MCP via stdio (JSON-RPC 2.0)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(id, result, error = null) {
  const payload = {
    jsonrpc: '2.0',
    id
  };
  if (error) {
    payload.error = {
      code: error.code || -32603,
      message: error.message || String(error)
    };
  } else {
    payload.result = result;
  }
  process.stdout.write(JSON.stringify(payload) + '\n');
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch (err) {
    sendResponse(null, null, { code: -32700, message: 'Parse error: JSON invalide' });
    return;
  }

  const { id, method, params } = request;

  // Notification (pas de réponse attendue)
  if (id === undefined || id === null) {
    if (method === 'notifications/initialized') {
      console.error('[manus-mcp] Client Antigravity initialisé.');
    }
    return;
  }

  try {
    switch (method) {
      case 'initialize':
        sendResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'manus-mcp',
            version: '1.0.0'
          }
        });
        break;

      case 'ping':
        sendResponse(id, {});
        break;

      case 'tools/list':
        sendResponse(id, {
          tools: TOOLS
        });
        break;

      case 'tools/call':
        if (!params || !params.name) {
          sendResponse(id, null, { code: -32602, message: 'Invalid params: name requis' });
          return;
        }
        try {
          const toolResult = await handleToolCall(params.name, params.arguments || {});
          sendResponse(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(toolResult, null, 2)
              }
            ],
            isError: false
          });
        } catch (toolError) {
          sendResponse(id, {
            content: [
              {
                type: 'text',
                text: `Erreur lors de l'exécution de ${params.name}: ${toolError.message}`
              }
            ],
            isError: true
          });
        }
        break;

      default:
        sendResponse(id, null, { code: -32601, message: `Méthode non implémentée: ${method}` });
        break;
    }
  } catch (err) {
    sendResponse(id, null, { code: -32603, message: err.message });
  }
});

console.error('[manus-mcp] Serveur MCP Manus démarré sur stdio.');
